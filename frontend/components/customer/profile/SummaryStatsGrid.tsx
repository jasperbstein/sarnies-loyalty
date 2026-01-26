import React from "react";
import { SectionCard } from "../ui/SectionCard";

interface SummaryStatsGridProps {
  points: number;
  totalSpentDisplay: string;
  memberSinceDisplay: string;
}

export const SummaryStatsGrid: React.FC<SummaryStatsGridProps> = ({
  points,
  totalSpentDisplay,
  memberSinceDisplay,
}) => {
  const Item: React.FC<{ label: string; value: string | number }> = ({
    label,
    value,
  }) => (
    <div className="flex flex-col">
      <span className="text-[12px] text-[#6F6F6F] uppercase mb-1">
        {label}
      </span>
      <span className="text-[16px] font-semibold text-[#1B1B1B]">
        {value}
      </span>
    </div>
  );

  return (
    <SectionCard>
      <div className="grid grid-cols-3 gap-4">
        <Item label="Points" value={points} />
        <Item label="Total spent" value={totalSpentDisplay} />
        <Item label="Member since" value={memberSinceDisplay} />
      </div>
    </SectionCard>
  );
};
