'use client';

import { useState, useRef, useEffect } from 'react';
import StaffLayout from '@/components/StaffLayout';
import QRScanner, { QRScannerRef } from '@/components/QRScanner';
import CustomerPreviewCard from '@/components/CustomerPreviewCard';
import EligibleRewardsCard from '@/components/EligibleRewardsCard';
import VoucherVerificationCard from '@/components/VoucherVerificationCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import api, { transactionsAPI, collabsAPI } from '@/lib/api';
import { CheckCircle, X, Calculator, Store, AlertCircle, DollarSign, Camera, Edit3, MapPin, Info, UserPlus, Building2, Gift, Percent } from 'lucide-react';
import toast from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '@/lib/store';

type ScanMode = 'scan' | 'manual-entry' | 'add-points' | 'redeem-voucher' | 'redeem-collab' | 'success' | 'error';

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
  const [collabOfferDetails, setCollabOfferDetails] = useState<any>(null);
  const [collabRedemptionToken, setCollabRedemptionToken] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [outlets, setOutlets] = useState<{ id: number; name: string }[]>([]);
  const qrScannerRef = useRef<QRScannerRef>(null);

  // Initialize client-side only state
  useEffect(() => {
    setIsMounted(true);
    if (user?.branch) {
      setOutlet(user.branch);
    }
  }, [user?.branch]);

  // Fetch outlets on mount
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const response = await api.get('/outlets');
        setOutlets(response.data || []);
      } catch (error) {
        console.error('Failed to fetch outlets:', error);
      }
    };
    fetchOutlets();
  }, []);

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
      return;
    }

    // Prevent race conditions from rapid/duplicate scans
    if (processingRef.current) {
      return;
    }

    processingRef.current = true;
    setLoading(true);
    setErrorMessage('');

    try {
      let parsedData;
      let isJWT = false;

      // Try to parse as JSON first
      try {
        parsedData = JSON.parse(scannedData);
      } catch {
        // Not JSON, try to decode as JWT
        try {
          const decoded: any = jwtDecode(scannedData);
          parsedData = decoded;
          isJWT = true;
        } catch (jwtError) {
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
      } else if (parsedData.type === 'collab_redemption') {
        // Collab offer redemption QR
        const response = await api.get(`/users/${parsedData.customer_id}`);
        const offerResponse = await collabsAPI.getOffer(parsedData.offer_id);

        setQrData({
          type: 'collab_redemption',
          user: response.data,
          offer: offerResponse.data,
          token: parsedData.token
        });
        setCollabOfferDetails(offerResponse.data);
        setCollabRedemptionToken(parsedData.token);
        setMode('redeem-collab');
        playSuccessSound();
        triggerHaptic('success');
      } else if (parsedData.type === 'loyalty_id' || isJWT) {
        // Static loyalty QR (JWT token or JSON with loyalty_id type)
        let userId = parsedData.id || parsedData.customer_id || parsedData.userId;

        if (!userId) {
          throw new Error('Customer ID not found in QR code');
        }

        // Convert to integer if it's a string
        if (typeof userId === 'string') {
          userId = parseInt(userId, 10);
        }

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

  const handleRedeemCollab = async () => {
    if (!qrData || !collabRedemptionToken) return;

    setLoading(true);
    try {
      await collabsAPI.verifyRedemption(collabRedemptionToken, outlet);

      toast.success('Partner offer redeemed successfully!');
      playSuccessSound();
      triggerHaptic('success');

      setMode('success');
      setTimeout(() => resetScan(), 6000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to redeem partner offer');
      playErrorSound();
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const getCollabDiscountDisplay = (offer: any) => {
    if (!offer) return '';
    switch (offer.discount_type) {
      case 'percentage':
        return `${offer.discount_value}% off`;
      case 'fixed':
        return `$${offer.discount_value} off`;
      case 'free_item':
        return 'Free item';
      default:
        return '';
    }
  };

  const getCollabDiscountIcon = (offer: any) => {
    if (!offer) return <Gift className="w-5 h-5" />;
    switch (offer.discount_type) {
      case 'percentage':
        return <Percent className="w-5 h-5" />;
      case 'fixed':
        return <DollarSign className="w-5 h-5" />;
      case 'free_item':
        return <Gift className="w-5 h-5" />;
      default:
        return <Gift className="w-5 h-5" />;
    }
  };

  const resetScan = () => {
    setMode('scan');
    setQrData(null);
    setAmount('');
    setManualCustomerId('');
    // Don't reset outlet - keep staff's branch
    setVoucherDetails(null);
    setCollabOfferDetails(null);
    setCollabRedemptionToken('');
    setErrorMessage('');
    setShowConfirmModal(false);
    setPendingReward(null);
    processingRef.current = false;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const outletName = user?.branch || 'Sarnies';

  return (
    <StaffLayout>
      <div className="max-w-xl mx-auto px-4 py-5">
        {/* Hero Card - Premium Dark with Subtle Gradient */}
        <div
          className="rounded-3xl p-6 mb-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #1c1917 0%, #292524 100%)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)'
          }}
        >
          {/* Subtle shine effect */}
          <div
            className="absolute top-0 right-0 w-32 h-32 opacity-[0.03]"
            style={{
              background: 'radial-gradient(circle, white 0%, transparent 70%)'
            }}
          />

          <div className="flex items-start justify-between mb-4 relative">
            <div>
              <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-[0.2em] mb-1.5">
                Current Outlet
              </p>
              <h1 className="text-xl font-semibold text-white tracking-tight">
                {isMounted ? outletName : '...'}
              </h1>
            </div>
            <div className="text-right">
              <p className="text-3xl font-light text-white font-mono tabular-nums tracking-tight" suppressHydrationWarning>
                {formatTime(currentTime)}
              </p>
              <p className="text-[11px] text-stone-500 mt-1 tracking-wide" suppressHydrationWarning>
                {formatDate(currentTime)}
              </p>
            </div>
          </div>

          {/* Staff Info - Refined */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm text-white"
              style={{
                background: 'linear-gradient(145deg, #44403c 0%, #292524 100%)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
              }}
            >
              {isMounted && user?.name?.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-medium text-white">{isMounted ? user?.name : ''}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-[11px] text-stone-500 tracking-wide">On shift</span>
              </div>
            </div>
          </div>
        </div>

        {mode === 'scan' && (
          <div className="space-y-5">
            {/* Primary Action Card */}
            <div
              className="bg-white rounded-3xl p-6"
              style={{
                boxShadow: '0 2px 12px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <div className="text-center mb-8">
                <h2 className="text-lg font-semibold text-stone-900 tracking-tight mb-1">
                  Scan Customer QR
                </h2>
                <p className="text-sm text-stone-400">
                  Camera scan or manual entry
                </p>
              </div>

              {/* Action Buttons - Premium styling */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    qrScannerRef.current?.startScanner();
                  }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold text-[15px] text-white active:scale-[0.98] transition-all"
                  style={{
                    background: 'linear-gradient(145deg, #1c1917 0%, #292524 100%)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  <Camera size={20} />
                  Start Camera Scan
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('manual-entry');
                    setManualCustomerId('');
                  }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-2xl font-medium text-[15px] active:scale-[0.98] transition-all border border-stone-100"
                >
                  <Edit3 size={18} />
                  Enter Code Manually
                </button>
              </div>
            </div>

            {/* QR Scanner Component */}
            <QRScanner ref={qrScannerRef} onScan={handleScan} />
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
            <div
              className="bg-white rounded-3xl p-6"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-stone-900 tracking-tight">Add Points</h3>
                <button
                  onClick={resetScan}
                  className="w-9 h-9 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center hover:bg-stone-100 transition-colors"
                >
                  <X size={18} className="text-stone-400" />
                </button>
              </div>

              <form onSubmit={handleAddPoints} className="space-y-5">
                {/* Receipt Amount */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                    Purchase Amount
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg font-medium">
                      ฿
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full pl-10 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 focus:border-stone-900 focus:bg-white text-lg font-semibold text-stone-900 transition-all placeholder:text-stone-300"
                      placeholder="350.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  {/* Points Preview Card */}
                  {amount && parseFloat(amount) > 0 && (
                    <div
                      className="mt-4 rounded-2xl p-4"
                      style={{
                        background: 'linear-gradient(145deg, #fef3c7 0%, #fde68a 100%)',
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.12)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(145deg, #f59e0b 0%, #d97706 100%)',
                              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)'
                            }}
                          >
                            <Calculator className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-amber-900">Points to Award</span>
                        </div>
                        <span className="text-2xl font-bold text-amber-700">
                          +{calculatePoints()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Outlet */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                    Outlet Location
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Store className="w-4 h-4 text-stone-400" />
                    </div>
                    <select
                      className="w-full pl-11 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 focus:border-stone-900 focus:bg-white text-base font-medium appearance-none transition-all"
                      value={outlet}
                      onChange={(e) => setOutlet(e.target.value)}
                      required
                    >
                      <option value="">Select outlet</option>
                      {outlets.map((o) => (
                        <option key={o.id} value={o.name}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-4 rounded-2xl font-semibold text-[15px] text-white active:scale-[0.98] transition-all disabled:opacity-50"
                    style={{
                      background: loading || !amount || parseFloat(amount) <= 0
                        ? '#d6d3d1'
                        : 'linear-gradient(145deg, #1c1917 0%, #292524 100%)',
                      boxShadow: loading || !amount || parseFloat(amount) <= 0 ? 'none' : '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                    disabled={loading || !amount || parseFloat(amount) <= 0}
                  >
                    {loading ? 'Processing...' : amount && parseFloat(amount) > 0 ? `Add ${calculatePoints()} Points` : 'Enter Amount'}
                  </button>
                  <button
                    type="button"
                    onClick={resetScan}
                    className="px-6 py-4 bg-stone-50 hover:bg-stone-100 text-stone-500 rounded-2xl font-medium transition-colors border border-stone-100 disabled:opacity-50"
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
              <div className="bg-white rounded-2xl p-5">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Employee Perks</h3>

                {qrData.vouchers && qrData.vouchers.length > 0 ? (
                  <div className="space-y-2.5">
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
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          voucher.available_today === 0
                            ? 'bg-stone-50 border-stone-200 opacity-50 cursor-not-allowed'
                            : voucherDetails?.id === voucher.id
                            ? 'bg-green-50 border-green-400'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-stone-900">{voucher.title}</h4>
                            <p className="text-sm text-stone-500 mt-0.5 line-clamp-1">{voucher.description}</p>
                            <span className={`text-xs font-medium mt-1.5 inline-block ${
                              voucher.available_today > 0 ? 'text-green-600' : 'text-stone-400'
                            }`}>
                              {voucher.available_today}/{voucher.max_redemptions_per_user_per_day || '∞'} left today
                            </span>
                          </div>
                          {voucher.available_today === 0 && (
                            <span className="px-2.5 py-1 bg-stone-100 text-stone-500 text-xs font-medium rounded-full">
                              Used
                            </span>
                          )}
                          {voucherDetails?.id === voucher.id && (
                            <CheckCircle className="w-5 h-5 text-green-500 ml-3" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-400 text-center py-4 text-sm">No perks available</p>
                )}

                {voucherDetails && (
                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={handleRedeemVoucher}
                      className="flex-1 bg-green-600 text-white py-3.5 rounded-xl font-semibold hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50"
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Confirm Redemption'}
                    </button>
                    <button
                      onClick={resetScan}
                      className="px-5 py-3.5 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-colors"
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
                <div className="bg-white rounded-2xl p-5">
                  <div className="flex gap-3">
                    <button
                      onClick={handleRedeemVoucher}
                      className="flex-1 bg-green-600 text-white py-4 rounded-xl font-semibold text-[15px] hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50"
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Redeem Voucher'}
                    </button>
                    <button
                      onClick={resetScan}
                      className="px-5 py-4 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-colors"
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

        {mode === 'redeem-collab' && qrData && collabOfferDetails && (
          <div className="space-y-6">
            {/* Customer Preview */}
            <CustomerPreviewCard
              customer={qrData.user}
              qrType="loyalty_id"
              showFullDetails={false}
            />

            {/* Collab Offer Details */}
            <div
              className="bg-white rounded-3xl overflow-hidden"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
            >
              {/* Partner Badge Header */}
              <div
                className="p-5"
                style={{
                  background: 'linear-gradient(145deg, #f3e8ff 0%, #e9d5ff 100%)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
                    style={{
                      background: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}
                  >
                    {collabOfferDetails.offering_company_logo ? (
                      <img
                        src={collabOfferDetails.offering_company_logo}
                        alt={collabOfferDetails.offering_company_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="w-6 h-6 text-purple-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">
                        Partner Offer
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-purple-900">
                      {collabOfferDetails.offering_company_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Offer Details */}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-stone-900 mb-2">
                  {collabOfferDetails.title}
                </h3>

                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
                    style={{
                      background: 'linear-gradient(145deg, #f3e8ff 0%, #e9d5ff 100%)',
                      color: '#7c3aed'
                    }}
                  >
                    {getCollabDiscountIcon(collabOfferDetails)}
                    {getCollabDiscountDisplay(collabOfferDetails)}
                  </span>
                </div>

                {collabOfferDetails.description && (
                  <p className="text-sm text-stone-500 mb-4">
                    {collabOfferDetails.description}
                  </p>
                )}

                {/* Info Box */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: 'linear-gradient(145deg, #fefce8 0%, #fef3c7 100%)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[13px] text-amber-700">
                      This customer is from <strong>{collabOfferDetails.target_company_name}</strong>.
                      Apply the discount and confirm the redemption.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 pt-0">
                <div className="flex gap-3">
                  <button
                    onClick={handleRedeemCollab}
                    className="flex-1 py-4 rounded-2xl font-semibold text-[15px] text-white active:scale-[0.98] transition-all disabled:opacity-50"
                    style={{
                      background: loading
                        ? '#d6d3d1'
                        : 'linear-gradient(145deg, #7c3aed 0%, #6d28d9 100%)',
                      boxShadow: loading ? 'none' : '0 2px 8px rgba(124, 58, 237, 0.3)'
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Confirm Redemption'}
                  </button>
                  <button
                    onClick={resetScan}
                    className="px-5 py-4 bg-stone-50 hover:bg-stone-100 text-stone-500 rounded-2xl font-medium transition-colors border border-stone-100"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'success' && (
          <div
            className="bg-white rounded-3xl p-10 text-center"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{
                background: 'linear-gradient(145deg, #dcfce7 0%, #bbf7d0 100%)',
                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.15)'
              }}
            >
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h3 className="text-2xl font-semibold text-stone-900 tracking-tight mb-2">Success!</h3>
            <p className="text-stone-400 mb-8">Transaction completed</p>
            <button
              onClick={resetScan}
              className="px-8 py-4 rounded-2xl font-semibold text-[15px] text-white active:scale-[0.98] transition-all"
              style={{
                background: 'linear-gradient(145deg, #1c1917 0%, #292524 100%)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              Scan Next Customer
            </button>
          </div>
        )}

        {mode === 'error' && (
          <div
            className="bg-white rounded-3xl p-10 text-center"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{
                background: 'linear-gradient(145deg, #fee2e2 0%, #fecaca 100%)',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.15)'
              }}
            >
              <AlertCircle size={40} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-semibold text-stone-900 tracking-tight mb-2">Scan Failed</h3>
            <p className="text-stone-400 mb-8">{errorMessage}</p>
            <button
              onClick={resetScan}
              className="px-8 py-4 rounded-2xl font-semibold text-[15px] text-white active:scale-[0.98] transition-all"
              style={{
                background: 'linear-gradient(145deg, #1c1917 0%, #292524 100%)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {mode === 'manual-entry' && (
          <div className="space-y-5">
            <div
              className="bg-white rounded-3xl p-6"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
            >
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-stone-900 tracking-tight mb-1">
                  Manual Entry
                </h2>
                <p className="text-sm text-stone-400">
                  Enter customer ID or phone number
                </p>
              </div>

              <form onSubmit={handleManualEntry} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                    Customer ID
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 focus:border-stone-900 focus:bg-white text-base font-medium transition-all placeholder:text-stone-300"
                    placeholder="e.g., 123 or member ID"
                    value={manualCustomerId}
                    onChange={(e) => setManualCustomerId(e.target.value)}
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-stone-400 mt-2 ml-1">
                    Customer can find their ID in Profile
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-4 rounded-2xl font-semibold text-[15px] text-white active:scale-[0.98] transition-all disabled:opacity-50"
                    style={{
                      background: loading || !manualCustomerId.trim()
                        ? '#d6d3d1'
                        : 'linear-gradient(145deg, #1c1917 0%, #292524 100%)',
                      boxShadow: loading || !manualCustomerId.trim() ? 'none' : '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                    disabled={loading || !manualCustomerId.trim()}
                  >
                    {loading ? 'Searching...' : 'Find Customer'}
                  </button>
                  <button
                    type="button"
                    onClick={resetScan}
                    className="px-6 py-4 bg-stone-50 hover:bg-stone-100 text-stone-500 rounded-2xl font-medium transition-colors border border-stone-100"
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-3xl max-w-sm w-full p-6 animate-scale-up"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            >
              <div className="text-center mb-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: 'linear-gradient(145deg, #fef3c7 0%, #fde68a 100%)',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
                  }}
                >
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold text-stone-900 tracking-tight mb-2">Apply Reward?</h3>
                <p className="text-sm text-stone-500">
                  Apply <strong className="text-stone-900">{pendingReward.title}</strong> to this transaction?
                </p>
              </div>

              <div
                className="rounded-2xl p-4 mb-6"
                style={{ background: 'linear-gradient(145deg, #fefce8 0%, #fef3c7 100%)' }}
              >
                <p className="text-[13px] text-amber-700 text-center font-medium">
                  Please confirm with the customer before proceeding
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelApplyReward}
                  className="flex-1 py-4 px-4 bg-stone-50 hover:bg-stone-100 text-stone-500 rounded-2xl font-medium transition-colors border border-stone-100"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApplyReward}
                  className="flex-1 py-4 px-4 rounded-2xl font-semibold text-white active:scale-[0.98] transition-all"
                  style={{
                    background: 'linear-gradient(145deg, #16a34a 0%, #15803d 100%)',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
