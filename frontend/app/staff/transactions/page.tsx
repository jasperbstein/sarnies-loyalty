'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { Clock, Award, Gift, CheckCircle, Calendar, User, Phone, DollarSign, XCircle } from 'lucide-react';
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
  user_phone?: string;
  voucher_title?: string;
}

type FilterType = 'all' | 'earn' | 'redeem' | 'use' | 'error';

export default function StaffTransactionsPage() {
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
          limit: 100
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

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earn':
        return <Award className="w-5 h-5 text-green-600" />;
      case 'redeem':
        return <Gift className="w-5 h-5 text-blue-600" />;
      case 'use':
        return <CheckCircle className="w-5 h-5 text-purple-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earn':
        return 'bg-green-50 border-green-200';
      case 'redeem':
        return 'bg-blue-50 border-blue-200';
      case 'use':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'earn':
        return 'Earned Points';
      case 'redeem':
        return 'Redeemed Reward';
      case 'use':
        return 'Used Voucher';
      default:
        return 'Transaction';
    }
  };

  const filteredTransactions = transactions.filter(t =>
    filter === 'all' ? true : t.type === filter
  );

  // Group transactions by date
  const groupTransactionsByDate = (txns: Transaction[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { [key: string]: Transaction[] } = {
      Today: [],
      Yesterday: [],
      Older: []
    };

    txns.forEach(txn => {
      const txnDate = new Date(txn.created_at);
      txnDate.setHours(0, 0, 0, 0);

      if (txnDate.getTime() === today.getTime()) {
        groups.Today.push(txn);
      } else if (txnDate.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(txn);
      } else {
        groups.Older.push(txn);
      }
    });

    return groups;
  };

  const groupedTransactions = groupTransactionsByDate(filteredTransactions);

  const stats = {
    total: transactions.length,
    earned: transactions.filter(t => t.type === 'earn').length,
    redeemed: transactions.filter(t => t.type === 'redeem').length,
    used: transactions.filter(t => t.type === 'use').length,
    totalPointsAwarded: transactions
      .filter(t => t.type === 'earn')
      .reduce((sum, t) => sum + (t.points_delta || 0), 0)
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-black mb-1">Today's Transactions</h2>
              <p className="text-gray-600">
                {formatDate(new Date().toISOString())} - Read-only view
              </p>
            </div>
            <button
              onClick={fetchTodayTransactions}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Refresh
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
              <p className="text-3xl font-bold text-black">{stats.total}</p>
            </div>

            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-sm text-green-700 mb-1">Points Earned</p>
              <p className="text-3xl font-bold text-green-800">{stats.earned}</p>
              <p className="text-xs text-green-600 mt-1">+{stats.totalPointsAwarded} pts</p>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-sm text-blue-700 mb-1">Rewards Redeemed</p>
              <p className="text-3xl font-bold text-blue-800">{stats.redeemed}</p>
            </div>

            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <p className="text-sm text-purple-700 mb-1">Vouchers Used</p>
              <p className="text-3xl font-bold text-purple-800">{stats.used}</p>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <Card padding="sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-sarnies-charcoal mr-2">Filter:</span>
            {[
              { value: 'all', label: 'All', icon: Calendar },
              { value: 'earn', label: 'Earned Points', icon: Award },
              { value: 'redeem', label: 'Redeemed Vouchers', icon: Gift },
              { value: 'use', label: 'Vouchers Used', icon: CheckCircle },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value as FilterType)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-sarnies-button font-medium transition-all text-sm ${
                    filter === item.value
                      ? 'bg-sarnies-black text-white shadow-md'
                      : 'bg-sarnies-lightgray text-sarnies-charcoal hover:bg-gray-200'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Transactions List */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-black mx-auto mb-4"></div>
            <p className="text-gray-600">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-200">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-black mb-2">No Transactions Yet</h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'No transactions recorded'
                : `No ${filter} transactions found`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Render grouped transactions */}
            {Object.entries(groupedTransactions).map(([groupName, groupTxns]) => {
              if (groupTxns.length === 0) return null;

              return (
                <div key={groupName}>
                  {/* Date Group Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-sarnies-black">{groupName}</h3>
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-sm text-sarnies-midgray font-medium">
                      {groupTxns.length} {groupTxns.length === 1 ? 'transaction' : 'transactions'}
                    </span>
                  </div>

                  {/* Transactions in this group */}
                  <div className="space-y-3">
                    {groupTxns.map((transaction) => (
              <div
                key={transaction.id}
                className={`${getTransactionColor(
                  transaction.type
                )} rounded-xl p-5 border-2 transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="mt-1">{getTransactionIcon(transaction.type)}</div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-black text-lg">
                          {getTransactionLabel(transaction.type)}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(transaction.created_at)}
                          </span>
                          {transaction.outlet && (
                            <span className="px-2 py-0.5 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-300">
                              {transaction.outlet}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Points Delta */}
                      <div className="text-right">
                        <span
                          className={`text-2xl font-bold ${
                            transaction.type === 'earn' ? 'text-green-700' : 'text-gray-700'
                          }`}
                        >
                          {transaction.type === 'earn' ? '+' : '-'}
                          {Math.abs(transaction.points_delta)} pts
                        </span>
                        {transaction.amount_value && (
                          <p className="text-sm text-gray-600 mt-1 flex items-center justify-end gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            ฿{Number(transaction.amount_value).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Customer Info */}
                    {transaction.user_name && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{transaction.user_name}</span>
                        </div>
                        {transaction.user_phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{transaction.user_phone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Voucher Info */}
                    {transaction.voucher_title && (
                      <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">
                            {transaction.voucher_title}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
