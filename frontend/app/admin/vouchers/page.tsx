'use client';

import React, { useMemo, useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { VoucherGroup } from "@/components/vouchers/VoucherGroup";
import {
  VoucherGroup as VoucherGroupType,
  Voucher,
} from "@/components/vouchers/types";
import { VoucherFiltersBar, StatusFilter, ScopeFilter } from "@/components/vouchers/VoucherFiltersBar";
import { Search } from "lucide-react";
import { vouchersAPI } from "@/lib/api";
import api from "@/lib/api";
import toast from "react-hot-toast";
import VoucherForm from "@/components/VoucherForm";

export default function VouchersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [groups, setGroups] = useState<VoucherGroupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<any>(null);
  const [companies, setCompanies] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVouchers();
    fetchCompanies();
  }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await vouchersAPI.getAllAdmin();
      const vouchers = response.data;
      const categorized = categorizeVouchers(vouchers);
      setGroups(categorized);
    } catch (error) {
      toast.error("Failed to load vouchers");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies');
      // Handle both response formats: array or object with companies property
      const companiesData = Array.isArray(response.data) ? response.data : (response.data?.companies || []);
      setCompanies(companiesData);
    } catch (error) {
      console.error("Failed to load companies:", error);
      setCompanies([]);
    }
  };

  const handleCreateVoucher = async (data: any) => {
    setIsSubmitting(true);
    try {
      await vouchersAPI.create(data);
      toast.success("Voucher created successfully");
      setShowCreateModal(false);
      fetchVouchers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create voucher");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categorizeVouchers = (vouchers: any[]): VoucherGroupType[] => {
    const categories: Record<string, Voucher[]> = {
      "Staff Perks": [],
      "Company Exclusive": [],
      "Customer Rewards": [],
    };

    vouchers.forEach((v) => {
      const userTypes = v.target_user_types || v.allowed_user_types || [];
      const isCompanyExclusive = v.is_company_exclusive;

      const voucher: Voucher = {
        id: String(v.id),
        name: v.title || v.name || "Untitled Voucher",
        type: determineVoucherType(v),
        category: v.category || null,
        status: v.is_active ? "active" : "inactive",
        points: v.points_required || 0,
        valueDisplay: formatValue(v),
        redeemedCount: parseInt(v.times_redeemed) || 0,
        userCount: parseInt(v.unique_users) || 0,
        featured: v.is_featured || false,
      };

      if (!isCompanyExclusive && (userTypes.includes("staff") || userTypes.includes("employee")) && !userTypes.includes("customer")) {
        categories["Staff Perks"].push(voucher);
      } else if (isCompanyExclusive) {
        categories["Company Exclusive"].push(voucher);
      } else {
        categories["Customer Rewards"].push(voucher);
      }
    });

    return Object.entries(categories).map(([name, vouchers]) => ({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      voucherCount: vouchers.length,
      vouchers,
    }));
  };

  const determineVoucherType = (v: any): "freeItem" | "discount" | "promotion" => {
    if (v.voucher_type === "free_item") return "freeItem";
    if (v.discount_percentage || v.discount_amount) return "discount";
    return "promotion";
  };

  const formatValue = (v: any): string => {
    if (v.discount_percentage) return `${v.discount_percentage}%`;
    if (v.discount_amount) return `฿${Number(v.discount_amount).toFixed(2)}`;
    return "—";
  };

  const filteredGroups = useMemo(() => {
    const matchesSearch = (value: string) =>
      value.toLowerCase().includes(search.toLowerCase());

    return groups.map((group) => ({
      ...group,
      vouchers: group.vouchers.filter((v) => {
        if (statusFilter !== "all" && v.status !== statusFilter) return false;
        if (scopeFilter === "company" && group.name !== "Company Exclusive") return false;
        if (scopeFilter === "general" && group.name === "Company Exclusive") return false;
        if (!matchesSearch(v.name)) return false;
        return true;
      }),
    }));
  }, [search, statusFilter, scopeFilter, groups]);

  const handleEditVoucher = async (id: string) => {
    try {
      // Fetch the full voucher data from backend
      const response = await vouchersAPI.getAllAdmin();
      const voucher = response.data.find((v: any) => String(v.id) === String(id));

      if (voucher) {
        setEditingVoucher(voucher);
        setShowEditModal(true);
      } else {
        toast.error("Voucher not found");
      }
    } catch (error) {
      toast.error("Failed to load voucher details");
    }
  };

  const handleUpdateVoucher = async (data: any) => {
    if (!editingVoucher) return;

    setIsSubmitting(true);
    try {
      await vouchersAPI.update(editingVoucher.id, data);
      toast.success("Voucher updated successfully");
      setShowEditModal(false);
      setEditingVoucher(null);
      fetchVouchers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update voucher");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateVoucher = async (id: string) => {
    try {
      // Fetch the voucher to duplicate
      const response = await vouchersAPI.getAllAdmin();
      const voucher = response.data.find((v: any) => String(v.id) === String(id));

      if (voucher) {
        // Remove id and adjust title
        const duplicateData = {
          ...voucher,
          title: `${voucher.title} (Copy)`,
        };
        delete duplicateData.id;
        delete duplicateData.created_at;
        delete duplicateData.updated_at;
        delete duplicateData.times_redeemed;
        delete duplicateData.active_redemptions;
        delete duplicateData.unique_users;
        delete duplicateData.last_redeemed_at;

        await vouchersAPI.create(duplicateData);
        toast.success("Voucher duplicated successfully");
        fetchVouchers();
      } else {
        toast.error("Voucher not found");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to duplicate voucher");
    }
  };

  const handleArchiveVoucher = async (id: string) => {
    if (!confirm("Are you sure you want to archive this voucher?")) return;

    try {
      await vouchersAPI.update(Number(id), { is_active: false });
      toast.success("Voucher archived successfully");
      fetchVouchers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to archive voucher");
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this voucher? This action cannot be undone.")) return;

    try {
      await vouchersAPI.delete(Number(id));
      toast.success("Voucher deleted successfully");
      fetchVouchers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete voucher");
    }
  };

  const totalVouchers = groups.reduce((sum, g) => sum + g.voucherCount, 0);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-[1600px] mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[28px] font-semibold text-neutral-900">Vouchers</h1>
              <p className="text-[14px] text-neutral-500">{totalVouchers} total vouchers</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="h-[40px] px-4 rounded-lg border border-neutral-900 bg-neutral-900 text-white text-[14px] font-medium flex items-center gap-2 hover:bg-neutral-800 transition-colors"
            >
              <span className="text-[18px] leading-none">+</span>
              Create Voucher
            </button>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="flex items-end gap-4 flex-1">
                {/* Search - No label */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search vouchers..."
                    className="w-[320px] h-[40px] pl-10 pr-3 border border-neutral-300 rounded-lg text-[14px] text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400 transition-all bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-tight text-neutral-500 mb-1.5">
                    STATUS
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="h-[40px] px-3 pr-8 rounded-lg border border-neutral-300 bg-white text-[14px] text-neutral-900 hover:border-neutral-400 transition-all focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Scope Filter */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-tight text-neutral-500 mb-1.5">
                    SCOPE
                  </label>
                  <select
                    value={scopeFilter}
                    onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
                    className="h-[40px] px-3 pr-8 rounded-lg border border-neutral-300 bg-white text-[14px] text-neutral-900 hover:border-neutral-400 transition-all focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="company">Company</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40 rounded-lg border border-neutral-200 text-[14px] text-neutral-500 bg-white">
              Loading vouchers...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 px-4 rounded-lg border border-neutral-200 bg-white">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                <Search size={24} className="text-neutral-400" />
              </div>
              <h3 className="text-[16px] font-semibold text-neutral-900 mb-1">No vouchers found</h3>
              <p className="text-[14px] text-neutral-500">Try adjusting your filters or create a new voucher.</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <VoucherGroup
                key={group.id}
                group={group}
                onEditVoucher={handleEditVoucher}
                onDuplicateVoucher={handleDuplicateVoucher}
                onArchiveVoucher={handleArchiveVoucher}
                onDeleteVoucher={handleDeleteVoucher}
              />
            ))
          )}
        </div>
      </div>

      {/* Create Voucher Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <VoucherForm
              companies={companies}
              onSubmit={handleCreateVoucher}
              onCancel={() => setShowCreateModal(false)}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}

      {showEditModal && editingVoucher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <VoucherForm
              voucher={editingVoucher}
              companies={companies}
              onSubmit={handleUpdateVoucher}
              onCancel={() => {
                setShowEditModal(false);
                setEditingVoucher(null);
              }}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
