'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, Users, Share2, Copy, Check, X, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { referralsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

/**
 * EmployeeHome - Employee Dashboard
 *
 * Design System:
 * - Section gap: 24px
 * - Card padding: 16px
 * - Internal element gap: 8-12px
 * - Border radius: 12px (consistent)
 * - No shadows (clean, premium feel)
 * - Colors: Neutral palette with amber accent (#D97706)
 */

interface Voucher {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  cash_value: number;
  voucher_type: string;
  redeemed_today?: number;
  max_redemptions_per_user_per_day?: number;
}

interface Announcement {
  id: number;
  title: string;
  message: string;
  image_url?: string;
  created_at?: string;
}

interface EmployeeHomeProps {
  user: {
    name: string;
    surname?: string;
    email?: string;
    company?: string;
    id: number;
  };
  vouchers: Voucher[];
  announcements?: Announcement[];
  onScanQR?: () => void;
  onShowQR?: () => void;
  qrCodeUrl?: string;
  qrLoading?: boolean;
}

export function EmployeeHome({ user, vouchers, announcements = [], onShowQR, qrCodeUrl, qrLoading }: EmployeeHomeProps) {
  const router = useRouter();
  const employeeId = `EMP-${String(user.id).padStart(6, '0')}`;
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showInviteFriends, setShowInviteFriends] = useState(false);

  const [referralLoading, setReferralLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);

  // Fetch referral code on mount
  useEffect(() => {
    const fetchReferralCode = async () => {
      try {
        setReferralLoading(true);
        const response = await referralsAPI.getMyCode();
        setReferralCode(response.data.referral_code);
      } catch (error) {
        console.error('Failed to fetch referral code:', error);
        // Generate a fallback code based on user id
        setReferralCode(`EMP${String(user.id).padStart(6, '0')}`);
      } finally {
        setReferralLoading(false);
      }
    };
    fetchReferralCode();
  }, [user.id]);

  const copyReferralCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast.success('Code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareReferralLink = async () => {
    if (!referralCode) return;
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?ref=${referralCode}`;
    const shareData = {
      title: 'Join Sarnies',
      text: `Use my referral code ${referralCode} to get started with Sarnies!`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyReferralCode();
        }
      }
    } else {
      copyReferralCode();
    }
  };

  // Get featured daily voucher (first available)
  const todaysPerk = vouchers.length > 0 ? vouchers[0] : null;

  // Get latest announcement
  const latestNews = announcements.length > 0 ? announcements[0] : null;

  return (
    <>
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Content - consistent 24px section gaps */}
        <div className="px-4 pt-4 pb-6 space-y-6">
          {/* Employee Card - Clean, no shadow */}
          <div
            className="relative h-[180px] rounded-xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => setShowQRModal(true)}
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: 'url(https://images.unsplash.com/photo-1720242569488-ece73980ba11?w=800&q=80)'
              }}
            />
            {/* Gradient Overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 100%)'
              }}
            />
            {/* Content - 16px padding */}
            <div className="absolute inset-0 p-4 flex items-end justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold tracking-[1.5px] text-white/80" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>EMPLOYEE</p>
                <p className="text-lg font-semibold text-white" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>{user.name} {user.surname || ''}</p>
                <p className="text-[12px] text-white/80" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>{employeeId}</p>
              </div>
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <QrCode className="w-7 h-7 text-[#1C1917]" />
              </div>
            </div>
          </div>

          {/* Your Perks Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-[11px] font-semibold tracking-[1px] text-[#78716C] uppercase" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Your Perks
              </p>
              <Link href="/app/vouchers" className="flex items-center text-[13px] font-medium text-[#D97706]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                View all
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {todaysPerk ? (
              <YourPerkCard voucher={todaysPerk} onShowQR={() => setShowQRModal(true)} />
            ) : (
              <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 text-center">
                <p className="text-[14px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  No vouchers available yet
                </p>
                <p className="text-[12px] text-[#A8A29E] mt-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Check back soon for employee perks!
                </p>
              </div>
            )}
          </div>

          {/* Invite Friends - Simple, clean */}
          <button
            onClick={() => setShowInviteFriends(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-xl border border-[#E7E5E4] active:bg-[#FAFAF9] transition-colors"
          >
            <Users className="w-[18px] h-[18px] text-[#78716C]" />
            <span className="text-[13px] font-medium text-[#57534E]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              Invite Friends
            </span>
          </button>

          {/* Latest News */}
          <LatestNewsCard announcement={latestNews} />
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <QRCodeModal
          employeeId={employeeId}
          userName={`${user.name} ${user.surname || ''}`.trim()}
          qrCodeUrl={qrCodeUrl}
          qrLoading={qrLoading}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {/* Invite Friends Modal */}
      {showInviteFriends && (
        <InviteFriendsModal
          referralCode={referralCode}
          copiedCode={copiedCode}
          loading={referralLoading}
          onCopy={copyReferralCode}
          onShare={shareReferralLink}
          onClose={() => setShowInviteFriends(false)}
        />
      )}
    </>
  );
}

function QRCodeModal({
  employeeId,
  userName,
  qrCodeUrl,
  qrLoading,
  onClose
}: {
  employeeId: string;
  userName: string;
  qrCodeUrl?: string;
  qrLoading?: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-[300px] p-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            Your QR Code
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#F5F5F4] flex items-center justify-center"
          >
            <X className="w-4 h-4 text-[#78716C]" />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center">
          <div className="w-44 h-44 bg-white border border-[#E7E5E4] rounded-xl flex items-center justify-center mb-4 overflow-hidden">
            {qrLoading ? (
              <div className="w-6 h-6 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin" />
            ) : qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain p-2" />
            ) : (
              <QrCode className="w-20 h-20 text-[#E7E5E4]" />
            )}
          </div>
          <p className="text-[15px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            {userName}
          </p>
          <p className="text-[13px] text-[#78716C] mt-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            {employeeId}
          </p>
          <p className="text-[12px] text-[#A8A29E] mt-3 text-center" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            Show this to redeem your benefits
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-[#1C1917] text-white py-3 rounded-xl font-medium text-[14px] mt-4 active:bg-[#292524] transition-colors"
          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function InviteFriendsModal({
  referralCode,
  copiedCode,
  loading,
  onCopy,
  onShare,
  onClose
}: {
  referralCode: string | null;
  copiedCode: boolean;
  loading?: boolean;
  onCopy: () => void;
  onShare: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-xl w-full max-w-md p-5 pb-8 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-[#E7E5E4] rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            Invite Friends
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#F5F5F4] flex items-center justify-center"
          >
            <X className="w-4 h-4 text-[#78716C]" />
          </button>
        </div>

        {/* Content */}
        <p className="text-[13px] text-[#78716C] mb-4" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          Share your code and both get rewarded when your friend joins!
        </p>

        {loading ? (
          <div className="bg-[#F5F5F4] rounded-xl p-5 text-center">
            <div className="w-5 h-5 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Loading...</p>
          </div>
        ) : referralCode ? (
          <div className="space-y-3">
            <div className="bg-[#F5F5F4] rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-[#A8A29E] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Your referral code</p>
                <p className="text-[18px] font-semibold text-[#1C1917] tracking-[2px] font-mono">{referralCode}</p>
              </div>
              <button
                onClick={onCopy}
                className="w-10 h-10 rounded-xl bg-white border border-[#E7E5E4] flex items-center justify-center"
              >
                {copiedCode ? (
                  <Check className="w-4 h-4 text-[#16A34A]" />
                ) : (
                  <Copy className="w-4 h-4 text-[#78716C]" />
                )}
              </button>
            </div>
            <button
              onClick={onShare}
              className="w-full bg-[#1C1917] text-white py-3 rounded-xl font-medium text-[14px] flex items-center justify-center gap-2 active:bg-[#292524] transition-colors"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              <Share2 className="w-4 h-4" />
              Share Invite Link
            </button>
          </div>
        ) : (
          <div className="bg-[#F5F5F4] rounded-xl p-5 text-center">
            <p className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Unable to load referral code</p>
          </div>
        )}
      </div>
    </div>
  );
}

function YourPerkCard({ voucher, onShowQR }: { voucher: Voucher; onShowQR?: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
      <div
        className="h-28 w-full bg-[#F5F5F4] bg-cover bg-center"
        style={{
          backgroundImage: voucher.image_url
            ? `url(${voucher.image_url})`
            : 'url(https://images.unsplash.com/photo-1630439924740-b7cf5e98e7e1?w=400&q=80)'
        }}
      />
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[15px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            {voucher.title}
          </p>
          <p className="text-[13px] text-[#78716C] mt-1 line-clamp-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            {voucher.description}
          </p>
        </div>
        <button
          onClick={onShowQR}
          className="w-full bg-[#1C1917] text-white py-3 rounded-xl font-medium text-[14px] active:bg-[#292524] transition-colors"
          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
        >
          Use Now
        </button>
      </div>
    </div>
  );
}

function LatestNewsCard({ announcement }: { announcement: Announcement | null }) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-[11px] font-semibold tracking-[1px] text-[#78716C] uppercase" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          Latest News
        </p>
        <Link href="/app/news" className="flex items-center text-[13px] font-medium text-[#D97706]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          View all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      {announcement ? (
        <div
          className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
          onClick={() => router.push(`/app/news/${announcement.id}`)}
        >
          {/* Featured Image */}
          <div
            className="h-[120px] w-full bg-[#F5F5F4] bg-cover bg-center"
            style={{
              backgroundImage: announcement.image_url
                ? `url(${announcement.image_url})`
                : 'url(https://images.unsplash.com/photo-1711633648859-1eac3e5969b9?w=800&q=80)'
            }}
          />
          {/* Content - 16px padding */}
          <div className="p-4">
            <p className="text-[15px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              {announcement.title}
            </p>
            <p className="text-[13px] text-[#78716C] mt-2 line-clamp-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              {announcement.message}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 text-center">
          <p className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            No announcements yet
          </p>
        </div>
      )}
    </div>
  );
}


