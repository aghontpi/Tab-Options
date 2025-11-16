import React, { useEffect, useRef, useState } from 'react';
import {
  OpenTabsActions,
  SavedTabsActions,
} from '../tabActions/tabActions.component.js';
import TabListItemComponent from '../tabListItem/tabListItem.component.js';
import './tabList.style.css';

const TabListComponent = ({
  duplicateTabs,
  allTabs,
  savedTabs,
  onCloseTab,
  onSaveAndClose,
  onReopenTab,
  onDeleteSavedTab,
  onExportOpenTabs,
  onImportOpenTabs,
  onSaveAllAndClose,
  onExportSavedTabs,
  onImportSavedTabs,
  onDeleteAllSavedTabs,
  onReopenAllTabs,
  currentTab,
  isFullscreenMode = false,
}) => {
  const activeTabRef = useRef(null);
  const [highlightActive, setHighlightActive] = useState(false);

  useEffect(() => {
    // Only scroll and highlight in popup mode, not in fullscreen
    if (activeTabRef.current && currentTab && !isFullscreenMode) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      // Trigger highlight after scroll completes
      setTimeout(() => {
        setHighlightActive(true);

        // Remove highlight after 2 seconds
        setTimeout(() => {
          setHighlightActive(false);
        }, 2000);
      }, 300);
    }
  }, [currentTab, isFullscreenMode]);

  return (
    <>
      <h2>Duplicate Tabs</h2>
      <div id="duplicate-section">
        {duplicateTabs.length === 0 ? (
          <p id="no-duplicates-msg">No duplicate tabs found.</p>
        ) : (
          <ul id="duplicate-tabs-list">
            {/* Group duplicates by URL */}
            {Array.from(new Set(duplicateTabs.map((tab) => tab.url))).map(
              (url) => {
                const tabsWithSameUrl = duplicateTabs.filter(
                  (tab) => tab.url === url
                );
                return (
                  <React.Fragment key={url}>
                    <div className="group-header">
                      <span className="group-url" title={url}>
                        Duplicates of: {url}
                      </span>
                      <button
                        className="close-all-duplicates-button"
                        title={`Close all ${tabsWithSameUrl.length - 1} tabs with URL: ${url}`}
                        onClick={() => {
                          const tabIdsToClose = tabsWithSameUrl
                            .filter((_, index) => index !== 0)
                            .map((tab) => tab.id);
                          browser.tabs.remove(tabIdsToClose);
                        }}
                      >
                        Close All Duplicates
                      </button>
                    </div>
                    {tabsWithSameUrl.map((tab) => (
                      <TabListItemComponent
                        key={tab.id}
                        tab={tab}
                        onCloseTab={onCloseTab}
                        onSaveAndClose={onSaveAndClose}
                      />
                    ))}
                  </React.Fragment>
                );
              }
            )}
          </ul>
        )}
      </div>

      <OpenTabsActions
        onExportOpenTabs={onExportOpenTabs}
        onImportOpenTabs={onImportOpenTabs}
        onSaveAllAndClose={onSaveAllAndClose}
        allTabsCount={allTabs.length}
      />
      <ul id="all-tabs-list">
        {allTabs.map((tab) => (
          <TabListItemComponent
            key={tab.id}
            tab={tab}
            onCloseTab={onCloseTab}
            onSaveAndClose={onSaveAndClose}
            ref={tab.id === currentTab?.id ? activeTabRef : null}
            isActive={tab.id === currentTab?.id}
            shouldHighlight={tab.id === currentTab?.id && highlightActive}
          />
        ))}
      </ul>

      <SavedTabsActions
        onExportSavedTabs={onExportSavedTabs}
        onImportSavedTabs={onImportSavedTabs}
        onDeleteAllSavedTabs={onDeleteAllSavedTabs}
        onReopenAllTabs={onReopenAllTabs}
      />
      <div id="saved-section">
        {savedTabs.length === 0 ? (
          <p id="no-saved-tabs-msg">No tabs saved for later.</p>
        ) : (
          <ul id="saved-tabs-list">
            {savedTabs.map((tab, index) => (
              <TabListItemComponent
                key={index} // Using index as key for saved tabs, assuming no reordering
                tab={tab}
                isSaved={true}
                onReopenTab={onReopenTab}
                onDeleteSavedTab={onDeleteSavedTab}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default TabListComponent;
