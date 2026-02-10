'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Modal from '@/components/Modal';
import Button from '@/components/ui/Button';
import { settingsAPI, transactionsAPI } from '@/lib/api';
import { Settings as SettingsIcon, Edit2, Save, X, Database, Users, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

interface Setting {
  value: any;
  type: string;
  description: string;
  editable: boolean;
}

interface EditModalState {
  isOpen: boolean;
  key: string;
  currentValue: any;
  type: string;
  description: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<{ [key: string]: Setting }>({});
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    key: '',
    currentValue: '',
    type: '',
    description: '',
  });
  const [editValue, setEditValue] = useState<any>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchSystemStats();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await settingsAPI.getAll();
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const txResponse = await transactionsAPI.getAll({ limit: 1 });
      // Stats are typically available from dashboard or we can compute them
      setSystemStats({
        totalTransactions: txResponse.data.total || 0,
        totalUsers: 0, // Would need a stats endpoint
        totalVouchers: 0, // Would need a stats endpoint
      });
    } catch (error) {
      console.error('Failed to load system stats:', error);
    }
  };

  const openEditModal = (key: string, setting: Setting) => {
    if (!setting.editable) {
      toast.error('This setting is not editable');
      return;
    }

    setEditModal({
      isOpen: true,
      key,
      currentValue: setting.value,
      type: setting.type,
      description: setting.description,
    });
    setEditValue(setting.value);
  };

  const closeEditModal = () => {
    setEditModal({
      isOpen: false,
      key: '',
      currentValue: '',
      type: '',
      description: '',
    });
    setEditValue('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update(editModal.key, editValue);
      toast.success('Setting updated successfully');
      await fetchSettings();
      closeEditModal();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const renderEditInput = () => {
    switch (editModal.type) {
      case 'number':
        return (
          <input
            type="number"
            className="input"
            value={editValue}
            onChange={(e) => setEditValue(parseFloat(e.target.value))}
            step="any"
          />
        );
      case 'boolean':
        return (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setEditValue(true)}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                editValue === true
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Enabled
            </button>
            <button
              onClick={() => setEditValue(false)}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                editValue === false
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Disabled
            </button>
          </div>
        );
      case 'color':
        return (
          <div className="space-y-3">
            <input
              type="color"
              className="w-full h-12 rounded-lg cursor-pointer"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
            <input
              type="text"
              className="input font-mono"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="#000000"
            />
          </div>
        );
      default:
        return (
          <input
            type="text"
            className="input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
        );
    }
  };

  const renderSettingValue = (value: any, type: string) => {
    if (type === 'boolean') {
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Enabled' : 'Disabled'}
        </span>
      );
    }
    if (type === 'color') {
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border-2 border-gray-300"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-sm text-gray-700">{value}</span>
        </div>
      );
    }
    if (type === 'number') {
      return <span className="font-semibold text-gray-900">{value}</span>;
    }
    return <span className="text-gray-700">{value || '(not set)'}</span>;
  };

  const prioritySettings = ['points_per_100_thb'];
  const securitySettings = ['qr_validity_minutes', 'otp_validity_minutes'];

  return (
    <AdminLayout>
      <div className="px-6 py-6 space-y-6">
        {/* Page Header - Master List: display-xl, label subtitle */}
        <div>
          <h1 className="font-display text-display-xl text-neutral-900 tracking-tight">System Settings</h1>
          <p className="font-ui text-label text-neutral-500 mt-1">
            Configure loyalty program parameters and system behavior
          </p>
        </div>

        {/* Points Configuration Card - Master List: shadow-card, rounded-xl, p-6, border-neutral-100 */}
        <div className="bg-white rounded-xl shadow-card border border-neutral-100">
          <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-primary-light rounded-lg flex items-center justify-center">
                <SettingsIcon size={20} className="text-[#8B6914]" />
              </div>
              <div>
                <h2 className="font-ui text-section font-semibold text-neutral-900">Points Configuration</h2>
                <p className="font-ui text-label text-neutral-500">Loyalty points earning rules</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="space-y-3">
                <div className="h-16 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : (
              <div className="space-y-4">
                {prioritySettings.map((key) => {
                  const setting = settings[key];
                  if (!setting) return null;

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-ui text-body font-semibold text-neutral-900">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                        <p className="font-ui text-label text-neutral-500 mt-1">{setting.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {renderSettingValue(setting.value, setting.type)}
                        </div>
                        {setting.editable && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Edit2 size={16} />}
                            onClick={() => openEditModal(key, setting)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Security Settings Card - Master List styling */}
        <div className="bg-white rounded-xl shadow-card border border-neutral-100">
          <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E8F3EC] rounded-lg flex items-center justify-center">
                <Database size={20} className="text-[#3CB179]" />
              </div>
              <div>
                <h2 className="font-ui text-section font-semibold text-neutral-900">Security Settings</h2>
                <p className="font-ui text-label text-neutral-500">QR codes and authentication</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center py-8 text-neutral-500">
              <p className="font-ui text-body">Security settings will be configurable here</p>
              <p className="font-ui text-label mt-2">(QR validity, OTP validity, etc.)</p>
            </div>
          </div>
        </div>

        {/* System Information Card - Master List styling */}
        <div className="bg-white rounded-xl shadow-card border border-neutral-100">
          <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D7E7FF] rounded-lg flex items-center justify-center">
                <Database size={20} className="text-[#3788FF]" />
              </div>
              <div>
                <h2 className="font-ui text-section font-semibold text-neutral-900">System Information</h2>
                <p className="font-ui text-label text-neutral-500">Platform statistics and metadata</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <Users size={32} className="mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {systemStats?.totalUsers || '-'}
                </p>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <Receipt size={32} className="mx-auto text-green-600 mb-2" />
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {systemStats?.totalTransactions || '-'}
                </p>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-lg">
                <SettingsIcon size={32} className="mx-auto text-purple-600 mb-2" />
                <p className="text-sm text-gray-600">App Version</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">v1.0.0</p>
              </div>
            </div>
          </div>
        </div>

        {/* All Settings (Collapsed) - Master List styling */}
        <details className="bg-white rounded-xl shadow-card border border-neutral-100">
          <summary className="px-6 py-4 cursor-pointer hover:bg-neutral-50 font-ui text-body font-semibold text-neutral-900 transition-all duration-100">
            Advanced Settings (All)
          </summary>
          <div className="px-6 py-4 border-t border-neutral-100">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(settings)
                  .filter(([key]) => !prioritySettings.includes(key) && !securitySettings.includes(key))
                  .map(([key, setting]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 font-mono text-sm">{key}</p>
                        <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {renderSettingValue(setting.value, setting.type)}
                        </div>
                        {setting.editable && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Edit2 size={16} />}
                            onClick={() => openEditModal(key, setting)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </details>
      </div>

      {/* Edit Setting Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={closeEditModal}
        title="Edit Setting"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Setting Key
            </label>
            <p className="text-sm font-mono bg-gray-100 px-3 py-2 rounded-lg text-gray-700">
              {editModal.key}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <p className="text-sm text-gray-600">{editModal.description}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Current Value
            </label>
            <p className="text-sm bg-gray-100 px-3 py-2 rounded-lg text-gray-700">
              {String(editModal.currentValue)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              New Value
            </label>
            {renderEditInput()}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={closeEditModal}
              className="flex-1"
              icon={<X size={16} />}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              className="flex-1"
              icon={<Save size={16} />}
              loading={saving}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
