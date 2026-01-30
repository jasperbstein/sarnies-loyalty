'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Users, Plus, Edit, X, Trash2, Search, CheckCircle, XCircle, Key, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface StaffUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  branch?: string;
  active: boolean;
  is_verified: boolean;
  verified_at?: string;
  company_id?: number;
  company_name?: string;
  created_at: string;
}

interface Outlet {
  id: number;
  name: string;
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [showResetPassword, setShowResetPassword] = useState<StaffUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'staff' as 'admin' | 'staff',
    branch: '',
  });

  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchStaff();
    fetchOutlets();
  }, [searchTerm, filterActive]);

  const fetchOutlets = async () => {
    try {
      const response = await api.get('/outlets');
      setOutlets(response.data || []);
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (filterActive !== 'all') params.is_active = filterActive === 'active';

      const response = await api.get('/staff', { params });
      setStaff(response.data.staff || []);
    } catch (error) {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingStaff) {
        await api.put(`/staff/${editingStaff.id}`, {
          name: formData.name,
          role: formData.role,
          branch: formData.branch || null,
        });
        toast.success('Staff updated successfully');
      } else {
        if (!formData.password) {
          toast.error('Password is required for new staff');
          return;
        }
        await api.post('/staff', formData);
        toast.success('Staff created successfully');
      }

      setShowForm(false);
      setEditingStaff(null);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save staff');
    }
  };

  const handleResetPassword = async () => {
    if (!showResetPassword || !newPassword) return;

    try {
      await api.post(`/staff/${showResetPassword.id}/reset-password`, {
        newPassword,
      });
      toast.success('Password reset successfully');
      setShowResetPassword(null);
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleToggleActive = async (staffUser: StaffUser) => {
    try {
      await api.put(`/staff/${staffUser.id}`, {
        active: !staffUser.active,
      });
      toast.success(staffUser.active ? 'Staff deactivated' : 'Staff activated');
      fetchStaff();
    } catch (error) {
      toast.error('Failed to update staff status');
    }
  };

  const handleDelete = async (staffUser: StaffUser) => {
    if (!confirm(`Are you sure you want to deactivate ${staffUser.name}?`)) return;

    try {
      await api.delete(`/staff/${staffUser.id}`);
      toast.success('Staff deactivated');
      fetchStaff();
    } catch (error) {
      toast.error('Failed to deactivate staff');
    }
  };

  const handleEdit = (staffUser: StaffUser) => {
    setEditingStaff(staffUser);
    setFormData({
      email: staffUser.email,
      password: '',
      name: staffUser.name,
      role: staffUser.role,
      branch: staffUser.branch || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'staff',
      branch: '',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
            <p className="text-gray-600 mt-1">Manage staff accounts and permissions</p>
          </div>
          <button
            onClick={() => {
              setEditingStaff(null);
              resetForm();
              setShowForm(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add Staff
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
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
                {editingStaff ? 'Edit Staff' : 'Add New Staff'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingStaff(null);
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
                    Email *
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!editingStaff}
                    required
                  />
                </div>

                {!editingStaff && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      className="input"
                      placeholder="Min 8 chars, uppercase, number"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    className="input"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' })}
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch / Location
                  </label>
                  <select
                    className="input"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  >
                    <option value="">Select branch</option>
                    {outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.name}>
                        {outlet.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary">
                  {editingStaff ? 'Update Staff' : 'Create Staff'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingStaff(null);
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

        {/* Reset Password Modal */}
        {showResetPassword && (
          <div className="card bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">
                Reset Password for {showResetPassword.name}
              </h3>
              <button
                onClick={() => {
                  setShowResetPassword(null);
                  setNewPassword('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="Min 8 chars, uppercase, number"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleResetPassword}
                  className="btn btn-primary"
                  disabled={!newPassword}
                >
                  Reset Password
                </button>
                <button
                  onClick={() => {
                    setShowResetPassword(null);
                    setNewPassword('');
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Staff List */}
        <div className="card">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>No staff members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Branch</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Verified</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Created</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((staffUser) => (
                    <tr key={staffUser.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{staffUser.name}</div>
                        {staffUser.company_name && (
                          <div className="text-xs text-gray-500">{staffUser.company_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{staffUser.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          staffUser.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {staffUser.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {staffUser.branch ? (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {staffUser.branch}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleActive(staffUser)}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            staffUser.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {staffUser.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {staffUser.is_verified ? (
                          <CheckCircle size={18} className="text-green-500" />
                        ) : (
                          <XCircle size={18} className="text-gray-300" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {formatDate(staffUser.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(staffUser)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setShowResetPassword(staffUser)}
                            className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                            title="Reset Password"
                          >
                            <Key size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(staffUser)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Deactivate"
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
        <div className="grid grid-cols-4 gap-4">
          <div className="card bg-blue-50">
            <div className="text-3xl font-bold text-blue-600">{staff.length}</div>
            <div className="text-sm text-blue-800">Total Staff</div>
          </div>
          <div className="card bg-green-50">
            <div className="text-3xl font-bold text-green-600">
              {staff.filter(s => s.active).length}
            </div>
            <div className="text-sm text-green-800">Active</div>
          </div>
          <div className="card bg-purple-50">
            <div className="text-3xl font-bold text-purple-600">
              {staff.filter(s => s.role === 'admin').length}
            </div>
            <div className="text-sm text-purple-800">Admins</div>
          </div>
          <div className="card bg-amber-50">
            <div className="text-3xl font-bold text-amber-600">
              {staff.filter(s => !s.is_verified).length}
            </div>
            <div className="text-sm text-amber-800">Pending Verification</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
