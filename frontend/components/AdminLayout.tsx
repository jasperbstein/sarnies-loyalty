'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { isAdminUser } from '@/lib/authUtils';
import {
  Users, Gift, LogOut, LayoutDashboard, Receipt, Menu, X,
  Megaphone, Building2, UserCog, MapPin, AlertCircle, Sparkles
} from 'lucide-react';
import { useEffect, useState } from 'react';
import '@/app/admin/admin.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, hasHydrated, setHasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const isAdmin = isAdminUser(user);

  // Track client-side mount and force hydration
  useEffect(() => {
    setMounted(true);
    if (!useAuthStore.getState().hasHydrated) {
      setHasHydrated(true);
    }
  }, [setHasHydrated]);

  useEffect(() => {
    if (mounted && hasHydrated && !isAdmin && !redirectAttempted) {
      setRedirectAttempted(true);
      router.push('/login');

      // If redirect doesn't work after 2.5 seconds, show recovery UI
      const timeout = setTimeout(() => {
        setShowRecovery(true);
      }, 2500);

      return () => clearTimeout(timeout);
    }
  }, [isAdmin, router, mounted, hasHydrated, redirectAttempted]);

  const handleLogoutAndRetry = () => {
    logout();
    // Clear any cached state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('sarnies_login_mode');
    }
    window.location.href = '/login';
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F5F5F7] to-[#ECECEE]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#007AFF] to-[#0066D6] flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="w-6 h-6 border-[2.5px] border-[rgba(0,0,0,0.08)] border-t-[#007AFF] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Show recovery UI if auth is invalid and redirect didn't work
  if (!isAdmin && showRecovery) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F5F5F7] to-[#ECECEE] flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-[rgba(255,69,58,0.12)] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-7 h-7 text-[#FF453A]" />
          </div>
          <h2 className="text-xl font-semibold text-[#1d1d1f] mb-2">
            Admin Access Required
          </h2>
          <p className="text-[15px] text-[#86868b] mb-7 leading-relaxed">
            Your session has expired or you don't have admin access. Please log in with an admin account.
          </p>
          <button
            onClick={handleLogoutAndRetry}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-b from-[#2997FF] to-[#007AFF] text-white rounded-xl font-medium text-[15px] hover:from-[#3CA5FF] hover:to-[#0066D6] transition-all shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            Log Out and Try Again
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="mt-4 text-[13px] text-[#86868b] hover:text-[#007AFF] transition-colors font-medium"
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F5F5F7] to-[#ECECEE]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#007AFF] to-[#0066D6] flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="w-6 h-6 border-[2.5px] border-[rgba(0,0,0,0.08)] border-t-[#007AFF] rounded-full animate-spin"></div>
        </div>
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
    <div className="min-h-screen admin-page">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-[rgba(246,246,246,0.72)] backdrop-blur-[20px] backdrop-saturate-[180%] border-b border-[rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#007AFF] to-[#0066D6] flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[#1d1d1f] text-[15px]">Sarnies Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-9 h-9 flex items-center justify-center hover:bg-[rgba(0,0,0,0.04)] rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={20} className="text-[#1d1d1f]" /> : <Menu size={20} className="text-[#1d1d1f]" />}
          </button>
        </div>
      </header>

      {/* Sidebar - Solid, Clean */}
      <aside
        className={`fixed top-0 left-0 h-screen w-[260px] transition-transform duration-200 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 flex flex-col bg-white border-r border-[#E5E5EA]`}
      >
        {/* Logo */}
        <div className="h-[64px] px-5 flex items-center border-b border-[#E5E5EA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D1D1F] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-[#1D1D1F] text-[16px]">Sarnies</span>
              <span className="text-[11px] text-[#86868B] ml-1.5 font-medium uppercase tracking-wider">Admin</span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-4 border-b border-[#E5E5EA]">
          <div className="flex items-center gap-3 px-3 py-3 bg-[#F5F5F7] rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-[#1D1D1F] flex items-center justify-center">
              <span className="text-[14px] font-semibold text-white">{user?.name?.charAt(0) || 'A'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#1D1D1F] truncate">{user?.name || 'Admin User'}</p>
              <p className="text-[12px] text-[#86868B] font-medium">Administrator</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
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
                  className={`w-full flex items-center gap-3 h-[44px] px-3 rounded-xl text-[14px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#1D1D1F] text-white'
                      : 'text-[#636366] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                  }`}
                >
                  <Icon className="w-[20px] h-[20px]" strokeWidth={isActive ? 2 : 1.75} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-[#E5E5EA]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 h-[44px] px-3 text-[#86868B] hover:bg-[#FFF2F2] hover:text-[#FF3B30] rounded-xl text-[14px] font-medium transition-all duration-150"
          >
            <LogOut className="w-[20px] h-[20px]" strokeWidth={1.75} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden animate-macos-fade"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-[260px] min-h-screen">
        {children}
      </main>
    </div>
  );
}
