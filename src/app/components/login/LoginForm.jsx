'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../../lib/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import './LoginForm.css';

function Popup({ message, onClose }) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <button className="popup-close-btn" onClick={onClose}>
          Go to Login
        </button>
      </div>
    </div>
  );
}

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'logout-event') {
        localStorage.clear();
        router.replace('/login');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Email and password are required.');
      setLoading(false);
      return;
    }

    try {
      const existingUserId = localStorage.getItem('userId');
      if (existingUserId) {
        setError('An account is already logged in on this browser.');
        setLoading(false);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        throw new Error('User record not found. Contact admin.');
      }

      const userData = userDocSnap.data();
      if (userData.role !== role) {
        throw new Error('Unauthorized role. Contact admin.');
      }

      const sessionId = uuidv4();
      await updateDoc(userDocRef, { sessionId });

      localStorage.setItem('sessionId', sessionId);
      localStorage.setItem('userId', user.uid);
      localStorage.setItem('role', role);
      localStorage.setItem('login-event', Date.now().toString());

      router.push(role === 'admin' ? '/admin/dashboard' : '/staff/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    router.push('/login');
  };

  return (
    <div className="login-page">
      {showPopup && <Popup message="Please log in to view your dashboard." onClose={closePopup} />}

      <div className="login-box">
<h2 className="login-title">
  <img src="https://res.cloudinary.com/dm8z5zz5s/image/upload/v1748511635/Logo_1080_x_1080_Black_ymy1di.png" alt="Al Thakeel Attendance" className="login-logo" style={{width:'150px'}} />
</h2>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <p className="error-msg">{error}</p>}

          <div className="form-group">
            <label htmlFor="role" className="form-label">Select Role</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="form-input">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="form-input"
            />
            <div className="show-password-container">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
              <label htmlFor="showPassword" className="show-password-label">Show Password</label>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="forgot-section">
          <button
            type="button"
            className="forgot-btn"
            onClick={() => alert('Please contact system admin: admin@althakeel.com')}
          >
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
