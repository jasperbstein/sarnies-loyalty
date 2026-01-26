'use client';

import { User, Phone, Mail, Award, Calendar, MapPin } from 'lucide-react';

interface CustomerPreviewCardProps {
  customer: {
    id: number;
    name: string;
    surname?: string;
    phone: string;
    email?: string;
    points_balance: number;
    created_at: string;
  };
  qrType: 'loyalty_id' | 'voucher_redemption';
  showFullDetails?: boolean;
}

export default function CustomerPreviewCard({
  customer,
  qrType,
  showFullDetails = true
}: CustomerPreviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getInitials = () => {
    const firstInitial = customer.name?.charAt(0) || '';
    const lastInitial = customer.surname?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase();
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border-2 border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-gray-600" />
        <h3 className="font-bold text-lg text-gray-800">Customer Information</h3>
        <div className="ml-auto">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            qrType === 'loyalty_id'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {qrType === 'loyalty_id' ? 'LOYALTY QR' : 'VOUCHER QR'}
          </span>
        </div>
      </div>

      {/* Customer Profile */}
      <div className="flex items-start gap-4 mb-6">
        {/* Avatar */}
        <div className="w-16 h-16 bg-gradient-to-br from-black to-gray-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
          <span className="text-white font-bold text-xl">{getInitials()}</span>
        </div>

        {/* Basic Info */}
        <div className="flex-1">
          <h4 className="text-xl font-bold text-black mb-1">
            {customer.name} {customer.surname || ''}
          </h4>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{customer.phone}</span>
            </div>

            {customer.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{customer.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Points Badge */}
        <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl px-4 py-3 text-center shadow-md">
          <div className="flex items-center gap-1 mb-1">
            <Award className="w-4 h-4 text-white" />
            <p className="text-xs font-medium text-white">Points</p>
          </div>
          <p className="text-2xl font-bold text-white">{customer.points_balance}</p>
        </div>
      </div>

      {/* Additional Details */}
      {showFullDetails && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <p className="text-xs text-gray-500">Member Since</p>
            </div>
            <p className="font-bold text-black">{formatDate(customer.created_at)}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-gray-500" />
              <p className="text-xs text-gray-500">Member ID</p>
            </div>
            <p className="font-bold text-black">#{customer.id}</p>
          </div>
        </div>
      )}
    </div>
  );
}
