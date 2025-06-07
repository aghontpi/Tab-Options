if (typeof globalThis.browser === "undefined" && typeof globalThis.chrome !== "undefined") {
  globalThis.browser = globalThis.chrome;
}

// Export for ES modules (service workers)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = globalThis.browser;
}
