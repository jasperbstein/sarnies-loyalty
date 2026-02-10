'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import AppLayout from '@/components/AppLayout';
import { useAuthStore } from '@/lib/store';
import { collabsAPI, CollabOffer } from '@/lib/api';
import { ArrowLeft, Building2, Gift, Percent, DollarSign, Calendar, QrCode, X, Clock, Info, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSwipeBack } from '@/hooks/useSwipeBack';

export default function CollabOfferDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, token } = useAuthStore();
  const [offer, setOffer] = useState<CollabOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [qrExpiresAt, setQrExpiresAt] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Enable swipe-back gesture
  useSwipeBack();

  useEffect(() => {
    if (params.id) {
      fetchOffer();
    }
  }, [params.id]);

  // Countdown timer for QR expiry
  useEffect(() => {
    if (!qrExpiresAt || !showQRModal) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(qrExpiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setCountdown(diff);

      if (diff <= 0) {
        setShowQRModal(false);
        toast.error('QR code expired. Please generate a new one.');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [qrExpiresAt, showQRModal]);

  const fetchOffer = async () => {
    try {
      const response = await collabsAPI.getOffer(Number(params.id));
      setOffer(response.data);
    } catch (error) {
      toast.error('Failed to load offer details');
      router.push('/app/home');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!offer || !user) return;

    setRedeeming(true);
    try {
      const response = await collabsAPI.redeemOffer(offer.id);
      const { qr_code, expires_at } = response.data;

      setQrCode(qr_code);
      setQrExpiresAt(expires_at);
      setShowQRModal(true);

      toast.success('QR code generated! Show this at the partner store.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate QR code');
    } finally {
      setRedeeming(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDiscountDisplay = () => {
    if (!offer) return '';
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
    if (!offer) return <Gift className="w-6 h-6" />;
    switch (offer.discount_type) {
      case 'percentage':
        return <Percent className="w-6 h-6" />;
      case 'fixed':
        return <DollarSign className="w-6 h-6" />;
      case 'free_item':
        return <Gift className="w-6 h-6" />;
      default:
        return <Gift className="w-6 h-6" />;
    }
  };

  const canRedeem = () => {
    if (!offer) return false;
    if (offer.status !== 'active') return false;
    if (offer.max_per_user && (offer.user_redemption_count || 0) >= offer.max_per_user) return false;
    if (offer.max_redemptions && offer.redemptions_count >= offer.max_redemptions) return false;
    return true;
  };

  const getRedemptionStatus = () => {
    if (!offer) return null;
    if (offer.max_per_user && (offer.user_redemption_count || 0) >= offer.max_per_user) {
      return { type: 'limit', message: 'You have already redeemed this offer' };
    }
    if (offer.max_redemptions && offer.redemptions_count >= offer.max_redemptions) {
      return { type: 'sold_out', message: 'This offer has reached its limit' };
    }
    return null;
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

  if (!offer) {
    return null;
  }

  const redemptionStatus = getRedemptionStatus();

  return (
    <AppLayout>
      <div className="min-h-screen bg-bg-primary pb-36">
        <div className="max-w-2xl lg:max-w-4xl mx-auto">
          {/* Header */}
          <header className="bg-surface border-b border-border px-4 md:px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </button>
            <h1 className="text-subheading text-text-primary">Partner Offer</h1>
          </header>

          {/* Image */}
          <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200">
            {offer.image_url ? (
              <Image
                src={offer.image_url}
                alt={offer.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 512px"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center">
                  {getDiscountIcon()}
                </div>
              </div>
            )}
          </div>

          {/* Partner Badge */}
          <div className="px-5 md:px-6 -mt-6 relative z-10">
            <div className="inline-flex items-center gap-3 bg-white rounded-2xl shadow-lg px-4 py-3 border border-stone-100">
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center overflow-hidden">
                {offer.offering_company_logo ? (
                  <img src={offer.offering_company_logo} alt={offer.offering_company_name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-stone-400" />
                )}
              </div>
              <div>
                <p className="text-[11px] text-stone-500 uppercase tracking-wide">Partner Offer</p>
                <p className="text-[14px] font-semibold text-stone-900">{offer.offering_company_name}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 md:px-6 space-y-5 mt-5">
            {/* Title & Discount */}
            <div>
              <h1 className="text-heading text-text-primary">{offer.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-[14px] font-semibold">
                  {getDiscountIcon()}
                  {getDiscountDisplay()}
                </span>
                <span className="text-[13px] text-stone-500 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Until {formatDate(offer.valid_until)}
                </span>
              </div>
            </div>

            {/* Description */}
            {offer.description && (
              <p className="text-body text-text-secondary leading-relaxed">
                {offer.description}
              </p>
            )}

            {/* Redemption Status */}
            {redemptionStatus && (
              <div className={`rounded-xl p-4 ${
                redemptionStatus.type === 'limit' ? 'bg-amber-50' : 'bg-stone-100'
              }`}>
                <div className="flex items-center gap-3">
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                    redemptionStatus.type === 'limit' ? 'text-amber-600' : 'text-stone-500'
                  }`} />
                  <p className={`text-[14px] font-medium ${
                    redemptionStatus.type === 'limit' ? 'text-amber-700' : 'text-stone-600'
                  }`}>
                    {redemptionStatus.message}
                  </p>
                </div>
              </div>
            )}

            {/* Terms */}
            {offer.terms && (
              <div className="bg-stone-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-medium text-stone-700 mb-1">Terms & Conditions</p>
                    <p className="text-[13px] text-stone-500 whitespace-pre-wrap">{offer.terms}</p>
                  </div>
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-[13px] font-medium text-purple-900 mb-2">How to redeem</p>
              <ol className="space-y-2 text-[13px] text-purple-700">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-[11px] font-bold flex-shrink-0">1</span>
                  <span>Tap "Use Offer" to generate your QR code</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-[11px] font-bold flex-shrink-0">2</span>
                  <span>Show the QR code to staff at {offer.offering_company_name}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-[11px] font-bold flex-shrink-0">3</span>
                  <span>Enjoy your partner benefit!</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Fixed Bottom CTA */}
          <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
            <div className="max-w-2xl lg:max-w-4xl mx-auto">
              <button
                onClick={handleRedeem}
                disabled={!canRedeem() || redeeming}
                className={`w-full h-14 rounded-2xl font-semibold text-[16px] flex items-center justify-center gap-2 transition-all ${
                  canRedeem() && !redeeming
                    ? 'bg-gradient-to-b from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                {redeeming ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5" />
                    Use Offer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-stone-900">Your Offer Code</p>
                  <p className="text-[12px] text-stone-500">Show this to staff</p>
                </div>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            {/* QR Code */}
            <div className="p-8 flex flex-col items-center">
              <div className="w-56 h-56 bg-white rounded-2xl shadow-inner border border-stone-100 flex items-center justify-center p-4">
                {qrCode && (
                  <img src={qrCode} alt="QR Code" className="w-full h-full" />
                )}
              </div>

              {/* Countdown */}
              <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-[14px] font-medium text-amber-700">
                  Expires in {formatCountdown(countdown)}
                </span>
              </div>

              {/* Partner info */}
              <div className="mt-4 text-center">
                <p className="text-[13px] text-stone-500">Redeem at</p>
                <p className="text-[15px] font-semibold text-stone-900">{offer.offering_company_name}</p>
              </div>
            </div>

            {/* Offer summary */}
            <div className="p-4 bg-stone-50 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium text-stone-900">{offer.title}</p>
                  <p className="text-[13px] text-purple-600 font-semibold">{getDiscountDisplay()}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
