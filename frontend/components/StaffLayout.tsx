'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { QrCode, Users, BarChart3, LogOut, Settings, Zap, List, HelpCircle, Home } from 'lucide-react';
import { useEffect } from 'react';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (!user || user.type !== 'staff') {
      router.push('/login');
    }
  }, [user, router]);

  if (!user || user.type !== 'staff') return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/staff' },
    { icon: QrCode, label: 'Scan', path: '/staff/scan' },
    { icon: Zap, label: 'Simulator', path: '/staff/simulator' },
    { icon: List, label: 'Transactions', path: '/staff/transactions' },
    { icon: HelpCircle, label: 'Help', path: '/staff/help' },
    ...(user.role === 'admin'
      ? [
          { icon: Users, label: 'Users', path: '/admin/users' },
          { icon: BarChart3, label: 'Vouchers', path: '/admin/vouchers' },
          { icon: Settings, label: 'Settings', path: '/admin/settings' },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary-600">
              Sarnies Loyalty - Staff
            </h1>
            <p className="text-sm text-gray-600">
              {user.name} ({user.role})
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Navigation */}
      {navItems.length > 1 && (
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;

                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                      isActive
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
