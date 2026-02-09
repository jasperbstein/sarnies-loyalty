'use client';

import { useState, useMemo } from 'react';
import Button from './ui/Button';
import ImageUpload from './ImageUpload';
import { X, Save, Gift, Percent, DollarSign, Calendar, Building2, Search, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import type { CollabPartner, CollabOffer } from '@/lib/api';

interface CollabOfferFormProps {
  partners: CollabPartner[];
  initialData?: CollabOffer;
  onSubmit: (data: any) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export default function CollabOfferForm({ partners, initialData, onSubmit, onClose, isSubmitting }: CollabOfferFormProps) {
  const [formData, setFormData] = useState({
    target_company_id: initialData?.target_company_id || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    discount_type: initialData?.discount_type || 'percentage',
    discount_value: initialData?.discount_value || '',
    image_url: initialData?.image_url || '',
    terms: initialData?.terms || '',
    valid_from: initialData?.valid_from ? initialData.valid_from.split('T')[0] : '',
    valid_until: initialData?.valid_until ? initialData.valid_until.split('T')[0] : '',
    max_redemptions: initialData?.max_redemptions || '',
    max_per_user: initialData?.max_per_user || 1,
  });

  const [partnerSearch, setPartnerSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Filter active partners
  const activePartners = useMemo(() => {
    return partners.filter(p => p.is_active);
  }, [partners]);

  // Filter partners for search
  const filteredPartners = useMemo(() => {
    if (!partnerSearch) return activePartners;
    return activePartners.filter(p =>
      p.partner_name.toLowerCase().includes(partnerSearch.toLowerCase())
    );
  }, [activePartners, partnerSearch]);

  // Real-time validation
  const validateField = (field: string, value: any) => {
    switch (field) {
      case 'target_company_id':
        if (!value) return 'Partner company is required';
        break;
      case 'title':
        if (!value || value.trim().length === 0) return 'Title is required';
        if (value.length < 3) return 'Title must be at least 3 characters';
        if (value.length > 255) return 'Title must be less than 255 characters';
        break;
      case 'discount_value':
        if (value === '' || value === undefined) return 'Discount value is required';
        if (Number(value) <= 0) return 'Discount value must be positive';
        if (formData.discount_type === 'percentage' && Number(value) > 100) {
          return 'Percentage cannot exceed 100%';
        }
        break;
      case 'valid_from':
        if (!value) return 'Start date is required';
        break;
      case 'valid_until':
        if (!value) return 'End date is required';
        if (formData.valid_from && new Date(value) <= new Date(formData.valid_from)) {
          return 'End date must be after start date';
        }
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

  // Form validation status
  const isValid = useMemo(() => {
    return (
      formData.target_company_id &&
      formData.title.length >= 3 &&
      formData.discount_value &&
      Number(formData.discount_value) > 0 &&
      (formData.discount_type !== 'percentage' || Number(formData.discount_value) <= 100) &&
      formData.valid_from &&
      formData.valid_until &&
      new Date(formData.valid_until) > new Date(formData.valid_from)
    );
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Touch all fields to show errors
    const allFields = ['target_company_id', 'title', 'discount_value', 'valid_from', 'valid_until'];
    const newTouched: Record<string, boolean> = {};
    const newErrors: Record<string, string> = {};

    allFields.forEach(field => {
      newTouched[field] = true;
      const error = validateField(field, formData[field as keyof typeof formData]);
      if (error) newErrors[field] = error;
    });

    setTouched(newTouched);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    // Submit the form data
    const submitData = {
      ...formData,
      target_company_id: Number(formData.target_company_id),
      discount_value: Number(formData.discount_value),
      max_redemptions: formData.max_redemptions ? Number(formData.max_redemptions) : null,
      max_per_user: formData.max_per_user ? Number(formData.max_per_user) : 1,
    };

    onSubmit(submitData);
  };

  const selectedPartner = activePartners.find(p => p.partner_id === Number(formData.target_company_id));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-start justify-center p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl my-8 animate-in slide-in-from-bottom-4 duration-300">
        {/* Modal Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-gradient-to-b from-stone-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-sm">
                <UserPlus size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-[18px] font-semibold text-stone-900 tracking-tight">
                  {initialData ? 'Edit Collab Offer' : 'Create Collab Offer'}
                </h2>
                <p className="text-[13px] text-stone-500 mt-0.5">
                  {initialData ? 'Update partner offer details' : 'Create an offer for partner customers'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-stone-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
              {/* Partner Selection */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[13px] font-semibold text-stone-700">
                  <Building2 className="w-4 h-4 text-stone-400" />
                  Partner Company
                </label>

                {activePartners.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-xl text-[14px] text-amber-700">
                    <AlertCircle className="w-4 h-4 inline-block mr-2" />
                    No partner companies available. Add a partner first.
                  </div>
                ) : (
                  <>
                    {/* Search */}
                    {activePartners.length > 5 && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input
                          type="text"
                          placeholder="Search partners..."
                          className="w-full h-10 pl-10 pr-4 border border-stone-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                          value={partnerSearch}
                          onChange={(e) => setPartnerSearch(e.target.value)}
                        />
                      </div>
                    )}

                    {/* Partner Grid */}
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {filteredPartners.map((partner) => (
                        <button
                          key={partner.partnership_id}
                          type="button"
                          onClick={() => handleFieldChange('target_company_id', partner.partner_id)}
                          onBlur={() => handleFieldBlur('target_company_id')}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                            formData.target_company_id === partner.partner_id
                              ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/20'
                              : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {partner.partner_logo ? (
                              <img src={partner.partner_logo} alt={partner.partner_name} className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="w-5 h-5 text-stone-400" />
                            )}
                          </div>
                          <span className="text-[14px] font-medium text-stone-900 truncate">{partner.partner_name}</span>
                          {formData.target_company_id === partner.partner_id && (
                            <CheckCircle2 className="w-4 h-4 text-purple-500 ml-auto flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>

                    {errors.target_company_id && touched.target_company_id && (
                      <p className="text-[12px] text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.target_company_id}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-stone-700">Offer Title</label>
                <input
                  type="text"
                  placeholder="e.g., Free Coffee at Sarnies"
                  className={`w-full h-11 px-4 border rounded-xl text-[14px] focus:outline-none focus:ring-2 transition-all ${
                    errors.title && touched.title
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-stone-200 focus:ring-purple-500/20 focus:border-purple-500'
                  }`}
                  value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  onBlur={() => handleFieldBlur('title')}
                />
                {errors.title && touched.title && (
                  <p className="text-[12px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-stone-700">Description</label>
                <textarea
                  placeholder="Describe the offer..."
                  className="w-full h-24 px-4 py-3 border border-stone-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-stone-700">Discount Type</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'percentage', icon: Percent, label: '%' },
                      { value: 'fixed', icon: DollarSign, label: '$' },
                      { value: 'free_item', icon: Gift, label: 'Free' },
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleFieldChange('discount_type', type.value)}
                        className={`flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border transition-all ${
                          formData.discount_type === type.value
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-stone-200 hover:border-stone-300 text-stone-600'
                        }`}
                      >
                        <type.icon className="w-4 h-4" />
                        <span className="text-[13px] font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-stone-700">
                    {formData.discount_type === 'percentage' ? 'Percentage' : formData.discount_type === 'fixed' ? 'Amount' : 'Quantity'}
                  </label>
                  <div className="relative">
                    {formData.discount_type === 'percentage' && (
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    )}
                    {formData.discount_type === 'fixed' && (
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    )}
                    <input
                      type="number"
                      min="1"
                      max={formData.discount_type === 'percentage' ? '100' : undefined}
                      placeholder={formData.discount_type === 'free_item' ? '1' : '0'}
                      className={`w-full h-11 ${formData.discount_type !== 'free_item' ? 'pl-10' : 'pl-4'} pr-4 border rounded-xl text-[14px] focus:outline-none focus:ring-2 transition-all ${
                        errors.discount_value && touched.discount_value
                          ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-stone-200 focus:ring-purple-500/20 focus:border-purple-500'
                      }`}
                      value={formData.discount_value}
                      onChange={(e) => handleFieldChange('discount_value', e.target.value)}
                      onBlur={() => handleFieldBlur('discount_value')}
                    />
                  </div>
                  {errors.discount_value && touched.discount_value && (
                    <p className="text-[12px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.discount_value}
                    </p>
                  )}
                </div>
              </div>

              {/* Validity Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-stone-700">
                    <Calendar className="w-4 h-4 text-stone-400" />
                    Valid From
                  </label>
                  <input
                    type="date"
                    className={`w-full h-11 px-4 border rounded-xl text-[14px] focus:outline-none focus:ring-2 transition-all ${
                      errors.valid_from && touched.valid_from
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-stone-200 focus:ring-purple-500/20 focus:border-purple-500'
                    }`}
                    value={formData.valid_from}
                    onChange={(e) => handleFieldChange('valid_from', e.target.value)}
                    onBlur={() => handleFieldBlur('valid_from')}
                  />
                  {errors.valid_from && touched.valid_from && (
                    <p className="text-[12px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.valid_from}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-stone-700">
                    <Calendar className="w-4 h-4 text-stone-400" />
                    Valid Until
                  </label>
                  <input
                    type="date"
                    className={`w-full h-11 px-4 border rounded-xl text-[14px] focus:outline-none focus:ring-2 transition-all ${
                      errors.valid_until && touched.valid_until
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-stone-200 focus:ring-purple-500/20 focus:border-purple-500'
                    }`}
                    value={formData.valid_until}
                    onChange={(e) => handleFieldChange('valid_until', e.target.value)}
                    onBlur={() => handleFieldBlur('valid_until')}
                  />
                  {errors.valid_until && touched.valid_until && (
                    <p className="text-[12px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.valid_until}
                    </p>
                  )}
                </div>
              </div>

              {/* Redemption Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-stone-700">Max Total Redemptions</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    className="w-full h-11 px-4 border border-stone-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    value={formData.max_redemptions}
                    onChange={(e) => handleFieldChange('max_redemptions', e.target.value)}
                  />
                  <p className="text-[11px] text-stone-500">Leave empty for unlimited</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-stone-700">Max Per User</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    className="w-full h-11 px-4 border border-stone-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    value={formData.max_per_user}
                    onChange={(e) => handleFieldChange('max_per_user', e.target.value)}
                  />
                </div>
              </div>

              {/* Image */}
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-stone-700">Offer Image (Optional)</label>
                <ImageUpload
                  value={formData.image_url}
                  onChange={(url) => handleFieldChange('image_url', url)}
                />
              </div>

              {/* Terms */}
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-stone-700">Terms & Conditions (Optional)</label>
                <textarea
                  placeholder="Add any terms or conditions..."
                  className="w-full h-20 px-4 py-3 border border-stone-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                  value={formData.terms}
                  onChange={(e) => handleFieldChange('terms', e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px]">
                {selectedPartner ? (
                  <span className="text-stone-600">
                    Offer will be sent to <span className="font-semibold text-stone-900">{selectedPartner.partner_name}</span> for approval
                  </span>
                ) : (
                  <span className="text-stone-500">Select a partner company</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-[14px] font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  disabled={!isValid || isSubmitting || activePartners.length === 0}
                  icon={<Save className="w-4 h-4" />}
                >
                  {initialData ? 'Save Changes' : 'Create Offer'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
