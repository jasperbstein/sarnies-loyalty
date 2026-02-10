import React from "react";
import { RewardCard } from "./RewardCard";

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  imageUrl: string;
  featured?: boolean;
}

interface RewardCategorySectionProps {
  title: string;
  rewards: RewardItem[];
}

export const RewardCategorySection: React.FC<RewardCategorySectionProps> = ({
  title,
  rewards,
}) => {
  if (!rewards.length) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[18px] font-semibold text-[#1B1B1B]">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rewards.map((reward) => (
          <RewardCard
            key={reward.id}
            {...reward}
            onRedeem={() => { /* TODO: Implement redeem */ }}
          />
        ))}
      </div>
    </section>
  );
};
