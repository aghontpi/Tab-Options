import { log } from './logger.util.js';

export async function openTabsFromList(tabsToOpen, makeActive = false) {
  log.info(`Attempting to open ${tabsToOpen.length} tabs from list.`);
  let openedCount = 0;
  for (const tab of tabsToOpen) {
    if (tab.url) {
      try {
        log.debug(`Creating tab for URL: ${tab.url}`);
        await browser.tabs.create({ url: tab.url, active: makeActive });
        openedCount++;
      } catch (tabError) {
        log.error(`Failed to open tab for URL ${tab.url}:`, tabError);
      }
    } else {
      log.warn('Skipping tab with no URL in openTabsFromList.', tab);
    }
  }
  log.info(
    `Successfully opened ${openedCount} out of ${tabsToOpen.length} tabs.`
  );
  return openedCount;
}

export async function getCurrentTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}
