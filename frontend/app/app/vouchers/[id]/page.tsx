'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import AppLayout from '@/components/AppLayout';
import QRModal from '@/components/QRModal';
import { useAuthStore } from '@/lib/store';
import { vouchersAPI } from '@/lib/api';
import { ArrowLeft, Star, Clock, QrCode, MapPin, Coffee, Cake, Gift, Coins, Shirt, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { io, Socket } from 'socket.io-client';
import { getWebSocketUrl } from '@/lib/config';
import { isEmployeeUser } from '@/lib/authUtils';

interface Voucher {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  points_required: number;
  cash_value: number;
  voucher_type: string;
  expiry_type: string;
  expiry_date?: string;
  expiry_days?: number;
  is_staff_voucher: boolean;
  is_featured: boolean;
  valid_stores: string[];
  rules?: string;
  limitations?: string;
  max_redemptions_per_user_per_day?: number;
}

export default function VoucherDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, token, updateUser } = useAuthStore();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeemedToday, setRedeemedToday] = useState(false);

  // Enable swipe-back gesture
  useSwipeBack();
  const [redeeming, setRedeeming] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [voucherQR, setVoucherQR] = useState('');
  const [qrExpiresAt, setQrExpiresAt] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redeemedVoucherData, setRedeemedVoucherData] = useState<{
    voucher_title: string;
    outlet: string;
    cash_value: number;
  } | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const isEmployee = isEmployeeUser(user);

  useEffect(() => {
    if (params.id) {
      fetchVoucher();
    }
  }, [params.id]);

  // WebSocket connection for real-time voucher redemption feedback
  useEffect(() => {
    if (!user?.id || !token) return;

    const wsUrl = getWebSocketUrl();

    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('authenticate', token);
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
        setShowQRModal(false);
        setRedeemedVoucherData({
          voucher_title: data.voucher_title,
          outlet: data.outlet,
          cash_value: data.cash_value
        });
        setShowSuccessModal(true);

        toast.success(`${data.voucher_title} redeemed successfully!`, {
          duration: 4000,
        });
      }, 800);
    });

    socket.on('disconnect', () => {
      // Connection lost - will auto-reconnect
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, token]);

  const fetchVoucher = async () => {
    try {
      const response = await vouchersAPI.getOne(Number(params.id));
      setVoucher(response.data);

      if (response.data.max_redemptions_per_user_per_day && user) {
        await checkTodayRedemption(response.data.id);
      }
    } catch (error) {
      toast.error('Failed to load voucher details');
      router.push('/app/vouchers');
    } finally {
      setLoading(false);
    }
  };

  const checkTodayRedemption = async (voucherId: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/vouchers/${voucherId}/today-redemption`, {
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        }
      });
      const data = await response.json();
      setRedeemedToday(data.redeemed_today || false);
    } catch (error) {
      console.error('Failed to check today redemption:', error);
    }
  };

  const handleRedeem = async () => {
    if (!voucher || !user) return;

    setRedeeming(true);
    try {
      const response = await vouchersAPI.redeem(voucher.id, user.id);
      const { voucher_instance } = response.data;

      const newBalance = (user.points_balance || 0) - voucher.points_required;
      updateUser({ ...user, points_balance: newBalance });

      setVoucherQR(voucher_instance.qr_code_data);
      setQrExpiresAt(voucher_instance.expires_at);
      setShowConfirmModal(false);
      setShowQRModal(true);

      toast.success('Voucher redeemed successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to redeem voucher');
    } finally {
      setRedeeming(false);
    }
  };

  const canRedeem = () => {
    if (isEmployee) return true;
    return (user?.points_balance || 0) >= (voucher?.points_required || 0);
  };

  const formatExpiry = () => {
    if (!voucher) return '';

    if (voucher.expiry_type === 'no_expiry') {
      return 'No expiry';
    } else if (voucher.expiry_type === 'days_after_redeem' && voucher.expiry_days) {
      return `${voucher.expiry_days}d after redeem`;
    } else if (voucher.expiry_type === 'fixed_date' && voucher.expiry_date) {
      return new Date(voucher.expiry_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return '';
  };

  const getVoucherIcon = () => {
    if (!voucher) return <Ticket className="w-7 h-7 text-red-600" />;
    const t = voucher.title.toLowerCase();
    if (voucher.voucher_type === 'free_item') {
      if (t.includes('coffee') || t.includes('drink') || t.includes('latte')) return <Coffee className="w-7 h-7 text-red-600" />;
      if (t.includes('cake') || t.includes('birthday')) return <Cake className="w-7 h-7 text-red-600" />;
      return <Gift className="w-7 h-7 text-red-600" />;
    }
    if (voucher.voucher_type === 'discount_amount' || voucher.voucher_type === 'percentage_discount') return <Coins className="w-7 h-7 text-red-600" />;
    if (voucher.voucher_type === 'merch') return <Shirt className="w-7 h-7 text-red-600" />;
    return <Ticket className="w-7 h-7 text-red-600" />;
  };

  const getFallbackImage = () => {
    if (!voucher) return '/images/content/vouchers/bakery.jpg';
    const t = voucher.title.toLowerCase();
    if (voucher.voucher_type === 'merch') return '/images/content/vouchers/merch.jpg';
    if (voucher.voucher_type === 'discount_amount' || voucher.voucher_type === 'percentage_discount')
      return '/images/content/vouchers/coffee-beans.jpg';
    if (voucher.voucher_type === 'free_item') {
      if (t.includes('coffee') || t.includes('drink') || t.includes('latte') || t.includes('espresso'))
        return '/images/content/vouchers/coffee.jpg';
      if (t.includes('pastry') || t.includes('cake') || t.includes('croissant') || t.includes('birthday'))
        return '/images/content/vouchers/pastry.jpg';
      return '/images/content/vouchers/bakery.jpg';
    }
    return '/images/content/vouchers/bakery.jpg';
  };

  // Merge rules + limitations into a single condensed string
  const getTermsText = () => {
    if (!voucher) return '';
    const parts: string[] = [];
    if (voucher.rules) parts.push(voucher.rules);
    if (voucher.limitations && voucher.limitations !== voucher.rules) parts.push(voucher.limitations);
    return parts.join('. ').replace(/\.\./g, '.');
  };

  const storesLabel = () => {
    if (!voucher) return 'All stores';
    if (voucher.valid_stores && voucher.valid_stores.length > 0) {
      return voucher.valid_stores.join(', ');
    }
    return 'All stores';
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-bg-primary">
          <div className="max-w-2xl lg:max-w-4xl mx-auto animate-pulse p-4 md:p-6 space-y-4">
            <div className="h-10 bg-stone-200 rounded-lg w-1/3" />
            <div className="h-48 bg-stone-200 rounded-lg" />
            <div className="h-6 bg-stone-200 rounded-lg w-3/4" />
            <div className="h-20 bg-stone-200 rounded-lg" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!voucher) {
    return null;
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-bg-primary pb-36">
        <div className="max-w-2xl lg:max-w-4xl mx-auto">
          {/* Header - consistent with news detail */}
          <header className="bg-surface border-b border-border px-4 md:px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </button>
            <h1 className="text-subheading text-text-primary">
              Voucher
            </h1>
          </header>

          {/* Image */}
          <div className="relative h-48 w-full overflow-hidden">
            <Image
              src={voucher.image_url || getFallbackImage()}
              alt={voucher.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 512px"
              priority
            />
          </div>

          {/* Content — clean white, separated from image */}
          <div className="px-5 md:px-6 space-y-4 mt-5">

            {/* Title */}
            <div>
              <h1 className="text-heading text-text-primary">{voucher.title}</h1>

              {/* Inline meta — hide defaults (Free for employee, No expiry, zero cost) */}
              {(() => {
                const parts: React.ReactNode[] = [];
                // Show points cost only when > 0 and not employee
                if (!isEmployee && voucher.points_required > 0) {
                  parts.push(<span key="pts" className="font-semibold text-text-primary">{voucher.points_required} pts</span>);
                }
                // Show expiry only when not "no_expiry"
                if (voucher.expiry_type !== 'no_expiry' && formatExpiry()) {
                  parts.push(<span key="exp">{formatExpiry()}</span>);
                }
                // Show cash value only when > 0
                if (voucher.cash_value > 0) {
                  parts.push(<span key="val">฿{Number(voucher.cash_value).toFixed(0)} value</span>);
                }
                if (parts.length === 0) return null;
                return (
                  <p className="text-caption text-text-tertiary mt-1.5">
                    {parts.map((part, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="mx-1.5 text-stone-300">·</span>}
                        {part}
                      </React.Fragment>
                    ))}
                  </p>
                );
              })()}

              {/* Balance indicator — customers only */}
              {!isEmployee && (
                <p className={`text-caption mt-1 ${canRedeem() ? 'text-success' : 'text-error'}`}>
                  You have {user?.points_balance || 0} pts
                  {!canRedeem() && ` — need ${voucher.points_required - (user?.points_balance || 0)} more`}
                </p>
              )}
            </div>

            {/* Description */}
            <p className="text-body text-text-secondary leading-relaxed">
              {voucher.description}
            </p>

            {/* Already Redeemed Today */}
            {redeemedToday && voucher.max_redemptions_per_user_per_day && (
              <div className="bg-stone-100 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                  <div>
                    <p className="text-subheading text-text-primary">Already redeemed today</p>
                    <p className="text-caption text-text-tertiary">
                      Come back tomorrow for your next {voucher.title.toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* How to use — single line */}
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <p className="text-body text-text-secondary">Tap <span className="font-semibold">Use Voucher</span> → show QR to staff</p>
            </div>

            {/* Eligible outlets — only show when specific stores */}
            {voucher.valid_stores && voucher.valid_stores.length > 0 && (
              <div>
                <p className="text-label mb-2">Eligible outlets</p>
                <div className="flex items-center gap-2 text-body text-text-secondary">
                  <MapPin className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                  <span>{voucher.valid_stores.join(', ')}</span>
                </div>
              </div>
            )}

            {/* Terms */}
            {getTermsText() && (
              <div>
                <p className="text-label mb-2">Terms</p>
                <p className="text-caption text-text-tertiary leading-relaxed">
                  {getTermsText()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky CTA — sits above bottom nav */}
      <div className="fixed bottom-[64px] left-0 right-0 z-fixed pb-safe">
        <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 pb-3 pt-3 bg-gradient-to-t from-[#FDFDFD] via-[#FDFDFD]/95 to-[#FDFDFD]/0">
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={!canRedeem() || redeeming || redeemedToday}
            className={`btn w-full h-14 rounded-xl text-base shadow-lg ${
              canRedeem() && !redeeming && !redeemedToday
                ? 'btn-primary'
                : 'bg-stone-200 text-text-tertiary cursor-not-allowed shadow-none'
            }`}
          >
            {redeeming ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Redeeming...</span>
              </>
            ) : redeemedToday ? (
              <span>Already Redeemed Today</span>
            ) : canRedeem() ? (
              <>
                <QrCode className="w-5 h-5" />
                <span>Use Voucher</span>
              </>
            ) : (
              <span>Need {voucher.points_required - (user?.points_balance || 0)} more points</span>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-backdrop-fade">
          <div className="bg-surface rounded-xl max-w-sm w-full p-6 border border-border animate-scale-up">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                {getVoucherIcon()}
              </div>
              <h2 className="text-heading text-text-primary mb-1">
                Use Voucher?
              </h2>
              <p className="text-caption text-text-tertiary">
                {voucher.title}
              </p>
            </div>

            {!isEmployee && (
              <div className="bg-stone-100 rounded-xl p-4 mb-5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-body text-text-tertiary">Points to deduct</span>
                  <span className="text-subheading text-text-primary">{voucher.points_required} pts</span>
                </div>
                <div className="border-t border-border" />
                <div className="flex justify-between items-center">
                  <span className="text-body text-text-tertiary">Current balance</span>
                  <span className="text-subheading text-text-primary">{user?.points_balance || 0} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body text-text-tertiary">New balance</span>
                  <span className="text-subheading text-success">{(user?.points_balance || 0) - voucher.points_required} pts</span>
                </div>
              </div>
            )}

            {isEmployee && (
              <div className="bg-stone-100 rounded-xl p-4 mb-5 text-center">
                <p className="text-subheading text-text-primary">
                  Employee Perk — No Points Required
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary flex-1 h-12 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className="btn-primary flex-1 h-12 rounded-xl disabled:opacity-50"
              >
                {redeeming ? 'Redeeming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => {
          setShowQRModal(false);
          router.push('/app/vouchers');
        }}
        title={voucher.title}
        qrDataUrl={voucherQR}
        expiresAt={qrExpiresAt}
        description="Show this QR code to staff to use your voucher"
      />

      {/* Success Modal */}
      {showSuccessModal && redeemedVoucherData && (
        <div
          className="fixed inset-0 z-modal bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-backdrop-fade"
          onClick={() => {
            setShowSuccessModal(false);
            router.push('/app/vouchers');
          }}
        >
          <div
            className="bg-surface rounded-xl p-6 max-w-sm w-full text-center border border-border animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full bg-stone-900 flex items-center justify-center mx-auto mb-5">
              <img src="/images/content/milestones/trophy.gif" alt="" className="w-12 h-12" />
            </div>

            <h2 className="text-heading text-text-primary mb-1">
              Voucher Redeemed!
            </h2>

            <p className="text-subheading text-text-primary mb-1">
              {redeemedVoucherData.voucher_title}
            </p>

            <p className="text-caption text-text-tertiary mb-5">
              at {redeemedVoucherData.outlet}
            </p>

            {redeemedVoucherData.cash_value > 0 && (
              <div className="bg-stone-100 rounded-lg px-4 py-2 mb-5 inline-flex">
                <span className="text-subheading text-text-primary">
                  ฿{redeemedVoucherData.cash_value} Value
                </span>
              </div>
            )}

            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/app/vouchers');
              }}
              className="btn-primary w-full h-12 rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
