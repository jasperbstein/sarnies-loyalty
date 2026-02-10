'use client';

import { useState, useMemo } from 'react';
import {
  X, Coffee, UtensilsCrossed, Percent, Gift, Briefcase, Sparkles,
  ArrowRight, ArrowLeft, Check, Image as ImageIcon, Users, Building2,
  Clock, Star, ChevronDown
} from 'lucide-react';
import ImageUpload from './ImageUpload';

// Template definitions
const TEMPLATES = [
  {
    id: 'free_drink',
    name: 'Free Drink',
    icon: Coffee,
    color: 'bg-amber-500',
    description: 'Coffee, tea, or any beverage',
    defaults: {
      category: 'drinks',
      voucher_type: 'free_item',
      target_user_types: ['customer'],
      points_required: 500,
      cash_value: 120,
      redemption_window: 'unlimited',
      titleSuggestions: ['Free Coffee', 'Free Latte', 'Free Any Drink', 'Complimentary Beverage'],
    }
  },
  {
    id: 'free_food',
    name: 'Free Food',
    icon: UtensilsCrossed,
    color: 'bg-orange-500',
    description: 'Meals, snacks, or pastries',
    defaults: {
      category: 'food',
      voucher_type: 'free_item',
      target_user_types: ['customer'],
      points_required: 1000,
      cash_value: 200,
      redemption_window: 'unlimited',
      titleSuggestions: ['Free Pastry', 'Free Sandwich', 'Free Breakfast', 'Complimentary Meal'],
    }
  },
  {
    id: 'discount',
    name: 'Discount',
    icon: Percent,
    color: 'bg-green-500',
    description: 'Percentage or fixed amount off',
    defaults: {
      category: 'discounts',
      voucher_type: 'discount_amount',
      target_user_types: ['customer'],
      points_required: 300,
      cash_value: 50,
      redemption_window: 'unlimited',
      titleSuggestions: ['10% Off', '50 THB Off', '20% Discount', 'Special Discount'],
    }
  },
  {
    id: 'birthday',
    name: 'Birthday Treat',
    icon: Gift,
    color: 'bg-pink-500',
    description: 'Special birthday rewards',
    defaults: {
      category: 'promotions',
      voucher_type: 'free_item',
      target_user_types: ['customer', 'employee'],
      points_required: 0,
      cash_value: 150,
      redemption_window: 'once_per_month',
      expiry_days: 7,
      titleSuggestions: ['Birthday Free Drink', 'Birthday Treat', 'Happy Birthday Gift', 'Birthday Special'],
    }
  },
  {
    id: 'employee_daily',
    name: 'Employee Daily',
    icon: Briefcase,
    color: 'bg-blue-500',
    description: 'Daily perks for staff',
    defaults: {
      category: 'food',
      voucher_type: 'free_item',
      target_user_types: ['employee'],
      points_required: 0,
      cash_value: 100,
      redemption_window: 'once_per_day',
      titleSuggestions: ['Daily Coffee', 'Staff Meal', 'Daily Drink', 'Employee Lunch'],
    }
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: Sparkles,
    color: 'bg-purple-500',
    description: 'Build from scratch',
    defaults: {
      category: '',
      voucher_type: 'free_item',
      target_user_types: ['customer'],
      points_required: 0,
      cash_value: 0,
      redemption_window: 'unlimited',
      titleSuggestions: [],
    }
  },
];

interface VoucherWizardProps {
  companies: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

type Step = 'template' | 'details' | 'availability';

export default function VoucherWizard({ companies, onSubmit, onCancel, isSubmitting }: VoucherWizardProps) {
  const [step, setStep] = useState<Step>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    voucher_type: 'free_item',
    points_required: 0,
    cash_value: 0,
    is_active: true,
    is_featured: false,
    target_user_types: ['customer'],
    image_url: '',
    redemption_window: 'unlimited',
    is_company_exclusive: false,
    allowed_company_ids: [] as number[],
    expiry_type: 'no_expiry',
    expiry_days: '',
    expires_at: '',
  });

  const template = TEMPLATES.find(t => t.id === selectedTemplate);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      setFormData(prev => ({
        ...prev,
        category: tmpl.defaults.category,
        voucher_type: tmpl.defaults.voucher_type,
        target_user_types: tmpl.defaults.target_user_types,
        points_required: tmpl.defaults.points_required,
        cash_value: tmpl.defaults.cash_value,
        redemption_window: tmpl.defaults.redemption_window,
        expiry_days: tmpl.defaults.expiry_days?.toString() || '',
      }));
    }
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'details') setStep('template');
    if (step === 'availability') setStep('details');
  };

  const handleNext = () => {
    if (step === 'details') setStep('availability');
    if (step === 'availability') {
      onSubmit(formData);
    }
  };

  const canProceed = () => {
    if (step === 'details') {
      return formData.title.length >= 3 && formData.category;
    }
    if (step === 'availability') {
      return formData.target_user_types.length > 0;
    }
    return true;
  };

  const filteredCompanies = useMemo(() => {
    return Array.isArray(companies) ? companies.filter(c => c.is_active) : [];
  }, [companies]);

  const toggleCompany = (companyId: number) => {
    setFormData(prev => ({
      ...prev,
      allowed_company_ids: prev.allowed_company_ids.includes(companyId)
        ? prev.allowed_company_ids.filter(id => id !== companyId)
        : [...prev.allowed_company_ids, companyId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 md:p-6">
      <div className="w-full max-w-lg my-4 md:my-8 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50">
            <div className="flex items-center gap-3">
              {template && (
                <div className={`w-10 h-10 rounded-xl ${template.color} flex items-center justify-center`}>
                  <template.icon size={20} className="text-white" />
                </div>
              )}
              {!template && (
                <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  {step === 'template' && 'Create Voucher'}
                  {step === 'details' && (template?.name || 'Voucher Details')}
                  {step === 'availability' && 'Who Can Use It?'}
                </h2>
                <p className="text-xs text-stone-500">
                  {step === 'template' && 'Choose a template to get started'}
                  {step === 'details' && 'Customize your voucher'}
                  {step === 'availability' && 'Set access and limits'}
                </p>
              </div>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-stone-200 rounded-lg transition-colors">
              <X size={18} className="text-stone-500" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="px-5 py-3 bg-white border-b border-stone-100">
            <div className="flex items-center gap-2">
              {(['template', 'details', 'availability'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    step === s ? 'bg-stone-900 text-white' :
                    (['template', 'details', 'availability'].indexOf(step) > i) ? 'bg-green-500 text-white' :
                    'bg-stone-200 text-stone-500'
                  }`}>
                    {(['template', 'details', 'availability'].indexOf(step) > i) ? <Check size={12} /> : i + 1}
                  </div>
                  {i < 2 && <div className={`flex-1 h-0.5 ${(['template', 'details', 'availability'].indexOf(step) > i) ? 'bg-green-500' : 'bg-stone-200'}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-stone-500">Template</span>
              <span className="text-[10px] text-stone-500">Details</span>
              <span className="text-[10px] text-stone-500">Access</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Template Selection */}
            {step === 'template' && (
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATES.map((tmpl) => {
                  const Icon = tmpl.icon;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => handleTemplateSelect(tmpl.id)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-all text-center group"
                    >
                      <div className={`w-12 h-12 rounded-xl ${tmpl.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-stone-900 text-sm">{tmpl.name}</p>
                        <p className="text-xs text-stone-500 mt-0.5">{tmpl.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 2: Details */}
            {step === 'details' && template && (
              <div className="space-y-4">
                {/* Title with suggestions */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Voucher Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter voucher name..."
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900"
                  />
                  {template.defaults.titleSuggestions.length > 0 && !formData.title && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {template.defaults.titleSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setFormData({ ...formData, title: suggestion })}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-full text-xs text-stone-600 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Description <span className="text-stone-400">(optional)</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add a short description..."
                    rows={2}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 resize-none"
                  />
                </div>

                {/* Points & Value Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Points Cost
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={formData.points_required}
                        onChange={(e) => setFormData({ ...formData, points_required: Number(e.target.value) })}
                        className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900"
                      />
                      {formData.points_required === 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium">FREE</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Value (THB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cash_value}
                      onChange={(e) => setFormData({ ...formData, cash_value: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900"
                    />
                  </div>
                </div>

                {/* Category (for custom template) */}
                {selectedTemplate === 'custom' && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 bg-white"
                    >
                      <option value="">Select category...</option>
                      <option value="drinks">Drinks</option>
                      <option value="food">Food</option>
                      <option value="discounts">Discounts</option>
                      <option value="merchandise">Merchandise</option>
                      <option value="promotions">Promotions</option>
                    </select>
                  </div>
                )}

                {/* Image Upload */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Image <span className="text-stone-400">(optional)</span>
                  </label>
                  <ImageUpload
                    value={formData.image_url}
                    onChange={(url) => setFormData({ ...formData, image_url: url })}
                    onRemove={() => setFormData({ ...formData, image_url: '' })}
                  />
                </div>

                {/* Featured Toggle */}
                <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${formData.is_featured ? 'bg-amber-500' : 'bg-stone-300'}`}>
                    <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-transform ${formData.is_featured ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-900 flex items-center gap-1.5">
                      <Star size={14} className={formData.is_featured ? 'text-amber-500 fill-current' : 'text-stone-400'} />
                      Featured Voucher
                    </p>
                    <p className="text-xs text-stone-500">Show prominently on home page</p>
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  />
                </label>
              </div>
            )}

            {/* Step 3: Availability */}
            {step === 'availability' && (
              <div className="space-y-4">
                {/* Who can use it */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-2">
                    Who can redeem this? <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'customer', label: 'Customers', icon: Users },
                      { value: 'employee', label: 'Employees', icon: Briefcase },
                    ].map((type) => {
                      const Icon = type.icon;
                      const isSelected = formData.target_user_types.includes(type.value);
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              target_user_types: isSelected
                                ? prev.target_user_types.filter(t => t !== type.value)
                                : [...prev.target_user_types, type.value]
                            }));
                          }}
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-stone-900 bg-stone-900 text-white'
                              : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <Icon size={18} />
                          <span className="text-sm font-medium">{type.label}</span>
                          {isSelected && <Check size={16} className="ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Company Exclusive */}
                <div className="border border-stone-200 rounded-lg overflow-hidden">
                  <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-stone-50 transition-colors">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      formData.is_company_exclusive ? 'bg-stone-900 border-stone-900' : 'border-stone-300'
                    }`}>
                      {formData.is_company_exclusive && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900 flex items-center gap-1.5">
                        <Building2 size={14} />
                        Company Exclusive
                      </p>
                      <p className="text-xs text-stone-500">Only for selected company members</p>
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={formData.is_company_exclusive}
                      onChange={(e) => setFormData({ ...formData, is_company_exclusive: e.target.checked, allowed_company_ids: [] })}
                    />
                  </label>

                  {formData.is_company_exclusive && filteredCompanies.length > 0 && (
                    <div className="border-t border-stone-200 p-3 bg-stone-50 max-h-40 overflow-y-auto">
                      <div className="space-y-1.5">
                        {filteredCompanies.map((company) => (
                          <button
                            key={company.id}
                            type="button"
                            onClick={() => toggleCompany(company.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                              formData.allowed_company_ids.includes(company.id)
                                ? 'bg-stone-900 text-white'
                                : 'bg-white border border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <Building2 size={14} />
                            <span className="flex-1 text-left">{company.name}</span>
                            {formData.allowed_company_ids.includes(company.id) && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Redemption Limit */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    <Clock size={12} className="inline mr-1" />
                    How often can it be used?
                  </label>
                  <select
                    value={formData.redemption_window}
                    onChange={(e) => setFormData({ ...formData, redemption_window: e.target.value })}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 bg-white"
                  >
                    <option value="unlimited">Unlimited</option>
                    <option value="once_per_day">Once per day</option>
                    <option value="once_per_week">Once per week</option>
                    <option value="once_per_month">Once per month</option>
                  </select>
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Expiration <span className="text-stone-400">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-stone-200 bg-stone-50">
            {step !== 'template' ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <div />
            )}

            {step !== 'template' && (
              <button
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : step === 'availability' ? (
                  <>
                    Create Voucher
                    <Check size={16} />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
