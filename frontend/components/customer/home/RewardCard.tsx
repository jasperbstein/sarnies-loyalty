/**
 * RewardCard - Featured Reward Card
 * Sarnies Design System v2.0
 *
 * Card with image, title, description, points, and stock
 */

import React, { useState } from "react";
import Image from "next/image";
import { Gift } from "lucide-react";

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-smooth active:scale-[0.98]"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* Image */}
      <div className="w-full aspect-[4/3] bg-stone-100 relative overflow-hidden">
        {/* Skeleton loader */}
        {!imageLoaded && !imageError && imageUrl && (
          <div className="absolute inset-0 bg-gradient-to-r from-stone-100 via-stone-200 to-stone-100 animate-pulse" />
        )}

        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            sizes="(max-width: 768px) 50vw, 25vw"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
            <Gift className="w-8 h-8 text-stone-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-[13px] font-semibold text-stone-800 truncate">
          {title}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          {displayPoints === 'FREE' ? (
            <span className="text-[11px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">FREE</span>
          ) : (
            <span className="text-[12px] font-bold text-stone-700">
              {displayPoints}
            </span>
          )}
          {stock && (
            <span className="text-[10px] font-medium text-stone-400">
              {stock}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
