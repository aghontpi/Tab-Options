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

    const title = document.createElement('h3');
    title.textContent = 'Duplicate Tab Detected';
    dialog.appendChild(title);

    const message = document.createElement('p');
    message.textContent = 'An identical tab is already open in another window.';
    dialog.appendChild(message);

    const buttonArea = document.createElement('div');
    buttonArea.className = 'dtm-button-area';

    const mergeButton = document.createElement('button');
    mergeButton.textContent = 'Switch & Close';
    mergeButton.id = 'dtm-merge-button';
    mergeButton.className = 'dtm-btn-primary';
    mergeButton.addEventListener('click', () => {
      browser.runtime.sendMessage({
        action: 'mergeTabs',
        existingTabId: messageData.existingTabId,
        currentTabId: messageData.currentTabId,
        windowId: messageData.windowId,
      });
      removeDialog();
    });

    buttonArea.appendChild(mergeButton);

    if (data.isNavigation) {
      const goBackButton = document.createElement('button');
      goBackButton.textContent = 'Go Back';
      goBackButton.id = 'dtm-goback-button';
      goBackButton.className = 'dtm-btn-secondary';
      goBackButton.addEventListener('click', () => {
        browser.runtime.sendMessage({
          action: 'goBack',
          currentTabId: messageData.currentTabId,
        });
        removeDialog();
      });
      buttonArea.appendChild(goBackButton);
    }

    const keepButton = document.createElement('button');
    keepButton.textContent = 'Keep Tab';
    keepButton.id = 'dtm-keep-button';
    keepButton.className = 'dtm-btn-secondary';
    keepButton.addEventListener('click', () => {
      browser.runtime.sendMessage({
        action: 'keepTab',
        currentTabId: messageData.currentTabId,
        isNavigation: messageData.isNavigation,
      });
      removeDialog();
    });
    buttonArea.appendChild(keepButton);

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.id = 'dtm-close-button';
    closeButton.title = 'Close this prompt (keeps tab)';
    closeButton.addEventListener('click', () => {
      browser.runtime.sendMessage({
        action: 'promptClosed',
        currentTabId: messageData.currentTabId,
        isNavigation: messageData.isNavigation,
      });
      removeDialog();
    });

    dialog.insertBefore(closeButton, dialog.firstChild);
    dialog.appendChild(buttonArea);

    document.body.appendChild(dialog);
    currentDialog = dialog;

    mergeButton.focus();
  }

  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showConfirmation') {
      request.windowId = window.id;
      showConfirmationDialog(request);
      sendResponse({ status: 'received' });
    }
  });

  console.log('Duplicate Tab Merger content script loaded.');
}
