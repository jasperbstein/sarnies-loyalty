'use client';

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { DashboardStatsCards } from "@/components/dashboard/DashboardStatsCards";
import { RecentTransactionsPanel } from "@/components/dashboard/RecentTransactionsPanel";
import { SystemConfigPanel } from "@/components/dashboard/SystemConfigPanel";
import { Transaction } from "@/components/transactions/types";
import { transactionsAPI, vouchersAPI, usersAPI, settingsAPI } from "@/lib/api";
import { TrendingUp, Users, Gift, DollarSign } from "lucide-react";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalPointsEarned: 0,
    totalPointsRedeemed: 0,
  });
  const [voucherStats, setVoucherStats] = useState({
    totalVouchers: 0,
    activeVouchers: 0,
    totalRedemptions: 0,
    topVouchers: [] as any[],
  });
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
  });
  const [configRows, setConfigRows] = useState([
    { id: "points", label: "Points per 100 THB", value: "..." },
    { id: "qrExpiry", label: "QR token expiry", value: "..." },
    { id: "otpExpiry", label: "OTP expiry", value: "..." },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch transactions
      const response = await transactionsAPI.getAll({ limit: 100 });
      const data = response.data.transactions || response.data;

      // Calculate transaction stats
      const calculated = data.reduce(
        (acc: any, tx: any) => {
          acc.totalTransactions++;
          if (tx.type === "earn" || tx.type === "points_earned") {
            acc.totalPointsEarned += Math.abs(tx.points_delta || tx.points || 0);
          } else if (tx.type === "redeem" || tx.type === "voucher_redeemed") {
            acc.totalPointsRedeemed += Math.abs(tx.points_delta || tx.points || 0);
          }
          return acc;
        },
        {
          totalTransactions: 0,
          totalPointsEarned: 0,
          totalPointsRedeemed: 0,
        }
      );

      setStats(calculated);

      // Fetch vouchers
      try {
        const vouchersRes = await vouchersAPI.getAllAdmin();
        const vouchers = vouchersRes.data || [];
        const activeVouchers = vouchers.filter((v: any) => v.is_active);
        const totalRedemptions = vouchers.reduce((sum: number, v: any) =>
          sum + (parseInt(v.times_redeemed) || 0), 0
        );

        // Top 5 vouchers by redemptions
        const topVouchers = vouchers
          .filter((v: any) => (parseInt(v.times_redeemed) || 0) > 0)
          .sort((a: any, b: any) => (parseInt(b.times_redeemed) || 0) - (parseInt(a.times_redeemed) || 0))
          .slice(0, 5)
          .map((v: any) => ({
            id: v.id,
            title: v.title || v.name,
            redemptions: parseInt(v.times_redeemed) || 0,
            points: v.points_required || 0,
          }));

        setVoucherStats({
          totalVouchers: vouchers.length,
          activeVouchers: activeVouchers.length,
          totalRedemptions,
          topVouchers,
        });
      } catch (error) {
        console.error('Failed to fetch voucher stats:', error);
      }

      // Fetch users
      try {
        const usersRes = await usersAPI.getAll({ limit: 1000 });
        const users = usersRes.data.users || usersRes.data || [];
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const newUsersThisMonth = users.filter((u: any) =>
          new Date(u.created_at) >= firstDayOfMonth
        ).length;

        setUserStats({
          totalUsers: users.length,
          activeUsers: users.filter((u: any) => u.points_balance > 0).length,
          newUsersThisMonth,
        });
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      }

      // Fetch system config
      try {
        const configRes = await settingsAPI.getAdminConfig();
        const configData = configRes.data || [];
        if (Array.isArray(configData) && configData.length > 0) {
          setConfigRows(configData);
        }
      } catch (error) {
        console.error('Failed to fetch system config:', error);
        // Keep showing default/fallback values on error
        setConfigRows([
          { id: "points", label: "Points per 100 THB", value: "1 point" },
          { id: "qrExpiry", label: "QR token expiry", value: "120 seconds" },
          { id: "otpExpiry", label: "OTP expiry", value: "5 minutes" },
        ]);
      }

      // Transform recent transactions
      const transformed: Transaction[] = data.slice(0, 10).map((tx: any) => {
        const userName = tx.user_name || `User ${tx.user_id}`;
        const initials = userName
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        let type: "earned" | "redeemed" | "adjusted" = "earned";
        if (tx.type === "redeem" || tx.type === "voucher_redeemed") {
          type = "redeemed";
        } else if (tx.type === "adjustment" || tx.type === "points_adjusted") {
          type = "adjusted";
        }

        const createdAt = new Date(tx.created_at || tx.timestamp);
        const createdAtDisplay = createdAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const amount = tx.amount_thb || tx.amount || 0;
        const valueDisplay = amount > 0 ? `฿${Number(amount).toFixed(2)}` : "—";

        return {
          id: String(tx.id),
          userName,
          userInitials: initials,
          type,
          status: "completed" as const,
          points: Math.abs(tx.points_delta || tx.points || 0),
          valueDisplay,
          outlet: tx.outlet_name || tx.outlet || null,
          createdAtDisplay,
        };
      });

      setRecentTransactions(transformed);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      id: "total",
      label: "Total transactions",
      value: loading ? "..." : stats.totalTransactions.toLocaleString(),
    },
    {
      id: "earned",
      label: "Points earned",
      value: loading ? "..." : stats.totalPointsEarned.toLocaleString(),
    },
    {
      id: "redeemed",
      label: "Points redeemed",
      value: loading ? "..." : stats.totalPointsRedeemed.toLocaleString(),
    },
  ];

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div>
            <h1 className="text-[28px] font-semibold text-neutral-900">
              Dashboard
            </h1>
          </div>

          {/* Top stats - Transactions */}
          <DashboardStatsCards stats={statCards} />

          {/* Analytics Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Users Stats */}
            <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users size={18} className="text-blue-600" />
                </div>
                <h3 className="text-[14px] font-semibold text-neutral-900">Users</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Total Users</p>
                  <p className="text-[28px] font-bold text-neutral-900">{loading ? "..." : userStats.totalUsers.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Active</p>
                    <p className="text-[20px] font-bold text-neutral-900">{loading ? "..." : userStats.activeUsers.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">New This Month</p>
                    <p className="text-[20px] font-bold text-green-600">{loading ? "..." : `+${userStats.newUsersThisMonth}`}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vouchers Stats */}
            <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Gift size={18} className="text-purple-600" />
                </div>
                <h3 className="text-[14px] font-semibold text-neutral-900">Vouchers</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Total Redemptions</p>
                  <p className="text-[28px] font-bold text-neutral-900">{loading ? "..." : voucherStats.totalRedemptions.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Total</p>
                    <p className="text-[20px] font-bold text-neutral-900">{loading ? "..." : voucherStats.totalVouchers}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Active</p>
                    <p className="text-[20px] font-bold text-green-600">{loading ? "..." : voucherStats.activeVouchers}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Stats */}
            <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp size={18} className="text-green-600" />
                </div>
                <h3 className="text-[14px] font-semibold text-neutral-900">Engagement</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Points Earned</p>
                  <p className="text-[28px] font-bold text-neutral-900">{loading ? "..." : stats.totalPointsEarned.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Redeemed</p>
                    <p className="text-[20px] font-bold text-neutral-900">{loading ? "..." : stats.totalPointsRedeemed.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Redemption Rate</p>
                    <p className="text-[20px] font-bold text-neutral-900">
                      {loading || stats.totalPointsEarned === 0
                        ? "..."
                        : `${Math.round((stats.totalPointsRedeemed / stats.totalPointsEarned) * 100)}%`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performing Vouchers */}
          {voucherStats.topVouchers.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-[14px] font-semibold text-neutral-900">Top Performing Vouchers</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {voucherStats.topVouchers.map((voucher, index) => (
                    <div key={voucher.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[13px] font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-neutral-900">{voucher.title}</p>
                          <p className="text-[12px] text-neutral-500">{voucher.points} points</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[20px] font-bold text-neutral-900">{voucher.redemptions}</p>
                        <p className="text-[11px] text-neutral-500">redemptions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Middle: Recent transactions */}
          <RecentTransactionsPanel items={recentTransactions} />

          {/* Bottom: System config */}
          <SystemConfigPanel rows={configRows} />
        </div>
      </div>
    </AdminLayout>
  );
}
