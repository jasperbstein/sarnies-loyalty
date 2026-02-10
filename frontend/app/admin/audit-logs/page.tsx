'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import '@/app/admin/admin.css';
import { Search, Filter, Calendar, User, FileText, AlertCircle, CheckCircle, XCircle, ClipboardList } from 'lucide-react';
import { getApiUrl } from '@/lib/config';

interface AuditLog {
  id: number;
  user_id?: number;
  staff_id?: number;
  user_email?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  description: string;
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: any;
  created_at: string;
  severity: string;
  success: boolean;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    severity: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.action && { action: filters.action }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage)?.state?.token : null;

      const response = await fetch(`${getApiUrl()}/audit-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'text-green-600 bg-green-50';
      case 'update': return 'text-blue-600 bg-blue-50';
      case 'delete': return 'text-red-600 bg-red-50';
      case 'archive': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'warning': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredLogs = logs.filter(log =>
    searchTerm === '' ||
    log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="admin-page animate-macos-fade">
        <div className="admin-page-container">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF9F0A] to-[#FF6B00] flex items-center justify-center shadow-lg">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Audit Logs</h1>
              <p className="text-[14px] text-[#86868b]">Track all system activities and changes</p>
            </div>
          </div>

          {/* Filters */}
          <div className="admin-card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by description, user..."
                  className="w-full pl-10 pr-4 py-2.5 border border-[rgba(0,0,0,0.1)] rounded-[10px] focus:ring-2 focus:ring-[rgba(0,122,255,0.3)] focus:border-[#007AFF] text-[14px]"
                />
              </div>
            </div>

            {/* Entity Type */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-2">
                Entity Type
              </label>
              <select
                value={filters.entityType}
                onChange={(e) => setFilters(prev => ({ ...prev, entityType: e.target.value }))}
                className="admin-select w-full"
              >
                <option value="">All Types</option>
                <option value="voucher">Voucher</option>
                <option value="announcement">Announcement</option>
                <option value="user">User</option>
                <option value="transaction">Transaction</option>
                <option value="points_adjustment">Points Adjustment</option>
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-2">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                className="admin-select w-full"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="archive">Archive</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-2">
                Severity
              </label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                className="admin-select w-full"
              >
                <option value="">All Levels</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-4 py-2.5 border border-[rgba(0,0,0,0.1)] rounded-[10px] focus:ring-2 focus:ring-[rgba(0,122,255,0.3)] focus:border-[#007AFF] text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-4 py-2.5 border border-[rgba(0,0,0,0.1)] rounded-[10px] focus:ring-2 focus:ring-[rgba(0,122,255,0.3)] focus:border-[#007AFF] text-[14px]"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4">
            <button
              onClick={() => {
                setFilters({ entityType: '', action: '', severity: '', startDate: '', endDate: '' });
                setSearchTerm('');
              }}
              className="px-4 py-2 text-[13px] text-[#86868b] hover:text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.04)] rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="admin-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF]"></div>
              <p className="mt-4 text-[#86868b]">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="mx-auto text-[#86868b] opacity-50 mb-4" />
              <p className="text-[#86868b]">No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[rgba(246,246,246,0.6)] border-b border-[rgba(0,0,0,0.06)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[rgba(0,0,0,0.04)]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[rgba(0,0,0,0.02)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User size={16} className="text-neutral-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-neutral-900">{log.user_name || 'Unknown'}</div>
                            <div className="text-sm text-neutral-500">{log.user_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                          {log.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        <div className="font-medium">{log.entity_type}</div>
                        {log.entity_id && <div className="text-neutral-500">ID: {log.entity_id}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-900 max-w-md truncate">
                        {log.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(log.severity)}`}>
                          {log.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredLogs.length > 0 && (
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
              <div className="text-sm text-neutral-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between">
                <h2 className="text-[20px] font-semibold text-[#1d1d1f]">Audit Log Details</h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-1">Action</label>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getActionColor(selectedLog.action)}`}>
                    {selectedLog.action.toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-1">Severity</label>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getSeverityColor(selectedLog.severity)}`}>
                    {selectedLog.severity.toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-1">Entity Type</label>
                  <p className="text-neutral-900 font-medium">{selectedLog.entity_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-1">Entity ID</label>
                  <p className="text-neutral-900 font-medium">{selectedLog.entity_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-1">User</label>
                  <p className="text-neutral-900 font-medium">{selectedLog.user_name || 'Unknown'}</p>
                  <p className="text-sm text-neutral-500">{selectedLog.user_email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-1">Timestamp</label>
                  <p className="text-neutral-900 font-medium">{formatDate(selectedLog.created_at)}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-1">Description</label>
                <p className="text-neutral-900">{selectedLog.description}</p>
              </div>

              {/* Changes */}
              {selectedLog.changes && (
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-2">Changes</label>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.changes.before && (
                      <div>
                        <h4 className="text-sm font-medium text-neutral-700 mb-2">Before</h4>
                        <pre className="bg-neutral-50 p-4 rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(selectedLog.changes.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.changes.after && (
                      <div>
                        <h4 className="text-sm font-medium text-neutral-700 mb-2">After</h4>
                        <pre className="bg-neutral-50 p-4 rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(selectedLog.changes.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && (
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-2">Metadata</label>
                  <pre className="bg-neutral-50 p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
