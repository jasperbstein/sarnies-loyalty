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
      href: '/app/rewards',
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
  ], [pathname, currentTab, isEmployee]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 z-50 pb-safe">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                prefetch={true}
                className={`relative flex flex-col items-center justify-center py-2 px-6 rounded-xl transition-all ${
                  tab.isActive
                    ? 'text-black'
                    : 'text-black/40 hover:text-black/60'
                }`}
              >
                <Icon
                  className={`w-6 h-6 mb-1.5 ${tab.isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`}
                />
                <span className={`text-nav ${tab.isActive ? 'text-black' : 'text-black/40'}`}>
                  {tab.label}
                </span>
                {/* Active indicator dot - mustard for employees */}
                {tab.isActive && (
                  <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                    isEmployee ? 'bg-mustard' : 'bg-black'
                  }`} />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default memo(BottomNav);
