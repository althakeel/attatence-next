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

export default function SmallCalendar({ userId }) {
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const attendanceRef = collection(db, 'users', userId, 'attendanceRecords');

    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const data = {};
      snapshot.docs.forEach(doc => {
        const record = doc.data();
        if (record.createdAt) {
          const dateKey = record.createdAt.toDate().toISOString().split('T')[0];
          data[dateKey] = record;
        }
      });
      setAttendanceRecords(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Prepare calendar days with padding for first day
  const firstDay = new Date(year, month, 1).getDay(); // Sun=0
  const totalDays = daysInMonth(year, month);

  const days = [];
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i));
  }

  const prevMonth = () => {
    if (month === 0) {
      setYear(y => y - 1);
      setMonth(11);
    } else {
      setMonth(m => m - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear(y => y + 1);
      setMonth(0);
    } else {
      setMonth(m => m + 1);
    }
    setSelectedDate(null);
  };

  const selectedRecord = selectedDate ? attendanceRecords[selectedDate] : null;

  return (
    <div style={{
      width: 300,
      background: '#fff',
      borderRadius: 10,
      boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
      padding: 16,
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      userSelect: 'none'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <button onClick={prevMonth} style={navBtnStyle} aria-label="Previous Month">‹</button>
        <div style={{ fontWeight: '700', fontSize: 16 }}>
          {new Date(year, month).toLocaleString('default', { month: 'short', year: 'numeric' })}
        </div>
        <button onClick={nextMonth} style={navBtnStyle} aria-label="Next Month">›</button>
      </div>

      {/* Weekday Labels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        fontSize: 11,
        color: '#888',
        textAlign: 'center',
        marginBottom: 6,
        fontWeight: '600',
      }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 6,
      }}>
        {/* Empty spaces for first day offset */}
        {Array(firstDay).fill(null).map((_, i) => <div key={'empty-'+i} />)}

        {days.map(date => {
          const dateKey = formatDateKey(date);
          const hasRecord = !!attendanceRecords[dateKey];
          const isSelected = selectedDate === dateKey;

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDate(dateKey)}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 6,
                border: isSelected ? '2px solid #2962ff' : '1px solid #ddd',
                backgroundColor: isSelected ? '#2962ff' : hasRecord ? '#bbdefb' : 'transparent',
                color: isSelected ? '#fff' : hasRecord ? '#0d47a1' : '#444',
                fontWeight: hasRecord ? '700' : '400',
                fontSize: 14,
                cursor: 'pointer',
                outline: 'none',
                padding: 0,
              }}
              aria-label={`Select day ${date.getDate()}`}
              onMouseEnter={e => {
                if (!isSelected) e.currentTarget.style.backgroundColor = '#e3f2fd';
              }}
              onMouseLeave={e => {
                if (!isSelected) e.currentTarget.style.backgroundColor = hasRecord ? '#bbdefb' : 'transparent';
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Attendance Details */}
      <div style={{ marginTop: 20, minHeight: 130 }}>
        {loading && <p style={{ textAlign: 'center', color: '#666' }}>Loading attendance...</p>}
        {!loading && selectedDate && (
          <>
            <h4 style={{ marginBottom: 10, color: '#2962ff', fontWeight: '700', fontSize: 16 }}>
              {selectedDate}
            </h4>
            {selectedRecord ? (
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Sign In Time', formatTime(selectedRecord.signInTime)],
                    ['Sign Out Time', formatTime(selectedRecord.signOutTime)],
                    ['Working Hours', selectedRecord.workingHours
                      ? new Date(selectedRecord.workingHours * 1000).toISOString().substr(11, 8)
                      : '--:--:--'],
                    ['Status', selectedRecord.status ? 'Online' : 'Offline'],
                    ['Work From Home', selectedRecord.workFromHome ? 'Yes' : 'No'],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '6px 8px', fontWeight: '600', color: '#555', width: '45%', backgroundColor: '#f5f7fa' }}>
                        {label}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#222' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                No attendance record found for this date.
              </p>
            )}
          </>
        )}
        {!loading && !selectedDate && (
          <p style={{ textAlign: 'center', color: '#aaa', fontStyle: 'italic', fontSize: 13 }}>
            Select a date to view attendance.
          </p>
        )}
      </div>
    </div>
  );
}

const navBtnStyle = {
  border: 'none',
  background: '#2962ff',
  color: 'white',
  borderRadius: 6,
  width: 26,
  height: 26,
  fontSize: 18,
  fontWeight: '700',
  cursor: 'pointer',
  userSelect: 'none',
  lineHeight: 1,
};
