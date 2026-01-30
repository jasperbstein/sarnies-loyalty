'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { isStaffUser } from '@/lib/authUtils';
import { Home, Scan, LifeBuoy, Settings, History, LogOut, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface StaffLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function StaffLayout({ children, hideNav = false }: StaffLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Simple mount tracking - no complex hydration logic
  useEffect(() => {
    setMounted(true);
  }, []);

  // Staff can be: staff, employee (employees are also staff members)
  const isStaff = isStaffUser(user);

  const handleLogoutAndRetry = () => {
    logout();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('sarnies_login_mode');
    }
    window.location.href = '/login';
  };

  // Simple loading state - only on very first render
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not staff after mount, show recovery UI immediately (no waiting)
  if (!isStaff) {
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

  const navItems = [
    { id: 'home', icon: Home, label: 'HOME', desktopLabel: 'Home', path: '/staff' },
    { id: 'scan', icon: Scan, label: 'SCAN', desktopLabel: 'Scan', path: '/staff/scan' },
    { id: 'transactions', icon: History, label: 'HISTORY', desktopLabel: 'Transactions', path: '/staff/transactions', desktopOnly: true },
    { id: 'help', icon: LifeBuoy, label: 'HELP', desktopLabel: 'Help', path: '/staff/help' },
    { id: 'settings', icon: Settings, label: 'SETTINGS', desktopLabel: 'Settings', path: '/staff/settings', mobileOnly: true },
  ];

  const mobileNavItems = navItems.filter(item => !item.desktopOnly);
  const desktopNavItems = navItems.filter(item => !item.mobileOnly);

  return (
    <div className="min-h-screen bg-white lg:bg-stone-50">
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
                  (item.path === '/staff' && pathname === '/staff') ||
                  (item.path === '/staff/scan' && pathname.startsWith('/staff/scan'));

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

          {/* Settings at bottom */}
          <div className="px-3 pb-6">
            <Link
              href="/staff/settings"
              prefetch={true}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                pathname === '/staff/settings'
                  ? 'bg-white/10 text-white'
                  : 'text-stone-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" strokeWidth={pathname === '/staff/settings' ? 2 : 1.5} />
              <span className="text-sm font-medium">
                Settings
              </span>
            </Link>
          </div>
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
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[68px] bg-white border-t border-stone-200 z-50 pb-safe">
          <div className="max-w-screen-xl mx-auto h-full">
            <div className="flex justify-around items-center h-full">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path ||
                  (item.path === '/staff' && pathname === '/staff') ||
                  (item.path === '/staff/scan' && pathname.startsWith('/staff/scan'));

                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    prefetch={true}
                    className="flex flex-col items-center justify-center py-2 px-4 min-w-[72px] transition-colors"
                  >
                    <Icon
                      className={`w-6 h-6 mb-1 transition-colors ${
                        isActive ? 'text-amber-600' : 'text-stone-400'
                      }`}
                      strokeWidth={isActive ? 2.5 : 1.5}
                    />
                    <span className={`text-xs font-medium uppercase tracking-wide transition-colors ${
                      isActive ? 'text-amber-600' : 'text-stone-400'
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
