// Store tabs that are currently showing a confirmation prompt
const promptingTabs = new Set();
// Track newly created tabs so we can tell their first load apart from in‑tab navigations
const newlyCreatedTabs = new Set();

// Function to check for duplicates and initiate confirmation
async function checkForDuplicateAndConfirm(tabId, url, isNavigation) {
  // Avoid checking if a prompt is already active for this tab
  if (promptingTabs.has(tabId)) {
    console.log(`Tab ${tabId} is already being prompted.`);
    return;
  }

  // Only check standard web pages
  if (!url || !(url.startsWith('http:') || url.startsWith('https:'))) {
    return;
  }

  try {
    const cleanUrl = url.includes("mail.google.com") && url.includes("#") ? url.split('#')[0] : url; // Removes the fragment
    const duplicateTabs = await chrome.tabs.query({ url: cleanUrl });
    const existingTab = duplicateTabs.find(t => t.id !== tabId);

    if (existingTab) {
      console.log(`Duplicate detected: Tab ${tabId} (${url}) vs Tab ${existingTab.id}`);
      promptingTabs.add(tabId); // Mark tab as being prompted

      // Inject the content script to show the confirmation dialog
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content_script.js']
      });

      // Inject CSS
       await chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ['style.css']
       });


      // Send message to the content script to show the dialog
      chrome.tabs.sendMessage(tabId, {
        action: "showConfirmation",
        existingTabId: existingTab.id,
        currentTabId: tabId,
        isNavigation: isNavigation // Let content script know if this was a navigation
      }, (response) => {
         if (chrome.runtime.lastError) {
            console.warn(`Could not send message to tab ${tabId}: ${chrome.runtime.lastError.message}. Tab might be closed or unreachable.`);
            promptingTabs.delete(tabId); // Clean up if message fails
         } else if (response && response.status === "received") {
             console.log(`Confirmation prompt shown in tab ${tabId}`);
         } else {
             console.warn(`Confirmation prompt message to tab ${tabId} did not get expected response.`);
             // Prompt might not have shown, clean up state
             promptingTabs.delete(tabId);
         }
      });

    }
  } catch (error) {
    console.error(`Error checking/confirming duplicate: ${error}`);
    if (promptingTabs.has(tabId)) {
       promptingTabs.delete(tabId); // Clean up on error
    }
    // Handle specific errors like invalid tab ID
    if (error.message.includes("No tab with id") || error.message.includes("Invalid tab ID")) {
        console.warn("Tab related to check was likely closed.");
    } else {
        // Rethrow unexpected errors
        throw error;
    }
  }
}

// --- Event Listeners ---

// Listener for new tab creation
chrome.tabs.onCreated.addListener((tab) => {
  // Mark this tab as freshly created
  newlyCreatedTabs.add(tab.id);
  // Use onUpdated 'complete' status or a delay, as URL might not be ready
  // Let's rely on onUpdated mostly, but keep a simple check here too
  if (tab.pendingUrl && (tab.pendingUrl.startsWith('http:') || tab.pendingUrl.startsWith('https:'))) {
      // Small delay as URL might change quickly
      setTimeout(async () => {
          try {
              const updatedTab = await chrome.tabs.get(tab.id);
              // Check again in case it navigated away or closed
              if (updatedTab && updatedTab.url && !promptingTabs.has(tab.id)) {
                   checkForDuplicateAndConfirm(updatedTab.id, updatedTab.url, false);
              }
          } catch(e) {
              console.log(`Tab ${tab.id} likely closed before delayed check.`);
          }
      }, 300);
  }
});


// Listener for tab updates (URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check when a URL is present in changeInfo (more reliable for navigation)
    // Or when status is complete and url exists (catches cases where URL didn't trigger changeInfo.url)
  if (changeInfo.url || (changeInfo.status === 'complete' && tab.url)) {
      // Use the latest URL from the 'tab' object if available and complete, otherwise use changeInfo.url
      const checkUrl = (changeInfo.status === 'complete' && tab.url) ? tab.url : changeInfo.url;
      if (checkUrl) {
        const isNavigation = !newlyCreatedTabs.has(tabId);   // true only for real in‑tab navigations
        newlyCreatedTabs.delete(tabId);                      // first load seen, no longer "new"
        checkForDuplicateAndConfirm(tabId, checkUrl, isNavigation);
      }
  }
});

// Listener for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Ensure the message comes from a tab (content script)
  if (!sender.tab) {
    return;
  }

  const tabId = sender.tab.id;
  promptingTabs.delete(tabId); // Remove from prompting state once a decision is made

  if (message.action === "mergeTabs") {
    console.log(`User chose MERGE for Tab ${tabId}. Focusing ${message.existingTabId} and closing ${tabId}`);

    (async () => {
      try {
        // Activate the existing duplicate tab
        await chrome.tabs.update(message.existingTabId, { active: true });

        // Focus the window that contains the existing tab
        const winId = await getWindowIdForTab(message.existingTabId);
        if (winId !== null) {
          await chrome.windows.update(winId, { focused: true });
        }

        // Close the now‑redundant duplicate tab
        await chrome.tabs.remove(tabId);

        // Confirm success back to the content script
        sendResponse({ status: "merge complete" });
      } catch (err) {
        console.error(`Error during merge action: ${err}`);
        sendResponse({ status: "merge failed", error: err.message });
      }
    })();

    // Keep the message port open for the async sendResponse above
    return true;

  } else if (message.action === "keepTab") {
    console.log(`User chose KEEP for Tab ${tabId}`);
    // If it was a navigation event, tell the content script to go back
    if (message.isNavigation) {
        console.log(`Tab ${tabId} resulted from navigation, attempting to go back.`);
         chrome.scripting.executeScript({
             target: { tabId: tabId },
             func: () => {
                 // Show message *before* going back
                 const msgDiv = document.createElement('div');
                 msgDiv.id = 'duplicate-tab-redirect-message';
                 msgDiv.textContent = 'Redirecting back to prevent duplicate tab...';
                 document.body.appendChild(msgDiv);
                 // Remove message after a delay
                 setTimeout(() => msgDiv.remove(), 3000);
                 // Navigate back
                 history.back();
             }
         }).catch(err => console.error(`Failed to execute history.back() script in tab ${tabId}: ${err}`));
    }
     // Signal back that the choice was processed
     sendResponse({ status: "keep completed" });

  } else if (message.action === "promptClosed") {
      // User closed the prompt without making a choice (e.g., via an X button)
      // Treat this the same as "Keep" for now, potentially log it.
      console.log(`Confirmation prompt closed by user in Tab ${tabId}. Keeping tab.`);
       if (message.isNavigation) {
           // Optionally trigger the go back here too, or just let it be.
           // Let's treat closing the prompt as implicitly wanting to keep the current navigation.
           console.log(`Navigation duplicate prompt closed, staying on new page.`);
       }
      sendResponse({ status: "closed processed" });
  }

  // Return true to indicate you wish to send a response asynchronously
  // (although in most cases above, the response is sent synchronously)
  return true;
});


// Cleanup promptingTabs if a tab is closed unexpectedly
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (promptingTabs.has(tabId)) {
    console.log(`Tab ${tabId} closed while prompting.`);
    promptingTabs.delete(tabId);
    newlyCreatedTabs.delete(tabId); // Clean up the tracking set
  }
});

console.log("Duplicate Tab Merger (with Confirm) service worker started.");

// Helper function to get windowId, needed for focusing window
async function getWindowIdForTab(tabId) {
    try {
        const tab = await chrome.tabs.get(tabId);
        return tab.windowId;
    } catch (error) {
        console.error(`Could not get window ID for tab ${tabId}: ${error}`);
        // Attempt to find *any* window if the specific tab's window fails
        const windows = await chrome.windows.getAll();
        return windows.length > 0 ? windows[0].id : null; // Fallback
    }
}