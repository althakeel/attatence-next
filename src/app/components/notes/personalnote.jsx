'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../lib/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import './PersonalNote.css';

export default function StaffNotesManager({ showStatusPopup }) {
  const { currentUser } = useAuth();

  const [mode, setMode] = useState('view'); // 'view' or 'add'
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [noteText, setNoteText] = useState('');
  const [noteDate, setNoteDate] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchNotes();
    } else {
      setNotes([]);
    }
  }, [currentUser]);

  // Fetch notes filtered by userId only, then sort in JS by date desc
  async function fetchNotes() {
    setLoading(true);
    try {
      const notesRef = collection(db, 'dailyNotes');

      // Query only by userId (no orderBy)
      const q = query(notesRef, where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setNotes([]);
        setLoading(false);
        return;
      }

      // Map docs to data, convert timestamps to Date
      let fetchedNotes = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          note: data.note,
          date: data.date?.toDate() || new Date(0),
          createdAt: data.createdAt?.toDate() || new Date(0),
        };
      });

      // Sort notes by date descending (latest first)
      fetchedNotes.sort((a, b) => b.date - a.date);

      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      showStatusPopup?.('Failed to load notes.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNoteSubmit(e) {
    e.preventDefault();

    if (!noteText.trim() || !noteDate) {
      showStatusPopup?.('Please enter note text and select a date.');
      return;
    }

    if (!currentUser) {
      showStatusPopup?.('User not authenticated.');
      return;
    }

    setLoading(true);
    try {
      const notesRef = collection(db, 'dailyNotes');

      await addDoc(notesRef, {
        note: noteText.trim(),
        userId: currentUser.uid,
        createdAt: Timestamp.now(),
        date: Timestamp.fromDate(new Date(noteDate + 'T00:00:00')),
      });

      setNoteText('');
      setNoteDate('');
      showStatusPopup?.('Note added successfully!');

      await fetchNotes();
      setMode('view');
    } catch (error) {
      console.error('Error adding note:', error);
      showStatusPopup?.('Failed to add note.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="notes-manager-container">
      <h2 className="section-title">Daily Notes</h2>

      <div className="btn-group">
        <button
          className={`btn ${mode === 'view' ? 'active' : ''}`}
          onClick={() => setMode('view')}
          disabled={loading}
          aria-pressed={mode === 'view'}
        >
          View Saved Notes
        </button>
        <button
          className={`btn ${mode === 'add' ? 'active' : ''}`}
          onClick={() => setMode('add')}
          disabled={loading}
          aria-pressed={mode === 'add'}
        >
          Add Note
        </button>
      </div>

      {mode === 'add' && (
        <form className="note-form" onSubmit={handleAddNoteSubmit} noValidate>
          <label htmlFor="note-date" className="form-label">
            Select Date
          </label>
          <input
            type="date"
            id="note-date"
            className="form-input"
            value={noteDate}
            onChange={(e) => setNoteDate(e.target.value)}
            required
          />

          <label htmlFor="note-text" className="form-label">
            Write your note
          </label>
          <textarea
            id="note-text"
            className="form-textarea"
            rows={5}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your note here..."
            required
          />

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Saving...' : 'Add Note'}
          </button>
        </form>
      )}

      {mode === 'view' && (
        <section className="notes-list" aria-live="polite">
          {loading ? (
            <p className="info-text">Loading notes...</p>
          ) : notes.length === 0 ? (
            <p className="info-text">No notes found. Add a new note above.</p>
          ) : (
            notes.map(({ id, note, date, createdAt }) => (
              <article
                key={id}
                className="note-item"
                aria-label={`Note dated ${date?.toLocaleDateString()}`}
              >
                <div
                  className="note-content"
                  dangerouslySetInnerHTML={{ __html: note }}
                />
                <div className="note-meta">
                  <small className="note-date">
                    Date: {date?.toLocaleDateString() || 'Unknown'}
                  </small>
                  <small className="note-created">
                    Saved at: {createdAt?.toLocaleString() || 'Unknown time'}
                  </small>
                </div>
              </article>
            ))
          )}
        </section>
      )}
    </div>
  );
}
