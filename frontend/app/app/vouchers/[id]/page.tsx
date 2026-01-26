'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import AppLayout from '@/components/AppLayout';
import QRModal from '@/components/QRModal';
import { useAuthStore } from '@/lib/store';
import { vouchersAPI } from '@/lib/api';
import { ArrowLeft, Gift, Clock, MapPin, AlertCircle, Star, Wallet, DollarSign, Calendar, Store, Sparkles, CheckCircle, Coffee, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { io, Socket } from 'socket.io-client';
import { getWebSocketUrl } from '@/lib/config';

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

  useEffect(() => {
    if (params.id) {
      fetchVoucher();
    }
  }, [params.id]);

  // WebSocket connection for real-time voucher redemption feedback
  useEffect(() => {
    if (!user?.id || !token) return;

    const wsUrl = getWebSocketUrl();
    console.log('🔌 [Voucher Detail] Connecting to WebSocket:', wsUrl);

    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ [Voucher Detail] WebSocket connected, authenticating user:', user.id);
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
      console.log('🎉 [Voucher Detail] Voucher redeemed event received:', data);

      // Small delay for better UX - let scanning animation complete
      setTimeout(() => {
        // Close the QR modal and show success
        setShowQRModal(false);
        setRedeemedVoucherData({
          voucher_title: data.voucher_title,
          outlet: data.outlet,
          cash_value: data.cash_value
        });
        setShowSuccessModal(true);

        // Also show a toast
        toast.success(`${data.voucher_title} redeemed successfully!`, {
          duration: 4000,
          icon: '✅'
        });
      }, 800);
    });

    socket.on('disconnect', () => {
      console.log('❌ [Voucher Detail] WebSocket disconnected');
    });

    return () => {
      console.log('🔌 [Voucher Detail] Cleaning up WebSocket connection');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, token]);

  const fetchVoucher = async () => {
    try {
      const response = await vouchersAPI.getOne(Number(params.id));
      setVoucher(response.data);

      // Check if user has redeemed this voucher today (for daily limit vouchers)
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

      // Update user points balance
      const newBalance = (user.points_balance || 0) - voucher.points_required;
      updateUser({ ...user, points_balance: newBalance });

      // Show QR modal
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
    return (user?.points_balance || 0) >= (voucher?.points_required || 0);
  };

  const formatExpiry = () => {
    if (!voucher) return '';

    if (voucher.expiry_type === 'no_expiry') {
      return 'No expiry';
    } else if (voucher.expiry_type === 'days_after_redeem' && voucher.expiry_days) {
      return `${voucher.expiry_days} days after redemption`;
    } else if (voucher.expiry_type === 'fixed_date' && voucher.expiry_date) {
      return new Date(voucher.expiry_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return '';
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="bg-white min-h-screen">
          <div className="animate-pulse space-y-4 p-6">
            <div className="h-8 bg-black/5 rounded w-1/4" />
            <div className="aspect-[16/9] bg-black/5 rounded-2xl" />
            <div className="h-6 bg-black/5 rounded w-3/4" />
            <div className="h-20 bg-black/5 rounded-xl" />
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
      <div className="bg-white min-h-screen pb-6">
        {/* Header with Back Button */}
        <div className="bg-white border-b border-black/10 sticky top-0 z-40 px-6 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-black/50 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="sarnies-subhead">Back to Vouchers</span>
          </button>
        </div>

        <div className="px-6 py-6">
          {/* Conditional Hero Image - Only for vouchers with actual product images */}
          {voucher.voucher_type !== 'percentage_discount' && voucher.voucher_type !== 'discount_amount' && voucher.image_url && (
            <div className="relative aspect-[16/9] bg-black/5 rounded-2xl overflow-hidden mb-6">
              <Image
                src={voucher.image_url}
                alt={voucher.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 512px, (max-width: 1024px) 768px, 1280px"
                priority
              />

              {/* Value Badge - Bottom Right */}
              <div className="absolute bottom-4 right-4">
                <div className="bg-white px-4 py-2 rounded-full shadow-lg">
                  <span className="sarnies-subhead text-black">฿{Number(voucher.cash_value).toFixed(2)}</span>
                </div>
              </div>

              {/* Featured Badge - Top Left */}
              {voucher.is_featured && (
                <div className="absolute top-4 left-4">
                  <div className="bg-black text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <Star className="w-3.5 h-3.5 fill-white" />
                    <span className="sarnies-caption">FEATURED</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hero Header with Badges - For discount vouchers without product images */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              {voucher.is_featured && (
                <div className="bg-black text-white px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-white" />
                  <span className="sarnies-caption">FEATURED</span>
                </div>
              )}
              <div className="bg-black/5 px-4 py-1.5 rounded-full border border-black/10">
                <span className="sarnies-subhead text-black">฿{Number(voucher.cash_value).toFixed(2)}</span>
              </div>
            </div>

            {/* Title & Description */}
            <h1 className="sarnies-title-md text-black mb-3">{voucher.title.toUpperCase()}</h1>
            <p className="sarnies-body text-black/60">{voucher.description}</p>
          </div>

          {/* Details Card with Icons - Compact 56px rows */}
          <div className="bg-white rounded-2xl border border-black/10 p-6 mb-6">
            <h2 className="sarnies-headline text-black mb-4">REWARD DETAILS</h2>

            <div className="space-y-0">
              {/* Points Required */}
              <div className="flex items-center justify-between h-14 border-b border-black/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-black/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 text-black" />
                  </div>
                  <span className="sarnies-footnote text-black/60">Points Required</span>
                </div>
                <span className="sarnies-subhead text-black">{voucher.points_required} pts</span>
              </div>

              {/* Your Points */}
              <div className="flex items-center justify-between h-14 border-b border-black/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-black/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-4 h-4 text-black" />
                  </div>
                  <span className="sarnies-footnote text-black/60">Your Points</span>
                </div>
                <span className="sarnies-subhead text-black">{user?.points_balance || 0} pts</span>
              </div>

              {/* Value */}
              <div className="flex items-center justify-between h-14 border-b border-black/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-black/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-black" />
                  </div>
                  <span className="sarnies-footnote text-black/60">Value</span>
                </div>
                <span className="sarnies-subhead text-black">฿{Number(voucher.cash_value).toFixed(2)}</span>
              </div>

              {/* Expiry */}
              <div className="flex items-center justify-between h-14 border-b border-black/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-black/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-black" />
                  </div>
                  <span className="sarnies-footnote text-black/60">Expiry</span>
                </div>
                <span className="sarnies-footnote text-black text-right">
                  {formatExpiry() || 'No expiry'}
                </span>
              </div>

              {/* Valid Stores */}
              <div className="flex items-center justify-between min-h-14 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-black/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Store className="w-4 h-4 text-black" />
                  </div>
                  <span className="sarnies-footnote text-black/60">Valid Stores</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-end max-w-[55%]">
                  {voucher.valid_stores && voucher.valid_stores.length > 0 ? (
                    voucher.valid_stores.map((store, index) => (
                      <span
                        key={index}
                        className="inline-block px-2.5 py-1 bg-black/5 text-black text-xs font-medium rounded-full border border-black/10"
                      >
                        {store}
                      </span>
                    ))
                  ) : (
                    <span className="inline-block px-2.5 py-1 bg-black text-white text-xs font-medium rounded-full">
                      All Stores
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rules */}
          {voucher.rules && (
            <div className="bg-black/5 border border-black/10 rounded-xl p-5 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-black/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="sarnies-subhead text-black mb-1.5">Rules</h3>
                  <p className="sarnies-footnote text-black/60">{voucher.rules}</p>
                </div>
              </div>
            </div>
          )}

          {/* Limitations */}
          {voucher.limitations && (
            <div className="bg-black/5 border border-black/10 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-black/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="sarnies-subhead text-black mb-1.5">Limitations</h3>
                  <p className="sarnies-footnote text-black/60">{voucher.limitations}</p>
                </div>
              </div>
            </div>
          )}

          {/* Already Redeemed Today Message */}
          {redeemedToday && voucher.max_redemptions_per_user_per_day && (
            <div className="mb-4 p-4 bg-black/5 border border-black/10 rounded-xl">
              <div className="flex items-center gap-2 text-black/70">
                <Clock className="w-5 h-5" />
                <div>
                  <p className="sarnies-subhead text-black">Already Redeemed Today</p>
                  <p className="sarnies-footnote text-black/50">Come back tomorrow for your next {voucher.title.toLowerCase()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Redeem Button - Employee uses mustard, Customer uses black */}
          {user?.user_type === 'employee' ? (
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={redeeming || redeemedToday}
              className={`w-full h-14 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 ${
                !redeeming && !redeemedToday
                  ? 'bg-mustard text-black hover:bg-mustard-dark active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {redeeming ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Redeeming...</span>
                </>
              ) : redeemedToday ? (
                <span>Already Redeemed Today</span>
              ) : (
                <>
                  <QrCode className="w-5 h-5" />
                  <span>Tap to Redeem</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!canRedeem() || redeeming || redeemedToday}
              className={`w-full h-14 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                canRedeem() && !redeeming && !redeemedToday
                  ? 'bg-black text-white hover:bg-black/90 active:scale-[0.98]'
                  : 'bg-black/20 text-black/40 cursor-not-allowed'
              }`}
            >
              {redeeming ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="sarnies-subhead">Redeeming...</span>
                </>
              ) : redeemedToday ? (
                <span className="sarnies-subhead">Already Redeemed Today</span>
              ) : canRedeem() ? (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span className="sarnies-subhead">REDEEM NOW</span>
                </>
              ) : (
                <span className="sarnies-subhead">Need {voucher.points_required - (user?.points_balance || 0)} more points</span>
              )}
            </button>
          )}

          {/* How It Works - Structured Stepper */}
          <div className="mt-8 bg-white rounded-2xl border border-black/10 p-6">
            <h3 className="sarnies-headline text-black mb-6">HOW TO REDEEM</h3>
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4 pb-4 border-b border-black/10 last:border-0 last:pb-0">
                <div className="flex-shrink-0 w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="sarnies-subhead text-black mb-1">Step 1 — Redeem</h4>
                  <p className="sarnies-footnote text-black/50">Tap "Redeem Now" to generate a QR code</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 pb-4 border-b border-black/10 last:border-0 last:pb-0">
                <div className="flex-shrink-0 w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="sarnies-subhead text-black mb-1">Step 2 — Show QR</h4>
                  <p className="sarnies-footnote text-black/50">Present the code to staff at checkout</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 pb-4 border-b border-black/10 last:border-0 last:pb-0">
                <div className="flex-shrink-0 w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold text-sm">
                  3
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="sarnies-subhead text-black mb-1">Step 3 — Scan</h4>
                  <p className="sarnies-footnote text-black/50">Staff will scan and apply your reward instantly</p>
                </div>
              </div>

              {/* Expiration Warning */}
              <div className="flex gap-4 mt-4 bg-black/5 rounded-xl p-4 border border-black/10">
                <div className="flex-shrink-0 w-10 h-10 bg-black/10 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-black" />
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="sarnies-subhead text-black mb-1">Expiration — 10 minutes</h4>
                  <p className="sarnies-footnote text-black/50">Use your voucher immediately after redemption</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-7 border border-black/10">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-black" />
              </div>
              <h2 className="sarnies-title-sm text-black mb-2">REDEEM VOUCHER?</h2>
              <p className="sarnies-footnote text-black/50">{voucher.title}</p>
            </div>

            <div className="bg-black/5 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="sarnies-footnote text-black/60">Points to deduct</span>
                <span className="sarnies-subhead text-black">{voucher.points_required} pts</span>
              </div>
              <div className="border-t border-black/10"></div>
              <div className="flex justify-between items-center">
                <span className="sarnies-footnote text-black/60">Current balance</span>
                <span className="sarnies-subhead text-black">{user?.points_balance || 0} pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="sarnies-footnote text-black/60">New balance</span>
                <span className="sarnies-subhead text-black">{(user?.points_balance || 0) - voucher.points_required} pts</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-white border-2 border-black/10 text-black py-3.5 rounded-xl font-semibold hover:bg-black/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className="flex-1 bg-black text-white py-3.5 rounded-xl font-semibold hover:bg-black/90 transition-colors disabled:opacity-50"
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

      {/* Voucher Redeemed Success Modal */}
      {showSuccessModal && redeemedVoucherData && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setShowSuccessModal(false);
            router.push('/app/vouchers');
          }}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>

            {/* Title */}
            <h2 className="sarnies-title-sm text-black mb-2">VOUCHER REDEEMED!</h2>

            {/* Voucher Name */}
            <p className="sarnies-headline text-black mb-1">{redeemedVoucherData.voucher_title}</p>

            {/* Location */}
            <p className="sarnies-body text-black/50 mb-6">at {redeemedVoucherData.outlet}</p>

            {/* Value Badge */}
            {redeemedVoucherData.cash_value > 0 && (
              <div className="inline-flex items-center gap-2 bg-black/5 rounded-full px-4 py-2 mb-6">
                <span className="sarnies-subhead text-black">฿{redeemedVoucherData.cash_value} Value</span>
              </div>
            )}

            {/* Dismiss Button */}
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/app/vouchers');
              }}
              className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-black/90 transition-colors active:scale-[0.98]"
            >
              <span className="sarnies-subhead">DONE</span>
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
