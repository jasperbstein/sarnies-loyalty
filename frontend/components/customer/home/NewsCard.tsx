/**
 * NewsCard - Announcement Card
 * Sarnies Design System v1.2
 */

import React from "react";
import { Newspaper, ChevronRight } from "lucide-react";

interface NewsCardProps {
  tag?: string;
  title: string;
  description: string;
  imageUrl?: string;
  ctaLabel?: string;
  onClick?: () => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({
  tag,
  title,
  description,
  imageUrl,
  ctaLabel = "Read more",
  onClick,
}) => {
  return (
    <article
      onClick={onClick}
      className="card overflow-hidden flex flex-col cursor-pointer hover:border-gray-300 transition-colors active:scale-[0.98] p-0"
    >
      {/* Image */}
      <div className="relative w-full h-[140px] bg-gray-100">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Newspaper className="w-10 h-10 text-gray-300" />
          </div>
        )}

        {tag && (
          <span className="badge-default absolute top-2.5 left-2.5">{tag}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4">
        <h3 className="text-base font-medium text-black tracking-tight leading-snug line-clamp-2 mb-1.5">
          {title}
        </h3>
        <p className="text-caption text-gray-500 line-clamp-1 flex-1">
          {description}
        </p>
        <div className="flex items-center gap-0.5 mt-3 text-accent">
          <span className="text-caption font-medium">{ctaLabel}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </article>
  );
};
