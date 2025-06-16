'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../../../lib/firebaseConfig';
import TopBar from '@/app/components/topbar/page';
import Settings from '../../components/StaffSettings/StaffSettings';
import './StaffDashboardRemote.css';
import AttendanceHistoryTable from '../../components/attendenceHistory/AttendanceHistory'

export default function StaffDashboardRemote() {
  const [user, loading, error] = useAuthState(auth);
  const [attendance, setAttendance] = useState({ signInTime: null, signOutTime: null });
  const [isWorking, setIsWorking] = useState(false);
  const [workingTime, setWorkingTime] = useState('00:00');
  const [notes, setNotes] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [activeSection, setActiveSection] = useState('work');
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState(null);
  const [breakDuration, setBreakDuration] = useState(0);
  const [breaksList, setBreaksList] = useState([]); // Array of break objects {start, end, duration}
  const [showBreaksList, setShowBreaksList] = useState(false); // Flag to show break list UI
  
  // Break timer display (hh:mm:ss)
  const [breakTimer, setBreakTimer] = useState('00:00:00');

  // Listen to user data and attendance updates including breaks list
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const signInTime = data.signInTime?.toDate().toISOString() ?? null;
      const signOutTime = data.signOutTime?.toDate().toISOString() ?? null;
      const breakStart = data.breakStartTime?.toDate().toISOString() ?? null;
      const breaks = data.breaksList || []; // Array from Firestore
      
      setAttendance({ signInTime, signOutTime });
      setIsWorking(!!(signInTime && !signOutTime));
      setBreakStartTime(breakStart);
      setBreakDuration(data.breakDuration || 0);
      setBreaksList(breaks);
      setIsOnBreak(!!breakStart && !signOutTime);

      // Single account enforcement per browser
      const localUserId = localStorage.getItem('loggedUserId');
      if (localUserId && localUserId !== user.uid) {
        alert('Only one account can be used per browser. Please clear local storage or log out.');
        auth.signOut();
      } else {
        localStorage.setItem('loggedUserId', user.uid);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Load and save notes locally
  useEffect(() => {
    const savedNotes = localStorage.getItem('dailyNotes');
    if (savedNotes) setNotes(savedNotes);
  }, []);

  useEffect(() => {
    localStorage.setItem('dailyNotes', notes);
  }, [notes]);

  // Calculate working time display
  useEffect(() => {
    const updateWorkingTime = () => {
      if (!attendance.signInTime) return setWorkingTime('00:00');

      const start = new Date(attendance.signInTime);
      const end = attendance.signOutTime ? new Date(attendance.signOutTime) : new Date();
      const diffMinutes = Math.floor((end - start) / 60000);
      const effectiveMinutes = Math.max(0, diffMinutes - Math.min(breakDuration, diffMinutes));

      const hours = String(Math.floor(effectiveMinutes / 60)).padStart(2, '0');
      const mins = String(effectiveMinutes % 60).padStart(2, '0');
      setWorkingTime(`${hours}:${mins}`);
    };

    updateWorkingTime();
    if (isWorking) {
      const interval = setInterval(updateWorkingTime, 1000);
      return () => clearInterval(interval);
    }
  }, [attendance, isWorking, breakDuration]);

  // Update current date and time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(
        new Date().toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format ISO time to hh:mm string or placeholder
  const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : '--:--';


  {breaksList.map((brk, index) => (
  <li key={index}>
    Break {index + 1}: {new Date(brk.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
    {' - '}
    {new Date(brk.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
    {' ('}{brk.duration} min)
  </li>
))}
  // Format seconds to hh:mm:ss
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hrs, mins, secs]
      .map((v) => String(v).padStart(2, '0'))
      .join(':');
  };


  
  // Calculate total break time from breaks list (in minutes)
  const totalBreakTime = breaksList.reduce((acc, b) => acc + (b.duration || 0), 0);

  // Update break timer display every second while on break
  useEffect(() => {
    if (!isOnBreak || !breakStartTime) {
      setBreakTimer('00:00:00');
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(breakStartTime);
      const now = new Date();
      const diffSeconds = Math.floor((now - start) / 1000);
      setBreakTimer(formatDuration(diffSeconds));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnBreak, breakStartTime]);

  // Handle sign in
  const handleSignIn = async () => {
    if (!user) return alert('You must be logged in to sign in.');

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const attendanceRef = doc(db, 'users', user.uid, 'attendanceRecords', dateStr);
    const attendanceSnap = await getDoc(attendanceRef);

    if (attendanceSnap.exists() && attendanceSnap.data().signInTime) {
      alert('Already signed in today.');
      return;
    }

    await setDoc(attendanceRef, {
      date: dateStr,
      signInTime: serverTimestamp(),
      signOutTime: null,
      workingHours: 0,
      breakDuration: 0,
      breakStartTime: null,
      breaksList: [],
    });

    await updateDoc(doc(db, 'users', user.uid), {
      signInTime: serverTimestamp(),
      signOutTime: null,
      status: 'online',
      breakDuration: 0,
      breakStartTime: null,
      breaksList: [],
    });
  };

  // Handle sign out with confirmation
  const handleSignOut = useCallback(async () => {
    if (!user) return alert('You must be logged in to sign out.');

    const confirmed = window.confirm('Are you sure you want to sign out?');
    if (!confirmed) return;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const attendanceRef = doc(db, 'users', user.uid, 'attendanceRecords', dateStr);

    if (!attendance.signInTime || attendance.signOutTime) {
      alert('Invalid sign-out attempt.');
      return;
    }

    const signInDate = new Date(attendance.signInTime);
    const hoursWorked = Math.max(0, (now - signInDate) / 3600000);

    if (hoursWorked < 0.1) {
      alert('You need to work at least 5 minutes before signing out.');
      return;
    }

    await updateDoc(attendanceRef, {
      signOutTime: serverTimestamp(),
      workingHours: Number(hoursWorked.toFixed(3)),
      breakStartTime: null,
    });

    await updateDoc(doc(db, 'users', user.uid), {
      signOutTime: serverTimestamp(),
      status: 'offline',
      breakStartTime: null,
    });

    setIsOnBreak(false);
    setBreakStartTime(null);
    setBreakDuration(0);
    setBreaksList([]);
    setShowBreaksList(false);
  }, [user, attendance]);

  // Handle break start
  const handleBreakStart = async () => {
    if (!user || !isWorking) return alert('Sign in before starting a break.');

    // If already on break, do nothing
    if (isOnBreak) return alert('You are already on a break.');

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const userDoc = doc(db, 'users', user.uid);
    const attendanceDoc = doc(db, 'users', user.uid, 'attendanceRecords', dateStr);

    // Update breakStartTime in both user and attendance record
    await updateDoc(userDoc, { breakStartTime: serverTimestamp() });
    await updateDoc(attendanceDoc, { breakStartTime: serverTimestamp() });

    setIsOnBreak(true);
    setBreakStartTime(now.toISOString());

    // If breaksList length >= 2 (meaning this is 3rd break), show breaks list UI
    if (breaksList.length >= 2) {
      setShowBreaksList(true);
    }
  };

  // Handle break end
  const handleBreakEnd = async () => {
    if (!user || !isOnBreak) return alert('You are not on a break.');

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const attendanceDoc = doc(db, 'users', user.uid, 'attendanceRecords', dateStr);
    const userDoc = doc(db, 'users', user.uid);

    const breakStartDate = breakStartTime ? new Date(breakStartTime) : null;
    if (!breakStartDate) {
      alert('Break start time not found.');
      return;
    }

    const diffMinutes = Math.floor((now - breakStartDate) / 60000);

    // Create new break object
    const newBreak = {
      start: breakStartDate.toISOString(),
      end: now.toISOString(),
      duration: diffMinutes,
    };

    // Update breaksList by appending newBreak
    const updatedBreaksList = [...breaksList, newBreak];

    // Calculate new total break duration
    const totalDuration = updatedBreaksList.reduce((acc, b) => acc + (b.duration || 0), 0);

    // Update Firestore with new break info
    await updateDoc(attendanceDoc, {
      breakDuration: totalDuration,
      breakStartTime: null,
      breaksList: updatedBreaksList,
    });
    await updateDoc(userDoc, {
      breakDuration: totalDuration,
      breakStartTime: null,
      breaksList: updatedBreaksList,
    });

    setBreakDuration(totalDuration);
    setBreaksList(updatedBreaksList);  
    setIsOnBreak(false);
    setBreakStartTime(null);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!user) return <p>Please log in to view your dashboard.</p>;

  return (
    <>
      <TopBar />
      <div className="dashboard-container-remote">
        <aside className="sidebar-remote">
          {/* <h2>Remote Dashboard</h2> */}
          <div className={`status-indicator ${isWorking ? 'online' : 'offline'}`}>
            {isWorking ? 'Online' : 'Offline'}
          </div>
          <nav>
            <ul>
              <li
                className={activeSection === 'work' ? 'active' : ''}
                onClick={() => setActiveSection('work')}
              >
                Work Status 
              </li> 
              <li
                className={activeSection === 'notes' ? 'active' : ''}
                onClick={() => setActiveSection('notes')}
              >
                Notes
              </li>
             <li
  className={activeSection === 'history' ? 'active' : ''}
  onClick={() => setActiveSection('history')}
>
  History
</li>
              <li
                className={activeSection === 'settings' ? 'active' : ''}
                onClick={() => setActiveSection('settings')}
              >
                Settings
              </li>
            </ul>
          </nav>
        </aside>

        <main className="content-remote">
          {/* BREAK TIMER: Show at top right if on break */}
          {isOnBreak && (
            <div className="break-timer">
              ⏱️ Break Time: {breakTimer}
            </div>
          )}

          {activeSection === 'work' && (
            <>
              <h1>Welcome, {user.displayName || user.email}</h1>
              <p>Current Date & Time: {currentDateTime}</p>

              <section className="attendance-card-remote">
                <div className="attendance-info">
                  <div>Sign In: {formatTime(attendance.signInTime)}</div>
                  <div>Sign Out: {formatTime(attendance.signOutTime)}</div>
                  <div>
                    Working Time:{' '}
                    {workingTime === '00:00' && !isWorking ? 'Too short to count' : workingTime}
                  </div>
                  <div>Break Time: {breakDuration} min</div>
                </div>

                <div className="attendance-actions">
                  {!isWorking ? (
                    <button onClick={handleSignIn} className="btn-primary">
                      Sign In
                    </button>
                  ) : (
                    <button onClick={handleSignOut} className="btn-danger">
                      Sign Out
                    </button>
                  )}
                </div>

                {isWorking && (
                  <div className="break-actions">
                    {!isOnBreak ? (
                      <button onClick={handleBreakStart} className="btn-warning">
                        Start Break
                      </button>
                    ) : (
                      <button onClick={handleBreakEnd} className="btn-secondary">
                        End Break
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Show breaks list if user took more than 2 breaks */}
              {showBreaksList && breaksList.length > 0 && (
                <section className="breaks-list-section">
                  <h3>Breaks taken today:</h3>
                  <ul>
                    {breaksList.map((brk, index) => (
                      <li key={index}>
                        Break {index + 1}: {new Date(brk.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(brk.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({brk.duration} min)
                      </li>
                    ))}
                  </ul>
                  <p>
                    <strong>Total Break Time:</strong> {totalBreakTime} minutes
                  </p>
                </section>
              )}
            </>
          )}

          {activeSection === 'notes' && (
            <div className="notes-section">
              <h2>Daily Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your notes here..."
              />
              <small>Notes are saved locally in your browser.</small>
            </div>
          )}

          {activeSection === 'settings' && (
            <>
              <h2>Settings</h2>
              <Settings />
            </>
          )}
          {activeSection === 'history' && (
    <>
      <h2>Attendance History</h2>
      <AttendanceHistoryTable userId={user.uid} />
    </>
  )}
        </main>
      
      </div>

      <style jsx>{`
        .break-timer {
          position: fixed;
          top: 100px;
          right: 10px;
          background: #ffc107;
          padding: 8px 14px;
          border-radius: 6px;
          font-weight: 600;
          color: #000;
          box-shadow: 0 0 6px #d4a200;
          z-index: 1000;
        }
        .breaks-list-section {
          margin-top: 20px;
          padding: 10px;
          background: #f9f9f9;
          border-radius: 8px;
          box-shadow: 0 0 6px rgba(0, 0, 0, 0.1);
        }
        .breaks-list-section ul {
          list-style-type: none;
          padding-left: 0;
        }
        .breaks-list-section li {
          margin-bottom: 6px;
        }
      `}</style>
    </>
  );
}
