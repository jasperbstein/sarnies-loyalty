'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { posKeysAPI } from '@/lib/api';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Server,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

interface POSApiKey {
  id: number;
  name: string;
  key_prefix: string;
  outlet_id: number | null;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  total_requests: number;
  total_transactions: number;
}

interface TransactionLog {
  id: number;
  external_transaction_id: string;
  customer_phone: string;
  amount_thb: number;
  points_earned: number;
  outlet: string;
  status: string;
  created_at: string;
}

export default function POSKeysPage() {
  const [keys, setKeys] = useState<POSApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyOutlet, setNewKeyOutlet] = useState<string>('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [expandedKey, setExpandedKey] = useState<number | null>(null);
  const [logs, setLogs] = useState<Record<number, TransactionLog[]>>({});
  const [loadingLogs, setLoadingLogs] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<POSApiKey | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const response = await posKeysAPI.getAll();
      setKeys(response.data.keys || []);
    } catch (error) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (keyId: number) => {
    if (logs[keyId]) {
      setExpandedKey(expandedKey === keyId ? null : keyId);
      return;
    }

    setLoadingLogs(keyId);
    try {
      const response = await posKeysAPI.getLogs(keyId, { limit: 20 });
      setLogs(prev => ({ ...prev, [keyId]: response.data.logs || [] }));
      setExpandedKey(keyId);
    } catch (error) {
      toast.error('Failed to load transaction logs');
    } finally {
      setLoadingLogs(null);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await posKeysAPI.create({
        name: newKeyName.trim(),
        outlet_id: newKeyOutlet ? parseInt(newKeyOutlet) : undefined
      });

      setCreatedKey(response.data.apiKey);
      toast.success('API key created successfully');
      fetchKeys();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;

    try {
      await posKeysAPI.revoke(keyToRevoke.id);
      toast.success('API key revoked successfully');
      setKeyToRevoke(null);
      fetchKeys();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewKeyName('');
    setNewKeyOutlet('');
    setCreatedKey(null);
    setCopiedKey(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-[1400px] mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[28px] font-semibold text-neutral-900">POS API Keys</h1>
              <p className="text-[14px] text-neutral-500 mt-1">
                Manage API keys for external POS integrations
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-[40px] px-4 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 text-[14px] font-medium transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              Create API Key
            </button>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-[14px] font-semibold text-blue-900 mb-1">
                  External POS Integration
                </h3>
                <p className="text-[13px] text-blue-700">
                  API keys allow external POS systems to submit transactions and look up customers.
                  Each key is shown only once when created. Store it securely.
                </p>
                <div className="mt-3 flex gap-4 text-[12px]">
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800">
                    POST /api/pos/transaction
                  </code>
                  <code className="bg-blue-100 px-2 py-1 rounded text-blue-800">
                    GET /api/pos/lookup/:identifier
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Keys Table */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center h-[48px] px-6 border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
              <div className="w-[200px]">Name</div>
              <div className="w-[160px]">Key Prefix</div>
              <div className="w-[100px]">Status</div>
              <div className="w-[140px]">Last Used</div>
              <div className="w-[100px] text-right">Requests</div>
              <div className="w-[100px] text-right">Transactions</div>
              <div className="w-[140px]">Created</div>
              <div className="flex-1"></div>
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="flex items-center justify-center h-40 text-[14px] text-neutral-500">
                Loading API keys...
              </div>
            ) : keys.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-4">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                  <Key size={24} className="text-neutral-400" />
                </div>
                <h3 className="text-[16px] font-semibold text-neutral-900 mb-1">No API Keys</h3>
                <p className="text-[14px] text-neutral-500 mb-4">Create your first API key to enable POS integration.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="h-[36px] px-4 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 text-[14px] font-medium transition-all flex items-center gap-2"
                >
                  <Plus size={16} />
                  Create API Key
                </button>
              </div>
            ) : (
              keys.map((key) => (
                <div key={key.id}>
                  {/* Key Row */}
                  <div className="flex items-center h-[60px] px-6 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                    <div className="w-[200px]">
                      <p className="text-[14px] font-medium text-neutral-900">{key.name}</p>
                    </div>
                    <div className="w-[160px]">
                      <code className="text-[13px] font-mono text-neutral-600 bg-neutral-100 px-2 py-1 rounded">
                        {key.key_prefix}...
                      </code>
                    </div>
                    <div className="w-[100px]">
                      <span className={`inline-flex items-center h-[24px] px-2 rounded-md text-[12px] font-medium ${
                        key.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {key.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </div>
                    <div className="w-[140px] text-[13px] text-neutral-600">
                      {formatDate(key.last_used_at)}
                    </div>
                    <div className="w-[100px] text-right text-[14px] font-medium text-neutral-900 font-mono">
                      {key.total_requests.toLocaleString()}
                    </div>
                    <div className="w-[100px] text-right text-[14px] font-medium text-neutral-900 font-mono">
                      {key.total_transactions.toLocaleString()}
                    </div>
                    <div className="w-[140px] text-[13px] text-neutral-500">
                      {formatDate(key.created_at)}
                    </div>
                    <div className="flex-1 flex justify-end gap-2">
                      <button
                        onClick={() => fetchLogs(key.id)}
                        className="h-[32px] px-3 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 text-[13px] font-medium transition-all flex items-center gap-1.5"
                        disabled={loadingLogs === key.id}
                      >
                        <Activity size={14} />
                        Logs
                        {expandedKey === key.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {key.is_active && (
                        <button
                          onClick={() => setKeyToRevoke(key)}
                          className="h-[32px] px-3 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-[13px] font-medium transition-all flex items-center gap-1.5"
                        >
                          <Trash2 size={14} />
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Logs Section */}
                  {expandedKey === key.id && (
                    <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-4">
                      <h4 className="text-[13px] font-semibold text-neutral-700 mb-3">Recent Transaction Logs</h4>
                      {loadingLogs === key.id ? (
                        <p className="text-[13px] text-neutral-500">Loading logs...</p>
                      ) : logs[key.id]?.length === 0 ? (
                        <p className="text-[13px] text-neutral-500">No transactions recorded yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {logs[key.id]?.map((log) => (
                            <div key={log.id} className="flex items-center gap-4 bg-white rounded-lg px-4 py-3 border border-neutral-200">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] font-mono text-neutral-600">{log.external_transaction_id}</span>
                                  <span className={`inline-flex items-center h-[20px] px-1.5 rounded text-[11px] font-medium ${
                                    log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {log.status}
                                  </span>
                                </div>
                                <p className="text-[12px] text-neutral-500 mt-0.5">
                                  {log.customer_phone} • {log.outlet}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[14px] font-medium text-neutral-900">฿{log.amount_thb.toLocaleString()}</p>
                                <p className="text-[12px] text-green-600">+{log.points_earned} pts</p>
                              </div>
                              <div className="text-[12px] text-neutral-400 w-[120px] text-right">
                                {formatDate(log.created_at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeCreateModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-[480px] max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-[20px] font-semibold text-neutral-900">
                {createdKey ? 'API Key Created' : 'Create API Key'}
              </h2>
            </div>

            <div className="p-6">
              {createdKey ? (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-[14px] font-semibold text-amber-800 mb-1">
                          Save this key now
                        </p>
                        <p className="text-[13px] text-amber-700">
                          This is the only time you'll see this API key. Copy and store it securely.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-neutral-100 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <code className="text-[14px] font-mono text-neutral-900 break-all">
                        {createdKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(createdKey)}
                        className="ml-3 p-2 rounded-lg hover:bg-neutral-200 transition-colors flex-shrink-0"
                      >
                        {copiedKey ? (
                          <Check size={18} className="text-green-600" />
                        ) : (
                          <Copy size={18} className="text-neutral-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-neutral-50 rounded-lg p-4 text-[13px] text-neutral-600">
                    <p className="font-semibold text-neutral-800 mb-2">Usage:</p>
                    <code className="block bg-neutral-900 text-green-400 p-3 rounded-lg text-[12px] overflow-x-auto">
                      curl -X POST https://loyalty.sarnies.tech/api/pos/transaction \<br/>
                      &nbsp;&nbsp;-H "X-API-Key: {createdKey.substring(0, 20)}..." \<br/>
                      &nbsp;&nbsp;-H "Content-Type: application/json" \<br/>
                      &nbsp;&nbsp;-d '{`{"customer_phone": "+66...", "amount_thb": 100, ...}`}'
                    </code>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">
                      Key Name
                    </label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Main POS System"
                      className="w-full h-[40px] px-3 border border-neutral-300 rounded-lg text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    />
                    <p className="text-[12px] text-neutral-500 mt-1">
                      A descriptive name to identify this API key
                    </p>
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">
                      Outlet ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={newKeyOutlet}
                      onChange={(e) => setNewKeyOutlet(e.target.value)}
                      placeholder="Leave empty for all outlets"
                      className="w-full h-[40px] px-3 border border-neutral-300 rounded-lg text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    />
                    <p className="text-[12px] text-neutral-500 mt-1">
                      Restrict this key to a specific outlet
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-neutral-200 flex justify-end gap-3">
              <button
                onClick={closeCreateModal}
                className="h-[40px] px-4 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 text-[14px] font-medium transition-all"
              >
                {createdKey ? 'Close' : 'Cancel'}
              </button>
              {!createdKey && (
                <button
                  onClick={handleCreateKey}
                  disabled={isSubmitting || !newKeyName.trim()}
                  className="h-[40px] px-4 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 text-[14px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Key'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {keyToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setKeyToRevoke(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-[400px]">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h2 className="text-[20px] font-semibold text-neutral-900 mb-2">
                Revoke API Key
              </h2>
              <p className="text-[14px] text-neutral-600 mb-4">
                Are you sure you want to revoke <strong>{keyToRevoke.name}</strong>?
                This action cannot be undone and any systems using this key will stop working immediately.
              </p>
            </div>
            <div className="p-6 border-t border-neutral-200 flex justify-end gap-3">
              <button
                onClick={() => setKeyToRevoke(null)}
                className="h-[40px] px-4 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 text-[14px] font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeKey}
                className="h-[40px] px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 text-[14px] font-medium transition-all"
              >
                Revoke Key
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
