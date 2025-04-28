// Ensure script doesn't run multiple times on the same page load
if (!window.duplicateTabMergerHasRun) {
    window.duplicateTabMergerHasRun = true;
  
    let currentDialog = null; // Keep track of the dialog element
    let messageData = null; // Store data from background
  
    function removeDialog() {
      if (currentDialog && currentDialog.parentNode) {
        currentDialog.parentNode.removeChild(currentDialog);
      }
      currentDialog = null;
      window.duplicateTabMergerHasRun = false; // Allow script to run again if needed
    }
  
    function showConfirmationDialog(data) {
      // Remove any existing dialog first
      removeDialog();
  
      messageData = data; // Store for later use in event listeners
  
      // Create dialog elements
      const dialog = document.createElement('div');
      dialog.id = 'duplicate-tab-merger-confirm';
  
      const message = document.createElement('p');
      message.textContent = 'Duplicate tab detected. An identical tab is already open.';
      dialog.appendChild(message);
  
      const buttonArea = document.createElement('div');
      buttonArea.style.marginTop = '10px'; // Add some space
  
      const mergeButton = document.createElement('button');
      mergeButton.textContent = 'Merge (Switch & Close)';
      mergeButton.id = 'dtm-merge-button';
      mergeButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'mergeTabs',
            existingTabId: messageData.existingTabId,
            currentTabId: messageData.currentTabId,
            windowId: messageData.windowId // Pass window ID back
        });
        removeDialog(); // Remove immediately
      });
  
      const keepButton = document.createElement('button');
      keepButton.textContent = data.isNavigation ? 'Keep & Go Back' : 'Keep This Tab';
      keepButton.id = 'dtm-keep-button';
      keepButton.style.marginLeft = '10px';
      keepButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'keepTab',
            currentTabId: messageData.currentTabId,
            isNavigation: messageData.isNavigation
        });
        removeDialog(); // Remove immediately
      });
  
       // Optional: Add a close button to the prompt
       const closeButton = document.createElement('button');
       closeButton.textContent = '✕'; // Simple close symbol
       closeButton.id = 'dtm-close-button';
       closeButton.title = 'Close this prompt (keeps tab)';
       closeButton.addEventListener('click', () => {
           // Send a specific message or treat like 'keep'
           chrome.runtime.sendMessage({
               action: 'promptClosed', // Send a specific action
               currentTabId: messageData.currentTabId,
               isNavigation: messageData.isNavigation
           });
           removeDialog();
       });
  
  
      buttonArea.appendChild(mergeButton);
      buttonArea.appendChild(keepButton);
      dialog.appendChild(buttonArea);
      dialog.insertBefore(closeButton, dialog.firstChild); // Add close button at top right via CSS later
  
      document.body.appendChild(dialog);
      currentDialog = dialog;
  
       // Add a listener to remove the dialog if the user navigates away manually
       // This is a bit tricky as navigation might be the *cause*
       // Only add if it wasn't triggered by navigation itself initially? Or rely on background cleanup.
       // Let's skip this for simplicity for now and rely on background onRemoved.
  
       // Focus one of the buttons for accessibility
       mergeButton.focus();
    }
  
  
    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "showConfirmation") {
        // Add windowId to the data before showing dialog
        request.windowId = window.id; // Content scripts run in the window context
        showConfirmationDialog(request);
        sendResponse({ status: "received" }); // Acknowledge receipt
      }
      // Return true if you intend to send a response asynchronously (optional here)
      // return true;
    });
  
      console.log("Duplicate Tab Merger content script loaded."); // Log for debugging
  }