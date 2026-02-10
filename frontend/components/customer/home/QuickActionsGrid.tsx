/**
 * QuickActionsGrid - Quick Action Buttons
 * Sarnies Design System v2.0
 *
 * Quick actions: Scan, Rewards, and Partner Offers
 */

import React from "react";
import { Scan, Gift, Users2 } from "lucide-react";

interface QuickActionsGridProps {
  onRewards: () => void;
  onActivity: () => void;
  onScan?: () => void;
  onCollabs?: () => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  onRewards,
  onActivity,
  onScan,
  onCollabs,
}) => {
  return (
    <div className="space-y-1.5">
      <p className="text-label">
        QUICK ACTIONS
      </p>
      <div className="flex gap-2">
        <QuickActionButton
          icon={<Scan className="w-5 h-5 text-white" />}
          label="Scan"
          variant="dark"
          onClick={onScan || onActivity}
        />
        <QuickActionButton
          icon={<Gift className="w-5 h-5 text-stone-900" />}
          label="Rewards"
          variant="light"
          onClick={onRewards}
        />
        <QuickActionButton
          icon={<Users2 className="w-5 h-5 text-purple-600" />}
          label="Partners"
          variant="purple"
          onClick={onCollabs}
        />
      </div>
    </div>
  );
};

function QuickActionButton({
  icon,
  label,
  variant,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  variant: 'dark' | 'light' | 'purple';
  onClick?: () => void;
}) {
  const bgStyles = {
    dark: 'bg-gradient-to-b from-stone-800 to-stone-950 shadow-lg shadow-black/30',
    light: 'bg-white border border-stone-300 shadow-sm',
    purple: 'bg-gradient-to-b from-purple-50 to-purple-100 border border-purple-200 shadow-sm'
  };

  return (
    <button onClick={onClick} className="group flex-1 flex flex-col items-center gap-1.5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-0.5 group-active:scale-95 ${bgStyles[variant]}`}>
        {icon}
      </div>
      <span className="text-[11px] font-bold text-text-primary">
        {label}
      </span>
    </button>
  );
}
