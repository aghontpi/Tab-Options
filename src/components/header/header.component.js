import React from 'react';
import externalLinkIcon from 'url:../../icons/external-link.svg';
import identifiedIcon from 'url:../../icons/identified.svg';
import trashIcon from 'url:../../icons/trash.svg';
import './Header.style.css';

const HeaderComponent = ({ stats }) => {
  return (
    <div className="header">
      <div className="stat-item">
        <img src={identifiedIcon} alt="Identified" />
        <span>Identified: {stats.identified}</span>
      </div>
      <div className="stat-item">
        <img src={trashIcon} alt="Closed" />
        <span>Closed: {stats.closed}</span>
      </div>
      <button
        id="fullscreen-link"
        title="Open in Full Screen"
        className="fullscreen-button"
      >
        <img
          src={externalLinkIcon}
          width="16"
          height="16"
          alt="Open in Full Screen"
        />
        <span>Full Screen</span>
      </button>
    </div>
  );
};

export default HeaderComponent;
