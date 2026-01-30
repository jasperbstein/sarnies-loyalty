/**
 * QuickActionsGrid - Quick Action Buttons
 * Sarnies Design System v2.0
 *
 * Two-column quick actions: Scan and Rewards
 */

import React from "react";
import { Scan, Gift } from "lucide-react";

interface QuickActionsGridProps {
  onRewards: () => void;
  onActivity: () => void;
  onScan?: () => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  onRewards,
  onActivity,
  onScan,
}) => {
  return (
    <div className="space-y-2">
      <p className="text-label">
        QUICK ACTIONS
      </p>
      <div className="flex gap-3">
        <QuickActionButton
          icon={<Scan className="w-6 h-6 text-white" />}
          label="Scan"
          variant="dark"
          onClick={onScan || onActivity}
        />
        <QuickActionButton
          icon={<Gift className="w-6 h-6 text-stone-900" />}
          label="Rewards"
          variant="light"
          onClick={onRewards}
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
  variant: 'dark' | 'light';
  onClick?: () => void;
}) {
  const bgStyles = {
    dark: 'bg-gradient-to-b from-stone-800 to-stone-950 shadow-lg shadow-black/20',
    light: 'bg-white border border-stone-200 shadow-sm'
  };

  return (
    <button onClick={onClick} className="flex-1 flex flex-col items-center gap-2">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bgStyles[variant]}`}>
        {icon}
      </div>
      <span className="text-xs font-bold text-text-primary">
        {label}
      </span>
    </button>
  );
}
