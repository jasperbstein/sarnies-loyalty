'use client';

import { useState } from 'react';
import Button from './ui/Button';
import ImageUpload from './ImageUpload';
import { X, Save, Megaphone, Users, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AnnouncementFormProps {
  announcement?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function AnnouncementForm({ announcement, onSubmit, onCancel, isSubmitting }: AnnouncementFormProps) {
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    description: announcement?.description || '',
    announcement_type: announcement?.announcement_type || 'news',
    image_url: announcement?.image_url || '',
    cta_text: announcement?.cta_text || '',
    cta_link: announcement?.cta_link || '',
    is_active: announcement?.is_active ?? true,
    display_order: announcement?.display_order || 0,
    target_user_types: announcement?.target_user_types || ['customer', 'employee'],
    start_date: announcement?.start_date ? announcement.start_date.split('T')[0] : '',
    end_date: announcement?.end_date ? announcement.end_date.split('T')[0] : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: any) => {
    switch (field) {
      case 'title':
        if (!value || value.trim().length === 0) return 'Title is required';
        if (value.length < 3) return 'Title must be at least 3 characters';
        if (value.length > 200) return 'Title must be less than 200 characters';
        break;
      case 'display_order':
        if (value !== '' && value < 0) return 'Display order must be non-negative';
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

  const isValid = formData.title.length >= 3;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-start justify-center p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl my-8 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white rounded-2xl shadow-2xl border border-border-subtle overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-gradient-to-b from-background-subtle to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-sm">
                <Megaphone size={20} className="text-white" />
              </div>
              <div>
                <h2 className="font-display text-display-md text-text-primary tracking-tight">
                  {announcement ? 'Edit Announcement' : 'Create Announcement'}
                </h2>
                <p className="font-ui text-ui-xs text-text-secondary mt-0.5">
                  {announcement ? 'Update announcement details' : 'Share news with your users'}
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
                  {formData.is_active ? 'Active' : 'Draft'}
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
            {/* Basic Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Megaphone size={16} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="font-display text-[15px] font-bold text-text-primary leading-none">Basic Information</h3>
              </div>

              <div className="space-y-3 pl-9">
                <div>
                  <label className="flex items-center justify-between font-ui text-[12px] font-semibold text-text-primary mb-1.5 leading-tight">
                    <span>Title <span className="text-danger-500">*</span></span>
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
                        : 'border-border-subtle focus:ring-purple-500/20 focus:border-purple-500'
                    }`}
                    value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    onBlur={() => handleFieldBlur('title')}
                    placeholder="e.g., New Menu Items Available"
                    required
                  />
                  {errors.title && touched.title && (
                    <p className="font-ui text-[11px] text-danger-600 mt-1 flex items-center gap-1 leading-tight">
                      <AlertCircle size={11} strokeWidth={2.5} /> {errors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-ui text-[12px] font-medium text-text-primary mb-1.5 leading-tight">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[13px] text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 transition-all leading-tight resize-none"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Describe the announcement..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-ui text-[12px] font-medium text-text-primary mb-1.5 leading-tight">
                      Type
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[13px] text-text-primary focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white leading-tight"
                      value={formData.announcement_type}
                      onChange={(e) => handleFieldChange('announcement_type', e.target.value)}
                    >
                      <option value="news">News</option>
                      <option value="promotion">Promotion</option>
                      <option value="event">Event</option>
                      <option value="alert">Alert</option>
                      <option value="update">Update</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-ui text-[12px] font-medium text-text-primary mb-1.5 leading-tight">
                      Display Order
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[13px] text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 transition-all leading-tight"
                      value={formData.display_order}
                      onChange={(e) => handleFieldChange('display_order', e.target.value)}
                      placeholder="0"
                    />
                    <p className="font-ui text-[10px] text-text-tertiary mt-1 leading-tight">
                      Lower numbers appear first
                    </p>
                  </div>
                </div>

                <div>
                  <ImageUpload
                    label="Announcement Image"
                    value={formData.image_url}
                    onChange={(url) => handleFieldChange('image_url', url)}
                    onRemove={() => handleFieldChange('image_url', '')}
                  />
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Users size={16} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="font-display text-[15px] font-bold text-text-primary leading-none">Call to Action</h3>
                <span className="font-ui text-[11px] text-text-tertiary">(optional)</span>
              </div>

              <div className="space-y-3 pl-9">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-ui text-[12px] font-medium text-text-primary mb-1.5 leading-tight">
                      Button Text
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[13px] text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 transition-all leading-tight"
                      value={formData.cta_text}
                      onChange={(e) => handleFieldChange('cta_text', e.target.value)}
                      placeholder="Learn More"
                    />
                  </div>

                  <div>
                    <label className="block font-ui text-[12px] font-medium text-text-primary mb-1.5 leading-tight">
                      Button Link
                    </label>
                    <input
                      type="url"
                      className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[13px] text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 transition-all leading-tight"
                      value={formData.cta_link}
                      onChange={(e) => handleFieldChange('cta_link', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Targeting & Schedule */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Calendar size={16} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="font-display text-[15px] font-bold text-text-primary leading-none">Targeting & Schedule</h3>
              </div>

              <div className="space-y-3 pl-9">
                <div>
                  <label className="block font-ui text-[12px] font-semibold text-text-primary mb-1.5 leading-tight">Who can see this?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'customer', label: 'Customers' },
                      { value: 'employee', label: 'Staff' },
                      { value: 'investor', label: 'Investors' },
                      { value: 'media', label: 'Media' },
                    ].map((type) => {
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
                          className={`px-2 py-2.5 rounded-lg border transition-all font-ui text-[11px] font-semibold ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-border-subtle bg-white text-text-secondary hover:border-purple-300'
                          }`}
                        >
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-ui text-[12px] font-medium text-text-primary mb-1.5 leading-tight">
                      Start Date <span className="font-ui text-[11px] text-text-tertiary">(optional)</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[12px] text-text-primary focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 transition-all leading-tight"
                      value={formData.start_date}
                      onChange={(e) => handleFieldChange('start_date', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-ui text-[12px] font-medium text-text-primary mb-1.5 leading-tight">
                      End Date <span className="font-ui text-[11px] text-text-tertiary">(optional)</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-border-subtle rounded-lg font-ui text-[12px] text-text-primary focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 transition-all leading-tight"
                      value={formData.end_date}
                      onChange={(e) => handleFieldChange('end_date', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
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
                  className="px-4 py-2 bg-purple-600 text-white font-ui text-[13px] font-bold rounded-lg hover:bg-purple-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 leading-none"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} strokeWidth={2} />
                      {announcement ? 'Update' : 'Create'}
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
