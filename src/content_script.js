if (!window.duplicateTabMergerHasRun) {
    window.duplicateTabMergerHasRun = true;
  
    let currentDialog = null; 
    let messageData = null; 
  
    function removeDialog() {
      if (currentDialog && currentDialog.parentNode) {
        currentDialog.parentNode.removeChild(currentDialog);
      }
      currentDialog = null;
      window.duplicateTabMergerHasRun = false; 
    }
  
    function showConfirmationDialog(data) {
      removeDialog();
  
      messageData = data; 
  
      const dialog = document.createElement('div');
      dialog.id = 'duplicate-tab-merger-confirm';
  
      const message = document.createElement('p');
      message.textContent = 'Duplicate tab detected. An identical tab is already open.';
      dialog.appendChild(message);
  
      const buttonArea = document.createElement('div');
      buttonArea.style.marginTop = '10px'; 
  
      const mergeButton = document.createElement('button');
      mergeButton.textContent = 'Merge (Switch & Close)';
      mergeButton.id = 'dtm-merge-button';
      mergeButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'mergeTabs',
            existingTabId: messageData.existingTabId,
            currentTabId: messageData.currentTabId,
            windowId: messageData.windowId 
        });
        removeDialog(); 
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
        removeDialog(); 
      });
  
       const closeButton = document.createElement('button');
       closeButton.textContent = '✕'; 
       closeButton.id = 'dtm-close-button';
       closeButton.title = 'Close this prompt (keeps tab)';
       closeButton.addEventListener('click', () => {
           chrome.runtime.sendMessage({
               action: 'promptClosed', 
               currentTabId: messageData.currentTabId,
               isNavigation: messageData.isNavigation
           });
           removeDialog();
       });
  
  
      buttonArea.appendChild(mergeButton);
      buttonArea.appendChild(keepButton);
      dialog.appendChild(buttonArea);
      dialog.insertBefore(closeButton, dialog.firstChild); 
  
      document.body.appendChild(dialog);
      currentDialog = dialog;
  
       mergeButton.focus();
    }
  
  
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "showConfirmation") {
        request.windowId = window.id; 
        showConfirmationDialog(request);
        sendResponse({ status: "received" });
      }
    });
  
      console.log("Duplicate Tab Merger content script loaded."); 
  }