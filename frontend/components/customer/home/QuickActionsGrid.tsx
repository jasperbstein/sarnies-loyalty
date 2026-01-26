/**
 * QuickActionsGrid - Quick Action Buttons
 * Sarnies Design System v1.2
 */

import React from "react";
import { Gift, History, ChevronRight } from "lucide-react";

interface QuickActionsGridProps {
  onRewards: () => void;
  onActivity: () => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  onRewards,
  onActivity,
}) => {
  const ActionButton: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    onClick: () => void;
  }> = ({ icon, title, subtitle, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full card flex items-center gap-3 p-4 hover:border-gray-300 transition-colors active:scale-[0.98] group"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-base font-medium text-black tracking-tight">{title}</p>
        <p className="text-caption text-gray-500">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-label text-black">QUICK ACTIONS</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ActionButton
          icon={<Gift className="w-5 h-5 text-black" />}
          title="Rewards"
          subtitle="Browse & redeem"
          onClick={onRewards}
        />
        <ActionButton
          icon={<History className="w-5 h-5 text-black" />}
          title="History"
          subtitle="View activity"
          onClick={onActivity}
        />
      </div>
    </div>
  );
};
