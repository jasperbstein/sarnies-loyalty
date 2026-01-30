'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Ticket, History as HistoryIcon, User } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useAuthStore } from '@/lib/store';

interface BottomNavProps {
  currentTab?: 'home' | 'rewards' | 'activity' | 'profile';
}

function BottomNav({ currentTab }: BottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isEmployee = user?.user_type === 'employee';

  const tabs = useMemo(() => [
    {
      id: 'home',
      label: 'HOME',
      icon: Home,
      href: '/app/home',
      isActive: pathname === '/app/home' || pathname === '/app/dashboard' || currentTab === 'home'
    },
    {
      id: 'rewards',
      label: 'VOUCHERS',
      icon: Ticket,
      href: '/app/vouchers',
      isActive: pathname === '/app/rewards' || pathname.startsWith('/app/vouchers') || currentTab === 'rewards'
    },
    {
      id: 'activity',
      label: 'HISTORY',
      icon: HistoryIcon,
      href: '/app/activity',
      isActive: pathname === '/app/activity' || currentTab === 'activity'
    },
    {
      id: 'profile',
      label: 'PROFILE',
      icon: User,
      href: '/app/profile',
      isActive: pathname === '/app/profile' || currentTab === 'profile'
    }
  ], [pathname, currentTab]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F0F0F0] z-50 pb-safe">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex justify-around items-center h-[68px]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.isActive;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                prefetch={true}
                className="relative flex flex-col items-center justify-center py-2 px-4 min-w-[72px] transition-colors"
              >
                <Icon
                  className={`w-6 h-6 mb-1 transition-colors ${
                    isActive
                      ? isEmployee ? 'text-[#D97706]' : 'text-[#1C1917]'
                      : 'text-[#78716C]'
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                <span className={`text-[10px] font-medium uppercase tracking-[0.5px] transition-colors ${
                  isActive
                    ? isEmployee ? 'text-[#D97706]' : 'text-[#1C1917]'
                    : 'text-[#78716C]'
                }`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default memo(BottomNav);
