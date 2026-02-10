'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import '@/app/admin/admin.css';
import { MapPin, Plus, Edit, X, Trash2, Search, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Outlet {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  opening_hours?: string;
  is_active: boolean;
  notification_radius_meters: number;
  created_at: string;
}

export default function AdminOutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    phone: '',
    opening_hours: '',
    notification_radius_meters: '500',
  });

  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      const response = await api.get('/outlets/admin/all');
      setOutlets(response.data || []);
    } catch (error) {
      // Fallback to public endpoint if admin endpoint doesn't exist
      try {
        const response = await api.get('/outlets');
        setOutlets(response.data || []);
      } catch {
        toast.error('Failed to load outlets');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.address || !formData.latitude || !formData.longitude) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        notification_radius_meters: parseInt(formData.notification_radius_meters),
      };

      if (editingOutlet) {
        await api.put(`/outlets/${editingOutlet.id}`, payload);
        toast.success('Outlet updated successfully');
      } else {
        await api.post('/outlets', payload);
        toast.success('Outlet created successfully');
      }

      setShowForm(false);
      setEditingOutlet(null);
      resetForm();
      fetchOutlets();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save outlet');
    }
  };

  const handleToggleActive = async (outlet: Outlet) => {
    try {
      await api.put(`/outlets/${outlet.id}`, {
        is_active: !outlet.is_active,
      });
      toast.success(outlet.is_active ? 'Outlet deactivated' : 'Outlet activated');
      fetchOutlets();
    } catch (error) {
      toast.error('Failed to update outlet status');
    }
  };

  const handleDelete = async (outlet: Outlet) => {
    if (!confirm(`Are you sure you want to delete ${outlet.name}?`)) return;

    try {
      await api.delete(`/outlets/${outlet.id}`);
      toast.success('Outlet deleted');
      fetchOutlets();
    } catch (error) {
      toast.error('Failed to delete outlet');
    }
  };

  const handleEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setFormData({
      name: outlet.name,
      address: outlet.address,
      latitude: String(outlet.latitude),
      longitude: String(outlet.longitude),
      phone: outlet.phone || '',
      opening_hours: outlet.opening_hours || '',
      notification_radius_meters: String(outlet.notification_radius_meters),
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      phone: '',
      opening_hours: '',
      notification_radius_meters: '500',
    });
  };

  const filteredOutlets = outlets.filter((outlet) => {
    const matchesSearch =
      outlet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      outlet.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterActive === 'all' ||
      (filterActive === 'active' && outlet.is_active) ||
      (filterActive === 'inactive' && !outlet.is_active);
    return matchesSearch && matchesFilter;
  });

  return (
    <AdminLayout>
      <div className="min-h-screen admin-page animate-macos-fade">
        <div className="admin-page-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF9F0A] to-[#FF6B00] flex items-center justify-center shadow-lg">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Outlets</h1>
              <p className="text-[14px] text-[#86868b] mt-0.5">Manage store locations</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingOutlet(null);
              resetForm();
              setShowForm(true);
            }}
            className="admin-btn-primary h-[40px] px-5 flex items-center gap-2"
          >
            <Plus size={18} />
            Add Outlet
          </button>
        </div>

        {/* Filters */}
        <div className="admin-card p-4 mb-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
              <input
                type="text"
                placeholder="Search outlets..."
                className="w-full h-[40px] pl-10 pr-4 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="admin-select w-40"
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="admin-card mb-6 bg-[rgba(0,122,255,0.04)] border border-[rgba(0,122,255,0.1)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">
                {editingOutlet ? 'Edit Outlet' : 'Add New Outlet'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingOutlet(null);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Outlet Name *
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Sarnies Sukhumvit"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="+66 2 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Full street address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="input"
                    placeholder="e.g., 13.736717"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="input"
                    placeholder="e.g., 100.571159"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Hours
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Mon-Sun: 7:00-22:00"
                    value={formData.opening_hours}
                    onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Radius (meters)
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="500"
                    value={formData.notification_radius_meters}
                    onChange={(e) =>
                      setFormData({ ...formData, notification_radius_meters: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary">
                  {editingOutlet ? 'Update Outlet' : 'Create Outlet'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingOutlet(null);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Outlets List */}
        <div className="admin-card overflow-hidden">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : filteredOutlets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin size={48} className="mx-auto mb-4 opacity-50" />
              <p>No outlets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.06)] bg-[rgba(246,246,246,0.6)]">
                    <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
                      Outlet Name
                    </th>
                    <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
                      Address
                    </th>
                    <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
                      Phone
                    </th>
                    <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
                      Hours
                    </th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOutlets.map((outlet) => (
                    <tr key={outlet.id} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[rgba(0,0,0,0.02)] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[rgba(255,159,10,0.12)] flex items-center justify-center">
                            <MapPin size={16} className="text-[#FF9F0A]" />
                          </div>
                          <span className="text-[14px] font-medium text-[#1d1d1f]">{outlet.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[14px] text-[#636366] max-w-xs truncate">
                        {outlet.address}
                      </td>
                      <td className="py-3 px-4 text-[14px] text-[#636366]">{outlet.phone || '-'}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleActive(outlet)}
                          className={`admin-badge cursor-pointer ${
                            outlet.is_active
                              ? 'admin-badge-success'
                              : 'admin-badge-error'
                          }`}
                        >
                          {outlet.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-[13px] text-[#86868b]">
                        {outlet.opening_hours || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(outlet)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(outlet)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="admin-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(0,122,255,0.12)] flex items-center justify-center">
                <MapPin size={20} className="text-[#007AFF]" />
              </div>
              <div>
                <div className="text-[24px] font-bold text-[#1d1d1f]">{outlets.length}</div>
                <div className="text-[12px] text-[#86868b]">Total Outlets</div>
              </div>
            </div>
          </div>
          <div className="admin-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(52,199,89,0.12)] flex items-center justify-center">
                <CheckCircle size={20} className="text-[#34C759]" />
              </div>
              <div>
                <div className="text-[24px] font-bold text-[#1d1d1f]">{outlets.filter((o) => o.is_active).length}</div>
                <div className="text-[12px] text-[#86868b]">Active</div>
              </div>
            </div>
          </div>
          <div className="admin-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(255,69,58,0.12)] flex items-center justify-center">
                <XCircle size={20} className="text-[#FF453A]" />
              </div>
              <div>
                <div className="text-[24px] font-bold text-[#1d1d1f]">{outlets.filter((o) => !o.is_active).length}</div>
                <div className="text-[12px] text-[#86868b]">Inactive</div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </AdminLayout>
  );
}
