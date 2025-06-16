'use client';

import { useRouter } from 'next/navigation';
import './TopBar.css';

export default function TopBar() {
  const router = useRouter();

  const handleSignOut = () => {
    // Example: Clear any local storage or session data if used
    localStorage.clear();
    router.push('/login');
  };

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <img src="https://res.cloudinary.com/dm8z5zz5s/image/upload/v1748871708/Logo_1080_x_1080_White_en7zpv.png" alt="Company Logo" className="logo" />
        {/* <h1 className="company-name">Al Thakeel</h1> */}
      </div>
      <button onClick={handleSignOut} className="sign-out-btn">
        Sign Out
      </button>
    </header>
  );
}
