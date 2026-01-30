'use client';

import { useState, useEffect } from 'react';
import StaffLayout from '@/components/StaffLayout';
import CustomerPreviewCard from '@/components/CustomerPreviewCard';
import VoucherVerificationCard from '@/components/VoucherVerificationCard';
import api, { transactionsAPI } from '@/lib/api';
import { CheckCircle, X, Calculator, Store, AlertCircle, DollarSign, Zap, User, Gift } from 'lucide-react';
import toast from 'react-hot-toast';

type SimMode = 'select' | 'add-points' | 'redeem-voucher' | 'success';

interface TestUser {
  id: number;
  name: string;
  surname?: string;
  phone: string;
  email?: string;
  points_balance: number;
  created_at: string;
}

interface TestVoucher {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  points_required: number;
  cash_value: number;
  voucher_type: string;
  locations?: string;
  expiry_type: string;
  expiry_days?: number;
}

export default function SimulatorPage() {
  const [mode, setMode] = useState<SimMode>('select');
  const [users, setUsers] = useState<TestUser[]>([]);
  const [vouchers, setVouchers] = useState<TestVoucher[]>([]);
  const [outlets, setOutlets] = useState<{ id: number; name: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<TestUser | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<TestVoucher | null>(null);
  const [amount, setAmount] = useState('');
  const [outlet, setOutlet] = useState('');
  const [loading, setLoading] = useState(false);
  const [simType, setSimType] = useState<'earn' | 'redeem'>('earn');

  useEffect(() => {
    fetchTestData();
  }, []);

  const fetchTestData = async () => {
    try {
      const [usersRes, vouchersRes, outletsRes] = await Promise.all([
        api.get('/users?limit=10'),
        api.get('/vouchers'),
        api.get('/outlets')
      ]);
      setUsers(usersRes.data || []);
      setVouchers(vouchersRes.data.vouchers || []);
      const outletsList = outletsRes.data || [];
      setOutlets(outletsList);
      // Set default outlet if available
      if (outletsList.length > 0 && !outlet) {
        setOutlet(outletsList[0].name);
      }
    } catch (error) {
      console.error('Failed to load test data:', error);
      toast.error('Failed to load test data');
    }
  };

  const handleSelectUser = (user: TestUser) => {
    setSelectedUser(user);
    if (simType === 'earn') {
      setMode('add-points');
    }
  };

  const handleSelectVoucher = (voucher: TestVoucher) => {
    if (!selectedUser) {
      toast.error('Please select a customer first');
      return;
    }
    setSelectedVoucher(voucher);
    setMode('redeem-voucher');
  };

  const handleAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !amount) return;

    setLoading(true);
    try {
      const response = await transactionsAPI.earnPoints(
        selectedUser.id,
        parseFloat(amount),
        outlet
      );

      toast.success(`${response.data.points_earned} points added successfully!`);
      setMode('success');

      // Refresh user data
      const updatedUser = await api.get(`/users/${selectedUser.id}`);
      setSelectedUser(updatedUser.data);

      setTimeout(() => reset(), 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add points');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemVoucher = async () => {
    if (!selectedUser || !selectedVoucher) return;

    setLoading(true);
    try {
      await transactionsAPI.redeemVoucher(
        selectedUser.id,
        selectedVoucher.id,
        outlet
      );

      toast.success('Voucher redeemed successfully!');
      setMode('success');

      // Refresh user data
      const updatedUser = await api.get(`/users/${selectedUser.id}`);
      setSelectedUser(updatedUser.data);

      setTimeout(() => reset(), 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to redeem voucher');
    } finally {
      setLoading(false);
    }
  };

  const calculatePoints = () => {
    if (!amount) return 0;
    return Math.floor(parseFloat(amount) / 100);
  };

  const reset = () => {
    setMode('select');
    setSelectedUser(null);
    setSelectedVoucher(null);
    setAmount('');
    setOutlet('Sukhumvit');
  };

  return (
    <StaffLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-7 h-7" />
            <h2 className="text-2xl font-bold">Simulation Mode</h2>
          </div>
          <p className="text-purple-100">
            Test all app features without needing two devices. Select customers and simulate transactions.
          </p>
        </div>

        {mode === 'select' && (
          <>
            {/* Simulation Type Selector */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-black mb-4">Select Simulation Type</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSimType('earn')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    simType === 'earn'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <DollarSign className={`w-8 h-8 mx-auto mb-2 ${
                    simType === 'earn' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <p className={`font-bold ${
                    simType === 'earn' ? 'text-green-900' : 'text-gray-700'
                  }`}>Earn Points</p>
                  <p className="text-xs text-gray-600 mt-1">Simulate customer purchase</p>
                </button>

                <button
                  onClick={() => setSimType('redeem')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    simType === 'redeem'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <Gift className={`w-8 h-8 mx-auto mb-2 ${
                    simType === 'redeem' ? 'text-purple-600' : 'text-gray-400'
                  }`} />
                  <p className={`font-bold ${
                    simType === 'redeem' ? 'text-purple-900' : 'text-gray-700'
                  }`}>Redeem Voucher</p>
                  <p className="text-xs text-gray-600 mt-1">Simulate voucher redemption</p>
                </button>
              </div>
            </div>

            {/* Customer Selection */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-bold text-black">
                  Step 1: Select Customer
                  {selectedUser && <span className="ml-2 text-green-600">✓</span>}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selectedUser?.id === user.id
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-700 rounded-full flex items-center justify-center text-white font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-black truncate">
                          {user.name} {user.surname || ''}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{user.phone}</p>
                        <p className="text-xs font-medium text-amber-700">
                          {user.points_balance} points
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Voucher Selection (only if redeem mode) */}
            {simType === 'redeem' && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="w-5 h-5 text-gray-700" />
                  <h3 className="text-lg font-bold text-black">
                    Step 2: Select Voucher
                    {selectedVoucher && <span className="ml-2 text-green-600">✓</span>}
                  </h3>
                </div>

                {!selectedUser ? (
                  <p className="text-center text-gray-500 py-8">
                    Please select a customer first
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {vouchers
                      .filter(v => !(v as any).is_staff_voucher && selectedUser.points_balance >= v.points_required)
                      .map((voucher) => (
                        <button
                          key={voucher.id}
                          onClick={() => handleSelectVoucher(voucher)}
                          className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-purple-400 transition-all"
                        >
                          <p className="font-bold text-black text-sm mb-1">{voucher.title}</p>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {voucher.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-green-700">
                              ฿{Number(voucher.cash_value).toFixed(2)}
                            </span>
                            <span className="text-xs font-bold text-amber-700">
                              {voucher.points_required} pts
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {mode === 'add-points' && selectedUser && (
          <div className="space-y-6">
            <CustomerPreviewCard
              customer={selectedUser}
              qrType="loyalty_id"
              showFullDetails={true}
            />

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-black">Add Points for Purchase</h3>
                <button
                  onClick={reset}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddPoints} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Purchase Amount (฿) *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-lg font-semibold"
                      placeholder="350.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mt-3 p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-amber-700" />
                        <span className="font-medium text-amber-900">Points to Award</span>
                      </div>
                      <span className="text-2xl font-bold text-amber-800">
                        +{calculatePoints()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Outlet Location *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Store className="w-5 h-5 text-gray-400" />
                    </div>
                    <select
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-base font-medium appearance-none bg-white"
                      value={outlet}
                      onChange={(e) => setOutlet(e.target.value)}
                      required
                    >
                      <option value="">-- Select Outlet --</option>
                      {outlets.map((o) => (
                        <option key={o.id} value={o.name}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                    disabled={loading || !amount}
                  >
                    {loading ? 'Processing...' : `Confirm & Add ${calculatePoints()} Points`}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {mode === 'redeem-voucher' && selectedUser && selectedVoucher && (
          <div className="space-y-6">
            <CustomerPreviewCard
              customer={selectedUser}
              qrType="voucher_redemption"
              showFullDetails={false}
            />

            <VoucherVerificationCard
              voucher={selectedVoucher}
              customerPointsAfterRedemption={selectedUser.points_balance - selectedVoucher.points_required}
              showFullDetails={true}
            />

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={handleRedeemVoucher}
                  className="flex-1 bg-green-600 text-white py-5 rounded-xl font-bold hover:bg-green-700 transition-all shadow-sm hover:shadow-md text-lg disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Redeem Voucher Now'}
                </button>
                <button
                  onClick={reset}
                  className="px-6 py-5 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'success' && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-green-200">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={60} className="text-green-600" />
            </div>
            <h3 className="text-3xl font-bold text-black mb-3">Success!</h3>
            <p className="text-gray-600 text-lg mb-8">Simulation completed successfully</p>
            <button
              onClick={reset}
              className="bg-black text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
            >
              Run Another Simulation
            </button>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
