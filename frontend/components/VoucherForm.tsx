'use client';

import { useState, useMemo } from 'react';
import Button from './Button';
import ImageUpload from './ImageUpload';
import { X, Save, DollarSign, Users, Calendar, Building2, Search, AlertCircle, CheckCircle2, Sparkles, User, Briefcase, TrendingUp, Newspaper } from 'lucide-react';

interface VoucherFormProps {
  voucher?: any;
  companies: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function VoucherForm({ voucher, companies, onSubmit, onCancel, isSubmitting }: VoucherFormProps) {
  const [formData, setFormData] = useState({
    title: voucher?.title || voucher?.name || '',
    description: voucher?.description || '',
    category: voucher?.category || '',
    points_required: voucher?.points_required || voucher?.points_cost || '',
    voucher_type: voucher?.voucher_type || 'free_item',
    benefit_type: voucher?.benefit_type || 'free_item',
    benefit_value: voucher?.benefit_value || '',
    cash_value: voucher?.cash_value || voucher?.value_amount || '',
    is_active: voucher?.is_active ?? voucher?.active ?? true,
    is_featured: voucher?.is_featured ?? false,
    expiry_type: voucher?.expiry_type || 'no_expiry',
    expiry_date: voucher?.expiry_date || '',
    expiry_days: voucher?.expiry_days || '',
    target_user_types: voucher?.target_user_types || voucher?.allowed_user_types || ['customer', 'employee'],
    max_redemptions_per_user: voucher?.max_redemptions_per_user || '',
    max_redemptions_total: voucher?.max_redemptions_total || '',
    valid_from: voucher?.valid_from || '',
    valid_until: voucher?.valid_until || '',
    image_url: voucher?.image_url || '',
    redemption_window: voucher?.redemption_window || 'unlimited',
    requires_minimum_purchase: voucher?.requires_minimum_purchase || '',
    valid_days_of_week: voucher?.valid_days_of_week || [],
    valid_outlets: voucher?.valid_outlets || [],
    auto_expire_hours: voucher?.auto_expire_hours || '',
    investor_credits_cost: voucher?.investor_credits_cost || '',
    media_budget_cost: voucher?.media_budget_cost || '',
    expires_at: voucher?.expires_at || '',
  });

  const [companySearch, setCompanySearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Real-time validation
  const validateField = (field: string, value: any) => {
    switch (field) {
      case 'title':
        if (!value || value.trim().length === 0) return 'Voucher title is required';
        if (value.length < 3) return 'Title must be at least 3 characters';
        if (value.length > 200) return 'Title must be less than 200 characters';
        break;
      case 'points_required':
        if (value === '' || value === undefined) return 'Points required is required';
        if (Number(value) < 0) return 'Points must be non-negative';
        break;
      case 'category':
        if (!value) return 'Category is required';
        break;
    }
    return '';
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors({ ...errors, [field]: error });
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    const error = validateField(field, formData[field as keyof typeof formData]);
    setErrors({ ...errors, [field]: error });
  };

  // Smart field visibility
  const showInvestorCost = formData.target_user_types.includes('investor');
  const showMediaCost = formData.target_user_types.includes('media');

  // Filter companies for search
  const filteredCompanies = useMemo(() => {
    if (!Array.isArray(companies)) return [];
    if (!companySearch) return companies;
    return companies.filter(c =>
      c.name.toLowerCase().includes(companySearch.toLowerCase())
    );
  }, [companies, companySearch]);

  // Form validation status
  const isValid = formData.title.length >= 3 && formData.category && formData.points_required !== undefined && Number(formData.points_required) >= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // DISABLED: Database doesn't have is_company_exclusive or allowed_company_ids columns yet
  // const toggleCompany = (companyId: number) => {
  //   if (formData.allowed_company_ids.includes(companyId)) {
  //     setFormData({
  //       ...formData,
  //       allowed_company_ids: formData.allowed_company_ids.filter((id: number) => id !== companyId),
  //     });
  //   } else {
  //     setFormData({
  //       ...formData,
  //       allowed_company_ids: [...formData.allowed_company_ids, companyId],
  //     });
  //   }
  // };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-start justify-center p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl my-8 animate-in slide-in-from-bottom-4 duration-300">
        {/* Modal Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-border-subtle overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-gradient-to-b from-background-subtle to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-500 flex items-center justify-center shadow-sm">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h2 className="font-display text-display-md text-text-primary tracking-tight">
                  {voucher ? 'Edit Voucher' : 'Create Voucher'}
                </h2>
                <p className="font-ui text-ui-xs text-text-secondary mt-0.5">
                  {voucher ? 'Update reward details' : 'Design a new customer reward'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-border-subtle shadow-sm">
                <span className="font-ui text-ui-xs text-text-secondary">Status</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-all duration-200 ${
                    formData.is_active ? 'bg-success-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
                      formData.is_active ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className={`font-ui text-ui-xs font-semibold ${formData.is_active ? 'text-success-600' : 'text-text-tertiary'}`}>
                  {formData.is_active ? 'Live' : 'Draft'}
                </span>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="p-2 hover:bg-background-hover rounded-lg transition-colors group"
              >
                <X size={18} className="text-text-secondary group-hover:text-text-primary transition-colors" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
            {/* Section 1: Reward Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
                    <DollarSign size={16} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-display text-[15px] font-bold text-text-primary leading-none">Reward Configuration</h3>
                  </div>
                </div>
                {formData.title && formData.points_required && (
                  <CheckCircle2 size={16} className="text-success-500" strokeWidth={2.5} />
                )}
              </div>

              <div className="space-y-3 pl-9">
                <div>
                  <label className="flex items-center justify-between font-ui text-[12px] font-semibold text-text-primary mb-1.5 leading-tight">
                    <span>Voucher Name <span className="text-danger-500">*</span></span>
                    {touched.title && !errors.title && formData.title && (
                      <span className="text-[11px] text-success-600 flex items-center gap-1 leading-none">
                        <CheckCircle2 size={12} strokeWidth={2.5} /> Looks great
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg font-ui text-[13px] text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 transition-all leading-tight ${
                      errors.title && touched.title
                        ? 'border-danger-500 focus:ring-danger-500/20 focus:border-danger-500'
                        : 'border-border-subtle focus:ring-accent-500/20 focus:border-accent-500'
                    }`}
                    value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    onBlur={() => handleFieldBlur('title')}
                    placeholder="e.g., Free Croissant with Any Coffee"
                    required
                  />
                  {errors.title && touched.title && (
                    <p className="font-ui text-[11px] text-danger-600 mt-1 flex items-center gap-1 leading-tight">
                      <AlertCircle size={11} strokeWidth={2.5} /> {errors.title}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block font-ui text-[12px] font-medium text-text-primary mb-1.5 leading-tight">
                      Category <span className="text-danger-500">*</span>
                    </label>
                    <select
                      className={`w-full px-3 py-2 border rounded-lg font-ui text-[13px] text-text-primary focus:outline-none focus:ring-1 transition-all bg-white leading-tight ${
                        errors.category && touched.category
                          ? 'border-danger-500 focus:ring-danger-500/20 focus:border-danger-500'
                          : 'border-border-subtle focus:ring-accent-500/20 focus:border-accent-500'
                      }`}
                      value={formData.category}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      onBlur={() => handleFieldBlur('category')}
                      required
                    >
                      <option value="">Select...</option>
                      <option value="drinks">Drinks</option>
                      <option value="food">Food</option>
                      <option value="discounts">Discounts</option>
                      <option value="merchandise">Merchandise</option>
                      <option value="combos">Combos</option>
                      <option value="promotions">Promotions</option>
                    </select>
                    {errors.category && touched.category && (
                      <p className="font-ui text-[10px] text-danger-600 mt-1 flex items-center gap-1 leading-tight">
                        <AlertCircle size={10} strokeWidth={2.5} /> {errors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-ui text-[12px] font-medium text-text-primary mb-1.5 leading-tight">
                      Type <span className="text-danger-500">*</span>
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[13px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500/20 focus:border-accent-500 transition-all bg-white leading-tight"
                      value={formData.voucher_type}
                      onChange={(e) => handleFieldChange('voucher_type', e.target.value)}
                    >
                      <option value="free_item">Free Item</option>
                      <option value="discount_amount">Discount</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-ui text-[12px] font-medium text-text-primary mb-1.5 leading-tight">
                      Value <span className="font-ui text-[11px] text-text-tertiary">(THB)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[13px] text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-500/20 focus:border-accent-500 transition-all leading-tight"
                      value={formData.cash_value}
                      onChange={(e) => handleFieldChange('cash_value', e.target.value)}
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="flex items-center justify-between font-ui text-[12px] font-semibold text-text-primary mb-1.5 leading-tight">
                      <span>Points <span className="text-danger-500">*</span></span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={`w-full px-3 py-2 border rounded-lg font-ui text-[13px] text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 transition-all leading-tight ${
                        errors.points_required && touched.points_required
                          ? 'border-danger-500 focus:ring-danger-500/20 focus:border-danger-500'
                          : 'border-border-subtle focus:ring-accent-500/20 focus:border-accent-500'
                      }`}
                      value={formData.points_required}
                      onChange={(e) => handleFieldChange('points_required', e.target.value)}
                      onBlur={() => handleFieldBlur('points_required')}
                      placeholder="0"
                      required
                    />
                    {errors.points_required && touched.points_required && (
                      <p className="font-ui text-[10px] text-danger-600 mt-1 flex items-center gap-1 leading-tight">
                        <AlertCircle size={10} strokeWidth={2.5} /> {errors.points_required}
                      </p>
                    )}
                  </div>
                </div>

                {/* Smart Redemption Costs - Only show if investor or media selected */}
                {(showInvestorCost || showMediaCost) && (
                  <div className="bg-background-subtle rounded-lg p-3 border border-border-subtle">
                    <div className="grid gap-3 grid-cols-2">
                      {showInvestorCost && (
                        <div className="animate-in slide-in-from-right duration-200">
                          <label className="block font-ui text-[11px] font-medium text-text-primary mb-1.5 leading-tight">
                            Investor Credits
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[13px] text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-500/20 focus:border-accent-500 transition-all leading-tight bg-white"
                            value={formData.investor_credits_cost}
                            onChange={(e) => handleFieldChange('investor_credits_cost', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      )}

                      {showMediaCost && (
                        <div className="animate-in slide-in-from-right duration-200">
                          <label className="block font-ui text-[11px] font-medium text-text-primary mb-1.5 leading-tight">
                            Media Budget (THB)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[13px] text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-500/20 focus:border-accent-500 transition-all leading-tight bg-white"
                            value={formData.media_budget_cost}
                            onChange={(e) => handleFieldChange('media_budget_cost', e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Image Upload */}
                <div>
                  <ImageUpload
                    label="Voucher Image"
                    value={formData.image_url}
                    onChange={(url) => handleFieldChange('image_url', url)}
                    onRemove={() => handleFieldChange('image_url', '')}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Access & Availability */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-text-primary to-gray-700 flex items-center justify-center">
                    <Users size={16} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-display text-[15px] font-bold text-text-primary leading-none">Access & Availability</h3>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pl-9">
                {/* User Types */}
                <div>
                  <label className="block font-ui text-[12px] font-semibold text-text-primary mb-1.5 leading-tight">Who can redeem?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'customer', label: 'Customers', icon: User },
                      { value: 'employee', label: 'Staff', icon: Briefcase },
                      { value: 'investor', label: 'Investors', icon: TrendingUp },
                      { value: 'media', label: 'Media', icon: Newspaper },
                    ].map((type) => {
                      const Icon = type.icon;
                      const isSelected = formData.target_user_types.includes(type.value);
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              handleFieldChange('target_user_types', formData.target_user_types.filter((t: string) => t !== type.value));
                            } else {
                              handleFieldChange('target_user_types', [...formData.target_user_types, type.value]);
                            }
                          }}
                          className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border transition-all font-ui text-[11px] font-semibold ${
                            isSelected
                              ? 'border-accent-500 bg-accent-50 text-text-primary'
                              : 'border-border-subtle bg-white text-text-secondary hover:border-accent-300'
                          }`}
                        >
                          <Icon size={16} strokeWidth={2} className={isSelected ? 'text-accent-600' : 'text-text-tertiary'} />
                          <span className="leading-tight">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Corporate Exclusivity - DISABLED: Database schema doesn't support this yet */}
                {/* <div className="pt-3 border-t border-border-subtle">
                  TODO: Add is_company_exclusive and allowed_company_ids columns to vouchers table
                </div> */}

                {/* Expiration - Inline */}
                <div className="pt-3 border-t border-border-subtle grid grid-cols-[auto_1fr] gap-3 items-center">
                  <Calendar size={16} strokeWidth={2} className="text-text-secondary flex-shrink-0" />
                  <div>
                    <label className="block font-ui text-[12px] font-semibold text-text-primary mb-1.5 leading-tight">
                      Expiration <span className="font-ui text-[11px] text-text-tertiary font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[12px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500/20 focus:border-accent-500 transition-all leading-tight"
                      value={formData.expires_at}
                      onChange={(e) => handleFieldChange('expires_at', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Advanced Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Calendar size={16} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-display text-[15px] font-bold text-text-primary leading-none">Advanced Settings</h3>
                    <p className="font-ui text-[11px] text-text-secondary mt-0.5">Redemption rules & restrictions</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pl-9">
                {/* Redemption Window */}
                <div>
                  <label className="block font-ui text-[12px] font-semibold text-text-primary mb-1.5 leading-tight">
                    Redemption Window
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[13px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-500/20 focus:border-accent-500 transition-all bg-white leading-tight"
                    value={formData.redemption_window}
                    onChange={(e) => handleFieldChange('redemption_window', e.target.value)}
                  >
                    <option value="unlimited">Unlimited (Can redeem anytime)</option>
                    <option value="once_per_day">Once Per Day</option>
                    <option value="once_per_week">Once Per Week</option>
                    <option value="once_per_month">Once Per Month</option>
                    <option value="once_per_shift">Once Per Shift (Staff only)</option>
                  </select>
                </div>

                {/* Minimum Purchase & Auto-Expire */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-ui text-[12px] font-medium text-text-primary mb-1.5 leading-tight">
                      Minimum Purchase <span className="font-ui text-[11px] text-text-tertiary">(THB)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[13px] text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-500/20 focus:border-accent-500 transition-all leading-tight"
                      value={formData.requires_minimum_purchase}
                      onChange={(e) => handleFieldChange('requires_minimum_purchase', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block font-ui text-[12px] font-medium text-text-primary mb-1.5 leading-tight">
                      Auto-Expire <span className="font-ui text-[11px] text-text-tertiary">(hours after redemption)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[13px] text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-500/20 focus:border-accent-500 transition-all leading-tight"
                      value={formData.auto_expire_hours}
                      onChange={(e) => handleFieldChange('auto_expire_hours', e.target.value)}
                      placeholder="Leave empty for no auto-expire"
                    />
                  </div>
                </div>

                {/* Valid Days of Week */}
                <div>
                  <label className="block font-ui text-[12px] font-semibold text-text-primary mb-1.5 leading-tight">
                    Valid Days of Week <span className="font-ui text-[11px] text-text-tertiary font-normal">(optional)</span>
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {[
                      { value: 1, label: 'Mon' },
                      { value: 2, label: 'Tue' },
                      { value: 3, label: 'Wed' },
                      { value: 4, label: 'Thu' },
                      { value: 5, label: 'Fri' },
                      { value: 6, label: 'Sat' },
                      { value: 0, label: 'Sun' },
                    ].map((day) => {
                      const isSelected = formData.valid_days_of_week.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              handleFieldChange('valid_days_of_week', formData.valid_days_of_week.filter((d: number) => d !== day.value));
                            } else {
                              handleFieldChange('valid_days_of_week', [...formData.valid_days_of_week, day.value]);
                            }
                          }}
                          className={`px-2 py-2 rounded-lg border transition-all font-ui text-[11px] font-semibold ${
                            isSelected
                              ? 'border-accent-500 bg-accent-50 text-accent-700'
                              : 'border-border-subtle bg-white text-text-secondary hover:border-accent-300'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="font-ui text-[10px] text-text-tertiary mt-1.5 leading-tight">
                    Leave empty to allow all days
                  </p>
                </div>

                {/* Valid Outlets - Coming Soon */}
                <div className="bg-background-subtle rounded-lg p-3 border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-text-tertiary" />
                    <label className="block font-ui text-[11px] font-semibold text-text-primary leading-tight">
                      Valid Outlets <span className="font-ui text-[10px] text-text-tertiary font-normal">(Coming Soon)</span>
                    </label>
                  </div>
                  <p className="font-ui text-[10px] text-text-tertiary mt-1.5 leading-tight">
                    Outlet-specific redemption restrictions will be available soon
                  </p>
                </div>
              </div>
            </div>

            {/* Premium Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border-subtle -mx-5 px-5 pb-1 mt-5">
              <div className="flex items-center gap-1.5">
                {isValid ? (
                  <>
                    <CheckCircle2 size={14} strokeWidth={2.5} className="text-success-500" />
                    <span className="font-ui text-[11px] text-success-600 font-semibold leading-tight">Ready</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} strokeWidth={2} className="text-warning-500" />
                    <span className="font-ui text-[11px] text-text-secondary leading-tight">Required fields missing</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="px-4 py-2 font-ui text-[13px] font-semibold text-text-secondary hover:text-text-primary hover:bg-background-hover rounded-lg transition-all disabled:opacity-50 leading-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  className="px-4 py-2 bg-text-primary text-white font-ui text-[13px] font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 leading-none"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} strokeWidth={2} />
                      {voucher ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
