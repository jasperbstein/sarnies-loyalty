'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { announcementsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

/**
 * NewsDetailPage - Single announcement view
 * Sarnies Design System v2.0
 *
 * Responsive breakpoints:
 * - Mobile: < 768px (full width)
 * - Tablet/Desktop: centered max-width container
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

const VENUE_IMAGES = [
  '/images/content/venues/venue-1.jpg',
  '/images/content/venues/venue-2.jpg',
  '/images/content/venues/venue-3.jpg',
];

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

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token, hasHydrated } = useAuthStore();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (hasHydrated && token && params.id) {
      fetchAnnouncement();
    }
  }, [hasHydrated, token, params.id]);

  const fetchAnnouncement = async () => {
    try {
      const response = await announcementsAPI.getById(Number(params.id));
      setAnnouncement(response.data.announcement || response.data);
    } catch (err: any) {
      console.error('Failed to fetch announcement:', err);
      setError(err.response?.data?.error || 'Announcement not found');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!hasHydrated || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-bg-primary flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error || !announcement) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-bg-primary">
          <div className="max-w-2xl lg:max-w-4xl mx-auto">
            <header className="bg-white border-b border-stone-200 px-4 md:px-6 py-3 flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-stone-900" />
              </button>
              <h1 className="text-subheading text-text-primary">
                News
              </h1>
            </header>
            <div className="px-4 md:px-6 py-12 text-center">
              <p className="text-body text-text-tertiary">
                {error || 'Announcement not found'}
              </p>
              <button
                onClick={() => router.push('/app/news')}
                className="mt-4 px-6 py-2 bg-text-primary text-white rounded-xl text-body font-medium hover:bg-stone-800 transition-colors"
              >
                Back to News
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-bg-primary">
        <div className="max-w-2xl lg:max-w-4xl mx-auto">
          {/* Header */}
          <header className="bg-surface border-b border-border px-4 md:px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </button>
            <h1 className="text-subheading text-text-primary">
              News
            </h1>
          </header>

          {/* Featured Image */}
          <div className={`relative w-full h-48 md:h-64 bg-stone-100 img-shimmer-container ${imageLoaded ? 'loaded' : ''}`}>
            <Image
              src={announcement.image_url || VENUE_IMAGES[announcement.id % VENUE_IMAGES.length]}
              alt={announcement.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
              priority
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* Content */}
          <div className="px-4 md:px-6 py-5">
            {/* Meta */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${getCategoryBadgeClasses(announcement.announcement_type)}`}
              >
                {formatCategoryLabel(announcement.announcement_type)}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-heading text-text-primary mb-2">
              {announcement.title}
            </h2>

            {/* Date */}
            {announcement.created_at && (
              <p className="text-caption text-text-tertiary mb-5">
                {formatDate(announcement.created_at)}
              </p>
            )}

            {/* Body */}
            <div className="text-body text-text-secondary leading-relaxed">
              {(announcement.description || announcement.message || '').split('\n').map((paragraph, idx) => (
                <p key={idx} className={idx > 0 ? 'mt-4' : ''}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
