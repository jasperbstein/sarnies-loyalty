'use client';

import React from 'react';
import { Ticket, CheckCircle, FileEdit, Repeat } from 'lucide-react';

interface VoucherStats {
  total: number;
  active: number;
  draft: number;
  totalRedemptions: number;
}

interface VoucherStatsBarProps {
  stats: VoucherStats;
}

export default function VoucherStatsBar({ stats }: VoucherStatsBarProps) {
  const statItems = [
    {
      label: 'Total Vouchers',
      value: stats.total,
      icon: Ticket,
      colorClass: 'stats-card-blue',
      iconClass: 'icon-badge icon-badge-blue',
    },
    {
      label: 'Active',
      value: stats.active,
      icon: CheckCircle,
      colorClass: 'stats-card-green',
      iconClass: 'icon-badge icon-badge-green',
    },
    {
      label: 'Draft',
      value: stats.draft,
      icon: FileEdit,
      colorClass: 'stats-card-amber',
      iconClass: 'icon-badge icon-badge-amber',
    },
    {
      label: 'Redemptions',
      value: stats.totalRedemptions.toLocaleString(),
      icon: Repeat,
      colorClass: 'stats-card-purple',
      iconClass: 'icon-badge icon-badge-purple',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
      {statItems.map((item) => (
        <div
          key={item.label}
          className={`stat-card ${
            item.label === 'Total Vouchers' ? 'stat-card--blue' :
            item.label === 'Active' ? 'stat-card--green' :
            item.label === 'Draft' ? 'stat-card--orange' :
            'stat-card--purple'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">
                {item.label}
              </p>
              <p className="stat-value">
                {item.value}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              item.label === 'Total Vouchers' ? 'bg-[rgba(0,122,255,0.1)]' :
              item.label === 'Active' ? 'bg-[rgba(52,199,89,0.1)]' :
              item.label === 'Draft' ? 'bg-[rgba(255,159,10,0.1)]' :
              'bg-[rgba(175,82,222,0.1)]'
            }`}>
              <item.icon className={`w-5 h-5 ${
                item.label === 'Total Vouchers' ? 'text-[#007AFF]' :
                item.label === 'Active' ? 'text-[#34C759]' :
                item.label === 'Draft' ? 'text-[#FF9F0A]' :
                'text-[#AF52DE]'
              }`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
