'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import '@/app/admin/admin.css';
import { Palette, Save, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Setting {
  value: any;
  type: string;
  description: string;
  editable: boolean;
}

interface Settings {
  [key: string]: Setting;
}

export default function AdminBrandingPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [editedSettings, setEditedSettings] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setEditedSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (Object.keys(editedSettings).length === 0) {
      toast.error('No changes to save');
      return;
    }

    setSaving(true);
    try {
      await api.put('/settings', { settings: editedSettings });
      toast.success('Branding settings updated successfully');
      setEditedSettings({});
      fetchSettings(); // Refresh
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEditedSettings({});
    toast.success('Changes reset');
  };

  const getCurrentValue = (key: string) => {
    return editedSettings[key] !== undefined
      ? editedSettings[key]
      : settings[key]?.value;
  };

  const hasChanges = Object.keys(editedSettings).length > 0;

  const renderInput = (key: string, setting: Setting) => {
    if (!setting.editable) {
      return (
        <input
          type="text"
          value={String(setting.value || '')}
          disabled
          className="input bg-gray-100 cursor-not-allowed"
        />
      );
    }

    const currentValue = getCurrentValue(key);

    switch (setting.type) {
      case 'color':
        return (
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={currentValue || '#000000'}
              onChange={(e) => handleChange(key, e.target.value)}
              className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={currentValue || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder="#000000"
              pattern="^#[0-9A-Fa-f]{6}$"
              className="input flex-1"
            />
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={currentValue === null || currentValue === undefined ? '' : currentValue}
            onChange={(e) => handleChange(key, e.target.value)}
            className="input"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(currentValue)}
              onChange={(e) => handleChange(key, e.target.checked)}
              className="w-5 h-5"
            />
            <span className="text-sm text-gray-700">
              {currentValue ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );

      case 'url':
        return (
          <input
            type="url"
            value={currentValue || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder="https://example.com/image.png"
            className="input"
          />
        );

      default: // string
        return (
          <input
            type="text"
            value={currentValue || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            className="input"
          />
        );
    }
  };

  const brandingCategories = {
    'Logo & Brand Identity': [
      'logo_url',
      'logo_alt_text',
      'app_name',
      'app_tagline',
    ],
    'Primary Colors': [
      'color_primary',
      'color_primary_dark',
      'color_primary_light',
    ],
    'Accent Colors': ['color_secondary', 'color_accent'],
    'Text Colors': ['color_text_primary', 'color_text_secondary'],
    'Background Colors': ['color_background', 'color_background_secondary'],
    'Button Styles': ['button_border_radius', 'button_font_weight'],
    'Card Styles': ['card_border_radius', 'card_shadow'],
    'Contact Information': ['contact_email', 'contact_phone'],
    'Points Configuration': [
      'points_per_100_thb',
      'points_multiplier_enabled',
    ],
  };

  return (
    <AdminLayout>
      <div className="admin-page admin-page-container space-y-6 animate-macos-fade">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#AF52DE] to-[#8944AB] flex items-center justify-center shadow-lg">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Branding & Customization</h1>
              <p className="text-[14px] text-[#86868b]">
                Customize your app's appearance, colors, and configuration
              </p>
            </div>
          </div>

          {hasChanges && (
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="h-10 px-4 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white text-[#1d1d1f] text-[14px] font-medium flex items-center gap-2 hover:bg-[rgba(0,0,0,0.02)] transition-colors"
                disabled={saving}
              >
                <RotateCcw size={18} />
                Reset
              </button>
              <button
                onClick={handleSave}
                className="admin-btn-primary"
                disabled={saving}
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="admin-card h-40 animate-pulse bg-[rgba(0,0,0,0.04)]" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(brandingCategories).map(([category, keys]) => (
              <div key={category} className="admin-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(175,82,222,0.12)] flex items-center justify-center">
                    <Palette size={20} className="text-[#AF52DE]" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#1d1d1f]">{category}</h3>
                </div>

                <div className="space-y-4">
                  {keys.map((key) => {
                    const setting = settings[key];
                    if (!setting) return null;

                    const hasChange = editedSettings[key] !== undefined;

                    return (
                      <div key={key} className={hasChange ? 'bg-blue-50 p-3 rounded-lg -mx-3' : ''}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {key
                                .split('_')
                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ')}
                              {hasChange && (
                                <span className="ml-2 text-xs text-blue-600">(modified)</span>
                              )}
                            </label>
                            <p className="text-xs text-gray-500">{setting.description}</p>
                          </div>

                          <div className="md:col-span-2">{renderInput(key, setting)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Preview Section */}
            <div className="admin-card p-6 bg-gradient-to-br from-[rgba(0,122,255,0.04)] to-[rgba(175,82,222,0.04)] border-[rgba(0,122,255,0.2)]">
              <h3 className="text-[16px] font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
                <Palette size={20} className="text-[#007AFF]" />
                Color Preview
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  'color_primary',
                  'color_primary_dark',
                  'color_primary_light',
                  'color_secondary',
                  'color_accent',
                  'color_background',
                  'color_text_primary',
                  'color_text_secondary',
                ].map((colorKey) => {
                  const color = getCurrentValue(colorKey);
                  return (
                    <div key={colorKey} className="text-center">
                      <div
                        className="w-full h-16 rounded-lg border-2 border-white shadow-sm mb-2"
                        style={{ backgroundColor: color || '#CCCCCC' }}
                      />
                      <p className="text-xs font-medium text-gray-700">
                        {colorKey.replace('color_', '').replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">{color || 'N/A'}</p>
                    </div>
                  );
                })}
              </div>

              {/* Button Preview */}
              <div className="mt-6 pt-6 border-t border-blue-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Button Preview</h4>
                <div className="flex gap-3 flex-wrap">
                  <button
                    style={{
                      backgroundColor: getCurrentValue('color_primary'),
                      color: '#FFFFFF',
                      borderRadius: `${getCurrentValue('button_border_radius') || 8}px`,
                      fontWeight: getCurrentValue('button_font_weight') || 600,
                      padding: '0.5rem 1rem',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Primary Button
                  </button>
                  <button
                    style={{
                      backgroundColor: getCurrentValue('color_secondary'),
                      color: '#FFFFFF',
                      borderRadius: `${getCurrentValue('button_border_radius') || 8}px`,
                      fontWeight: getCurrentValue('button_font_weight') || 600,
                      padding: '0.5rem 1rem',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Secondary Button
                  </button>
                  <button
                    style={{
                      backgroundColor: getCurrentValue('color_accent'),
                      color: '#FFFFFF',
                      borderRadius: `${getCurrentValue('button_border_radius') || 8}px`,
                      fontWeight: getCurrentValue('button_font_weight') || 600,
                      padding: '0.5rem 1rem',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Accent Button
                  </button>
                </div>
              </div>

              {/* Card Preview */}
              <div className="mt-6 pt-6 border-t border-blue-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Card Preview</h4>
                <div
                  style={{
                    backgroundColor: getCurrentValue('color_background'),
                    borderRadius: `${getCurrentValue('card_border_radius') || 12}px`,
                    boxShadow: getCurrentValue('card_shadow') || '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                    padding: '1.5rem',
                  }}
                >
                  <h5
                    style={{
                      color: getCurrentValue('color_text_primary'),
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                    }}
                  >
                    Sample Card Title
                  </h5>
                  <p
                    style={{
                      color: getCurrentValue('color_text_secondary'),
                      fontSize: '0.875rem',
                    }}
                  >
                    This is how cards will appear with your current branding settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
