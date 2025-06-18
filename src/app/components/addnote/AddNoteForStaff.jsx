'use client';

import React, { useState, useRef } from 'react';
import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../lib/firebaseConfig';
import './AddNoteForStaff.css';
import ViewNotesByDate from './ViewNotes/ViewNotesByDate';

export default function AddNoteForStaff({ staffList, showStatusPopup }) {
  // State variables for adding a note
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [noteText, setNoteText] = useState('');
  const [selectedNoteStaff, setSelectedNoteStaff] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // State variables for viewing notes
  const [viewDate, setViewDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Reference to the rich text editor div
  const editorRef = useRef(null);

  // Function to execute rich-text commands (bold, color, list, align, etc.)
  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setNoteText(editorRef.current.innerHTML);
    }
  };

  // Update noteText state on user input in the content editable div
  const handleInput = () => {
    if (editorRef.current) {
      setNoteText(editorRef.current.innerHTML);
    }
  };

  // Save note handler
  const handleSaveNote = async () => {
    const strippedText = editorRef.current?.innerText.trim() || '';
    if (!strippedText) {
      showStatusPopup('Note cannot be empty.');
      return;
    }
    if (!selectedNoteStaff) {
      showStatusPopup('Please select a staff member.');
      return;
    }

    setSavingNote(true);

    try {
      const noteTimestamp = new Date(noteDate + 'T00:00:00');
      const notesRef = collection(db, 'dailyNotes');

      // Query if note already exists for this date and user
      const q = query(
        notesRef,
        where('date', '==', Timestamp.fromDate(noteTimestamp)),
        where('userId', '==', selectedNoteStaff.id)
      );

      const querySnapshot = await getDocs(q);

      const noteData = {
        date: Timestamp.fromDate(noteTimestamp),
        note: editorRef.current.innerHTML,
        userId: selectedNoteStaff.id,
        createdAt: Timestamp.now(),
      };

      if (!querySnapshot.empty) {
        // Update existing note
        await setDoc(doc(db, 'dailyNotes', querySnapshot.docs[0].id), noteData);
      } else {
        // Add new note
        await addDoc(notesRef, noteData);
      }

      setSaveSuccess('Note saved successfully!');
      showStatusPopup('Note saved successfully!');

      // Clear editor and note text state
      setNoteText('');
      if (editorRef.current) editorRef.current.innerHTML = '';

      // Refresh notes for the current view date
      if (viewDate === noteDate) {
        // Potentially refresh notes here if needed
      }
    } catch (error) {
      console.error('Error saving note:', error);
      showStatusPopup('Failed to save note.');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="add-note-wrapper">
      <div className="add-note-card">
        <h2>Add Daily Note for Staff</h2>

        {/* Staff selector */}
        <div className="note-field">
          <label htmlFor="staffSelect">Select Staff:</label>
          <select
            id="staffSelect"
            value={selectedNoteStaff?.id || ''}
            onChange={(e) => {
              const staff = staffList.find((s) => s.id === e.target.value);
              setSelectedNoteStaff(staff || null);
            }}
          >
            <option value="">-- Select Staff --</option>
            {staffList.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.fullName || staff.name || staff.email || 'Unnamed'}
              </option>
            ))}
          </select>
        </div>

        {/* Date selector */}
        <div className="note-field">
          <label htmlFor="noteDate">Select Date:</label>
          <input
            type="date"
            id="noteDate"
            value={noteDate}
            onChange={(e) => setNoteDate(e.target.value)}
          />
        </div>

        {/* Rich text editor and toolbar */}
        <div className="note-field">
          <label>Note (rich text):</label>

          <div className="toolbar">
            <button type="button" onClick={() => execCommand('bold')} title="Bold (Ctrl+B)">
              <b>B</b>
            </button>
            <button
              type="button"
              onClick={() => execCommand('insertUnorderedList')}
              title="Bullet List"
            >
              &#8226; List
            </button>

            {/* Text colors */}
            <button
              type="button"
              style={{ color: 'red' }}
              onClick={() => execCommand('foreColor', 'red')}
              title="Red text"
            >
              A
            </button>
            <button
              type="button"
              style={{ color: 'green' }}
              onClick={() => execCommand('foreColor', 'green')}
              title="Green text"
            >
              A
            </button>
            <input
              type="color"
              onChange={(e) => execCommand('foreColor', e.target.value)}
              title="Custom text color"
              className="color-picker"
            />

            {/* Alignment */}
            <button type="button" onClick={() => execCommand('justifyLeft')} title="Align Left">
              &#8676;
            </button>
            <button type="button" onClick={() => execCommand('justifyCenter')} title="Align Center">
              &#8596;
            </button>
            <button type="button" onClick={() => execCommand('justifyRight')} title="Align Right">
              &#8677;
            </button>
            <button type="button" onClick={() => execCommand('justifyFull')} title="Justify">
              &#8865;
            </button>
          </div>

          <div
            ref={editorRef}
            className="rich-text-editor"
            contentEditable
            onInput={handleInput}
            spellCheck={true}
            suppressContentEditableWarning={true}
            aria-label="Rich text editor"
          />
        </div>

        {/* Save button */}
        <button onClick={handleSaveNote} disabled={savingNote} className="add-note-button">
          {savingNote ? 'Saving...' : 'Save Note'}
        </button>

        {/* Success message */}
        {saveSuccess && <p className="success-message">{saveSuccess}</p>}

        <hr style={{ margin: '30px 0' }} />

        {/* View notes component */}
        <ViewNotesByDate
          staffList={staffList}
          showStatusPopup={showStatusPopup}
          viewDate={viewDate}
          setViewDate={setViewDate}
        />
      </div>
    </div>
  );
}
