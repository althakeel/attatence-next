'use client';

import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

import { auth, db } from '../../../../lib/firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import AttendanceHistory from '../../components/attendenceHistory/AttendanceHistory';
import RolesManagement from '../../components/createuser/RolesManagement'

export default function AdminDashboard() {
  const [staffList, setStaffList] = useState([]);
  const [activeTab, setActiveTab] = useState('attendance');
  const [selectedStaff, setSelectedStaff] = useState(null);

  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    role: 'staff',
    designation: '',
    workFromHome: false,
    password: '',
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '--:--';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${day} ${time}`;
  };

  const formatWorkingHours = (seconds) => {
    if (typeof seconds !== 'number' || seconds < 0) return '--:--:--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hrs, mins, secs].map((val) => val.toString().padStart(2, '0')).join(':');
  };

  useEffect(() => {
    if (activeTab !== 'attendance') return;
    setLoadingStaff(true);
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStaffList(staffData);
        setLoadingStaff(false);
      },
      (error) => {
        console.error('Error fetching users:', error);
        setLoadingStaff(false);
      }
    );
    return () => unsubscribe();
  }, [activeTab]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const { fullName, email, password, designation } = newUser;
    if (!fullName || !email || !password || !designation) {
      setFormError('Please fill all required fields.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        fullName,
        email,
        role: newUser.role,
        designation,
        workFromHome: newUser.workFromHome,
        createdAt: new Date(),
      });

      setFormSuccess('User created successfully!');
      setNewUser({
        fullName: '',
        email: '',
        role: 'staff',
        designation: '',
        workFromHome: false,
        password: '',
      });
    } catch (error) {
      setFormError(error.message || 'Failed to create user.');
    }
    setLoading(false);
  };

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <h2>Admin Dashboard</h2>
        <nav>
          <ul>
            <li
              className={activeTab === 'attendance' ? 'active' : ''}
              onClick={() => { setActiveTab('attendance'); setSelectedStaff(null); }}
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
           
            <li>Reports</li>
            <li>Settings</li>
          </ul>
        </nav>
      </aside>

      <main className="admin-content">
        {activeTab === 'attendance' && (
          <>
            <h1>Staff Attendance Overview</h1>
            {loadingStaff ? (
              <p>Loading staff data...</p>
            ) : (
              <>
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Designation</th>
                      <th>Work From Home</th>
                      <th>Sign In</th>
                      <th>Sign Out</th>
                      <th>Status</th>
                      <th>Working Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center' }}>No staff data found.</td>
                      </tr>
                    ) : (
                      staffList.map((staff) => (
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
                          <td>{staff.workFromHome ? 'Yes' : 'No'}</td>
                          <td>{formatTimestamp(staff.signInTime)}</td>
                          <td>{formatTimestamp(staff.signOutTime)}</td>
                          <td className={staff.status === 'online' ? 'status-online' : 'status-offline'}>
                            {staff.status || '--'}
                          </td>
                          <td>{staff.workingHours !== undefined ? formatWorkingHours(staff.workingHours) : '--:--:--'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {selectedStaff && (
                  <div className="attendance-history-section">
                    <h2>{selectedStaff.fullName}'s Attendance History</h2>
                    <AttendanceHistory userId={selectedStaff.id} />
                    <button onClick={() => setSelectedStaff(null)}>Close</button>
                  </div>
                )}
              </>
            )}
          </>
        )}
 {activeTab === 'rolesManagement' && (
          <RolesManagement />
        )}
        
        {/* {activeTab === 'attendanceHistory' && <AttendanceHistory />} */}
      </main>
    </div>
  );
}
