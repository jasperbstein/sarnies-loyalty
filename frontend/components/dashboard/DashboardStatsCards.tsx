import React from "react";

interface StatCard {
  id: string;
  label: string;
  value: string | number;
}

interface DashboardStatsCardsProps {
  stats: StatCard[];
}

export const DashboardStatsCards: React.FC<DashboardStatsCardsProps> = ({
  stats,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {stats.map((s) => (
        <div
          key={s.id}
          className="rounded-xl border border-neutral-200 bg-white shadow-sm px-6 py-5"
        >
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            {s.label}
          </div>
          <div className="mt-2 text-[28px] font-semibold text-neutral-900">
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
};
