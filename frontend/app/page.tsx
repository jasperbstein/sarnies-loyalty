'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      // Staff go to staff portal, everyone else goes to app portal
      if (user.type === 'staff') {
        router.push('/staff/scan');
      } else {
        // All frontend users (customer, employee, investor, media, etc.)
        router.push('/app/home');
      }
    } else {
      router.push('/login');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
}
