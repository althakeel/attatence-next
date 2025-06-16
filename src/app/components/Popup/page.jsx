import React from 'react';
import './Popup.css';

export default function Popup({ message, onClose }) {
  return (
    <div className="popup-overlay">
      <div className="popup-container">
        <h3>Reminder</h3>
        <p>{message}</p>
        <button onClick={onClose} className="popup-close-btn">OK</button>
      </div>
    </div>
  );
}
