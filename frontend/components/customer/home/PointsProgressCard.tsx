/**
 * PointsProgressCard - Points Display with Progress
 * Sarnies Design System v1.2
 */

import React from "react";
import { Star } from "lucide-react";

interface PointsProgressCardProps {
  points: number;
  nextRewardAt: number;
}

export const PointsProgressCard: React.FC<PointsProgressCardProps> = ({
  points,
  nextRewardAt,
}) => {
  const progress = Math.min(points / nextRewardAt, 1);
  const pointsAway = nextRewardAt - points;

  return (
    <div className="card">
      <div className="flex flex-col gap-4">
        {/* Points Display */}
        <div className="text-center">
          <p className="text-nav text-gray-400 mb-1">YOUR POINTS</p>
          <p className="text-3xl font-medium text-accent">{points}</p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <div className="badge-accent">
            <Star className="w-3 h-3 fill-accent text-accent mr-1" />
            <span className="text-body">
              {points >= nextRewardAt
                ? "Reward unlocked!"
                : `${pointsAway} points to reward`}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-1">
          <div className="flex justify-between text-caption text-gray-400 mb-1.5">
            <span>0</span>
            <span>{nextRewardAt}</span>
          </div>
          <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-slow"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
