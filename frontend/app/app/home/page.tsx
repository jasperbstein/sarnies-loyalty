'use client';

import React, { useState, useEffect, useRef } from "react";
import { MemberHeroCard } from "@/components/customer/home/MemberHeroCard";
import { PointsProgressCard } from "@/components/customer/home/PointsProgressCard";
import { QuickActionsGrid } from "@/components/customer/home/QuickActionsGrid";
import { NewsCard } from "@/components/customer/home/NewsCard";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { announcementsAPI, vouchersAPI } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useTabSwipeNavigation } from "@/hooks/useSwipeNavigation";
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBaseUrl, getWebSocketUrl } from '@/lib/config';
import { Gift, ChevronRight, Coffee, Sparkles, CheckCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface Announcement {
  id: number;
  title: string;
  message: string;
  image_url?: string;
  announcement_type: string;
  user_type: string;
  is_active: boolean;
}

interface Voucher {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  voucher_type: string;
  points_required: number;
  max_redemptions_per_user_per_day?: number;
  redeemed_today?: number;
  total_redemptions?: number;
}

export default function HomePage() {
  const router = useRouter();
  const { user, token, hasHydrated } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [topVoucher, setTopVoucher] = useState<Voucher | null>(null);
  const [redeemedVoucher, setRedeemedVoucher] = useState<{
    voucher_title: string;
    outlet: string;
    cash_value: number;
  } | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Enable swipe navigation between tabs
  useTabSwipeNavigation();

  // Detect when component is mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // WebSocket connection for real-time voucher redemption feedback
  useEffect(() => {
    if (!mounted || !user?.id || !token) return;

    const wsUrl = getWebSocketUrl();
    console.log('🔌 Connecting to WebSocket:', wsUrl);

    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ WebSocket connected, authenticating user:', user.id);
      socket.emit('authenticate', user.id);
    });

    socket.on('voucher_redeemed', (data: {
      voucher_id: number;
      voucher_title: string;
      voucher_type: string;
      cash_value: number;
      used_at: string;
      outlet: string;
    }) => {
      console.log('🎉 Voucher redeemed event received:', data);

      // Small delay for better UX
      setTimeout(() => {
        // Show success notification
        setRedeemedVoucher({
          voucher_title: data.voucher_title,
          outlet: data.outlet,
          cash_value: data.cash_value
        });

        // Also show a toast
        toast.success(`${data.voucher_title} redeemed!`, {
          duration: 4000,
          icon: '✅'
        });

        // Refresh voucher data to update usage counts
        fetchTopVoucher();
      }, 800);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [mounted, user?.id, token]);

  useEffect(() => {
    if (hasHydrated && token) {
      fetchCurrentUser();
      fetchAnnouncements();
      fetchQRCode();
      fetchTopVoucher();
    }
  }, [hasHydrated, token]);

  const fetchCurrentUser = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${getBaseUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update user in store with fresh data from database
      useAuthStore.getState().updateUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      // Use the actual user's user_type for filtering announcements
      const userType = user?.user_type || 'customer';
      const response = await announcementsAPI.getAll(userType);
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCode = async () => {
    if (!user || !token) return;

    setQrLoading(true);
    try {
      const response = await axios.get(`${getBaseUrl()}/api/users/${user.id}/static-qr`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      setQrCodeUrl(response.data.qr_code);
    } catch (error) {
      console.error('Failed to load QR code:', error);
    } finally {
      setQrLoading(false);
    }
  };

  const fetchTopVoucher = async () => {
    try {
      const response = await vouchersAPI.getAll();
      const vouchers = response.data.vouchers || [];
      // Get the first available voucher (most used would require backend tracking)
      // For now, show the first employee voucher available
      if (vouchers.length > 0) {
        // Sort by total_redemptions to get most used
        const sorted = [...vouchers].sort((a: Voucher, b: Voucher) =>
          (b.total_redemptions || 0) - (a.total_redemptions || 0)
        );
        setTopVoucher(sorted[0]);
      }
    } catch (error) {
      console.error('Failed to fetch vouchers:', error);
    }
  };

  const handleRefresh = async () => {
    await fetchAnnouncements();
    await fetchQRCode();
    await fetchTopVoucher();
  };

  // Show loading spinner until both mounted and hydrated
  if (!mounted || !hasHydrated) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const isEmployee = user?.user_type === 'employee';

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="flex flex-col gap-8">
        <MemberHeroCard
          name={user?.name || "John"}
          memberId={user?.id?.toString().padStart(6, '0') || "000001"}
          qrCodeUrl={qrCodeUrl || undefined}
          qrLoading={qrLoading}
          userType={user?.user_type}
        />

        {!isEmployee && <PointsProgressCard points={user?.points_balance || 0} nextRewardAt={25} />}

        {/* Employee Section - Mustard Brand */}
        {isEmployee && (
          <div className="space-y-3">
            {/* Most Used Voucher - Quick Access with Mustard accent */}
            {topVoucher && (
              <button
                onClick={() => router.push(`/app/vouchers/${topVoucher.id}`)}
                className="w-full rounded-xl p-4 text-left transition-all group bg-white border border-black/10 border-l-4 border-l-mustard hover:bg-gray-50 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-mustard">
                      <Coffee className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <p className="text-nav text-gray-500 mb-0.5">QUICK REDEEM</p>
                      <h3 className="text-body font-medium text-black">{topVoucher.title}</h3>
                      {topVoucher.max_redemptions_per_user_per_day && (
                        <p className="text-caption text-gray-400 mt-0.5">
                          {Math.max(0, topVoucher.max_redemptions_per_user_per_day - (topVoucher.redeemed_today || 0))} left today
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )}

            {/* Browse All Vouchers */}
            <button
              onClick={() => router.push("/app/vouchers")}
              className="w-full bg-white rounded-xl p-4 border border-black/10 hover:border-black/20 transition-all text-left group active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 group-hover:bg-gray-200 transition-colors">
                    <Gift className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h3 className="text-body font-medium text-black">Browse All Benefits</h3>
                    <p className="text-caption text-gray-500">View all your employee vouchers</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* How to Use - Compact with Mustard accents */}
            <div className="bg-white rounded-xl p-4 border border-black/10">
              <h3 className="text-nav text-black mb-3">HOW IT WORKS</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mx-auto mb-1.5 bg-mustard text-black">1</div>
                  <p className="text-caption text-gray-500">Choose</p>
                </div>
                <div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mx-auto mb-1.5 bg-mustard text-black">2</div>
                  <p className="text-caption text-gray-500">Redeem</p>
                </div>
                <div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mx-auto mb-1.5 bg-mustard text-black">3</div>
                  <p className="text-caption text-gray-500">Show QR</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customer Quick Actions */}
        {!isEmployee && (
          <QuickActionsGrid
            onRewards={() => router.push("/app/rewards")}
            onActivity={() => router.push("/app/activity")}
          />
        )}

        {/* News & Updates */}
        <div>
          <h2 className="text-nav text-black mb-3">
            NEWS & UPDATES
          </h2>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center border border-black/10">
              <p className="text-body text-black/40">No announcements at this time</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5 scrollbar-hide">
              <div className="flex gap-3 pb-2">
                {announcements.map((item) => (
                  <div key={item.id} className="flex-shrink-0 w-[240px]">
                    <NewsCard
                      tag={item.announcement_type}
                      title={item.title}
                      description={item.message}
                      imageUrl={item.image_url}
                      onClick={() => router.push(`/app/announcements/${item.id}`)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </PullToRefresh>

      {/* Voucher Redeemed Success Modal */}
      {redeemedVoucher && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-5"
          onClick={() => setRedeemedVoucher(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-[320px] w-full text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success Icon with brand accent */}
            <div className="w-16 h-16 rounded-full bg-accent-muted flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-9 h-9 text-accent" />
            </div>

            {/* Title */}
            <h2 className="text-label text-black mb-3">VOUCHER REDEEMED</h2>

            {/* Voucher Name */}
            <p className="text-body font-semibold text-black mb-1">{redeemedVoucher.voucher_title}</p>

            {/* Location */}
            <p className="text-body text-black/50 mb-4">at {redeemedVoucher.outlet}</p>

            {/* Value Badge */}
            {redeemedVoucher.cash_value > 0 && (
              <div className="badge-accent mb-5">
                <span>฿{redeemedVoucher.cash_value} Value</span>
              </div>
            )}

            {/* Dismiss Button */}
            <button
              onClick={() => setRedeemedVoucher(null)}
              className="btn-primary w-full"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
