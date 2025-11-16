import { useState, useEffect, useCallback } from 'react';
import { log } from '../utils/logger.util.js';
import {
  getSavedTabs,
  addTabToSaved,
  removeTabFromSaved,
  clearSavedTabs,
} from '../utils/storage.util.js';
import { openTabsFromList, getCurrentTab } from '../utils/tabs.util.js';
import { generateExportHTML } from '../utils/export.util.js';
import { downloadHTML, escapeHTML } from '../utils/dom.util.js';
import { isFirefox } from '../utils/browser.util.js';
import { openFullscreenView } from '../utils/fullscreen.util.js';

export const useTabManager = () => {
  const [duplicateTabs, setDuplicateTabs] = useState([]);
  const [allTabs, setAllTabs] = useState([]);
  const [savedTabs, setSavedTabs] = useState([]);
  const [currentTab, setCurrentTab] = useState(null);

  const fetchAllTabData = useCallback(async () => {
    try {
      const tabs = await browser.tabs.query({});
      setAllTabs(tabs);

      const urlMap = new Map();
      tabs.forEach((tab) => {
        if (tab.url) {
          if (!urlMap.has(tab.url)) {
            urlMap.set(tab.url, []);
          }
          urlMap.get(tab.url).push(tab);
        }
      });

      const duplicates = [];
      for (const [url, tabGroup] of urlMap.entries()) {
        if (tabGroup.length > 1) {
          duplicates.push(...tabGroup);
        }
      }
      setDuplicateTabs(duplicates);

      const storedSavedTabs = await getSavedTabs();
      setSavedTabs(storedSavedTabs);

      const activeTab = await getCurrentTab();
      setCurrentTab(activeTab);

      log.info('All tab data fetched and state updated.');
    } catch (error) {
      log.error('Error fetching all tab data:', error);
    }
  }, []);

  useEffect(() => {
    const refreshUI = async () => {
      log.debug('Refreshing UI data...');
      await fetchAllTabData();
    };

    refreshUI();

    const messageListener = (request) => {
      if (request.action === 'refreshUI') {
        log.debug('Received refreshUI message from background.');
        refreshUI();
      }
    };
    browser.runtime.onMessage.addListener(messageListener);
  }, [fetchAllTabData]);

  const handleCloseTab = async (tabId) => {
    log.info(`Attempting to close tab: ${tabId}`);
    try {
      await browser.tabs.remove(tabId);
      log.info(`Tab ${tabId} closed successfully.`);
      fetchAllTabData();
    } catch (error) {
      log.error(`Failed to close tab ${tabId}:`, error);
      fetchAllTabData();
    }
  };

  const handleSaveAndClose = async (tabId) => {
    log.info(`Attempting to save and close tab: ${tabId}`);
    try {
      const tab = await browser.tabs.get(tabId);
      if (tab && tab.url) {
        await addTabToSaved({
          title: tab.title,
          url: tab.url,
          favIconUrl: tab.favIconUrl,
        });
        await browser.tabs.remove(tabId);
        log.info(`Tab ${tabId} saved and closed successfully.`);
        fetchAllTabData();
      } else {
        log.warn(
          `Tab ${tabId} has no URL or does not exist. Closing without saving.`
        );
        await browser.tabs.remove(tabId);
        fetchAllTabData();
      }
    } catch (error) {
      log.error(`Failed to save and close tab ${tabId}:`, error);
      fetchAllTabData();
    }
  };

  const handleReopenTab = async (url) => {
    log.info(`Attempting to reopen tab from saved: ${url}`);
    try {
      await removeTabFromSaved(url);
      await browser.tabs.create({ url: url, active: true });
      log.info(`Tab ${url} reopened successfully.`);
      fetchAllTabData();
    } catch (error) {
      log.error(`Failed to reopen tab for URL ${url}:`, error);
    }
  };

  const handleDeleteSavedTab = async (url) => {
    log.info(`Attempting to delete saved tab: ${url}`);
    try {
      await removeTabFromSaved(url);
      log.info(`Saved tab ${url} deleted successfully.`);
      fetchAllTabData();
    } catch (error) {
      log.error(`Failed to delete saved tab for URL ${url}:`, error);
    }
  };

  const handleSaveAllAndClose = async () => {
    log.info('Attempting to save all and close tabs.');
    try {
      const tabs = await browser.tabs.query({});
      const tabsToSave = tabs.filter(
        (tab) =>
          tab.url &&
          !tab.url.startsWith('chrome:') &&
          !tab.url.startsWith('chrome-extension:') &&
          tab.id !== browser.runtime.id
      );
      for (const tab of tabsToSave) {
        await addTabToSaved({
          title: tab.title,
          url: tab.url,
          favIconUrl: tab.favIconUrl,
        });
      }
      log.debug(`${tabsToSave.length} tabs marked for saving.`);
      let tabIdsToClose = tabsToSave.map((tab) => tab.id);
      const currentTab = await getCurrentTab();
      if (currentTab && tabIdsToClose.includes(currentTab.id)) {
        tabIdsToClose = tabIdsToClose.filter((id) => id !== currentTab.id);
      }
      const fullscreenTab = tabs.find(
        (tab) =>
          tab.url?.includes(browser.runtime.getURL('')) &&
          tab.url?.includes('mode=fullscreen&name=tab-options')
      );
      if (fullscreenTab && tabIdsToClose.includes(fullscreenTab.id)) {
        tabIdsToClose = tabIdsToClose.filter((id) => id !== fullscreenTab.id);
        log.debug('Fullscreen tab excluded from closing.');
      }
      if (tabIdsToClose.length > 0) {
        await browser.tabs.remove(tabIdsToClose);
        log.info(`${tabIdsToClose.length} tabs closed.`);
      }
      fetchAllTabData();
    } catch (error) {
      log.error('Failed to save and close all tabs:', error);
    }
  };

  const handleReopenAllTabs = async () => {
    log.info('Attempting to reopen all saved tabs.');
    try {
      const savedTabs = await getSavedTabs();
      if (savedTabs.length > 0) {
        log.debug(`Found ${savedTabs.length} saved tabs to reopen.`);
        await openTabsFromList(savedTabs);
        await clearSavedTabs();
        fetchAllTabData();
      } else {
        log.info('No saved tabs to reopen.');
      }
    } catch (error) {
      log.error('Failed to reopen all tabs:', error);
    }
  };

  const handleDeleteAllSavedTabs = async () => {
    log.info('Attempting to delete all saved tabs.');
    const savedTabs = await getSavedTabs();
    if (savedTabs.length === 0) {
      log.info('No saved tabs to delete.');
      alert('There are no saved tabs to delete.');
      return;
    }
    if (
      confirm(
        'Are you sure you want to delete ALL saved tabs? This action cannot be undone.'
      )
    ) {
      log.debug('User confirmed deletion of all saved tabs.');
      try {
        await clearSavedTabs();
        fetchAllTabData();
        alert('All saved tabs have been deleted.');
        log.info('All saved tabs successfully deleted by user confirmation.');
      } catch (error) {
        log.error('Failed to delete all saved tabs:', error);
        alert('An error occurred while trying to delete all saved tabs.');
      }
    } else {
      log.debug('User cancelled deletion of all saved tabs.');
    }
  };

  const handleExportSavedTabs = async () => {
    log.info('Starting export of saved tabs to HTML.');
    const savedTabs = await getSavedTabs();
    const currentDate = new Date().toISOString().split('T')[0];
    log.debug(`Found ${savedTabs.length} saved tabs for export.`);

    let tabListItemsHTML = '';
    savedTabs.forEach((tab) => {
      const title = tab.title ? escapeHTML(tab.title) : '(No Title)';
      const url = tab.url ? escapeHTML(tab.url) : '(No URL)';
      if (
        tab.url &&
        (tab.url.startsWith('http://') || tab.url.startsWith('https://'))
      ) {
        tabListItemsHTML += `
          <li>
              <div class="tab-info">
                  <a href="${url}" target="_blank" rel="noopener noreferrer" class="tab-title-link">${title}</a>
                  <span class="url">${url}</span>
              </div>
          </li>`;
      }
    });

    const pageTitle = `Exported Saved Tab List (${currentDate})`;
    const headerTitle = `Exported Saved Tab List (${currentDate})`;
    const introText =
      'This file contains a list of your tabs saved for later from the tabOptions extension.';

    const htmlContent = generateExportHTML(
      pageTitle,
      headerTitle,
      introText,
      tabListItemsHTML
    );

    downloadHTML(
      htmlContent,
      `tab_options_saved_tabs_export_${currentDate}.html`
    );
    log.info(
      `Saved tabs exported to tab_options_saved_tabs_export_${currentDate}.html.`
    );
  };

  const handleExportOpenTabs = async () => {
    log.info('Starting export of open tabs to HTML.');
    const openTabs = await browser.tabs.query({
      url: ['http://*/*', 'https://*/*'],
    });
    const currentDate = new Date().toISOString().split('T')[0];
    log.debug(`Found ${openTabs.length} open tabs for export.`);

    let tabListItemsHTML = '';
    openTabs.forEach((tab) => {
      const title = tab.title ? escapeHTML(tab.title) : '(No Title)';
      const url = tab.url ? escapeHTML(tab.url) : '(No URL)';
      if (
        tab.url &&
        (tab.url.startsWith('http://') || tab.url.startsWith('https://'))
      ) {
        tabListItemsHTML += `
          <li>
              <div class="tab-info">
                  <a href="${url}" target="_blank" rel="noopener noreferrer" class="tab-title-link">${title}</a>
                  <span class="url">${url}</span>
              </div>
          </li>`;
      }
    });

    const pageTitle = `Exported Open Tabs (${currentDate})`;
    const headerTitle = `Exported Open Tabs (${currentDate})`;
    const introText =
      'This file contains a list of your currently open tabs exported from the tabOptions extension.';

    const htmlContent = generateExportHTML(
      pageTitle,
      headerTitle,
      introText,
      tabListItemsHTML
    );

    downloadHTML(
      htmlContent,
      `tab_options_open_tabs_export_${currentDate}.html`
    );
    log.info(
      `Open tabs exported to tab_options_open_tabs_export_${currentDate}.html.`
    );
  };

  const handleFullscreenImport = async (type, fileInput) => {
    if (isFirefox() && !document.body.classList.contains('fullscreen-mode')) {
      log.debug(
        `Firefox detected (not in fullscreen), opening in fullscreen tab.`
      );
      await openFullscreenView(`&triggerImport=${type}`);
      window.close();
    } else {
      log.debug(
        `Not Firefox or already in fullscreen, directly clicking file input for ${type}.`
      );
      fileInput.click();
    }
  };

  return {
    duplicateTabs,
    allTabs,
    savedTabs,
    handleCloseTab,
    handleSaveAndClose,
    handleReopenTab,
    handleDeleteSavedTab,
    handleSaveAllAndClose,
    handleReopenAllTabs,
    handleDeleteAllSavedTabs,
    handleExportSavedTabs,
    handleExportOpenTabs,
    handleFullscreenImport,
    currentTab,
  };
};
