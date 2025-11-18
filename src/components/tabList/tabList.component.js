import React, { useEffect, useRef, useState } from 'react';
import {
  OpenTabsActions,
  SavedTabsActions,
} from '../tabActions/tabActions.component.js';
import TabListItemComponent from '../tabListItem/tabListItem.component.js';
import { groupTabsByDomain } from '../../utils/domain.util.js';
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
  onCloseDuplicates,
  onExportSavedTabs,
  onImportSavedTabs,
  onDeleteAllSavedTabs,
  onReopenAllTabs,
  onCloseAllDuplicates,
  onCloseAllOpenTabs,
  currentTab,
  isFullscreenMode = false,
}) => {
  const activeTabRef = useRef(null);
  const [highlightActive, setHighlightActive] = useState(false);
  const [isGroupedView, setIsGroupedView] = useState(false);

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
      <div className="header-group">
        <div className="header-main-content">
          <h2>Duplicate Tabs ({duplicateTabs.length})</h2>
        </div>
        {duplicateTabs.length > 0 && (
          <button
            id="close-all-duplicates-global"
            className="btn btn-danger"
            onClick={() => {
              const uniqueUrls = new Set();
              const tabIdsToClose = [];
              duplicateTabs.forEach((tab) => {
                if (uniqueUrls.has(tab.url)) {
                  tabIdsToClose.push(tab.id);
                } else {
                  uniqueUrls.add(tab.url);
                }
              });
              onCloseAllDuplicates(tabIdsToClose);
            }}
          >
            Close all duplicate
          </button>
        )}
      </div>
      <div id="duplicate-section" className={duplicateTabs.length > 0 ? 'card' : ''}>
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
                        className="close-all-duplicates-button btn btn-danger btn-sm"
                        title={`Close all ${tabsWithSameUrl.length - 1} tabs with URL: ${url}`}
                        onClick={() => {
                          const tabIdsToClose = tabsWithSameUrl
                            .filter((_, index) => index !== 0)
                            .map((tab) => tab.id);
                          onCloseAllDuplicates(tabIdsToClose);
                        }}
                      >
                        Close Duplicates
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
        onCloseDuplicates={onCloseDuplicates}
        onCloseAllOpenTabs={onCloseAllOpenTabs}
        allTabsCount={allTabs.length}
        isGroupedView={isGroupedView}
        onToggleView={() => setIsGroupedView(!isGroupedView)}
      />
      {isGroupedView ? (
        <div id="grouped-tabs-list">
          {Object.entries(groupTabsByDomain(allTabs)).map(([domain, tabs]) => (
            <React.Fragment key={domain}>
              <div className="group-header">
                <span className="group-url" title={domain}>
                  {domain} ({tabs.length})
                </span>
              </div>
              <ul>
                {tabs.map((tab) => (
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
            </React.Fragment>
          ))}
        </div>
      ) : (
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
      )}

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
