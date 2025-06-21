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
import Notes from '../../components/notes/notes';
import './StaffDashboardRemote.css';
import AttendanceHistoryTable from '../../components/attendenceHistory/AttendanceHistory';

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
  const [breaksList, setBreaksList] = useState([]);
  const [showBreaksList, setShowBreaksList] = useState(false);
  const [breakTimer, setBreakTimer] = useState('00:00:00');

  useEffect(() => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const attendanceRef = doc(db, 'users', user.uid, 'attendanceRecords', today);

    const unsubscribe = onSnapshot(attendanceRef, (docSnap) => {
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const signInTime = data.signInTime?.toDate().toISOString() ?? null;
      const signOutTime = data.signOutTime?.toDate().toISOString() ?? null;
      const breakStart = data.breakStartTime?.toDate().toISOString() ?? null;
      const breaks = data.breaksList || [];

      setAttendance({ signInTime, signOutTime });
      setIsWorking(!!(signInTime && !signOutTime));
      setBreakStartTime(breakStart);
      setBreakDuration(data.breakDuration || 0);
      setBreaksList(breaks);
      setIsOnBreak(!!breakStart && !signOutTime);

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

  useEffect(() => {
    const savedNotes = localStorage.getItem('dailyNotes');
    if (savedNotes) setNotes(savedNotes);
  }, []);

  useEffect(() => {
    localStorage.setItem('dailyNotes', notes);
  }, [notes]);

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

  const formatTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : '--:--';

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hrs, mins, secs]
      .map((v) => String(v).padStart(2, '0'))
      .join(':');
  };

  const totalBreakTime = breaksList.reduce((acc, b) => acc + (b.duration || 0), 0);

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
  };
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
  
    const docSnap = await getDoc(attendanceRef);
    if (docSnap.exists()) {
      await updateDoc(attendanceRef, {
        signOutTime: serverTimestamp(),
        workingHours: Number(hoursWorked.toFixed(3)),
        breakStartTime: null,
      });
    } else {
      await setDoc(attendanceRef, {
        date: dateStr,
        signInTime: null,
        signOutTime: serverTimestamp(),
        workingHours: Number(hoursWorked.toFixed(3)),
        breakDuration: 0,
        breakStartTime: null,
        breaksList: [],
      });
    }
  
    setIsOnBreak(false);
    setBreakStartTime(null);
    setBreakDuration(0);
    setBreaksList([]);
    setShowBreaksList(false);
  }, [user, attendance]);
  
   
  const handleBreakStart = async () => {
    if (!user || !isWorking) return alert('Sign in before starting a break.');

    if (isOnBreak) return alert('You are already on a break.');

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const attendanceDoc = doc(db, 'users', user.uid, 'attendanceRecords', dateStr);

    await updateDoc(attendanceDoc, { breakStartTime: serverTimestamp() });

    setIsOnBreak(true);
    setBreakStartTime(now.toISOString());

    if (breaksList.length >= 2) {
      setShowBreaksList(true);
    }
  };

  const handleBreakEnd = async () => {
    if (!user || !isOnBreak) return alert('You are not on a break.');

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const attendanceDoc = doc(db, 'users', user.uid, 'attendanceRecords', dateStr);

    const breakStartDate = breakStartTime ? new Date(breakStartTime) : null;
    if (!breakStartDate) {
      alert('Break start time not found.');
      return;
    }

    const diffMinutes = Math.floor((now - breakStartDate) / 60000);

    const newBreak = {
      start: breakStartDate.toISOString(),
      end: now.toISOString(),
      duration: diffMinutes,
    };

    const updatedBreaksList = [...breaksList, newBreak];
    const totalDuration = updatedBreaksList.reduce((acc, b) => acc + (b.duration || 0), 0);

    await updateDoc(attendanceDoc, {
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
          <div className={`status-indicator ${isWorking ? 'online' : 'offline'}`}>
            {isWorking ? 'Online' : 'Offline'}
          </div>
          <nav>
            <ul>
              <li className={activeSection === 'work' ? 'active' : ''} onClick={() => setActiveSection('work')}>
                Work Status
              </li>
              <li className={activeSection === 'notes' ? 'active' : ''} onClick={() => setActiveSection('notes')}>
                Notes
              </li>
              <li className={activeSection === 'history' ? 'active' : ''} onClick={() => setActiveSection('history')}>
                History
              </li>
              <li className={activeSection === 'settings' ? 'active' : ''} onClick={() => setActiveSection('settings')}>
                Settings
              </li>
            </ul>
          </nav>
        </aside>

        <main className="content-remote">
          {isOnBreak && (
            <div className="break-timer">⏱️ Break Time: {breakTimer}</div>
          )}

          {activeSection === 'work' && (
            <>
              <h1>Welcome, {user.displayName || user.email}</h1>
              <p>{currentDateTime}</p>

              <section className="attendance-card-remote">
                <div className="attendance-info">
                  <div>Sign In: {formatTime(attendance.signInTime)}</div>
                  <div>Sign Out: {formatTime(attendance.signOutTime)}</div>
                  <div>
                    Working Time: {workingTime === '00:00' && !isWorking ? 'Too short to count' : workingTime}
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
              <Notes />
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
    </>
  );
}
