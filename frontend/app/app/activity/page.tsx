'use client';

import React, { useState, useEffect } from "react";
import { ActivityFilters, ActivityFilterValue } from "@/components/customer/activity/ActivityFilters";
import { EmptyState } from "@/components/customer/ui/EmptyState";
import AppLayout from "@/components/AppLayout";
import { useTabSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { useAuthStore } from "@/lib/store";
import { usersAPI } from "@/lib/api";
import VoucherInstanceCard from "@/components/VoucherInstanceCard";
import QRModal from "@/components/QRModal";
import toast from 'react-hot-toast';
import { Clock, CheckCircle } from 'lucide-react';

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

export default function ActivityPage() {
  const [filter, setFilter] = useState<ActivityFilterValue | 'active'>("all");
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
  }, [user, mounted, hasHydrated, filter]);

  const fetchVoucherInstances = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const statusFilter = filter === 'all' ? undefined : filter as 'active' | 'used' | 'expired';
      const response = await usersAPI.getVoucherInstances(user.id, statusFilter);
      setVoucherInstances(response.data.voucher_instances);
    } catch (error) {
      console.error('Failed to fetch voucher instances:', error);
      toast.error('Failed to load voucher history');
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

  if (!mounted || !hasHydrated) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const isEmployee = user?.user_type === 'employee';

  // Count vouchers by status
  const statusCounts = voucherInstances.reduce((acc, v) => {
    acc[v.computed_status] = (acc[v.computed_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hasMultipleStatuses = Object.keys(statusCounts).length > 1;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-24">
        <header>
          <h1 className="text-[24px] font-semibold text-[#1B1B1B]">
            {isEmployee ? 'Redemption History' : 'Activity History'}
          </h1>
          <p className="text-[14px] text-[#6F6F6F] mt-1">
            {isEmployee ? 'Your daily drink redemption history.' : 'Your points and voucher history.'}
          </p>
          {!isEmployee && (
            <div className="mt-3 inline-flex items-center px-4 py-2 rounded-full bg-[#FFF6E8] text-[14px] text-[#8B6F36]">
              ⭐ <span className="ml-2">{user?.points_balance || 0} points remaining</span>
            </div>
          )}
        </header>

        {!isEmployee && !loading && voucherInstances.length > 0 && <ActivityFilters value={filter as ActivityFilterValue} onChange={setFilter} />}

        {isEmployee && !loading && voucherInstances.length > 0 && hasMultipleStatuses && (
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({voucherInstances.length})
            </button>
            {statusCounts['active'] > 0 && (
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === 'active'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active ({statusCounts['active']})
              </button>
            )}
            {statusCounts['used'] > 0 && (
              <button
                onClick={() => setFilter('used')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === 'used'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Used ({statusCounts['used']})
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : voucherInstances.length === 0 ? (
          <EmptyState
            title={isEmployee ? "No redemptions yet" : "No activity yet"}
            description={
              filter === 'all'
                ? isEmployee
                  ? "Your daily drink redemptions will appear here."
                  : "Your vouchers will appear here after redemption."
                : `No ${filter} ${isEmployee ? 'redemptions' : 'vouchers'} found.`
            }
          />
        ) : isEmployee ? (
          <div className="space-y-6">
            {Object.entries(
              voucherInstances.reduce((acc, instance) => {
                const date = new Date(instance.redeemed_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
                if (!acc[date]) acc[date] = [];
                acc[date].push(instance);
                return acc;
              }, {} as Record<string, VoucherInstance[]>)
            ).map(([date, instances]) => (
              <div key={date}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{date}</h3>
                <div className="space-y-3">
                  {instances.map((instance) => (
                    <div key={instance.id} className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900">{instance.title}</h4>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          instance.computed_status === 'used'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {instance.computed_status === 'used' ? 'Used' : 'Active'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(instance.redeemed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {instance.used_at && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>Used at {new Date(instance.used_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right text-sm text-gray-500">
                  <span className="font-semibold">{instances.length}</span> redemption{instances.length !== 1 ? 's' : ''} on this day
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {voucherInstances.map((instance) => (
              <VoucherInstanceCard
                key={instance.id}
                {...instance}
                onClick={() => handleVoucherClick(instance)}
              />
            ))}
          </div>
        )}
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
