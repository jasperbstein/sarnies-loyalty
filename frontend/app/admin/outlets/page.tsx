'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Outlets</h2>
            <p className="text-gray-600 mt-1">Manage store locations</p>
          </div>
          <button
            onClick={() => {
              setEditingOutlet(null);
              resetForm();
              setShowForm(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add Outlet
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search outlets..."
              className="input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="input w-40"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="card bg-blue-50 border border-blue-200">
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
        <div className="card">
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
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Outlet Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Address
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Phone
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Hours
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOutlets.map((outlet) => (
                    <tr key={outlet.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <MapPin size={16} className="text-amber-600" />
                          </div>
                          <span className="font-medium text-gray-900">{outlet.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                        {outlet.address}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{outlet.phone || '-'}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleActive(outlet)}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            outlet.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {outlet.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
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
        <div className="grid grid-cols-3 gap-4">
          <div className="card bg-blue-50">
            <div className="text-3xl font-bold text-blue-600">{outlets.length}</div>
            <div className="text-sm text-blue-800">Total Outlets</div>
          </div>
          <div className="card bg-green-50">
            <div className="text-3xl font-bold text-green-600">
              {outlets.filter((o) => o.is_active).length}
            </div>
            <div className="text-sm text-green-800">Active</div>
          </div>
          <div className="card bg-red-50">
            <div className="text-3xl font-bold text-red-600">
              {outlets.filter((o) => !o.is_active).length}
            </div>
            <div className="text-sm text-red-800">Inactive</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
