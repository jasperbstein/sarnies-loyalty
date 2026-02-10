'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { announcementsAPI } from '@/lib/api';

interface Announcement {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  announcement_type: 'news' | 'promotion' | 'new_product' | 'seasonal' | 'announcement';
  cta_text?: string;
  cta_link?: string;
  created_at: string;
}

export default function AnnouncementDetail() {
  // Enable swipe-back gesture
  useSwipeBack();
  const router = useRouter();
  const params = useParams();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchAnnouncement();
  }, [params.id]);

  const fetchAnnouncement = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await announcementsAPI.getById(Number(params.id));
      setAnnouncement(response.data.announcement);
    } catch (error) {
      console.error('Failed to fetch announcement:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
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

  const getTypeLabel = (type: string) => {
    switch (type) {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCtaClick = () => {
    if (announcement?.cta_link) {
      if (announcement.cta_link.startsWith('/') || announcement.cta_link.startsWith('#')) {
        router.push(announcement.cta_link);
      } else {
        window.open(announcement.cta_link, '_blank');
      }
    }
  };

  const renderDescription = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="pb-20 animate-pulse">
          <div className="bg-gray-200 h-8 w-24 rounded mb-6"></div>
          <div className="bg-gray-300 h-64 rounded-2xl mb-6"></div>
          <div className="space-y-4">
            <div className="bg-gray-200 h-6 rounded"></div>
            <div className="bg-gray-200 h-6 rounded w-3/4"></div>
            <div className="bg-gray-200 h-6 rounded w-5/6"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !announcement) {
    return (
      <AppLayout>
        <div className="pb-20">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-black mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <p className="text-red-900 font-semibold mb-2">Failed to load announcement</p>
            <p className="text-sm text-red-700 mb-4">This announcement may no longer exist</p>
            <button
              onClick={() => router.push('/app/dashboard')}
              className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-20">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-black mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Article Content */}
        <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          {/* Image */}
          {announcement.image_url && (
            <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200">
              <Image
                src={announcement.image_url}
                alt={announcement.title}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {/* Meta Info */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${getTypeColor(announcement.announcement_type)}`}>
                <Tag className="w-3 h-3 inline mr-1" />
                {getTypeLabel(announcement.announcement_type)}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(announcement.created_at)}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-heading text-black mb-4">
              {announcement.title}
            </h1>

            {/* Description */}
            <div className="text-body text-gray-700 whitespace-pre-wrap mb-6">
              {renderDescription(announcement.description)}
            </div>

            {/* CTA Button */}
            {announcement.cta_text && announcement.cta_link && (
              <button
                onClick={handleCtaClick}
                className="btn-primary w-full"
              >
                {announcement.cta_text}
              </button>
            )}
          </div>
        </article>
      </div>
    </AppLayout>
  );
}
