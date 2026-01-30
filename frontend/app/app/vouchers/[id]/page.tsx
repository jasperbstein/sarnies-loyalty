'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import AppLayout from '@/components/AppLayout';
import QRModal from '@/components/QRModal';
import { useAuthStore } from '@/lib/store';
import { vouchersAPI } from '@/lib/api';
import { ArrowLeft, Star, Clock, MapPin, AlertCircle, Wallet, Calendar, Store, Sparkles, CheckCircle, QrCode, Info } from 'lucide-react';
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

  const isEmployee = user?.user_type === 'employee';

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
    if (isEmployee) return true; // Employees don't need points
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

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-[#FAFAF9]">
          <div className="animate-pulse p-4 space-y-4">
            <div className="h-10 bg-[#E7E5E4] rounded-xl w-1/3" />
            <div className="aspect-[4/3] bg-[#E7E5E4] rounded-xl" />
            <div className="h-6 bg-[#E7E5E4] rounded-xl w-3/4" />
            <div className="h-32 bg-[#E7E5E4] rounded-xl" />
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
      <div className="min-h-screen bg-[#FAFAF9] pb-6">
        {/* Header */}
        <header className="bg-[#FAFAF9] px-4 pt-4 pb-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#78716C]"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E7E5E4] flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-[#1C1917]" />
            </div>
            <span className="text-[14px]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              Back
            </span>
          </button>
        </header>

        <div className="px-4 space-y-4">
          {/* Hero Image or Emoji */}
          <div className="relative w-full aspect-[4/3] bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
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
              <div className="w-full h-full flex items-center justify-center bg-[#F5F5F4]">
                <span className="text-[72px]">{getEmoji()}</span>
              </div>
            )}

            {/* Featured Badge */}
            {voucher.is_featured && (
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#1C1917] rounded-lg flex items-center gap-1">
                <Star className="w-3 h-3 text-white fill-white" />
                <span className="text-[10px] font-semibold text-white uppercase tracking-wide" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Featured
                </span>
              </div>
            )}

            {/* Value Badge */}
            {voucher.cash_value > 0 && (
              <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-white rounded-lg border border-[#E7E5E4]">
                <span className="text-[14px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  ฿{Number(voucher.cash_value).toFixed(0)} value
                </span>
              </div>
            )}
          </div>

          {/* Title & Description */}
          <div>
            <h1 className="text-[20px] font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              {voucher.title}
            </h1>
            <p className="text-[14px] text-[#78716C] leading-relaxed" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              {voucher.description}
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E7E5E4]">
              <p className="text-[11px] font-semibold text-[#78716C] tracking-[1px] uppercase" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Details
              </p>
            </div>

            <div className="divide-y divide-[#E7E5E4]">
              {/* Points Required */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#F5F5F4] rounded-lg flex items-center justify-center">
                    <Star className="w-4 h-4 text-[#1C1917]" />
                  </div>
                  <span className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    {isEmployee ? 'Cost' : 'Points Required'}
                  </span>
                </div>
                <span className="text-[14px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  {isEmployee ? 'FREE' : `${voucher.points_required} pts`}
                </span>
              </div>

              {/* Your Points - Only for customers */}
              {!isEmployee && (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#F5F5F4] rounded-lg flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-[#1C1917]" />
                    </div>
                    <span className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                      Your Points
                    </span>
                  </div>
                  <span className={`text-[14px] font-semibold ${canRedeem() ? 'text-[#16A34A]' : 'text-[#DC2626]'}`} style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    {user?.points_balance || 0} pts
                  </span>
                </div>
              )}

              {/* Expiry */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#F5F5F4] rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-[#1C1917]" />
                  </div>
                  <span className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    Expiry
                  </span>
                </div>
                <span className="text-[14px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  {formatExpiry() || 'No expiry'}
                </span>
              </div>

              {/* Valid Stores */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#F5F5F4] rounded-lg flex items-center justify-center">
                    <Store className="w-4 h-4 text-[#1C1917]" />
                  </div>
                  <span className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    Valid At
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end max-w-[50%]">
                  {voucher.valid_stores && voucher.valid_stores.length > 0 ? (
                    voucher.valid_stores.map((store, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-[#F5F5F4] text-[#1C1917] text-[11px] font-medium rounded-md"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        {store}
                      </span>
                    ))
                  ) : (
                    <span className="px-2 py-0.5 bg-[#1C1917] text-white text-[11px] font-medium rounded-md" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                      All Stores
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rules & Limitations */}
          {(voucher.rules || voucher.limitations) && (
            <div className="bg-[#FEF3C7] rounded-xl border border-[#FCD34D] p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <Info className="w-4 h-4 text-[#D97706]" />
                </div>
                <div className="space-y-2">
                  {voucher.rules && (
                    <div>
                      <p className="text-[12px] font-semibold text-[#92400E] mb-0.5" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                        Rules
                      </p>
                      <p className="text-[13px] text-[#92400E]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                        {voucher.rules}
                      </p>
                    </div>
                  )}
                  {voucher.limitations && (
                    <div>
                      <p className="text-[12px] font-semibold text-[#92400E] mb-0.5" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                        Limitations
                      </p>
                      <p className="text-[13px] text-[#92400E]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
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
            <div className="bg-[#F5F5F4] rounded-xl border border-[#E7E5E4] p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-[#78716C]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    Already Redeemed Today
                  </p>
                  <p className="text-[12px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    Come back tomorrow for your next {voucher.title.toLowerCase()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Redeem Button */}
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={!canRedeem() || redeeming || redeemedToday}
            className={`w-full h-14 rounded-xl font-semibold text-[15px] transition-all flex items-center justify-center gap-2 ${
              canRedeem() && !redeeming && !redeemedToday
                ? isEmployee
                  ? 'bg-[#D97706] text-white active:scale-[0.98]'
                  : 'bg-[#1C1917] text-white active:scale-[0.98]'
                : 'bg-[#E7E5E4] text-[#A8A29E] cursor-not-allowed'
            }`}
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
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

          {/* How It Works */}
          <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E7E5E4]">
              <p className="text-[11px] font-semibold text-[#78716C] tracking-[1px] uppercase" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                How to Redeem
              </p>
            </div>

            <div className="p-4 space-y-4">
              {[
                { step: 1, title: 'Tap Redeem', desc: 'Generate a QR code for your voucher' },
                { step: 2, title: 'Show QR', desc: 'Present the code to staff at checkout' },
                { step: 3, title: 'Enjoy!', desc: 'Staff will scan and apply your reward' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className="w-8 h-8 bg-[#1C1917] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-[12px] font-bold text-white">{step}</span>
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[14px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                      {title}
                    </p>
                    <p className="text-[12px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                      {desc}
                    </p>
                  </div>
                </div>
              ))}

              {/* Expiration Warning */}
              <div className="flex gap-3 bg-[#F5F5F4] rounded-lg p-3 mt-2">
                <Clock className="w-4 h-4 text-[#78716C] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  QR codes expire after 10 minutes. Use immediately after redeeming.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 border border-[#E7E5E4]">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-[#F5F5F4] rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-[32px]">{getEmoji()}</span>
              </div>
              <h2 className="text-[18px] font-semibold text-[#1C1917] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Redeem Voucher?
              </h2>
              <p className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                {voucher.title}
              </p>
            </div>

            {!isEmployee && (
              <div className="bg-[#F5F5F4] rounded-xl p-4 mb-5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Points to deduct</span>
                  <span className="text-[14px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>{voucher.points_required} pts</span>
                </div>
                <div className="border-t border-[#E7E5E4]" />
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Current balance</span>
                  <span className="text-[14px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>{user?.points_balance || 0} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>New balance</span>
                  <span className="text-[14px] font-semibold text-[#16A34A]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>{(user?.points_balance || 0) - voucher.points_required} pts</span>
                </div>
              </div>
            )}

            {isEmployee && (
              <div className="bg-[#FEF3C7] rounded-xl p-4 mb-5 text-center">
                <p className="text-[14px] font-semibold text-[#D97706]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Employee Perk - No Points Required
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 h-12 bg-white border border-[#E7E5E4] text-[#1C1917] rounded-xl font-semibold text-[14px] active:scale-[0.98] transition-transform"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className={`flex-1 h-12 rounded-xl font-semibold text-[14px] transition-all disabled:opacity-50 ${
                  isEmployee ? 'bg-[#D97706] text-white' : 'bg-[#1C1917] text-white'
                }`}
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setShowSuccessModal(false);
            router.push('/app/vouchers');
          }}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-sm w-full text-center border border-[#E7E5E4]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success Icon */}
            <div className="w-16 h-16 rounded-full bg-[#DCFCE7] flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-[#16A34A]" />
            </div>

            <h2 className="text-[18px] font-semibold text-[#1C1917] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              Voucher Redeemed!
            </h2>

            <p className="text-[15px] font-semibold text-[#1C1917] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              {redeemedVoucherData.voucher_title}
            </p>

            <p className="text-[13px] text-[#78716C] mb-5" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              at {redeemedVoucherData.outlet}
            </p>

            {redeemedVoucherData.cash_value > 0 && (
              <div className="inline-flex items-center gap-2 bg-[#F5F5F4] rounded-lg px-4 py-2 mb-5">
                <span className="text-[14px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  ฿{redeemedVoucherData.cash_value} Value
                </span>
              </div>
            )}

            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/app/vouchers');
              }}
              className="w-full h-12 bg-[#1C1917] text-white rounded-xl font-semibold text-[14px] active:scale-[0.98] transition-transform"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
