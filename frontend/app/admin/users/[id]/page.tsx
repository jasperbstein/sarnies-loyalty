'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import AdjustPointsModal from '@/components/AdjustPointsModal';
import { usersAPI, investorAPI, mediaAPI, transactionsAPI } from '@/lib/api';
import { ArrowLeft, Plus, Minus, Phone, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

interface OutletType {
  id: number;
  name: string;
  address: string;
}

interface OutletCredit {
  id: number;
  outlet_id: number;
  outlet_name: string;
  credits_balance: number;
  annual_allocation: number;
  auto_renew: boolean;
  expires_at: string;
}

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<OutletType[]>([]);
  const [outletCredits, setOutletCredits] = useState<OutletCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Investor forms
  const [showOutletCreditForm, setShowOutletCreditForm] = useState(false);
  const [showGroupCreditForm, setShowGroupCreditForm] = useState(false);
  const [outletCreditForm, setOutletCreditForm] = useState({
    outletId: '',
    annualAllocation: '',
    creditsBalance: '',
    autoRenew: true,
    expiresAt: ''
  });
  const [groupCreditForm, setGroupCreditForm] = useState({
    enabled: false,
    annualAllocation: '',
    creditsBalance: '',
    autoRenew: true,
    expiresAt: ''
  });

  // Media form
  const [showMediaBudgetForm, setShowMediaBudgetForm] = useState(false);
  const [mediaBudgetForm, setMediaBudgetForm] = useState({
    annualBudget: '',
    expiresAt: ''
  });

  useEffect(() => {
    fetchUser();
    fetchTransactions();
  }, [params.id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getOne(userId);
      const userData = response.data;
      setUser(userData);

      // Load investor-specific data
      if (userData.user_type === 'investor') {
        try {
          const outletsRes = await fetch('/api/outlets');
          if (outletsRes.ok) {
            const outletsData = await outletsRes.json();
            setOutlets(outletsData);
          }

          const creditsRes = await investorAPI.getCredits();
          if (creditsRes.data) {
            setOutletCredits(creditsRes.data.outletCredits || []);
          }

          // Populate group credit form if exists
          if (userData.investor_group_credits_allocation > 0) {
            setGroupCreditForm({
              enabled: true,
              annualAllocation: userData.investor_group_credits_allocation.toString(),
              creditsBalance: (userData.investor_group_credits_balance || 0).toString(),
              autoRenew: userData.investor_group_credits_auto_renew !== false,
              expiresAt: userData.investor_group_credits_expires_at
                ? new Date(userData.investor_group_credits_expires_at).toISOString().split('T')[0]
                : ''
            });
          }
        } catch (err) {
          console.error('Failed to load investor data:', err);
        }
      }

      // Load media-specific data
      if (userData.user_type === 'media') {
        setMediaBudgetForm({
          annualBudget: (userData.media_annual_budget || 0).toString(),
          expiresAt: userData.media_budget_expires_at
            ? new Date(userData.media_budget_expires_at).toISOString().split('T')[0]
            : ''
        });
      }
    } catch (error) {
      toast.error('Failed to load user');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await transactionsAPI.getAll({
        user_id: userId,
        limit: 50,
      });
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Failed to load transactions');
    }
  };

  const handleAdjustPoints = async (points: number, reason: string) => {
    try {
      await usersAPI.adjustPoints(userId, points, reason);
      toast.success('Points adjusted successfully');
      setShowAdjustModal(false);
      fetchUser();
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to adjust points');
    }
  };

  const handleAllocateOutletCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await investorAPI.allocateOutletCredits(userId, {
        outletId: parseInt(outletCreditForm.outletId),
        annualAllocation: parseInt(outletCreditForm.annualAllocation),
        creditsBalance: parseInt(outletCreditForm.creditsBalance),
        autoRenew: outletCreditForm.autoRenew,
        expiresAt: outletCreditForm.expiresAt || undefined
      });

      toast.success('Outlet credits allocated successfully');
      setShowOutletCreditForm(false);
      setOutletCreditForm({
        outletId: '',
        annualAllocation: '',
        creditsBalance: '',
        autoRenew: true,
        expiresAt: ''
      });
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to allocate outlet credits');
    }
  };

  const handleAllocateGroupCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await investorAPI.allocateGroupCredits(userId, {
        enabled: true,
        annualAllocation: parseInt(groupCreditForm.annualAllocation),
        creditsBalance: parseInt(groupCreditForm.creditsBalance),
        expiresAt: groupCreditForm.expiresAt || undefined
      });

      toast.success('Group credits allocated successfully');
      setShowGroupCreditForm(false);
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to allocate group credits');
    }
  };

  const handleSetMediaBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mediaAPI.setBudget(userId, {
        annualBudgetThb: parseFloat(mediaBudgetForm.annualBudget),
        expiresAt: mediaBudgetForm.expiresAt || undefined
      });

      toast.success('Media budget set successfully');
      setShowMediaBudgetForm(false);
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to set media budget');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </AdminLayout>
    );
  }

  if (!user) return null;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 transition-colors mb-4 leading-none"
            >
              <ArrowLeft size={14} />
              <span className="text-[12px] font-medium">Back to Users</span>
            </button>
            <h1 className="text-[28px] font-semibold text-neutral-900">
              {user.name} {user.surname}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1.5 text-[14px] text-neutral-500">
                <Phone size={13} />
                {user.phone}
              </span>
              {user.company && (
                <>
                  <span className="text-neutral-300">•</span>
                  <span className="text-[14px] text-neutral-500">{user.company}</span>
                </>
              )}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                user.user_type === 'investor' ? 'bg-[#F7EDD4] text-[#8B6914]' :
                user.user_type === 'media' ? 'bg-[#D7E7FF] text-[#1E40AF]' :
                user.user_type === 'employee' ? 'bg-[#EAE7FF] text-[#5B21B6]' :
                'bg-[#F3F3F3] text-neutral-700'
              }`}>
                {user.user_type}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">Points Balance</p>
              <p className="text-[32px] font-bold text-neutral-900 mb-1">
                {user.points_balance.toLocaleString()}
              </p>
              <button
                onClick={() => setShowAdjustModal(true)}
                className="text-[12px] font-medium text-neutral-900 hover:text-neutral-700 transition-colors"
              >
                Adjust →
              </button>
            </div>
            <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">Total Spent</p>
              <p className="text-[32px] font-bold text-neutral-900">
                ฿{typeof user.total_spend === 'number' ? user.total_spend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}
              </p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">Purchases</p>
              <p className="text-[32px] font-bold text-neutral-900">
                {(user.total_purchases_count || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">Member Since</p>
              <p className="text-[20px] font-bold text-neutral-900">
                {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Credits Section */}
          {(user.user_type === 'investor' || user.user_type === 'media') && (
            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm mb-6">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-[14px] font-semibold text-neutral-900">Credits & Budget</h3>
              </div>

              {user.user_type === 'investor' && (
                <div className="p-6">
                  {/* Group Credits */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[13px] font-semibold text-neutral-700">Group Credits (All Outlets)</h4>
                      <button
                        onClick={() => setShowGroupCreditForm(!showGroupCreditForm)}
                        className="text-[12px] font-medium text-neutral-900 hover:text-neutral-700 transition-colors"
                      >
                        {groupCreditForm.enabled ? 'Update' : 'Enable'} →
                      </button>
                    </div>

                    {groupCreditForm.enabled && !showGroupCreditForm && (
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5 block">Current Balance</label>
                          <p className="text-[24px] font-bold text-neutral-900">{user.investor_group_credits_balance || 0}</p>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5 block">Annual Allocation</label>
                          <p className="text-[24px] font-bold text-neutral-900">{user.investor_group_credits_allocation || 0}</p>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5 block">Auto Renew</label>
                          <p className="text-[18px] font-semibold text-neutral-900">{user.investor_group_credits_auto_renew ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5 block">Expires At</label>
                          <p className="text-[18px] font-semibold text-neutral-900">
                            {user.investor_group_credits_expires_at
                              ? new Date(user.investor_group_credits_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}

                    {showGroupCreditForm && (
                      <form onSubmit={handleAllocateGroupCredits} className="space-y-3 bg-neutral-50 p-4 rounded-lg">
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[12px] font-medium text-neutral-700 mb-1">Annual Allocation</label>
                            <input
                              type="number"
                              value={groupCreditForm.annualAllocation}
                              onChange={(e) => setGroupCreditForm({...groupCreditForm, annualAllocation: e.target.value})}
                              className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] font-medium text-neutral-700 mb-1">Current Balance</label>
                            <input
                              type="number"
                              value={groupCreditForm.creditsBalance}
                              onChange={(e) => setGroupCreditForm({...groupCreditForm, creditsBalance: e.target.value})}
                              className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] font-medium text-neutral-700 mb-1">Expires At</label>
                            <input
                              type="date"
                              value={groupCreditForm.expiresAt}
                              onChange={(e) => setGroupCreditForm({...groupCreditForm, expiresAt: e.target.value})}
                              className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={groupCreditForm.autoRenew}
                                onChange={(e) => setGroupCreditForm({...groupCreditForm, autoRenew: e.target.checked})}
                                className="w-4 h-4"
                              />
                              <span className="text-[12px] font-medium text-neutral-700">Auto Renew</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-neutral-800 transition-colors">
                            Save Group Credits
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowGroupCreditForm(false)}
                            className="bg-white border border-neutral-300 text-neutral-900 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-neutral-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Outlet Credits */}
                  <div className="pt-6 border-t border-neutral-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[13px] font-semibold text-neutral-700">Outlet-Specific Credits</h4>
                      <button
                        onClick={() => setShowOutletCreditForm(!showOutletCreditForm)}
                        className="text-[12px] font-medium text-neutral-900 hover:text-neutral-700 transition-colors"
                      >
                        Add Outlet →
                      </button>
                    </div>

                    {showOutletCreditForm && (
                      <form onSubmit={handleAllocateOutletCredits} className="mb-4 p-4 bg-neutral-50 rounded-lg space-y-3">
                        <div className="grid grid-cols-5 gap-3">
                          <div>
                            <label className="block text-[12px] font-medium text-neutral-700 mb-1">Outlet</label>
                            <select
                              value={outletCreditForm.outletId}
                              onChange={(e) => setOutletCreditForm({...outletCreditForm, outletId: e.target.value})}
                              className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                              required
                            >
                              <option value="">Select outlet...</option>
                              {outlets.map((outlet) => (
                                <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[12px] font-medium text-neutral-700 mb-1">Annual Allocation</label>
                            <input
                              type="number"
                              value={outletCreditForm.annualAllocation}
                              onChange={(e) => setOutletCreditForm({...outletCreditForm, annualAllocation: e.target.value})}
                              className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] font-medium text-neutral-700 mb-1">Current Balance</label>
                            <input
                              type="number"
                              value={outletCreditForm.creditsBalance}
                              onChange={(e) => setOutletCreditForm({...outletCreditForm, creditsBalance: e.target.value})}
                              className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] font-medium text-neutral-700 mb-1">Expires At</label>
                            <input
                              type="date"
                              value={outletCreditForm.expiresAt}
                              onChange={(e) => setOutletCreditForm({...outletCreditForm, expiresAt: e.target.value})}
                              className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={outletCreditForm.autoRenew}
                                onChange={(e) => setOutletCreditForm({...outletCreditForm, autoRenew: e.target.checked})}
                                className="w-4 h-4"
                              />
                              <span className="text-[12px] font-medium text-neutral-700">Auto Renew</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-neutral-800 transition-colors">
                            Allocate Credits
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowOutletCreditForm(false)}
                            className="bg-white border border-neutral-300 text-neutral-900 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-neutral-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {outletCredits.length > 0 ? (
                      <div className="space-y-3">
                        {outletCredits.map((credit) => (
                          <div key={credit.id} className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                            <div className="flex-1">
                              <h5 className="text-[14px] font-semibold text-neutral-900">{credit.outlet_name}</h5>
                              <p className="text-[12px] text-neutral-500 mt-1">
                                Balance: <span className="font-semibold text-neutral-900">{credit.credits_balance}</span> ·
                                Allocation: <span className="font-semibold text-neutral-900">{credit.annual_allocation}</span> ·
                                Auto-renew: <span className="font-semibold text-neutral-900">{credit.auto_renew ? 'Yes' : 'No'}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[12px] text-neutral-500">
                                Expires {new Date(credit.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-500 text-center py-6 text-[13px]">No outlet credits allocated yet</p>
                    )}
                  </div>
                </div>
              )}

              {user.user_type === 'media' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[13px] font-semibold text-neutral-700">Media Budget</h4>
                    <button
                      onClick={() => setShowMediaBudgetForm(!showMediaBudgetForm)}
                      className="text-[12px] font-medium text-neutral-900 hover:text-neutral-700 transition-colors"
                    >
                      Update →
                    </button>
                  </div>

                  {!showMediaBudgetForm && (
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5 block">Annual Budget</label>
                        <p className="text-[24px] font-bold text-neutral-900">
                          ฿{(user.media_annual_budget || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5 block">Spent</label>
                        <p className="text-[24px] font-bold text-neutral-900">
                          ฿{(user.media_budget_spent || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5 block">Remaining</label>
                        <p className="text-[24px] font-bold text-neutral-900">
                          ฿{((user.media_annual_budget || 0) - (user.media_budget_spent || 0)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5 block">Expires At</label>
                        <p className="text-[18px] font-semibold text-neutral-900">
                          {user.media_budget_expires_at
                            ? new Date(user.media_budget_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {showMediaBudgetForm && (
                    <form onSubmit={handleSetMediaBudget} className="space-y-3 bg-neutral-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[12px] font-medium text-neutral-700 mb-1">Annual Budget (฿)</label>
                          <input
                            type="number"
                            value={mediaBudgetForm.annualBudget}
                            onChange={(e) => setMediaBudgetForm({...mediaBudgetForm, annualBudget: e.target.value})}
                            className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-neutral-700 mb-1">Expires At</label>
                          <input
                            type="date"
                            value={mediaBudgetForm.expiresAt}
                            onChange={(e) => setMediaBudgetForm({...mediaBudgetForm, expiresAt: e.target.value})}
                            className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-neutral-800 transition-colors">
                          Update Budget
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowMediaBudgetForm(false)}
                          className="bg-white border border-neutral-300 text-neutral-900 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-neutral-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Transaction History */}
          <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h3 className="text-[14px] font-semibold text-neutral-900">Transaction History</h3>
            </div>
            {transactions.length > 0 ? (
              <div className="divide-y divide-neutral-100 max-h-[400px] overflow-y-auto">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 px-6 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          tx.type === 'earn'
                            ? 'bg-green-100 text-green-600'
                            : tx.type === 'redeem'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {tx.type === 'earn' ? <Plus size={14} /> : <Minus size={14} />}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 text-[13px] leading-tight">
                          {tx.type === 'earn'
                            ? 'Points Earned'
                            : tx.type === 'redeem'
                            ? tx.voucher_name || 'Voucher Redeemed'
                            : 'Manual Adjustment'}
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                        {(tx.outlet || tx.staff_name) && (
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            {tx.outlet && tx.outlet}
                            {tx.outlet && tx.staff_name && ' • '}
                            {tx.staff_name && `Staff: ${tx.staff_name}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-[15px] font-bold leading-none ${
                          tx.points_delta > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {tx.points_delta > 0 ? '+' : ''}
                        {tx.points_delta.toLocaleString()}
                      </p>
                      {tx.amount_value && (
                        <p className="text-[10px] text-neutral-500 mt-1">
                          ฿{tx.amount_value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                  <CreditCard size={24} className="text-neutral-400" />
                </div>
                <h3 className="text-[16px] font-semibold text-neutral-900 mb-1">No transactions yet</h3>
                <p className="text-[14px] text-neutral-500">Transaction history will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Adjust Points Modal */}
      <AdjustPointsModal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        currentBalance={user?.points_balance || 0}
        userName={user ? `${user.name} ${user.surname || ''}`.trim() : ''}
        onAdjust={handleAdjustPoints}
      />
    </AdminLayout>
  );
}
