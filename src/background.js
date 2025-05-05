// Store tabs that are currently showing a confirmation prompt
const promptingTabs = new Set();
// Track newly created tabs so we can tell their first load apart from in‑tab navigations
const newlyCreatedTabs = new Set();

// Function to calculate and update the duplicate count badge
async function updateDuplicateCountBadge() {
  try {
      const tabs = await chrome.tabs.query({}); // Get all tabs
      const urlMap = new Map();
      let totalDuplicateCount = 0;

      // Filter and group tabs by URL
      tabs.forEach(tab => {
          // Consider all web pages except new tab pages
          if (tab.url && !(tab.url.startsWith('chrome://new-tab') || tab.url.startsWith('chrome://newtab'))) {
              const count = urlMap.get(tab.url) || 0;
              urlMap.set(tab.url, count + 1);
          }
      });

      // Count tabs that are part of a duplicate set
      urlMap.forEach((count, url) => {
          if (count > 1) {
              totalDuplicateCount += count; // Add all tabs that have duplicates
          }
      });

      // Update the badge
      const text = totalDuplicateCount > 0 ? totalDuplicateCount.toString() : '';
      await chrome.action.setBadgeText({ text: text });
      // Optional: Set a badge background color
      if (totalDuplicateCount > 0) {
           await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' }); // Red for duplicates
      } else {
          await chrome.action.setBadgeBackgroundColor({ color: '#FFFFFF00' }); // Clear background (or choose another default) - Note: transparency might not work everywhere, use a solid color like gray '#AAAAAA' if needed.
      }
       console.log(`Badge updated. Total duplicate tabs: ${totalDuplicateCount}`);

  } catch (error) {
      console.error("Error updating duplicate count badge:", error);
       // Attempt to clear badge on error
       try {
          await chrome.action.setBadgeText({ text: '' });
       } catch (clearError) {
           console.error("Error clearing badge text:", clearError);
       }
  }
}

// Function to check for duplicates and initiate confirmation
async function checkForDuplicateAndConfirm(tabId, url, isNavigation) {
  // Avoid checking if a prompt is already active for this tab
  if (promptingTabs.has(tabId)) {
      console.log(`Tab ${tabId} is already being prompted.`);
      return;
  }

  // Consider all web pages except new tab pages
  if (!url || url.startsWith('chrome://new-tab') || url.startsWith('chrome://newtab')) {
      updateDuplicateCountBadge(); // Still update badge even if not checking this specific tab
      return;
  }

  // --- Existing check logic ---
  try {
    const cleanUrl = url.includes("mail.google.com") && url.includes("#") ? url.split('#')[0] : url; // Removes the fragment
    const duplicateTabs = await chrome.tabs.query({ url: cleanUrl });
    const existingTab = duplicateTabs.find(t => t.id !== tabId);

      if (existingTab) {
          console.log(`Duplicate detected: Tab ${tabId} (${url}) vs Tab ${existingTab.id}`);
          promptingTabs.add(tabId); // Mark tab as being prompted

          // Inject the content script to show the confirmation dialog
          // Wrap injection in a try-catch in case tab is closed between check and inject
          try {
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
                      updateDuplicateCountBadge(); // Update badge as state changed
                  } else if (response && response.status === "received") {
                      console.log(`Confirmation prompt shown in tab ${tabId}`);
                      // Don't update badge here, wait for user action or tab closure
                  } else {
                      console.warn(`Confirmation prompt message to tab ${tabId} did not get expected response.`);
                      promptingTabs.delete(tabId); // Prompt might not have shown, clean up state
                      updateDuplicateCountBadge(); // Update badge as state changed
                  }
              });
          } catch (injectionError) {
               console.warn(`Failed to inject script/CSS or send message to tab ${tabId} (likely closed): ${injectionError.message}`);
               promptingTabs.delete(tabId); // Clean up if injection fails
               updateDuplicateCountBadge(); // Update badge state might have changed
          }

      } else {
          // No duplicate found for this specific tab load/navigation
          updateDuplicateCountBadge(); // Update badge count
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
          // Log unexpected errors but don't rethrow, let background script continue
           console.error("Unexpected error during duplicate check:", error);
      }
      updateDuplicateCountBadge(); // Update badge even if check failed
  }
}


// --- Event Listeners ---


// Listener for new tab creation
chrome.tabs.onCreated.addListener((tab) => {
  console.log(`Tab created: ${tab.id}`);
  newlyCreatedTabs.add(tab.id);
  // Use onUpdated 'complete' status or a delay, as URL might not be ready
  // Let's rely on onUpdated mostly, but keep a simple check here too
  if (tab.pendingUrl && !(tab.pendingUrl.startsWith('chrome://new-tab') || tab.pendingUrl.startsWith('chrome://newtab'))) {
      // Small delay as URL might change quickly
      setTimeout(async () => {
          try {
              const updatedTab = await chrome.tabs.get(tab.id);
              // Check again in case it navigated away or closed
              if (updatedTab && updatedTab.url && !promptingTabs.has(tab.id)) {
                  checkForDuplicateAndConfirm(updatedTab.id, updatedTab.url, false);
              } else {
                   // If tab closed or URL became invalid, still update badge
                   updateDuplicateCountBadge();
              }
          } catch (e) {
              console.log(`Tab ${tab.id} likely closed before delayed check.`);
              updateDuplicateCountBadge(); // Update badge as tab is gone
          }
      }, 300);
  } else {
       // If it's not an http/https tab initially, still update general badge count
       updateDuplicateCountBadge();
  }
});


// Listener for tab updates (URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check when a URL is present in changeInfo (more reliable for navigation)
  // Or when status is complete and url exists (catches cases where URL didn't trigger changeInfo.url)
  // Also check if status changes to 'loading' which often precedes a URL change
  const urlChanged = changeInfo.url;
  const loadingStarted = changeInfo.status === 'loading';
  const loadCompleted = changeInfo.status === 'complete' && tab.url && !(tab.url.startsWith('chrome://new-tab') || tab.url.startsWith('chrome://newtab'));

  if (urlChanged || loadingStarted || loadCompleted) {
     console.log(`Tab updated: ${tabId}, changeInfo:`, changeInfo);
      // Use the latest URL from the 'tab' object if available and complete, otherwise use changeInfo.url
      const checkUrl = (loadCompleted && tab.url) ? tab.url : changeInfo.url; // Prioritize definite URL
      if (checkUrl && !(checkUrl.startsWith('chrome://new-tab') || checkUrl.startsWith('chrome://newtab'))) {
          const isNavigation = !newlyCreatedTabs.has(tabId); // true only for real in‑tab navigations
          if (loadCompleted) { // Only remove from newlyCreatedTabs once loaded, not just on 'loading' or url change
              newlyCreatedTabs.delete(tabId); // first load seen, no longer "new"
          }
          checkForDuplicateAndConfirm(tabId, checkUrl, isNavigation);
      } else if (loadCompleted || urlChanged) {
          // If the URL changed to something invalid (e.g., chrome://) or load completed without a valid URL
           newlyCreatedTabs.delete(tabId); // Still counts as first load completing
           updateDuplicateCountBadge(); // Update badge as the URL is no longer http/https
      } else if (loadingStarted && !checkUrl) {
          // It's loading but we don't have a final URL yet, could update badge here
          // or wait for 'complete' or a 'changeInfo.url' event. Let's wait.
          // console.log(`Tab ${tabId} started loading, waiting for URL/complete.`);
      }
  }
  // Consider updating badge even if changeInfo doesn't seem relevant?
  // Maybe not needed if create/remove/relevant-update cover it.
});

// Listener for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Ensure the message comes from a tab (content script)
  if (!sender.tab) {
      return false; // Indicate synchronous processing or no response needed
  }

  const tabId = sender.tab.id;

  if (message.action === "mergeTabs") {
      console.log(`User chose MERGE for Tab ${tabId}. Focusing ${message.existingTabId} and closing ${tabId}`);
      promptingTabs.delete(tabId); // Remove before async operations

      (async () => {
          let mergeSuccess = false;
          try {
              // Activate the existing duplicate tab
              await chrome.tabs.update(message.existingTabId, { active: true });

              // Focus the window that contains the existing tab
              const existingTabDetails = await chrome.tabs.get(message.existingTabId);
              await chrome.windows.update(existingTabDetails.windowId, { focused: true });


              // Close the now‑redundant duplicate tab
              await chrome.tabs.remove(tabId);
              mergeSuccess = true; // Mark success before response
              sendResponse({ status: "merge complete" });

          } catch (err) {
              console.error(`Error during merge action: ${err}`);
              // Tab might have been closed already, check before sending error response
              sendResponse({ status: "merge failed", error: err.message });
          } finally {
               // Always update badge after potential state change
               updateDuplicateCountBadge();
          }
      })();

      return true; // Keep the message port open for the async sendResponse above

  } else if (message.action === "keepTab" || message.action === "promptClosed") {
      promptingTabs.delete(tabId); // Remove from prompting state

      if (message.action === "keepTab") {
          console.log(`User chose KEEP for Tab ${tabId}`);
      } else { // promptClosed
           console.log(`Confirmation prompt closed by user in Tab ${tabId}. Keeping tab.`);
      }

      // If it was a navigation event and user chose KEEP (not just closed prompt)
      if (message.isNavigation && message.action === "keepTab") {
          console.log(`Tab ${tabId} resulted from navigation, attempting to go back.`);
          chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: () => {
                  // Show message *before* going back
                  const msgDiv = document.createElement('div');
                  msgDiv.id = 'duplicate-tab-redirect-message'; // Use same style as dialog?
                  msgDiv.textContent = 'Redirecting back to prevent duplicate tab...';
                   // Basic styling
                   msgDiv.style.position = 'fixed';
                   msgDiv.style.top = '10px';
                   msgDiv.style.left = '50%';
                   msgDiv.style.transform = 'translateX(-50%)';
                   msgDiv.style.padding = '10px 20px';
                   msgDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
                   msgDiv.style.color = 'white';
                   msgDiv.style.zIndex = '2147483647'; // High z-index
                   msgDiv.style.borderRadius = '5px';
                   msgDiv.style.fontSize = '14px';
                   document.body.appendChild(msgDiv);
                   // Remove message after a delay
                   setTimeout(() => msgDiv.remove(), 3000);
                  // Navigate back
                  history.back();
              }
          }).catch(err => console.error(`Failed to execute history.back() script in tab ${tabId}: ${err}`));
           // Note: history.back() will trigger onUpdated, which will call updateDuplicateCountBadge
           sendResponse({ status: "keep completed, navigating back" });

      } else {
           // Just kept the tab or closed prompt without going back
            sendResponse({ status: message.action === "keepTab" ? "keep completed" : "closed processed" });
            // Update badge count as the 'keep' decision finalizes state
            updateDuplicateCountBadge();
      }

      return false; // Indicate synchronous response or no async work needed here

  }
  // If message action not recognized
  return false;
});


// Cleanup promptingTabs if a tab is closed unexpectedly
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log(`Tab removed: ${tabId}`);
  const wasPrompting = promptingTabs.delete(tabId);
  const wasNewlyCreated = newlyCreatedTabs.delete(tabId); // Clean up the tracking set

  if (wasPrompting) {
      console.log(`Tab ${tabId} closed while prompting.`);
  }
  // Always update the badge count when a tab is removed
  updateDuplicateCountBadge();
});

// --- Initial Setup ---
// Update badge count when the extension starts
updateDuplicateCountBadge();

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