'use client';

/**
 * AppLayout - Main App Shell
 * Sarnies Design System v1.2
 */

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Home, Ticket, User, LogOut, History } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
  hideLogout?: boolean;
}

export default function AppLayout({ children, hideLogout = false }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Check if user is valid - they should have either a valid type or user_type
  const isValidUser = (u: typeof user): boolean => {
    if (!u) return false;
    // Valid if type is customer or staff
    if (u.type === 'customer' || u.type === 'staff') return true;
    // Valid if user_type is customer, employee, or staff
    if (u.user_type === 'customer' || u.user_type === 'employee' || u.user_type === 'staff') return true;
    return false;
  };

  useEffect(() => {
    if (isHydrated && !isValidUser(user)) {
      router.push('/login');
    }
  }, [user, router, isHydrated]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isValidUser(user)) {
    return null;
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout();
      router.push('/login');
    }
  };

  const navItems = [
    { icon: Home, label: 'HOME', path: '/app/home' },
    { icon: Ticket, label: 'VOUCHERS', path: '/app/vouchers' },
    { icon: History, label: 'HISTORY', path: '/app/activity' },
    { icon: User, label: 'PROFILE', path: '/app/profile' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-header bg-black z-fixed">
        <div className="h-full max-w-container mx-auto px-6 flex items-center justify-between">
          <span className="text-label text-white">SARNIES</span>

          {!hideLogout && (
            <button
              onClick={handleLogout}
              className="p-2.5 -mr-2.5 text-white/60 hover:text-white transition-opacity"
              aria-label="Log out"
              type="button"
            >
              <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-header pb-[calc(var(--nav-height)+env(safe-area-inset-bottom,0px)+16px)] min-h-screen">
        <div className="max-w-container mx-auto px-5 py-6">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-fixed pb-safe">
        <div className="max-w-container mx-auto px-4">
          <div className="flex justify-around items-start h-[60px] pt-2.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || pathname.startsWith(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className="flex flex-col items-center justify-start min-w-[64px] py-1 transition-all active:scale-95"
                >
                  <div className="relative mb-1">
                    <Icon
                      className={`w-[22px] h-[22px] transition-colors ${
                        isActive ? 'text-black stroke-[2]' : 'text-gray-400 stroke-[1.5]'
                      }`}
                    />
                    {isActive && (
                      <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                        user?.user_type === 'employee' ? 'bg-mustard' : 'bg-accent'
                      }`} />
                    )}
                  </div>

                  <span className={`text-nav ${isActive ? 'text-black' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
