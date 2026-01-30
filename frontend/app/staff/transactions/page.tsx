'use client';

import { useState, useEffect } from 'react';
import StaffLayout from '@/components/StaffLayout';
import api from '@/lib/api';
import { ArrowLeft, Clock, Award, Gift, CheckCircle, RefreshCw } from 'lucide-react';
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
        return <Award className="w-5 h-5 text-[#16A34A]" />;
      case 'redeem':
      case 'use':
        return <Gift className="w-5 h-5 text-[#D97706]" />;
      default:
        return <Clock className="w-5 h-5 text-[#78716C]" />;
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
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#78716C] mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[14px] font-medium" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Back</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[24px] font-bold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Transactions
              </h1>
              <p className="text-[14px] text-[#78716C] mt-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Today's activity
              </p>
            </div>
            <button
              onClick={fetchTodayTransactions}
              className="w-10 h-10 rounded-full bg-[#F5F5F4] flex items-center justify-center"
            >
              <RefreshCw className={`w-5 h-5 text-[#78716C] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 pb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#F5F5F4] rounded-xl p-3 text-center">
              <p className="text-[24px] font-bold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                {stats.total}
              </p>
              <p className="text-[11px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Total
              </p>
            </div>
            <div className="bg-[#F0FDF4] rounded-xl p-3 text-center">
              <p className="text-[24px] font-bold text-[#16A34A]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                {stats.earned}
              </p>
              <p className="text-[11px] text-[#16A34A]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Earned
              </p>
            </div>
            <div className="bg-[#FEF3C7] rounded-xl p-3 text-center">
              <p className="text-[24px] font-bold text-[#D97706]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                {stats.redeemed}
              </p>
              <p className="text-[11px] text-[#D97706]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Redeemed
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-5 pb-4">
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'earn', label: 'Earned' },
              { value: 'redeem', label: 'Redeemed' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value as FilterType)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  filter === item.value
                    ? 'bg-[#1C1917] text-white'
                    : 'bg-[#F5F5F4] text-[#78716C]'
                }`}
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        <div className="px-5 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-[#E7E5E4] mx-auto mb-3" />
              <p className="text-[16px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                No transactions yet
              </p>
              <p className="text-[14px] text-[#78716C] mt-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Transactions will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-white rounded-xl border border-[#E7E5E4] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'earn' ? 'bg-[#F0FDF4]' : 'bg-[#FEF3C7]'
                    }`}>
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[14px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                            {getTransactionLabel(transaction.type)}
                          </p>
                          <p className="text-[12px] text-[#78716C] mt-0.5" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                            {formatTime(transaction.created_at)}
                            {transaction.outlet && ` • ${transaction.outlet}`}
                          </p>
                        </div>
                        <span className={`text-[16px] font-bold ${
                          transaction.type === 'earn' ? 'text-[#16A34A]' : 'text-[#D97706]'
                        }`} style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                          {transaction.type === 'earn' ? '+' : ''}{Math.abs(transaction.points_delta)} pts
                        </span>
                      </div>
                      {transaction.user_name && (
                        <p className="text-[13px] text-[#78716C] mt-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                          Customer: {transaction.user_name}
                        </p>
                      )}
                      {transaction.voucher_title && (
                        <p className="text-[13px] text-[#D97706] mt-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                          {transaction.voucher_title}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StaffLayout>
  );
}
