import React, { forwardRef } from 'react';
import icon16 from 'url:../../icons/icon16.png';
import './tabListItem.style.css';

const TabListItemComponent = forwardRef(
  (
    {
      tab,
      isSaved = false,
      onCloseTab,
      onSaveAndClose,
      onReopenTab,
      onDeleteSavedTab,
      isActive = false,
      shouldHighlight = false,
    },
    ref
  ) => {
    const handleActivateTab = async () => {
      if (tab.id) {
        // Only for open tabs
        try {
          const { windowId } = await browser.tabs.update(tab.id, {
            active: true,
          });
          await browser.windows.update(windowId, { focused: true });
        } catch (err) {
          console.error('Failed to activate tab/window:', err);
        }
      }
    };

    return (
      <li
        className={`tab-list-item ${isActive ? 'active' : ''} ${shouldHighlight ? 'highlight' : ''}`}
        onClick={handleActivateTab}
        ref={ref}
      >
        <img
          src={
            tab.favIconUrl && typeof tab.favIconUrl === 'string'
              ? tab.favIconUrl
              : icon16
          }
          className="icon"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = icon16;
          }}
          alt="Favicon"
        />
        <span className="tab-info">
          <span className="tab-title">{tab.title || '(No Title)'}</span>
          <span className="tab-url">{tab.url}</span>
        </span>
        <div className="actions">
          {isSaved ? (
            <>
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onReopenTab(tab.url);
                }}
              >
                Reopen
              </button>
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSavedTab(tab.url);
                }}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveAndClose(tab.id);
                }}
              >
                Save & Close
              </button>
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
              >
                Close
              </button>
            </>
          )}
        </div>
      </li>
    );
  }
);

export default TabListItemComponent;
