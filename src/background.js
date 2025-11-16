import './browser-polyfill.js';

const { log } = require('./utils/logger.util.js');

const promptingTabs = new Set();
const newlyCreatedTabs = new Set();

async function notifyPopupToRefresh() {
  try {
    // Get the extension's base URL for cross-browser compatibility
    const extensionUrl = browser.runtime.getURL('');
    const tabs = await browser.tabs.query({});

    // Filter tabs that are our extension's popup pages
    const popupTabs = tabs.filter(
      (tab) =>
        tab.url &&
        tab.url.startsWith(extensionUrl) &&
        (tab.url.includes('mode=fullscreen&name=tab-options') ||
          // Check if it's the popup by checking if it's an extension page that's not the background
          (tab.url.includes('.html') && !tab.url.includes('background')))
    );

    for (const tab of popupTabs) {
      try {
        await browser.tabs.sendMessage(tab.id, { action: 'refreshUI' });
      } catch (error) {
        log.debug(`Could not send refresh message to popup tab ${tab.id}`);
      }
    }
  } catch (error) {
    log.debug('Error notifying popup to refresh:', error);
  }
}

async function updateDuplicateCountBadge() {
  try {
    const tabs = await browser.tabs.query({});
    const urlMap = new Map();
    let totalDuplicateCount = 0;

    tabs.forEach((tab) => {
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
    await browser.action.setBadgeText({ text: text });

    if (totalDuplicateCount > 0) {
      await browser.action.setBadgeBackgroundColor({ color: '#FF0000' });
    } else {
      await browser.action.setBadgeBackgroundColor({ color: '#FFFFFF00' });
    }
    log.info(`Badge updated. Total duplicate tabs: ${totalDuplicateCount}`);
  } catch (error) {
    log.error('Error updating duplicate count badge:', error);
    try {
      await browser.action.setBadgeText({ text: '' });
    } catch (clearError) {
      log.error('Error clearing badge text:', clearError);
    }
  }
}

async function checkForDuplicateAndConfirm(tabId, url, isNavigation) {
  if (promptingTabs.has(tabId)) {
    log.info(`Tab ${tabId} is already being prompted.`);
    return;
  }

  if (!url || url.startsWith('chrome://new')) {
    updateDuplicateCountBadge();
    return;
  }

  try {
    const cleanUrl =
      url.includes('mail.google.com') && url.includes('#')
        ? url.split('#')[0]
        : url;
    const duplicateTabs = await browser.tabs.query({ url: cleanUrl });
    const existingTab = duplicateTabs.find((t) => t.id !== tabId);

    if (existingTab) {
      log.info(
        `Duplicate detected: Tab ${tabId} (${url}) vs Tab ${existingTab.id}`
      );
      promptingTabs.add(tabId);

      try {
        await browser.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content_script.js'],
        });

        await browser.scripting.insertCSS({
          target: { tabId: tabId },
          files: ['style.css'],
        });

        browser.tabs.sendMessage(
          tabId,
          {
            action: 'showConfirmation',
            existingTabId: existingTab.id,
            currentTabId: tabId,
            isNavigation: isNavigation,
          },
          (response) => {
            if (browser.runtime.lastError) {
              log.warn(
                `Could not send message to tab ${tabId}: ${browser.runtime.lastError.message}. Tab might be closed or unreachable.`
              );
              promptingTabs.delete(tabId);
              updateDuplicateCountBadge();
            } else if (response && response.status === 'received') {
              log.info(`Confirmation prompt shown in tab ${tabId}`);
            } else {
              log.warn(
                `Confirmation prompt message to tab ${tabId} did not get expected response.`
              );
              promptingTabs.delete(tabId);
              updateDuplicateCountBadge();
            }
          }
        );
      } catch (injectionError) {
        log.warn(
          `Failed to inject script/CSS or send message to tab ${tabId}`,
          injectionError
        );
        promptingTabs.delete(tabId);
        updateDuplicateCountBadge();
        notifyPopupToRefresh();
      }
    } else {
      updateDuplicateCountBadge();
      notifyPopupToRefresh();
    }
  } catch (error) {
    log.error(`Error checking/confirming duplicate: ${error}`);
    if (promptingTabs.has(tabId)) {
      promptingTabs.delete(tabId);
    }
    if (
      error.message.includes('No tab with id') ||
      error.message.includes('Invalid tab ID')
    ) {
      log.warn('Tab related to check was likely closed.');
    } else {
      log.error('Unexpected error during duplicate check:', error);
    }
    updateDuplicateCountBadge();
    notifyPopupToRefresh();
  }
}

browser.tabs.onCreated.addListener((tab) => {
  log.info(`Tab created: ${tab.id}`);
  newlyCreatedTabs.add(tab.id);
  if (tab.pendingUrl && !tab.pendingUrl.startsWith('chrome://new')) {
    setTimeout(async () => {
      try {
        const updatedTab = await browser.tabs.get(tab.id);
        if (updatedTab && updatedTab.url && !promptingTabs.has(tab.id)) {
          checkForDuplicateAndConfirm(updatedTab.id, updatedTab.url, false);
        } else {
          updateDuplicateCountBadge();
          notifyPopupToRefresh();
        }
      } catch (e) {
        log.info(`Tab ${tab.id} likely closed before delayed check.`);
        updateDuplicateCountBadge();
        notifyPopupToRefresh();
      }
    }, 300);
  } else {
    updateDuplicateCountBadge();
    notifyPopupToRefresh();
  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const urlChanged = changeInfo.url;
  const loadingStarted = changeInfo.status === 'loading';
  const loadCompleted =
    changeInfo.status === 'complete' &&
    tab.url &&
    !tab.url.startsWith('chrome://new');

  if (urlChanged || loadingStarted || loadCompleted) {
    log.info(`Tab updated: ${tabId}, changeInfo:`, changeInfo);
    const checkUrl = loadCompleted && tab.url ? tab.url : changeInfo.url;
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
      // log.debug(`Tab ${tabId} started loading, waiting for URL/complete.`);
    }
  }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!sender.tab) {
    return false;
  }

  const tabId = sender.tab.id;

  if (message.action === 'mergeTabs') {
    log.info(
      `User chose MERGE for Tab ${tabId}. Focusing ${message.existingTabId} and closing ${tabId}`
    );
    promptingTabs.delete(tabId);

    (async () => {
      let mergeSuccess = false;
      try {
        await browser.tabs.update(message.existingTabId, { active: true });

        const existingTabDetails = await browser.tabs.get(
          message.existingTabId
        );
        await browser.windows.update(existingTabDetails.windowId, {
          focused: true,
        });

        await browser.tabs.remove(tabId);
        mergeSuccess = true;
        sendResponse({ status: 'merge complete' });
        updateDuplicateCountBadge();
        notifyPopupToRefresh();
      } catch (err) {
        log.error(`Error during merge action: ${err}`);
        sendResponse({ status: 'merge failed', error: err.message });
      } finally {
        updateDuplicateCountBadge();
      }
    })();

    return true;
  } else if (
    message.action === 'keepTab' ||
    message.action === 'promptClosed'
  ) {
    promptingTabs.delete(tabId);

    if (message.action === 'keepTab') {
      log.info(`User chose KEEP for Tab ${tabId}`);
    } else {
      log.info(
        `Confirmation prompt closed by user in Tab ${tabId}. Keeping tab.`
      );
    }

    if (message.isNavigation && message.action === 'keepTab') {
      log.info(`Tab ${tabId} resulted from navigation, attempting to go back.`);
      browser.scripting
        .executeScript({
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
          },
        })
        .catch((err) =>
          log.error(
            `Failed to execute history.back() script in tab ${tabId}: ${err}`
          )
        );
      sendResponse({ status: 'keep completed, navigating back' });
    } else {
      sendResponse({
        status:
          message.action === 'keepTab' ? 'keep completed' : 'closed processed',
      });
      updateDuplicateCountBadge();
    }

    return false;
  }
  return false;
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  log.info(`Tab removed: ${tabId}`);
  const wasPrompting = promptingTabs.delete(tabId);
  const wasNewlyCreated = newlyCreatedTabs.delete(tabId);

  if (wasPrompting) {
    log.info(`Tab ${tabId} closed while prompting.`);
  }
  updateDuplicateCountBadge();
  notifyPopupToRefresh();
});

updateDuplicateCountBadge();

async function getWindowIdForTab(tabId) {
  try {
    const tab = await browser.tabs.get(tabId);
    return tab.windowId;
  } catch (error) {
    log.error(`Could not get window ID for tab ${tabId}: ${error}`);
    const windows = await browser.windows.getAll();
    return windows.length > 0 ? windows[0].id : null;
  }
}
