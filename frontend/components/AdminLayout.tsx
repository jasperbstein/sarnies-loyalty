'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Users, Gift, LogOut, LayoutDashboard, Receipt, Menu, X, Megaphone } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // TEMP: Login disabled for development
  // useEffect(() => {
  //   if (!user || user.role !== 'admin') {
  //     router.push('/login');
  //   }
  // }, [user, router]);

  // if (!user || user.role !== 'admin') return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navigationItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users, label: 'Users', path: '/admin/users' },
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
        className={`fixed top-0 left-0 h-screen w-60 bg-white border-r border-[#E5E7EB] transition-transform duration-300 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 flex flex-col`}
      >
        {/* Logo Section - 48x48 logo, 20px padding */}
        <div className="pl-5 pt-6 pb-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-brand-primary flex items-center justify-center">
              <span className="text-lg font-bold text-white">S</span>
            </div>
            <span className="font-ui text-base font-medium text-[#1B1B1B]">Sarnies Admin</span>
          </div>
        </div>

        {/* User Block */}
        <div className="pl-5 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-[#F5F5F5] flex items-center justify-center">
              <span className="text-xs font-semibold text-[#1B1B1B]">{user?.name?.charAt(0) || 'D'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-ui text-sm font-medium text-[#1B1B1B] truncate" title={user?.name || 'Dev User'}>
                {user?.name || 'Dev User'}
              </p>
              <p className="font-ui text-xs text-[#6F6F6F]">Administrator</p>
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
                      ? 'bg-[#F5F5F5] text-[#1B1B1B]'
                      : 'text-[#6F6F6F] hover:bg-[#F5F5F5] hover:text-[#1B1B1B]'
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
        <div className="pl-5 pb-5 border-t border-[#E5E7EB] pt-4">
          <button
            onClick={handleLogout}
            className="w-full h-11 flex items-center gap-3 pr-3 text-[#6F6F6F] hover:bg-red-50 hover:text-red-600 rounded-lg font-ui text-sm font-medium transition-colors"
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
