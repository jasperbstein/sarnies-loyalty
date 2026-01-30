'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { announcementsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface Announcement {
  id: number;
  title: string;
  description: string;
  message?: string; // Legacy field
  image_url?: string;
  announcement_type: string;
  user_type: string;
  is_active: boolean;
  created_at?: string;
}

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token, hasHydrated } = useAuthStore();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasHydrated && token && params.id) {
      fetchAnnouncement();
    }
  }, [hasHydrated, token, params.id]);

  const fetchAnnouncement = async () => {
    try {
      const response = await announcementsAPI.getById(Number(params.id));
      // API returns { announcement: {...} }
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
        <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error || !announcement) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-[#FAFAF9]">
          <header className="bg-white border-b border-[#E7E5E4] px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-[#F5F5F4] flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-[#1C1917]" />
            </button>
            <h1 className="text-[16px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              News
            </h1>
          </header>
          <div className="px-4 py-12 text-center">
            <p className="text-[15px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              {error || 'Announcement not found'}
            </p>
            <button
              onClick={() => router.push('/app/news')}
              className="mt-4 px-6 py-2 bg-[#1C1917] text-white rounded-xl text-[14px] font-medium"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Back to News
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Header */}
        <header className="bg-white border-b border-[#E7E5E4] px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-[#F5F5F4] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-[#1C1917]" />
          </button>
          <h1 className="text-[16px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            News
          </h1>
        </header>

        {/* Featured Image */}
        {announcement.image_url && (
          <div
            className="w-full h-[200px] bg-[#F5F5F4] bg-cover bg-center"
            style={{ backgroundImage: `url(${announcement.image_url})` }}
          />
        )}

        {/* Content */}
        <div className="px-4 py-5">
          {/* Meta */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                announcement.announcement_type === 'promotion'
                  ? 'bg-[#FEF3C7] text-[#D97706]'
                  : announcement.announcement_type === 'event'
                  ? 'bg-[#F5F5F4] text-[#1C1917]'
                  : 'bg-[#F5F5F4] text-[#78716C]'
              }`}
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              {announcement.announcement_type}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-[20px] font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            {announcement.title}
          </h2>

          {/* Date */}
          {announcement.created_at && (
            <p className="text-[13px] text-[#A8A29E] mb-5" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              {formatDate(announcement.created_at)}
            </p>
          )}

          {/* Body */}
          <div
            className="text-[15px] text-[#57534E] leading-relaxed"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            {(announcement.description || announcement.message || '').split('\n').map((paragraph, idx) => (
              <p key={idx} className={idx > 0 ? 'mt-4' : ''}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
