import React from 'react';
import icon16 from 'url:../../icons/icon16.png';
import './TabListItem.style.css';

const TabListItemComponent = ({
  tab,
  isSaved = false,
  onCloseTab,
  onSaveAndClose,
  onReopenTab,
  onDeleteSavedTab,
}) => {
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
    <li className="tab-list-item" onClick={handleActivateTab}>
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
      {isSaved ? (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReopenTab(tab.url);
            }}
          >
            Reopen
          </button>
          <button
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
            onClick={(e) => {
              e.stopPropagation();
              onSaveAndClose(tab.id);
            }}
          >
            Save & Close
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab(tab.id);
            }}
          >
            Close
          </button>
        </>
      )}
    </li>
  );
};

export default TabListItemComponent;
