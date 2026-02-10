'use client';

import React, { useMemo, useState, useEffect } from "react";
import { Search, Receipt } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import '@/app/admin/admin.css';
import {
  TransactionsFiltersBar,
  TypeFilter,
  StatusFilter,
} from "@/components/transactions/TransactionsFiltersBar";
import { TransactionRow } from "@/components/transactions/TransactionRow";
import { TransactionDetailDrawer } from "@/components/transactions/TransactionDetailDrawer";
import { Transaction } from "@/components/transactions/types";
import { transactionsAPI } from "@/lib/api";
import toast from "react-hot-toast";

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await transactionsAPI.getAll({ limit: 1000 });
      const data = response.data.transactions || response.data;

      // Transform API data to Transaction type
      const transformed: Transaction[] = data.map((tx: any) => {
        const userName = tx.user_name || `User ${tx.user_id}`;
        const initials = userName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        let type: "earned" | "redeemed" | "adjusted" = "earned";
        if (tx.type === "redeem" || tx.type === "voucher_redeemed") {
          type = "redeemed";
        } else if (tx.type === "adjustment" || tx.type === "points_adjusted") {
          type = "adjusted";
        }

        let status: "completed" | "pending" | "failed" = "completed";
        if (tx.status === "pending") {
          status = "pending";
        } else if (tx.status === "failed" || tx.status === "cancelled") {
          status = "failed";
        }

        const amount = tx.amount_thb || tx.amount || 0;
        const valueDisplay = amount > 0
          ? `฿${Number(amount).toFixed(2)}`
          : "—";

        const createdAt = new Date(tx.created_at || tx.timestamp);
        const createdAtDisplay = createdAt.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return {
          id: String(tx.id),
          userName,
          userSubtitle: tx.user_phone || undefined,
          userInitials: initials,
          type,
          status,
          points: Math.abs(tx.points_earned || tx.points || 0),
          valueDisplay,
          outlet: tx.outlet_name || tx.outlet || null,
          createdAtDisplay,
        };
      });

      setTransactions(transformed);
    } catch (error) {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return transactions.filter((tx) => {
      if (q) {
        const combined = (
          tx.userName +
          (tx.userSubtitle || "") +
          (tx.outlet || "") +
          tx.valueDisplay
        ).toLowerCase();
        if (!combined.includes(q)) return false;
      }
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      return true;
    });
  }, [search, typeFilter, statusFilter, transactions]);

  const selectedTx = filtered.find((t) => t.id === selectedId) || null;

  return (
    <AdminLayout>
      <div className="min-h-screen admin-page animate-macos-fade">
        <div className="admin-page-container">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#34C759] to-[#248A3D] flex items-center justify-center shadow-lg">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
                  Transactions
                </h1>
                <p className="text-[14px] text-[#86868b]">
                  {transactions.length} total transactions
                </p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="admin-card p-4 mb-6">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="flex items-end gap-4 flex-1">
                {/* Search - No label */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    className="w-[320px] h-[40px] pl-10 pr-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[rgba(0,122,255,0.3)] focus:border-[#007AFF] transition-all bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-1.5">
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                    className="admin-select"
                  >
                    <option value="all">All</option>
                    <option value="earned">Earned</option>
                    <option value="redeemed">Redeemed</option>
                    <option value="adjusted">Adjusted</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-1.5">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="admin-select"
                  >
                    <option value="all">All</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              <div className="h-8 px-3 rounded-lg border border-[rgba(0,0,0,0.1)] text-[13px] flex items-center gap-2 bg-white">
                <span className="text-[#86868b]">Rows per page</span>
                <select
                  className="bg-transparent outline-none text-[#1d1d1f] cursor-pointer"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                >
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="admin-card overflow-hidden">
            <div className="flex items-center h-[48px] px-4 border-b border-[rgba(0,0,0,0.06)] bg-[rgba(246,246,246,0.6)]">
              <div className="flex-1 px-4 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">User</div>
              <div className="w-[120px] px-4 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Type</div>
              <div className="w-[140px] px-4 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Outlet</div>
              <div className="w-[100px] px-4 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Points</div>
              <div className="w-[100px] px-4 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Value</div>
              <div className="w-[110px] px-4 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Status</div>
              <div className="w-[140px] px-4 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Date</div>
              <div className="w-10" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40 text-[14px] text-[#86868b]">
                Loading transactions...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-4">
                <div className="w-12 h-12 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center mb-4">
                  <Search size={24} className="text-[#86868b]" />
                </div>
                <h3 className="text-[16px] font-semibold text-[#1d1d1f] mb-1">No transactions found</h3>
                <p className="text-[14px] text-[#86868b]">Try adjusting your search or filters.</p>
              </div>
            ) : (
              filtered.slice(0, limit).map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  onClick={(id) => setSelectedId(id)}
                />
              ))
            )}
          </div>

          <TransactionDetailDrawer
            open={!!selectedTx}
            tx={selectedTx}
            onClose={() => setSelectedId(null)}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
