'use client';

/**
 * AppLayout - Main App Shell
 * Sarnies Design System v2.0
 *
 * Minimal layout with just content area and bottom navigation.
 * Matches the .pen design file specifications.
 */

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { isValidAppUser, isEmployeeUser } from '@/lib/authUtils';
import { Home, Ticket, User, History, Newspaper, LogOut, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AppLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, hasHydrated, setHasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  // Track client-side mount and force hydration
  useEffect(() => {
    setMounted(true);

    // Force hydration after mount if not already done
    if (!useAuthStore.getState().hasHydrated) {
      setHasHydrated(true);
    }
  }, [setHasHydrated]);

  useEffect(() => {
    if (mounted && hasHydrated && !isValidAppUser(user) && !redirectAttempted) {
      setRedirectAttempted(true);
      router.push('/login');

      // If redirect doesn't work after 2.5 seconds, show recovery UI
      const timeout = setTimeout(() => {
        setShowRecovery(true);
      }, 2500);

      return () => clearTimeout(timeout);
    }
  }, [user, router, mounted, hasHydrated, redirectAttempted]);

  const handleLogoutAndRetry = () => {
    logout();
    // Clear any cached state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('sarnies_login_mode');
    }
    window.location.href = '/login';
  };

  // Show loading only briefly - don't block on hydration
  if (!mounted) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show recovery UI if auth is invalid and redirect didn't work
  if (!isValidAppUser(user) && showRecovery) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-error-light rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-error" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Session Invalid
          </h2>
          <p className="text-sm text-text-tertiary mb-6">
            Your session has expired or is invalid. Please log in again.
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
            className="mt-3 text-sm text-text-tertiary hover:text-text-primary"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  if (!isValidAppUser(user) && !showRecovery) {
    // Still trying to redirect, show loading but with timeout protection
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isEmployee = isEmployeeUser(user);

  const navItems = isEmployee
    ? [
        { id: 'home', icon: Home, label: 'HOME', path: '/app/home' },
        { id: 'vouchers', icon: Ticket, label: 'VOUCHERS', path: '/app/vouchers' },
        { id: 'news', icon: Newspaper, label: 'NEWS', path: '/app/news' },
        { id: 'profile', icon: User, label: 'PROFILE', path: '/app/profile' },
      ]
    : [
        { id: 'home', icon: Home, label: 'HOME', path: '/app/home' },
        { id: 'vouchers', icon: Ticket, label: 'VOUCHERS', path: '/app/vouchers' },
        { id: 'history', icon: History, label: 'HISTORY', path: '/app/activity' },
        { id: 'profile', icon: User, label: 'PROFILE', path: '/app/profile' },
      ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Main Content */}
      <main className="pb-[calc(64px+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>

      {/* Bottom Navigation - Clean, no shadows */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 h-[64px] bg-white border-t border-stone-200 z-50 pb-safe">
          <div className="max-w-screen-xl mx-auto h-full">
            <div className="flex justify-around items-center h-full">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path ||
                  (item.path === '/app/vouchers' && pathname.startsWith('/app/vouchers')) ||
                  (item.path === '/app/home' && pathname === '/app/dashboard');

                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    prefetch={true}
                    className="flex flex-col items-center justify-center py-2 px-4 min-w-[64px]"
                  >
                    <Icon
                      className={`w-5 h-5 mb-1 ${
                        isActive ? 'text-accent' : 'text-stone-400'
                      }`}
                      strokeWidth={isActive ? 2 : 1.5}
                    />
                    <span className={`text-xs font-medium uppercase tracking-wide ${
                      isActive ? 'text-accent' : 'text-stone-400'
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
