'use client';

/**
 * PointsRing - Circular Progress Component
 * Sarnies Design System v2.0
 *
 * Displays points progress in a circular ring format.
 * Commonly used on the home page to show progress toward next reward.
 */

import React from 'react';
import { Star } from 'lucide-react';

interface PointsRingProps {
  currentPoints: number;
  targetPoints: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const sizeConfig = {
  sm: {
    diameter: 80,
    strokeWidth: 6,
    fontSize: 'text-lg',
    labelSize: 'text-[9px]',
    iconSize: 12,
  },
  md: {
    diameter: 120,
    strokeWidth: 8,
    fontSize: 'text-2xl',
    labelSize: 'text-[10px]',
    iconSize: 14,
  },
  lg: {
    diameter: 160,
    strokeWidth: 10,
    fontSize: 'text-3xl',
    labelSize: 'text-xs',
    iconSize: 16,
  },
};

export function PointsRing({
  currentPoints,
  targetPoints,
  size = 'md',
  showLabel = true,
  label = 'points',
  className = '',
}: PointsRingProps) {
  const config = sizeConfig[size];
  const radius = (config.diameter - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(currentPoints / targetPoints, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const remaining = Math.max(targetPoints - currentPoints, 0);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* SVG Ring */}
      <svg
        width={config.diameter}
        height={config.diameter}
        className="transform -rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-stone-200"
        />
        {/* Progress ring */}
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-accent transition-all duration-500 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-semibold text-text-primary ${config.fontSize}`}>
          {currentPoints}
        </span>
        {showLabel && (
          <span className={`text-text-tertiary font-medium uppercase tracking-wider ${config.labelSize}`}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// Variant with reward info
interface PointsRingWithRewardProps extends PointsRingProps {
  rewardName?: string;
}

export function PointsRingWithReward({
  currentPoints,
  targetPoints,
  size = 'md',
  rewardName = 'next reward',
  className = '',
}: PointsRingWithRewardProps) {
  const remaining = Math.max(targetPoints - currentPoints, 0);
  const isComplete = remaining === 0;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <PointsRing
        currentPoints={currentPoints}
        targetPoints={targetPoints}
        size={size}
        showLabel={true}
        label="points"
      />
      <div className="mt-3 text-center">
        {isComplete ? (
          <p className="text-sm font-medium text-success">
            Ready to redeem!
          </p>
        ) : (
          <>
            <p className="text-sm text-text-tertiary">
              <span className="font-semibold text-text-primary">{remaining}</span> more to {rewardName}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Compact inline variant
interface PointsRingInlineProps {
  currentPoints: number;
  targetPoints: number;
  className?: string;
}

export function PointsRingInline({
  currentPoints,
  targetPoints,
  className = '',
}: PointsRingInlineProps) {
  const progress = Math.min(currentPoints / targetPoints, 1);
  const remaining = Math.max(targetPoints - currentPoints, 0);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Mini ring */}
      <div className="relative w-10 h-10">
        <svg width={40} height={40} className="transform -rotate-90">
          <circle
            cx={20}
            cy={20}
            r={16}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            className="text-stone-200"
          />
          <circle
            cx={20}
            cy={20}
            r={16}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={100.53}
            strokeDashoffset={100.53 * (1 - progress)}
            className="text-accent transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Star className="w-4 h-4 text-accent fill-accent" />
        </div>
      </div>

      {/* Text */}
      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary">
          {currentPoints} / {targetPoints} pts
        </p>
        <p className="text-xs text-text-tertiary">
          {remaining > 0 ? `${remaining} more to reward` : 'Ready to redeem!'}
        </p>
      </div>
    </div>
  );
}

export default PointsRing;
