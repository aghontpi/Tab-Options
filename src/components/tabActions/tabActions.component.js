import React from 'react';
import exportArrowIcon from 'url:../../icons/export-arrow.svg';
import importArrowIcon from 'url:../../icons/import-arrow.svg';
import trashIcon from 'url:../../icons/trash.svg';
import listIcon from 'url:../../icons/list.svg';
import layersIcon from 'url:../../icons/layers.svg';
import './TabActions.style.css';

export const OpenTabsActions = ({
  onExportOpenTabs,
  onImportOpenTabs,
  onSaveAllAndClose,
  onCloseAllOpenTabs,
  allTabsCount,
  isGroupedView,
  onToggleView,
}) => {
  return (
    <div className="header-group">
      <div className="header-main-content">
        <h2 id="all-tabs-header">All Open Tabs ({allTabsCount})</h2>
        <button
          id="export-open-tabs"
          className="icon-button"
          title="Export Open Tabs"
          onClick={onExportOpenTabs}
        >
          <img src={exportArrowIcon} alt="Export Open Tabs" />
          <span className="tooltip-text">Export Open Tabs</span>
        </button>
        <button
          id="import-open-tabs"
          className="icon-button"
          title="Import & Open Tabs"
          onClick={onImportOpenTabs}
        >
          <img src={importArrowIcon} alt="Import & Open Tabs" />
          <span className="tooltip-text">Import & Open Tabs</span>
        </button>
        <button
          id="delete-all-open-tabs"
          className="icon-button"
          title="Delete All Open Tabs"
          onClick={onCloseAllOpenTabs}
        >
          <img src={trashIcon} alt="Delete All Open Tabs" />
          <span className="tooltip-text">Delete All Open Tabs</span>
        </button>
        <button
          id="toggle-view-btn"
          className="icon-button"
          onClick={onToggleView}
          title={isGroupedView ? 'Switch to List View' : 'Group by Domain'}
        >
          <img
            src={isGroupedView ? listIcon : layersIcon}
            alt={isGroupedView ? 'List View' : 'Group by Domain'}
          />
          <span className="tooltip-text">
            {isGroupedView ? 'List View' : 'Group by Domain'}
          </span>
        </button>
      </div>
      <button
        id="save-and-close-tabs"
        className="btn btn-primary"
        onClick={onSaveAllAndClose}
      >
        Save all tabs & close
      </button>
    </div>
  );
};

export const SavedTabsActions = ({
  onExportSavedTabs,
  onImportSavedTabs,
  onDeleteAllSavedTabs,
  onReopenAllTabs,
}) => {
  return (
    <div className="header-group">
      <div className="header-main-content">
        <h2>Saved Tabs</h2>
        <button
          id="export-saved-tabs"
          className="icon-button"
          title="Export Saved Tab List"
          onClick={onExportSavedTabs}
        >
          <img src={exportArrowIcon} alt="Export List" />
          <span className="tooltip-text">Export List</span>
        </button>
        <button
          id="import-saved-tabs"
          className="icon-button"
          title="Import to Saved Tab List"
          onClick={onImportSavedTabs}
        >
          <img src={importArrowIcon} alt="Import List" />
          <span className="tooltip-text">Import List</span>
        </button>
        <button
          id="delete-all-saved-tabs-btn"
          className="icon-button"
          title="Delete All Saved Tabs"
          onClick={onDeleteAllSavedTabs}
        >
          <img src={trashIcon} alt="Delete All Saved Tabs" />
          <span className="tooltip-text">Delete All Saved Tabs</span>
        </button>
      </div>
      <button
        id="reopen-all-tabs"
        className="btn btn-primary"
        onClick={onReopenAllTabs}
      >
        Reopen all tabs
      </button>
    </div>
  );
};
