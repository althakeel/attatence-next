'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';

import { db } from '../../../../lib/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import './PersonalNote.css';

export default function StaffNotesManager({ showStatusPopup }) {
  const { currentUser } = useAuth();
  const [mode, setMode] = useState('view');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchNotes();
    } else {
      setNotes([]);
    }
  }, [currentUser]);

  async function fetchNotes() {
    setLoading(true);
    try {
      const notesRef = collection(db, 'dailyNotes');
      const q = query(notesRef, where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(q);

      let fetchedNotes = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          note: data.note,
          date: data.date?.toDate() || new Date(0),
          createdAt: data.createdAt?.toDate() || new Date(0),
        };
      });

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

    if (!noteText.trim()) return showStatusPopup?.('Please enter note text.');
    if (!currentUser) return showStatusPopup?.('User not authenticated.');

    setLoading(true);
    try {
      const now = new Date();
      const todayDateOnly = new Date(now.toDateString());

      await addDoc(collection(db, 'dailyNotes'), {
        note: noteText.trim(),
        userId: currentUser.uid,
        createdAt: Timestamp.fromDate(now),
        date: Timestamp.fromDate(todayDateOnly),
      });

      setNoteText('');
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

  const handleSaveEdit = async (id) => {
    if (!editText.trim()) return showStatusPopup?.("Note can't be empty.");
    try {
      await updateDoc(doc(db, 'dailyNotes', id), { note: editText.trim() });
      showStatusPopup?.('Note updated successfully!');
      setEditId(null);
      await fetchNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      showStatusPopup?.('Failed to update note.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'dailyNotes', id));
      showStatusPopup?.('Note deleted.');
      await fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      showStatusPopup?.('Failed to delete note.');
    }
  };

  return (
    <div className="notes-manager-container">
      {/* <h2 className="section-title">Daily Notes</h2> */}

      <div className="btn-group">
        <button onClick={() => setMode('view')} disabled={loading} className={`btn ${mode === 'view' ? 'active' : ''}`}>View Notes</button>
        <button onClick={() => setMode('add')} disabled={loading} className={`btn ${mode === 'add' ? 'active' : ''}`}>Add Note</button>
      </div>

      {mode === 'add' && (
        <form onSubmit={handleAddNoteSubmit} className="note-form">
          <textarea
            rows={5}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your note here..."
            required
            className="form-textarea"
          />
          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Saving...' : 'Add Note'}
          </button>
        </form>
      )}

      {mode === 'view' && (
        <div className="notes-list">
          {loading ? (
            <p>Loading notes...</p>
          ) : notes.length === 0 ? (
            <p className="info-text">No notes found.</p>
          ) : (
            <table className="notes-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Note</th>
                  <th>Saved At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notes.map(({ id, date, createdAt, note }) => (
                  <tr key={id}>
                    <td>{date?.toLocaleDateString()}</td>
                    <td>
                      {editId === id ? (
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="editable-note"
                        />
                      ) : (
                        <div className="note-content">{note}</div>
                      )}
                    </td>
                    <td>{createdAt?.toLocaleString()}</td>
                    <td>
                      {editId === id ? (
                        <>
                          <button onClick={() => handleSaveEdit(id)} className="save-button">Save</button>
                          <button onClick={() => setEditId(null)} className="btn">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(id); setEditText(note); }} className="btn">Edit</button>
                          <button onClick={() => handleDelete(id)} className="btn">Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
