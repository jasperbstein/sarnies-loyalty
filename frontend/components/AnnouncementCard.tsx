'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

interface AnnouncementCardProps {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  image_url_full?: string; // Full-size version for high-res displays
  image_width?: number;
  image_height?: number;
  blur_data_url?: string;
  announcement_type: 'news' | 'promotion' | 'new_product' | 'seasonal' | 'announcement';
  cta_text?: string;
  cta_link?: string;
  priority?: boolean; // For first image above the fold
}

export default function AnnouncementCard({
  id,
  title,
  description,
  image_url,
  image_url_full,
  image_width = 800,
  image_height = 450,
  blur_data_url,
  announcement_type,
  cta_text,
  cta_link,
  priority = false
}: AnnouncementCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/app/announcements/${id}`);
  };

  const getTypeColor = () => {
    switch (announcement_type) {
      case 'promotion':
        return 'bg-green-100 text-green-800';
      case 'new_product':
        return 'bg-blue-100 text-blue-800';
      case 'seasonal':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = () => {
    switch (announcement_type) {
      case 'promotion':
        return 'Promotion';
      case 'new_product':
        return 'New Product';
      case 'seasonal':
        return 'Seasonal';
      case 'news':
        return 'News';
      default:
        return 'Announcement';
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="w-full bg-white rounded-xl p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow"
      style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
    >
      {/* 1. Image - Fixed 16:9 aspect ratio */}
      {image_url && (
        <div className="relative w-full aspect-[16/9] rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden flex-shrink-0">
          <Image
            src={image_url_full || image_url} // Use full-size if available
            alt={title}
            width={image_width * 2.4} // 1920 for full size
            height={image_height * 2.4} // 1080 for full size
            sizes="(max-width: 640px) 90vw, (max-width: 1200px) 50vw, 400px"
            className="w-full h-full object-cover"
            loading={priority ? "eager" : "lazy"}
            priority={priority}
            quality={85} // Higher quality for full-size
            placeholder={blur_data_url ? "blur" : "empty"}
            blurDataURL={blur_data_url}
          />
        </div>
      )}

      {/* 2. Category Pill */}
      <div className="flex-shrink-0">
        <span className="inline-block bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-lg">
          {getTypeLabel()}
        </span>
      </div>

      {/* 3. Title - Max 2 lines */}
      <h3 className="text-base font-bold text-gray-900 line-clamp-2 leading-snug flex-shrink-0">
        {title}
      </h3>

      {/* 4. Description - Max 3 lines */}
      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed flex-shrink-0">
        {description}
      </p>

      {/* 5. CTA Row - Always on its own row */}
      <div className="flex items-center gap-1 text-sm font-medium text-blue-600 mt-3 flex-shrink-0 group">
        <span className="group-hover:underline">Read more</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}
