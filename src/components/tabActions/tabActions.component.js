import React from 'react';
import exportArrowIcon from 'url:../../icons/export-arrow.svg';
import importArrowIcon from 'url:../../icons/import-arrow.svg';
import trashIcon from 'url:../../icons/trash.svg';
import './TabActions.style.css';

export const OpenTabsActions = ({
  onExportOpenTabs,
  onImportOpenTabs,
  onSaveAllAndClose,
  onCloseDuplicates,
  allTabsCount,
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
          id="close-duplicate-tabs"
          className="icon-button"
          title="Close Duplicate Tabs"
          onClick={onCloseDuplicates}
        >
          <img src={trashIcon} alt="Close Duplicate Tabs" />
          <span className="tooltip-text">Close Duplicate Tabs</span>
        </button>
      </div>
      <button id="save-and-close-tabs" onClick={onSaveAllAndClose}>
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
      <button id="reopen-all-tabs" onClick={onReopenAllTabs}>
        Reopen all tabs
      </button>
    </div>
  );
};
