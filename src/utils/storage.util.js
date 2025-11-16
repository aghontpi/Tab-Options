import { log } from './logger.util.js';

export const SAVED_TABS_KEY = 'savedTabs';

export async function getSavedTabs() {
  log.debug('Attempting to get saved tabs from storage.');
  const result = await browser.storage.local.get(SAVED_TABS_KEY);
  const savedTabs = result[SAVED_TABS_KEY] || [];
  log.debug(`Retrieved ${savedTabs.length} saved tabs.`);
  return savedTabs;
}

export async function saveTabsToStorage(tabs) {
  log.debug(`Attempting to save ${tabs.length} tabs to storage.`);
  await browser.storage.local.set({ [SAVED_TABS_KEY]: tabs });
  log.info(`${tabs.length} tabs saved to storage.`);
}

export async function addTabToSaved(tabInfo) {
  log.debug(`Attempting to add tab to saved: ${tabInfo.url}`);
  const savedTabs = await getSavedTabs();
  if (!savedTabs.some((saved) => saved.url === tabInfo.url)) {
    savedTabs.push({
      title: tabInfo.title,
      url: tabInfo.url,
      favIconUrl: tabInfo.favIconUrl,
    });
    await saveTabsToStorage(savedTabs);
    log.info(`Tab added to saved: ${tabInfo.url}`);
  } else {
    log.debug(`Tab already saved, not adding: ${tabInfo.url}`);
  }
}

export async function removeTabFromSaved(url) {
  log.debug(`Attempting to remove tab from saved: ${url}`);
  let savedTabs = await getSavedTabs();
  const initialCount = savedTabs.length;
  savedTabs = savedTabs.filter((tab) => tab.url !== url);
  if (savedTabs.length < initialCount) {
    await saveTabsToStorage(savedTabs);
    log.info(`Tab removed from saved: ${url}`);
  } else {
    log.debug(`Tab not found in saved, no removal: ${url}`);
  }
}

export async function clearSavedTabs() {
  log.info('Attempting to clear all saved tabs.');
  await browser.storage.local.remove(SAVED_TABS_KEY);
  log.info('All saved tabs cleared from storage.');
}
