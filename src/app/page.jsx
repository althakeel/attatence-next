'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      // Slight delay to ensure localStorage sync on new tab
      await new Promise((r) => setTimeout(r, 100));

      const sessionId = localStorage.getItem('sessionId');
      const userId = localStorage.getItem('userId');

      if (!sessionId || !userId) {
        router.replace('/login');
        return;
      }

      try {
        const response = await fetch('/api/validate-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, userId }),
        });

        const { valid, role } = await response.json();

        if (!valid) {
          localStorage.clear();
          localStorage.setItem('logout-event', Date.now().toString());
          router.replace('/login');
        } else {
          router.replace(role === 'admin' ? '/admin/dashboard' : '/staff/dashboard');
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        localStorage.clear();
        localStorage.setItem('logout-event', Date.now().toString());
        router.replace('/login');
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, [router]);

  if (checking) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '1.2rem',
        color: '#333',
      }}>
        Checking session, please wait...
      </div>
    );
  }

  return null;
}
