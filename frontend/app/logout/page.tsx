'use client';

import { useEffect } from 'react';

export default function LogoutPage() {
  useEffect(() => {
    // Clear everything
    localStorage.clear();
    sessionStorage.clear();

    // Clear all cookies
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });

    // Redirect to login
    window.location.href = '/login';
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[14px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          Logging out...
        </p>
      </div>
    </div>
  );
}
