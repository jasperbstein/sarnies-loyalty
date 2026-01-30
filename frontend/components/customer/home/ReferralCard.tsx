/**
 * ReferralCard - Invite Friends Card
 * Sarnies Design System v2.0
 *
 * Amber gradient card with referral CTA
 */

import React from "react";
import { Gift, ChevronRight } from "lucide-react";

interface ReferralCardProps {
  title?: string;
  description?: string;
  onClick?: () => void;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({
  title = "Invite Friends",
  description = "Get 500 pts for each friend",
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-6 rounded-2xl text-left"
      style={{
        background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
        boxShadow: '0 4px 12px rgba(217, 119, 6, 0.15)'
      }}
    >
      {/* Icon Container */}
      <div
        className="w-[52px] h-[52px] rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: 'rgba(255,255,255,0.19)' }}
      >
        <Gift className="w-[26px] h-[26px] text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-white">
          {title}
        </p>
        <p className="text-sm font-semibold text-white/85">
          {description}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-white flex-shrink-0" />
    </button>
  );
};
