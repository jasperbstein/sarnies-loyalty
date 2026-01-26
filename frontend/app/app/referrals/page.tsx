'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { referralsAPI } from '@/lib/api';
import {
  Users,
  Copy,
  Check,
  Share2,
  Gift,
  Clock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ReferralStats {
  successful_referrals: number;
  pending_referrals: number;
  total_points_earned: number;
  monthly_referrals: number;
  monthly_cap: number;
  remaining_this_month: number;
}

interface Referral {
  id: number;
  status: string;
  referrer_points_awarded: number | null;
  created_at: string;
  referee_first_purchase_at: string | null;
  referee_name: string;
  referee_phone_masked: string;
}

export default function ReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const [codeRes, referralsRes] = await Promise.all([
        referralsAPI.getMyCode(),
        referralsAPI.getMyReferrals()
      ]);

      setReferralCode(codeRes.data.referral_code);
      setShareUrl(codeRes.data.share_url);
      setShareMessage(codeRes.data.share_message);
      setStats(codeRes.data.stats);
      setReferrals(referralsRes.data.referrals || []);
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Sarnies Rewards',
          text: shareMessage,
          url: shareUrl
        });
      } catch (error) {
        // User cancelled or share failed
        copyCode();
      }
    } else {
      copyCode();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-pulse text-neutral-400">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-neutral-50">
        {/* Header */}
        <div className="bg-white px-4 pt-6 pb-4 border-b border-neutral-100">
          <h1 className="text-2xl font-bold text-neutral-900">Refer Friends</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Share your code and earn rewards when friends join
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Referral Code Card */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Your Referral Code</span>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold tracking-widest">{referralCode}</span>
                <button
                  onClick={copyCode}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  {copied ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={shareReferral}
              className="w-full bg-white text-amber-600 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Share with Friends
            </button>

            <p className="text-xs text-white/70 text-center mt-3">
              Earn 50 points for each friend who makes their first purchase
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 text-center border border-neutral-100">
              <div className="text-2xl font-bold text-neutral-900">
                {stats?.successful_referrals || 0}
              </div>
              <div className="text-xs text-neutral-500 mt-1">Successful</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border border-neutral-100">
              <div className="text-2xl font-bold text-neutral-900">
                {stats?.pending_referrals || 0}
              </div>
              <div className="text-xs text-neutral-500 mt-1">Pending</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border border-neutral-100">
              <div className="text-2xl font-bold text-amber-600">
                {stats?.total_points_earned || 0}
              </div>
              <div className="text-xs text-neutral-500 mt-1">Points Earned</div>
            </div>
          </div>

          {/* Monthly Progress */}
          {stats && (
            <div className="bg-white rounded-xl p-4 border border-neutral-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-700">Monthly Referrals</span>
                <span className="text-sm text-neutral-500">
                  {stats.monthly_referrals} / {stats.monthly_cap}
                </span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (stats.monthly_referrals / stats.monthly_cap) * 100)}%`
                  }}
                />
              </div>
              {stats.remaining_this_month > 0 ? (
                <p className="text-xs text-neutral-500 mt-2">
                  {stats.remaining_this_month} referrals remaining this month
                </p>
              ) : (
                <p className="text-xs text-orange-600 mt-2">
                  Monthly limit reached. Resets next month!
                </p>
              )}
            </div>
          )}

          {/* How It Works */}
          <div className="bg-white rounded-xl p-4 border border-neutral-100">
            <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              How It Works
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </div>
                <p className="text-sm text-neutral-600">Share your unique code with friends</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </div>
                <p className="text-sm text-neutral-600">They sign up using your referral code</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </div>
                <p className="text-sm text-neutral-600">When they make their first purchase, you both earn rewards!</p>
              </div>
            </div>
          </div>

          {/* Referral History */}
          <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-neutral-400" />
                Your Referrals
              </h3>
            </div>

            {referrals.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
                <p className="text-neutral-500 text-sm">No referrals yet</p>
                <p className="text-neutral-400 text-xs mt-1">Share your code to get started!</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {referrals.map((referral) => (
                  <div key={referral.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-neutral-600">
                          {referral.referee_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {referral.referee_name || 'Friend'}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {formatDate(referral.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {referral.status === 'completed' ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <Check className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            +{referral.referrer_points_awarded} pts
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">Pending</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
