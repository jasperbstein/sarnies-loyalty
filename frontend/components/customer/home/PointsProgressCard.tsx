/**
 * PointsProgressCard - Points Display with Tier Progress
 * Sarnies Design System v2.0
 *
 * Shows current points, tier badge, and progress to next tier
 * Tier thresholds are fetched from the API
 */

import React, { useEffect, useState } from "react";
import { settingsAPI } from "@/lib/api";

interface PointsProgressCardProps {
  points: number;
  nextRewardAt: number;
  tier?: string;
  nextTier?: string;
}

interface TierThresholds {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

// Default tier thresholds (fallback if API fails)
const DEFAULT_TIER_THRESHOLDS: TierThresholds = {
  bronze: 0,
  silver: 1000,
  gold: 2000,
  platinum: 3000,
};

// Cache for tier thresholds to avoid repeated API calls
let cachedThresholds: TierThresholds | null = null;

function getTierInfo(points: number, thresholds: TierThresholds) {
  if (points >= thresholds.platinum) {
    return { current: 'Platinum', next: null, nextAt: null, progress: 1 };
  } else if (points >= thresholds.gold) {
    return {
      current: 'Gold',
      next: 'Platinum',
      nextAt: thresholds.platinum,
      progress: (points - thresholds.gold) / (thresholds.platinum - thresholds.gold)
    };
  } else if (points >= thresholds.silver) {
    return {
      current: 'Silver',
      next: 'Gold',
      nextAt: thresholds.gold,
      progress: (points - thresholds.silver) / (thresholds.gold - thresholds.silver)
    };
  } else {
    return {
      current: 'Bronze',
      next: 'Silver',
      nextAt: thresholds.silver,
      progress: thresholds.silver > 0 ? points / thresholds.silver : 0
    };
  }
}

export const PointsProgressCard: React.FC<PointsProgressCardProps> = ({
  points,
  nextRewardAt,
  tier,
  nextTier,
}) => {
  const [thresholds, setThresholds] = useState<TierThresholds>(
    cachedThresholds || DEFAULT_TIER_THRESHOLDS
  );

  useEffect(() => {
    // If we already have cached thresholds, don't fetch again
    if (cachedThresholds) return;

    const fetchThresholds = async () => {
      try {
        const response = await settingsAPI.getTiers();
        const data = response.data as TierThresholds;
        cachedThresholds = data;
        setThresholds(data);
      } catch (error) {
        console.error('Failed to fetch tier thresholds, using defaults:', error);
        // Keep using default thresholds on error
      }
    };

    fetchThresholds();
  }, []);

  const tierInfo = getTierInfo(points, thresholds);
  const displayTier = tier || tierInfo.current;
  const displayNextTier = nextTier || tierInfo.next;
  const nextTierAt = tierInfo.nextAt || nextRewardAt;
  const progress = tierInfo.progress;

  return (
    <div
      className="w-full bg-white rounded-md p-6"
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        border: '1px solid rgba(0,0,0,0.05)'
      }}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-label">
          YOUR POINTS
        </span>
        <span className="text-xs font-semibold px-2 py-1 bg-stone-100 rounded text-stone-600">
          {displayTier} Member
        </span>
      </div>

      {/* Points Value */}
      <p className="text-4xl font-semibold text-text-primary tracking-tight mb-4">
        {points.toLocaleString()}
      </p>

      {/* Progress Section */}
      <div className="space-y-2">
        {/* Progress Bar */}
        <div
          className="h-1 rounded-sm bg-stone-100 overflow-hidden"
        >
          <div
            className="h-full bg-amber-600 rounded-sm transition-all duration-500"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>

        {/* Progress Labels */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary">
            {points.toLocaleString()} pts
          </span>
          {displayNextTier && nextTierAt && (
            <span className="text-xs font-semibold text-text-tertiary">
              {(nextTierAt - points).toLocaleString()} to {displayNextTier}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
