document.addEventListener('DOMContentLoaded', async () => {
    const duplicateTabsList = document.getElementById('duplicate-tabs-list');
    const noDuplicatesMsg = document.getElementById('no-duplicates-msg');
    const allTabsList = document.getElementById('all-tabs-list');
    const savedTabsList = document.getElementById('saved-tabs-list');
    const noSavedTabsMsg = document.getElementById('no-saved-tabs-msg');
    const saveAndCloseButton = document.getElementById('save-and-close-tabs');
    const reopenAllButton = document.getElementById('reopen-all-tabs');
    const deleteAllSavedTabsButton = document.getElementById('delete-all-saved-tabs-btn');

    const exportSavedTabsButton = document.getElementById('export-saved-tabs');
    const importSavedTabsButton = document.getElementById('import-saved-tabs');
    const importSavedFileInput = document.getElementById('import-saved-file-input');

    const exportOpenTabsButton = document.getElementById('export-open-tabs');
    const importOpenTabsButton = document.getElementById('import-open-tabs');
    const importOpenFileInput = document.getElementById('import-open-file-input');

    const SAVED_TABS_KEY = 'savedTabs';
    const { log } = await import('./utils/logger.js'); // Import the logger

    function isFirefox() {
        return typeof browser !== "undefined" && browser.runtime && browser.runtime.getURL("").startsWith("moz-extension://");
    }

    browser.runtime.onMessage.addListener((message) => {
        if (message.action === "refreshUI") {
            refreshLists();
        }
    });

    if (new URLSearchParams(window.location.search).get('mode') === 'fullscreen') {
        document.body.classList.add('fullscreen-mode');
        document.title = 'Tab Options - Full Screen View';
        log.info('Fullscreen mode activated.');
    }

    const popupHTML = new URL('./popup.html', import.meta.url).pathname;
    
    async function openFullscreenView(additionalParams = '') {
        const tabs = await browser.tabs.query({});
        const fullscreenTab = tabs.find(tab =>
            tab.url?.includes(browser.runtime.getURL('')) &&
            tab.url?.includes('mode=fullscreen&name=tab-options')
        );

        if (fullscreenTab) {
            if (additionalParams) {
                // If additional params provided, update the URL to include them
                const newUrl = browser.runtime.getURL(popupHTML + "?mode=fullscreen&name=tab-options" + additionalParams);
                await browser.tabs.update(fullscreenTab.id, { url: newUrl, active: true });
            } else {
                // If no additional params, just activate the existing tab
                await browser.tabs.update(fullscreenTab.id, { active: true });
            }
            await browser.windows.update(fullscreenTab.windowId, { focused: true });
        } else {
            browser.tabs.create({
                url: browser.runtime.getURL(popupHTML + "?mode=fullscreen&name=tab-options" + additionalParams),
                active: true,
            });
        }
    }

    document.getElementById('fullscreen-link')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await openFullscreenView();
        window.close();
    });

    function updateAllTabsHeader(count) {
        const allTabsHeader = document.getElementById('all-tabs-header');
        allTabsHeader.textContent = `All Open Tabs (${count})`;
    }

    const icon16 = new URL('./icons/icon16.png', import.meta.url).pathname;
    function createTabListItem(tab, buttons = []) {
        const listItem = document.createElement('li');
        listItem.dataset.tabId = tab.id || '';
        listItem.dataset.tabUrl = tab.url;
        listItem.title = `${tab.title}\n${tab.url}`;

        const img = document.createElement('img');
        img.src = tab.favIconUrl || icon16;
        img.classList.add('icon');
        img.onerror = () => { img.src = icon16; };

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
        listItem.classList.add('tab-list-item');

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
                    const { windowId } = await browser.tabs.update(tabId, { active: true });
                    await browser.windows.update(windowId, { focused: true });
                } catch (err) {
                    console.error("Failed to activate tab/window:", err);
                }
            }
        });
        return listItem;
    }

    async function getSavedTabs() {
        log.debug('Attempting to get saved tabs from storage.');
        const result = await browser.storage.local.get(SAVED_TABS_KEY);
        const savedTabs = result[SAVED_TABS_KEY] || [];
        log.debug(`Retrieved ${savedTabs.length} saved tabs.`);
        return savedTabs;
    }

    async function saveTabsToStorage(tabs) {
        log.debug(`Attempting to save ${tabs.length} tabs to storage.`);
        await browser.storage.local.set({ [SAVED_TABS_KEY]: tabs });
        log.info(`${tabs.length} tabs saved to storage.`);
    }

    async function addTabToSaved(tabInfo) {
        log.debug(`Attempting to add tab to saved: ${tabInfo.url}`);
        const savedTabs = await getSavedTabs();
        if (!savedTabs.some(saved => saved.url === tabInfo.url)) {
            savedTabs.push({ title: tabInfo.title, url: tabInfo.url, favIconUrl: tabInfo.favIconUrl });
            await saveTabsToStorage(savedTabs);
            log.info(`Tab added to saved: ${tabInfo.url}`);
        } else {
            log.debug(`Tab already saved, not adding: ${tabInfo.url}`);
        }
    }

    async function removeTabFromSaved(url) {
        log.debug(`Attempting to remove tab from saved: ${url}`);
        let savedTabs = await getSavedTabs();
        const initialCount = savedTabs.length;
        savedTabs = savedTabs.filter(tab => tab.url !== url);
        if (savedTabs.length < initialCount) {
            await saveTabsToStorage(savedTabs);
            log.info(`Tab removed from saved: ${url}`);
        } else {
            log.debug(`Tab not found in saved, no removal: ${url}`);
        }
    }

    async function clearSavedTabs() {
        log.info('Attempting to clear all saved tabs.');
        await browser.storage.local.remove(SAVED_TABS_KEY);
        log.info('All saved tabs cleared from storage.');
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function generateExportHTML(pageTitle, headerTitle, introText, tabListItemsHTML) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>tabOptions - ${escapeHTML(pageTitle)}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 15px; 
            background-color: #f4f7f6;
            display: flex; 
            justify-content: center; 
            align-items: flex-start; 
            min-height: calc(100vh - 30px);
        }
        .container {
            max-width: 700px; 
            width: 100%; 
            background-color: #fff;
            padding: 20px 25px; 
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.07);
            margin-top: 15px; 
            margin-bottom: 15px; 
        }
        h1 {
            color: #0056b3;
            text-align: center;
            margin-top: 0;
            margin-bottom: 15px; 
            font-size: 1.6em; 
            font-weight: 600;
        }
        p.intro {
            color: #555;
            margin-bottom: 20px; 
            text-align: center;
            font-size: 1em; 
        }
        ul {
            list-style: none;
            padding: 0;
            margin: 0 0 20px 0; 
        }
        ul:empty { 
            margin-bottom: 0;
        }
        li {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            margin-bottom: 10px;
            padding: 10px 15px; 
            border-radius: 6px;
            display: flex;
            align-items: center;
            transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
        }
        li:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        li:last-child {
            margin-bottom: 0;
        }
        .tab-info {
            flex-grow: 1;
            overflow: hidden;
        }
        .tab-info a.tab-title-link {
            text-decoration: none;
            color: #007bff;
            font-weight: 600;
            display: block;
            font-size: 1em; 
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 2px;
        }
        .tab-info a.tab-title-link:hover {
            text-decoration: underline;
            color: #0056b3;
        }
        .tab-info .url {
            font-size: 0.8em; 
            color: #6c757d;
            display: block;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .store-placeholder {
            text-align: center;
            color: #5a6268;
            margin-top: 25px; 
            font-size: 0.85em; 
            border-top: 1px solid #e9ecef;
            padding-top: 20px; 
        }
        .store-placeholder a {
            color: #0069d9;
            text-decoration: none;
            font-weight: 500;
        }
        .store-placeholder a:hover {
            text-decoration: underline;
            color: #004a99;
        }
        .no-tabs-message { 
            text-align: center;
            color: #777;
            font-style: italic;
            padding: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${escapeHTML(headerTitle)}</h1>
        <p class="intro">${escapeHTML(introText)}</p>
        <ul>${tabListItemsHTML}</ul>
        ${tabListItemsHTML.trim() === '' ? '<p class="no-tabs-message">No tabs were exported.</p>' : ''}
        <p class="store-placeholder">
            Thank you for using tabOptions! Help us improve by 
            <a href="https://chromewebstore.google.com/detail/tab-options/kafdoidjnnbjciplpkhhfjoefkpfbplj/reviews" target="_blank" rel="noopener noreferrer">leaving a review</a>.
            <br>
            You can also find us on the 
            <a href="https://chromewebstore.google.com/detail/tab-options/kafdoidjnnbjciplpkhhfjoefkpfbplj" target="_blank" rel="noopener noreferrer">Chrome Web Store</a>.
        </p>
    </div>
</body>
</html>`;
    }

    async function openTabsFromList(tabsToOpen, makeActive = false) {
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
                    console.error(`Failed to open tab for URL ${tab.url}:`, tabError);
                }
            } else {
                log.warn('Skipping tab with no URL in openTabsFromList.', tab);
            }
        }
        log.info(`Successfully opened ${openedCount} out of ${tabsToOpen.length} tabs.`);
        return openedCount;
    }


    async function refreshLists() {
        log.debug('Refreshing UI lists.');
        duplicateTabsList.innerHTML = '';
        allTabsList.innerHTML = '';
        savedTabsList.innerHTML = '';
        noDuplicatesMsg.style.display = 'none';
        noSavedTabsMsg.style.display = 'none';
        deleteAllSavedTabsButton.style.display = 'none'; 

        try {
            const tabs = await browser.tabs.query({});
            const savedTabs = await getSavedTabs();
            const urlMap = new Map();

            updateAllTabsHeader(tabs.length);
            tabs.forEach(tab => {
                if (!tab.url) {
                    log.debug('Skipping tab with no URL in refreshLists (allTabsList).', tab);
                    return;
                }
                allTabsList.appendChild(createTabListItem(tab, [
                    { text: 'Save & Close', onClick: () => handleSaveAndClose(tab.id) },
                    { text: 'Close', onClick: () => handleCloseTab(tab.id) }
                ]));
                if (!urlMap.has(tab.url)) urlMap.set(tab.url, []);
                urlMap.get(tab.url).push(tab);
            });

            let duplicateCount = 0;
            urlMap.forEach((tabsWithSameUrl, url) => {
                if (tabsWithSameUrl.length > 1) {
                    duplicateCount++;
                    const groupHeader = document.createElement('div');
                    groupHeader.classList.add('group-header');
                    const groupUrlSpan = document.createElement('span');
                    groupUrlSpan.classList.add('group-url');
                    groupUrlSpan.textContent = `Duplicates of: ${url}`;
                    groupUrlSpan.title = url;
                    const closeAllButton = document.createElement('button');
                    closeAllButton.textContent = 'Close All Duplicates';
                    closeAllButton.classList.add('close-all-duplicates-button');
                    closeAllButton.title = `Close all ${tabsWithSameUrl.length -1 } tabs with URL: ${url}`;
                    closeAllButton.addEventListener('click', async () => {
                        const tabIdsToClose = tabsWithSameUrl.filter((_, index) => index !== 0).map(tab => tab.id);
                        try {
                            await browser.tabs.remove(tabIdsToClose);
                            refreshLists();
                        } catch (error) {
                            console.error("Error closing duplicate tabs:", error);
                            refreshLists();
                        }
                    });
                    groupHeader.appendChild(groupUrlSpan);
                    groupHeader.appendChild(closeAllButton);
                    duplicateTabsList.appendChild(groupHeader);
                    tabsWithSameUrl.forEach(dupTab => {
                        duplicateTabsList.appendChild(createTabListItem(dupTab, [
                            { text: 'Close', onClick: () => handleCloseTab(dupTab.id) }
                        ]));
                    });
                }
            });
            if (duplicateCount === 0) noDuplicatesMsg.style.display = 'block';
            log.debug(`Found ${duplicateCount} groups of duplicate tabs.`);

            if (savedTabs.length === 0) {
                 noSavedTabsMsg.style.display = 'block';
                 deleteAllSavedTabsButton.style.display = 'none'; 
                 log.debug('No saved tabs found.');
            } else {
                noSavedTabsMsg.style.display = 'none';
                deleteAllSavedTabsButton.style.display = 'inline-flex'; 
                log.debug(`Displaying ${savedTabs.length} saved tabs.`);
                savedTabs.forEach(savedTab => {
                    savedTabsList.appendChild(createTabListItem(savedTab, [
                        { text: 'Reopen', onClick: () => handleReopenTab(savedTab.url) },
                        { text: 'Delete', onClick: () => handleDeleteSavedTab(savedTab.url) }
                    ]));
                });
            }
        } catch (error) {
            log.error("Error refreshing lists:", error);
            console.error("Error refreshing lists:", error);
            deleteAllSavedTabsButton.style.display = 'none'; 
        }
    }

    async function handleCloseTab(tabId) {
        log.info(`Attempting to close tab: ${tabId}`);
        try {
            await browser.tabs.remove(tabId);
            log.info(`Tab ${tabId} closed successfully.`);
            refreshLists();
        } catch (error) {
            log.error(`Failed to close tab ${tabId}:`, error);
            console.error(`Failed to close tab ${tabId}:`, error);
            refreshLists();
        }
    }

    async function handleSaveAndClose(tabId) {
        log.info(`Attempting to save and close tab: ${tabId}`);
        try {
            const tab = await browser.tabs.get(tabId);
            if (tab && tab.url) {
                await addTabToSaved({ title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl });
                await browser.tabs.remove(tabId);
                log.info(`Tab ${tabId} saved and closed successfully.`);
                refreshLists();
            } else {
                 log.warn(`Tab ${tabId} has no URL or does not exist. Closing without saving.`);
                 await browser.tabs.remove(tabId);
                 refreshLists();
            }
        } catch (error) {
            log.error(`Failed to save and close tab ${tabId}:`, error);
            console.error(`Failed to save and close tab ${tabId}:`, error);
            refreshLists();
        }
    }

    async function handleReopenTab(url) {
        log.info(`Attempting to reopen tab from saved: ${url}`);
        try {
            await removeTabFromSaved(url);
            await browser.tabs.create({ url: url, active: true });
            log.info(`Tab ${url} reopened successfully.`);
            refreshLists();
        } catch (error) {
            log.error(`Failed to reopen tab for URL ${url}:`, error);
            console.error(`Failed to reopen tab for URL ${url}:`, error);
        }
    }

    async function handleDeleteSavedTab(url) {
        log.info(`Attempting to delete saved tab: ${url}`);
        try {
            await removeTabFromSaved(url);
            log.info(`Saved tab ${url} deleted successfully.`);
            refreshLists();
        } catch (error)
        {
            log.error(`Failed to delete saved tab for URL ${url}:`, error);
            console.error(`Failed to delete saved tab for URL ${url}:`, error);
        }
    }

    async function handleSaveAllAndClose() {
        log.info('Attempting to save all and close tabs.');
        try {
            const tabs = await browser.tabs.query({});
            const tabsToSave = tabs.filter(tab =>
                tab.url &&
                !tab.url.startsWith('chrome:') && // Keep 'chrome:' for internal browser pages
                !tab.url.startsWith('chrome-extension:') && // Keep 'chrome-extension:'
                 tab.id !== browser.runtime.id // chrome.runtime.id -> browser.runtime.id
            );
            for (const tab of tabsToSave) {
                await addTabToSaved({ title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl });
            }
            log.debug(`${tabsToSave.length} tabs marked for saving.`);
            let tabIdsToClose = tabsToSave.map(tab => tab.id);
            const currentTab = await browser.tabs.getCurrent(); // chrome.tabs.getCurrent -> browser.tabs.getCurrent (Note: getCurrent is not available in all contexts in Firefox MV3, might need alternative if issues arise)
            if (currentTab && tabIdsToClose.includes(currentTab.id)) {
                tabIdsToClose = tabIdsToClose.filter(id => id !== currentTab.id);
            }
            const fullscreenTab = tabs.find(tab =>
                tab.url?.includes(browser.runtime.getURL('')) && // chrome.runtime.getURL -> browser.runtime.getURL
                tab.url?.includes('mode=fullscreen&name=tab-options')
            );
            if (fullscreenTab && tabIdsToClose.includes(fullscreenTab.id)) {
                tabIdsToClose = tabIdsToClose.filter(id => id !== fullscreenTab.id);
                log.debug('Fullscreen tab excluded from closing.');
            }
            if (tabIdsToClose.length > 0) {
                await browser.tabs.remove(tabIdsToClose);
                log.info(`${tabIdsToClose.length} tabs closed.`);
            }
            refreshLists();
        } catch (error) {
            log.error("Failed to save and close all tabs:", error);
            console.error("Failed to save and close all tabs:", error);
        }
    }

    async function handleReopenAllTabs() {
        log.info('Attempting to reopen all saved tabs.');
        try {
            const savedTabs = await getSavedTabs();
            if (savedTabs.length > 0) {
                log.debug(`Found ${savedTabs.length} saved tabs to reopen.`);
                await openTabsFromList(savedTabs);
                await clearSavedTabs();
                refreshLists();
            } else {
                log.info("No saved tabs to reopen.");
                console.log("No saved tabs to reopen.");
            }
        } catch (error) {
            log.error("Failed to reopen all tabs:", error);
            console.error("Failed to reopen all tabs:", error);
        }
    }

    async function handleDeleteAllSavedTabs() {
        log.info('Attempting to delete all saved tabs.');
        const savedTabs = await getSavedTabs();
        if (savedTabs.length === 0) {
            log.info("No saved tabs to delete.");
            alert("There are no saved tabs to delete.");
            return;
        }
        if (confirm("Are you sure you want to delete ALL saved tabs? This action cannot be undone.")) {
            log.debug('User confirmed deletion of all saved tabs.');
            try {
                await clearSavedTabs();
                refreshLists();
                alert("All saved tabs have been deleted.");
                log.info("All saved tabs successfully deleted by user confirmation.");
            } catch (error) {
                log.error("Failed to delete all saved tabs:", error);
                console.error("Failed to delete all saved tabs:", error);
                alert("An error occurred while trying to delete all saved tabs.");
            }
        } else {
            log.debug('User cancelled deletion of all saved tabs.');
        }
    }

    async function handleExportSavedTabs() {
        log.info('Starting export of saved tabs to HTML.');
        const savedTabs = await getSavedTabs();
        const currentDate = new Date().toISOString().split('T')[0];
        log.debug(`Found ${savedTabs.length} saved tabs for export.`);

        let tabListItemsHTML = '';
        savedTabs.forEach(tab => {
            const title = tab.title ? escapeHTML(tab.title) : '(No Title)';
            const url = tab.url ? escapeHTML(tab.url) : '(No URL)';
            if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
                tabListItemsHTML += `
            <li>
                <div class="tab-info">
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="tab-title-link">${title}</a>
                    <span class="url">${url}</span>
                </div>
            </li>`;
            }
        });

        const pageTitle = `Exported Saved Tab List (${currentDate})`;
        const headerTitle = `Exported Saved Tab List (${currentDate})`;
        const introText = "This file contains a list of your tabs saved for later from the tabOptions extension.";

        const htmlContent = generateExportHTML(pageTitle, headerTitle, introText, tabListItemsHTML);

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const fileName = `tab_options_saved_tabs_export_${currentDate}.html`;
        a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(downloadUrl);
        log.info(`Saved tabs exported to ${fileName}.`);
    }

    async function handleExportOpenTabs() {
        log.info('Starting export of open tabs to HTML.');
        const openTabs = await browser.tabs.query({
            url: ["http://*/*", "https://*/*"]
        });
        const currentDate = new Date().toISOString().split('T')[0];
        log.debug(`Found ${openTabs.length} open tabs for export.`);

        let tabListItemsHTML = '';
        openTabs.forEach(tab => {
            const title = tab.title ? escapeHTML(tab.title) : '(No Title)';
            const url = tab.url ? escapeHTML(tab.url) : '(No URL)';
            if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
                tabListItemsHTML += `
            <li>
                <div class="tab-info">
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="tab-title-link">${title}</a>
                    <span class="url">${url}</span>
                </div>
            </li>`;
            }
        });

        const pageTitle = `Exported Open Tabs (${currentDate})`;
        const headerTitle = `Exported Open Tabs (${currentDate})`;
        const introText = "This file contains a list of your currently open tabs exported from the tabOptions extension.";

        const htmlContent = generateExportHTML(pageTitle, headerTitle, introText, tabListItemsHTML);

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const fileName = `tab_options_open_tabs_export_${currentDate}.html`;
        a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(downloadUrl);
        log.info(`Open tabs exported to ${fileName}.`);
    }

    function handleFullscreenImport(type, fileInput) {
        if (isFirefox() && !document.body.classList.contains('fullscreen-mode')) {
            log.debug(`Firefox detected (not in fullscreen), opening import in fullscreen tab for ${type}.`);
            openFullscreenView(`&triggerImport=${type}`);
            window.close(); // Close the small popup
        } else {
            log.debug(`Not Firefox or already in fullscreen, directly clicking file input for ${type}.`);
            fileInput.click();
        }
    }

    async function handleImportSavedTabsButtonClick() {
        log.debug('Import saved tabs button clicked.');
        // If it's Firefox AND we are NOT already in fullscreen mode
        handleFullscreenImport('saved', importSavedFileInput);
    }
    async function handleImportSavedTabs(event) {
        const file = event.target.files[0];
        if (!file) {
            log.debug('No file selected for import to saved tabs.');
            return;
        }
        log.info(`Starting import to saved tabs from file: ${file.name}`);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const fileContent = e.target.result;
            let importedToSavedCount = 0;
            log.debug('File content loaded for saved tabs import.');

            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(fileContent, 'text/html');
                const importedTabObjects = [];
                const links = doc.querySelectorAll('ul > li a.tab-title-link');
                log.debug(`Found ${links.length} potential links in HTML for saved tabs import.`);

                links.forEach(link => {
                    const url = link.href;
                    const title = link.textContent || url;
                    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                        importedTabObjects.push({ url: url, title: title, favIconUrl: '' });
                        log.debug(`Parsed tab for import: ${title} - ${url}`);
                    }
                });

                if (importedTabObjects.length > 0) {
                    const currentSavedTabs = await getSavedTabs();
                    let updatedSavedTabs = [...currentSavedTabs];
                    log.debug(`Current saved tabs count: ${currentSavedTabs.length}. Parsed tabs for import: ${importedTabObjects.length}`);

                    importedTabObjects.forEach(newTab => {
                        if (!updatedSavedTabs.some(existingTab => existingTab.url === newTab.url)) {
                            updatedSavedTabs.push(newTab);
                            importedToSavedCount++;
                            log.debug(`Adding new tab to saved list: ${newTab.url}`);
                        } else {
                            log.debug(`Tab already exists in saved list, skipping: ${newTab.url}`);
                        }
                    });

                    if (importedToSavedCount > 0) {
                        await saveTabsToStorage(updatedSavedTabs);
                        refreshLists();
                        alert(`${importedToSavedCount} tab(s) imported to your saved list.`);
                        log.info(`${importedToSavedCount} tab(s) successfully imported to saved list.`);
                    } else {
                        alert("No new tabs found in the file to import (or they already exist in your saved list).");
                        log.info("No new tabs found in the file to import to saved list.");
                    }
                } else {
                    alert("No valid tabs found in the selected file's list.");
                    log.warn("No valid tabs found in the selected HTML file for saved tabs import.");
                }

            } catch (error) {
                log.error("Error parsing imported file for saved tabs:", error);
                console.error("Error parsing imported file for saved tabs:", error);
                alert("Error importing to saved list. Please ensure the file is a valid exported HTML file.");
            } finally {
                importSavedFileInput.value = ''; // Reset file input
            }
        };
        reader.onerror = (e) => {
            log.error("Error reading file for saved tabs import:", e);
            console.error("Error reading file:", e);
            alert("Error reading the selected file.");
            importSavedFileInput.value = '';
        };
        reader.readAsText(file);
    }

    async function handleImportOpenTabsButtonClick() {
        log.debug('Import open tabs button clicked.');
        // If it's Firefox AND we are NOT already in fullscreen mode
        handleFullscreenImport('open', importOpenFileInput);
    }
    async function handleImportOpenTabs(event) {
        const file = event.target.files[0];
        if (!file) {
            log.debug('No file selected for import and open tabs.');
            return;
        }
        log.info(`Starting import and open tabs from file: ${file.name}`);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const fileContent = e.target.result;
            log.debug('File content loaded for open tabs import.');
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(fileContent, 'text/html');
                const tabsToOpenDirectly = [];
                const links = doc.querySelectorAll('ul > li a.tab-title-link');
                log.debug(`Found ${links.length} potential links in HTML for open tabs import.`);

                links.forEach(link => {
                    const url = link.href;
                    const title = link.textContent || url;
                    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                         tabsToOpenDirectly.push({url: url, title: title});
                         log.debug(`Parsed tab for opening: ${title} - ${url}`);
                    }
                });

                if (tabsToOpenDirectly.length > 0) {
                    const openedCount = await openTabsFromList(tabsToOpenDirectly);
                    alert(`${openedCount} tab(s) imported and opened successfully.`);
                    log.info(`${openedCount} tab(s) imported and opened successfully.`);
                    if (openedCount > 0) refreshLists();
                } else {
                    alert("No valid tabs found in the selected file's list to open.");
                    log.warn("No valid tabs found in the selected HTML file to open.");
                }

            } catch (error) {
                log.error("Error parsing imported file for opening tabs:", error);
                console.error("Error parsing imported file for opening tabs:", error);
                alert("Error importing and opening tabs. Please ensure the file is a valid exported HTML file.");
            } finally {
                importOpenFileInput.value = ''; // Reset file input
            }
        };
        reader.onerror = (e) => {
            log.error("Error reading file for opening tabs import:", e);
            console.error("Error reading file:", e);
            alert("Error reading the selected file.");
            importOpenFileInput.value = '';
        };
        reader.readAsText(file);
    }

    saveAndCloseButton.addEventListener('click', handleSaveAllAndClose);
    reopenAllButton.addEventListener('click', handleReopenAllTabs);
    deleteAllSavedTabsButton.addEventListener('click', handleDeleteAllSavedTabs);

    exportSavedTabsButton.addEventListener('click', handleExportSavedTabs);
    importSavedTabsButton.addEventListener('click', handleImportSavedTabsButtonClick);
    importSavedFileInput.addEventListener('change', handleImportSavedTabs);

    exportOpenTabsButton.addEventListener('click', handleExportOpenTabs);
    importOpenTabsButton.addEventListener('click', handleImportOpenTabsButtonClick);
    importOpenFileInput.addEventListener('change', handleImportOpenTabs);

    refreshLists();
    log.info('Popup initialized and lists refreshed.');
});