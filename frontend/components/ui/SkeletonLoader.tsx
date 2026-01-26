'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-lg';
      default:
        return 'rounded-lg';
    }
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`skeleton ${getVariantClasses()} ${className}`}
      style={style}
      role="status"
      aria-label="Loading..."
    />
  );
};

// Pre-built skeleton components for common patterns
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-6 ${className}`}>
      <Skeleton variant="rectangular" height={160} className="mb-4" />
      <Skeleton variant="text" width="60%" className="mb-2" />
      <Skeleton variant="text" width="80%" className="mb-2" />
      <Skeleton variant="text" width="40%" />
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex gap-4">
        <Skeleton variant="text" className="flex-1" />
        <Skeleton variant="text" className="flex-1" />
        <Skeleton variant="text" className="flex-1" />
        <Skeleton variant="text" width={80} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-4 items-center">
          <Skeleton variant="text" className="flex-1" />
          <Skeleton variant="text" className="flex-1" />
          <Skeleton variant="text" className="flex-1" />
          <Skeleton variant="rectangular" width={80} height={32} />
        </div>
      ))}
    </div>
  );
};

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({
  items = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </div>
          <Skeleton variant="rectangular" width={80} height={32} />
        </div>
      ))}
    </div>
  );
};

export const SkeletonProfile: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={80} height={80} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" height={24} />
          <Skeleton variant="text" width="60%" />
        </div>
      </div>
      {/* Content */}
      <div className="space-y-4">
        <Skeleton variant="rectangular" height={120} />
        <Skeleton variant="rectangular" height={120} />
        <Skeleton variant="rectangular" height={120} />
      </div>
    </div>
  );
};
