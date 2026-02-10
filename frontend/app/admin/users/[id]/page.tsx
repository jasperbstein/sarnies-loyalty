'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import '@/app/admin/admin.css';
import AdjustPointsModal from '@/components/AdjustPointsModal';
import { usersAPI, investorAPI, mediaAPI, transactionsAPI, companiesAPI } from '@/lib/api';
import { ArrowLeft, Plus, Minus, Phone, CreditCard, Building2, Edit2, User, Gift, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface OutletType {
  id: number;
  name: string;
  address: string;
}

interface OutletCredit {
  id: number;
  outlet_id: number;
  outlet_name: string;
  credits_balance: number;
  annual_allocation: number;
  auto_renew: boolean;
  expires_at: string;
}

interface CompanyType {
  id: number;
  name: string;
  discount_percentage: number;
}

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<OutletType[]>([]);
  const [outletCredits, setOutletCredits] = useState<OutletCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Company assignment state
  const [companies, setCompanies] = useState<CompanyType[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [savingCompany, setSavingCompany] = useState(false);

  // Investor forms
  const [showOutletCreditForm, setShowOutletCreditForm] = useState(false);
  const [showGroupCreditForm, setShowGroupCreditForm] = useState(false);
  const [outletCreditForm, setOutletCreditForm] = useState({
    outletId: '',
    annualAllocation: '',
    creditsBalance: '',
    autoRenew: true,
    expiresAt: ''
  });
  const [groupCreditForm, setGroupCreditForm] = useState({
    enabled: false,
    annualAllocation: '',
    creditsBalance: '',
    autoRenew: true,
    expiresAt: ''
  });

  // Media form
  const [showMediaBudgetForm, setShowMediaBudgetForm] = useState(false);
  const [mediaBudgetForm, setMediaBudgetForm] = useState({
    annualBudget: '',
    expiresAt: ''
  });

  // Profile editing state
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    surname: '',
    email: '',
    birthday: '',
    gender: '',
    user_type: 'customer',
    is_active: true,
    referral_enabled_override: null as boolean | null,
    referral_discount_override: null as number | null
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchTransactions();
    fetchCompanies();
  }, [params.id]);

  const fetchCompanies = async () => {
    try {
      const response = await companiesAPI.getAll();
      setCompanies(response.data.companies || response.data || []);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getOne(userId);
      const userData = response.data;
      setUser(userData);
      setSelectedCompanyId(userData.company_id || null);

      // Initialize profile form with user data
      setProfileForm({
        name: userData.name || '',
        surname: userData.surname || '',
        email: userData.email || '',
        birthday: userData.birthday || '',
        gender: userData.gender || '',
        user_type: userData.user_type || 'customer',
        is_active: userData.is_active !== false,
        referral_enabled_override: userData.referral_enabled_override ?? null,
        referral_discount_override: userData.referral_discount_override ?? null
      });

      // Load investor-specific data
      if (userData.user_type === 'investor') {
        try {
          const outletsRes = await fetch('/api/outlets');
          if (outletsRes.ok) {
            const outletsData = await outletsRes.json();
            setOutlets(outletsData);
          }

          const creditsRes = await investorAPI.getCredits();
          if (creditsRes.data) {
            setOutletCredits(creditsRes.data.outletCredits || []);
          }

          // Populate group credit form if exists
          if (userData.investor_group_credits_allocation > 0) {
            setGroupCreditForm({
              enabled: true,
              annualAllocation: userData.investor_group_credits_allocation.toString(),
              creditsBalance: (userData.investor_group_credits_balance || 0).toString(),
              autoRenew: userData.investor_group_credits_auto_renew !== false,
              expiresAt: userData.investor_group_credits_expires_at
                ? new Date(userData.investor_group_credits_expires_at).toISOString().split('T')[0]
                : ''
            });
          }
        } catch (err) {
          console.error('Failed to load investor data:', err);
        }
      }

      // Load media-specific data
      if (userData.user_type === 'media') {
        setMediaBudgetForm({
          annualBudget: (userData.media_annual_budget || 0).toString(),
          expiresAt: userData.media_budget_expires_at
            ? new Date(userData.media_budget_expires_at).toISOString().split('T')[0]
            : ''
        });
      }
    } catch (error) {
      toast.error('Failed to load user');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await transactionsAPI.getAll({
        user_id: userId,
        limit: 50,
      });
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Failed to load transactions');
    }
  };

  const handleAdjustPoints = async (points: number, reason: string) => {
    try {
      await usersAPI.adjustPoints(userId, points, reason);
      toast.success('Points adjusted successfully');
      setShowAdjustModal(false);
      fetchUser();
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to adjust points');
    }
  };

  const handleSaveCompany = async () => {
    try {
      setSavingCompany(true);
      await usersAPI.updateCompany(userId, selectedCompanyId);
      toast.success(selectedCompanyId ? 'Company assigned successfully' : 'Company removed');
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update company');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      await usersAPI.update(userId, {
        name: profileForm.name,
        surname: profileForm.surname,
        email: profileForm.email || null,
        birthday: profileForm.birthday || null,
        gender: profileForm.gender || null,
        user_type: profileForm.user_type as 'customer' | 'employee' | 'staff' | 'investor' | 'media',
        is_active: profileForm.is_active,
        referral_enabled_override: profileForm.referral_enabled_override,
        referral_discount_override: profileForm.referral_discount_override
      });
      toast.success('Profile updated successfully');
      setShowProfileEdit(false);
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendInvite = async () => {
    if (!user.email) {
      toast.error('User must have an email to send invite');
      return;
    }
    try {
      setSendingInvite(true);
      await usersAPI.sendInvite(userId);
      toast.success(`Invite sent to ${user.email}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleAllocateOutletCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await investorAPI.allocateOutletCredits(userId, {
        outletId: parseInt(outletCreditForm.outletId),
        annualAllocation: parseInt(outletCreditForm.annualAllocation),
        creditsBalance: parseInt(outletCreditForm.creditsBalance),
        autoRenew: outletCreditForm.autoRenew,
        expiresAt: outletCreditForm.expiresAt || undefined
      });

      toast.success('Outlet credits allocated successfully');
      setShowOutletCreditForm(false);
      setOutletCreditForm({
        outletId: '',
        annualAllocation: '',
        creditsBalance: '',
        autoRenew: true,
        expiresAt: ''
      });
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to allocate outlet credits');
    }
  };

  const handleAllocateGroupCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await investorAPI.allocateGroupCredits(userId, {
        enabled: true,
        annualAllocation: parseInt(groupCreditForm.annualAllocation),
        creditsBalance: parseInt(groupCreditForm.creditsBalance),
        expiresAt: groupCreditForm.expiresAt || undefined
      });

      toast.success('Group credits allocated successfully');
      setShowGroupCreditForm(false);
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to allocate group credits');
    }
  };

  const handleSetMediaBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mediaAPI.setBudget(userId, {
        annualBudgetThb: parseFloat(mediaBudgetForm.annualBudget),
        expiresAt: mediaBudgetForm.expiresAt || undefined
      });

      toast.success('Media budget set successfully');
      setShowMediaBudgetForm(false);
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to set media budget');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </AdminLayout>
    );
  }

  if (!user) return null;

  return (
    <AdminLayout>
      <div className="admin-page animate-macos-fade">
        <div className="admin-page-container">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-[#86868b] hover:text-[#1d1d1f] transition-colors mb-4 leading-none"
            >
              <ArrowLeft size={14} />
              <span className="text-[12px] font-medium">Back to Users</span>
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#0055CC] flex items-center justify-center shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
                  {user.name} {user.surname}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1.5 text-[14px] text-[#86868b]">
                    <Phone size={13} />
                    {user.phone}
                  </span>
                  {user.company && (
                    <>
                      <span className="text-[#c7c7c7]">•</span>
                      <span className="text-[14px] text-[#86868b]">{user.company}</span>
                    </>
                  )}
                  <span className={`admin-badge ${
                    user.user_type === 'investor' ? 'bg-[rgba(255,159,10,0.12)] text-[#FF9F0A]' :
                    user.user_type === 'media' ? 'admin-badge-info' :
                    user.user_type === 'employee' ? 'bg-[rgba(88,86,214,0.12)] text-[#5856D6]' :
                    'bg-[rgba(0,0,0,0.06)] text-[#86868b]'
                  }`}>
                    {user.user_type}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="admin-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-2">Points Balance</p>
              <p className="text-[32px] font-bold text-[#1d1d1f] mb-1">
                {user.points_balance.toLocaleString()}
              </p>
              <button
                onClick={() => setShowAdjustModal(true)}
                className="text-[12px] font-medium text-[#007AFF] hover:text-[#0055CC] transition-colors"
              >
                Adjust →
              </button>
            </div>
            <div className="admin-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-2">Total Spent</p>
              <p className="text-[32px] font-bold text-[#1d1d1f]">
                ฿{typeof user.total_spend === 'number' ? user.total_spend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}
              </p>
            </div>
            <div className="admin-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-2">Purchases</p>
              <p className="text-[32px] font-bold text-[#1d1d1f]">
                {(user.total_purchases_count || 0).toLocaleString()}
              </p>
            </div>
            <div className="admin-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-2">Member Since</p>
              <p className="text-[20px] font-bold text-[#1d1d1f]">
                {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Profile Section */}
          <div className="admin-card mb-6">
            <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                <User size={16} className="text-[#007AFF]" />
                Profile
              </h3>
              {!showProfileEdit && (
                <button
                  onClick={() => setShowProfileEdit(true)}
                  className="text-[12px] font-medium text-neutral-900 hover:text-neutral-700 transition-colors flex items-center gap-1"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
              )}
            </div>

            {showProfileEdit ? (
              <div className="p-6 space-y-5">
                <div className="admin-form-grid admin-form-grid-2">
                  <div>
                    <label className="admin-label">First Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Last Name</label>
                    <input
                      type="text"
                      value={profileForm.surname}
                      onChange={(e) => setProfileForm({...profileForm, surname: e.target.value})}
                      className="admin-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="admin-label">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                    placeholder="user@example.com"
                    className="admin-input"
                  />
                  <p className="admin-form-hint">Email is required to send login invites</p>
                </div>

                <div className="admin-form-grid admin-form-grid-3">
                  <div>
                    <label className="admin-label">Birthday <span className="admin-label-hint">(DD-MM)</span></label>
                    <input
                      type="text"
                      value={profileForm.birthday}
                      onChange={(e) => setProfileForm({...profileForm, birthday: e.target.value})}
                      placeholder="25-12"
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Gender</label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({...profileForm, gender: e.target.value})}
                      className="admin-select"
                    >
                      <option value="">Not specified</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="admin-label">User Type</label>
                    <select
                      value={profileForm.user_type}
                      onChange={(e) => setProfileForm({...profileForm, user_type: e.target.value})}
                      className="admin-select"
                    >
                      <option value="customer">Customer</option>
                      <option value="employee">Employee</option>
                      <option value="investor">Investor</option>
                      <option value="media">Media</option>
                      <option value="partner">Partner</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                </div>

                <div className="admin-checkbox-wrapper">
                  <div
                    className={`admin-checkbox ${profileForm.is_active ? 'checked' : ''}`}
                    onClick={() => setProfileForm({...profileForm, is_active: !profileForm.is_active})}
                  >
                    {profileForm.is_active && <Check size={12} />}
                  </div>
                  <div>
                    <span className="admin-checkbox-label">Account Active</span>
                    <p className="admin-checkbox-description">Allow this user to access the app</p>
                  </div>
                </div>

                {/* Referral Settings */}
                <div className="admin-form-section">
                  <div className="admin-form-section-header" style={{ marginBottom: '12px', paddingBottom: '0', borderBottom: 'none' }}>
                    <div className="admin-form-section-icon">
                      <Gift size={16} />
                    </div>
                    <div>
                      <h4 className="admin-form-section-title">Referral Settings</h4>
                      <p className="admin-form-section-subtitle">Override global referral settings for this user</p>
                    </div>
                  </div>
                  <div className="admin-form-grid admin-form-grid-2">
                    <div>
                      <label className="admin-label">Can Refer Others</label>
                      <select
                        value={profileForm.referral_enabled_override === null ? 'global' : profileForm.referral_enabled_override ? 'yes' : 'no'}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          referral_enabled_override: e.target.value === 'global' ? null : e.target.value === 'yes'
                        })}
                        className="admin-select"
                      >
                        <option value="global">Use Global Setting</option>
                        <option value="yes">Yes - Always Enabled</option>
                        <option value="no">No - Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="admin-label">Custom Discount % <span className="admin-label-hint">(for referees)</span></label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={profileForm.referral_discount_override ?? ''}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          referral_discount_override: e.target.value === '' ? null : parseInt(e.target.value)
                        })}
                        placeholder="Use global"
                        className="admin-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="admin-form-actions">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="admin-btn admin-btn-primary flex items-center gap-2"
                  >
                    <Check size={16} />
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileEdit(false);
                      // Reset form to original values
                      setProfileForm({
                        name: user.name || '',
                        surname: user.surname || '',
                        email: user.email || '',
                        birthday: user.birthday || '',
                        gender: user.gender || '',
                        user_type: user.user_type || 'customer',
                        is_active: user.is_active !== false,
                        referral_enabled_override: user.referral_enabled_override ?? null,
                        referral_discount_override: user.referral_discount_override ?? null
                      });
                    }}
                    disabled={savingProfile}
                    className="admin-btn admin-btn-secondary flex items-center gap-2"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-4 gap-6">
                  <div className="admin-info-box">
                    <div className="admin-info-box-label">Name</div>
                    <div className="admin-info-box-value">{user.name} {user.surname}</div>
                  </div>
                  <div className="admin-info-box">
                    <div className="admin-info-box-label">Birthday</div>
                    <div className="admin-info-box-value">{user.birthday || '—'}</div>
                  </div>
                  <div className="admin-info-box">
                    <div className="admin-info-box-label">Gender</div>
                    <div className="admin-info-box-value capitalize">{user.gender || '—'}</div>
                  </div>
                  <div className="admin-info-box">
                    <div className="admin-info-box-label">Status</div>
                    <div className="admin-info-box-value">
                      <span className={`inline-flex items-center gap-1.5 ${user.is_active !== false ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        <span className={`status-dot ${user.is_active !== false ? 'active' : 'inactive'}`}></span>
                        {user.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                {user.email && (
                  <div className="mt-4 pt-4 border-t border-[#F3F4F6]">
                    <div className="flex items-center justify-between">
                      <div className="admin-info-box" style={{ flex: 1 }}>
                        <div className="admin-info-box-label">Email</div>
                        <div className="admin-info-box-value">{user.email}</div>
                      </div>
                      <button
                        onClick={handleSendInvite}
                        disabled={sendingInvite}
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                      >
                        {sendingInvite ? 'Sending...' : 'Send Login Invite →'}
                      </button>
                    </div>
                  </div>
                )}
                {user.line_display_name && (
                  <div className="mt-4 pt-4 border-t border-[#F3F4F6] flex items-center gap-3">
                    {user.line_picture_url && (
                      <img src={user.line_picture_url} alt="" className="w-8 h-8 rounded-full" />
                    )}
                    <div className="admin-info-box" style={{ flex: 1 }}>
                      <div className="admin-info-box-label">LINE Account</div>
                      <div className="admin-info-box-value">{user.line_display_name}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Company Assignment Section */}
          <div className="admin-card mb-6">
            <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)]">
              <h3 className="text-[14px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                <Building2 size={16} className="text-[#007AFF]" />
                Company Assignment
              </h3>
            </div>
            <div className="p-6">
              <div className="flex items-end gap-4">
                <div className="flex-1 max-w-md">
                  <label className="admin-label">Assign to Company</label>
                  <select
                    value={selectedCompanyId || ''}
                    onChange={(e) => setSelectedCompanyId(e.target.value ? parseInt(e.target.value) : null)}
                    className="admin-select"
                  >
                    <option value="">No company assigned</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name} ({company.discount_percentage}% discount)
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSaveCompany}
                  disabled={savingCompany || selectedCompanyId === (user.company_id || null)}
                  className="admin-btn admin-btn-primary"
                >
                  {savingCompany ? 'Saving...' : 'Save'}
                </button>
              </div>

              {/* Current company info */}
              {user.company_id && (
                <div className="admin-info-box mt-4">
                  <p className="text-[13px] text-[#6B7280]">
                    Currently assigned to: <span className="font-semibold text-[#1A1A1A]">
                      {companies.find(c => c.id === user.company_id)?.name || 'Unknown Company'}
                    </span>
                    {companies.find(c => c.id === user.company_id)?.discount_percentage ? (
                      <span className="ml-2 text-[#10B981]">
                        ({companies.find(c => c.id === user.company_id)?.discount_percentage}% discount)
                      </span>
                    ) : null}
                  </p>
                </div>
              )}

              {!user.company_id && (
                <p className="admin-form-hint mt-4">
                  No company assigned. Assign a company to give this user employee benefits.
                </p>
              )}
            </div>
          </div>

          {/* Credits Section */}
          {(user.user_type === 'investor' || user.user_type === 'media') && (
            <div className="admin-card mb-6">
              <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)]">
                <h3 className="text-[14px] font-semibold text-[#1d1d1f]">Credits & Budget</h3>
              </div>

              {user.user_type === 'investor' && (
                <div className="p-6">
                  {/* Group Credits */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[13px] font-semibold text-[#374151]">Group Credits (All Outlets)</h4>
                      <button
                        onClick={() => setShowGroupCreditForm(!showGroupCreditForm)}
                        className="text-[12px] font-medium text-[#1A1A1A] hover:text-[#374151] transition-colors"
                      >
                        {groupCreditForm.enabled ? 'Update' : 'Enable'} →
                      </button>
                    </div>

                    {groupCreditForm.enabled && !showGroupCreditForm && (
                      <div className="grid grid-cols-4 gap-4">
                        <div className="admin-info-box">
                          <div className="admin-info-box-label">Current Balance</div>
                          <div className="stat-value stat-value-sm">{user.investor_group_credits_balance || 0}</div>
                        </div>
                        <div className="admin-info-box">
                          <div className="admin-info-box-label">Annual Allocation</div>
                          <div className="stat-value stat-value-sm">{user.investor_group_credits_allocation || 0}</div>
                        </div>
                        <div className="admin-info-box">
                          <div className="admin-info-box-label">Auto Renew</div>
                          <div className="admin-info-box-value">{user.investor_group_credits_auto_renew ? 'Yes' : 'No'}</div>
                        </div>
                        <div className="admin-info-box">
                          <div className="admin-info-box-label">Expires At</div>
                          <div className="admin-info-box-value">
                            {user.investor_group_credits_expires_at
                              ? new Date(user.investor_group_credits_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                    )}

                    {showGroupCreditForm && (
                      <form onSubmit={handleAllocateGroupCredits} className="admin-form-section">
                        <div className="admin-form-grid admin-form-grid-4">
                          <div>
                            <label className="admin-label-sm">Annual Allocation</label>
                            <input
                              type="number"
                              value={groupCreditForm.annualAllocation}
                              onChange={(e) => setGroupCreditForm({...groupCreditForm, annualAllocation: e.target.value})}
                              className="admin-input admin-input-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="admin-label-sm">Current Balance</label>
                            <input
                              type="number"
                              value={groupCreditForm.creditsBalance}
                              onChange={(e) => setGroupCreditForm({...groupCreditForm, creditsBalance: e.target.value})}
                              className="admin-input admin-input-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="admin-label-sm">Expires At</label>
                            <input
                              type="date"
                              value={groupCreditForm.expiresAt}
                              onChange={(e) => setGroupCreditForm({...groupCreditForm, expiresAt: e.target.value})}
                              className="admin-input admin-input-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            <div className="admin-checkbox-wrapper" onClick={() => setGroupCreditForm({...groupCreditForm, autoRenew: !groupCreditForm.autoRenew})}>
                              <div className={`admin-checkbox ${groupCreditForm.autoRenew ? 'checked' : ''}`} style={{ width: '18px', height: '18px' }}>
                                {groupCreditForm.autoRenew && <Check size={10} />}
                              </div>
                              <span className="admin-checkbox-label" style={{ fontSize: '12px' }}>Auto Renew</span>
                            </div>
                          </div>
                        </div>
                        <div className="admin-form-actions" style={{ marginTop: '16px', paddingTop: '16px' }}>
                          <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm">
                            Save Group Credits
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowGroupCreditForm(false)}
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Outlet Credits */}
                  <div className="pt-6 border-t border-[#E8EAED]">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[13px] font-semibold text-[#374151]">Outlet-Specific Credits</h4>
                      <button
                        onClick={() => setShowOutletCreditForm(!showOutletCreditForm)}
                        className="text-[12px] font-medium text-[#1A1A1A] hover:text-[#374151] transition-colors"
                      >
                        Add Outlet →
                      </button>
                    </div>

                    {showOutletCreditForm && (
                      <form onSubmit={handleAllocateOutletCredits} className="admin-form-section mb-4">
                        <div className="grid grid-cols-5 gap-3">
                          <div>
                            <label className="admin-label-sm">Outlet</label>
                            <select
                              value={outletCreditForm.outletId}
                              onChange={(e) => setOutletCreditForm({...outletCreditForm, outletId: e.target.value})}
                              className="admin-select admin-select-sm"
                              required
                            >
                              <option value="">Select outlet...</option>
                              {outlets.map((outlet) => (
                                <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="admin-label-sm">Annual Allocation</label>
                            <input
                              type="number"
                              value={outletCreditForm.annualAllocation}
                              onChange={(e) => setOutletCreditForm({...outletCreditForm, annualAllocation: e.target.value})}
                              className="admin-input admin-input-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="admin-label-sm">Current Balance</label>
                            <input
                              type="number"
                              value={outletCreditForm.creditsBalance}
                              onChange={(e) => setOutletCreditForm({...outletCreditForm, creditsBalance: e.target.value})}
                              className="admin-input admin-input-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="admin-label-sm">Expires At</label>
                            <input
                              type="date"
                              value={outletCreditForm.expiresAt}
                              onChange={(e) => setOutletCreditForm({...outletCreditForm, expiresAt: e.target.value})}
                              className="admin-input admin-input-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            <div className="admin-checkbox-wrapper" onClick={() => setOutletCreditForm({...outletCreditForm, autoRenew: !outletCreditForm.autoRenew})}>
                              <div className={`admin-checkbox ${outletCreditForm.autoRenew ? 'checked' : ''}`} style={{ width: '18px', height: '18px' }}>
                                {outletCreditForm.autoRenew && <Check size={10} />}
                              </div>
                              <span className="admin-checkbox-label" style={{ fontSize: '12px' }}>Auto Renew</span>
                            </div>
                          </div>
                        </div>
                        <div className="admin-form-actions" style={{ marginTop: '16px', paddingTop: '16px' }}>
                          <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm">
                            Allocate Credits
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowOutletCreditForm(false)}
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {outletCredits.length > 0 ? (
                      <div className="space-y-3">
                        {outletCredits.map((credit) => (
                          <div key={credit.id} className="admin-list-item flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className="admin-list-item-title">{credit.outlet_name}</h5>
                              <p className="admin-list-item-meta">
                                Balance: <span className="font-semibold text-[#1A1A1A]">{credit.credits_balance}</span> ·
                                Allocation: <span className="font-semibold text-[#1A1A1A]">{credit.annual_allocation}</span> ·
                                Auto-renew: <span className="font-semibold text-[#1A1A1A]">{credit.auto_renew ? 'Yes' : 'No'}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[12px] text-[#6B7280]">
                                Expires {new Date(credit.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="admin-empty-state-text">No outlet credits allocated yet</p>
                    )}
                  </div>
                </div>
              )}

              {user.user_type === 'media' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[13px] font-semibold text-[#374151]">Media Budget</h4>
                    <button
                      onClick={() => setShowMediaBudgetForm(!showMediaBudgetForm)}
                      className="text-[12px] font-medium text-[#1A1A1A] hover:text-[#374151] transition-colors"
                    >
                      Update →
                    </button>
                  </div>

                  {!showMediaBudgetForm && (
                    <div className="grid grid-cols-4 gap-4">
                      <div className="admin-info-box">
                        <div className="admin-info-box-label">Annual Budget</div>
                        <div className="stat-value stat-value-sm">
                          ฿{(user.media_annual_budget || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </div>
                      <div className="admin-info-box">
                        <div className="admin-info-box-label">Spent</div>
                        <div className="stat-value stat-value-sm">
                          ฿{(user.media_budget_spent || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </div>
                      <div className="admin-info-box">
                        <div className="admin-info-box-label">Remaining</div>
                        <div className="stat-value stat-value-sm">
                          ฿{((user.media_annual_budget || 0) - (user.media_budget_spent || 0)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </div>
                      <div className="admin-info-box">
                        <div className="admin-info-box-label">Expires At</div>
                        <div className="admin-info-box-value">
                          {user.media_budget_expires_at
                            ? new Date(user.media_budget_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}

                  {showMediaBudgetForm && (
                    <form onSubmit={handleSetMediaBudget} className="admin-form-section">
                      <div className="admin-form-grid admin-form-grid-2">
                        <div>
                          <label className="admin-label-sm">Annual Budget (฿)</label>
                          <input
                            type="number"
                            value={mediaBudgetForm.annualBudget}
                            onChange={(e) => setMediaBudgetForm({...mediaBudgetForm, annualBudget: e.target.value})}
                            className="admin-input admin-input-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="admin-label-sm">Expires At</label>
                          <input
                            type="date"
                            value={mediaBudgetForm.expiresAt}
                            onChange={(e) => setMediaBudgetForm({...mediaBudgetForm, expiresAt: e.target.value})}
                            className="admin-input admin-input-sm"
                          />
                        </div>
                      </div>
                      <div className="admin-form-actions" style={{ marginTop: '16px', paddingTop: '16px' }}>
                        <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm">
                          Update Budget
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowMediaBudgetForm(false)}
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Transaction History */}
          <div className="admin-card overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)]">
              <h3 className="text-[14px] font-semibold text-[#1d1d1f]">Transaction History</h3>
            </div>
            {transactions.length > 0 ? (
              <div className="divide-y divide-[#F3F4F6] max-h-[400px] overflow-y-auto">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 px-6 hover:bg-[#FAFBFC] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          tx.type === 'earn'
                            ? 'bg-[#ECFDF5] text-[#059669]'
                            : tx.type === 'redeem'
                            ? 'bg-[#FEF2F2] text-[#EF4444]'
                            : 'bg-[#EFF6FF] text-[#3B82F6]'
                        }`}
                      >
                        {tx.type === 'earn' ? <Plus size={14} /> : <Minus size={14} />}
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A] text-[13px] leading-tight">
                          {tx.type === 'earn'
                            ? 'Points Earned'
                            : tx.type === 'redeem'
                            ? tx.voucher_name || 'Voucher Redeemed'
                            : 'Manual Adjustment'}
                        </p>
                        <p className="text-[11px] text-[#6B7280] mt-0.5">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                        {(tx.outlet || tx.staff_name) && (
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                            {tx.outlet && tx.outlet}
                            {tx.outlet && tx.staff_name && ' • '}
                            {tx.staff_name && `Staff: ${tx.staff_name}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-[15px] font-bold leading-none ${
                          tx.points_delta > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                        }`}
                      >
                        {tx.points_delta > 0 ? '+' : ''}
                        {tx.points_delta.toLocaleString()}
                      </p>
                      {tx.amount_value && (
                        <p className="text-[10px] text-[#6B7280] mt-1">
                          ฿{tx.amount_value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-empty">
                <div className="admin-icon-badge admin-icon-badge-lg" style={{ marginBottom: '16px' }}>
                  <CreditCard size={24} />
                </div>
                <h3 className="admin-empty-title">No transactions yet</h3>
                <p className="admin-empty-text">Transaction history will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Adjust Points Modal */}
      <AdjustPointsModal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        currentBalance={user?.points_balance || 0}
        userName={user ? `${user.name} ${user.surname || ''}`.trim() : ''}
        onAdjust={handleAdjustPoints}
      />
    </AdminLayout>
  );
}
