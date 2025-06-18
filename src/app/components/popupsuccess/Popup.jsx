// components/Popup.js
import React, { useEffect } from 'react';
import './Popup.css'; // optional CSS for styling

export default function Popup({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`popup ${type}`}>
      {message}
      <button className="popup-close" onClick={onClose}>&times;</button>
    </div>
  );
}
