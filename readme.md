# Tab Options

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/aghontpi/Tab-Options?style=for-the-badge)](../../releases)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/kafdoidjnnbjciplpkhhfjoefkpfbplj?color=4285F4&label=Chrome%20Web%20Store&logo=googlechrome&style=for-the-badge)](https://chromewebstore.google.com/detail/tab-options/kafdoidjnnbjciplpkhhfjoefkpfbplj)

A lightweight Chrome extension that keeps your browsing session under control: instantly spot and close duplicate tabs, save sessions for later, and export/import/share your work with a single click.

---

## Features

|            x             | Details                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate-Tab Detection  | Real-time badge counter plus a toast asking whether to merge (switch & close) or keep both tabs.                                    |
| All Tabs Panel           | Popup (and optional full-screen view) listing every open tab, with buttons to **Close**, **Save & Close**, or **Save all & Close**. |
| Session Save / Restore   | One-click “Save” area. Restore/Sharing everything at once or reopen individual pages.                                               |
| ️ Import, Export & Share  | Export your saved list to an HTML file; import it again on any machine.                                                             |
| Duplicate Tabs Summary   | Separate block at the top of the popup – see duplicates at a glance and close them in bulk.                                         |
| Lightweight              | under 30kb                                                                                                                          |

---

## Installation

1. Visit the Chrome Web Store:  
   https://chromewebstore.google.com/detail/tab-options/kafdoidjnnbjciplpkhhfjoefkpfbplj
2. Click **Add to Chrome** → **Add extension**.
3. Pin the blue “TO” icon in your toolbar for quick access (optional).

---

## Quick Start

1. Open a few webpages; duplicate one to see the badge counter turn red.
2. Use:  
   • **Merge (Switch & Close)** to jump to the original and close the copy.  
   • **Keep & Go Back** if you really need two identical tabs.
3. Click the toolbar icon.
4. In the popup, hit **Save all tabs & close** to stash your current session.
5. Later, press **Reopen all tabs** to bring everything back.
6. Export & Import all sessions

### Preview 1

<p align="center">
  <img src="src/demo/preview1.png" height="300" alt="Preview 1">
</p>

### Preview 2

<p align="center">
  <img src="src/demo/preview2.png" height="auto" alt="Preview 2">
</p>

### Preview 3

<p align="center">
  <img src="src/demo/preview3.png" height="300" alt="Preview 3">
</p>

### Export

<p align="center">
  <img src="src/demo/export.png" height="300" alt="Export screen">
</p>

---

## Options

| Option                | Where              | Notes                                                                                              |
| --------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| Full-screen dashboard | Popup → ↗          | Expands the popup into its own tab for large sessions.                                             |
| Export/Import/Share   | Popup bottom right | Creates a page, that can be shared with others; import merges with your existing open/ saved tabs. |

---

## Motivation

Having dozens of identical tabs scattered across multiple windows and profile is a pain, happens in personal machine and office machine.

---

## Development

```bash
git clone git@github.com:aghontpi/Tab-Options.git
cd tab-options
pnpm install
pnpm run dev
```

1. Open Chrome → `chrome://extensions` → Enable **Developer mode**.
2. Click **Load unpacked** and select the `dev-build/` folder.

## License

Apache License 2.0 - https://github.com/aghontpi/Tab-Options/blob/main/LICENSE

---

## Support

• File an issue → GitHub Issues tab  
• Rate on the [Chrome Web Store](https://chromewebstore.google.com/detail/tab-options/kafdoidjnnbjciplpkhhfjoefkpfbplj)
