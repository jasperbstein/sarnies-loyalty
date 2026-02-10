'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Newspaper } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { announcementsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useTabSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { PullToRefresh } from '@/components/PullToRefresh';
import { isEmployeeUser } from '@/lib/authUtils';

/**
 * NewsPage - Announcements listing
 * Sarnies Design System v2.0
 *
 * Responsive breakpoints:
 * - Mobile: < 768px (single column)
 * - Tablet: 768px - 1024px (2-column grid)
 * - Desktop: > 1024px (3-column grid)
 */

interface Announcement {
  id: number;
  title: string;
  description: string;
  message?: string;
  image_url?: string;
  announcement_type: string;
  user_type: string;
  is_active: boolean;
  created_at?: string;
}

export default function NewsPage() {
  const router = useRouter();
  const { user, token, hasHydrated } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const isEmployee = isEmployeeUser(user);

  useTabSwipeNavigation();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (hasHydrated && token) {
      fetchAnnouncements();
    }
  }, [hasHydrated, token]);

  const fetchAnnouncements = async () => {
    try {
      const userType = user?.user_type || 'customer';
      const response = await announcementsAPI.getAll(userType);
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchAnnouncements();
  };

  if (!mounted || !hasHydrated) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-stone-50">
          {/* Responsive container */}
          <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto">
            {/* Header */}
            <header className="bg-stone-50 px-4 md:px-6 pt-4 pb-4">
              <h1 className="text-xl font-semibold text-stone-900">
                News
              </h1>
              <p className="text-sm text-stone-500 mt-1">
                {isEmployee ? 'Updates for employees' : 'Latest updates from Sarnies'}
              </p>
            </header>

            {/* Content */}
            <div className="px-4 md:px-6 pb-24">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : announcements.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
                  <div className="w-14 h-14 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Newspaper className="w-7 h-7 text-stone-400" />
                  </div>
                  <p className="text-base font-semibold text-stone-900 mb-1">
                    No announcements yet
                  </p>
                  <p className="text-sm text-stone-500">
                    Check back later for news and updates
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {announcements.map((announcement) => (
                    <NewsCard key={announcement.id} announcement={announcement} formatDate={formatDate} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>
    </AppLayout>
  );
}

const VENUE_IMAGES = [
  '/images/content/venues/venue-1.jpg',
  '/images/content/venues/venue-2.jpg',
  '/images/content/venues/venue-3.jpg',
];

function getVenueFallback(id: number) {
  return VENUE_IMAGES[id % VENUE_IMAGES.length];
}

function formatCategoryLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getCategoryBadgeClasses(type: string): string {
  switch (type) {
    case 'promotion': return 'bg-amber-100 text-amber-700';
    case 'event': return 'bg-blue-100 text-blue-700';
    case 'new_product': return 'bg-green-100 text-green-700';
    case 'announcement': return 'bg-stone-100 text-stone-600';
    default: return 'bg-stone-100 text-stone-600';
  }
}

function NewsCard({
  announcement,
  formatDate
}: {
  announcement: Announcement;
  formatDate: (date?: string) => string;
}) {
  const router = useRouter();
  const imageUrl = announcement.image_url || getVenueFallback(announcement.id);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <button
      onClick={() => router.push(`/app/news/${announcement.id}`)}
      className="w-full bg-white rounded-xl border border-stone-200 overflow-hidden text-left hover:border-stone-300 active:scale-[0.99] transition-all"
    >
      <div className={`relative aspect-video w-full bg-stone-100 img-shimmer-container ${imageLoaded ? 'loaded' : ''}`}>
        <Image
          src={imageUrl}
          alt={announcement.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          onLoad={() => setImageLoaded(true)}
        />
      </div>
      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${getCategoryBadgeClasses(announcement.announcement_type)}`}
          >
            {formatCategoryLabel(announcement.announcement_type)}
          </span>
          {announcement.created_at && (
            <span className="text-xs text-stone-500">
              {formatDate(announcement.created_at)}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-stone-900 mb-2">
          {announcement.title}
        </h3>
        <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
          {announcement.description || announcement.message}
        </p>
      </div>
    </button>
  );
}
