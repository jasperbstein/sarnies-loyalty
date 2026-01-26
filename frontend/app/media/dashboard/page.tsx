'use client';

import { useState, useEffect } from 'react';
import { mediaAPI } from '@/lib/api';
import { DollarSign, Calendar, TrendingDown, Activity } from 'lucide-react';

interface MediaBudget {
  annual_budget: number;
  budget_spent: number;
  budget_remaining: number;
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

export default function MediaDashboard() {
  const [budget, setBudget] = useState<MediaBudget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const budgetRes = await mediaAPI.getBudget();
      if (budgetRes.data) {
        setBudget(budgetRes.data);
      }

      const transactionsRes = await mediaAPI.getTransactions();
      if (transactionsRes.data) {
        setTransactions(transactionsRes.data.slice(0, 20)); // Last 20
      }
    } catch (error) {
      console.error('Failed to load media data:', error);
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

  const getUsagePercentage = () => {
    if (!budget || budget.annual_budget === 0) return 0;
    return (budget.budget_spent / budget.annual_budget) * 100;
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

  const usagePercentage = getUsagePercentage();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Media Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your annual budget and spending</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Annual Budget</h3>
              <DollarSign className="text-blue-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ฿{(budget?.annual_budget || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total allocation</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Spent</h3>
              <TrendingDown className="text-red-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-red-600">
              ฿{(budget?.budget_spent || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">{usagePercentage.toFixed(1)}% used</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Remaining</h3>
              <Activity className="text-green-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-green-600">
              ฿{(budget?.budget_remaining || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">{(100 - usagePercentage).toFixed(1)}% left</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Expires In</h3>
              <Calendar className="text-purple-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {budget?.expires_at ? getDaysUntilExpiry(budget.expires_at) : 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Days remaining</p>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Budget Usage</h2>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Budget Utilization</span>
                <span className="font-medium text-gray-900">{usagePercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all duration-300 ${
                    usagePercentage < 50
                      ? 'bg-green-500'
                      : usagePercentage < 80
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Budget Breakdown */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Annual Budget</p>
                <p className="text-2xl font-bold text-blue-600">
                  ฿{(budget?.annual_budget || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-red-600">
                  ฿{(budget?.budget_spent || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Remaining</p>
                <p className="text-2xl font-bold text-green-600">
                  ฿{(budget?.budget_remaining || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Expiry Info */}
            {budget?.expires_at && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Budget Expires</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(budget.expires_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Days Remaining</p>
                    <p className={`text-3xl font-bold ${
                      getDaysUntilExpiry(budget.expires_at) > 90
                        ? 'text-green-600'
                        : getDaysUntilExpiry(budget.expires_at) > 30
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      {getDaysUntilExpiry(budget.expires_at)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
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
                      tx.type === 'allocation'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {tx.type === 'allocation' ? '+' : '-'}
                      ฿{Math.abs(tx.amount).toLocaleString()}
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

        {/* Budget Alerts */}
        {budget && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Budget Alerts</h2>
            <div className="space-y-3">
              {usagePercentage >= 90 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800">
                    ⚠️ Critical: You've used {usagePercentage.toFixed(1)}% of your annual budget
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Only ฿{budget.budget_remaining.toLocaleString()} remaining
                  </p>
                </div>
              )}
              {usagePercentage >= 70 && usagePercentage < 90 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">
                    ⚠️ Warning: You've used {usagePercentage.toFixed(1)}% of your annual budget
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    ฿{budget.budget_remaining.toLocaleString()} remaining
                  </p>
                </div>
              )}
              {getDaysUntilExpiry(budget.expires_at) <= 30 && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm font-medium text-orange-800">
                    🕐 Budget expires in {getDaysUntilExpiry(budget.expires_at)} days
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Contact admin for renewal
                  </p>
                </div>
              )}
              {usagePercentage < 70 && getDaysUntilExpiry(budget.expires_at) > 30 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    ✓ Budget is healthy: {(100 - usagePercentage).toFixed(1)}% remaining
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    ฿{budget.budget_remaining.toLocaleString()} available for use
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
