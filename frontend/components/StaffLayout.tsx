'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { isStaffUser } from '@/lib/authUtils';
import { Scan, LifeBuoy, Settings, LogOut, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface StaffLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function StaffLayout({ children, hideNav = false }: StaffLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, hasHydrated, setHasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  // Track client-side mount and force hydration
  useEffect(() => {
    setMounted(true);
    if (!useAuthStore.getState().hasHydrated) {
      setHasHydrated(true);
    }
  }, [setHasHydrated]);

  // Staff can be: staff, employee (employees are also staff members)
  const isStaff = isStaffUser(user);

  // Handle auth redirect with timeout protection
  useEffect(() => {
    if (mounted && hasHydrated && !isStaff && !redirectAttempted) {
      setRedirectAttempted(true);
      router.push('/login');

      // If redirect doesn't work after 2.5 seconds, show recovery UI
      const timeout = setTimeout(() => {
        setShowRecovery(true);
      }, 2500);

      return () => clearTimeout(timeout);
    }
  }, [isStaff, router, mounted, hasHydrated, redirectAttempted]);

  const handleLogoutAndRetry = () => {
    logout();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('sarnies_login_mode');
    }
    window.location.href = '/login';
  };

  // Show loading only briefly
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show recovery UI if auth is invalid and redirect didn't work
  if (!isStaff && showRecovery) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">
            Session Invalid
          </h2>
          <p className="text-sm text-stone-500 mb-6">
            Your session has expired or is invalid. Please log in again as a staff member.
          </p>
          <button
            onClick={handleLogoutAndRetry}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-stone-900 text-white rounded-xl font-semibold text-sm hover:bg-stone-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Log Out and Try Again
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="mt-3 text-sm text-stone-500 hover:text-stone-700"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  // Still trying to redirect, show loading
  if (!isStaff && !showRecovery) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const navItems = [
    { id: 'home', icon: Scan, label: 'SCAN', desktopLabel: 'Scan', path: '/staff' },
    { id: 'help', icon: LifeBuoy, label: 'HELP', desktopLabel: 'Help', path: '/staff/help' },
    { id: 'settings', icon: Settings, label: 'MORE', desktopLabel: 'Settings', path: '/staff/settings' },
  ];

  const mobileNavItems = navItems;
  const desktopNavItems = navItems;

  return (
    <div className="min-h-screen bg-[#f5f5f4] lg:bg-[#f5f5f4]">
      {/* Desktop Sidebar - hidden on mobile/tablet */}
      {!hideNav && (
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] bg-stone-900 flex-col z-50">
          {/* Logo */}
          <div className="px-6 pt-8 pb-8">
            <span className="text-lg font-bold text-white tracking-wider">
              SARNIES
            </span>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-3">
            <div className="space-y-1">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path ||
                  (item.path === '/staff' && (pathname === '/staff' || pathname === '/staff/scan'));

                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    prefetch={true}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-stone-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                    <span className="text-sm font-medium">
                      {item.desktopLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Spacer */}
          <div className="flex-1" />
        </aside>
      )}

      {/* Main Content */}
      <main className={`
        pb-[calc(68px+env(safe-area-inset-bottom,0px))] lg:pb-0
        ${!hideNav ? 'lg:ml-[240px]' : ''}
      `}>
        {children}
      </main>

      {/* Bottom Navigation - visible on mobile/tablet only */}
      {!hideNav && (
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white z-50 pb-safe"
          style={{
            boxShadow: '0 -1px 0 rgba(0,0,0,0.04), 0 -4px 12px rgba(0,0,0,0.02)'
          }}
        >
          <div className="max-w-screen-xl mx-auto h-full">
            <div className="flex justify-around items-center h-full">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path ||
                  (item.path === '/staff' && (pathname === '/staff' || pathname === '/staff/scan'));

                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    prefetch={true}
                    className="flex flex-col items-center justify-center py-2 px-5 min-w-[80px] transition-all"
                  >
                    <div
                      className={`p-2 rounded-xl mb-1 transition-all ${
                        isActive ? 'bg-stone-900' : 'bg-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 transition-colors ${
                          isActive ? 'text-white' : 'text-stone-400'
                        }`}
                        strokeWidth={2}
                      />
                    </div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                      isActive ? 'text-stone-900' : 'text-stone-400'
                    }`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
