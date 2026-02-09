'use client';

import React, { useMemo, useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import {
  Search,
  Plus,
  Send,
  Inbox,
  Building2,
  ChevronDown,
  X,
  Trash2,
  Check,
  XCircle,
  Pause,
  Play,
  Eye,
  Clock,
  Gift,
  Percent,
  DollarSign,
  Calendar,
  Users,
  ExternalLink,
  UserPlus,
} from 'lucide-react';
import { collabsAPI, CollabOffer, CollabPartner } from '@/lib/api';
import toast from 'react-hot-toast';
import CollabOfferForm from '@/components/CollabOfferForm';

// Tab configuration
type TabType = 'outgoing' | 'incoming' | 'partners';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'outgoing', label: 'Outgoing', icon: <Send className="w-4 h-4" /> },
  { id: 'incoming', label: 'Incoming', icon: <Inbox className="w-4 h-4" /> },
  { id: 'partners', label: 'Partners', icon: <UserPlus className="w-4 h-4" /> },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  paused: { bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  expired: { bg: 'bg-stone-100', text: 'text-stone-500', dot: 'bg-stone-400' },
};

function getDiscountIcon(type: string) {
  switch (type) {
    case 'percentage':
      return <Percent className="w-4 h-4" />;
    case 'fixed':
      return <DollarSign className="w-4 h-4" />;
    case 'free_item':
      return <Gift className="w-4 h-4" />;
    default:
      return <Gift className="w-4 h-4" />;
  }
}

function formatDiscountValue(type: string, value: number) {
  switch (type) {
    case 'percentage':
      return `${value}% off`;
    case 'fixed':
      return `$${value} off`;
    case 'free_item':
      return 'Free item';
    default:
      return `${value}`;
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CollabsPage() {
  const [outgoingOffers, setOutgoingOffers] = useState<CollabOffer[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<CollabOffer[]>([]);
  const [partners, setPartners] = useState<CollabPartner[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<{ id: number; name: string; logo_url?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<TabType>('outgoing');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<CollabOffer | null>(null);
  const [rejectingOffer, setRejectingOffer] = useState<CollabOffer | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [outgoingRes, incomingRes, partnersRes, availableRes] = await Promise.all([
        collabsAPI.getOffers(),
        collabsAPI.getIncomingOffers(),
        collabsAPI.getPartners(),
        collabsAPI.getAvailablePartners(),
      ]);
      setOutgoingOffers(outgoingRes.data.offers);
      setIncomingOffers(incomingRes.data.offers);
      setPartners(partnersRes.data.partners);
      setAvailableCompanies(availableRes.data.companies);
    } catch (error) {
      toast.error('Failed to load collab data');
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const totalOutgoing = outgoingOffers.length;
    const activeOutgoing = outgoingOffers.filter((o) => o.status === 'active').length;
    const pendingIncoming = incomingOffers.filter((o) => o.status === 'pending').length;
    const totalPartners = partners.filter((p) => p.is_active).length;
    return { totalOutgoing, activeOutgoing, pendingIncoming, totalPartners };
  }, [outgoingOffers, incomingOffers, partners]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    outgoing: outgoingOffers.length,
    incoming: incomingOffers.filter((o) => o.status === 'pending').length,
    partners: partners.filter((p) => p.is_active).length,
  }), [outgoingOffers, incomingOffers, partners]);

  // Filter offers
  const filteredOutgoing = useMemo(() => {
    return outgoingOffers.filter((o) => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (!o.title?.toLowerCase().includes(searchLower) && !o.target_company_name?.toLowerCase().includes(searchLower)) return false;
      }
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      return true;
    });
  }, [outgoingOffers, search, statusFilter]);

  const filteredIncoming = useMemo(() => {
    return incomingOffers.filter((o) => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (!o.title?.toLowerCase().includes(searchLower) && !o.offering_company_name?.toLowerCase().includes(searchLower)) return false;
      }
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      return true;
    });
  }, [incomingOffers, search, statusFilter]);

  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (!p.partner_name?.toLowerCase().includes(searchLower)) return false;
      }
      return true;
    });
  }, [partners, search]);

  // Handlers
  const handleCreateOffer = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      await collabsAPI.createOffer(data as any);
      toast.success('Collab offer created and sent for approval');
      setShowCreateModal(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to create offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOffer = async (data: Record<string, unknown>) => {
    if (!editingOffer) return;
    setIsSubmitting(true);
    try {
      await collabsAPI.updateOffer(editingOffer.id, data as any);
      toast.success('Offer updated');
      setShowEditModal(false);
      setEditingOffer(null);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to update offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOffer = async (id: number) => {
    if (!confirm('Delete this offer permanently?')) return;
    try {
      await collabsAPI.deleteOffer(id);
      toast.success('Offer deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete offer');
    }
  };

  const handleApproveOffer = async (id: number) => {
    try {
      await collabsAPI.approveOffer(id);
      toast.success('Offer approved');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve offer');
    }
  };

  const handleRejectOffer = async () => {
    if (!rejectingOffer) return;
    try {
      await collabsAPI.rejectOffer(rejectingOffer.id, rejectReason || undefined);
      toast.success('Offer rejected');
      setShowRejectModal(false);
      setRejectingOffer(null);
      setRejectReason('');
      fetchData();
    } catch (error) {
      toast.error('Failed to reject offer');
    }
  };

  const handlePauseOffer = async (id: number) => {
    try {
      await collabsAPI.pauseOffer(id);
      toast.success('Offer paused');
      fetchData();
    } catch (error) {
      toast.error('Failed to pause offer');
    }
  };

  const handleResumeOffer = async (id: number) => {
    try {
      await collabsAPI.resumeOffer(id);
      toast.success('Offer resumed');
      fetchData();
    } catch (error) {
      toast.error('Failed to resume offer');
    }
  };

  const handleAddPartner = async (companyId: number) => {
    try {
      await collabsAPI.addPartner(companyId);
      toast.success('Partner added');
      setShowAddPartnerModal(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to add partner');
    }
  };

  const handleRemovePartner = async (partnershipId: number) => {
    if (!confirm('Remove this partnership? Active offers will be paused.')) return;
    try {
      await collabsAPI.removePartner(partnershipId);
      toast.success('Partnership removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove partnership');
    }
  };

  // Render offer card
  const renderOfferCard = (offer: CollabOffer, isIncoming: boolean) => {
    const statusColor = STATUS_COLORS[offer.status] || STATUS_COLORS.pending;
    const companyName = isIncoming ? offer.offering_company_name : offer.target_company_name;
    const companyLogo = isIncoming ? offer.offering_company_logo : offer.target_company_logo;

    return (
      <div key={offer.id} className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-lg transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {/* Company logo */}
            <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-6 h-6 text-stone-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[15px] font-semibold text-stone-900 truncate">{offer.title}</h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusColor.bg} ${statusColor.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                  {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                </span>
              </div>

              <p className="text-[13px] text-stone-500 mb-2">
                {isIncoming ? 'From' : 'For'} <span className="font-medium text-stone-700">{companyName}</span>
              </p>

              {offer.description && (
                <p className="text-[13px] text-stone-500 line-clamp-2 mb-3">{offer.description}</p>
              )}

              <div className="flex items-center gap-4 text-[12px] text-stone-500">
                <span className="flex items-center gap-1.5">
                  {getDiscountIcon(offer.discount_type)}
                  {formatDiscountValue(offer.discount_type, offer.discount_value)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(offer.valid_from)} - {formatDate(offer.valid_until)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {offer.redemptions_count || 0} redeemed
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isIncoming && offer.status === 'pending' && (
              <>
                <button
                  onClick={() => handleApproveOffer(offer.id)}
                  className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                  title="Approve"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setRejectingOffer(offer);
                    setShowRejectModal(true);
                  }}
                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  title="Reject"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}

            {!isIncoming && offer.status === 'active' && (
              <button
                onClick={() => handlePauseOffer(offer.id)}
                className="p-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                title="Pause"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}

            {!isIncoming && offer.status === 'paused' && (
              <button
                onClick={() => handleResumeOffer(offer.id)}
                className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                title="Resume"
              >
                <Play className="w-4 h-4" />
              </button>
            )}

            {!isIncoming && ['pending', 'paused'].includes(offer.status) && (
              <button
                onClick={() => {
                  setEditingOffer(offer);
                  setShowEditModal(true);
                }}
                className="p-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                title="Edit"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}

            {!isIncoming && (
              <button
                onClick={() => handleDeleteOffer(offer.id)}
                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {offer.rejection_reason && (
          <div className="mt-3 p-3 bg-red-50 rounded-lg text-[13px] text-red-700">
            <span className="font-medium">Rejection reason:</span> {offer.rejection_reason}
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[32px] font-bold text-stone-900 tracking-tight">Partner Collabs</h1>
              <p className="text-stone-500 mt-1">Manage cross-company partnership offers</p>
            </div>
            {activeTab !== 'partners' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="h-11 px-5 rounded-xl bg-gradient-to-b from-stone-800 to-stone-900 text-white text-[14px] font-semibold flex items-center gap-2 hover:from-stone-700 hover:to-stone-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                Create Offer
              </button>
            )}
            {activeTab === 'partners' && (
              <button
                onClick={() => setShowAddPartnerModal(true)}
                className="h-11 px-5 rounded-xl bg-gradient-to-b from-stone-800 to-stone-900 text-white text-[14px] font-semibold flex items-center gap-2 hover:from-stone-700 hover:to-stone-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                Add Partner
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Send className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[24px] font-bold text-stone-900">{stats.totalOutgoing}</p>
                  <p className="text-[12px] text-stone-500">Outgoing Offers</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[24px] font-bold text-stone-900">{stats.activeOutgoing}</p>
                  <p className="text-[12px] text-stone-500">Active Offers</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[24px] font-bold text-stone-900">{stats.pendingIncoming}</p>
                  <p className="text-[12px] text-stone-500">Pending Approval</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-[24px] font-bold text-stone-900">{stats.totalPartners}</p>
                  <p className="text-[12px] text-stone-500">Partners</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Card */}
          <div className="admin-card overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-stone-100 px-5">
              <div className="flex gap-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setStatusFilter('all');
                      setSearch('');
                    }}
                    className={`flex items-center gap-2 px-4 py-3.5 text-[14px] font-medium transition-all border-b-2 -mb-[2px] ${
                      activeTab === tab.id
                        ? 'text-stone-900 border-stone-900'
                        : 'text-stone-400 border-transparent hover:text-stone-600'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {tabCounts[tab.id] > 0 && (
                      <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                        activeTab === tab.id ? 'bg-gradient-to-r from-stone-800 to-stone-900 text-white' : 'bg-stone-100 text-stone-500'
                      }`}>
                        {tabCounts[tab.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters Row */}
            <div className="p-5 flex items-center justify-between gap-4 flex-wrap bg-gradient-to-r from-stone-50/50 to-transparent">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder={activeTab === 'partners' ? 'Search partners...' : 'Search offers...'}
                    className="w-60 h-10 pl-10 pr-4 border border-stone-200 rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* Status Filter (not for partners tab) */}
                {activeTab !== 'partners' && (
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-10 pl-4 pr-9 rounded-xl border border-stone-200 text-[14px] text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900" />
            </div>
          ) : (
            <>
              {/* Outgoing Tab */}
              {activeTab === 'outgoing' && (
                <div className="space-y-4">
                  {filteredOutgoing.length === 0 ? (
                    <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
                      <Send className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                      <h3 className="text-[16px] font-semibold text-stone-900 mb-2">No outgoing offers</h3>
                      <p className="text-[14px] text-stone-500 mb-4">Create offers to share with your partner companies.</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-[14px] font-medium hover:bg-stone-800 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Create Offer
                      </button>
                    </div>
                  ) : (
                    filteredOutgoing.map((offer) => renderOfferCard(offer, false))
                  )}
                </div>
              )}

              {/* Incoming Tab */}
              {activeTab === 'incoming' && (
                <div className="space-y-4">
                  {filteredIncoming.length === 0 ? (
                    <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
                      <Inbox className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                      <h3 className="text-[16px] font-semibold text-stone-900 mb-2">No incoming offers</h3>
                      <p className="text-[14px] text-stone-500">Partner offers will appear here for your approval.</p>
                    </div>
                  ) : (
                    filteredIncoming.map((offer) => renderOfferCard(offer, true))
                  )}
                </div>
              )}

              {/* Partners Tab */}
              {activeTab === 'partners' && (
                <div className="space-y-4">
                  {filteredPartners.length === 0 ? (
                    <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
                      <UserPlus className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                      <h3 className="text-[16px] font-semibold text-stone-900 mb-2">No partners yet</h3>
                      <p className="text-[14px] text-stone-500 mb-4">Add partner companies to start sharing offers.</p>
                      <button
                        onClick={() => setShowAddPartnerModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-[14px] font-medium hover:bg-stone-800 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Partner
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredPartners.map((partner) => (
                        <div key={partner.partnership_id} className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-lg transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {partner.partner_logo ? (
                                <img src={partner.partner_logo} alt={partner.partner_name} className="w-full h-full object-cover" />
                              ) : (
                                <Building2 className="w-7 h-7 text-stone-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[15px] font-semibold text-stone-900 truncate">{partner.partner_name}</h3>
                              <p className="text-[12px] text-stone-500">
                                Partner since {formatDate(partner.created_at)}
                              </p>
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium mt-1 ${
                                partner.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${partner.is_active ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                                {partner.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRemovePartner(partner.partnership_id)}
                              className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Remove partnership"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Offer Modal */}
      {showCreateModal && (
        <CollabOfferForm
          partners={partners}
          onSubmit={handleCreateOffer}
          onClose={() => setShowCreateModal(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Edit Offer Modal */}
      {showEditModal && editingOffer && (
        <CollabOfferForm
          partners={partners}
          initialData={editingOffer}
          onSubmit={handleUpdateOffer}
          onClose={() => {
            setShowEditModal(false);
            setEditingOffer(null);
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Add Partner Modal */}
      {showAddPartnerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-stone-900">Add Partner Company</h2>
                <button
                  onClick={() => setShowAddPartnerModal(false)}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-stone-400" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {availableCompanies.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="text-[14px] text-stone-500">No companies available to partner with.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {availableCompanies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleAddPartner(company.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-all text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {company.logo_url ? (
                          <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-6 h-6 text-stone-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[15px] font-semibold text-stone-900">{company.name}</p>
                      </div>
                      <Plus className="w-5 h-5 text-stone-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && rejectingOffer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-stone-900">Reject Offer</h2>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingOffer(null);
                    setRejectReason('');
                  }}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-stone-400" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-[14px] text-stone-600 mb-4">
                Reject <span className="font-semibold">{rejectingOffer.title}</span> from {rejectingOffer.offering_company_name}?
              </p>
              <textarea
                placeholder="Reason for rejection (optional)"
                className="w-full h-24 p-3 border border-stone-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="p-6 border-t border-stone-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingOffer(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-[14px] font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectOffer}
                className="px-4 py-2 bg-red-600 text-white text-[14px] font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Reject Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
