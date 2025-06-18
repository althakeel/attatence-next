'use client';

import React, { useState, useEffect } from 'react';
import StaffAddNote from './personalnote'; // your add note form
import StaffViewNotesByDate from './StaffViewNotesByDate'; // your notes viewer
import './StaffNotesPanel.css';

export default function StaffNotesPanel() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);

  // Show popup message for 3 seconds
  const showStatusPopup = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // When a new note is added, refresh the notes list
  const handleNoteAdded = () => {
    setNotesRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="staff-notes-panel">
      <button
        className="toggle-notes-button"
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
      >
        {panelOpen ? 'Close Notes' : 'Add/View Notes'}
      </button>

      {statusMessage && <div className="status-popup">{statusMessage}</div>}

      {panelOpen && (
        <div className="notes-content">
          <StaffAddNote
            showStatusPopup={showStatusPopup}
            onNoteAdded={handleNoteAdded}
          />
          <StaffViewNotesByDate
            key={notesRefreshKey} // key to force remount and refetch notes
            showStatusPopup={showStatusPopup}
          />
        </div>
      )}
    </div>
  );
}
