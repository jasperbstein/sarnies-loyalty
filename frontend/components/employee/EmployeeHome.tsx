'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { QrCode, Users, Share2, Copy, Check, X, ChevronRight, Gift, Newspaper, User, Home, Ticket } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { referralsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface Voucher {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  cash_value: number;
  voucher_type: string;
  redeemed_today?: number;
  today_redemptions?: number;
  max_redemptions_per_user?: number;
  available_today?: number;
}

interface Announcement {
  id: number;
  title: string;
  message?: string;
  description?: string;
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

export function EmployeeHome({ user, vouchers, announcements = [], qrCodeUrl, qrLoading }: EmployeeHomeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const employeeId = `EMP-${String(user.id).padStart(6, '0')}`;
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showInviteFriends, setShowInviteFriends] = useState(false);
  const [referralLoading, setReferralLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    const fetchReferralCode = async () => {
      try {
        setReferralLoading(true);
        const response = await referralsAPI.getMyCode();
        setReferralCode(response.data.referral_code);
      } catch (error) {
        console.error('Failed to fetch referral code:', error);
        setReferralCode(null);
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
      title: 'Join Sarnies - 25% Friends & Family Discount',
      text: `Hey! Use my code ${referralCode} to get 25% off at Sarnies as a Friends & Family member!`,
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

  // Get featured perks (first 4)
  const featuredPerks = vouchers.slice(0, 4);

  // Get latest news (first 3)
  const latestNews = announcements.slice(0, 3);

  return (
    <>
      <div className="min-h-screen bg-[#FAFAF9] pb-24">
        <div className="max-w-2xl lg:max-w-4xl mx-auto">
          <div className="px-4 md:px-6 pt-6 space-y-6">

            {/* Hero Section with Abstract Pattern */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
            >
              {/* Abstract gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900" />

              {/* Abstract pattern overlay */}
              <div className="absolute inset-0 opacity-30">
                <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f5f5f4" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#78716c" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#a8a29e" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#1c1917" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Large flowing shapes */}
                  <ellipse cx="350" cy="30" rx="180" ry="120" fill="url(#grad1)" />
                  <ellipse cx="50" cy="180" rx="150" ry="100" fill="url(#grad2)" />
                  <ellipse cx="200" cy="100" rx="100" ry="80" fill="url(#grad1)" />
                  {/* Smaller accent circles */}
                  <circle cx="80" cy="40" r="40" fill="#f5f5f4" fillOpacity="0.03" />
                  <circle cx="320" cy="160" r="60" fill="#f5f5f4" fillOpacity="0.04" />
                  <circle cx="180" cy="20" r="25" fill="#f5f5f4" fillOpacity="0.05" />
                  {/* Curved lines */}
                  <path d="M0,100 Q100,50 200,100 T400,100" stroke="#f5f5f4" strokeOpacity="0.08" strokeWidth="1" fill="none" />
                  <path d="M0,150 Q150,100 300,150 T400,120" stroke="#f5f5f4" strokeOpacity="0.06" strokeWidth="1" fill="none" />
                </svg>
              </div>

              {/* Subtle grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '24px 24px'
                }}
              />

              {/* Hero content */}
              <div className="relative px-5 py-6 flex flex-col justify-end min-h-[200px]">
                {/* Company badge */}
                <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <span className="text-[11px] font-medium text-white/80 tracking-wide">
                    {user.company || 'Sarnies'}
                  </span>
                </div>

                <p className="text-[11px] font-medium text-stone-400 tracking-wider uppercase mb-1">
                  Welcome back
                </p>
                <h1 className="text-[28px] font-bold text-white tracking-tight">
                  {user.name} {user.surname || ''}
                </h1>
                <p className="text-[14px] text-stone-400 mt-1">
                  Team Member
                </p>

                {/* QR Button */}
                <button
                  onClick={() => setShowQRModal(true)}
                  className="mt-4 inline-flex items-center gap-2 bg-white text-stone-900 px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-stone-100 transition-colors self-start shadow-lg"
                >
                  <QrCode className="w-4 h-4" />
                  Show my QR code
                </button>
              </div>
            </div>

            {/* How to Use Section */}
            <div className="bg-white rounded-2xl p-5 border border-stone-100">
              <h2 className="text-[15px] font-semibold text-stone-900 mb-3">How to use your perks</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-900 text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">1</div>
                  <p className="text-[13px] text-stone-600">Show your QR code to the cashier at checkout</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-900 text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">2</div>
                  <p className="text-[13px] text-stone-600">They will scan it to see your available benefits</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-900 text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">3</div>
                  <p className="text-[13px] text-stone-600">Choose a perk and it will be applied to your order</p>
                </div>
              </div>
            </div>

            {/* Featured Perks */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-[15px] font-semibold text-stone-900">Your Perks</h2>
                <Link
                  href="/app/vouchers"
                  className="text-[13px] text-stone-500 hover:text-stone-700 transition-colors flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {featuredPerks.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {featuredPerks.map((voucher) => (
                    <PerkCard key={voucher.id} voucher={voucher} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center border border-stone-100">
                  <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3">
                    <Gift className="w-6 h-6 text-stone-400" />
                  </div>
                  <p className="text-[15px] font-medium text-stone-700">No perks available yet</p>
                  <p className="text-[13px] text-stone-400 mt-1">Check back soon for new benefits</p>
                </div>
              )}
            </div>

            {/* Invite Friends Card */}
            <button
              onClick={() => setShowInviteFriends(true)}
              className="w-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 text-left transition-transform active:scale-[0.98]"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-stone-900">Invite Friends & Family</h3>
                  <p className="text-[13px] text-stone-600 mt-1">
                    Share your code and give them <span className="font-semibold text-amber-700">25% off</span> as Friends & Family members
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-300 flex-shrink-0 mt-1" />
              </div>
            </button>

            {/* News Section */}
            {latestNews.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-[15px] font-semibold text-stone-900">Latest News</h2>
                  <Link
                    href="/app/news"
                    className="text-[13px] text-stone-500 hover:text-stone-700 transition-colors flex items-center gap-1"
                  >
                    View all
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {latestNews.map((news) => (
                    <NewsCard key={news.id} news={news} />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Bottom Tab Navigation */}
      <BottomTabBar currentPath={pathname} />

      {/* QR Modal */}
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

function PerkCard({ voucher }: { voucher: Voucher }) {
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const redeemedCount = voucher.today_redemptions ?? voucher.redeemed_today ?? 0;
  const isRedeemed = voucher.max_redemptions_per_user
    ? redeemedCount >= voucher.max_redemptions_per_user
    : false;

  return (
    <button
      onClick={() => router.push(`/app/vouchers/${voucher.id}`)}
      className={`w-full bg-white rounded-2xl overflow-hidden text-left border border-stone-100 transition-all hover:shadow-md active:scale-[0.98] ${
        isRedeemed ? 'opacity-50' : ''
      }`}
      disabled={isRedeemed}
    >
      <div className="w-full aspect-[4/3] bg-stone-100 relative overflow-hidden">
        {!imageLoaded && !imageError && voucher.image_url && (
          <div className="absolute inset-0 bg-gradient-to-r from-stone-100 via-stone-200 to-stone-100 animate-pulse" />
        )}

        {voucher.image_url && !imageError ? (
          <Image
            src={voucher.image_url}
            alt={voucher.title}
            fill
            className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            sizes="(max-width: 768px) 50vw, 25vw"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
            <Gift className="w-8 h-8 text-stone-300" />
          </div>
        )}

        {isRedeemed && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
            <span className="text-[11px] font-semibold text-stone-600 bg-white px-3 py-1.5 rounded-full shadow-sm">
              Used today
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-[13px] font-medium text-stone-800 truncate">{voucher.title}</p>
        <p className="text-[11px] text-stone-400 mt-0.5">
          {isRedeemed ? 'Redeemed' : 'Available'}
        </p>
      </div>
    </button>
  );
}

function NewsCard({ news }: { news: Announcement }) {
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <button
      onClick={() => router.push(`/app/news/${news.id}`)}
      className="w-full bg-white rounded-2xl overflow-hidden text-left border border-stone-100 flex items-center gap-4 p-3 transition-all hover:shadow-md active:scale-[0.98]"
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 rounded-xl bg-stone-100 relative overflow-hidden flex-shrink-0">
        {!imageLoaded && news.image_url && (
          <div className="absolute inset-0 bg-gradient-to-r from-stone-100 via-stone-200 to-stone-100 animate-pulse" />
        )}
        {news.image_url ? (
          <Image
            src={news.image_url}
            alt={news.title}
            fill
            className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            sizes="80px"
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Newspaper className="w-6 h-6 text-stone-300" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-stone-800 line-clamp-2">{news.title}</p>
        <p className="text-[12px] text-stone-400 mt-1 line-clamp-1">
          {news.description || news.message}
        </p>
      </div>

      <ChevronRight className="w-5 h-5 text-stone-300 flex-shrink-0" />
    </button>
  );
}

function BottomTabBar({ currentPath }: { currentPath: string }) {
  const tabs = [
    { href: '/app/home', icon: Home, label: 'Home' },
    { href: '/app/vouchers', icon: Ticket, label: 'Perks' },
    { href: '/app/news', icon: Newspaper, label: 'News' },
    { href: '/app/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50 safe-area-bottom">
      <div className="max-w-2xl lg:max-w-4xl mx-auto">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const isActive = currentPath === tab.href ||
              (tab.href !== '/app/home' && currentPath.startsWith(tab.href));
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
                  isActive ? 'text-stone-900' : 'text-stone-400'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
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
      className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[320px] bg-white rounded-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
      >
        <div className="p-6 flex flex-col items-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>

          <p className="text-[16px] font-semibold text-stone-900 mb-1">{userName}</p>
          <p className="text-[12px] text-stone-400 font-mono mb-6">{employeeId}</p>

          <div className="w-48 h-48 rounded-xl bg-white border border-stone-100 flex items-center justify-center mb-6">
            {qrLoading ? (
              <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
            ) : qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain p-2" />
            ) : (
              <QrCode className="w-16 h-16 text-stone-200" />
            )}
          </div>

          <p className="text-[13px] text-stone-500 mb-6 text-center">
            Show this QR code to the cashier to use your perks
          </p>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-medium text-[14px] text-white bg-stone-900 hover:bg-stone-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
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
      className="fixed inset-0 z-[100] bg-black/60 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.15)' }}
      >
        <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mt-3 md:hidden" />

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-semibold text-stone-900">Invite Friends & Family</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
            >
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          {/* Value proposition */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <p className="text-[14px] text-amber-900">
              Share your code with friends and family. They will get <span className="font-bold">25% off</span> as Friends & Family members on all orders!
            </p>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : referralCode ? (
            <div className="space-y-4">
              <div className="bg-stone-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-stone-400 mb-1">Your referral code</p>
                  <p className="text-[22px] font-bold text-stone-900 font-mono tracking-wider">{referralCode}</p>
                </div>
                <button
                  onClick={onCopy}
                  className="w-11 h-11 rounded-xl bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-50 transition-colors"
                >
                  {copiedCode ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-stone-500" />
                  )}
                </button>
              </div>

              <button
                onClick={onShare}
                className="w-full py-3.5 rounded-xl font-semibold text-[14px] text-white bg-amber-500 hover:bg-amber-600 flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share with Friends
              </button>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-[13px] text-stone-400">Unable to load referral code</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
