document.addEventListener('DOMContentLoaded', async () => {
    const duplicateTabsList = document.getElementById('duplicate-tabs-list');
    const noDuplicatesMsg = document.getElementById('no-duplicates-msg');
    const allTabsList = document.getElementById('all-tabs-list');
    const savedTabsList = document.getElementById('saved-tabs-list');
    const noSavedTabsMsg = document.getElementById('no-saved-tabs-msg');

    const SAVED_TABS_KEY = 'savedTabs';

    // --- Helper Functions ---

    function createTabListItem(tab, buttons = []) {
        const listItem = document.createElement('li');
        listItem.dataset.tabId = tab.id || ''; // Store tab ID if available
        listItem.dataset.tabUrl = tab.url;     // Store URL (useful for saved tabs)
        listItem.title = `${tab.title}\n${tab.url}`; // Tooltip

        const img = document.createElement('img');
        img.src = tab.favIconUrl || 'icons/icon16.png'; // Use favicon or default
        img.classList.add('icon');
        img.onerror = () => { img.src = 'icons/icon16.png'; }; // Fallback on error

        const tabInfo = document.createElement('span');
        tabInfo.classList.add('tab-info');

        const titleSpan = document.createElement('span');
        titleSpan.classList.add('tab-title');
        titleSpan.textContent = tab.title || '(No Title)';
        tabInfo.appendChild(titleSpan);

        const urlSpan = document.createElement('span');
        urlSpan.classList.add('tab-url');
        urlSpan.textContent = tab.url;
        tabInfo.appendChild(urlSpan);

        listItem.appendChild(img);
        listItem.appendChild(tabInfo);

        buttons.forEach(buttonConfig => {
            const button = document.createElement('button');
            button.textContent = buttonConfig.text;
            button.addEventListener('click', buttonConfig.onClick);
            listItem.appendChild(button);
        });

        listItem.addEventListener('click', async (e) => {
            if (e.target.tagName.toLowerCase() === 'button') return;
            const tabId = parseInt(listItem.dataset.tabId);
            if (!isNaN(tabId)) {
                try {
                    const { windowId } = await chrome.tabs.update(tabId, { active: true });
                    await chrome.windows.update(windowId, { focused: true });
                    console.log(`Tab ${tabId} activated. Focusing window ${windowId}...`);
                } catch (err) {
                    console.error("Failed to activate tab/window:", err);
                }
            }
        });

        return listItem;
    }

    async function getSavedTabs() {
        const result = await chrome.storage.local.get(SAVED_TABS_KEY);
        return result[SAVED_TABS_KEY] || [];
    }

    async function saveTabsToStorage(tabs) {
        await chrome.storage.local.set({ [SAVED_TABS_KEY]: tabs });
    }

    async function addTabToSaved(tabInfo) {
        const savedTabs = await getSavedTabs();
        // Avoid saving duplicates to the saved list
        if (!savedTabs.some(saved => saved.url === tabInfo.url)) {
            savedTabs.push({ title: tabInfo.title, url: tabInfo.url, favIconUrl: tabInfo.favIconUrl });
            await saveTabsToStorage(savedTabs);
        }
    }

    async function removeTabFromSaved(url) {
        let savedTabs = await getSavedTabs();
        savedTabs = savedTabs.filter(tab => tab.url !== url);
        await saveTabsToStorage(savedTabs);
    }

    // --- Core Logic ---

    async function refreshLists() {
        // Clear existing lists
        duplicateTabsList.innerHTML = '';
        allTabsList.innerHTML = '';
        savedTabsList.innerHTML = '';
        noDuplicatesMsg.style.display = 'none';
        noSavedTabsMsg.style.display = 'none';

        try {
            const tabs = await chrome.tabs.query({});
            const savedTabs = await getSavedTabs();
            const urlMap = new Map();
    
            // Populate All Tabs list and build URL map (KEEP THIS PART AS IS)
            // Cconsider all web pages except new tab pages
            tabs.forEach(tab => {
                if (!tab.url || tab.url.startsWith('chrome://new-tab') || tab.url.startsWith('chrome://newtab')) {
                   return;
                }
                allTabsList.appendChild(createTabListItem(tab, [
                    { text: 'Save & Close', onClick: () => handleSaveAndClose(tab.id) },
                    { text: 'Close', onClick: () => handleCloseTab(tab.id) }
                ]));
                if (!urlMap.has(tab.url)) {
                    urlMap.set(tab.url, []);
                }
                urlMap.get(tab.url).push(tab);
            });
    
            // Populate Duplicate Tabs list (MODIFY THIS PART)
            let duplicateCount = 0;
            urlMap.forEach((tabsWithSameUrl, url) => {
                if (tabsWithSameUrl.length > 1) {
                    duplicateCount++;
    
                    // --- Create Group Header ---
                    const groupHeader = document.createElement('div');
                    groupHeader.classList.add('group-header'); // Use this class for styling
    
                    // Create span for the URL text
                    const groupUrlSpan = document.createElement('span');
                    groupUrlSpan.classList.add('group-url');
                    groupUrlSpan.textContent = `Duplicates of: ${url}`;
                    groupUrlSpan.title = url; // Show full URL on hover
    
                    // Create "Close All These" button
                    const closeAllButton = document.createElement('button');
                    closeAllButton.textContent = 'Close All Duplicates';
                    closeAllButton.classList.add('close-all-duplicates-button'); // Class for styling/targeting
                    closeAllButton.title = `Close all ${tabsWithSameUrl.length -1 } tabs with URL: ${url}`;
    
                    // Add click listener to the "Close All These" button
                    closeAllButton.addEventListener('click', async () => {
                        const tabIdsToClose = tabsWithSameUrl.filter((_, index) => index !== 0).map(tab => tab.id)
                        console.log(`Closing duplicate tabs with IDs: ${tabIdsToClose.join(', ')} for URL: ${url}`);
                        try {
                            await chrome.tabs.remove(tabIdsToClose);
                            refreshLists(); // Refresh the entire popup view
                        } catch (error) {
                            console.error("Error closing duplicate tabs:", error);
                            // Might happen if some tabs were closed manually
                            refreshLists(); // Refresh anyway to show current state
                        }
                    });
    
                    // Append text and button to the header
                    groupHeader.appendChild(groupUrlSpan);
                    groupHeader.appendChild(closeAllButton);
    
                    // Append the header to the main duplicate list
                    duplicateTabsList.appendChild(groupHeader);
                    // --- End Group Header ---
    
    
                    // Append individual duplicate tab items (KEEP THIS PART AS IS)
                    tabsWithSameUrl.forEach(dupTab => {
                        duplicateTabsList.appendChild(createTabListItem(dupTab, [
                            { text: 'Close', onClick: () => handleCloseTab(dupTab.id) }
                        ]));
                    });
                }
            });
    
            // Show 'no duplicates' message if needed (KEEP THIS PART AS IS)
            if (duplicateCount === 0) {
                noDuplicatesMsg.style.display = 'block';
            }
    
            // Populate Saved Tabs list (KEEP THIS PART AS IS)
            if (savedTabs.length === 0) {
                 noSavedTabsMsg.style.display = 'block';
            } else {
                savedTabs.forEach(savedTab => {
                    savedTabsList.appendChild(createTabListItem(savedTab, [
                        { text: 'Reopen', onClick: () => handleReopenTab(savedTab.url) },
                        { text: 'Delete', onClick: () => handleDeleteSavedTab(savedTab.url) }
                    ]));
                });
            }
    
        } catch (error) {
            console.error("Error refreshing lists:", error);
            // Display an error message in the popup?
        }
    }
 

    // --- Event Handlers ---

    async function handleCloseTab(tabId) {
        try {
            await chrome.tabs.remove(tabId);
            refreshLists(); // Update UI
        } catch (error) {
            console.error(`Failed to close tab ${tabId}:`, error);
            // Tab might have been closed already, refresh anyway
            refreshLists();
        }
    }

    async function handleSaveAndClose(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab && tab.url && !(tab.url.startsWith('chrome://new-tab') || tab.url.startsWith('chrome://newtab'))) {
                await addTabToSaved({ title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl });
                await chrome.tabs.remove(tabId);
                refreshLists(); // Update UI
            } else {
                 console.warn(`Tab ${tabId} not suitable for saving or already closed.`);
                 // Optionally just close it if it's not savable
                 await chrome.tabs.remove(tabId);
                 refreshLists();
            }
        } catch (error) {
            console.error(`Failed to save and close tab ${tabId}:`, error);
            // Tab might have been closed already, try refreshing
            refreshLists();
        }
    }

    async function handleReopenTab(url) {
        try {
            await removeTabFromSaved(url); // Remove from saved list before reopening to avoid losing focus during async
            await chrome.tabs.create({ url: url, active: true });
            refreshLists(); // Update UI
        } catch (error) {
            console.error(`Failed to reopen tab for URL ${url}:`, error);
        }
    }

     async function handleDeleteSavedTab(url) {
        try {
            await removeTabFromSaved(url);
            refreshLists(); // Update UI
        } catch (error) {
            console.error(`Failed to delete saved tab for URL ${url}:`, error);
        }
    }


    // --- Initial Load ---
    refreshLists();

});