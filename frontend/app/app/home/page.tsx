'use client';

import React, { useState, useEffect, useRef } from "react";
import { MemberHeroCard } from "@/components/customer/home/MemberHeroCard";
import { PointsProgressCard } from "@/components/customer/home/PointsProgressCard";
import { QuickActionsGrid } from "@/components/customer/home/QuickActionsGrid";
import { ReferralCard } from "@/components/customer/home/ReferralCard";
import { RewardCard } from "@/components/customer/home/RewardCard";
import { EmployeeHome } from "@/components/employee/EmployeeHome";
import AppLayout from "@/components/AppLayout";
import { useRouter } from "next/navigation";
import { announcementsAPI, vouchersAPI, collabsAPI, CollabOffer } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { PullToRefresh } from "@/components/PullToRefresh";
import { HomePageSkeleton, EmployeeHomePageSkeleton } from "@/components/ui/SkeletonLoader";
import { useTabSwipeNavigation } from "@/hooks/useSwipeNavigation";
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBaseUrl, getWebSocketUrl } from '@/lib/config';
import { Bell, ChevronRight, CheckCircle, Cake, X, UserPlus, Gift, Percent, DollarSign, Building2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import Image from 'next/image';
import { isEmployeeUser, isPerksOnlyUser } from '@/lib/authUtils';

interface Announcement {
  id: number;
  title: string;
  message?: string;
  description?: string;
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
  cash_value: number;
  max_redemptions_per_user?: number;
  redeemed_today?: number;
  total_redemptions?: number;
}

export default function HomePage() {
  const router = useRouter();
  const { user, token, hasHydrated } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [partnerOffers, setPartnerOffers] = useState<CollabOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [redeemedVoucher, setRedeemedVoucher] = useState<{
    voucher_title: string;
    outlet: string;
    cash_value: number;
  } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);

  // Detect perks-only mode early from localStorage to show correct skeleton (avoids CLS)
  const [isPerksOnlyHint, setIsPerksOnlyHint] = useState(false);

  useTabSwipeNavigation();

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('auth-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        const ut = parsed?.state?.user?.user_type || parsed?.state?.user?.type;
        const usersCollectPoints = parsed?.state?.user?.users_collect_points;
        // Show perks skeleton for employees OR users who don't collect points
        if (ut === 'employee' || usersCollectPoints === false) {
          setIsPerksOnlyHint(true);
        }
      }
    } catch {}
  }, []);

  // WebSocket connection for real-time voucher redemption feedback
  useEffect(() => {
    if (!mounted || !user?.id || !token) return;

    // Delay WebSocket connection to not block initial render
    const connectionTimeout = setTimeout(() => {
      try {
        const wsUrl = getWebSocketUrl();
        const socket = io(wsUrl, {
          transports: ['websocket', 'polling'],
          auth: { token },
          timeout: 5000, // Connection timeout
          reconnectionAttempts: 3,
          reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('authenticate', token);
        });

        socket.on('connect_error', (err) => {
          console.warn('WebSocket connection failed:', err.message);
          // Don't block the app if WebSocket fails
        });

        socket.on('voucher_redeemed', (data: {
          voucher_id: number;
          voucher_title: string;
          voucher_type: string;
          cash_value: number;
          used_at: string;
          outlet: string;
        }) => {
          setTimeout(() => {
            setRedeemedVoucher({
              voucher_title: data.voucher_title,
              outlet: data.outlet,
              cash_value: data.cash_value
            });

            toast.success(`${data.voucher_title} redeemed!`, {
              duration: 4000,
            });

            fetchVouchers();
          }, 800);
        });
      } catch (err) {
        console.warn('WebSocket setup failed:', err);
      }
    }, 500); // Delay WebSocket setup

    return () => {
      clearTimeout(connectionTimeout);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [mounted, user?.id, token]);

  useEffect(() => {
    if (hasHydrated && token) {
      // Fetch user first, then other data in parallel
      // This ensures user_type is correct before fetching vouchers
      const loadData = async () => {
        // First fetch user to get correct user_type
        await fetchCurrentUser();
        // Then fetch everything else in parallel
        await Promise.allSettled([
          fetchAnnouncements(),
          fetchQRCode(),
          fetchVouchers(),
          fetchPartnerOffers(),
        ]);
        setLoading(false);
      };
      loadData();
    } else if (hasHydrated && !token) {
      // No token, stop loading
      setLoading(false);
    }
  }, [hasHydrated, token]);

  const fetchCurrentUser = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${getBaseUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fetchedUser = response.data.user;
      useAuthStore.getState().updateUser(fetchedUser);

      // Check if perks-only user needs to provide birthday
      const isPerks = fetchedUser.user_type === 'employee' || fetchedUser.type === 'employee' || fetchedUser.users_collect_points === false;
      if (isPerks && !fetchedUser.birthday) {
        setShowBirthdayModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const userType = user?.user_type || 'customer';
      const response = await announcementsAPI.getAll(userType);
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
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

  const fetchVouchers = async () => {
    try {
      // Get fresh user from store to ensure we have latest user_type
      const currentUser = useAuthStore.getState().user;
      const isEmployee = isEmployeeUser(currentUser);

      if (isEmployee && currentUser?.id) {
        // Use employee-specific endpoint that includes redeemed_today tracking
        const response = await vouchersAPI.getEmployeeVouchers(currentUser.id);
        setVouchers(response.data.vouchers || []);
      } else {
        const response = await vouchersAPI.getAll();
        setVouchers(response.data.vouchers || []);
      }
    } catch (error) {
      console.error('Failed to fetch vouchers:', error);
    }
  };

  const fetchPartnerOffers = async () => {
    try {
      const response = await collabsAPI.getAvailableOffers();
      setPartnerOffers(response.data.offers || []);
    } catch (error) {
      console.error('Failed to fetch partner offers:', error);
    }
  };

  const handleRefresh = async () => {
    await fetchAnnouncements();
    await fetchQRCode();
    await fetchVouchers();
    await fetchPartnerOffers();
  };

  // Safety: If still loading after 3 seconds, stop showing skeleton
  useEffect(() => {
    if (loading) {
      const loadingTimeout = setTimeout(() => {
        setLoading(false);
      }, 3000);
      return () => clearTimeout(loadingTimeout);
    }
  }, [loading]);

  if (!mounted || !hasHydrated) {
    return (
      <AppLayout>
        {isPerksOnlyHint ? <EmployeeHomePageSkeleton /> : <HomePageSkeleton />}
      </AppLayout>
    );
  }

  const isEmployee = isEmployeeUser(user);
  const perksOnly = isPerksOnlyUser(user);

  const handleBirthdaySave = async (birthday: string) => {
    try {
      await axios.put(
        `${getBaseUrl()}/api/users/${user?.id}/birthday`,
        { birthday },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      useAuthStore.getState().updateUser({ ...user, birthday });
      setShowBirthdayModal(false);
      toast.success('Birthday saved! Enjoy your birthday perk when the day comes.');
    } catch (error) {
      console.error('Failed to save birthday:', error);
      toast.error('Failed to save birthday. Please try again.');
    }
  };

  // Perks-only view (employees or company members who don't collect points)
  if (perksOnly) {
    return (
      <AppLayout>
        <EmployeeHome
          user={{
            name: user?.name || 'Employee',
            surname: user?.surname,
            email: user?.email,
            company: user?.company,
            id: user?.id || 0
          }}
          vouchers={vouchers}
          announcements={announcements}
          onScanQR={() => router.push('/app/vouchers')}
          onShowQR={() => {}}
          qrCodeUrl={qrCodeUrl || undefined}
          qrLoading={qrLoading}
        />

        {redeemedVoucher && (
          <VoucherRedeemedModal
            voucher={redeemedVoucher}
            onClose={() => setRedeemedVoucher(null)}
          />
        )}

        {showBirthdayModal && (
          <BirthdayCollectionModal
            userName={user?.name || 'there'}
            onSave={handleBirthdaySave}
            onSkip={() => setShowBirthdayModal(false)}
          />
        )}
      </AppLayout>
    );
  }

  // Customer view - matching .pen design exactly
  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-bg-primary">
          {/* Content */}
          <div className="px-4 pt-2 pb-24 space-y-3">
            {/* Header */}
            <div className="animate-stagger-item stagger-1 flex items-center justify-between">
              <span className="text-[16px] font-bold tracking-[3px] text-[#1C1917]" style={{ fontFamily: 'Spline Sans, sans-serif' }}>
                SARNIES
              </span>
              <button className="w-9 h-9 rounded-full border border-[#E7E5E4] flex items-center justify-center bg-white">
                <Bell className="w-4 h-4 text-[#1C1917]" />
              </button>
            </div>

            {/* Member Card */}
            <div className="animate-stagger-item stagger-2">
              <MemberHeroCard
                name={user?.name || "Guest"}
                memberId={user?.customer_id || `SAR-${String(user?.id || 0).padStart(6, '0')}`}
                qrCodeUrl={qrCodeUrl || undefined}
                qrLoading={qrLoading}
                userType={user?.user_type}
              />
            </div>

            {/* Points Progress Card */}
            <div className="animate-stagger-item stagger-3">
              <PointsProgressCard
                points={user?.points_balance || 0}
                nextRewardAt={3000}
              />
            </div>

            {/* Quick Actions */}
            <div className="animate-stagger-item stagger-4">
              <QuickActionsGrid
                onRewards={() => router.push("/app/vouchers")}
                onActivity={() => router.push("/app/activity")}
                onScan={() => {}}
              />
            </div>

            {/* Referral Card */}
            <div className="animate-stagger-item stagger-5">
              <ReferralCard
                onClick={() => router.push("/app/referrals")}
              />
            </div>

            {/* Partner Offers */}
            {partnerOffers.length > 0 && (
              <div className="animate-stagger-item stagger-6 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-purple-500" />
                    <p className="text-[11px] font-bold tracking-[1.5px] text-[#57534E]" style={{ fontFamily: 'Spline Sans, sans-serif' }}>
                      PARTNER OFFERS
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {partnerOffers.slice(0, 3).map((offer) => (
                    <PartnerOfferCard
                      key={offer.id}
                      offer={offer}
                      onClick={() => router.push(`/app/collabs/${offer.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Featured Rewards */}
            <div className="animate-stagger-item stagger-6 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold tracking-[1.5px] text-[#57534E]" style={{ fontFamily: 'Spline Sans, sans-serif' }}>
                  FEATURED REWARDS
                </p>
                <button
                  onClick={() => router.push('/app/vouchers')}
                  className="flex items-center gap-0.5 text-[12px] font-semibold text-[#DC2626]"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  View all
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {vouchers.filter(v => !v.voucher_type.includes('staff')).slice(0, 2).map((voucher) => (
                  <RewardCard
                    key={voucher.id}
                    title={voucher.title}
                    description={voucher.description}
                    imageUrl={voucher.image_url}
                    points={voucher.points_required || 'FREE'}
                    stock={voucher.max_redemptions_per_user ? `${voucher.max_redemptions_per_user - (voucher.redeemed_today || 0)} left` : undefined}
                    onClick={() => router.push(`/app/vouchers/${voucher.id}`)}
                  />
                ))}
                {vouchers.length === 0 && (
                  <div className="col-span-2 bg-white rounded-lg p-6 text-center border border-[#F0F0F0]">
                    <p className="text-[13px] text-[#78716C]">No rewards available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Voucher Redeemed Success Modal */}
      {redeemedVoucher && (
        <VoucherRedeemedModal
          voucher={redeemedVoucher}
          onClose={() => setRedeemedVoucher(null)}
        />
      )}
    </AppLayout>
  );
}

function VoucherRedeemedModal({
  voucher,
  onClose
}: {
  voucher: { voucher_title: string; outlet: string; cash_value: number };
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-5 animate-backdrop-fade"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-[320px] w-full text-center animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-full bg-[#FEE2E2] flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-9 h-9 text-[#DC2626]" />
        </div>
        <h2 className="text-[11px] font-bold tracking-[1.5px] text-[#78716C] mb-3" style={{ fontFamily: 'Spline Sans, sans-serif' }}>
          VOUCHER REDEEMED
        </h2>
        <p className="text-[16px] font-semibold text-[#1C1917] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          {voucher.voucher_title}
        </p>
        <p className="text-[14px] text-[#78716C] mb-4" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          at {voucher.outlet}
        </p>
        {voucher.cash_value > 0 && (
          <div className="inline-block bg-[#FEE2E2] text-[#DC2626] px-3 py-1 rounded-full text-[14px] font-medium mb-5" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            ฿{voucher.cash_value} Value
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full bg-[#1C1917] text-white py-3.5 rounded-xl font-semibold hover:bg-[#292524] transition-colors"
          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function BirthdayCollectionModal({
  userName,
  onSave,
  onSkip
}: {
  userName: string;
  onSave: (birthday: string) => void;
  onSkip: () => void;
}) {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [saving, setSaving] = useState(false);

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const getDaysInMonth = (monthNum: string) => {
    if (!monthNum) return 31;
    const daysMap: Record<string, number> = {
      '01': 31, '02': 29, '03': 31, '04': 30, '05': 31, '06': 30,
      '07': 31, '08': 31, '09': 30, '10': 31, '11': 30, '12': 31
    };
    return daysMap[monthNum] || 31;
  };

  const days = Array.from({ length: getDaysInMonth(month) }, (_, i) => {
    const d = String(i + 1).padStart(2, '0');
    return { value: d, label: String(i + 1) };
  });

  const handleSubmit = async () => {
    if (!month || !day) return;
    setSaving(true);
    await onSave(`${month}-${day}`);
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-5 animate-backdrop-fade"
    >
      <div
        className="bg-white rounded-xl p-6 max-w-[340px] w-full animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#FEE2E2] flex items-center justify-center">
            <Cake className="w-6 h-6 text-[#DC2626]" />
          </div>
          <button
            onClick={onSkip}
            className="w-8 h-8 rounded-xl bg-[#F5F5F4] flex items-center justify-center"
          >
            <X className="w-4 h-4 text-[#78716C]" />
          </button>
        </div>

        {/* Title */}
        <h2 className="text-[18px] font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          Hey {userName}!
        </h2>
        <p className="text-[14px] text-[#78716C] mb-5" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          When's your birthday? We'd love to celebrate with you and give you a special treat!
        </p>

        {/* Date Selection */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-[#78716C] tracking-[0.5px] mb-2 block" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              MONTH
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full h-12 px-3 bg-white border border-[#E7E5E4] rounded-xl text-[14px] text-[#1C1917] focus:outline-none focus:border-[#1C1917] transition-colors appearance-none"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              <option value="">Select</option>
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="text-[11px] font-semibold text-[#78716C] tracking-[0.5px] mb-2 block" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              DAY
            </label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-full h-12 px-3 bg-white border border-[#E7E5E4] rounded-xl text-[14px] text-[#1C1917] focus:outline-none focus:border-[#1C1917] transition-colors appearance-none"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              <option value="">Select</option>
              {days.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleSubmit}
            disabled={!month || !day || saving}
            className="w-full bg-[#1C1917] text-white py-3 rounded-xl font-medium text-[14px] disabled:opacity-50 disabled:cursor-not-allowed active:bg-[#292524] transition-colors"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            {saving ? 'Saving...' : 'Save Birthday'}
          </button>
          <button
            onClick={onSkip}
            className="w-full text-[#78716C] py-2 text-[13px] font-medium"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

function PartnerOfferCard({
  offer,
  onClick
}: {
  offer: CollabOffer;
  onClick: () => void;
}) {
  const getDiscountDisplay = () => {
    switch (offer.discount_type) {
      case 'percentage':
        return `${offer.discount_value}% off`;
      case 'fixed':
        return `$${offer.discount_value} off`;
      case 'free_item':
        return 'Free item';
      default:
        return '';
    }
  };

  const getDiscountIcon = () => {
    switch (offer.discount_type) {
      case 'percentage':
        return <Percent className="w-3.5 h-3.5" />;
      case 'fixed':
        return <DollarSign className="w-3.5 h-3.5" />;
      case 'free_item':
        return <Gift className="w-3.5 h-3.5" />;
      default:
        return <Gift className="w-3.5 h-3.5" />;
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl border border-[#F0F0F0] p-3 flex items-center gap-3 hover:border-purple-200 hover:shadow-sm transition-all text-left"
    >
      {/* Partner Logo */}
      <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center overflow-hidden flex-shrink-0">
        {offer.offering_company_logo ? (
          <img src={offer.offering_company_logo} alt={offer.offering_company_name} className="w-full h-full object-cover" />
        ) : (
          <Building2 className="w-6 h-6 text-purple-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#1C1917] truncate" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          {offer.title}
        </p>
        <p className="text-[12px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          at {offer.offering_company_name}
        </p>
      </div>

      {/* Discount Badge */}
      <div className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-[12px] font-semibold flex-shrink-0" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
        {getDiscountIcon()}
        {getDiscountDisplay()}
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-[#D6D3D1] flex-shrink-0" />
    </button>
  );
}
