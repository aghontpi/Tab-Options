/**
 * Extracts the domain from a given URL.
 * @param {string} url - The URL to extract the domain from.
 * @returns {string} The domain (e.g., "google.com") or "Unknown" if invalid.
 */
export const getDomainFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    return 'Unknown';
  }
};

/**
 * Groups a list of tabs by their domain.
 * @param {Array} tabs - The list of tabs to group.
 * @returns {Object} An object where keys are domains and values are arrays of tabs.
 */
export const groupTabsByDomain = (tabs) => {
  return tabs.reduce((groups, tab) => {
    const domain = getDomainFromUrl(tab.url);
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(tab);
    return groups;
  }, {});
};
