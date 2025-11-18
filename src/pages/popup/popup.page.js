import React, { useEffect, useRef } from 'react';
import HeaderComponent from '../../components/header/header.component.js';
import TabListComponent from '../../components/tabList/tabList.component.js';
import { useTabManager } from '../../hooks/useTabManager.hook.js';
import { openFullscreenView } from '../../utils/fullscreen.util.js';
import {
  importToSavedTabs,
  importAndOpenTabs,
} from '../../utils/import.util.js';
import packageJson from '../../../package.json';
import './popup.style.css';

const PopupPage = () => {
  const extensionVersion = packageJson.version;
  const {
    duplicateTabs,
    allTabs,
    savedTabs,
    handleCloseTab,
    handleSaveAndClose,
    handleReopenTab,
    handleDeleteSavedTab,
    handleSaveAllAndClose,
    handleReopenAllTabs,
    handleDeleteAllSavedTabs,
    handleExportSavedTabs,
    handleExportOpenTabs,
    handleFullscreenImport,
    currentTab,
    fetchAllTabData,
  } = useTabManager();

  const importSavedFileInputRef = useRef(null);
  const importOpenFileInputRef = useRef(null);
  const isFullscreenMode =
    new URLSearchParams(window.location.search).get('mode') === 'fullscreen';

  useEffect(() => {
    if (isFullscreenMode) {
      document.body.classList.add('fullscreen-mode');
      document.title = 'Tab Options - Full Screen View';
    }

    const fullscreenLink = document.getElementById('fullscreen-link');
    const handleClick = (e) => {
      e.preventDefault();
      openFullscreenView();
    };

    if (fullscreenLink) {
      fullscreenLink.addEventListener('click', handleClick);
    }

    return () => {
      document.body.classList.remove('fullscreen-mode');
      if (fullscreenLink) {
        fullscreenLink.removeEventListener('click', handleClick);
      }
    };
  }, []);

  async function handleImportSavedTabsButtonClick() {
    await handleFullscreenImport('saved', importSavedFileInputRef.current);
  }

  async function handleImportOpenTabsButtonClick() {
    await handleFullscreenImport('open', importOpenFileInputRef.current);
  }

  async function handleImportSavedFile(event) {
    const file = event.target.files[0];
    await importToSavedTabs(file);
    event.target.value = '';
    await fetchAllTabData();
  }

  async function handleImportOpenFile(event) {
    const file = event.target.files[0];
    await importAndOpenTabs(file);
    event.target.value = '';
    await fetchAllTabData();
  }

  return (
    <div>
      <HeaderComponent />
      <TabListComponent
        duplicateTabs={duplicateTabs}
        allTabs={allTabs}
        savedTabs={savedTabs}
        onCloseTab={handleCloseTab}
        onSaveAndClose={handleSaveAndClose}
        onReopenTab={handleReopenTab}
        onDeleteSavedTab={handleDeleteSavedTab}
        onExportOpenTabs={handleExportOpenTabs}
        onImportOpenTabs={handleImportOpenTabsButtonClick}
        onSaveAllAndClose={handleSaveAllAndClose}
        onExportSavedTabs={handleExportSavedTabs}
        onImportSavedTabs={handleImportSavedTabsButtonClick}
        onDeleteAllSavedTabs={handleDeleteAllSavedTabs}
        onReopenAllTabs={handleReopenAllTabs}
        currentTab={currentTab}
        isFullscreenMode={isFullscreenMode}
      />
      <input
        type="file"
        id="import-saved-file-input"
        className="hidden-file-input"
        accept=".html"
        ref={importSavedFileInputRef}
        onChange={handleImportSavedFile}
      />
      <input
        type="file"
        id="import-open-file-input"
        className="hidden-file-input"
        accept=".html"
        ref={importOpenFileInputRef}
        onChange={handleImportOpenFile}
      />
      <footer className="version-info">
        <div>v{extensionVersion}</div>
        <a
          href="https://github.com/aghontpi/Tab-Options"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub Repository"
        >
          <span>Open in GitHub</span>
        </a>
      </footer>
    </div>
  );
};

export default PopupPage;
