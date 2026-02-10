'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import '@/app/admin/admin.css';
import { Building2, Plus, Edit, X, Trash2, Copy, RefreshCw, Check, Link, Key, Mail, ChevronRight, ChevronLeft, Percent, Sparkles, ExternalLink, Users, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type WizardStep = 1 | 2 | 3 | 4;

interface Company {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  discount_percentage: number;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  allow_employee_self_registration: boolean;
  email_domain?: string;
  allow_staff_self_registration: boolean;
  staff_email_domain?: string;
  staff_default_branch?: string;
  employee_count: number;
  total_points_awarded: number;
  invite_code?: string;
  invite_code_uses?: number;
  access_code?: string;
  users_collect_points: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminCompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    discount_percentage: '0',
    email_domain: '',
    allow_employee_self_registration: false,
    is_active: true,
    users_collect_points: false, // Default: employees get perks, not points
  });

  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCompany, setCreatedCompany] = useState<Company | null>(null);

  const [copiedCode, setCopiedCode] = useState<number | null>(null);
  const [copiedAccessCode, setCopiedAccessCode] = useState<number | null>(null);
  const [regeneratingCode, setRegeneratingCode] = useState<number | null>(null);
  const [regeneratingAccessCode, setRegeneratingAccessCode] = useState<number | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies', {
        params: searchTerm ? { search: searchTerm } : {},
      });
      setCompanies(response.data.companies || response.data);
    } catch (error) {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const discountNum = parseInt(companyFormData.discount_percentage);
    if (discountNum < 0 || discountNum > 100) {
      toast.error('Discount must be between 0 and 100');
      return;
    }

    try {
      const data = {
        name: companyFormData.name,
        discount_percentage: discountNum,
        email_domain: companyFormData.email_domain || null,
        allow_employee_self_registration: companyFormData.allow_employee_self_registration,
        is_active: companyFormData.is_active,
        users_collect_points: companyFormData.users_collect_points,
      };

      if (editingCompany) {
        await api.put(`/companies/${editingCompany.id}`, data);
        toast.success('Company updated successfully');
      } else {
        await api.post('/companies', data);
        toast.success('Company created successfully');
      }

      setShowCompanyForm(false);
      setEditingCompany(null);
      resetCompanyForm();
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save company');
    }
  };

  const handleCopyInviteCode = async (company: Company) => {
    if (!company.invite_code) return;
    const inviteUrl = `${window.location.origin}/join/${company.invite_code}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedCode(company.id);
      toast.success('Invite link copied!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleRegenerateCode = async (companyId: number) => {
    if (!confirm('Are you sure? The old invite code will stop working.')) return;
    setRegeneratingCode(companyId);
    try {
      const response = await api.post(`/companies/${companyId}/invite-code`);
      toast.success('New invite code generated');
      fetchCompanies();
      if (editingCompany?.id === companyId && response.data.invite_code) {
        setEditingCompany({ ...editingCompany, invite_code: response.data.invite_code });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to regenerate code');
    } finally {
      setRegeneratingCode(null);
    }
  };

  const handleDeleteCompany = async (id: number) => {
    if (!confirm('Are you sure you want to delete this company? This will also remove all associated employees.')) return;
    try {
      await api.delete(`/companies/${id}`);
      toast.success('Company deleted');
      fetchCompanies();
    } catch (error) {
      toast.error('Failed to delete company');
    }
  };

  const handleCopyAccessCode = async (company: Company) => {
    if (!company.access_code) return;
    try {
      await navigator.clipboard.writeText(company.access_code);
      setCopiedAccessCode(company.id);
      toast.success('Access code copied!');
      setTimeout(() => setCopiedAccessCode(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleRegenerateAccessCode = async (companyId: number) => {
    if (!confirm('Are you sure? Employees using the old access code will need the new one.')) return;
    setRegeneratingAccessCode(companyId);
    try {
      const response = await api.post(`/companies/${companyId}/access-code`);
      toast.success('New access code generated');
      fetchCompanies();
      if (editingCompany?.id === companyId && response.data.access_code) {
        setEditingCompany({ ...editingCompany, access_code: response.data.access_code });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to regenerate access code');
    } finally {
      setRegeneratingAccessCode(null);
    }
  };

  const resetCompanyForm = () => {
    setCompanyFormData({
      name: '',
      discount_percentage: '0',
      email_domain: '',
      allow_employee_self_registration: false,
      is_active: true,
      users_collect_points: false,
    });
    setWizardStep(1);
    setCreatedCompany(null);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyFormData({
      name: company.name,
      discount_percentage: company.discount_percentage.toString(),
      email_domain: company.email_domain || '',
      allow_employee_self_registration: company.allow_employee_self_registration,
      is_active: company.is_active,
      users_collect_points: company.users_collect_points ?? false,
    });
    setShowCompanyForm(true);
  };

  const handleViewMembers = (company: Company) => {
    router.push(`/admin/users?company=${encodeURIComponent(company.name)}`);
  };

  return (
    <AdminLayout>
      <div className="min-h-screen admin-page animate-macos-fade">
        <div className="admin-page-container">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#0055CC] flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Companies</h1>
                <p className="text-[14px] text-[#86868b] mt-0.5">
                  Manage corporate partners and employee programs
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingCompany(null);
                resetCompanyForm();
                setShowCompanyForm(true);
              }}
              className="admin-btn-primary h-[40px] px-5 flex items-center gap-2"
            >
              <Plus size={18} />
              Add Company
            </button>
          </div>

          {/* Search */}
          <div className="admin-card p-4 mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
              <input
                type="text"
                placeholder="Search companies..."
                className="w-full h-[40px] pl-10 pr-4 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && fetchCompanies()}
              />
            </div>
          </div>

          {/* Company Form Modal - Glass */}
          {showCompanyForm && (
            <div className="admin-card mb-8 overflow-hidden">
              {/* Form Header - Glass overlay */}
              <div className="bg-gradient-to-b from-[#44403C] to-[#292524] text-white p-6 -m-5 mb-6" style={{ backdropFilter: 'blur(12px)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-heading text-white">
                      {editingCompany ? 'Edit Company' : 'Add New Company'}
                    </h3>
                    <p className="text-body text-stone-400 mt-1">
                      {editingCompany
                        ? 'Update company details and invite settings'
                        : 'Set up a new corporate partner'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCompanyForm(false);
                      setEditingCompany(null);
                      resetCompanyForm();
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Wizard Steps - Create Mode Only */}
                {!editingCompany && (
                  <div className="flex items-center justify-between mt-6 max-w-md">
                    {[
                      { step: 1, label: 'Company' },
                      { step: 2, label: 'Discount' },
                      { step: 3, label: 'Verify' },
                      { step: 4, label: 'Done' },
                    ].map(({ step, label }, index) => (
                      <div key={step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${
                              wizardStep === step
                                ? 'bg-white text-stone-900 shadow-lg'
                                : wizardStep > step
                                ? 'bg-success text-white'
                                : 'bg-stone-700 text-stone-400'
                            }`}
                          >
                            {wizardStep > step ? <Check size={16} /> : step}
                          </div>
                          <span className={`mt-1.5 text-caption ${
                            wizardStep >= step ? 'text-white' : 'text-stone-500'
                          }`}>
                            {label}
                          </span>
                        </div>
                        {index < 3 && (
                          <div className={`flex-1 h-0.5 mx-2 mt-[-18px] transition-colors ${
                            wizardStep > step ? 'bg-success' : 'bg-stone-700'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit Mode Form */}
              {editingCompany ? (
                <form onSubmit={handleCompanySubmit} className="space-y-6 p-1">
                  <div className="admin-form-grid admin-form-grid-2">
                    <div>
                      <label className="admin-label">Company Name</label>
                      <input
                        type="text"
                        className="admin-input"
                        value={companyFormData.name}
                        onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="admin-label">Employee Discount %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="admin-input"
                        value={companyFormData.discount_percentage}
                        onChange={(e) => setCompanyFormData({ ...companyFormData, discount_percentage: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Email Domain Toggle */}
                  <div className="admin-form-section">
                    <div
                      className="admin-checkbox-wrapper"
                      onClick={() => setCompanyFormData({
                        ...companyFormData,
                        allow_employee_self_registration: !companyFormData.allow_employee_self_registration,
                      })}
                    >
                      <div className={`admin-checkbox ${companyFormData.allow_employee_self_registration ? 'checked' : ''}`}>
                        {companyFormData.allow_employee_self_registration && <Check size={12} />}
                      </div>
                      <div>
                        <span className="admin-checkbox-label">Enable email domain verification</span>
                        <p className="admin-checkbox-description">Employees can self-register with their work email</p>
                      </div>
                    </div>
                    {companyFormData.allow_employee_self_registration && (
                      <div className="mt-4">
                        <label className="admin-label-sm">Email Domain</label>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="company.com"
                          value={companyFormData.email_domain}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, email_domain: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  {/* Invite Codes */}
                  <div className="admin-form-grid admin-form-grid-2">
                    <div className="admin-form-section" style={{ marginBottom: 0 }}>
                      <label className="admin-label-sm flex items-center gap-2 mb-3">
                        <Link size={14} className="text-[#6B7280]" />
                        Public Link
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="admin-code flex-1">
                          {editingCompany.invite_code || 'None'}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyInviteCode(editingCompany)}
                          className="admin-btn admin-btn-secondary admin-btn-sm p-2"
                        >
                          {copiedCode === editingCompany.id ? <Check size={16} className="text-[#10B981]" /> : <Copy size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRegenerateCode(editingCompany.id)}
                          disabled={regeneratingCode === editingCompany.id}
                          className="admin-btn admin-btn-secondary admin-btn-sm p-2"
                        >
                          <RefreshCw size={16} className={regeneratingCode === editingCompany.id ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </div>
                    <div className="admin-form-section" style={{ marginBottom: 0, background: '#FFFBEB', borderColor: '#FCD34D' }}>
                      <label className="admin-label-sm flex items-center gap-2 mb-3">
                        <Key size={14} className="text-[#F59E0B]" />
                        Access Code
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="admin-code admin-code-highlight flex-1 font-bold">
                          {editingCompany.access_code || 'None'}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyAccessCode(editingCompany)}
                          className="admin-btn admin-btn-secondary admin-btn-sm p-2"
                        >
                          {copiedAccessCode === editingCompany.id ? <Check size={16} className="text-[#10B981]" /> : <Copy size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRegenerateAccessCode(editingCompany.id)}
                          disabled={regeneratingAccessCode === editingCompany.id}
                          className="admin-btn admin-btn-secondary admin-btn-sm p-2"
                        >
                          <RefreshCw size={16} className={regeneratingAccessCode === editingCompany.id ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Points Collection Toggle */}
                  <div className="admin-form-section">
                    <div
                      className="admin-checkbox-wrapper"
                      onClick={() => setCompanyFormData({
                        ...companyFormData,
                        users_collect_points: !companyFormData.users_collect_points,
                      })}
                    >
                      <div className={`admin-checkbox ${companyFormData.users_collect_points ? 'checked' : ''}`}>
                        {companyFormData.users_collect_points && <Check size={12} />}
                      </div>
                      <div>
                        <span className="admin-checkbox-label">Members collect points</span>
                        <p className="admin-checkbox-description">
                          {companyFormData.users_collect_points
                            ? 'Members earn points from purchases and redeem rewards'
                            : 'Members only get free perks (discounts, daily drinks)'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div
                    className="admin-checkbox-wrapper"
                    onClick={() => setCompanyFormData({ ...companyFormData, is_active: !companyFormData.is_active })}
                  >
                    <div className={`admin-checkbox ${companyFormData.is_active ? 'checked' : ''}`}>
                      {companyFormData.is_active && <Check size={12} />}
                    </div>
                    <span className="admin-checkbox-label">Active</span>
                  </div>

                  <div className="admin-form-actions">
                    <button type="submit" className="admin-btn admin-btn-primary">Update Company</button>
                    <button
                      type="button"
                      onClick={() => { setShowCompanyForm(false); setEditingCompany(null); resetCompanyForm(); }}
                      className="admin-btn admin-btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Create Mode - Wizard */
                <div className="min-h-[320px] p-1">
                  {/* Step 1: Company Name */}
                  {wizardStep === 1 && (
                    <div className="space-y-8">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-surface-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Building2 size={32} className="text-text-secondary" />
                        </div>
                        <h4 className="text-heading text-text-primary">What is the company name?</h4>
                        <p className="text-body text-text-secondary mt-1">This will be displayed to employees</p>
                      </div>
                      <div className="max-w-md mx-auto">
                        <input
                          type="text"
                          className="input text-lg text-center"
                          placeholder="e.g., Stripe Thailand"
                          value={companyFormData.name}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                          autoFocus
                        />
                      </div>
                      <div className="flex justify-end pt-4">
                        <button
                          onClick={() => {
                            if (!companyFormData.name.trim()) {
                              toast.error('Please enter a company name');
                              return;
                            }
                            setWizardStep(2);
                          }}
                          className="btn-primary flex items-center gap-2"
                        >
                          Continue
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Discount */}
                  {wizardStep === 2 && (
                    <div className="space-y-8">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-success-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Percent size={32} className="text-success" />
                        </div>
                        <h4 className="text-heading text-text-primary">Set employee discount</h4>
                        <p className="text-body text-text-secondary mt-1">
                          How much discount do {companyFormData.name} employees get?
                        </p>
                      </div>
                      <div className="max-w-sm mx-auto space-y-6">
                        <div className="flex items-center justify-center gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseInt(companyFormData.discount_percentage) || 0;
                              if (current > 0) setCompanyFormData({ ...companyFormData, discount_percentage: String(Math.max(0, current - 5)) });
                            }}
                            className="w-12 h-12 rounded-full bg-surface-muted hover:bg-stone-200 flex items-center justify-center text-2xl font-bold text-text-secondary transition-colors"
                          >
                            -
                          </button>
                          <div className="text-center w-32">
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                className="w-full text-5xl font-bold text-text-primary text-center bg-transparent border-none focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={companyFormData.discount_percentage}
                                onChange={(e) => {
                                  const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                  setCompanyFormData({ ...companyFormData, discount_percentage: String(val) });
                                }}
                              />
                              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-2xl text-text-tertiary">%</span>
                            </div>
                            <p className="text-caption text-text-tertiary mt-1">off all purchases</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseInt(companyFormData.discount_percentage) || 0;
                              if (current < 100) setCompanyFormData({ ...companyFormData, discount_percentage: String(Math.min(100, current + 5)) });
                            }}
                            className="w-12 h-12 rounded-full bg-surface-muted hover:bg-stone-200 flex items-center justify-center text-2xl font-bold text-text-secondary transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <div className="px-2">
                          <input
                            type="range"
                            min="0"
                            max="50"
                            step="5"
                            value={companyFormData.discount_percentage}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, discount_percentage: e.target.value })}
                            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-success"
                          />
                          <div className="flex justify-between text-caption text-text-tertiary mt-1">
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                          </div>
                        </div>
                        <div className="flex justify-center gap-2 flex-wrap">
                          {[0, 10, 15, 20, 25, 30].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setCompanyFormData({ ...companyFormData, discount_percentage: String(pct) })}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                parseInt(companyFormData.discount_percentage) === pct
                                  ? 'bg-stone-900 text-white'
                                  : 'bg-surface-muted text-text-secondary hover:bg-stone-200'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>

                        {/* Points Collection Toggle */}
                        <div
                          className={`p-4 border rounded-xl cursor-pointer transition-all mt-6 ${
                            companyFormData.users_collect_points
                              ? 'bg-accent/10 border-accent/30'
                              : 'bg-white border-border hover:border-stone-300'
                          }`}
                          onClick={() => setCompanyFormData({
                            ...companyFormData,
                            users_collect_points: !companyFormData.users_collect_points
                          })}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              companyFormData.users_collect_points
                                ? 'bg-accent border-accent'
                                : 'border-stone-300 bg-white'
                            }`}>
                              {companyFormData.users_collect_points && <Check size={14} className="text-white" />}
                            </div>
                            <div className="flex-1">
                              <h5 className="text-body font-medium text-text-primary">Members collect points</h5>
                              <p className="text-caption text-text-secondary mt-0.5">
                                {companyFormData.users_collect_points
                                  ? 'Members earn points from purchases and can redeem rewards'
                                  : 'Members only receive free perks (discounts, daily drinks)'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between pt-4">
                        <button onClick={() => setWizardStep(1)} className="btn-secondary flex items-center gap-2">
                          <ChevronLeft size={18} />
                          Back
                        </button>
                        <button onClick={() => setWizardStep(3)} className="btn-primary flex items-center gap-2">
                          Continue
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Verification */}
                  {wizardStep === 3 && (
                    <div className="space-y-8">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-surface-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Key size={32} className="text-text-secondary" />
                        </div>
                        <h4 className="text-heading text-text-primary">How will employees verify?</h4>
                        <p className="text-body text-text-secondary mt-1">
                          Choose how employees prove they work at {companyFormData.name}
                        </p>
                      </div>
                      <div className="max-w-lg mx-auto space-y-3">
                        {/* Access Code - Always On */}
                        <div className="p-4 bg-surface-muted border border-border-light rounded-xl">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-warning-light rounded-xl flex items-center justify-center flex-shrink-0">
                              <Key size={20} className="text-warning" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="text-subheading text-text-primary">Access Code</h5>
                                <span className="badge-success">Always On</span>
                              </div>
                              <p className="text-caption text-text-secondary mt-1">
                                A 6-digit code is auto-generated. Share it with HR to distribute.
                              </p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                              <Check size={14} className="text-white" />
                            </div>
                          </div>
                        </div>

                        {/* Email Domain - Toggle */}
                        <div
                          className={`p-4 border rounded-xl cursor-pointer transition-all ${
                            companyFormData.allow_employee_self_registration
                              ? 'bg-success-light border-success/30'
                              : 'bg-white border-border hover:border-stone-300'
                          }`}
                          onClick={() => setCompanyFormData({
                            ...companyFormData,
                            allow_employee_self_registration: !companyFormData.allow_employee_self_registration
                          })}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                              companyFormData.allow_employee_self_registration ? 'bg-success/20' : 'bg-surface-muted'
                            }`}>
                              <Mail size={20} className={companyFormData.allow_employee_self_registration ? 'text-success' : 'text-text-tertiary'} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="text-subheading text-text-primary">Email Domain</h5>
                                {companyFormData.allow_employee_self_registration && (
                                  <span className="badge-success">Enabled</span>
                                )}
                              </div>
                              <p className="text-caption text-text-secondary mt-1">
                                Employees verify via magic link to their work email.
                              </p>
                              {companyFormData.allow_employee_self_registration && (
                                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2 bg-white rounded-lg border border-success/30 p-1">
                                    <span className="text-text-tertiary pl-2">@</span>
                                    <input
                                      type="text"
                                      className="flex-1 border-none bg-transparent focus:outline-none focus:ring-0 text-body"
                                      placeholder="company.com"
                                      value={companyFormData.email_domain}
                                      onChange={(e) => setCompanyFormData({ ...companyFormData, email_domain: e.target.value })}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              companyFormData.allow_employee_self_registration
                                ? 'bg-success border-success'
                                : 'border-stone-300 bg-white'
                            }`}>
                              {companyFormData.allow_employee_self_registration && <Check size={14} className="text-white" />}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between pt-4">
                        <button onClick={() => setWizardStep(2)} className="btn-secondary flex items-center gap-2">
                          <ChevronLeft size={18} />
                          Back
                        </button>
                        <button
                          onClick={async () => {
                            if (companyFormData.allow_employee_self_registration && !companyFormData.email_domain.trim()) {
                              toast.error('Please enter an email domain');
                              return;
                            }
                            setIsSubmitting(true);
                            try {
                              const discountNum = parseInt(companyFormData.discount_percentage) || 0;
                              const response = await api.post('/companies', {
                                name: companyFormData.name,
                                discount_percentage: discountNum,
                                email_domain: companyFormData.email_domain || null,
                                allow_employee_self_registration: companyFormData.allow_employee_self_registration,
                                is_active: true,
                                users_collect_points: companyFormData.users_collect_points,
                              });
                              setCreatedCompany(response.data);
                              setWizardStep(4);
                              fetchCompanies();
                            } catch (error: any) {
                              toast.error(error.response?.data?.error || 'Failed to create company');
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}
                          disabled={isSubmitting}
                          className="btn-primary flex items-center gap-2"
                        >
                          {isSubmitting ? 'Creating...' : 'Create Company'}
                          <Sparkles size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Success */}
                  {wizardStep === 4 && createdCompany && (
                    <div className="space-y-8">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-success-light rounded-full flex items-center justify-center mx-auto mb-4">
                          <Check size={40} className="text-success" />
                        </div>
                        <h4 className="text-heading text-text-primary">{createdCompany.name} is ready!</h4>
                        <p className="text-body text-text-secondary mt-1">Share these codes with HR to onboard employees</p>
                      </div>
                      <div className="max-w-lg mx-auto space-y-4">
                        {/* Public Link */}
                        <div className="p-4 bg-surface-muted border border-border-light rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Link size={18} className="text-text-tertiary" />
                              <span className="text-body font-medium text-text-primary">Public Invite Link</span>
                            </div>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/join/${createdCompany.invite_code}`;
                                navigator.clipboard.writeText(url);
                                toast.success('Link copied!');
                              }}
                              className="text-caption text-accent hover:text-accent-hover flex items-center gap-1 font-medium"
                            >
                              <Copy size={14} />
                              Copy
                            </button>
                          </div>
                          <code className="block w-full px-3 py-2.5 bg-white border border-border rounded-lg font-mono text-sm break-all text-text-primary">
                            {typeof window !== 'undefined' ? window.location.origin : ''}/join/{createdCompany.invite_code}
                          </code>
                          <p className="text-caption text-text-tertiary mt-2">Employees use this link to join</p>
                        </div>

                        {/* Access Code */}
                        <div className="p-4 bg-warning-light border border-warning/30 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Key size={18} className="text-warning" />
                              <span className="text-body font-medium text-text-primary">Access Code</span>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(createdCompany.access_code || '');
                                toast.success('Code copied!');
                              }}
                              className="text-caption text-warning hover:opacity-80 flex items-center gap-1 font-medium"
                            >
                              <Copy size={14} />
                              Copy
                            </button>
                          </div>
                          <code className="block w-full px-4 py-3 bg-white border border-warning/30 rounded-lg font-mono text-2xl tracking-widest text-center font-bold text-stone-800">
                            {createdCompany.access_code}
                          </code>
                          <p className="text-caption text-text-tertiary mt-2">HR shares this code - employees enter it to verify</p>
                        </div>

                        {createdCompany.discount_percentage > 0 && (
                          <div className="p-4 bg-success-light border border-success/30 rounded-xl flex items-center gap-3">
                            <div className="w-10 h-10 bg-success/20 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Percent size={20} className="text-success" />
                            </div>
                            <p className="text-body text-text-primary">
                              <strong>{createdCompany.discount_percentage}% discount</strong> voucher auto-created for employees
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-center pt-4">
                        <button
                          onClick={() => {
                            setShowCompanyForm(false);
                            resetCompanyForm();
                          }}
                          className="btn-primary px-8"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Companies Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="admin-card h-48 animate-pulse bg-[rgba(0,0,0,0.04)]" />
              ))}
            </div>
          ) : companies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className={`admin-card p-5 transition-all hover:shadow-md ${!company.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 size={24} className="text-stone-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-subheading text-text-primary">{company.name}</h3>
                          <p className="text-caption text-text-secondary mt-0.5">
                            {company.discount_percentage}% discount
                            <span className="mx-1.5 text-stone-300">&bull;</span>
                            {company.employee_count} members
                            <span className="mx-1.5 text-stone-300">&bull;</span>
                            {company.users_collect_points ? (
                              <span className="text-accent">Earns points</span>
                            ) : (
                              <span className="text-text-tertiary">Perks only</span>
                            )}
                            {company.allow_employee_self_registration && company.email_domain && (
                              <>
                                <span className="mx-1.5 text-stone-300">&bull;</span>
                                @{company.email_domain}
                              </>
                            )}
                            {!company.is_active && (
                              <>
                                <span className="mx-1.5 text-stone-300">&bull;</span>
                                <span className="text-error">Inactive</span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditCompany(company)}
                            className="p-2 text-text-secondary hover:bg-stone-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleViewMembers(company)}
                            className="p-2 text-success hover:bg-success-light rounded-lg transition-colors"
                            title="View Members"
                          >
                            <Users size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCompany(company.id)}
                            className="p-2 text-error hover:bg-error-light rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Invite Codes */}
                      <div className="mt-3 space-y-2">
                        {company.invite_code && (
                          <div className="flex items-center gap-2 p-2.5 bg-surface-muted rounded-lg">
                            <Link size={14} className="text-text-tertiary" />
                            <span className="text-caption text-text-tertiary">Link:</span>
                            <code className="text-caption font-mono text-text-primary tracking-wider">
                              {company.invite_code}
                            </code>
                            <button
                              onClick={() => handleCopyInviteCode(company)}
                              className="ml-auto p-1.5 text-text-secondary hover:bg-stone-200 rounded-lg transition-colors"
                              title="Copy invite link"
                            >
                              {copiedCode === company.id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                            </button>
                            <button
                              onClick={() => handleRegenerateCode(company.id)}
                              disabled={regeneratingCode === company.id}
                              className="p-1.5 text-text-tertiary hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-50"
                              title="Regenerate link code"
                            >
                              <RefreshCw size={14} className={regeneratingCode === company.id ? 'animate-spin' : ''} />
                            </button>
                          </div>
                        )}
                        {!company.invite_code && (
                          <button
                            onClick={() => handleRegenerateCode(company.id)}
                            disabled={regeneratingCode === company.id}
                            className="text-caption text-accent hover:text-accent-hover flex items-center gap-1 font-medium"
                          >
                            <Link size={14} />
                            Generate invite link
                          </button>
                        )}

                        {company.access_code && (
                          <div className="flex items-center gap-2 p-2.5 bg-warning-light rounded-lg">
                            <Key size={14} className="text-warning" />
                            <span className="text-caption text-text-tertiary">Access:</span>
                            <code className="text-caption font-mono text-stone-800 tracking-wider font-semibold">
                              {company.access_code}
                            </code>
                            <button
                              onClick={() => handleCopyAccessCode(company)}
                              className="ml-auto p-1.5 text-warning hover:bg-warning/20 rounded-lg transition-colors"
                              title="Copy access code"
                            >
                              {copiedAccessCode === company.id ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            <button
                              onClick={() => handleRegenerateAccessCode(company.id)}
                              disabled={regeneratingAccessCode === company.id}
                              className="p-1.5 text-text-tertiary hover:bg-warning/20 rounded-lg transition-colors disabled:opacity-50"
                              title="Regenerate access code"
                            >
                              <RefreshCw size={14} className={regeneratingAccessCode === company.id ? 'animate-spin' : ''} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-card text-center py-16">
              <div className="w-16 h-16 bg-[rgba(0,122,255,0.08)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 size={32} className="text-[#007AFF]" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">No companies yet</h3>
              <p className="text-[14px] text-[#86868b]">Create your first corporate partner to get started</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
