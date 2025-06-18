import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../lib/firebaseConfig';
import './AttendanceTable.css';

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(timestamp) {
  if (!timestamp) return '--:--';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
  if (typeof seconds !== 'number' || seconds <= 0) return '--:--:--';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function getTimestampSeconds(timestamp) {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate().getTime() / 1000; // convert to seconds
  return new Date(timestamp).getTime() / 1000;
}

export default function AttendanceTable({ userId }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    const attendanceRef = collection(db, 'users', userId, 'attendanceRecords');
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const data = {};
      snapshot.docs.forEach(doc => {
        const record = doc.data();
        const dateKey = record.createdAt
          ? record.createdAt.toDate().toISOString().split('T')[0]
          : doc.id;
        data[dateKey] = record;
      });
      setAttendanceRecords(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const totalDays = daysInMonth(year, month);
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const years = Array.from({ length: 11 }, (_, i) => today.getFullYear() - 5 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  let monthlyWorkedSeconds = 0;

  return (
    <div className="attendance-container">
      <div className="attendance-header">
        <select
          value={year}
          onChange={e => setYear(parseInt(e.target.value))}
          className="attendance-select"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={month}
          onChange={e => setMonth(parseInt(e.target.value))}
          className="attendance-select"
        >
          {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="attendance-loading">Loading attendance...</p>
      ) : (
        <div className="table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Sign In</th>
                <th>Break In</th>
                <th>Break Out</th>
                <th>Sign Out</th>
                <th>Hours Worked</th>
                <th>Status</th>
                <th>Work From Home</th>
              </tr>
            </thead>
            <tbody>
              {daysArray.map(day => {
                const dateObj = new Date(year, month, day);
                const dateKey = formatDateKey(dateObj);
                const record = attendanceRecords[dateKey];
                const hasRecord = Boolean(record);

                let dailyWorkedSeconds = 0;

                if (record?.signInTime && record?.signOutTime) {
                  const signIn = getTimestampSeconds(record.signInTime);
                  const signOut = getTimestampSeconds(record.signOutTime);

                  if (signIn !== null && signOut !== null && signOut > signIn) {
                    let workDuration = signOut - signIn;

                    // subtract break duration if both breakIn and breakOut exist
                    if (record.breakInTime && record.breakOutTime) {
                      const breakIn = getTimestampSeconds(record.breakInTime);
                      const breakOut = getTimestampSeconds(record.breakOutTime);
                      if (breakIn !== null && breakOut !== null && breakOut > breakIn) {
                        workDuration -= (breakOut - breakIn);
                      }
                    }

                    dailyWorkedSeconds = workDuration > 0 ? workDuration : 0;
                    monthlyWorkedSeconds += dailyWorkedSeconds;
                  }
                }

                return (
                  <tr key={dateKey} className={hasRecord ? 'has-record' : ''}>
                    <td>{`${day} ${months[month]} ${year}`}</td>
                    <td>{formatTime(record?.signInTime)}</td>
                    <td>{formatTime(record?.breakInTime)}</td>
                    <td>{formatTime(record?.breakOutTime)}</td>
                    <td>{formatTime(record?.signOutTime)}</td>
                    <td>{formatDuration(dailyWorkedSeconds)}</td>
                    <td>{record ? (record.status ? 'Online' : 'Offline') : '--'}</td>
                    <td>{record ? (record.workFromHome ? 'Yes' : 'No') : '--'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="footer-row">
                <td colSpan={5} className="footer-label">Total Monthly Hours Worked:</td>
                <td>{formatDuration(monthlyWorkedSeconds)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
