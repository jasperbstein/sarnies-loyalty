/**
 * RewardCard - Featured Reward Card
 * Sarnies Design System v2.0
 *
 * Card with image, title, description, points, and stock
 */

import React from "react";

interface RewardCardProps {
  title: string;
  description: string;
  imageUrl?: string;
  points: number | string;
  stock?: string;
  onClick?: () => void;
}

export const RewardCard: React.FC<RewardCardProps> = ({
  title,
  description,
  imageUrl,
  points,
  stock,
  onClick,
}) => {
  const displayPoints = typeof points === 'number' ? `${points} pts` : points;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-md overflow-hidden text-left hover:border-stone-200 transition-colors"
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        border: '1px solid rgba(0,0,0,0.05)'
      }}
    >
      {/* Image */}
      {imageUrl ? (
        <div
          className="w-full h-[100px] bg-stone-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <div className="w-full h-[100px] bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
          <span className="text-3xl">🎁</span>
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-2">
        <div>
          <p className="text-sm font-semibold text-text-primary truncate">
            {title}
          </p>
          <p className="text-sm text-text-secondary truncate">
            {description}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-text-primary">
            {displayPoints}
          </span>
          {stock && (
            <span className="text-xs font-bold text-text-tertiary">
              {stock}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
