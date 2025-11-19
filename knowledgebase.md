# Knowledgebase Entry: Tab-Operations Extension

## Project Overview
- Chrome extension for managing tabs, detecting duplicates, and providing export/import functionality.
- Core components: `background.js`, `TabListComponent`, `TabActionsComponent`, utilities for storage, logging, and tab operations.

## Existing Features
- Duplicate detection with prompt to merge or keep tabs.
- Export/Import of open and saved tabs.
- Save all tabs and close, close duplicate tabs, badge count for duplicates.
- UI components for listing duplicate tabs, all open tabs, and saved tabs.

## Suggested Enhancements
### Quick Wins (High Impact, Low Effort)
1. **Search & Filter Tabs** – Add a search bar to filter `allTabs` by title/URL.
2. **Sort Options** – Dropdown to sort tabs by Title, URL, or Last Accessed.
3. **Group All Tabs by Domain** – Toggle view to group tabs by domain, similar to duplicate grouping.

### Advanced Features
4. **Stale Tab Highlighter** – Dim tabs not accessed in >24h using `lastAccessed` from `browser.tabs`.
5. **Close Stale Tabs Button** – One‑click cleanup of old tabs.
6. **Memory Usage Indicator** – Show memory usage per tab (requires `processes` permission).
7. **Named Session Stashing** – Allow users to name saved tab groups for later restoration.

These suggestions aim to improve usability, organization, and performance awareness for end‑users.
