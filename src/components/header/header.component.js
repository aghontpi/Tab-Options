import React from 'react';
import externalLinkIcon from 'url:../../icons/external-link.svg';
import './Header.style.css';

const HeaderComponent = () => {
  return (
    <div className="header">
      <h1>Tab Options</h1>
      <a href="#" id="fullscreen-link" title="Open in Full Screen">
        <img
          src={externalLinkIcon}
          width="16"
          height="16"
          alt="Open in Full Screen"
        />
      </a>
    </div>
  );
};

export default HeaderComponent;
