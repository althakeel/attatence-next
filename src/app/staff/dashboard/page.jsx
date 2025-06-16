'use client';

import { useState, useEffect } from 'react';
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

export default function StaffDashboardRemote() {
  const [user, loading, error] = useAuthState(auth);
  const [attendance, setAttendance] = useState({ signInTime: null, signOutTime: null });
  const [isWorking, setIsWorking] = useState(false);
  const [workingTime, setWorkingTime] = useState('00:00');
  const [notes, setNotes] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [activeSection, setActiveSection] = useState('work'); // 'work', 'notes', 'settings'

  // Listen for real-time attendance updates
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const signInTime = data.signInTime ? data.signInTime.toDate().toISOString() : null;
      const signOutTime = data.signOutTime ? data.signOutTime.toDate().toISOString() : null;

      setAttendance({ signInTime, signOutTime });
      setIsWorking(!!(signInTime && !signOutTime));
    });

    return () => unsubscribe();
  }, [user]);

  // Local notes storage
  useEffect(() => {
    const savedNotes = localStorage.getItem('dailyNotes');
    if (savedNotes) setNotes(savedNotes);
  }, []);

  useEffect(() => {
    localStorage.setItem('dailyNotes', notes);
  }, [notes]);

  // Working time calculation
  useEffect(() => {
    const updateWorkingTime = () => {
      if (!attendance.signInTime) {
        setWorkingTime('00:00');
        return;
      }

      const start = new Date(attendance.signInTime);
      const end = attendance.signOutTime ? new Date(attendance.signOutTime) : new Date();
      const diff = end.getTime() - start.getTime();

      if (diff <= 0) {
        setWorkingTime('00:00');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;

      setWorkingTime(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    };

    updateWorkingTime();
    if (isWorking) {
      const interval = setInterval(updateWorkingTime, 1000);
      return () => clearInterval(interval);
    }
  }, [attendance, isWorking]);

  // Live current time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDateTime(now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

  const handleSignIn = async () => {
    if (!user) {
      alert('You must be logged in to sign in.');
      return;
    }

    try {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
      const dateStr = now.toISOString().split('T')[0];

      const attendanceRef = doc(db, 'users', user.uid, 'attendanceRecords', dateStr);
      const attendanceSnap = await getDoc(attendanceRef);

      if (!attendanceSnap.exists()) {
        await setDoc(attendanceRef, {
          date: dateStr,
          signInTime: serverTimestamp(),
          signOutTime: null,
          workingHours: 0,
          workFromHome: true,
        });
      } else {
        await updateDoc(attendanceRef, {
          signInTime: serverTimestamp(),
          signOutTime: null,
          workingHours: 0,
        });
      }

      await updateDoc(doc(db, 'users', user.uid), {
        signInTime: serverTimestamp(),
        signOutTime: null,
        status: 'online',
      });
    } catch (err) {
      console.error('Sign-in error:', err);
      alert('Failed to sign in.');
    }
  };

  const handleSignOut = async () => {
    if (!user) {
      alert('You must be logged in to sign out.');
      return;
    }

    try {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
      const dateStr = now.toISOString().split('T')[0];

      const attendanceRef = doc(db, 'users', user.uid, 'attendanceRecords', dateStr);

      let hoursWorked = 0;
      if (attendance.signInTime) {
        const signInDate = new Date(attendance.signInTime);
        const diff = now.getTime() - signInDate.getTime();
        hoursWorked = diff > 0 ? diff / (1000 * 60 * 60) : 0;
        hoursWorked = Number(hoursWorked.toFixed(2));
      }

      await updateDoc(attendanceRef, {
        signOutTime: serverTimestamp(),
        workingHours: hoursWorked,
      });

      await updateDoc(doc(db, 'users', user.uid), {
        signOutTime: serverTimestamp(),
        status: 'offline',
      });
    } catch (err) {
      console.error('Sign-out error:', err);
      alert('Failed to sign out.');
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading user info...</div>;
  if (error) return <div style={{ padding: 20 }}>Error: {error.message}</div>;
  if (!user) return <div style={{ padding: 20 }}><h2>Please log in to access your dashboard.</h2></div>;

  return (
    <>
      <TopBar />
      <div className="dashboard-container-remote">
        <aside className="sidebar-remote">
          <h2>Staff Dashboard</h2>
          <div className={`status-indicator ${isWorking ? 'online' : 'offline'}`}><strong>{isWorking ? 'Online' : 'Offline'}</strong></div>
          <nav>
            <ul>
              <li onClick={() => setActiveSection('work')} className={activeSection === 'work' ? 'active' : ''}>Work Status</li>
              <li onClick={() => setActiveSection('notes')} className={activeSection === 'notes' ? 'active' : ''}>Notes</li>
              <li onClick={() => setActiveSection('settings')} className={activeSection === 'settings' ? 'active' : ''}>Settings</li>
            </ul>
          </nav>
        </aside>

        <main className="content-remote">
          {activeSection === 'work' && (
            <section className="attendance-section">
              <h1>Work Status</h1>
              <div className="attendance-card-remote">
                <div className="attendance-info">
                  <div><strong>Date & Time:</strong> {currentDateTime}</div>
                  <div><strong>Signed In:</strong> {formatTime(attendance.signInTime)}</div>
                  <div><strong>Signed Out:</strong> {formatTime(attendance.signOutTime)}</div>
                  <div><strong>Working Time:</strong> {workingTime}</div>
                </div>
                <div className="attendance-actions">
                  {!isWorking ? (
                    <button onClick={handleSignIn} className="btn-primary">Sign In</button>
                  ) : (
                    <button onClick={handleSignOut} className="btn-danger">Sign Out</button>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeSection === 'notes' && (
            <section className="notes-section">
              <h2>Daily Notes</h2>
              <textarea
                placeholder="Write your notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={8}
              />
              <small>Notes are saved in your browser's local storage.</small>
            </section>
          )}

          {activeSection === 'settings' && (
            <section className="settings-section">
              <Settings />
            </section>
          )}
        </main>
      </div>
    </>
  );
}
