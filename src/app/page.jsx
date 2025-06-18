'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100)); // slight delay for localStorage sync

      const sessionId = localStorage.getItem('sessionId');
      const userId = localStorage.getItem('userId');

      if (!sessionId || !userId) {
        redirectToLogin();
        return;
      }

      try {
        const res = await fetch('/api/validate-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, userId }),
        });

        if (!res.ok) throw new Error('Invalid response');

        const { valid, role } = await res.json();

        if (!valid || !role) {
          redirectToLogin();
        } else {
          router.replace(role === 'admin' ? '/admin/dashboard' : '/staff/dashboard');
        }
      } catch (err) {
        console.error('Session check failed:', err);
        redirectToLogin();
      } finally {
        setCheckingSession(false);
      }
    };

    const redirectToLogin = () => {
      localStorage.clear();
      localStorage.setItem('logout-event', Date.now().toString());
      router.replace('/login');
    };

    validateSession();
  }, [router]);

  if (checkingSession) {
    return (
      <div style={styles.loader}>
        Checking session, please wait...
      </div>
    );
  }

  return null;
}

const styles = {
  loader: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '1.2rem',
    color: '#333',
  },
};
