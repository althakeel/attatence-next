'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../lib/firebaseConfig';
import { useAuth } from '../../hooks/useAuth'; 
import './StaffViewNotesByDate.css';
import PersonalNote from './personalnote'


export default function StaffViewNotesByDate({ showStatusPopup }) {
  const { currentUser } = useAuth(); // assumes a context hook for auth
  const [viewDate, setViewDate] = useState('');
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    if (!viewDate || !currentUser) return;

    const fetchNotes = async () => {
      setLoadingNotes(true);
      setNotes([]);

      try {
        const selectedDate = new Date(viewDate + 'T00:00:00');
        const notesRef = collection(db, 'dailyNotes');

        const q = query(
          notesRef,
          where('userId', '==', currentUser.uid),
          where('date', '==', Timestamp.fromDate(selectedDate))
        );

        const querySnapshot = await getDocs(q);
        const notesArray = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          notesArray.push({
            id: docSnap.id,
            note: data.note,
            createdAt: data.createdAt?.toDate(),
          });
        });

        notesArray.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt - a.createdAt;
        });

        setNotes(notesArray);
      } catch (error) {
        console.error('Error fetching notes:', error);
        showStatusPopup('Failed to load notes.');
      } finally {
        setLoadingNotes(false);
      }
    };

    fetchNotes();
  }, [viewDate, currentUser, showStatusPopup]);

  return (
    
    
    <>
     <PersonalNote
    showStatusPopup={showStatusPopup}
    onNoteAdded={() => setViewDate((prev) => prev)} // retriggers note fetch
  />

    <div className="notes-viewer">
      <h2 className="title">Message From Admin</h2>

      <div className="note-field">
        <label htmlFor="viewDate" className="label">
          Select Date:
        </label>
        <input
          type="date"
          id="viewDate"
          value={viewDate}
          onChange={(e) => setViewDate(e.target.value)}
          className="date-input"
        />
      </div>

      {!viewDate && <p className="info-text">Please select a date to view your notes.</p>}
      {loadingNotes && <p className="info-text">Loading notes...</p>}
      {!loadingNotes && notes.length === 0 && viewDate && (
        <p className="info-text">No notes found for the selected date.</p>
      )}

      {!loadingNotes && notes.length > 0 && (
        <div className="staff-notes">
          <h4 className="notes-header">Your Notes on {viewDate}</h4>
          {notes.map(({ id, note, createdAt }) => (
            <article
              key={id}
              className="note-article"
              aria-label={`Note saved at ${createdAt?.toLocaleString() || 'Unknown time'}`}
            >
              <div
                className="note-content"
                dangerouslySetInnerHTML={{ __html: note }}
              />
              <small className="note-timestamp">
                Saved at: {createdAt?.toLocaleString() || 'Unknown time'}
              </small>
            </article>
          ))}
        </div>
      )}
    </div>
        </>
  );
}
