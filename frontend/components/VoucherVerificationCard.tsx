'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Gift, Award, DollarSign, Clock, MapPin, AlertCircle, CheckCircle } from 'lucide-react';

interface VoucherVerificationCardProps {
  voucher: {
    id: number;
    title: string;
    description: string;
    image_url?: string;
    points_required: number;
    cash_value: number;
    voucher_type: string;
    locations?: string;
    expiry_type: string;
    expiry_days?: number;
    created_at?: string;
  };
  qrExpiry?: string; // ISO timestamp when QR expires
  customerPointsAfterRedemption?: number;
  showFullDetails?: boolean;
}

export default function VoucherVerificationCard({
  voucher,
  qrExpiry,
  customerPointsAfterRedemption,
  showFullDetails = true
}: VoucherVerificationCardProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!qrExpiry) return;

    const calculateTimeLeft = () => {
      const expiryTime = new Date(qrExpiry).getTime();
      const now = Date.now();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft(0);
        return;
      }

      setTimeLeft(Math.floor(diff / 1000)); // seconds
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [qrExpiry]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLocationPills = () => {
    if (!voucher.locations) return ['ALL LOCATIONS'];
    return voucher.locations.split(',').map(loc => loc.trim().toUpperCase());
  };

  const getVoucherTypeLabel = () => {
    switch (voucher.voucher_type) {
      case 'free_item':
        return 'Free Item';
      case 'discount_amount':
        return 'Discount';
      case 'percentage_discount':
        return 'Percentage Off';
      case 'merch':
        return 'Merchandise';
      default:
        return 'Reward';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
      {/* Countdown Timer Header - Compact */}
      {qrExpiry && (
        <div className={`${
          isExpired
            ? 'bg-red-600'
            : timeLeft && timeLeft < 120
            ? 'bg-orange-600'
            : 'bg-green-600'
        } text-white px-5 py-2.5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="font-semibold text-sm">
                {isExpired ? 'QR CODE EXPIRED' : 'QR Code Expires In'}
              </span>
            </div>
            {!isExpired && timeLeft !== null && (
              <span className="text-xl font-bold font-mono">
                {formatTime(timeLeft)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Voucher Image */}
      {voucher.image_url && (
        <div className="relative aspect-[16/9] bg-gray-100">
          <Image
            src={voucher.image_url}
            alt={voucher.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
          />
        </div>
      )}

      {/* Voucher Content */}
      <div className="p-6">
        {/* Title & Type */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-black mb-2">{voucher.title}</h3>
            <p className="text-gray-600 leading-relaxed">{voucher.description}</p>
          </div>
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full whitespace-nowrap">
            {getVoucherTypeLabel()}
          </span>
        </div>

        {/* Value Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-700" />
              <p className="text-xs font-medium text-green-700">Cash Value</p>
            </div>
            <p className="text-3xl font-bold text-green-800">
              ฿{Number(voucher.cash_value).toFixed(2)}
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-amber-700" />
              <p className="text-xs font-medium text-amber-700">Points Cost</p>
            </div>
            <p className="text-3xl font-bold text-amber-800">{voucher.points_required}</p>
          </div>
        </div>

        {/* Location Pills */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-gray-600" />
            <p className="text-sm font-medium text-gray-700">Valid Locations</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {getLocationPills().map((location, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-200"
              >
                {location}
              </span>
            ))}
          </div>
        </div>

        {/* Additional Details */}
        {showFullDetails && (
          <div className="space-y-3 mb-6">
            {/* Expiry Info */}
            <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">Expiry Policy</p>
                <p className="text-sm text-gray-600">
                  {voucher.expiry_type === 'no_expiry' && 'This voucher has no expiry date'}
                  {voucher.expiry_type === 'days_after_redeem' && voucher.expiry_days &&
                    `Valid for ${voucher.expiry_days} days after redemption`}
                  {voucher.expiry_type === 'fixed_date' && 'Limited time offer - check specific date'}
                </p>
              </div>
            </div>

            {/* One-time use */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <CheckCircle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-900">One-Time Use Only</p>
                <p className="text-sm text-amber-800">This voucher can only be redeemed once</p>
              </div>
            </div>

            {/* Customer Points After */}
            {customerPointsAfterRedemption !== undefined && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Award className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Customer Remaining Points</p>
                  <p className="text-lg font-bold text-blue-700">{customerPointsAfterRedemption} points</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
