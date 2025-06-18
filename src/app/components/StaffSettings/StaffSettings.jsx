'use client';

import { useState, useEffect } from 'react';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../../../lib/firebaseConfig';
import './StaffDashboardRemote.css'; // Make sure your CSS is saved here

export default function StaffSettings() {
  const [user, loading, error] = useAuthState(auth);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [dob, setDob] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

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
        setStatusMessage('Failed to load user data.');
      }
    };
    loadUserData();
  }, [user]);

  const handleUpdate = async () => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        fullName: name,
        destination,
        dob,
      });

      await updateProfile(user, { displayName: name });

      setStatusMessage('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setStatusMessage('Failed to update profile. Please try again.');
    }
  };

  const handleResetPassword = async () => {
    if (!user || !user.email) {
      setStatusMessage('No user email found for password reset.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      setStatusMessage(`Password reset email sent to ${user.email}`);
    } catch (err) {
      console.error('Error sending password reset email:', err);
      setStatusMessage('Failed to send password reset email. Please try again.');
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading settings...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error.message}</div>;
  if (!user)
    return (
      <div style={{ padding: 20 }}>
        <h2>Please log in to access settings.</h2>
      </div>
    );

  return (
    <div className="settings-section">
      <h1>Edit Profile</h1>
      <form
        className="settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleUpdate();
        }}
      >
        <label>
          Full Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            required
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

        {/* Buttons span full width on two-column grid */}
        <button type="submit" className="btn-primary">
          Save Changes
        </button>

        <button
          type="button"
          onClick={handleResetPassword}
          className="btn-primary"
          style={{ backgroundColor: '#e67e22', marginTop: '0.5rem' }}
        >
          Reset Password
        </button>

        {statusMessage && (
          <p style={{ gridColumn: 'span 2', color: '#2c3e50', marginTop: '1rem' }}>
            {statusMessage}
          </p>
        )}
      </form>
    </div>
  );
}
