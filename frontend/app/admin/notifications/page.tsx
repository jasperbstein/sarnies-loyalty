'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import '@/app/admin/admin.css';
import { Bell, Send, Users, Radio, Search, X, Check, ChevronDown } from 'lucide-react';
import { notificationsAPI, usersAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface NotificationStats {
  subscribed_users: number;
  total_subscriptions: number;
  pending_notifications: number;
  sent_last_24h: number;
  failed_last_24h: number;
}

interface User {
  id: number;
  name: string;
  phone: string;
  type: string;
  points_balance: number;
}

export default function NotificationsPage() {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [sendMode, setSendMode] = useState<'targeted' | 'broadcast'>('targeted');
  const [isSending, setIsSending] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('promotions');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        notificationsAPI.adminStats(),
        usersAPI.getAll({ limit: 500 })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || usersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load notification data');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }

    if (sendMode === 'targeted' && selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setIsSending(true);
    try {
      if (sendMode === 'broadcast') {
        await notificationsAPI.adminBroadcast({ title, body, category });
        toast.success('Broadcast notification sent!');
      } else {
        await notificationsAPI.adminSend({
          user_ids: selectedUsers,
          title,
          body,
          category
        });
        toast.success(`Notification sent to ${selectedUsers.length} user(s)!`);
      }

      // Reset form
      setTitle('');
      setBody('');
      setSelectedUsers([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  const handleProcessQueue = async () => {
    try {
      await notificationsAPI.adminProcessQueue();
      toast.success('Queue processed');
      fetchData();
    } catch (error) {
      toast.error('Failed to process queue');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone?.includes(searchQuery)
  );

  const toggleUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredUsers.map(u => u.id);
    setSelectedUsers(prev => {
      const newSelection = [...prev];
      filteredIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  return (
    <AdminLayout>
      <div className="min-h-screen admin-page animate-macos-fade">
        <div className="admin-page-container">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF453A] to-[#D70015] flex items-center justify-center shadow-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Push Notifications</h1>
                <p className="text-[14px] text-[#86868b]">Send notifications to your users</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="admin-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(52,199,89,0.12)] flex items-center justify-center">
                    <Users size={20} className="text-[#34C759]" />
                  </div>
                  <div>
                    <p className="text-[24px] font-semibold text-[#1d1d1f]">{stats.subscribed_users}</p>
                    <p className="text-[12px] text-[#86868b]">Subscribed Users</p>
                  </div>
                </div>
              </div>

              <div className="admin-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(0,122,255,0.12)] flex items-center justify-center">
                    <Bell size={20} className="text-[#007AFF]" />
                  </div>
                  <div>
                    <p className="text-[24px] font-semibold text-[#1d1d1f]">{stats.total_subscriptions}</p>
                    <p className="text-[12px] text-[#86868b]">Total Devices</p>
                  </div>
                </div>
              </div>

              <div className="admin-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(255,159,10,0.12)] flex items-center justify-center">
                    <Radio size={20} className="text-[#FF9F0A]" />
                  </div>
                  <div>
                    <p className="text-[24px] font-semibold text-[#1d1d1f]">{stats.pending_notifications}</p>
                    <p className="text-[12px] text-[#86868b]">Pending</p>
                  </div>
                </div>
              </div>

              <div className="admin-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(52,199,89,0.12)] flex items-center justify-center">
                    <Check size={20} className="text-[#34C759]" />
                  </div>
                  <div>
                    <p className="text-[24px] font-semibold text-[#1d1d1f]">{stats.sent_last_24h}</p>
                    <p className="text-[12px] text-[#86868b]">Sent (24h)</p>
                  </div>
                </div>
              </div>

              <div className="admin-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(255,69,58,0.12)] flex items-center justify-center">
                    <X size={20} className="text-[#FF453A]" />
                  </div>
                  <div>
                    <p className="text-[24px] font-semibold text-[#1d1d1f]">{stats.failed_last_24h}</p>
                    <p className="text-[12px] text-[#86868b]">Failed (24h)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Send Notification Form */}
            <div className="admin-card p-6">
              <h2 className="text-[18px] font-semibold text-[#1d1d1f] mb-4">Send Notification</h2>

              {/* Send Mode Toggle - macOS Segmented Control */}
              <div className="admin-segmented-control mb-4">
                <button
                  onClick={() => setSendMode('targeted')}
                  className={`admin-segment ${sendMode === 'targeted' ? 'active' : ''}`}
                >
                  <Users size={16} className="inline mr-2" />
                  Targeted
                </button>
                <button
                  onClick={() => setSendMode('broadcast')}
                  className={`admin-segment ${sendMode === 'broadcast' ? 'active' : ''}`}
                >
                  <Radio size={16} className="inline mr-2" />
                  Broadcast
                </button>
              </div>

              {/* User Selector (for targeted mode) */}
              {sendMode === 'targeted' && (
                <div className="mb-4">
                  <label className="block text-[13px] font-medium text-neutral-700 mb-1">
                    Recipients
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowUserSelector(!showUserSelector)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-left text-[14px] flex items-center justify-between hover:border-neutral-300 transition-colors"
                    >
                      <span className={selectedUsers.length > 0 ? 'text-neutral-900' : 'text-neutral-400'}>
                        {selectedUsers.length > 0
                          ? `${selectedUsers.length} user(s) selected`
                          : 'Select users...'}
                      </span>
                      <ChevronDown size={16} className="text-neutral-400" />
                    </button>

                    {showUserSelector && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                        <div className="p-2 border-b border-neutral-100">
                          <div className="relative">
                            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                              type="text"
                              placeholder="Search users..."
                              className="w-full pl-8 pr-3 py-1.5 border border-neutral-200 rounded text-[13px] focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={selectAllFiltered}
                              className="text-[11px] text-blue-600 hover:underline"
                            >
                              Select all
                            </button>
                            <button
                              onClick={clearSelection}
                              className="text-[11px] text-neutral-500 hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredUsers.map(user => (
                            <label
                              key={user.id}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(user.id)}
                                onChange={() => toggleUser(user.id)}
                                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-neutral-900 truncate">
                                  {user.name || 'Unnamed'}
                                </p>
                                <p className="text-[11px] text-neutral-500">{user.phone}</p>
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                user.type === 'employee' ? 'bg-purple-100 text-purple-700' :
                                user.type === 'investor' ? 'bg-blue-100 text-blue-700' :
                                'bg-neutral-100 text-neutral-600'
                              }`}>
                                {user.type}
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="p-2 border-t border-neutral-100">
                          <button
                            onClick={() => setShowUserSelector(false)}
                            className="w-full py-1.5 bg-neutral-900 text-white rounded text-[13px] font-medium hover:bg-neutral-800"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {sendMode === 'broadcast' && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[13px] text-amber-800">
                    <strong>Warning:</strong> This will send to all users with push notifications enabled.
                  </p>
                </div>
              )}

              {/* Title */}
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-neutral-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Notification title..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              {/* Body */}
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-neutral-700 mb-1">
                  Message
                </label>
                <textarea
                  placeholder="Notification message..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 resize-none"
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={500}
                />
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-[13px] font-medium text-neutral-700 mb-1">
                  Category
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 bg-white"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="promotions">Promotions</option>
                  <option value="points_rewards">Points & Rewards</option>
                  <option value="birthday">Birthday</option>
                  <option value="referrals">Referrals</option>
                </select>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Users who opted out of this category won't receive the notification.
                </p>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={isSending || !title.trim() || !body.trim() || (sendMode === 'targeted' && selectedUsers.length === 0)}
                className="admin-btn-primary w-full justify-center"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    {sendMode === 'broadcast' ? 'Send Broadcast' : `Send to ${selectedUsers.length} User(s)`}
                  </>
                )}
              </button>
            </div>

            {/* Preview */}
            <div className="admin-card p-6">
              <h2 className="text-[18px] font-semibold text-[#1d1d1f] mb-4">Preview</h2>

              <div className="bg-neutral-100 rounded-xl p-4">
                {/* Phone mockup */}
                <div className="max-w-[320px] mx-auto">
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Status bar */}
                    <div className="bg-neutral-900 text-white px-4 py-2 flex items-center justify-between text-[11px]">
                      <span>9:41</span>
                      <span>Sarnies</span>
                    </div>

                    {/* Notification */}
                    <div className="p-4">
                      <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center flex-shrink-0">
                            <Bell size={20} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[11px] font-medium text-neutral-500 uppercase">SARNIES</span>
                              <span className="text-[10px] text-neutral-400">now</span>
                            </div>
                            <p className="text-[14px] font-semibold text-neutral-900 mb-0.5">
                              {title || 'Notification Title'}
                            </p>
                            <p className="text-[13px] text-neutral-600 line-clamp-2">
                              {body || 'Notification message will appear here...'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Queue Actions */}
              <div className="mt-6 pt-6 border-t border-neutral-200">
                <h3 className="text-[14px] font-medium text-neutral-700 mb-3">Queue Management</h3>
                <button
                  onClick={handleProcessQueue}
                  className="px-4 py-2 border border-neutral-200 rounded-lg text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Process Pending Queue
                </button>
                <p className="text-[11px] text-neutral-500 mt-2">
                  Manually trigger processing of any pending notifications in the queue.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
