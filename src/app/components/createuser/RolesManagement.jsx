'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '../../../../lib/firebaseConfig';
import {
  createUserWithEmailAndPassword
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
    password: '',
    confirmPassword: '',
    designation: '',
    workFromHome: false,
    role: 'staff',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  // 🔄 Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(userList);
      } catch (error) {
        console.error('Error fetching users:', error);
        setFormError('Failed to fetch users.');
      }
    };

    fetchUsers();
  }, []);

  // 🧹 Reset form
  const resetForm = (user = null) => {
    setFormData({
      fullName: user?.fullName || '',
      email: user?.email || '',
      password: '',
      confirmPassword: '',
      designation: user?.designation || '',
      workFromHome: user?.workFromHome || false,
      role: user?.role || 'staff',
    });
    setFormError('');
    setFormSuccess('');
    setLoading(false);
  };

  // 🧩 Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // ✅ Create or Update user
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setLoading(true);

    const { fullName, email, password, confirmPassword, designation, role, workFromHome } = formData;

    if (!fullName || !email || !designation) {
      setFormError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    if (!editingUserId && (!password || !confirmPassword)) {
      setFormError('Password is required.');
      setLoading(false);
      return;
    }

    if ((password || confirmPassword) && password !== confirmPassword) {
      setFormError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      if (editingUserId) {
        const userRef = doc(db, 'users', editingUserId);
        await updateDoc(userRef, {
          fullName,
          designation,
          role,
          workFromHome,
          updatedAt: new Date(),
        });
        setFormSuccess('User updated successfully!');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        await setDoc(doc(db, 'users', userId), {
          fullName,
          email,
          designation,
          role,
          workFromHome,
          createdAt: new Date(),
        });
        setFormSuccess('User created successfully!');
      }

      resetForm();
      setShowAddUserForm(false);
      setEditingUserId(null);

      // Refresh user list
      const snapshot = await getDocs(collection(db, 'users'));
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      setFormError(err.message || 'Error saving user.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUserId(user.id);
    resetForm(user);
    setShowAddUserForm(true);
  };

const handleDelete = async (userId) => {
  if (!confirm('Are you sure you want to delete this user?')) return;
  try {
    console.log("Deleting user:", userId); // Add this
    await deleteDoc(doc(db, 'users', userId));
    setFormSuccess('User deleted.');
    setUsers(users.filter(u => u.id !== userId));
  } catch (err) {
    console.error('Error deleting user:', err); // Log the error
    setFormError('Error deleting user.');
  }
};

  return (
    <div className="roles-container">
      <h2>User Management</h2>

      {formError && <div className="alert error">{formError}</div>}
      {formSuccess && <div className="alert success">{formSuccess}</div>}

      <button className="btn primary" onClick={() => {
        resetForm();
        setEditingUserId(null);
        setShowAddUserForm(true);
      }}>
        Add User
      </button>

      {showAddUserForm && (
  <form onSubmit={handleSubmit} className="roles-form">
    <input type="text" name="fullName" placeholder="Full Name*" value={formData.fullName} onChange={handleChange} />
    <input type="email" name="email" placeholder="Email*" value={formData.email} onChange={handleChange} disabled={!!editingUserId} />
    <input type="password" name="password" placeholder="Password*" value={formData.password} onChange={handleChange} />
    <input type="password" name="confirmPassword" placeholder="Confirm Password*" value={formData.confirmPassword} onChange={handleChange} />
    <input type="text" name="designation" placeholder="Designation*" value={formData.designation} onChange={handleChange} />
    <label>
      <input type="checkbox" name="workFromHome" checked={formData.workFromHome} onChange={handleChange} />
      Work From Home
    </label>
    <select name="role" value={formData.role} onChange={handleChange}>
      <option value="staff">Staff</option>
      <option value="admin">Admin</option>
    </select>
    <button type="submit" className="btn primary" disabled={loading}>
      {loading ? 'Saving...' : editingUserId ? 'Update' : 'Create'}
    </button>
    <button type="button" className="btn secondary" onClick={() => {
      resetForm();
      setShowAddUserForm(false);
      setEditingUserId(null);
    }}>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
