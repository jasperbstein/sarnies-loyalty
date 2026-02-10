import React from "react";
import { Button } from "../../ui/Button";

interface RewardCardProps {
  title: string;
  description: string;
  pointsRequired: number;
  imageUrl: string;
  featured?: boolean;
  onRedeem: () => void;
}

export const RewardCard: React.FC<RewardCardProps> = ({
  title,
  description,
  pointsRequired,
  imageUrl,
  featured,
  onRedeem,
}) => {
  return (
    <article className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="relative w-full h-[150px] bg-[#F3F3F3]">
        <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        {featured && (
          <span className="absolute top-3 left-3 rounded-full bg-[#FFF6E8] text-[#8B6F36] text-[12px] font-medium px-3 py-1">
            Featured
          </span>
        )}
      </div>
      <div className="flex-1 flex flex-col px-4 py-4 gap-2">
        <h3 className="text-[15px] font-semibold text-[#1B1B1B]">{title}</h3>
        <p className="text-[13px] text-[#6F6F6F] flex-1">{description}</p>
        <p className="mt-1 text-[13px] font-medium text-[#8B6F36]">
          {pointsRequired} points
        </p>
        <Button fullWidth onClick={onRedeem} className="mt-2">
          Redeem
        </Button>
      </div>
    </article>
  );
};
