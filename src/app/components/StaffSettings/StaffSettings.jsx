'use client';

import { useState, useEffect } from 'react';
import {
  updatePassword,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../../../lib/firebaseConfig';
import './StaffDashboardRemote.css';

export default function StaffSettings() {
  const [user, loading, error] = useAuthState(auth);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [dob, setDob] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Load user data from Firestore
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.fullName || '');
          setDestination(data.destination || '');
          setDob(data.dob || '');
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    };
    loadUserData();
  }, [user]);

  const handleUpdate = async () => {
    if (!user) return;

    try {
      // Password validation
      if (newPassword || confirmPassword || currentPassword) {
        if (!currentPassword) {
          setStatusMessage('Please enter your current password.');
          return;
        }

        if (newPassword !== confirmPassword) {
          setStatusMessage('New passwords do not match.');
          return;
        }

        // Re-authenticate user
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      const updates = [];

      // Update Firestore data
      updates.push(
        updateDoc(doc(db, 'users', user.uid), {
          fullName: name,
          destination,
          dob,
        })
      );

      // Update Firebase Auth profile
      updates.push(updateProfile(user, { displayName: name }));

      // Update password if provided
      if (newPassword.trim()) {
        updates.push(updatePassword(user, newPassword));
      }

      await Promise.all(updates);
      setStatusMessage('Profile updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (err) {
      console.error('Error updating profile:', err);
      setStatusMessage('Failed to update profile. Please try again.');
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading settings...</div>;
  if (error) return <div style={{ padding: 20 }}>Error: {error.message}</div>;
  if (!user)
    return (
      <div style={{ padding: 20 }}>
        <h2>Please log in to access settings.</h2>
      </div>
    );

  return (
    <div className="dashboard-container-remote">
      <main className="content-remote">
        <section className="settings-section">
          <h1>Edit Profile</h1>
          <div className="settings-form">
            <label>
              Full Name:
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </label>

            <label>
              Destination:
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Your role or location"
              />
            </label>

            <label>
              Date of Birth:
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </label>

            <label>
              Current Password:
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password to change it"
              />
            </label>

            <label>
              New Password:
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </label>

            <label>
              Confirm New Password:
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </label>

            <button onClick={handleUpdate} className="btn-primary" style={{ marginTop: 16 }}>
              Save Changes
            </button>

            {statusMessage && <p style={{ marginTop: 10 }}>{statusMessage}</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
