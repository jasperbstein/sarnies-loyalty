'use client';

import { useState, useRef, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import QRScanner, { QRScannerRef } from '@/components/QRScanner';
import CustomerPreviewCard from '@/components/CustomerPreviewCard';
import EligibleRewardsCard from '@/components/EligibleRewardsCard';
import VoucherVerificationCard from '@/components/VoucherVerificationCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import api, { transactionsAPI } from '@/lib/api';
import { CheckCircle, X, Calculator, Store, AlertCircle, DollarSign, Camera, Edit3, MapPin, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '@/lib/store';

type ScanMode = 'scan' | 'manual-entry' | 'add-points' | 'redeem-voucher' | 'success' | 'error';

export default function StaffScanPage() {
  const { user } = useAuthStore();
  const [mode, setMode] = useState<ScanMode>('scan');
  const [qrData, setQrData] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [outlet, setOutlet] = useState('');
  const [loading, setLoading] = useState(false);
  const [voucherDetails, setVoucherDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [manualCustomerId, setManualCustomerId] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingReward, setPendingReward] = useState<{ id: number; title: string } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const qrScannerRef = useRef<QRScannerRef>(null);

  // Initialize client-side only state
  useEffect(() => {
    setIsMounted(true);
    if (user?.branch) {
      setOutlet(user.branch);
    }
  }, [user?.branch]);

  // Update time every second - only on client side
  useEffect(() => {
    // Set initial time on mount (client-side only)
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Race condition protection
  const processingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Get or create singleton AudioContext
  const getAudioContext = () => {
    if (!audioContextRef.current && typeof window !== 'undefined' && 'AudioContext' in window) {
      audioContextRef.current = new window.AudioContext();
    }
    return audioContextRef.current;
  };

  // Sound feedback
  const playSuccessSound = () => {
    const audioContext = getAudioContext();
    if (audioContext) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => oscillator.stop(), 100);
    }
  };

  const playErrorSound = () => {
    const audioContext = getAudioContext();
    if (audioContext) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 300;
      oscillator.type = 'sawtooth';
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => oscillator.stop(), 200);
    }
  };

  // Haptic feedback
  const triggerHaptic = (type: 'success' | 'error') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'success') {
        navigator.vibrate(100);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
    }
  };

  const handleScan = async (scannedData: string) => {
    // Ignore empty or very short scans (noise from scanner)
    if (!scannedData || scannedData.trim().length < 10) {
      console.log('Ignoring short/empty scan:', scannedData);
      return;
    }

    // Prevent race conditions from rapid/duplicate scans
    if (processingRef.current) {
      console.log('Already processing a scan, ignoring duplicate...');
      return;
    }

    processingRef.current = true;
    setLoading(true);
    setErrorMessage('');

    console.log('=== QR SCAN DEBUG ===');
    console.log('Raw scanned data:', scannedData);
    console.log('Data type:', typeof scannedData);
    console.log('Data length:', scannedData.length);

    try {
      let parsedData;
      let isJWT = false;

      // Try to parse as JSON first
      try {
        parsedData = JSON.parse(scannedData);
        console.log('Parsed as JSON:', parsedData);
      } catch {
        // Not JSON, try to decode as JWT
        try {
          const decoded: any = jwtDecode(scannedData);
          parsedData = decoded;
          isJWT = true;
          console.log('Decoded as JWT:', parsedData);
        } catch (jwtError) {
          console.error('JWT decode error:', jwtError);
          throw new Error('Invalid QR code format');
        }
      }

      // Handle different QR types
      if (parsedData.type === 'voucher_redemption') {
        // Dynamic voucher QR
        const response = await api.get(`/users/${parsedData.customer_id}`);
        const voucherResponse = await api.get(`/vouchers/${parsedData.voucher_id}`);

        setQrData({
          type: 'voucher_redemption',
          user: response.data,
          voucher: parsedData
        });
        setVoucherDetails(voucherResponse.data);
        setMode('redeem-voucher');
        playSuccessSound();
        triggerHaptic('success');
      } else if (parsedData.type === 'loyalty_id' || isJWT) {
        // Static loyalty QR (JWT token or JSON with loyalty_id type)
        let userId = parsedData.id || parsedData.customer_id || parsedData.userId;

        if (!userId) {
          console.error('Parsed QR data:', parsedData);
          throw new Error('Customer ID not found in QR code');
        }

        // Convert to integer if it's a string
        if (typeof userId === 'string') {
          userId = parseInt(userId, 10);
        }

        console.log('Fetching user with ID:', userId);
        const response = await api.get(`/users/${userId}`);
        const userData = response.data;

        // Check if user is an employee
        if (userData.user_type === 'employee') {
          // Fetch employee's available vouchers
          const vouchersResponse = await api.get(`/vouchers/employee/${userId}/available`);

          setQrData({
            type: 'employee_vouchers',
            user: userData,
            vouchers: vouchersResponse.data.vouchers
          });
          setMode('redeem-voucher'); // Reuse voucher mode for employees
        } else {
          setQrData({
            type: 'loyalty_id',
            user: userData
          });
          setMode('add-points');
        }

        playSuccessSound();
        triggerHaptic('success');
      } else {
        throw new Error('Unknown QR code type');
      }
    } catch (error: any) {
      console.error('QR Scan Error:', error);
      const message = error.response?.data?.error || error.message || 'Invalid QR code';
      setErrorMessage(message);
      setMode('error');
      playErrorSound();
      triggerHaptic('error');
      toast.error(message);
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  };

  const calculatePoints = () => {
    if (!amount) return 0;
    return Math.floor(parseFloat(amount) / 100);
  };

  const handleAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrData || !amount) return;

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Amount must be a positive number');
      playErrorSound();
      return;
    }

    if (amountNum > 100000) {
      toast.error('Amount seems unusually high. Please verify.');
      playErrorSound();
      return;
    }

    if (!outlet) {
      toast.error('Please select an outlet location');
      playErrorSound();
      return;
    }

    setLoading(true);
    try {
      const response = await transactionsAPI.earnPoints(
        qrData.user.id,
        amountNum,
        outlet
      );

      toast.success(`${response.data.points_earned} points added successfully!`);
      playSuccessSound();
      triggerHaptic('success');

      setMode('success');
      setTimeout(() => resetScan(), 6000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add points');
      playErrorSound();
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemVoucher = async () => {
    if (!qrData) return;

    setLoading(true);
    try {
      let voucherId: number;

      // Determine voucher ID based on type
      if (qrData.type === 'employee_vouchers') {
        // Employee voucher redemption - use selected voucher from voucherDetails
        if (!voucherDetails) {
          toast.error('Please select a voucher to redeem');
          playErrorSound();
          setLoading(false);
          return;
        }
        voucherId = voucherDetails.id;
      } else {
        // Regular customer voucher redemption
        voucherId = qrData.voucher.voucher_id;
      }

      const response = await transactionsAPI.redeemVoucher(
        qrData.user.id,
        voucherId,
        outlet
      );

      toast.success('Voucher redeemed successfully!');
      playSuccessSound();
      triggerHaptic('success');

      setMode('success');
      setTimeout(() => resetScan(), 6000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to redeem voucher');
      playErrorSound();
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCustomerId.trim()) {
      toast.error('Please enter customer ID');
      return;
    }

    setLoading(true);
    try {
      const userId = parseInt(manualCustomerId.trim(), 10);
      if (isNaN(userId)) {
        throw new Error('Invalid customer ID format');
      }

      const response = await api.get(`/users/${userId}`);
      setQrData({
        type: 'loyalty_id',
        user: response.data
      });
      setMode('add-points');
      playSuccessSound();
      triggerHaptic('success');
      toast.success('Customer found!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Customer not found';
      toast.error(message);
      playErrorSound();
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyReward = (rewardId: number, rewardTitle: string) => {
    setPendingReward({ id: rewardId, title: rewardTitle });
    setShowConfirmModal(true);
  };

  const confirmApplyReward = () => {
    if (!pendingReward) return;

    toast.success(`${pendingReward.title} applied to transaction!`);
    playSuccessSound();
    triggerHaptic('success');

    setShowConfirmModal(false);
    setPendingReward(null);
  };

  const cancelApplyReward = () => {
    setShowConfirmModal(false);
    setPendingReward(null);
  };

  const resetScan = () => {
    setMode('scan');
    setQrData(null);
    setAmount('');
    setManualCustomerId('');
    // Don't reset outlet - keep staff's branch
    setVoucherDetails(null);
    setErrorMessage('');
    setShowConfirmModal(false);
    setPendingReward(null);
    processingRef.current = false;
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        {/* Top Status Bar - Fixed Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                {isMounted && user?.name?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-base">{isMounted ? user?.name : ''}</p>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-gray-600">{isMounted ? (outlet || user?.branch || 'Not Set') : 'Not Set'}</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-green-700 font-medium text-xs">Active</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Time</p>
              <p className="text-xl font-bold text-gray-900 font-mono tabular-nums" suppressHydrationWarning>
                {formatTime(currentTime)}
              </p>
            </div>
          </div>
        </div>

        {mode === 'scan' && (
          <div className="space-y-6">
            {/* Primary Action Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Scan Customer QR</h1>
                <p className="text-sm text-gray-600">
                  Use camera to scan or enter code manually
                </p>
              </div>

              {/* Action Buttons - Primary/Secondary hierarchy */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    qrScannerRef.current?.startScanner();
                  }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-900 text-white rounded-xl font-semibold text-base hover:bg-gray-800 transition-colors shadow-sm"
                >
                  <Camera size={24} />
                  Start Camera Scan
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('manual-entry');
                    setManualCustomerId('');
                  }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-base hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  <Edit3 size={24} />
                  Enter Code Manually
                </button>
              </div>
            </div>

            {/* QR Scanner Component */}
            <QRScanner ref={qrScannerRef} onScan={handleScan} />

            {/* Staff Verification Checklist */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Verification Checklist</h3>
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Verify customer identity for high-value vouchers</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Check voucher has not expired (10-minute timer)</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Confirm outlet restrictions match current branch</span>
                </li>
              </ul>
            </div>

            {/* Scanning Tips */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Scanning Tips</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Ask customer to increase screen brightness</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Hold QR code 15–20 cm from camera</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Keep the code centered and steady</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Use manual entry if scanning fails</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {mode === 'add-points' && qrData && (
          <div className="space-y-6">
            {/* Customer Preview */}
            <CustomerPreviewCard
              customer={qrData.user}
              qrType="loyalty_id"
              showFullDetails={true}
            />

            {/* Eligible Rewards */}
            <EligibleRewardsCard
              customerId={qrData.user.id}
              pointsBalance={qrData.user.points_balance}
              onApplyReward={handleApplyReward}
            />

            {/* Add Points Form */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-black">Add Points for Purchase</h3>
                <button
                  onClick={resetScan}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddPoints} className="space-y-5">
                {/* Receipt Amount */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Purchase Amount (฿) *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-semibold">
                      ฿
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

                  {/* Points Preview Card - Only show if amount entered */}
                  {amount && parseFloat(amount) > 0 && (
                    <div className="mt-4 bg-gradient-to-br from-amber-50 via-amber-100 to-yellow-50 rounded-xl p-5 border-2 border-amber-300 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-amber-400 rounded-lg flex items-center justify-center shadow-sm">
                            <Calculator className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-bold text-base text-amber-900">Points to Award</span>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-lg border-2 border-amber-400 shadow-sm">
                          <span className="text-2xl font-black text-amber-700">
                            +{calculatePoints()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-amber-800 font-medium">
                        Customer earns <strong>1 point per ฿100</strong> spent
                      </p>
                    </div>
                  )}
                </div>

                {/* Outlet */}
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
                      <option value="Sukhumvit">Sarnies Sukhumvit</option>
                      <option value="Old Town">Sarnies Old Town</option>
                      <option value="Roastery">Sarnies Roastery</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className={`flex-1 py-4 rounded-xl font-bold transition-all shadow-sm ${
                      loading || !amount || parseFloat(amount) <= 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md'
                    }`}
                    disabled={loading || !amount || parseFloat(amount) <= 0}
                  >
                    {loading ? 'Processing...' : amount && parseFloat(amount) > 0 ? `Confirm & Add ${calculatePoints()} Points` : 'Enter Amount to Continue'}
                  </button>
                  <button
                    type="button"
                    onClick={resetScan}
                    className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {mode === 'redeem-voucher' && qrData && (qrData.type === 'employee_vouchers' || voucherDetails) && (
          <div className="space-y-6">
            {/* Customer Preview */}
            <CustomerPreviewCard
              customer={qrData.user}
              qrType={qrData.type === 'employee_vouchers' ? 'loyalty_id' : 'voucher_redemption'}
              showFullDetails={false}
            />

            {qrData.type === 'employee_vouchers' ? (
              /* Employee Vouchers List */
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Employee Benefits Available</h3>

                {qrData.vouchers && qrData.vouchers.length > 0 ? (
                  <div className="space-y-3">
                    {qrData.vouchers.map((voucher: any) => (
                      <button
                        key={voucher.id}
                        onClick={() => {
                          setVoucherDetails(voucher);
                          setQrData({
                            ...qrData,
                            selectedVoucher: voucher
                          });
                        }}
                        disabled={voucher.available_today === 0}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          voucher.available_today === 0
                            ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
                            : voucherDetails?.id === voucher.id
                            ? 'bg-green-50 border-green-500'
                            : 'bg-white border-gray-200 hover:border-green-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{voucher.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{voucher.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className={`text-sm font-medium ${
                                voucher.available_today > 0 ? 'text-green-600' : 'text-gray-500'
                              }`}>
                                Available today: {voucher.available_today}/{voucher.max_redemptions_per_user_per_day || '∞'}
                              </span>
                            </div>
                          </div>
                          {voucher.available_today === 0 && (
                            <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-full">
                              Used Today
                            </span>
                          )}
                          {voucherDetails?.id === voucher.id && (
                            <CheckCircle className="w-6 h-6 text-green-600 ml-3" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No employee benefits available</p>
                )}

                {voucherDetails && (
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={handleRedeemVoucher}
                      className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Confirm Redemption'}
                    </button>
                    <button
                      onClick={resetScan}
                      className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Regular Voucher Redemption */
              <>
                <VoucherVerificationCard
                  voucher={voucherDetails}
                  qrExpiry={qrData.voucher.expires_at}
                  customerPointsAfterRedemption={qrData.user.points_balance}
                  showFullDetails={true}
                />

                {/* Action Buttons */}
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
                      onClick={resetScan}
                      className="px-6 py-5 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {mode === 'success' && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-green-200">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={60} className="text-green-600" />
            </div>
            <h3 className="text-3xl font-bold text-black mb-3">Success!</h3>
            <p className="text-gray-600 text-lg mb-8">Transaction completed successfully</p>
            <button
              onClick={resetScan}
              className="bg-black text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
            >
              Scan Next Customer
            </button>
          </div>
        )}

        {mode === 'error' && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-red-200">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={60} className="text-red-600" />
            </div>
            <h3 className="text-3xl font-bold text-black mb-3">Scan Failed</h3>
            <p className="text-gray-600 text-lg mb-8">{errorMessage}</p>
            <button
              onClick={resetScan}
              className="bg-black text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
            >
              Try Again
            </button>
          </div>
        )}

        {mode === 'manual-entry' && (
          <div className="space-y-6">
            <div className="text-center mb-2">
              <h1 className="text-h2 text-sarnies-black mb-2">Manual Customer Entry</h1>
              <p className="text-sm text-sarnies-midgray">
                Enter customer ID or phone number
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <form onSubmit={handleManualEntry} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Customer ID *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-lg font-semibold"
                    placeholder="e.g., 123 or member ID"
                    value={manualCustomerId}
                    onChange={(e) => setManualCustomerId(e.target.value)}
                    autoFocus
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Customer can find their ID in the app under Profile
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                    disabled={loading || !manualCustomerId.trim()}
                  >
                    {loading ? 'Searching...' : 'Find Customer'}
                  </button>
                  <button
                    type="button"
                    onClick={resetScan}
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

        {/* Confirmation Modal */}
        {showConfirmModal && pendingReward && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirm Reward Application</h3>
                <p className="text-gray-600">
                  Are you sure you want to apply <strong className="text-gray-900">{pendingReward.title}</strong> to this transaction?
                </p>
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6">
                <p className="text-sm text-amber-900 font-medium text-center">
                  ⚠️ Please confirm with the customer before proceeding
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelApplyReward}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApplyReward}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 transition-all"
                >
                  Confirm & Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
