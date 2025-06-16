import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../lib/firebaseConfig';

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDateKey(date) {
  return date.toISOString().split('T')[0];
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
    <div style={styles.container}>
      <div style={styles.header}>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={styles.select}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={styles.select}>
          {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={styles.loading}>Loading attendance...</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Sign In</th>
              <th style={styles.th}>Break In</th>
              <th style={styles.th}>Break Out</th>
              <th style={styles.th}>Sign Out</th>
              <th style={styles.th}>Hours Worked</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Work From Home</th>
            </tr>
          </thead>
          <tbody>
            {daysArray.map(day => {
              const dateObj = new Date(year, month, day);
              const dateKey = formatDateKey(dateObj);
              const record = attendanceRecords[dateKey];
              const hasRecord = Boolean(record);

              let dailyWorkedSeconds = 0;
              if (record?.workingHours) {
                dailyWorkedSeconds = record.workingHours;
                if (record.breakDurationSeconds) {
                  dailyWorkedSeconds -= record.breakDurationSeconds;
                }
                if (dailyWorkedSeconds < 0) dailyWorkedSeconds = 0;
                monthlyWorkedSeconds += dailyWorkedSeconds;
              }

              return (
                <tr key={dateKey} style={{
                  backgroundColor: hasRecord ? '#e3f2fd' : 'transparent',
                  fontWeight: hasRecord ? '600' : '400',
                }}>
                  <td style={styles.td}>{`${day} ${months[month]} ${year}`}</td>
                  <td style={styles.td}>{formatTime(record?.signInTime)}</td>
                  <td style={styles.td}>{formatTime(record?.breakInTime)}</td>
                  <td style={styles.td}>{formatTime(record?.breakOutTime)}</td>
                  <td style={styles.td}>{formatTime(record?.signOutTime)}</td>
                  <td style={styles.td}>{formatDuration(dailyWorkedSeconds)}</td>
                  <td style={styles.td}>{record ? (record.status ? 'Online' : 'Offline') : '--'}</td>
                  <td style={styles.td}>{record ? (record.workFromHome ? 'Yes' : 'No') : '--'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#bbdefb', fontWeight: '700' }}>
              <td colSpan={5} style={{ ...styles.td, textAlign: 'right' }}>Total Monthly Hours Worked:</td>
              <td style={styles.td}>{formatDuration(monthlyWorkedSeconds)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1100,
    margin: 'auto',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  select: {
    padding: '8px 14px',
    fontSize: 16,
    borderRadius: 8,
    border: '1.5px solid #ccc',
    cursor: 'pointer',
    backgroundColor: '#fff',
  },
  loading: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  th: {
    padding: '12px 8px',
    borderBottom: '2px solid #2962ff',
    textAlign: 'center',
    color: '#2962ff',
    userSelect: 'none',
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #eee',
    textAlign: 'center',
    userSelect: 'none',
  },
};
