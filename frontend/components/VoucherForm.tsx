'use client';

import { useState, useMemo } from 'react';
import Button from './ui/Button';
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
    is_company_exclusive: voucher?.is_company_exclusive ?? false,
    allowed_company_ids: voucher?.allowed_company_ids || [],
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

  const toggleCompany = (companyId: number) => {
    if (formData.allowed_company_ids.includes(companyId)) {
      setFormData({
        ...formData,
        allowed_company_ids: formData.allowed_company_ids.filter((id: number) => id !== companyId),
      });
    } else {
      setFormData({
        ...formData,
        allowed_company_ids: [...formData.allowed_company_ids, companyId],
      });
    }
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal" style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div className="admin-modal-header">
          <div className="flex items-center gap-3">
            <div className="admin-icon-badge admin-icon-badge-coral">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="admin-modal-title">
                {voucher ? 'Edit Voucher' : 'Create Voucher'}
              </h2>
              <p className="text-[13px] text-[#6B7280] mt-0.5">
                {voucher ? 'Update reward details' : 'Design a new customer reward'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F9FAFB] rounded-lg border border-[#E8EAED]">
              <span className="text-[12px] text-[#6B7280]">Status</span>
              <div
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className={`admin-toggle ${formData.is_active ? 'active' : ''}`}
                style={{ width: '36px', height: '20px' }}
              >
                <span className="admin-toggle-knob" style={{ width: '16px', height: '16px' }} />
              </div>
              <span className={`text-[12px] font-semibold ${formData.is_active ? 'text-[#10B981]' : 'text-[#6B7280]'}`}>
                {formData.is_active ? 'Live' : 'Draft'}
              </span>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
            >
              <X size={18} className="text-[#6B7280]" />
            </button>
          </div>
        </div>

          <form onSubmit={handleSubmit} className="admin-modal-body">
            {/* Section 1: Reward Configuration */}
            <div className="space-y-4">
              <div className="admin-form-section-header" style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #E8EAED' }}>
                <div className="admin-form-section-icon admin-icon-badge-coral">
                  <DollarSign size={16} />
                </div>
                <div className="flex-1">
                  <h3 className="admin-form-section-title">Reward Configuration</h3>
                </div>
                {formData.title && formData.points_required && (
                  <CheckCircle2 size={16} className="text-[#10B981]" />
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="admin-label flex items-center justify-between">
                    <span>Voucher Name <span className="text-[#EF4444]">*</span></span>
                    {touched.title && !errors.title && formData.title && (
                      <span className="text-[11px] text-[#10B981] flex items-center gap-1">
                        <CheckCircle2 size={12} /> Looks great
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    className={`admin-input ${errors.title && touched.title ? 'admin-input-error' : ''}`}
                    value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    onBlur={() => handleFieldBlur('title')}
                    placeholder="e.g., Free Croissant with Any Coffee"
                    required
                  />
                  {errors.title && touched.title && (
                    <p className="admin-form-error">
                      <AlertCircle size={12} /> {errors.title}
                    </p>
                  )}
                </div>

                <div className="admin-form-grid admin-form-grid-4">
                  <div>
                    <label className="admin-label-sm admin-label-required">Category</label>
                    <select
                      className={`admin-select admin-select-sm ${errors.category && touched.category ? 'admin-input-error' : ''}`}
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
                      <p className="admin-form-error" style={{ fontSize: '11px' }}>
                        <AlertCircle size={10} /> {errors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="admin-label-sm admin-label-required">Type</label>
                    <select
                      className="admin-select admin-select-sm"
                      value={formData.voucher_type}
                      onChange={(e) => handleFieldChange('voucher_type', e.target.value)}
                    >
                      <option value="free_item">Free Item</option>
                      <option value="discount_amount">Discount</option>
                    </select>
                  </div>

                  <div>
                    <label className="admin-label-sm">Value <span className="admin-label-hint">(THB)</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="admin-input admin-input-sm"
                      value={formData.cash_value}
                      onChange={(e) => handleFieldChange('cash_value', e.target.value)}
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="admin-label-sm admin-label-required">Points</label>
                    <input
                      type="number"
                      min="0"
                      className={`admin-input admin-input-sm ${errors.points_required && touched.points_required ? 'admin-input-error' : ''}`}
                      value={formData.points_required}
                      onChange={(e) => handleFieldChange('points_required', e.target.value)}
                      onBlur={() => handleFieldBlur('points_required')}
                      placeholder="0"
                      required
                    />
                    {errors.points_required && touched.points_required && (
                      <p className="admin-form-error" style={{ fontSize: '11px' }}>
                        <AlertCircle size={10} /> {errors.points_required}
                      </p>
                    )}
                  </div>
                </div>

                {/* Smart Redemption Costs - Only show if investor or media selected */}
                {(showInvestorCost || showMediaCost) && (
                  <div className="admin-form-section" style={{ marginBottom: 0 }}>
                    <div className="admin-form-grid admin-form-grid-2">
                      {showInvestorCost && (
                        <div>
                          <label className="admin-label-sm">Investor Credits</label>
                          <input
                            type="number"
                            min="0"
                            className="admin-input admin-input-sm"
                            value={formData.investor_credits_cost}
                            onChange={(e) => handleFieldChange('investor_credits_cost', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      )}

                      {showMediaCost && (
                        <div>
                          <label className="admin-label-sm">Media Budget (THB)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="admin-input admin-input-sm"
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
            <div className="space-y-4 mt-6">
              <div className="admin-form-section-header" style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #E8EAED' }}>
                <div className="admin-form-section-icon">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="admin-form-section-title">Access & Availability</h3>
                </div>
              </div>

              <div className="space-y-4">
                {/* User Types */}
                <div>
                  <label className="admin-label-sm">Who can redeem?</label>
                  <div className="admin-chip-group">
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
                          className={`admin-chip ${isSelected ? 'selected' : ''}`}
                        >
                          <Icon size={16} className="admin-chip-icon" />
                          <span>{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Corporate Exclusivity */}
                <div className="pt-4 border-t border-[#E8EAED]">
                  <div
                    className="admin-checkbox-wrapper mb-3"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        is_company_exclusive: !formData.is_company_exclusive,
                        allowed_company_ids: !formData.is_company_exclusive ? formData.allowed_company_ids : [],
                      });
                    }}
                  >
                    <div className={`admin-checkbox ${formData.is_company_exclusive ? 'checked' : ''}`}>
                      {formData.is_company_exclusive && <CheckCircle2 size={12} />}
                    </div>
                    <div>
                      <span className="admin-checkbox-label">Company exclusive</span>
                      <p className="admin-checkbox-description">Only available to selected company employees</p>
                    </div>
                  </div>

                  {formData.is_company_exclusive && (
                    <div className="admin-form-section" style={{ marginBottom: 0 }}>
                      {/* Company Search */}
                      <div className="relative mb-3">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                        <input
                          type="text"
                          className="admin-input admin-input-sm"
                          style={{ paddingLeft: '36px' }}
                          placeholder="Search companies..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                        />
                      </div>

                      {/* Company List */}
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {filteredCompanies.length === 0 ? (
                          <p className="text-[12px] text-[#6B7280] text-center py-2">No companies found</p>
                        ) : (
                          filteredCompanies.map((company: any) => (
                            <button
                              key={company.id}
                              type="button"
                              onClick={() => toggleCompany(company.id)}
                              className={`admin-chip w-full justify-start ${formData.allowed_company_ids.includes(company.id) ? 'selected' : ''}`}
                            >
                              <Building2 size={14} />
                              <span className="flex-1 text-left">{company.name}</span>
                              {company.discount_percentage > 0 && (
                                <span className="text-[10px] opacity-60">{company.discount_percentage}%</span>
                              )}
                              {formData.allowed_company_ids.includes(company.id) && (
                                <CheckCircle2 size={14} />
                              )}
                            </button>
                          ))
                        )}
                      </div>

                      {formData.allowed_company_ids.length > 0 && (
                        <p className="admin-form-hint mt-2">
                          {formData.allowed_company_ids.length} {formData.allowed_company_ids.length === 1 ? 'company' : 'companies'} selected
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Expiration - Inline */}
                <div className="pt-4 border-t border-[#E8EAED]">
                  <label className="admin-label-sm">Expiration <span className="admin-label-hint">(optional)</span></label>
                  <input
                    type="date"
                    className="admin-input admin-input-sm"
                    value={formData.expires_at}
                    onChange={(e) => handleFieldChange('expires_at', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Advanced Settings */}
            <div className="space-y-4 mt-6">
              <div className="admin-form-section-header" style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #E8EAED' }}>
                <div className="admin-form-section-icon" style={{ background: '#F3E8FF', color: '#8B5CF6' }}>
                  <Calendar size={16} />
                </div>
                <div>
                  <h3 className="admin-form-section-title">Advanced Settings</h3>
                  <p className="admin-form-section-subtitle">Redemption rules & restrictions</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Redemption Window */}
                <div>
                  <label className="admin-label-sm">Redemption Window</label>
                  <select
                    className="admin-select admin-select-sm"
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
                <div className="admin-form-grid admin-form-grid-2">
                  <div>
                    <label className="admin-label-sm">Minimum Purchase <span className="admin-label-hint">(THB)</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="admin-input admin-input-sm"
                      value={formData.requires_minimum_purchase}
                      onChange={(e) => handleFieldChange('requires_minimum_purchase', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="admin-label-sm">Auto-Expire <span className="admin-label-hint">(hours)</span></label>
                    <input
                      type="number"
                      min="0"
                      className="admin-input admin-input-sm"
                      value={formData.auto_expire_hours}
                      onChange={(e) => handleFieldChange('auto_expire_hours', e.target.value)}
                      placeholder="No auto-expire"
                    />
                  </div>
                </div>

                {/* Valid Days of Week */}
                <div>
                  <label className="admin-label-sm">Valid Days of Week <span className="admin-label-hint">(optional)</span></label>
                  <div className="admin-chip-group">
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
                          className={`admin-chip ${isSelected ? 'selected' : ''}`}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="admin-form-hint">Leave empty to allow all days</p>
                </div>

                {/* Valid Outlets - Coming Soon */}
                <div className="admin-info-box">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-[#6B7280]" />
                    <span className="text-[12px] font-semibold text-[#1A1A1A]">
                      Valid Outlets <span className="admin-label-hint">(Coming Soon)</span>
                    </span>
                  </div>
                  <p className="admin-form-hint mt-1">
                    Outlet-specific redemption restrictions will be available soon
                  </p>
                </div>
              </div>
            </div>

          </form>

          {/* Footer */}
          <div className="admin-modal-footer">
            <div className="flex items-center gap-2 mr-auto">
              {isValid ? (
                <>
                  <CheckCircle2 size={14} className="text-[#10B981]" />
                  <span className="text-[12px] text-[#10B981] font-semibold">Ready</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} className="text-[#F59E0B]" />
                  <span className="text-[12px] text-[#6B7280]">Required fields missing</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="admin-btn admin-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="voucher-form"
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="admin-btn admin-btn-primary flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="admin-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  {voucher ? 'Update' : 'Create'}
                </>
              )}
            </button>
          </div>
        </div>
    </div>
  );
}
