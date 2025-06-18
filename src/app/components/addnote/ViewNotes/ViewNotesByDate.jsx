'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../../../../lib/firebaseConfig';
import './ViewNotesByDate.css'; // import the CSS

export default function ViewNotesByDate({ viewDate, setViewDate, staffList, showStatusPopup }) {
  const [notesByDate, setNotesByDate] = useState({});
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [selectedViewStaffId, setSelectedViewStaffId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  useEffect(() => {
    if (!viewDate) {
      setNotesByDate({});
      setSelectedViewStaffId(null);
      setEditingNoteId(null);
      setEditingNoteContent('');
      return;
    }

    async function fetchNotes() {
      setLoadingNotes(true);
      setNotesByDate({});
      setSelectedViewStaffId(null);
      setEditingNoteId(null);
      setEditingNoteContent('');

      try {
        const dateObj = new Date(viewDate + 'T00:00:00');
        const notesRef = collection(db, 'dailyNotes');
        const q = query(notesRef, where('date', '==', Timestamp.fromDate(dateObj)));

        const querySnapshot = await getDocs(q);
        const notesArray = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          notesArray.push({
            id: docSnap.id,
            userId: data.userId,
            note: data.note,
            createdAt: data.createdAt?.toDate(),
          });
        });

        notesArray.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt - a.createdAt;
        });

        const grouped = {};
        notesArray.forEach(({ userId, id, note, createdAt }) => {
          if (!grouped[userId]) grouped[userId] = [];
          grouped[userId].push({ id, note, createdAt });
        });

        setNotesByDate(grouped);
      } catch (error) {
        console.error('Error fetching notes:', error);
        showStatusPopup('Failed to load notes.');
      } finally {
        setLoadingNotes(false);
      }
    }

    fetchNotes();
  }, [viewDate, showStatusPopup]);

  // Helper to strip HTML tags for editing textarea
  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const startEditing = (noteId, currentContent) => {
    setEditingNoteId(noteId);
    setEditingNoteContent(stripHtml(currentContent));
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const saveEditedNote = async (noteId) => {
    if (!editingNoteContent.trim()) {
      showStatusPopup('Note content cannot be empty.');
      return;
    }

    try {
      const noteDocRef = doc(db, 'dailyNotes', noteId);
      await updateDoc(noteDocRef, {
        note: editingNoteContent,
      });

      setNotesByDate((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((userId) => {
          updated[userId] = updated[userId].map((note) =>
            note.id === noteId ? { ...note, note: editingNoteContent } : note
          );
        });
        return updated;
      });

      showStatusPopup('Note updated successfully!');
      cancelEditing();
    } catch (error) {
      console.error('Error updating note:', error);
      showStatusPopup('Failed to update note.');
    }
  };

  const deleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteDoc(doc(db, 'dailyNotes', noteId));

      setNotesByDate((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((userId) => {
          updated[userId] = updated[userId].filter((note) => note.id !== noteId);
          if (updated[userId].length === 0) {
            delete updated[userId];
          }
        });
        return updated;
      });

      showStatusPopup('Note deleted successfully!');
      if (editingNoteId === noteId) cancelEditing();
    } catch (error) {
      console.error('Error deleting note:', error);
      showStatusPopup('Failed to delete note.');
    }
  };

  return (
    <div className="notes-viewer">
      <h2 className="title">View Notes by Date</h2>

      <div className="note-field">
        <label htmlFor="viewDate" className="label">
          Select Date:
        </label>
        <input
          type="date"
          id="viewDate"
          value={viewDate || ''}
          onChange={(e) => setViewDate(e.target.value)}
          className="date-input"
          onFocus={(e) => (e.target.style.borderColor = '#0070f3')}
          onBlur={(e) => (e.target.style.borderColor = '#ccc')}
        />
      </div>

      {!viewDate && <p className="info-text">Please select a date to view notes.</p>}

      {loadingNotes && <p className="info-text">Loading notes...</p>}

      {!loadingNotes && Object.keys(notesByDate).length === 0 && viewDate && (
        <p className="info-text">No notes found for selected date.</p>
      )}

      {!loadingNotes && Object.keys(notesByDate).length > 0 && (
        <>
          <h3 className="staff-header">
            Staff with notes on{' '}
            <span className="highlight">{viewDate}</span>
          </h3>

          <div className="staff-buttons-container">
            {Object.keys(notesByDate).map((userId) => {
              const staff = staffList.find((s) => s.id === userId);
              const staffName = staff
                ? staff.fullName || staff.name || staff.email || 'Unnamed Staff'
                : 'Unknown Staff';

              const isActive = selectedViewStaffId === userId;

              return (
                <button
                  key={userId}
                  onClick={() => setSelectedViewStaffId(isActive ? null : userId)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedViewStaffId(isActive ? null : userId);
                    }
                  }}
                  className={`staff-button ${isActive ? 'active' : ''}`}
                  aria-pressed={isActive}
                  title={`View notes for ${staffName}`}
                >
                  {staffName}
                </button>
              );
            })}
          </div>

          {selectedViewStaffId && (
            <div className="staff-notes">
              <h4 className="notes-header">
                Notes for{' '}
                <span>
                  {staffList.find((s) => s.id === selectedViewStaffId)?.fullName || 'Selected Staff'}
                </span>
              </h4>

              {notesByDate[selectedViewStaffId].map(({ id, note, createdAt }) => (
                <article
                  key={id}
                  className="note-article"
                  aria-label={`Note saved at ${createdAt?.toLocaleString() || 'Unknown time'}`}
                >
                  {editingNoteId === id ? (
                    <>
                      <textarea
                        value={editingNoteContent}
                        onChange={(e) => setEditingNoteContent(e.target.value)}
                        rows={5}
                        className="edit-textarea"
                        autoFocus
                      />
                      <div className="edit-buttons">
                        <button
                          onClick={() => saveEditedNote(id)}
                          className="save-button"
                          aria-label="Save edited note"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="cancel-button"
                          aria-label="Cancel editing"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="note-content"
                        dangerouslySetInnerHTML={{ __html: note }}
                      />
                      <small className="note-timestamp">
                        Saved at: {createdAt?.toLocaleString() || 'Unknown time'}
                      </small>
                      <div className="action-buttons">
                        <button
                          onClick={() => startEditing(id, note)}
                          className="edit-button"
                          title="Edit note"
                          aria-label="Edit note"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteNote(id)}
                          className="delete-button"
                          title="Delete note"
                          aria-label="Delete note"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
