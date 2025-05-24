const promptingTabs = new Set();
const newlyCreatedTabs = new Set();

async function notifyPopupToRefresh() {
    try {
        const tabs = await chrome.tabs.query({
            url: `chrome-extension://${chrome.runtime.id}/popup*.html*`
        });
        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, { action: "refreshUI" });
            } catch (error) {
                console.debug(`Could not send refresh message to popup tab ${tab.id}`);
            }
        }
    } catch (error) {
        console.debug("Error notifying popup to refresh:", error);
    }
}

async function updateDuplicateCountBadge() {
  try {
      const tabs = await chrome.tabs.query({});
      const urlMap = new Map();
      let totalDuplicateCount = 0;

      tabs.forEach(tab => {
          if (tab.url) {
              const count = urlMap.get(tab.url) || 0;
              urlMap.set(tab.url, count + 1);
          }
      });

      urlMap.forEach((count, url) => {
          if (count > 1) {
              totalDuplicateCount += count;
          }
      });

      const text = totalDuplicateCount > 0 ? totalDuplicateCount.toString() : '';
      await chrome.action.setBadgeText({ text: text });
      
      if (totalDuplicateCount > 0) {
           await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' }); 
      } else {
          await chrome.action.setBadgeBackgroundColor({ color: '#FFFFFF00' }); 
      }
       console.log(`Badge updated. Total duplicate tabs: ${totalDuplicateCount}`);

  } catch (error) {
      console.error("Error updating duplicate count badge:", error);
       try {
          await chrome.action.setBadgeText({ text: '' });
       } catch (clearError) {
           console.error("Error clearing badge text:", clearError);
       }
  }
}

async function checkForDuplicateAndConfirm(tabId, url, isNavigation) {
  if (promptingTabs.has(tabId)) {
      console.log(`Tab ${tabId} is already being prompted.`);
      return;
  }

  if (!url || url.startsWith('chrome://new')) {
      updateDuplicateCountBadge(); 
      return;
  }

  try {
    const cleanUrl = url.includes("mail.google.com") && url.includes("#") ? url.split('#')[0] : url; 
    const duplicateTabs = await chrome.tabs.query({ url: cleanUrl });
    const existingTab = duplicateTabs.find(t => t.id !== tabId);

      if (existingTab) {
          console.log(`Duplicate detected: Tab ${tabId} (${url}) vs Tab ${existingTab.id}`);
          promptingTabs.add(tabId); 

          try {
              await chrome.scripting.executeScript({
                  target: { tabId: tabId },
                  files: ['content_script.js']
              });

              await chrome.scripting.insertCSS({
                  target: { tabId: tabId },
                  files: ['style.css']
              });

              chrome.tabs.sendMessage(tabId, {
                  action: "showConfirmation",
                  existingTabId: existingTab.id,
                  currentTabId: tabId,
                  isNavigation: isNavigation 
              }, (response) => {
                  if (chrome.runtime.lastError) {
                      console.warn(`Could not send message to tab ${tabId}: ${chrome.runtime.lastError.message}. Tab might be closed or unreachable.`);
                      promptingTabs.delete(tabId); 
                      updateDuplicateCountBadge(); 
                  } else if (response && response.status === "received") {
                      console.log(`Confirmation prompt shown in tab ${tabId}`);
                  } else {
                      console.warn(`Confirmation prompt message to tab ${tabId} did not get expected response.`);
                      promptingTabs.delete(tabId); 
                      updateDuplicateCountBadge(); 
                  }
              });
          } catch (injectionError) {
               console.warn(`Failed to inject script/CSS or send message to tab ${tabId} (likely closed): ${injectionError.message}`);
               promptingTabs.delete(tabId); 
               updateDuplicateCountBadge(); 
               notifyPopupToRefresh();
          }

      } else {
          updateDuplicateCountBadge();
          notifyPopupToRefresh();
      }
  } catch (error) {
      console.error(`Error checking/confirming duplicate: ${error}`);
      if (promptingTabs.has(tabId)) {
          promptingTabs.delete(tabId); 
      }
      if (error.message.includes("No tab with id") || error.message.includes("Invalid tab ID")) {
          console.warn("Tab related to check was likely closed.");
      } else {
           console.error("Unexpected error during duplicate check:", error);
      }
      updateDuplicateCountBadge(); 
      notifyPopupToRefresh();
  }
}

chrome.tabs.onCreated.addListener((tab) => {
  console.log(`Tab created: ${tab.id}`);
  newlyCreatedTabs.add(tab.id);
  if (tab.pendingUrl && !tab.pendingUrl.startsWith('chrome://new')) {
      setTimeout(async () => {
          try {
              const updatedTab = await chrome.tabs.get(tab.id);
              if (updatedTab && updatedTab.url && !promptingTabs.has(tab.id)) {
                  checkForDuplicateAndConfirm(updatedTab.id, updatedTab.url, false);
              } else {
                   updateDuplicateCountBadge();
                   notifyPopupToRefresh();
              }
          } catch (e) {
              console.log(`Tab ${tab.id} likely closed before delayed check.`);
              updateDuplicateCountBadge(); 
              notifyPopupToRefresh();
          }
      }, 300);
  } else {
       updateDuplicateCountBadge();
       notifyPopupToRefresh();
  }
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const urlChanged = changeInfo.url;
  const loadingStarted = changeInfo.status === 'loading';
  const loadCompleted = changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://new');

  if (urlChanged || loadingStarted || loadCompleted) {
     console.log(`Tab updated: ${tabId}, changeInfo:`, changeInfo);
      const checkUrl = (loadCompleted && tab.url) ? tab.url : changeInfo.url; 
      if (checkUrl && !checkUrl.startsWith('chrome://new')) {
          const isNavigation = !newlyCreatedTabs.has(tabId); 
          if (loadCompleted) { 
              newlyCreatedTabs.delete(tabId); 
          }
          checkForDuplicateAndConfirm(tabId, checkUrl, isNavigation);
      } else if (loadCompleted || urlChanged) {
           newlyCreatedTabs.delete(tabId); 
           updateDuplicateCountBadge(); 
           notifyPopupToRefresh();
      } else if (loadingStarted && !checkUrl) {
          // It's loading but we don't have a final URL yet, could update badge here
          // or wait for 'complete' or a 'changeInfo.url' event. Let's wait.
          // console.log(`Tab ${tabId} started loading, waiting for URL/complete.`);
      }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!sender.tab) {
      return false; 
  }

  const tabId = sender.tab.id;

  if (message.action === "mergeTabs") {
      console.log(`User chose MERGE for Tab ${tabId}. Focusing ${message.existingTabId} and closing ${tabId}`);
      promptingTabs.delete(tabId); 

      (async () => {
          let mergeSuccess = false;
          try {
              await chrome.tabs.update(message.existingTabId, { active: true });

              const existingTabDetails = await chrome.tabs.get(message.existingTabId);
              await chrome.windows.update(existingTabDetails.windowId, { focused: true });


              await chrome.tabs.remove(tabId);
              mergeSuccess = true; 
              sendResponse({ status: "merge complete" });
              updateDuplicateCountBadge();
              notifyPopupToRefresh();

          } catch (err) {
              console.error(`Error during merge action: ${err}`);
              sendResponse({ status: "merge failed", error: err.message });
          } finally {
               updateDuplicateCountBadge();
          }
      })();

      return true; 

  } else if (message.action === "keepTab" || message.action === "promptClosed") {
      promptingTabs.delete(tabId); 

      if (message.action === "keepTab") {
          console.log(`User chose KEEP for Tab ${tabId}`);
      } else { 
           console.log(`Confirmation prompt closed by user in Tab ${tabId}. Keeping tab.`);
      }

      
      if (message.isNavigation && message.action === "keepTab") {
          console.log(`Tab ${tabId} resulted from navigation, attempting to go back.`);
          chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: () => {
                  const msgDiv = document.createElement('div');
                  msgDiv.id = 'duplicate-tab-redirect-message'; 
                  msgDiv.textContent = 'Redirecting back to prevent duplicate tab...';
                   msgDiv.style.position = 'fixed';
                   msgDiv.style.bottom = '10px';
                   msgDiv.style.left = '50%';
                   msgDiv.style.transform = 'translateX(-50%)';
                   msgDiv.style.padding = '10px 20px';
                   msgDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
                   msgDiv.style.color = 'white';
                   msgDiv.style.zIndex = '2147483647'; 
                   msgDiv.style.borderRadius = '5px';
                   msgDiv.style.fontSize = '14px';
                   document.body.appendChild(msgDiv);
                   setTimeout(() => msgDiv.remove(), 3000);
                  history.back();
              }
          }).catch(err => console.error(`Failed to execute history.back() script in tab ${tabId}: ${err}`));
           sendResponse({ status: "keep completed, navigating back" });

      } else {
            sendResponse({ status: message.action === "keepTab" ? "keep completed" : "closed processed" });
            updateDuplicateCountBadge();
      }

      return false; 

  }
  return false;
});


chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log(`Tab removed: ${tabId}`);
  const wasPrompting = promptingTabs.delete(tabId);
  const wasNewlyCreated = newlyCreatedTabs.delete(tabId); 

  if (wasPrompting) {
      console.log(`Tab ${tabId} closed while prompting.`);
  }
  updateDuplicateCountBadge();
  notifyPopupToRefresh();
});

updateDuplicateCountBadge();

async function getWindowIdForTab(tabId) {
    try {
        const tab = await chrome.tabs.get(tabId);
        return tab.windowId;
    } catch (error) {
        console.error(`Could not get window ID for tab ${tabId}: ${error}`);
        const windows = await chrome.windows.getAll();
        return windows.length > 0 ? windows[0].id : null; 
    }
}