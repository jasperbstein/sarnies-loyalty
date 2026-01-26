'use client';

import { Gift, Coffee, Percent, Cookie, Star, Clock, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';

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

export default function EligibleRewardsCard({
  customerId,
  pointsBalance,
  onApplyReward
}: EligibleRewardsCardProps) {
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Mock rewards data - in production, fetch from API
  const mockRewards: Reward[] = [
    {
      id: 1,
      type: 'voucher' as const,
      title: 'Free Coffee',
      description: 'Any size hot coffee',
      value: '฿150',
      status: 'available' as const,
      isExpiring: true,
      expiresAt: 'Today at 11:59 PM',
      eligibilityReason: 'Daily staff voucher'
    },
    {
      id: 2,
      type: 'employee_perk' as const,
      title: 'Staff Discount',
      description: 'All menu items',
      value: '20% OFF',
      status: 'available' as const,
      discountValue: '20%',
      eligibilityReason: 'Employee benefit'
    },
    {
      id: 3,
      type: 'free_item' as const,
      title: 'Free Pastry',
      description: 'Any pastry from display',
      value: '25 pts',
      pointsCost: 25,
      status: pointsBalance >= 25 ? ('available' as const) : ('expired' as const),
      eligibilityReason: pointsBalance >= 25 ? 'Earned reward' : `Need ${25 - pointsBalance} more points`
    },
    {
      id: 4,
      type: 'partner_perk' as const,
      title: 'Partner Discount',
      description: 'Valid at all branches',
      value: '15% OFF',
      status: 'available' as const,
      discountValue: '15%',
      eligibilityReason: 'Partner program member'
    }
  ].filter(reward => reward.status !== 'expired' || reward.pointsCost);

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

  const handleApply = (reward: Reward) => {
    if (reward.status !== 'available') return;
    setProcessingId(reward.id);

    // Simulate API call
    setTimeout(() => {
      if (onApplyReward) {
        onApplyReward(reward.id, reward.title);
      }
      setProcessingId(null);
    }, 500);
  };

  if (mockRewards.length === 0) {
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
          <p className="text-xs text-gray-500 mt-0.5">{mockRewards.length} reward{mockRewards.length !== 1 ? 's' : ''} available</p>
        </div>
      </div>

      {/* Voucher Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockRewards.map((reward) => {
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
