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
      className="w-full flex items-center gap-3 p-4 rounded-xl text-left"
      style={{
        background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)'
      }}
    >
      {/* Icon Container */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: 'rgba(255,255,255,0.19)' }}
      >
        <Gift className="w-5 h-5 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">
          {title}
        </p>
        <p className="text-xs font-semibold text-white/85">
          {description}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-white flex-shrink-0" />
    </button>
  );
};
