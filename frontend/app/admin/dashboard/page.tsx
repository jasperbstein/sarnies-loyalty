'use client';

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Transaction } from "@/components/transactions/types";
import { transactionsAPI, vouchersAPI, usersAPI, settingsAPI } from "@/lib/api";
import {
  TrendingUp, Users, Gift, Activity, Zap, Award, ChevronRight, Settings, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import toast from "react-hot-toast";
import '@/app/admin/admin.css';

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
        setConfigRows([
          { id: "points", label: "Points per 100 THB", value: "1 point" },
          { id: "qrExpiry", label: "QR token expiry", value: "120 seconds" },
          { id: "otpExpiry", label: "OTP expiry", value: "5 minutes" },
        ]);
      }

      // Transform recent transactions
      const transformed: Transaction[] = data.slice(0, 8).map((tx: any) => {
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
          hour: "2-digit",
          minute: "2-digit",
        });

        const amount = tx.amount_thb || tx.amount || 0;
        const valueDisplay = amount > 0 ? `฿${Number(amount).toFixed(0)}` : "—";

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

  const redemptionRate = stats.totalPointsEarned > 0
    ? Math.round((stats.totalPointsRedeemed / stats.totalPointsEarned) * 100)
    : 0;

  return (
    <AdminLayout>
      <div className="admin-content animate-macos-fade">
        {/* Header */}
        <div className="admin-page-header">
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Overview of your loyalty program performance</p>
        </div>

        {/* Primary Stats */}
        <div className="stats-row">
          <div className="stat-card stat-card--blue group">
            <div className="flex items-center justify-between mb-3">
              <div className="stat-label">Total Users</div>
              <div className="w-9 h-9 rounded-xl bg-[rgba(0,122,255,0.08)] flex items-center justify-center">
                <Users className="w-[18px] h-[18px] text-[#007AFF]" />
              </div>
            </div>
            <div className="stat-value">
              {loading ? "—" : userStats.totalUsers.toLocaleString()}
            </div>
            {!loading && userStats.newUsersThisMonth > 0 && (
              <div className="stat-change positive">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{userStats.newUsersThisMonth} this month
              </div>
            )}
          </div>

          <div className="stat-card stat-card--green group">
            <div className="flex items-center justify-between mb-3">
              <div className="stat-label">Points Earned</div>
              <div className="w-9 h-9 rounded-xl bg-[rgba(52,199,89,0.08)] flex items-center justify-center">
                <TrendingUp className="w-[18px] h-[18px] text-[#34C759]" />
              </div>
            </div>
            <div className="stat-value">
              {loading ? "—" : stats.totalPointsEarned.toLocaleString()}
            </div>
            <div className="text-[13px] text-[#86868b] mt-2.5 font-medium">Lifetime total</div>
          </div>

          <div className="stat-card stat-card--orange group">
            <div className="flex items-center justify-between mb-3">
              <div className="stat-label">Points Redeemed</div>
              <div className="w-9 h-9 rounded-xl bg-[rgba(255,159,10,0.08)] flex items-center justify-center">
                <Gift className="w-[18px] h-[18px] text-[#FF9F0A]" />
              </div>
            </div>
            <div className="stat-value">
              {loading ? "—" : stats.totalPointsRedeemed.toLocaleString()}
            </div>
            <div className="text-[13px] text-[#86868b] mt-2.5 font-medium">{redemptionRate}% redemption rate</div>
          </div>

          <div className="stat-card stat-card--purple group">
            <div className="flex items-center justify-between mb-3">
              <div className="stat-label">Voucher Uses</div>
              <div className="w-9 h-9 rounded-xl bg-[rgba(175,82,222,0.08)] flex items-center justify-center">
                <Award className="w-[18px] h-[18px] text-[#AF52DE]" />
              </div>
            </div>
            <div className="stat-value">
              {loading ? "—" : voucherStats.totalRedemptions.toLocaleString()}
            </div>
            <div className="text-[13px] text-[#86868b] mt-2.5 font-medium">{voucherStats.activeVouchers} active vouchers</div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Users */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[rgba(0,122,255,0.08)] flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#007AFF]" />
                </div>
                <span className="admin-card-title">User Analytics</span>
              </div>
            </div>
            <div className="admin-card-body space-y-1">
              <div className="flex justify-between items-center py-3 border-b border-[rgba(0,0,0,0.04)]">
                <span className="text-[14px] text-[#86868b]">Active Users</span>
                <span className="text-[16px] font-semibold text-[#1d1d1f] tabular-nums">
                  {loading ? "—" : userStats.activeUsers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[rgba(0,0,0,0.04)]">
                <span className="text-[14px] text-[#86868b]">New This Month</span>
                <span className="text-[16px] font-semibold text-[#34C759] tabular-nums">
                  {loading ? "—" : `+${userStats.newUsersThisMonth}`}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-[14px] text-[#86868b]">Engagement Rate</span>
                <span className="text-[16px] font-semibold text-[#1d1d1f] tabular-nums">
                  {loading || userStats.totalUsers === 0
                    ? "—"
                    : `${Math.round((userStats.activeUsers / userStats.totalUsers) * 100)}%`}
                </span>
              </div>
            </div>
          </div>

          {/* Vouchers */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[rgba(255,159,10,0.08)] flex items-center justify-center">
                  <Gift className="w-4 h-4 text-[#FF9F0A]" />
                </div>
                <span className="admin-card-title">Voucher Overview</span>
              </div>
            </div>
            <div className="admin-card-body space-y-1">
              <div className="flex justify-between items-center py-3 border-b border-[rgba(0,0,0,0.04)]">
                <span className="text-[14px] text-[#86868b]">Total Vouchers</span>
                <span className="text-[16px] font-semibold text-[#1d1d1f] tabular-nums">
                  {loading ? "—" : voucherStats.totalVouchers}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[rgba(0,0,0,0.04)]">
                <span className="text-[14px] text-[#86868b]">Active</span>
                <span className="text-[16px] font-semibold text-[#34C759] tabular-nums">
                  {loading ? "—" : voucherStats.activeVouchers}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-[14px] text-[#86868b]">Total Uses</span>
                <span className="text-[16px] font-semibold text-[#1d1d1f] tabular-nums">
                  {loading ? "—" : voucherStats.totalRedemptions.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Program Health */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[rgba(52,199,89,0.08)] flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[#34C759]" />
                </div>
                <span className="admin-card-title">Program Health</span>
              </div>
            </div>
            <div className="admin-card-body space-y-1">
              <div className="flex justify-between items-center py-3 border-b border-[rgba(0,0,0,0.04)]">
                <span className="text-[14px] text-[#86868b]">Transactions</span>
                <span className="text-[16px] font-semibold text-[#1d1d1f] tabular-nums">
                  {loading ? "—" : stats.totalTransactions.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[rgba(0,0,0,0.04)]">
                <span className="text-[14px] text-[#86868b]">Redemption Rate</span>
                <span className="text-[16px] font-semibold text-[#1d1d1f] tabular-nums">
                  {loading ? "—" : `${redemptionRate}%`}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-[14px] text-[#86868b]">Avg Points/User</span>
                <span className="text-[16px] font-semibold text-[#1d1d1f] tabular-nums">
                  {loading || userStats.totalUsers === 0
                    ? "—"
                    : Math.round(stats.totalPointsEarned / userStats.totalUsers).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Vouchers */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[rgba(175,82,222,0.08)] flex items-center justify-center">
                    <Award className="w-4 h-4 text-[#AF52DE]" />
                  </div>
                  <span className="admin-card-title">Top Vouchers</span>
                </div>
                <a href="/admin/vouchers" className="text-[13px] text-[#007AFF] hover:text-[#0066D6] font-medium flex items-center gap-1 transition-colors">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div className="p-0">
              {loading ? (
                <div className="admin-loading"><div className="admin-spinner"></div></div>
              ) : voucherStats.topVouchers.length === 0 ? (
                <div className="admin-empty">
                  <p className="admin-empty-text">No voucher data yet</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Voucher</th>
                      <th className="text-right">Uses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voucherStats.topVouchers.map((voucher, index) => (
                      <tr key={voucher.id}>
                        <td className="w-10 font-mono text-[#86868b] text-[13px]">{index + 1}</td>
                        <td>
                          <div className="font-medium text-[#1d1d1f]">{voucher.title}</div>
                          <div className="text-[12px] text-[#86868b] mt-0.5">
                            {voucher.points === 0 ? (
                              <span className="text-[#34C759] font-medium">Free</span>
                            ) : (
                              `${voucher.points} pts`
                            )}
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="font-semibold text-[#1d1d1f] tabular-nums">{voucher.redemptions}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[rgba(90,200,250,0.12)] flex items-center justify-center">
                    <Activity className="w-4 h-4 text-[#5AC8FA]" />
                  </div>
                  <span className="admin-card-title">Recent Activity</span>
                </div>
                <a href="/admin/transactions" className="text-[13px] text-[#007AFF] hover:text-[#0066D6] font-medium flex items-center gap-1 transition-colors">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div className="p-0">
              {loading ? (
                <div className="admin-loading"><div className="admin-spinner"></div></div>
              ) : recentTransactions.length === 0 ? (
                <div className="admin-empty">
                  <p className="admin-empty-text">No transactions yet</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Type</th>
                      <th className="text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.slice(0, 6).map((tx) => (
                      <tr key={tx.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#F5F5F7] to-[#E8E8ED] flex items-center justify-center text-[11px] font-semibold text-[#636366]">
                              {tx.userInitials}
                            </div>
                            <div>
                              <div className="font-medium text-[#1d1d1f] text-[13px]">{tx.userName}</div>
                              <div className="text-[11px] text-[#86868b] mt-0.5">{tx.createdAtDisplay}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`admin-badge ${
                            tx.type === 'earned' ? 'admin-badge-success' :
                            tx.type === 'redeemed' ? 'admin-badge-info' :
                            'admin-badge-neutral'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="text-right">
                          <span className={`font-semibold tabular-nums ${
                            tx.type === 'earned' ? 'text-[#34C759]' :
                            tx.type === 'redeemed' ? 'text-[#FF453A]' :
                            'text-[#1d1d1f]'
                          }`}>
                            {tx.type === 'earned' ? '+' : tx.type === 'redeemed' ? '-' : ''}{tx.points}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* System Config */}
        <div className="mt-5">
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[rgba(142,142,147,0.12)] flex items-center justify-center">
                    <Settings className="w-4 h-4 text-[#8E8E93]" />
                  </div>
                  <span className="admin-card-title">System Configuration</span>
                </div>
                <a href="/admin/settings" className="text-[13px] text-[#007AFF] hover:text-[#0066D6] font-medium flex items-center gap-1 transition-colors">
                  Settings <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div className="admin-card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {configRows.map((row) => (
                  <div key={row.id} className="admin-config-item">
                    <div className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider mb-2">{row.label}</div>
                    <div className="text-[18px] font-semibold text-[#1d1d1f]">{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
