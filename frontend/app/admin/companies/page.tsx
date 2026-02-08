'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Building2, Plus, Edit, Users, Upload, X, Trash2, Copy, RefreshCw, Check, Link, Key, Mail, Send, ChevronRight, ChevronLeft, Percent, Globe, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

// Wizard step type
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
  created_at: string;
  updated_at: string;
}

interface PersonalInvite {
  id: number;
  code: string;
  email?: string;
  is_used: boolean;
  used_at?: string;
  expires_at?: string;
  notes?: string;
  created_at: string;
}

interface Employee {
  id: number;
  company_id: number;
  employee_email: string;
  employee_id?: string;
  full_name?: string;
  department?: string;
  is_verified: boolean;
  verified_at?: string;
  user_id?: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingEmployees, setViewingEmployees] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    discount_percentage: '0',
    email_domain: '',
    allow_employee_self_registration: false,
    is_active: true,
  });

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCompany, setCreatedCompany] = useState<Company | null>(null);

  const [copiedCode, setCopiedCode] = useState<number | null>(null);
  const [copiedAccessCode, setCopiedAccessCode] = useState<number | null>(null);
  const [regeneratingCode, setRegeneratingCode] = useState<number | null>(null);
  const [regeneratingAccessCode, setRegeneratingAccessCode] = useState<number | null>(null);

  // Personal invites state
  const [personalInvites, setPersonalInvites] = useState<PersonalInvite[]>([]);
  const [showPersonalInviteForm, setShowPersonalInviteForm] = useState(false);
  const [personalInviteEmail, setPersonalInviteEmail] = useState('');
  const [personalInviteNotes, setPersonalInviteNotes] = useState('');
  const [generatingPersonalInvite, setGeneratingPersonalInvite] = useState(false);
  const [copiedPersonalInvite, setCopiedPersonalInvite] = useState<number | null>(null);

  const [employeeFormData, setEmployeeFormData] = useState({
    employee_email: '',
    employee_id: '',
    full_name: '',
    department: '',
  });

  const [bulkEmployees, setBulkEmployees] = useState('');

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

  const fetchEmployees = async (companyId: number) => {
    try {
      const response = await api.get(`/companies/${companyId}/employees`);
      setEmployees(response.data.employees || response.data);
    } catch (error) {
      toast.error('Failed to load employees');
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
      // Update editingCompany if we're editing this company
      if (editingCompany?.id === companyId && response.data.invite_code) {
        setEditingCompany({ ...editingCompany, invite_code: response.data.invite_code });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to regenerate code');
    } finally {
      setRegeneratingCode(null);
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!viewingEmployees) return;

    try {
      const data = {
        employee_email: employeeFormData.employee_email.toLowerCase(),
        employee_id: employeeFormData.employee_id || null,
        full_name: employeeFormData.full_name || null,
        department: employeeFormData.department || null,
      };

      await api.post(`/companies/${viewingEmployees.id}/employees`, data);
      toast.success('Employee added successfully');

      setShowEmployeeForm(false);
      resetEmployeeForm();
      fetchEmployees(viewingEmployees.id);
      fetchCompanies(); // Refresh to update employee count
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add employee');
    }
  };

  const handleBulkUpload = async () => {
    if (!viewingEmployees) return;

    try {
      const lines = bulkEmployees.split('\n').filter((line) => line.trim());
      const employeesData = lines.map((line) => {
        const [email, employeeId, fullName, department] = line
          .split(',')
          .map((s) => s.trim());
        return {
          employee_email: email.toLowerCase(),
          employee_id: employeeId || null,
          full_name: fullName || null,
          department: department || null,
        };
      });

      const response = await api.post(
        `/companies/${viewingEmployees.id}/employees/bulk`,
        { employees: employeesData }
      );

      toast.success(
        `Uploaded ${response.data.inserted} employees (${response.data.failed} failed)`
      );

      setShowBulkUpload(false);
      setBulkEmployees('');
      fetchEmployees(viewingEmployees.id);
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to bulk upload');
    }
  };

  const handleDeleteEmployee = async (employeeId: number) => {
    if (!viewingEmployees) return;
    if (!confirm('Are you sure you want to remove this employee?')) return;

    try {
      await api.delete(`/companies/${viewingEmployees.id}/employees/${employeeId}`);
      toast.success('Employee removed');
      fetchEmployees(viewingEmployees.id);
      fetchCompanies();
    } catch (error) {
      toast.error('Failed to remove employee');
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

  // Access code handlers
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
      // Update editingCompany if we're editing this company
      if (editingCompany?.id === companyId && response.data.access_code) {
        setEditingCompany({ ...editingCompany, access_code: response.data.access_code });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to regenerate access code');
    } finally {
      setRegeneratingAccessCode(null);
    }
  };

  // Personal invite handlers
  const fetchPersonalInvites = async (companyId: number) => {
    try {
      const response = await api.get(`/companies/${companyId}/personal-invites`);
      setPersonalInvites(response.data.invites || response.data);
    } catch (error) {
      toast.error('Failed to load personal invites');
    }
  };

  const handleGeneratePersonalInvite = async () => {
    if (!viewingEmployees) return;

    setGeneratingPersonalInvite(true);
    try {
      const data: { email?: string; notes?: string } = {};
      if (personalInviteEmail) data.email = personalInviteEmail.toLowerCase();
      if (personalInviteNotes) data.notes = personalInviteNotes;

      await api.post(`/companies/${viewingEmployees.id}/personal-invites`, data);
      toast.success('Personal invite code generated');

      setShowPersonalInviteForm(false);
      setPersonalInviteEmail('');
      setPersonalInviteNotes('');
      fetchPersonalInvites(viewingEmployees.id);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate invite');
    } finally {
      setGeneratingPersonalInvite(false);
    }
  };

  const handleCopyPersonalInvite = async (invite: PersonalInvite) => {
    const inviteUrl = `${window.location.origin}/join/${invite.code}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedPersonalInvite(invite.id);
      toast.success('Personal invite link copied!');
      setTimeout(() => setCopiedPersonalInvite(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDeletePersonalInvite = async (inviteId: number) => {
    if (!viewingEmployees) return;
    if (!confirm('Delete this personal invite code?')) return;

    try {
      await api.delete(`/companies/${viewingEmployees.id}/personal-invites/${inviteId}`);
      toast.success('Personal invite deleted');
      fetchPersonalInvites(viewingEmployees.id);
    } catch (error) {
      toast.error('Failed to delete invite');
    }
  };

  const resetCompanyForm = () => {
    setCompanyFormData({
      name: '',
      discount_percentage: '0',
      email_domain: '',
      allow_employee_self_registration: false,
      is_active: true,
    });
    setWizardStep(1);
    setCreatedCompany(null);
  };

  const resetEmployeeForm = () => {
    setEmployeeFormData({
      employee_email: '',
      employee_id: '',
      full_name: '',
      department: '',
    });
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyFormData({
      name: company.name,
      discount_percentage: company.discount_percentage.toString(),
      email_domain: company.email_domain || '',
      allow_employee_self_registration: company.allow_employee_self_registration,
      is_active: company.is_active,
    });
    setShowCompanyForm(true);
  };

  const handleViewEmployees = (company: Company) => {
    setViewingEmployees(company);
    fetchEmployees(company.id);
    fetchPersonalInvites(company.id);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {!viewingEmployees ? (
          <>
            {/* Companies List */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Companies</h2>
              <button
                onClick={() => {
                  setEditingCompany(null);
                  resetCompanyForm();
                  setShowCompanyForm(true);
                }}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={20} />
                Create Company
              </button>
            </div>

            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Search companies..."
                className="input max-w-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && fetchCompanies()}
              />
            </div>

            {/* Company Form - Wizard for Create, Simple for Edit */}
            {showCompanyForm && (
              <div className="card border-2 border-blue-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 -mx-6 -mt-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {editingCompany ? 'Edit Company' : 'Add New Company'}
                      </h3>
                      <p className="text-blue-100 text-sm mt-1">
                        {editingCompany
                          ? 'Update company details and invite settings'
                          : 'Set up a new corporate partner in a few simple steps'
                        }
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

                  {/* Step Indicator - only for create mode */}
                  {!editingCompany && (
                    <div className="flex items-center gap-2 mt-6">
                      {[
                        { step: 1, label: 'Company' },
                        { step: 2, label: 'Discount' },
                        { step: 3, label: 'Verification' },
                        { step: 4, label: 'Complete' },
                      ].map(({ step, label }, index) => (
                        <div key={step} className="flex items-center">
                          <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                              wizardStep === step
                                ? 'bg-white text-blue-600 shadow-lg scale-110'
                                : wizardStep > step
                                ? 'bg-blue-400 text-white'
                                : 'bg-blue-500/50 text-blue-200'
                            }`}
                          >
                            {wizardStep > step ? <Check size={16} /> : step}
                          </div>
                          <span className={`ml-2 text-sm hidden sm:inline ${
                            wizardStep >= step ? 'text-white' : 'text-blue-200'
                          }`}>
                            {label}
                          </span>
                          {index < 3 && (
                            <ChevronRight size={16} className="mx-2 text-blue-300" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit Mode - Simple Form */}
                {editingCompany ? (
                  <form onSubmit={handleCompanySubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={companyFormData.name}
                          onChange={(e) =>
                            setCompanyFormData({ ...companyFormData, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Employee Discount %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="input"
                          value={companyFormData.discount_percentage}
                          onChange={(e) =>
                            setCompanyFormData({ ...companyFormData, discount_percentage: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {/* Email Domain */}
                    <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={companyFormData.allow_employee_self_registration}
                          onChange={(e) =>
                            setCompanyFormData({
                              ...companyFormData,
                              allow_employee_self_registration: e.target.checked,
                            })
                          }
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Allow email domain verification
                        </span>
                      </label>
                      {companyFormData.allow_employee_self_registration && (
                        <input
                          type="text"
                          className="input"
                          placeholder="company.com"
                          value={companyFormData.email_domain}
                          onChange={(e) =>
                            setCompanyFormData({ ...companyFormData, email_domain: e.target.value })
                          }
                        />
                      )}
                    </div>

                    {/* Invite Codes */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Link size={16} className="text-blue-600" />
                          Public Link
                        </label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 bg-white border rounded font-mono text-sm">
                            {editingCompany.invite_code || 'None'}
                          </code>
                          <button type="button" onClick={() => handleCopyInviteCode(editingCompany)} className="p-2 text-blue-600 hover:bg-blue-100 rounded">
                            {copiedCode === editingCompany.id ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                          <button type="button" onClick={() => handleRegenerateCode(editingCompany.id)} disabled={regeneratingCode === editingCompany.id} className="p-2 text-gray-500 hover:bg-gray-100 rounded">
                            <RefreshCw size={16} className={regeneratingCode === editingCompany.id ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Key size={16} className="text-amber-600" />
                          Access Code
                        </label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 bg-white border rounded font-mono text-sm font-bold text-amber-800">
                            {editingCompany.access_code || 'None'}
                          </code>
                          <button type="button" onClick={() => handleCopyAccessCode(editingCompany)} className="p-2 text-amber-600 hover:bg-amber-100 rounded">
                            {copiedAccessCode === editingCompany.id ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                          <button type="button" onClick={() => handleRegenerateAccessCode(editingCompany.id)} disabled={regeneratingAccessCode === editingCompany.id} className="p-2 text-gray-500 hover:bg-gray-100 rounded">
                            <RefreshCw size={16} className={regeneratingAccessCode === editingCompany.id ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={companyFormData.is_active}
                        onChange={(e) => setCompanyFormData({ ...companyFormData, is_active: e.target.checked })}
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>

                    <div className="flex gap-3 pt-4 border-t">
                      <button type="submit" className="btn btn-primary">Update Company</button>
                      <button type="button" onClick={() => { setShowCompanyForm(false); setEditingCompany(null); resetCompanyForm(); }} className="btn btn-secondary">Cancel</button>
                    </div>
                  </form>
                ) : (
                  /* Create Mode - Wizard Steps */
                  <div className="min-h-[300px]">
                    {/* Step 1: Company Name */}
                    {wizardStep === 1 && (
                      <div className="space-y-6">
                        <div className="text-center mb-8">
                          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Building2 size={32} className="text-blue-600" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-800">What is the company name?</h4>
                          <p className="text-gray-500 text-sm mt-1">This will be displayed to employees</p>
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

                        <div className="flex justify-end pt-6">
                          <button
                            onClick={() => {
                              if (!companyFormData.name.trim()) {
                                toast.error('Please enter a company name');
                                return;
                              }
                              setWizardStep(2);
                            }}
                            className="btn btn-primary flex items-center gap-2"
                          >
                            Continue
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Discount */}
                    {wizardStep === 2 && (
                      <div className="space-y-6">
                        <div className="text-center mb-8">
                          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Percent size={32} className="text-green-600" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-800">Set employee discount</h4>
                          <p className="text-gray-500 text-sm mt-1">How much discount do {companyFormData.name} employees get?</p>
                        </div>

                        <div className="max-w-sm mx-auto">
                          <div className="flex items-center justify-center gap-4">
                            <button
                              type="button"
                              onClick={() => {
                                const current = parseInt(companyFormData.discount_percentage) || 0;
                                if (current > 0) setCompanyFormData({ ...companyFormData, discount_percentage: String(current - 5) });
                              }}
                              className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600"
                            >
                              -
                            </button>
                            <div className="text-center">
                              <div className="text-5xl font-bold text-gray-800">
                                {companyFormData.discount_percentage || '0'}
                                <span className="text-2xl text-gray-400">%</span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">off all purchases</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const current = parseInt(companyFormData.discount_percentage) || 0;
                                if (current < 100) setCompanyFormData({ ...companyFormData, discount_percentage: String(current + 5) });
                              }}
                              className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex justify-center gap-2 mt-6">
                            {[0, 10, 15, 20, 25, 30].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setCompanyFormData({ ...companyFormData, discount_percentage: String(pct) })}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                  companyFormData.discount_percentage === String(pct)
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-between pt-6">
                          <button onClick={() => setWizardStep(1)} className="btn btn-secondary flex items-center gap-2">
                            <ChevronLeft size={18} />
                            Back
                          </button>
                          <button onClick={() => setWizardStep(3)} className="btn btn-primary flex items-center gap-2">
                            Continue
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Verification Method */}
                    {wizardStep === 3 && (
                      <div className="space-y-6">
                        <div className="text-center mb-8">
                          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Globe size={32} className="text-purple-600" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-800">How will employees verify?</h4>
                          <p className="text-gray-500 text-sm mt-1">Choose how employees prove they work at {companyFormData.name}</p>
                        </div>

                        <div className="max-w-lg mx-auto space-y-4">
                          {/* Access Code Option - Always Available */}
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Key size={20} className="text-amber-600" />
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-800">Access Code</h5>
                                <p className="text-sm text-gray-600 mt-0.5">
                                  HR shares a 6-digit code with employees. Always enabled.
                                </p>
                              </div>
                              <Check size={20} className="text-amber-600 ml-auto flex-shrink-0" />
                            </div>
                          </div>

                          {/* Email Domain Option */}
                          <div
                            className={`p-4 border rounded-xl cursor-pointer transition-all ${
                              companyFormData.allow_employee_self_registration
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setCompanyFormData({
                              ...companyFormData,
                              allow_employee_self_registration: !companyFormData.allow_employee_self_registration
                            })}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                companyFormData.allow_employee_self_registration ? 'bg-blue-100' : 'bg-gray-100'
                              }`}>
                                <Mail size={20} className={companyFormData.allow_employee_self_registration ? 'text-blue-600' : 'text-gray-400'} />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-800">Email Domain Verification</h5>
                                <p className="text-sm text-gray-600 mt-0.5">
                                  Employees verify with their work email address
                                </p>
                                {companyFormData.allow_employee_self_registration && (
                                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">@</span>
                                      <input
                                        type="text"
                                        className="input flex-1"
                                        placeholder="company.com"
                                        value={companyFormData.email_domain}
                                        onChange={(e) => setCompanyFormData({ ...companyFormData, email_domain: e.target.value })}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                companyFormData.allow_employee_self_registration
                                  ? 'bg-blue-600 border-blue-600'
                                  : 'border-gray-300'
                              }`}>
                                {companyFormData.allow_employee_self_registration && <Check size={14} className="text-white" />}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between pt-6">
                          <button onClick={() => setWizardStep(2)} className="btn btn-secondary flex items-center gap-2">
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
                            className="btn btn-primary flex items-center gap-2"
                          >
                            {isSubmitting ? 'Creating...' : 'Create Company'}
                            <Sparkles size={18} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Success */}
                    {wizardStep === 4 && createdCompany && (
                      <div className="space-y-6">
                        <div className="text-center mb-8">
                          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={40} className="text-green-600" />
                          </div>
                          <h4 className="text-xl font-semibold text-gray-800">{createdCompany.name} is ready!</h4>
                          <p className="text-gray-500 mt-1">Share these codes with HR to onboard employees</p>
                        </div>

                        <div className="max-w-lg mx-auto space-y-4">
                          {/* Public Link */}
                          <div className="p-4 bg-blue-50 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Link size={18} className="text-blue-600" />
                                <span className="font-medium text-gray-700">Public Invite Link</span>
                              </div>
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/join/${createdCompany.invite_code}`;
                                  navigator.clipboard.writeText(url);
                                  toast.success('Link copied!');
                                }}
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Copy size={14} />
                                Copy
                              </button>
                            </div>
                            <code className="block w-full px-3 py-2 bg-white rounded-lg font-mono text-sm break-all">
                              {typeof window !== 'undefined' ? window.location.origin : ''}/join/{createdCompany.invite_code}
                            </code>
                            <p className="text-xs text-gray-500 mt-2">Employees use this link to join (verification required)</p>
                          </div>

                          {/* Access Code */}
                          <div className="p-4 bg-amber-50 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Key size={18} className="text-amber-600" />
                                <span className="font-medium text-gray-700">Access Code</span>
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(createdCompany.access_code || '');
                                  toast.success('Code copied!');
                                }}
                                className="text-sm text-amber-600 hover:underline flex items-center gap-1"
                              >
                                <Copy size={14} />
                                Copy
                              </button>
                            </div>
                            <code className="block w-full px-4 py-3 bg-white rounded-lg font-mono text-2xl tracking-widest text-center font-bold text-amber-800">
                              {createdCompany.access_code}
                            </code>
                            <p className="text-xs text-gray-500 mt-2">HR shares this code - employees enter it to verify</p>
                          </div>

                          {createdCompany.discount_percentage > 0 && (
                            <div className="p-4 bg-green-50 rounded-xl text-center">
                              <Percent size={20} className="text-green-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-700">
                                <strong>{createdCompany.discount_percentage}% discount</strong> voucher auto-created for employees
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-center pt-6">
                          <button
                            onClick={() => {
                              setShowCompanyForm(false);
                              resetCompanyForm();
                            }}
                            className="btn btn-primary"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="card h-48 bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : companies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className={`card ${!company.is_active ? 'opacity-60 bg-gray-50' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 size={24} className="text-blue-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-800">{company.name}</h3>
                            <p className="text-sm text-gray-500">
                              {company.discount_percentage}% discount &bull; {company.employee_count} members
                              {company.allow_employee_self_registration && company.email_domain && (
                                <> &bull; @{company.email_domain}</>
                              )}
                              {!company.is_active && ' \u2022 Inactive'}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditCompany(company)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleViewEmployees(company)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded"
                              title="Manage Employees"
                            >
                              <Users size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCompany(company.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Invite Codes Section */}
                        <div className="mt-3 space-y-2">
                          {/* Public Invite Link */}
                          {company.invite_code && (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                              <Link size={14} className="text-blue-500" />
                              <span className="text-xs text-gray-500">Link:</span>
                              <code className="text-sm font-mono text-gray-700 tracking-wider">
                                {company.invite_code}
                              </code>
                              <button
                                onClick={() => handleCopyInviteCode(company)}
                                className="ml-auto p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                                title="Copy invite link"
                              >
                                {copiedCode === company.id ? (
                                  <Check size={14} />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                              <button
                                onClick={() => handleRegenerateCode(company.id)}
                                disabled={regeneratingCode === company.id}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-50"
                                title="Regenerate link code"
                              >
                                <RefreshCw
                                  size={14}
                                  className={regeneratingCode === company.id ? 'animate-spin' : ''}
                                />
                              </button>
                            </div>
                          )}
                          {!company.invite_code && (
                            <button
                              onClick={() => handleRegenerateCode(company.id)}
                              disabled={regeneratingCode === company.id}
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Link size={14} />
                              Generate invite link
                            </button>
                          )}

                          {/* Access Code (for company link verification) */}
                          {company.access_code && (
                            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
                              <Key size={14} className="text-amber-600" />
                              <span className="text-xs text-gray-500">Access:</span>
                              <code className="text-sm font-mono text-amber-800 tracking-wider font-semibold">
                                {company.access_code}
                              </code>
                              <button
                                onClick={() => handleCopyAccessCode(company)}
                                className="ml-auto p-1.5 text-amber-600 hover:bg-amber-100 rounded"
                                title="Copy access code"
                              >
                                {copiedAccessCode === company.id ? (
                                  <Check size={14} />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                              <button
                                onClick={() => handleRegenerateAccessCode(company.id)}
                                disabled={regeneratingAccessCode === company.id}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-50"
                                title="Regenerate access code"
                              >
                                <RefreshCw
                                  size={14}
                                  className={regeneratingAccessCode === company.id ? 'animate-spin' : ''}
                                />
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
              <div className="card text-center py-12">
                <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No companies yet</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Employee Management View */}
            <div>
              <button
                onClick={() => {
                  setViewingEmployees(null);
                  setEmployees([]);
                  setPersonalInvites([]);
                  setShowPersonalInviteForm(false);
                }}
                className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
              >
                ← Back to Companies
              </button>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {viewingEmployees.name} - Employees
                  </h2>
                  <p className="text-gray-600">
                    {viewingEmployees.discount_percentage}% discount •{' '}
                    {employees.length} employees
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <Upload size={20} />
                    Bulk Upload
                  </button>
                  <button
                    onClick={() => setShowEmployeeForm(true)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Add Employee
                  </button>
                </div>
              </div>

              {/* Add Employee Form */}
              {showEmployeeForm && (
                <div className="card bg-blue-50 border border-blue-200 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Add Employee</h3>
                    <button
                      onClick={() => {
                        setShowEmployeeForm(false);
                        resetEmployeeForm();
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Employee Email *
                        </label>
                        <input
                          type="email"
                          className="input"
                          value={employeeFormData.employee_email}
                          onChange={(e) =>
                            setEmployeeFormData({
                              ...employeeFormData,
                              employee_email: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Employee ID
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={employeeFormData.employee_id}
                          onChange={(e) =>
                            setEmployeeFormData({
                              ...employeeFormData,
                              employee_id: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={employeeFormData.full_name}
                          onChange={(e) =>
                            setEmployeeFormData({
                              ...employeeFormData,
                              full_name: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Department
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={employeeFormData.department}
                          onChange={(e) =>
                            setEmployeeFormData({
                              ...employeeFormData,
                              department: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button type="submit" className="btn btn-primary">
                        Add Employee
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEmployeeForm(false);
                          resetEmployeeForm();
                        }}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Bulk Upload Form */}
              {showBulkUpload && (
                <div className="card bg-yellow-50 border border-yellow-200 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Bulk Upload Employees</h3>
                    <button
                      onClick={() => {
                        setShowBulkUpload(false);
                        setBulkEmployees('');
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Enter one employee per line in CSV format:
                    <br />
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      email, employee_id, full_name, department
                    </code>
                  </p>

                  <textarea
                    className="input font-mono text-sm"
                    rows={10}
                    placeholder="john@company.com, EMP001, John Doe, Engineering&#10;jane@company.com, EMP002, Jane Smith, Marketing"
                    value={bulkEmployees}
                    onChange={(e) => setBulkEmployees(e.target.value)}
                  />

                  <div className="flex gap-3 mt-4">
                    <button onClick={handleBulkUpload} className="btn btn-primary">
                      Upload Employees
                    </button>
                    <button
                      onClick={() => {
                        setShowBulkUpload(false);
                        setBulkEmployees('');
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Personal Invite Codes Section */}
              <div className="card mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Key size={18} className="text-purple-600" />
                      Personal Invite Codes
                    </h3>
                    <p className="text-sm text-gray-500">
                      One-time direct access codes - no verification needed
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPersonalInviteForm(true)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Generate Code
                  </button>
                </div>

                {/* Generate Personal Invite Form */}
                {showPersonalInviteForm && (
                  <div className="p-4 bg-purple-50 rounded-lg mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">New Personal Invite</span>
                      <button
                        onClick={() => {
                          setShowPersonalInviteForm(false);
                          setPersonalInviteEmail('');
                          setPersonalInviteNotes('');
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Restrict to Email (optional)
                        </label>
                        <input
                          type="email"
                          className="input text-sm"
                          placeholder="employee@example.com"
                          value={personalInviteEmail}
                          onChange={(e) => setPersonalInviteEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Notes (optional)
                        </label>
                        <input
                          type="text"
                          className="input text-sm"
                          placeholder="e.g., For John from Marketing"
                          value={personalInviteNotes}
                          onChange={(e) => setPersonalInviteNotes(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleGeneratePersonalInvite}
                          disabled={generatingPersonalInvite}
                          className="btn btn-primary text-sm"
                        >
                          {generatingPersonalInvite ? 'Generating...' : 'Generate'}
                        </button>
                        <button
                          onClick={() => {
                            setShowPersonalInviteForm(false);
                            setPersonalInviteEmail('');
                            setPersonalInviteNotes('');
                          }}
                          className="btn btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Invites List */}
                {personalInvites.length > 0 ? (
                  <div className="space-y-2">
                    {personalInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          invite.is_used ? 'bg-gray-100 opacity-60' : 'bg-purple-50'
                        }`}
                      >
                        <Key size={16} className={invite.is_used ? 'text-gray-400' : 'text-purple-600'} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono font-semibold tracking-wider">
                              {invite.code}
                            </code>
                            {invite.is_used && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                Used
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {invite.email && <span>For: {invite.email} • </span>}
                            {invite.notes && <span>{invite.notes} • </span>}
                            <span>Created: {new Date(invite.created_at).toLocaleDateString()}</span>
                            {invite.expires_at && (
                              <span> • Expires: {new Date(invite.expires_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        {!invite.is_used && (
                          <>
                            <button
                              onClick={() => handleCopyPersonalInvite(invite)}
                              className="p-2 text-purple-600 hover:bg-purple-100 rounded"
                              title="Copy invite link"
                            >
                              {copiedPersonalInvite === invite.id ? (
                                <Check size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeletePersonalInvite(invite.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded"
                              title="Delete invite"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No personal invite codes yet. Generate one to give direct access to a specific employee.
                  </p>
                )}
              </div>

              {/* Employees Table */}
              {employees.length > 0 ? (
                <div className="card overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Employee ID
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Full Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Department
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((employee) => (
                        <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-800">
                            {employee.employee_email}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {employee.employee_id || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {employee.full_name || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {employee.department || '-'}
                          </td>
                          <td className="py-3 px-4">
                            {employee.is_verified ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                ✓ Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteEmployee(employee.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card text-center py-12">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No employees yet</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
