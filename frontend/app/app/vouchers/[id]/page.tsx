'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import AppLayout from '@/components/AppLayout';
import QRModal from '@/components/QRModal';
import { useAuthStore } from '@/lib/store';
import { vouchersAPI } from '@/lib/api';
import { ArrowLeft, Star, Clock, Wallet, Calendar, Store, CheckCircle, QrCode, Info } from 'lucide-react';
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
          icon: '✅'
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

  const getEmoji = () => {
    if (!voucher) return '🎫';
    if (voucher.voucher_type === 'free_item') {
      const title = voucher.title.toLowerCase();
      if (title.includes('coffee') || title.includes('drink') || title.includes('latte')) return '☕';
      if (title.includes('cake') || title.includes('birthday')) return '🎂';
      if (title.includes('snack') || title.includes('food') || title.includes('sandwich')) return '🥪';
      return '🎁';
    }
    if (voucher.voucher_type === 'discount_amount' || voucher.voucher_type === 'percentage_discount') return '💰';
    if (voucher.voucher_type === 'merch') return '👕';
    return '🎫';
  };

  const getEmojiGradient = () => {
    if (!voucher) return 'from-stone-200 to-stone-300';
    const title = voucher.title.toLowerCase();
    if (voucher.voucher_type === 'free_item') {
      if (title.includes('coffee') || title.includes('drink') || title.includes('latte'))
        return 'from-amber-200 via-amber-100 to-orange-200';
      return 'from-stone-200 via-stone-100 to-amber-200';
    }
    if (voucher.voucher_type === 'discount_amount' || voucher.voucher_type === 'percentage_discount')
      return 'from-stone-300 via-stone-200 to-stone-100';
    if (voucher.voucher_type === 'merch')
      return 'from-violet-200 via-purple-100 to-fuchsia-200';
    return 'from-stone-200 to-stone-300';
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
      <div className="min-h-screen bg-bg-primary pb-24">
        <div className="max-w-2xl lg:max-w-4xl mx-auto">
          {/* Compact Hero with Overlay */}
          <div className="relative h-48 w-full overflow-hidden">
            {voucher.image_url ? (
              <Image
                src={voucher.image_url}
                alt={voucher.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 512px"
                priority
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${getEmojiGradient()} flex items-center justify-center`}>
                <span className="text-6xl">{getEmoji()}</span>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="absolute top-4 left-4 w-10 h-10 rounded-lg bg-white/90 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </button>

            {/* Featured Badge */}
            {voucher.is_featured && (
              <div className="absolute top-4 right-4 badge bg-white/90 backdrop-blur-sm">
                <Star className="w-3 h-3 text-accent fill-accent mr-1" />
                Featured
              </div>
            )}

            {/* Title overlaid on image */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
              <h1 className="text-heading text-text-inverse mb-1">
                {voucher.title}
              </h1>
              {voucher.cash_value > 0 && (
                <span className="badge bg-white/20 backdrop-blur-sm text-white border-0">
                  ฿{Number(voucher.cash_value).toFixed(0)} value
                </span>
              )}
            </div>
          </div>

          <div className="px-4 md:px-6 space-y-4 mt-4">
            {/* Description */}
            <p className="text-body text-text-tertiary leading-relaxed">
              {voucher.description}
            </p>

            {/* Detail Chips */}
            <div className="flex flex-wrap gap-2">
              {/* Points chip */}
              <div className="badge bg-surface border border-border">
                <Star className="w-3.5 h-3.5 text-accent fill-accent mr-1" />
                <span className="text-text-primary">
                  {isEmployee ? 'FREE' : `${voucher.points_required} pts`}
                </span>
              </div>

              {/* Your balance chip - customers only */}
              {!isEmployee && (
                <div className={`badge border ${
                  canRedeem()
                    ? 'bg-success-light border-success'
                    : 'bg-error-light border-error'
                }`}>
                  <Wallet className="w-3.5 h-3.5 text-text-tertiary mr-1" />
                  <span className={canRedeem() ? 'text-success' : 'text-error'}>
                    {user?.points_balance || 0} pts
                  </span>
                </div>
              )}

              {/* Expiry chip */}
              {formatExpiry() && (
                <div className="badge bg-surface border border-border">
                  <Calendar className="w-3.5 h-3.5 text-text-tertiary mr-1" />
                  <span className="text-text-secondary">
                    {formatExpiry()}
                  </span>
                </div>
              )}

              {/* Store chips */}
              {voucher.valid_stores && voucher.valid_stores.length > 0 ? (
                voucher.valid_stores.map((store, index) => (
                  <div key={index} className="badge bg-surface border border-border">
                    <Store className="w-3.5 h-3.5 text-text-tertiary mr-1" />
                    <span className="text-text-secondary">{store}</span>
                  </div>
                ))
              ) : (
                <div className="badge bg-text-primary text-text-inverse">
                  <Store className="w-3.5 h-3.5 mr-1" />
                  All Stores
                </div>
              )}
            </div>

            {/* Rules & Limitations */}
            {(voucher.rules || voucher.limitations) && (
              <div className="bg-warning-light rounded-lg border border-warning p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-surface rounded-md flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 text-warning" />
                  </div>
                  <div className="space-y-2">
                    {voucher.rules && (
                      <div>
                        <p className="text-caption font-semibold text-amber-800 mb-0.5">
                          Rules
                        </p>
                        <p className="text-body text-amber-800">
                          {voucher.rules}
                        </p>
                      </div>
                    )}
                    {voucher.limitations && (
                      <div>
                        <p className="text-caption font-semibold text-amber-800 mb-0.5">
                          Limitations
                        </p>
                        <p className="text-body text-amber-800">
                          {voucher.limitations}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Already Redeemed Today */}
            {redeemedToday && voucher.max_redemptions_per_user_per_day && (
              <div className="bg-stone-100 rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-surface rounded-md flex items-center justify-center">
                    <Clock className="w-4 h-4 text-text-tertiary" />
                  </div>
                  <div>
                    <p className="text-subheading text-text-primary">
                      Already Redeemed Today
                    </p>
                    <p className="text-caption text-text-tertiary">
                      Come back tomorrow for your next {voucher.title.toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Redeem Button */}
      <div className="fixed bottom-0 left-0 right-0 z-fixed">
        <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 pb-4 pt-3 bg-gradient-to-t from-stone-50 via-stone-50/95 to-stone-50/0">
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={!canRedeem() || redeeming || redeemedToday}
            className={`btn w-full h-14 rounded-lg text-base ${
              canRedeem() && !redeeming && !redeemedToday
                ? 'btn-primary'
                : 'bg-stone-200 text-text-tertiary cursor-not-allowed'
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
                <span>Redeem Now</span>
              </>
            ) : (
              <span>Need {voucher.points_required - (user?.points_balance || 0)} more points</span>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-xl max-w-sm w-full p-6 border border-border">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-stone-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">{getEmoji()}</span>
              </div>
              <h2 className="text-heading text-text-primary mb-1">
                Redeem Voucher?
              </h2>
              <p className="text-caption text-text-tertiary">
                {voucher.title}
              </p>
            </div>

            {!isEmployee && (
              <div className="bg-stone-100 rounded-lg p-4 mb-5 space-y-2">
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
              <div className="bg-amber-50 rounded-lg p-4 mb-5 text-center">
                <p className="text-subheading text-accent">
                  Employee Perk - No Points Required
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary flex-1 h-12 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className="btn-primary flex-1 h-12 rounded-lg disabled:opacity-50"
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
          className="fixed inset-0 z-modal bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setShowSuccessModal(false);
            router.push('/app/vouchers');
          }}
        >
          <div
            className="bg-surface rounded-xl p-6 max-w-sm w-full text-center border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success Icon */}
            <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-success" />
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
              <div className="badge-default rounded-lg px-4 py-2 mb-5 mx-auto">
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
              className="btn-primary w-full h-12 rounded-lg"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
