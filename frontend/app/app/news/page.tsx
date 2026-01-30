'use client';

import React, { useState, useEffect } from 'react';
import { Newspaper } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { announcementsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useTabSwipeNavigation } from '@/hooks/useSwipeNavigation';

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

export default function NewsPage() {
  const router = useRouter();
  const { user, token, hasHydrated } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

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

  if (!mounted || !hasHydrated) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin" />
      </div>
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
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Header */}
        <header className="bg-[#FAFAF9] px-4 pt-4 pb-4">
          <h1 className="text-[20px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            News
          </h1>
          <p className="text-[13px] text-[#78716C] mt-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            Latest updates from Sarnies
          </p>
        </header>

        {/* Content - 24px section gaps */}
        <div className="px-4 pb-24 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-8 text-center">
              <div className="w-14 h-14 bg-[#F5F5F4] rounded-xl flex items-center justify-center mx-auto mb-4">
                <Newspaper className="w-7 h-7 text-[#78716C]" />
              </div>
              <p className="text-[15px] font-semibold text-[#1C1917] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                No announcements yet
              </p>
              <p className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Check back later for news and updates
              </p>
            </div>
          ) : (
            announcements.map((announcement) => (
              <NewsCard key={announcement.id} announcement={announcement} formatDate={formatDate} />
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function NewsCard({
  announcement,
  formatDate
}: {
  announcement: Announcement;
  formatDate: (date?: string) => string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/app/news/${announcement.id}`)}
      className="w-full bg-white rounded-xl border border-[#E7E5E4] overflow-hidden text-left active:scale-[0.99] transition-transform"
    >
      {announcement.image_url && (
        <div
          className="h-36 w-full bg-[#F5F5F4] bg-cover bg-center"
          style={{ backgroundImage: `url(${announcement.image_url})` }}
        />
      )}
      {/* Content - 16px padding */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
              announcement.announcement_type === 'promotion'
                ? 'bg-[#F5F5F4] text-[#D97706]'
                : announcement.announcement_type === 'event'
                ? 'bg-[#F5F5F4] text-[#1C1917]'
                : 'bg-[#F5F5F4] text-[#78716C]'
            }`}
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            {announcement.announcement_type}
          </span>
          {announcement.created_at && (
            <span className="text-[11px] text-[#A8A29E]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              {formatDate(announcement.created_at)}
            </span>
          )}
        </div>
        <h3 className="text-[15px] font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          {announcement.title}
        </h3>
        <p className="text-[13px] text-[#78716C] leading-relaxed line-clamp-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          {announcement.description || announcement.message}
        </p>
      </div>
    </button>
  );
}
