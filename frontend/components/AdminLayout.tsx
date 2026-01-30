'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { isAdminUser } from '@/lib/authUtils';
import { Users, Gift, LogOut, LayoutDashboard, Receipt, Menu, X, Megaphone, Building2, UserCog, MapPin, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, hasHydrated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const isAdmin = isAdminUser(user);

  useEffect(() => {
    if (hasHydrated && !isAdmin && !redirectAttempted) {
      setRedirectAttempted(true);
      router.push('/login');

      // If redirect doesn't work after 2.5 seconds, show recovery UI
      const timeout = setTimeout(() => {
        setShowRecovery(true);
      }, 2500);

      return () => clearTimeout(timeout);
    }
  }, [isAdmin, router, hasHydrated, redirectAttempted]);

  const handleLogoutAndRetry = () => {
    logout();
    // Clear any cached state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('sarnies_login_mode');
    }
    window.location.href = '/login';
  };

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  // Show recovery UI if auth is invalid and redirect didn't work
  if (!isAdmin && showRecovery) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-error-light rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-error" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Admin Access Required
          </h2>
          <p className="text-sm text-text-tertiary mb-6">
            Your session has expired or you don't have admin access. Please log in with an admin account.
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
            className="mt-3 text-xs text-text-tertiary hover:text-text-primary"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    // Still trying to redirect, show loading
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navigationItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: UserCog, label: 'Staff', path: '/admin/staff' },
    { icon: Building2, label: 'Companies', path: '/admin/companies' },
    { icon: MapPin, label: 'Outlets', path: '/admin/outlets' },
    { icon: Gift, label: 'Vouchers', path: '/admin/vouchers' },
    { icon: Megaphone, label: 'Announcements', path: '/admin/announcements' },
    { icon: Receipt, label: 'Transactions', path: '/admin/transactions' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-neutral-200 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-primary rounded flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            <h1 className="font-ui text-body font-semibold text-neutral-900">Sarnies Admin</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-neutral-50 rounded transition-all duration-150"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* EXACT SPEC: 240px width, 48px logo, 44px rows, 20px padding-left */}
      <aside
        className={`fixed top-0 left-0 h-screen w-60 bg-white border-r border-border-light transition-transform duration-300 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 flex flex-col`}
      >
        {/* Logo Section - 48x48 logo, 20px padding */}
        <div className="pl-5 pt-6 pb-4 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-stone-900 flex items-center justify-center">
              <span className="text-lg font-bold text-white">S</span>
            </div>
            <span className="font-ui text-base font-medium text-text-primary">Sarnies Admin</span>
          </div>
        </div>

        {/* User Block */}
        <div className="pl-5 py-4 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-surface-muted flex items-center justify-center">
              <span className="text-xs font-semibold text-text-primary">{user?.name?.charAt(0) || 'D'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-ui text-sm font-medium text-text-primary truncate" title={user?.name || 'Dev User'}>
                {user?.name || 'Dev User'}
              </p>
              <p className="font-ui text-xs text-text-tertiary">Administrator</p>
            </div>
          </div>
        </div>

        {/* Navigation - EXACT: 44px height, 20px icons, 12px gap, 0 padding-left */}
        <nav className="flex-1 overflow-y-auto pl-5 py-4">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full h-11 flex items-center gap-3 pr-3 rounded-lg font-ui text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-surface-muted text-text-primary'
                      : 'text-text-tertiary hover:bg-surface-muted hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="pl-5 pb-5 border-t border-border-light pt-4">
          <button
            onClick={handleLogout}
            className="w-full h-11 flex items-center gap-3 pr-3 text-text-tertiary hover:bg-error-light hover:text-error rounded-lg font-ui text-sm font-medium transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-60 min-h-screen bg-white">
        {children}
      </main>
    </div>
  );
}
