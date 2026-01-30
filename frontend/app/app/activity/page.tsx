'use client';

import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useTabSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { useAuthStore } from "@/lib/store";
import { usersAPI } from "@/lib/api";
import VoucherInstanceCard from "@/components/VoucherInstanceCard";
import QRModal from "@/components/QRModal";
import toast from 'react-hot-toast';
import { Plus, Gift, Minus } from 'lucide-react';

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

interface Transaction {
  id: number;
  type: 'earned' | 'redeemed' | 'adjusted';
  points: number;
  description: string;
  location?: string;
  created_at: string;
}

type FilterValue = 'all' | 'earned' | 'redeemed';

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

  const handleVoucherClick = (instance: VoucherInstance) => {
    if (instance.computed_status === 'active') {
      setSelectedInstance(instance);
      setShowQRModal(true);
    }
  };

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    // Convert voucher instances to transaction-like items
    type TransactionItem = {
      id: number;
      type: 'earned' | 'redeemed';
      points: number;
      description: string;
      location: string;
      created_at: string;
      instance: VoucherInstance;
    };

    const items: TransactionItem[] = voucherInstances.map(v => ({
      id: v.id,
      type: 'redeemed' as const,
      points: -v.points_required,
      description: v.title,
      location: '',
      created_at: v.redeemed_at,
      instance: v
    }));

    // Filter based on selected filter
    const filtered = filter === 'all' ? items :
      filter === 'redeemed' ? items.filter(i => i.type === 'redeemed') :
      filter === 'earned' ? items.filter(i => i.type === 'earned') :
      items;

    // Group by date
    const groups: Record<string, typeof items> = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    filtered.forEach(item => {
      const date = new Date(item.created_at).toDateString();
      let label = date;
      if (date === today) label = 'TODAY';
      else if (date === yesterday) label = 'YESTERDAY';
      else label = new Date(item.created_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      }).toUpperCase();

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    return groups;
  }, [voucherInstances, filter]);

  if (!mounted || !hasHydrated) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const isEmployee = user?.user_type === 'employee';

  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white px-5 py-4 flex items-center justify-center">
          <h1 className="text-[18px] font-semibold text-[#1C1917]">
            Activity
          </h1>
        </header>

        {/* Filter Tabs */}
        <div className="bg-white px-5 py-4 flex gap-2">
          {(['all', 'earned', 'redeemed'] as FilterValue[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                filter === f
                  ? 'bg-[#1C1917] text-white'
                  : 'bg-transparent text-[#57534E] border border-[#E5E5E5] hover:border-[#1C1917]'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 px-5 pb-24 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : Object.keys(groupedTransactions).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F5F5F4] flex items-center justify-center mb-4">
                <Gift className="w-8 h-8 text-[#78716C]" />
              </div>
              <h3 className="text-[16px] font-semibold text-[#1C1917] mb-1">
                No activity yet
              </h3>
              <p className="text-[14px] text-[#78716C]">
                Your points and voucher history will appear here.
              </p>
            </div>
          ) : (
            Object.entries(groupedTransactions).map(([date, items]) => (
              <div key={date}>
                {/* Date Label */}
                <p className="text-[11px] font-semibold text-[#78716C] tracking-[1px] mb-3">
                  {date}
                </p>

                {/* Activity Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => item.instance && handleVoucherClick(item.instance)}
                      className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-[#F0F0F0] shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-left transition-all hover:shadow-md active:scale-[0.99]"
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.type === 'earned'
                          ? 'bg-[#F0FDF4]'
                          : 'bg-[#FFFBEB]'
                      }`}>
                        {item.type === 'earned' ? (
                          <Plus className="w-[18px] h-[18px] text-[#059669]" />
                        ) : (
                          <Minus className="w-[18px] h-[18px] text-[#D97706]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[14px] font-semibold text-[#1C1917]">
                          {item.description}
                        </h4>
                        <p className="text-[12px] text-[#78716C]">
                          {new Date(item.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                          {item.location && ` \u2022 ${item.location}`}
                        </p>
                      </div>

                      {/* Points */}
                      <span className={`text-[16px] font-bold flex-shrink-0 ${
                        item.type === 'earned'
                          ? 'text-[#059669]'
                          : 'text-[#D97706]'
                      }`}>
                        {item.type === 'earned' ? '+' : ''}{item.points}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
