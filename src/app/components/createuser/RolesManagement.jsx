'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '../../../../lib/firebaseConfig';
import Popup from '../popupsuccess/Popup';

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import './RolesManagement.css';

export default function RolesManagement() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    designation: '',
    workFromHome: false,
    role: 'staff',
  });
  const [loading, setLoading] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [popup, setPopup] = useState({ message: '', type: '' });

  const showPopup = (message, type = 'success') => {
    setPopup({ message, type });
  };
  const closePopup = () => setPopup({ message: '', type: '' });

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(userList);
      } catch (error) {
        console.error('Error fetching users:', error);
        showPopup('Failed to fetch users.', 'error');
      }
    };

    fetchUsers();
  }, []);

  // Reset form (with optional user data)
  const resetForm = (user = null) => {
    setFormData({
      fullName: user?.fullName || '',
      email: user?.email || '',
      designation: user?.designation || '',
      workFromHome: user?.workFromHome || false,
      role: user?.role || 'staff',
    });
    setLoading(false);
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle form submit to create or update user
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { fullName, email, designation, role, workFromHome } = formData;

    if (!fullName || !email || !designation) {
      showPopup('Please fill in all required fields.', 'error');
      setLoading(false);
      return;
    }

    try {
      if (editingUserId) {
        // Update user document (but NOT password here)
        const userRef = doc(db, 'users', editingUserId);
        await updateDoc(userRef, {
          fullName,
          designation,
          role,
          workFromHome,
          updatedAt: new Date(),
        });

        showPopup('User updated successfully!', 'success');
      } else {
        // Create user logic: generate a random password, create auth user and Firestore doc
        const generatedPassword = Math.random().toString(36).slice(-10) + 'A1!'; // simple generated password

        const userCredential = await createUserWithEmailAndPassword(auth, email, generatedPassword);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, 'users', uid), {
          fullName,
          email,
          designation,
          role,
          workFromHome,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Send password reset email so user can set their own password
        await sendPasswordResetEmail(auth, email);

        showPopup('User created successfully! Password reset email sent.', 'success');
      }

      resetForm();
      setShowAddUserForm(false);
      setEditingUserId(null);

      // Refresh user list
      const snapshot = await getDocs(collection(db, 'users'));
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (error) {
      console.error('Error creating/updating user:', error);
      showPopup(error.message || 'Failed to save user', 'error');
      setLoading(false);
    }
  };

  // Edit user
  const handleEdit = (user) => {
    setEditingUserId(user.id);
    resetForm(user);
    setShowAddUserForm(true);
  };

  // Delete user
  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      showPopup('User deleted.', 'success');
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Error deleting user:', err);
      showPopup('Error deleting user.', 'error');
    }
  };

  // Reset password by sending Firebase reset email
  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      showPopup(`Password reset email sent to ${email}`, 'success');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      showPopup(`Failed to send password reset email: ${error.message}`, 'error');
    }
  };

  return (
    <div className="roles-container">
      <h2>User Management</h2>

      <button className="btn primary" onClick={() => {
        resetForm();
        setEditingUserId(null);
        setShowAddUserForm(true);
      }}>
        Add User
      </button>

      {showAddUserForm && (
        <form onSubmit={handleSubmit} className="roles-form">
          <input
            type="text"
            name="fullName"
            placeholder="Full Name*"
            value={formData.fullName}
            onChange={handleChange}
          />
          <input
            type="email"
            name="email"
            placeholder="Email*"
            value={formData.email}
            onChange={handleChange}
            disabled={!!editingUserId}
          />

          <input
            type="text"
            name="designation"
            placeholder="Designation*"
            value={formData.designation}
            onChange={handleChange}
          />
          <label>
            <input
              type="checkbox"
              name="workFromHome"
              checked={formData.workFromHome}
              onChange={handleChange}
            />
            Work From Home
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Saving...' : editingUserId ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              resetForm();
              setShowAddUserForm(false);
              setEditingUserId(null);
            }}
          >
            Cancel
          </button>
        </form>
      )}

      <hr />

      <h3>Users</h3>
      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Designation</th><th>Role</th><th>WFH</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr><td colSpan="6">No users found.</td></tr>
          ) : users.map((user) => (
            <tr key={user.id}>
              <td>{user.fullName}</td>
              <td>{user.email}</td>
              <td>{user.designation}</td>
              <td>{user.role}</td>
              <td>{user.workFromHome ? 'Yes' : 'No'}</td>
              <td>
                <button onClick={() => handleEdit(user)} className="btn secondary">Edit</button>
                <button onClick={() => handleDelete(user.id)} className="btn danger" style={{ marginLeft: '0.5rem' }}>Delete</button>
                <button
                  onClick={() => handleResetPassword(user.email)}
                  className="btn secondary"
                  style={{ marginLeft: '0.5rem' }}
                >
                  Reset Password
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Popup message={popup.message} type={popup.type} onClose={closePopup} />
    </div>
  );
}
