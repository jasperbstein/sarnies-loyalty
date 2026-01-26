'use client';

import Image from 'next/image';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface VoucherInstanceCardProps {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  status: string;
  computed_status: 'active' | 'used' | 'expired';
  redeemed_at: string;
  used_at?: string;
  expires_at?: string;
  onClick: () => void;
  showCount?: boolean;
  redemptionCount?: number;
}

export default function VoucherInstanceCard({
  title,
  description,
  image_url,
  computed_status,
  redeemed_at,
  used_at,
  expires_at,
  onClick
}: VoucherInstanceCardProps) {
  const getStatusBadge = () => {
    switch (computed_status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
            <CheckCircle className="w-3 h-3" />
            Ready to Use
          </span>
        );
      case 'used':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
            <CheckCircle className="w-3 h-3" />
            Used
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
            <XCircle className="w-3 h-3" />
            Expired
          </span>
        );
    }
  };

  const getDateText = () => {
    if (used_at) {
      return `Used on ${new Date(used_at).toLocaleDateString()}`;
    }
    if (computed_status === 'expired' && expires_at) {
      return `Expired on ${new Date(expires_at).toLocaleDateString()}`;
    }
    if (expires_at) {
      return `Expires ${new Date(expires_at).toLocaleDateString()}`;
    }
    return `Redeemed ${new Date(redeemed_at).toLocaleDateString()}`;
  };

  const isActive = computed_status === 'active';

  return (
    <div
      onClick={isActive ? onClick : undefined}
      className={`relative rounded-2xl overflow-hidden transition-all ${
        isActive
          ? 'bg-white border-2 border-green-500 shadow-md hover:shadow-lg cursor-pointer transform hover:scale-[1.02]'
          : 'bg-gray-100 border-2 border-gray-300 opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex gap-4 p-4">
        {/* Voucher Image */}
        <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200">
          {image_url ? (
            <Image
              src={image_url}
              alt={title}
              fill
              className={`object-cover ${!isActive ? 'grayscale' : ''}`}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${isActive ? 'bg-green-100' : 'bg-gray-300'}`}>
              <Clock className={`w-8 h-8 ${isActive ? 'text-green-600' : 'text-gray-500'}`} />
            </div>
          )}
        </div>

        {/* Voucher Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className={`font-bold text-base ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
              {title}
            </h3>
            {getStatusBadge()}
          </div>

          <p className={`text-sm mb-2 line-clamp-2 ${isActive ? 'text-gray-600' : 'text-gray-500'}`}>
            {description}
          </p>

          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{getDateText()}</span>
          </div>
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-r-[40px] border-t-green-500 border-r-transparent">
          <div className="absolute -top-9 -right-1 text-white text-xs font-bold transform rotate-45">
            ✓
          </div>
        </div>
      )}
    </div>
  );
}
