'use client';

import { useState, useEffect } from 'react';
import { investorAPI } from '@/lib/api';
import { Building2, Calendar, TrendingUp } from 'lucide-react';

interface OutletCredit {
  id: number;
  outlet_id: number;
  outlet_name: string;
  credits_balance: number;
  annual_allocation: number;
  auto_renew: boolean;
  expires_at: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  outlet_name?: string;
  created_at: string;
  description: string;
}

export default function InvestorDashboard() {
  const [groupCredits, setGroupCredits] = useState<any>(null);
  const [outletCredits, setOutletCredits] = useState<OutletCredit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const creditsRes = await investorAPI.getCredits();

      if (creditsRes.data) {
        setGroupCredits(creditsRes.data.groupCredits);
        setOutletCredits(creditsRes.data.outletCredits || []);
      }

      const transactionsRes = await investorAPI.getTransactions();
      if (transactionsRes.data) {
        setTransactions(transactionsRes.data.slice(0, 10)); // Last 10
      }
    } catch (error) {
      console.error('Failed to load investor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const totalCredits = (groupCredits?.credits_balance || 0) +
    outletCredits.reduce((sum, oc) => sum + oc.credits_balance, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Investor Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your credits and track usage</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Credits</h3>
              <TrendingUp className="text-blue-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalCredits}</p>
            <p className="text-sm text-gray-500 mt-1">Available across all outlets</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Group Credits</h3>
              <Building2 className="text-green-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {groupCredits?.credits_balance || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Usable at any outlet</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Outlets Covered</h3>
              <Calendar className="text-purple-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{outletCredits.length}</p>
            <p className="text-sm text-gray-500 mt-1">With specific allocations</p>
          </div>
        </div>

        {/* Group Credits Details */}
        {groupCredits && groupCredits.credits_balance > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Group Credits (All Outlets)</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded">
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className="text-2xl font-bold text-blue-600">{groupCredits.credits_balance}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Annual Allocation</p>
                <p className="text-2xl font-bold text-gray-900">{groupCredits.annual_allocation}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Auto Renew</p>
                <p className="text-lg font-medium text-gray-900">
                  {groupCredits.auto_renew ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Days Until Expiry</p>
                <p className="text-2xl font-bold text-red-600">
                  {getDaysUntilExpiry(groupCredits.expires_at)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Outlet-Specific Credits */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Outlet-Specific Credits</h2>
          {outletCredits.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {outletCredits.map((credit) => (
                <div key={credit.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{credit.outlet_name}</h3>
                      <p className="text-sm text-gray-500">Outlet #{credit.outlet_id}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      getDaysUntilExpiry(credit.expires_at) > 30
                        ? 'bg-green-100 text-green-800'
                        : getDaysUntilExpiry(credit.expires_at) > 7
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {getDaysUntilExpiry(credit.expires_at)} days left
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Balance</p>
                      <p className="text-xl font-bold text-gray-900">{credit.credits_balance}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Annual</p>
                      <p className="text-xl font-bold text-gray-900">{credit.annual_allocation}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Auto-renew:</span>
                      <span className={`font-medium ${credit.auto_renew ? 'text-green-600' : 'text-gray-900'}`}>
                        {credit.auto_renew ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Expires:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(credit.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No outlet-specific credits allocated</p>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{tx.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleString()}
                      {tx.outlet_name && ` • ${tx.outlet_name}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      tx.type === 'allocation' || tx.type === 'renewal'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {tx.type === 'allocation' || tx.type === 'renewal' ? '+' : '-'}
                      {Math.abs(tx.amount)}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{tx.type}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
