'use client';

import { Gift, Coffee, Percent, Cookie, Star, Clock, CheckCircle, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/config';

interface VoucherFromApi {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  points_required: number;
  cash_value?: number;
  voucher_type: string;
  benefit_type?: string;
  benefit_value?: number;
  is_featured: boolean;
  is_active: boolean;
  expiry_date?: string;
  can_afford: boolean;
  eligibility_reason: string;
  user_total_redemptions: number;
  user_today_redemptions: number;
}

interface Reward {
  id: number;
  type: 'free_item' | 'discount' | 'voucher' | 'points' | 'employee_perk' | 'partner_perk' | 'vip_perk';
  title: string;
  description: string;
  value: string;
  pointsCost?: number;
  discountValue?: string;
  expiresAt?: string;
  isExpiring?: boolean;
  status: 'available' | 'used' | 'expired';
  eligibilityReason: string;
}

interface EligibleRewardsCardProps {
  customerId: number;
  pointsBalance: number;
  onApplyReward?: (rewardId: number, rewardTitle: string) => void;
}

// Helper function to map voucher_type to Reward type
function mapVoucherTypeToRewardType(voucherType: string): Reward['type'] {
  switch (voucherType) {
    case 'free_item':
      return 'free_item';
    case 'discount_amount':
    case 'percentage_discount':
      return 'discount';
    case 'merch':
      return 'voucher';
    default:
      return 'voucher';
  }
}

// Helper function to format the value display
function formatValue(voucher: VoucherFromApi): string {
  if (voucher.voucher_type === 'percentage_discount' && voucher.benefit_value) {
    return `${voucher.benefit_value}% OFF`;
  }
  if (voucher.voucher_type === 'discount_amount' && voucher.benefit_value) {
    return `฿${voucher.benefit_value} OFF`;
  }
  if (voucher.cash_value) {
    return `฿${voucher.cash_value}`;
  }
  if (voucher.points_required > 0) {
    return `${voucher.points_required} pts`;
  }
  return 'FREE';
}

// Helper function to check if voucher is expiring soon (within 24 hours)
function isExpiringSoon(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilExpiry > 0 && hoursUntilExpiry <= 24;
}

// Helper function to format expiry date
function formatExpiryDate(expiryDate?: string): string | undefined {
  if (!expiryDate) return undefined;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilExpiry <= 24) {
    if (hoursUntilExpiry <= 1) {
      return 'Expires in less than 1 hour';
    }
    return `Expires in ${Math.ceil(hoursUntilExpiry)} hours`;
  }
  return `Expires ${expiry.toLocaleDateString()}`;
}

// Convert API voucher to Reward format
function convertVoucherToReward(voucher: VoucherFromApi): Reward {
  return {
    id: voucher.id,
    type: mapVoucherTypeToRewardType(voucher.voucher_type),
    title: voucher.title,
    description: voucher.description || '',
    value: formatValue(voucher),
    pointsCost: voucher.points_required > 0 ? voucher.points_required : undefined,
    discountValue: voucher.voucher_type === 'percentage_discount' && voucher.benefit_value
      ? `${voucher.benefit_value}%`
      : undefined,
    expiresAt: formatExpiryDate(voucher.expiry_date),
    isExpiring: isExpiringSoon(voucher.expiry_date),
    status: voucher.can_afford ? 'available' : 'expired',
    eligibilityReason: voucher.eligibility_reason
  };
}

export default function EligibleRewardsCard({
  customerId,
  pointsBalance,
  onApplyReward
}: EligibleRewardsCardProps) {
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch customer's available vouchers on mount and when customerId/pointsBalance changes
  useEffect(() => {
    const fetchAvailableVouchers = async () => {
      if (!customerId) {
        setLoading(false);
        setRewards([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get token from zustand persisted state
        const authStorage = localStorage.getItem('auth-storage');
        const token = authStorage ? JSON.parse(authStorage)?.state?.token : null;

        if (!token) {
          console.warn('No auth token found for voucher fetch');
          setRewards([]);
          setLoading(false);
          return;
        }

        const response = await fetch(`${getApiUrl()}/vouchers/customer/${customerId}/available`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            setRewards([]);
            return;
          }
          throw new Error('Failed to fetch vouchers');
        }

        const data = await response.json();
        const vouchers: VoucherFromApi[] = data.vouchers || [];

        // Convert API vouchers to Reward format
        const convertedRewards = vouchers.map(convertVoucherToReward);
        setRewards(convertedRewards);
      } catch (err) {
        console.error('Error fetching available vouchers:', err);
        setError('Failed to load rewards');
        setRewards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableVouchers();
  }, [customerId, pointsBalance]);

  const getRewardIcon = (type: Reward['type']) => {
    switch (type) {
      case 'voucher':
        return Coffee;
      case 'discount':
      case 'employee_perk':
      case 'partner_perk':
        return Percent;
      case 'free_item':
        return Cookie;
      case 'points':
        return Star;
      case 'vip_perk':
        return Sparkles;
      default:
        return Gift;
    }
  };

  const getCardStyle = (reward: Reward) => {
    if (reward.status === 'expired') {
      return 'bg-gray-50 border-gray-200 opacity-60';
    }
    if (reward.isExpiring) {
      return 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-sm';
    }
    return 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm';
  };

  const getIconBg = (type: Reward['type']) => {
    switch (type) {
      case 'voucher':
        return 'bg-gradient-to-br from-green-500 to-green-600';
      case 'employee_perk':
        return 'bg-gradient-to-br from-blue-500 to-blue-600';
      case 'partner_perk':
        return 'bg-gradient-to-br from-purple-500 to-purple-600';
      case 'free_item':
        return 'bg-gradient-to-br from-amber-500 to-amber-600';
      case 'vip_perk':
        return 'bg-gradient-to-br from-orange-500 to-orange-600';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-600';
    }
  };

  const handleApply = async (reward: Reward) => {
    if (reward.status !== 'available') return;
    setProcessingId(reward.id);

    try {
      if (onApplyReward) {
        onApplyReward(reward.id, reward.title);
      }
    } finally {
      setProcessingId(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
            <Gift className="w-5 h-5 text-green-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900">Eligible Rewards & Discounts</h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          <span className="ml-3 text-gray-500">Loading rewards...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900">Eligible Rewards & Discounts</h3>
          </div>
        </div>
        <div className="text-center py-8 bg-red-50 rounded-xl border border-red-200">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-red-500 mt-1">Please try again later</p>
        </div>
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Gift className="w-5 h-5 text-gray-600" />
          </div>
          <h3 className="font-bold text-xl text-gray-900">Eligible Rewards & Discounts</h3>
        </div>
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No eligible rewards at this time</p>
          <p className="text-sm text-gray-400 mt-1">Check back after customer earns more points</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
          <Gift className="w-5 h-5 text-green-700" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900">Eligible Rewards & Discounts</h3>
          <p className="text-xs text-gray-500 mt-0.5">{rewards.length} reward{rewards.length !== 1 ? 's' : ''} available</p>
        </div>
      </div>

      {/* Voucher Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rewards.map((reward) => {
          const Icon = getRewardIcon(reward.type);
          const isAvailable = reward.status === 'available';
          const isProcessing = processingId === reward.id;

          return (
            <div
              key={reward.id}
              className={`relative rounded-xl border-2 p-4 transition-all ${getCardStyle(reward)} ${
                isAvailable && !isProcessing ? 'hover:shadow-md hover:scale-[1.02]' : ''
              }`}
            >
              {/* Expiring Badge - Compact */}
              {reward.isExpiring && (
                <div className="absolute top-2.5 right-2.5">
                  <span className="flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                    <Clock className="w-3 h-3" />
                    {reward.expiresAt}
                  </span>
                </div>
              )}

              {/* Icon & Title - Uniform sizing */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 ${getIconBg(reward.type)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h4 className="font-bold text-base text-gray-900 leading-tight mb-1">{reward.title}</h4>
                  <p className="text-xs text-gray-600 leading-snug">{reward.description}</p>
                </div>
              </div>

              {/* Value Badge */}
              <div className="mb-3">
                <span className="inline-block px-3 py-1.5 bg-white border-2 border-gray-900 rounded-lg font-black text-lg text-gray-900 shadow-sm">
                  {reward.value}
                </span>
              </div>

              {/* Eligibility Reason */}
              <div className="mb-3 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-700 font-medium leading-snug">{reward.eligibilityReason}</p>
              </div>

              {/* Apply Button */}
              <button
                onClick={() => handleApply(reward)}
                disabled={!isAvailable || isProcessing}
                className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all ${
                  isAvailable
                    ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-md'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isProcessing ? 'Applying...' : isAvailable ? 'Apply Reward' : 'Not Available'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Help Text - Darker icon */}
      <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-semibold">Staff Tip</p>
            <p className="text-sm text-blue-700 mt-0.5 leading-snug">
              Click "Apply Reward" to apply a discount or voucher to the current transaction. Confirm with the customer before applying.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
