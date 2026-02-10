'use client';

import { useState, useEffect } from 'react';
import StaffLayout from '@/components/StaffLayout';
import api from '@/lib/api';
import { ArrowLeft, Clock, Award, Gift, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Transaction {
  id: number;
  user_id: number;
  type: 'earn' | 'redeem' | 'use';
  points_delta: number;
  amount_value?: number;
  voucher_id?: number;
  outlet?: string;
  created_at: string;
  user_name?: string;
  voucher_title?: string;
}

type FilterType = 'all' | 'earn' | 'redeem';

export default function StaffTransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchTodayTransactions();
  }, []);

  const fetchTodayTransactions = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await api.get('/transactions', {
        params: {
          start_date: today.toISOString(),
          end_date: tomorrow.toISOString(),
          limit: 50
        }
      });

      const data = response.data;
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earn':
        return <Award className="w-5 h-5 text-green-600" />;
      case 'redeem':
      case 'use':
        return <Gift className="w-5 h-5 text-amber-600" />;
      default:
        return <Clock className="w-5 h-5 text-stone-500" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'earn':
        return 'Points Earned';
      case 'redeem':
      case 'use':
        return 'Voucher Redeemed';
      default:
        return 'Transaction';
    }
  };

  const filteredTransactions = transactions.filter(t =>
    filter === 'all' ? true : t.type === filter || (filter === 'redeem' && t.type === 'use')
  );

  const stats = {
    total: transactions.length,
    earned: transactions.filter(t => t.type === 'earn').length,
    redeemed: transactions.filter(t => t.type === 'redeem' || t.type === 'use').length,
    totalPoints: transactions
      .filter(t => t.type === 'earn')
      .reduce((sum, t) => sum + (t.points_delta || 0), 0)
  };

  return (
    <StaffLayout>
      <div className="max-w-xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">
              Transactions
            </h1>
            <p className="text-sm text-stone-500">
              Today's activity
            </p>
          </div>
          <button
            onClick={fetchTodayTransactions}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-stone-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-stone-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-stone-900">
              {stats.total}
            </p>
            <p className="text-[11px] text-stone-500">
              Total
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-600">
              {stats.earned}
            </p>
            <p className="text-[11px] text-green-600">
              Earned
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-amber-600">
              {stats.redeemed}
            </p>
            <p className="text-[11px] text-amber-600">
              Redeemed
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { value: 'all', label: 'All' },
            { value: 'earn', label: 'Earned' },
            { value: 'redeem', label: 'Redeemed' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value as FilterType)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === item.value
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-500 hover:bg-stone-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <Clock className="w-10 h-10 text-stone-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-stone-900">
                No transactions yet
              </p>
              <p className="text-xs text-stone-500 mt-1">
                Transactions will appear here
              </p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    transaction.type === 'earn' ? 'bg-green-50' : 'bg-amber-50'
                  }`}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-900">
                          {getTransactionLabel(transaction.type)}
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {formatTime(transaction.created_at)}
                          {transaction.outlet && ` · ${transaction.outlet}`}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ml-2 ${
                        transaction.type === 'earn' ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {transaction.type === 'earn' ? '+' : ''}{Math.abs(transaction.points_delta)} pts
                      </span>
                    </div>
                    {transaction.user_name && (
                      <p className="text-xs text-stone-500 mt-1.5 truncate">
                        {transaction.user_name}
                      </p>
                    )}
                    {transaction.voucher_title && (
                      <p className="text-xs text-amber-600 mt-0.5 truncate">
                        {transaction.voucher_title}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </StaffLayout>
  );
}
