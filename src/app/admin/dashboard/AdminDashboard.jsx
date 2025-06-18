'use client';

import React, { useState, useEffect, useRef } from 'react';
import './AdminDashboard.css';

import { auth, db } from '../../../../lib/firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import AttendanceHistory from '../../components/attendenceHistory/AttendanceHistory';
import RolesManagement from '../../components/createuser/RolesManagement';
import AddNoteForStaff from '../../components/addnote/AddNoteForStaff';

export default function AdminDashboard() {
  const [staffList, setStaffList] = useState([]);
  const [activeTab, setActiveTab] = useState('attendance');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [popupMessage, setPopupMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [filter, setFilter] = useState('all');
  const prevStaffListRef = useRef([]);

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '--:--';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatWorkingHours = (seconds) => {
    if (typeof seconds !== 'number' || seconds < 0) return '--:--:--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return [hrs, mins, secs].map((val) => val.toString().padStart(2, '0')).join(':');
  };

  const calculateTodayHours = (attendanceHistory) => {
    if (!Array.isArray(attendanceHistory)) return '--:--:--';
    let totalSeconds = 0;

    attendanceHistory.forEach(day => {
      const date = day.date?.toDate?.() || new Date(day.date);
      if (isToday(date) && day.workingHours) {
        totalSeconds += day.workingHours;
      }
    });

    return formatWorkingHours(totalSeconds);
  };

  const showStatusPopup = (message) => {
    setPopupMessage(message);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
  };

  useEffect(() => {
    if (activeTab !== 'attendance') return;
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const updatedStaff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      prevStaffListRef.current.forEach(prevUser => {
        const updatedUser = updatedStaff.find(u => u.id === prevUser.id);
        if (updatedUser && updatedUser.status !== prevUser.status) {
          showStatusPopup(`${updatedUser.fullName} is now ${updatedUser.status}`);
        }
      });

      prevStaffListRef.current = updatedStaff;
      setStaffList(updatedStaff);
    });

    return () => unsubscribe();
  }, [activeTab]);

  const filteredStaffList = staffList.filter(staff => {
    if (filter === 'online') return staff.status === 'online';
    if (filter === 'wfh') return staff.workFromHome;
    return true;
  });

  return (
    <div className="admin-dashboard">
      {showPopup && <div className="status-popup">{popupMessage}</div>}

      <aside className="admin-sidebar">
        <h3 style={{ color: '#fff' }}>Admin Dashboard</h3>
        <nav>
          <ul>
            <li
              className={activeTab === 'attendance' ? 'active' : ''}
              onClick={() => {
                setActiveTab('attendance');
                setSelectedStaff(null);
              }}
              style={{ cursor: 'pointer' }}
            >
              Staff Attendance
            </li>
            <li
              className={activeTab === 'rolesManagement' ? 'active' : ''}
              onClick={() => setActiveTab('rolesManagement')}
              style={{ cursor: 'pointer' }}
            >
              Roles Management
            </li>
            <li
              className={activeTab === 'addNote' ? 'active' : ''}
              onClick={() => {
                setActiveTab('addNote');
                setSelectedStaff(null);
              }}
              style={{ cursor: 'pointer' }}
            >
              Add Note
            </li>
          </ul>
        </nav>
      </aside>

      <main className="admin-content">
        {activeTab === 'attendance' && (
          <>
            <h1>
              Staff Attendance Overview (
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
              )
            </h1>

            <div
              className="filter-controls"
              style={{
                padding: '10px',
                marginBottom: '15px',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px'
              }}
            >
              <label style={{ fontWeight: 'bold', marginRight: '10px' }}>
                Filter:
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={{
                    marginLeft: '10px',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                >
                  <option value="all">All</option>
                  <option value="online">Online</option>
                  <option value="wfh">Working From Home</option>
                </select>
              </label>
            </div>

            <table className="staff-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Designation</th>
                  <th>Sign In</th>
                  <th>Sign Out</th>
                  <th>Break In</th>
                  <th>Break Out</th>
                  <th>Status</th>
                  <th>Daily Hours</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaffList.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center' }}>
                      No staff data found.
                    </td>
                  </tr>
                ) : (
                  filteredStaffList.map((staff) => {
                    const todayBreaks = (staff.breaks || []).filter((b) => {
                      const startDate = b.start?.toDate?.() || new Date(b.start);
                      return isToday(startDate);
                    });
                    const latestBreak = todayBreaks[todayBreaks.length - 1] || null;

                    const signInToday = isToday(new Date(staff.signInTime?.toDate?.() || staff.signInTime || 0));
                    const signOutToday = isToday(new Date(staff.signOutTime?.toDate?.() || staff.signOutTime || 0));

                    return (
                      <tr
                        key={staff.id}
                        onClick={() => setSelectedStaff(staff)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: selectedStaff?.id === staff.id ? '#f0f8ff' : 'transparent'
                        }}
                      >
                        <td>{staff.fullName}</td>
                        <td>{staff.email}</td>
                        <td>{staff.role}</td>
                        <td>{staff.designation}</td>
                        <td>{signInToday ? formatTimestamp(staff.signInTime) : '--:--'}</td>
                        <td>{signOutToday ? formatTimestamp(staff.signOutTime) : '--:--'}</td>
                        <td>{latestBreak?.start ? formatTimestamp(latestBreak.start) : '--:--'}</td>
                        <td>{latestBreak?.end ? formatTimestamp(latestBreak.end) : '--:--'}</td>
                        <td className={staff.status === 'online' ? 'status-online' : 'status-offline'}>
                          {staff.status || '--'}
                        </td>
                        <td>{staff.attendanceHistory ? calculateTodayHours(staff.attendanceHistory) : '--:--:--'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {selectedStaff && (
              <div className="attendance-history-section">
                <h2>{selectedStaff.fullName}'s Attendance History</h2>
                <AttendanceHistory userId={selectedStaff.id} />

                {selectedStaff.breaks && selectedStaff.breaks.length > 0 && (
                  <div className="break-history">
                    <h3>Break History (Today)</h3>
                    <ul>
                      {selectedStaff.breaks
                        .filter((b) => isToday(new Date(b.start?.toDate?.() || b.start)))
                        .map((breakItem, index) => (
                          <li key={index}>
                            Start: {formatTimestamp(breakItem.start)} | End: {formatTimestamp(breakItem.end)} | Duration:{' '}
                            {formatWorkingHours((breakItem.duration || 0) * 3600)}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                <button onClick={() => setSelectedStaff(null)}>Close</button>
              </div>
            )}
          </>
        )}

        {activeTab === 'rolesManagement' && <RolesManagement />}

        {activeTab === 'addNote' && (
  <AddNoteForStaff staffList={staffList} showStatusPopup={showStatusPopup} />
)}

      </main>
    </div>
  );
}
