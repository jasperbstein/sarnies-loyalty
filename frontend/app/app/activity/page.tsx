'use client';

import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useTabSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { useAuthStore } from "@/lib/store";
import { usersAPI } from "@/lib/api";
import QRModal from "@/components/QRModal";
import toast from 'react-hot-toast';
import { Gift } from 'lucide-react';
import { PullToRefresh } from '@/components/PullToRefresh';
import { isEmployeeUser } from '@/lib/authUtils';

/**
 * ActivityPage - Transaction history and voucher activity
 * Sarnies Design System v2.0
 *
 * Responsive breakpoints:
 * - Mobile: < 768px (full width cards)
 * - Tablet/Desktop: centered max-width container
 */

interface VoucherInstance {
  id: number;
  uuid: string;
  voucher_id: number;
  qr_code_data: string;
  status: string;
  computed_status: 'active' | 'used' | 'expired';
  redeemed_at: string;
  used_at?: string;
  expires_at?: string;
  title: string;
  description: string;
  image_url?: string;
  points_required: number;
  cash_value: number;
  voucher_type: string;
}

type FilterValue = 'all' | 'active' | 'used';

export default function ActivityPage() {
  const [filter, setFilter] = useState<FilterValue>("all");
  const { user, hasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [voucherInstances, setVoucherInstances] = useState<VoucherInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<VoucherInstance | null>(null);

  useTabSwipeNavigation();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user && mounted && hasHydrated) {
      fetchVoucherInstances();
    }
  }, [user, mounted, hasHydrated]);

  const fetchVoucherInstances = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await usersAPI.getVoucherInstances(user.id);
      setVoucherInstances(response.data.voucher_instances);
    } catch (error) {
      console.error('Failed to fetch voucher instances:', error);
      toast.error('Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchVoucherInstances();
  };

  const handleVoucherClick = (instance: VoucherInstance) => {
    if (instance.computed_status === 'active') {
      setSelectedInstance(instance);
      setShowQRModal(true);
    }
  };

  // Group voucher instances by date
  const groupedVouchers = useMemo(() => {
    // Filter based on status
    const filtered = filter === 'all' ? voucherInstances :
      filter === 'active' ? voucherInstances.filter(v => v.computed_status === 'active') :
      filter === 'used' ? voucherInstances.filter(v => v.computed_status === 'used' || v.computed_status === 'expired') :
      voucherInstances;

    const groups: Record<string, VoucherInstance[]> = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    filtered.forEach(voucher => {
      const date = new Date(voucher.redeemed_at).toDateString();
      let label = date;
      if (date === today) label = 'TODAY';
      else if (date === yesterday) label = 'YESTERDAY';
      else label = new Date(voucher.redeemed_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      }).toUpperCase();

      if (!groups[label]) groups[label] = [];
      groups[label].push(voucher);
    });

    return groups;
  }, [voucherInstances, filter]);

  if (!mounted || !hasHydrated) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen bg-stone-50">
          <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const isEmployee = isEmployeeUser(user);

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="flex flex-col min-h-screen bg-stone-50">
          {/* Responsive container */}
          <div className="max-w-2xl lg:max-w-4xl mx-auto w-full">
            {/* Header */}
            <header className="bg-stone-50 px-4 md:px-6 pt-4 pb-2">
              <h1 className="text-xl font-semibold text-stone-900">
                Activity
              </h1>
              <p className="text-sm text-stone-500 mt-1">
                Your points and voucher history
              </p>
            </header>

            {/* Filter Tabs */}
            <div className="px-4 md:px-6 py-4 flex gap-2">
              {([
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'used', label: 'Used' }
              ] as { value: FilterValue; label: string }[]).map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filter === f.value
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 px-4 md:px-6 pb-24 space-y-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : Object.keys(groupedVouchers).length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
                  <div className="w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-7 h-7 text-stone-400" />
                  </div>
                  <h3 className="text-base font-semibold text-stone-900 mb-1">
                    {filter === 'active' ? 'No active vouchers' : filter === 'used' ? 'No used vouchers' : 'No activity yet'}
                  </h3>
                  <p className="text-sm text-stone-500">
                    {filter === 'active' ? 'Redeem vouchers to see them here.' : filter === 'used' ? 'Used vouchers will appear here.' : 'Your redeemed vouchers will appear here.'}
                  </p>
                </div>
              ) : (
                Object.entries(groupedVouchers).map(([date, vouchers]) => (
                  <div key={date}>
                    {/* Date Label */}
                    <p className="text-xs font-semibold text-stone-500 tracking-wider mb-3 uppercase">
                      {date}
                    </p>

                    {/* Voucher Items */}
                    <div className="space-y-3">
                      {vouchers.map((voucher) => (
                        <button
                          key={voucher.id}
                          onClick={() => handleVoucherClick(voucher)}
                          disabled={voucher.computed_status !== 'active'}
                          className={`w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-stone-200 text-left transition-all ${
                            voucher.computed_status === 'active'
                              ? 'hover:border-stone-300 active:scale-[0.99]'
                              : 'opacity-60'
                          }`}
                        >
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            voucher.computed_status === 'active'
                              ? 'bg-green-50'
                              : voucher.computed_status === 'used'
                              ? 'bg-stone-100'
                              : 'bg-red-50'
                          }`}>
                            <Gift className={`w-5 h-5 ${
                              voucher.computed_status === 'active'
                                ? 'text-green-600'
                                : voucher.computed_status === 'used'
                                ? 'text-stone-400'
                                : 'text-red-400'
                            }`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-stone-900">
                              {voucher.title}
                            </h4>
                            <p className="text-xs text-stone-500">
                              {new Date(voucher.redeemed_at).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                              {voucher.used_at && ` • Used ${new Date(voucher.used_at).toLocaleDateString()}`}
                            </p>
                          </div>

                          {/* Status Badge */}
                          <span className={`text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0 ${
                            voucher.computed_status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : voucher.computed_status === 'used'
                              ? 'bg-stone-100 text-stone-500'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {voucher.computed_status === 'active' ? 'Active' : voucher.computed_status === 'used' ? 'Used' : 'Expired'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>

      {selectedInstance && (
        <QRModal
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedInstance(null);
          }}
          title={selectedInstance.title}
          qrDataUrl={selectedInstance.qr_code_data}
          expiresAt={selectedInstance.expires_at}
        />
      )}
    </AppLayout>
  );
}
