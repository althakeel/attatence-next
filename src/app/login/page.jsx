'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '../components/login/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <LoginForm />
    </div>
  );
}
