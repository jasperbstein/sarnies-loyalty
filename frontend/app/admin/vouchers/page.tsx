'use client';

import React, { useMemo, useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import AdminVoucherCard from '@/components/admin/AdminVoucherCard';
import VoucherStatsBar from '@/components/admin/VoucherStatsBar';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Users,
  Briefcase,
  Building2,
  ChevronDown,
  X,
  Trash2,
  Archive,
  RefreshCw,
  Star,
  Pencil,
  Copy,
  ImageOff,
  Gift,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import VoucherForm from '@/components/VoucherForm';
import VoucherWizard from '@/components/VoucherWizard';
import '@/app/admin/admin.css';

// Tab configuration
type AudienceTab = 'all' | 'customers' | 'employees' | 'companies';

interface TabConfig {
  id: AudienceTab;
  label: string;
  icon: React.ReactNode;
  filter: (v: VoucherData) => boolean;
}

const TABS: TabConfig[] = [
  { id: 'all', label: 'All', icon: null, filter: () => true },
  { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" />, filter: (v) => (v.target_user_types || []).includes('customer') },
  { id: 'employees', label: 'Employees', icon: <Briefcase className="w-4 h-4" />, filter: (v) => (v.target_user_types || []).includes('employee') || (v.target_user_types || []).includes('staff') },
  { id: 'companies', label: 'Companies', icon: <Building2 className="w-4 h-4" />, filter: (v) => Boolean(v.is_company_exclusive) || Boolean(v.allowed_company_ids?.length) },
];

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'food', label: 'Food' },
  { value: 'discounts', label: 'Discounts' },
  { value: 'promotions', label: 'Promotions' },
  { value: 'merchandise', label: 'Merchandise' },
  { value: 'general', label: 'General' },
];

const STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
];

interface Company {
  id: number;
  name: string;
}

interface VoucherData {
  id: number;
  title: string;
  description?: string;
  image_url?: string;
  category?: string;
  points_required: number;
  voucher_type: string;
  is_active: boolean;
  is_featured: boolean;
  is_company_exclusive: boolean;
  target_user_types: string[];
  allowed_company_ids?: number[];
  allowed_companies?: Company[] | null;
  times_redeemed: string | number;
  unique_users: string | number;
  redemption_window?: string;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<AudienceTab>('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVouchers();
    fetchCompanies();
  }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vouchers/all');
      setVouchers(response.data);
    } catch (error) {
      toast.error('Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies');
      const companiesData = Array.isArray(response.data) ? response.data : response.data?.companies || [];
      setCompanies(companiesData);
    } catch (error) {
      console.error('Failed to load companies:', error);
      setCompanies([]);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = vouchers.length;
    const active = vouchers.filter((v) => v.is_active).length;
    const draft = vouchers.filter((v) => !v.is_active).length;
    const totalRedemptions = vouchers.reduce((sum, v) => sum + (parseInt(String(v.times_redeemed)) || 0), 0);
    return { total, active, draft, totalRedemptions };
  }, [vouchers]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<AudienceTab, number> = { all: vouchers.length, customers: 0, employees: 0, companies: 0 };
    vouchers.forEach((v) => {
      const types = v.target_user_types || [];
      if (types.includes('customer')) counts.customers++;
      if (types.includes('employee') || types.includes('staff')) counts.employees++;
      if (v.is_company_exclusive || (v.allowed_company_ids && v.allowed_company_ids.length > 0)) counts.companies++;
    });
    return counts;
  }, [vouchers]);

  // Filter vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const tabConfig = TABS.find((t) => t.id === activeTab);
      if (tabConfig && !tabConfig.filter(v)) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        if (!v.title?.toLowerCase().includes(searchLower) && !v.description?.toLowerCase().includes(searchLower)) return false;
      }
      if (categoryFilter !== 'all') {
        const voucherCategory = v.category?.toLowerCase() || 'general';
        if (voucherCategory !== categoryFilter) return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && !v.is_active) return false;
        if (statusFilter === 'draft' && v.is_active) return false;
      }
      return true;
    });
  }, [vouchers, activeTab, search, categoryFilter, statusFilter]);

  // Selection handlers
  const handleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredVouchers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVouchers.map((v) => v.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Bulk actions
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} vouchers? This cannot be undone.`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/vouchers/${id}`)));
      toast.success(`Deleted ${selectedIds.size} vouchers`);
      clearSelection();
      fetchVouchers();
    } catch (error) {
      toast.error('Failed to delete some vouchers');
    }
  };

  const handleBulkArchive = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.patch(`/vouchers/${id}`, { is_active: false })));
      toast.success(`Archived ${selectedIds.size} vouchers`);
      clearSelection();
      fetchVouchers();
    } catch (error) {
      toast.error('Failed to archive some vouchers');
    }
  };

  const handleBulkAssignCompany = async (companyIds: number[]) => {
    try {
      await Promise.all(Array.from(selectedIds).map((id) =>
        api.patch(`/vouchers/${id}`, {
          is_company_exclusive: companyIds.length > 0,
          allowed_company_ids: companyIds
        })
      ));
      toast.success(`Updated ${selectedIds.size} vouchers`);
      clearSelection();
      setShowCompanyModal(false);
      fetchVouchers();
    } catch (error) {
      toast.error('Failed to update some vouchers');
    }
  };

  // Individual handlers
  const handleCreateVoucher = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      await api.post('/vouchers', data);
      toast.success('Voucher created');
      setShowCreateModal(false);
      fetchVouchers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to create voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditVoucher = (id: number) => {
    const voucher = vouchers.find((v) => v.id === id);
    if (voucher) {
      setEditingVoucher(voucher);
      setShowEditModal(true);
    }
  };

  const handleUpdateVoucher = async (data: Record<string, unknown>) => {
    if (!editingVoucher) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/vouchers/${editingVoucher.id}`, data);
      toast.success('Voucher updated');
      setShowEditModal(false);
      setEditingVoucher(null);
      fetchVouchers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to update voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: number, newStatus: boolean) => {
    try {
      await api.patch(`/vouchers/${id}`, { is_active: newStatus });
      toast.success(newStatus ? 'Voucher activated' : 'Voucher deactivated');
      fetchVouchers();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDuplicateVoucher = async (id: number) => {
    const voucher = vouchers.find((v) => v.id === id);
    if (!voucher) return;
    try {
      const duplicateData: Record<string, unknown> = { ...voucher, title: `${voucher.title} (Copy)` };
      ['id', 'created_at', 'updated_at', 'times_redeemed', 'active_redemptions', 'unique_users', 'last_redeemed_at', 'allowed_companies'].forEach((f) => delete duplicateData[f]);
      await api.post('/vouchers', duplicateData);
      toast.success('Voucher duplicated');
      fetchVouchers();
    } catch (error) {
      toast.error('Failed to duplicate');
    }
  };

  const handleArchiveVoucher = async (id: number) => {
    if (!confirm('Archive this voucher?')) return;
    try {
      await api.patch(`/vouchers/${id}`, { is_active: false });
      toast.success('Voucher archived');
      fetchVouchers();
    } catch (error) {
      toast.error('Failed to archive');
    }
  };

  const handleDeleteVoucher = async (id: number) => {
    if (!confirm('Delete this voucher permanently?')) return;
    try {
      await api.delete(`/vouchers/${id}`);
      toast.success('Voucher deleted');
      fetchVouchers();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto px-8 py-8 animate-macos-fade">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="admin-page-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[rgba(175,82,222,0.12)] flex items-center justify-center">
                  <Gift className="w-5 h-5 text-[#AF52DE]" />
                </div>
                <div>
                  <h1 className="admin-page-title">Vouchers</h1>
                  <p className="admin-page-subtitle">Manage rewards and employee perks</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="admin-btn-primary h-11 px-5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Voucher
            </button>
          </div>

          {/* Stats */}
          <VoucherStatsBar stats={stats} />

          {/* Bulk Selection Bar */}
          {selectedIds.size > 0 && (
            <div className="p-4 bg-gradient-to-b from-[#2997FF] to-[#007AFF] rounded-2xl flex items-center justify-between text-white shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-semibold">{selectedIds.size} selected</span>
                <button onClick={clearSelection} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCompanyModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-[13px] font-semibold transition-all backdrop-blur-sm"
                >
                  <Building2 className="w-4 h-4" />
                  Assign Company
                </button>
                <button
                  onClick={handleBulkArchive}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-[13px] font-semibold transition-all backdrop-blur-sm"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF453A] hover:bg-[#FF6961] rounded-lg text-[13px] font-semibold transition-all shadow-md"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Filters Card */}
          <div className="admin-card overflow-hidden">
            {/* Tabs - macOS Segmented Control Style */}
            <div className="border-b border-[rgba(0,0,0,0.06)] px-5 py-3 bg-[rgba(246,246,246,0.4)]">
              <div className="inline-flex p-1 bg-[rgba(0,0,0,0.06)] rounded-xl">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium transition-all rounded-lg ${
                      activeTab === tab.id
                        ? 'bg-white text-[#1d1d1f] shadow-sm'
                        : 'text-[#636366] hover:text-[#1d1d1f]'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                      activeTab === tab.id ? 'bg-[rgba(0,122,255,0.12)] text-[#007AFF]' : 'bg-[rgba(0,0,0,0.06)] text-[#86868b]'
                    }`}>
                      {tabCounts[tab.id]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters Row */}
            <div className="p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                {/* Select All */}
                <button
                  onClick={handleSelectAll}
                  className={`px-4 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
                    selectedIds.size === filteredVouchers.length && filteredVouchers.length > 0
                      ? 'bg-[rgba(0,122,255,0.1)] border-[rgba(0,122,255,0.2)] text-[#007AFF]'
                      : 'border-[rgba(0,0,0,0.1)] text-[#636366] hover:bg-[rgba(0,0,0,0.04)] hover:border-[rgba(0,0,0,0.15)]'
                  }`}
                >
                  {selectedIds.size === filteredVouchers.length && filteredVouchers.length > 0 ? 'Deselect All' : 'Select All'}
                </button>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                  <input
                    type="text"
                    placeholder="Search vouchers..."
                    className="admin-input w-60 pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* Category */}
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="admin-select pr-9"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] pointer-events-none" />
                </div>

                {/* Status */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="admin-select pr-9"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] pointer-events-none" />
                </div>

                {/* Refresh */}
                <button
                  onClick={fetchVouchers}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-[rgba(0,0,0,0.1)] text-[#86868b] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1d1d1f] transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* View Toggle - macOS Segmented Control */}
              <div className="flex items-center p-1 bg-[rgba(0,0,0,0.06)] rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                    viewMode === 'grid' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#636366]'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                    viewMode === 'list' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#636366]'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center h-72 admin-card">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-[2.5px] border-[rgba(0,0,0,0.08)] border-t-[#007AFF] rounded-full animate-spin" />
                <span className="text-[14px] text-[#86868b] font-medium">Loading vouchers...</span>
              </div>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 admin-card">
              <div className="w-16 h-16 rounded-2xl bg-[rgba(0,0,0,0.04)] flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-[#c7c7cc]" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">No vouchers found</h3>
              <p className="text-[14px] text-[#86868b] mb-5">
                {search || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first voucher to get started'}
              </p>
              {!search && categoryFilter === 'all' && statusFilter === 'all' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="admin-btn-primary h-11 px-5 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Voucher
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredVouchers.map((voucher) => (
                <AdminVoucherCard
                  key={voucher.id}
                  voucher={{
                    ...voucher,
                    times_redeemed: parseInt(String(voucher.times_redeemed)) || 0,
                    unique_users: parseInt(String(voucher.unique_users)) || 0,
                  }}
                  companies={companies}
                  isSelected={selectedIds.has(voucher.id)}
                  onSelect={handleSelect}
                  onEdit={handleEditVoucher}
                  onDuplicate={handleDuplicateVoucher}
                  onArchive={handleArchiveVoucher}
                  onDelete={handleDeleteVoucher}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          ) : (
            <div className="admin-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.06)] bg-[rgba(246,246,246,0.6)]">
                    <th className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredVouchers.length && filteredVouchers.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-[rgba(0,0,0,0.15)] text-[#007AFF] focus:ring-[#007AFF]"
                      />
                    </th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.03em] text-[#86868b] px-4 py-4">Voucher</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.03em] text-[#86868b] px-4 py-4 w-28">Category</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.03em] text-[#86868b] px-4 py-4 w-32">Company</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.03em] text-[#86868b] px-4 py-4 w-20">Points</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.03em] text-[#86868b] px-4 py-4 w-20">Uses</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.03em] text-[#86868b] px-4 py-4 w-20">Status</th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-[0.03em] text-[#86868b] px-4 py-4 w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(0,0,0,0.04)]">
                  {filteredVouchers.map((voucher) => {
                    const companyNames = voucher.allowed_companies?.map(c => c.name) ||
                      (voucher.allowed_company_ids?.map(id => companies.find(c => c.id === id)?.name).filter(Boolean) as string[]) || [];

                    return (
                      <tr key={voucher.id} className="hover:bg-[rgba(0,0,0,0.02)] transition-all">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(voucher.id)}
                            onChange={() => handleSelect(voucher.id)}
                            className="w-4 h-4 rounded border-[rgba(0,0,0,0.15)] text-[#007AFF] focus:ring-[#007AFF]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[rgba(0,0,0,0.04)] flex-shrink-0">
                              {voucher.image_url ? (
                                <img src={voucher.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageOff className="w-4 h-4 text-[#c7c7cc]" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-medium text-[#1d1d1f]">{voucher.title}</span>
                                {voucher.is_featured && <Star className="w-4 h-4 text-[#FF9F0A] fill-[#FF9F0A]" />}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-[#636366] capitalize">{voucher.category || 'General'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {companyNames.length > 0 ? (
                            <span className="text-[13px] text-[#636366]" title={companyNames.join(', ')}>
                              {companyNames.length <= 1 ? companyNames[0] : `${companyNames[0]} +${companyNames.length - 1}`}
                            </span>
                          ) : (
                            <span className="text-[13px] text-[#c7c7cc]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[13px] font-medium ${voucher.points_required === 0 ? 'text-[#34C759]' : 'text-[#1d1d1f]'}`}>
                            {voucher.points_required === 0 ? 'FREE' : voucher.points_required}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-[#636366] tabular-nums">{voucher.times_redeemed || 0}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleStatus(voucher.id, !voucher.is_active)}
                            className={voucher.is_active ? 'admin-badge-success' : 'admin-badge'}
                          >
                            {voucher.is_active ? 'Active' : 'Draft'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleEditVoucher(voucher.id)} className="w-8 h-8 flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.06)] rounded-lg transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDuplicateVoucher(voucher.id)} className="w-8 h-8 flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.06)] rounded-lg transition-colors">
                              <Copy className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteVoucher(voucher.id)} className="w-8 h-8 flex items-center justify-center text-[#86868b] hover:text-[#FF453A] hover:bg-[rgba(255,69,58,0.1)] rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Company Assignment Modal */}
      {showCompanyModal && (
        <CompanyAssignmentModal
          companies={companies}
          onAssign={handleBulkAssignCompany}
          onClose={() => setShowCompanyModal(false)}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <VoucherWizard
          companies={companies}
          onSubmit={handleCreateVoucher}
          onCancel={() => setShowCreateModal(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingVoucher && (
        <VoucherForm
          voucher={editingVoucher}
          companies={companies}
          onSubmit={handleUpdateVoucher}
          onCancel={() => { setShowEditModal(false); setEditingVoucher(null); }}
          isSubmitting={isSubmitting}
        />
      )}
    </AdminLayout>
  );
}

// Company Assignment Modal Component
function CompanyAssignmentModal({
  companies,
  onAssign,
  onClose,
}: {
  companies: Company[];
  onAssign: (companyIds: number[]) => void;
  onClose: () => void;
}) {
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());

  const toggleCompany = (id: number) => {
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal w-full max-w-md animate-macos-fade">
        <div className="admin-modal-header">
          <div>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Assign to Companies</h2>
            <p className="text-[14px] text-[#86868b] mt-0.5">Select companies for the selected vouchers</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[rgba(0,0,0,0.06)] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#86868b]" />
          </button>
        </div>

        <div className="admin-modal-body max-h-80 overflow-y-auto">
          {companies.length === 0 ? (
            <p className="text-center text-[14px] text-[#86868b] py-8">No companies available</p>
          ) : (
            <div className="space-y-2">
              {companies.map((company) => (
                <label
                  key={company.id}
                  className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all ${
                    selectedCompanies.has(company.id)
                      ? 'bg-[rgba(0,122,255,0.1)] border border-[rgba(0,122,255,0.2)]'
                      : 'bg-[rgba(0,0,0,0.03)] border border-transparent hover:bg-[rgba(0,0,0,0.06)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCompanies.has(company.id)}
                    onChange={() => toggleCompany(company.id)}
                    className="w-4 h-4 rounded border-[rgba(0,0,0,0.15)] text-[#007AFF] focus:ring-[#007AFF]"
                  />
                  <Building2 className={`w-5 h-5 ${selectedCompanies.has(company.id) ? 'text-[#007AFF]' : 'text-[#86868b]'}`} />
                  <span className={`text-[14px] font-medium ${selectedCompanies.has(company.id) ? 'text-[#007AFF]' : 'text-[#1d1d1f]'}`}>{company.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="admin-modal-footer">
          <button
            onClick={onClose}
            className="admin-btn-secondary flex-1 h-10"
          >
            Cancel
          </button>
          <button
            onClick={() => onAssign(Array.from(selectedCompanies))}
            className="admin-btn-primary flex-1 h-10"
          >
            {selectedCompanies.size === 0 ? 'Remove from Companies' : `Assign to ${selectedCompanies.size} Companies`}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Company {
  id: number;
  name: string;
}
