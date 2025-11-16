import { log } from './logger.util.js';
import { extractURLsFromHTML } from './dom.util.js';
import { getSavedTabs, saveTabsToStorage } from './storage.util.js';

export async function importToSavedTabs(file) {
  if (!file) return;

  try {
    log.info('Importing tabs to saved list from file:', file.name);
    const htmlContent = await file.text();
    const urls = extractURLsFromHTML(htmlContent);

    if (urls.length === 0) {
      alert('No valid tabs found in the imported file.');
      log.warn('No valid URLs found in imported file');
      return { success: false, message: 'No valid tabs found' };
    }

    const savedTabs = await getSavedTabs();
    const existingUrls = new Set(savedTabs.map((t) => t.url));

    const newTabs = urls
      .filter((url) => !existingUrls.has(url))
      .map((url) => ({
        title: new URL(url).hostname,
        url: url,
        favIconUrl: null,
      }));

    if (newTabs.length > 0) {
      await saveTabsToStorage([...savedTabs, ...newTabs]);
      alert(`Successfully imported ${newTabs.length} tabs to saved list.`);
      log.info(`Imported ${newTabs.length} new tabs to saved list`);
      return { success: true, count: newTabs.length };
    } else {
      alert('All tabs from the file are already in your saved list.');
      log.info('No new tabs to import - all URLs already exist');
      return { success: true, count: 0, message: 'All tabs already exist' };
    }
  } catch (error) {
    log.error('Error importing saved tabs:', error);
    alert('Failed to import tabs. Please check the file format.');
    return { success: false, error };
  }
}

export async function importAndOpenTabs(file) {
  if (!file) return;

  try {
    log.info('Importing and opening tabs from file:', file.name);
    const htmlContent = await file.text();
    const urls = extractURLsFromHTML(htmlContent);

    if (urls.length === 0) {
      alert('No valid URLs found in the imported file.');
      log.warn('No valid URLs found in imported file');
      return { success: false, message: 'No valid URLs found' };
    }

    log.debug(`Opening ${urls.length} tabs from import`);
    for (const url of urls) {
      await browser.tabs.create({ url: url, active: false });
    }

    alert(`Successfully opened ${urls.length} tabs.`);
    log.info(`Opened ${urls.length} tabs from import`);
    return { success: true, count: urls.length };
  } catch (error) {
    log.error('Error importing and opening tabs:', error);
    alert('Failed to import tabs. Please check the file format.');
    return { success: false, error };
  }
}
