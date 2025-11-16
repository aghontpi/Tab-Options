export async function openFullscreenView(additionalParams = '') {
  const path = window.location.pathname.substring(1);
  const tabs = await browser.tabs.query({});
  const fullscreenTab = tabs.find(
    (tab) =>
      tab.url?.includes(browser.runtime.getURL('')) &&
      tab.url?.includes('mode=fullscreen&name=tab-options')
  );

  if (fullscreenTab) {
    if (additionalParams) {
      const newUrl = browser.runtime.getURL(
        path + '?mode=fullscreen&name=tab-options' + additionalParams
      );
      await browser.tabs.update(fullscreenTab.id, {
        url: newUrl,
        active: true,
      });
    } else {
      await browser.tabs.update(fullscreenTab.id, { active: true });
    }
    await browser.windows.update(fullscreenTab.windowId, { focused: true });
  } else {
    browser.tabs.create({
      url: browser.runtime.getURL(
        path + '?mode=fullscreen&name=tab-options' + additionalParams
      ),
      active: true,
    });
  }
}
