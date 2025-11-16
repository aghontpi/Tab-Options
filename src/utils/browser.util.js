export function isFirefox() {
  return (
    typeof browser !== 'undefined' &&
    browser.runtime &&
    (browser.runtime.getURL('').startsWith('moz-extension://') ||
      navigator.userAgent.includes('Firefox'))
  );
}
