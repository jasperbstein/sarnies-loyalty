'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Search, Megaphone, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { announcementsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import AnnouncementForm from '@/components/AnnouncementForm';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await announcementsAPI.getAllAdmin();
      setAnnouncements(response.data || []);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (data: any) => {
    setIsSubmitting(true);
    try {
      await announcementsAPI.create(data);
      toast.success('Announcement created successfully');
      setShowCreateModal(false);
      fetchAnnouncements();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAnnouncement = (announcement: any) => {
    setEditingAnnouncement(announcement);
    setShowEditModal(true);
  };

  const handleUpdateAnnouncement = async (data: any) => {
    if (!editingAnnouncement) return;

    setIsSubmitting(true);
    try {
      await announcementsAPI.update(editingAnnouncement.id, data);
      toast.success('Announcement updated successfully');
      setShowEditModal(false);
      setEditingAnnouncement(null);
      fetchAnnouncements();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (announcement: any) => {
    try {
      await announcementsAPI.update(announcement.id, { is_active: !announcement.is_active });
      toast.success(`Announcement ${!announcement.is_active ? 'activated' : 'deactivated'}`);
      fetchAnnouncements();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update announcement');
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) return;

    try {
      await announcementsAPI.delete(id);
      toast.success('Announcement deleted successfully');
      fetchAnnouncements();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete announcement');
    }
  };

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
                           (a.description && a.description.toLowerCase().includes(search.toLowerCase()));
      const matchesType = typeFilter === 'all' || a.announcement_type === typeFilter;
      const matchesStatus = statusFilter === 'all' ||
                           (statusFilter === 'active' && a.is_active) ||
                           (statusFilter === 'inactive' && !a.is_active);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [announcements, search, typeFilter, statusFilter]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      news: 'bg-blue-100 text-blue-700',
      promotion: 'bg-green-100 text-green-700',
      event: 'bg-purple-100 text-purple-700',
      alert: 'bg-red-100 text-red-700',
      update: 'bg-orange-100 text-orange-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-[1600px] mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[28px] font-semibold text-neutral-900">Announcements</h1>
              <p className="text-[14px] text-neutral-500">{announcements.length} total announcements</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="h-[40px] px-4 rounded-lg border border-neutral-900 bg-neutral-900 text-white text-[14px] font-medium flex items-center gap-2 hover:bg-neutral-800 transition-colors"
            >
              <Plus size={18} />
              Create Announcement
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search announcements..."
                  className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Type Filter */}
              <select
                className="px-3 py-2 border border-neutral-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="news">News</option>
                <option value="promotion">Promotion</option>
                <option value="event">Event</option>
                <option value="alert">Alert</option>
                <option value="update">Update</option>
              </select>

              {/* Status Filter */}
              <select
                className="px-3 py-2 border border-neutral-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Announcements Table */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto" />
                <p className="mt-4 text-[14px] text-neutral-500">Loading announcements...</p>
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="p-12 text-center">
                <Megaphone size={48} className="mx-auto text-neutral-300 mb-4" />
                <h3 className="text-[16px] font-semibold text-neutral-900 mb-1">No announcements found</h3>
                <p className="text-[14px] text-neutral-500">
                  {search || typeFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first announcement to get started'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50">
                      <th className="px-4 py-3 text-left text-[12px] font-semibold text-neutral-600 uppercase tracking-wide">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold text-neutral-600 uppercase tracking-wide">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold text-neutral-600 uppercase tracking-wide">
                        Target
                      </th>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold text-neutral-600 uppercase tracking-wide">
                        Start Date
                      </th>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold text-neutral-600 uppercase tracking-wide">
                        End Date
                      </th>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold text-neutral-600 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-[12px] font-semibold text-neutral-600 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAnnouncements.map((announcement) => (
                      <tr key={announcement.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            {announcement.image_url && (
                              <img
                                src={announcement.image_url}
                                alt={announcement.title}
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-[14px] font-medium text-neutral-900 truncate">{announcement.title}</p>
                              {announcement.description && (
                                <p className="text-[12px] text-neutral-500 truncate mt-0.5">{announcement.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded-md text-[11px] font-semibold uppercase ${getTypeColor(
                              announcement.announcement_type
                            )}`}
                          >
                            {announcement.announcement_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(announcement.target_user_types || []).map((type: string) => (
                              <span key={type} className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px] font-medium">
                                {type}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-neutral-600">{formatDate(announcement.start_date)}</td>
                        <td className="px-4 py-3 text-[13px] text-neutral-600">{formatDate(announcement.end_date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${announcement.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                            />
                            <span className={`text-[13px] font-medium ${announcement.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                              {announcement.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleActive(announcement)}
                              className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors group"
                              title={announcement.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {announcement.is_active ? (
                                <EyeOff size={16} className="text-neutral-400 group-hover:text-neutral-600" />
                              ) : (
                                <Eye size={16} className="text-neutral-400 group-hover:text-green-600" />
                              )}
                            </button>
                            <button
                              onClick={() => handleEditAnnouncement(announcement)}
                              className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors group"
                              title="Edit"
                            >
                              <Edit2 size={16} className="text-neutral-400 group-hover:text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteAnnouncement(announcement.id)}
                              className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors group"
                              title="Delete"
                            >
                              <Trash2 size={16} className="text-neutral-400 group-hover:text-red-600" />
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
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <AnnouncementForm
          onSubmit={handleCreateAnnouncement}
          onCancel={() => setShowCreateModal(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingAnnouncement && (
        <AnnouncementForm
          announcement={editingAnnouncement}
          onSubmit={handleUpdateAnnouncement}
          onCancel={() => {
            setShowEditModal(false);
            setEditingAnnouncement(null);
          }}
          isSubmitting={isSubmitting}
        />
      )}
    </AdminLayout>
  );
}
