'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, QrCode, List, HelpCircle } from 'lucide-react';

export default function StaffBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Home', path: '/staff' },
    { icon: QrCode, label: 'Scan', path: '/staff/scan' },
    { icon: List, label: 'Transactions', path: '/staff/transactions' },
    { icon: HelpCircle, label: 'Help', path: '/staff/help' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50 lg:hidden">
      <div className="grid grid-cols-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center py-3 transition-colors ${
                isActive
                  ? 'text-sarnies-black'
                  : 'text-sarnies-midgray'
              }`}
            >
              <Icon size={24} className={isActive ? 'stroke-[2.5]' : 'stroke-2'} />
              <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
