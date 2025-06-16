'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../../lib/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import './LoginForm.css';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (userData.role === 'staff') {
          router.push('/staff/dashboard');
        } else {
          setError('Unauthorized role. Contact admin.');
        }
      } else {
        setError('User record not found. Contact admin.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h2 className="login-title">Al Thakeel Attendance</h2>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <p className="error-msg">{error}</p>}

          <div className="form-group">
            <label htmlFor="role" className="form-label">Select Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="form-input"
            >
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
              autoComplete="email"
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
              autoComplete="current-password"
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
