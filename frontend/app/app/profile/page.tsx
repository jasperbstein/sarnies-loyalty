'use client';

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { User, Shield, Bell, Mail, ChevronRight, LogOut, Copy, Check, Share2, Fingerprint, ArrowLeft, Lock } from 'lucide-react';
import AppLayout from "@/components/AppLayout";
import { useTabSwipeNavigation } from "@/hooks/useSwipeNavigation";
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getBaseUrl } from '@/lib/config';
import { referralsAPI } from '@/lib/api';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { usePINAuth } from '@/hooks/usePINAuth';
import { isEmployeeUser } from '@/lib/authUtils';
import AuthMethodsManager from '@/components/AuthMethodsManager';
import PINSetupModal from '@/components/PINSetupModal';

/**
 * ProfilePage - User profile and settings
 * Sarnies Design System v2.0
 *
 * Responsive breakpoints:
 * - Mobile: < 768px (single column)
 * - Tablet/Desktop: 768px+ (centered content, max-width)
 */

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralError, setReferralError] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [settingUpBiometric, setSettingUpBiometric] = useState(false);

  const {
    isSupported: biometricSupported,
    isEnabled: biometricEnabled,
    isLoading: biometricLoading,
    registerBiometric,
    disableBiometric,
    hasCredentialFor,
  } = useBiometricAuth();

  const {
    pinStatus,
    disablePIN,
    refreshStatus: refreshPINStatus,
    isLoading: pinLoading,
  } = usePINAuth();

  const [showPINSetupModal, setShowPINSetupModal] = useState(false);

  useTabSwipeNavigation();

  const isEmployee = isEmployeeUser(user);
  const hasBiometricSetup = user?.email && hasCredentialFor(user.email);

  useEffect(() => {
    fetchQRCode();
    if (isEmployee) {
      fetchReferralCode();
    }
  }, [isEmployee]);

  const fetchReferralCode = async () => {
    try {
      setReferralError(false);
      const response = await referralsAPI.getMyCode();
      setReferralCode(response.data.referral_code);
    } catch (error) {
      console.error('Failed to fetch referral code:', error);
      setReferralError(true);
      // Don't set a fake code - leave as null so share buttons are disabled
      setReferralCode(null);
    }
  };

  const copyReferralCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast.success('Code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareReferralLink = async () => {
    if (!referralCode) return;
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?ref=${referralCode}`;
    const shareData = {
      title: 'Join Sarnies',
      text: `Use my referral code ${referralCode} to get started with Sarnies!`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyReferralCode();
        }
      }
    } else {
      copyReferralCode();
    }
  };

  const fetchQRCode = async () => {
    if (!user || !token) return;

    setQrLoading(true);
    try {
      const response = await axios.get(`${getBaseUrl()}/api/users/${user.id}/static-qr`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQrCodeUrl(response.data.qr_code);
    } catch (error) {
      console.error('Failed to load QR code:', error);
    } finally {
      setQrLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout();
      router.push('/login');
    }
  };

  const handleToggleBiometric = async () => {
    if (!user?.email || !user?.id) return;

    if (hasBiometricSetup) {
      if (confirm('Disable Face ID / Touch ID login?')) {
        disableBiometric();
        toast.success('Biometric login disabled');
      }
    } else {
      setSettingUpBiometric(true);
      try {
        const success = await registerBiometric(user.email, user.id);
        if (success) {
          toast.success('Face ID / Touch ID enabled!');
        } else {
          toast.error('Failed to set up biometric login');
        }
      } catch (error) {
        console.error('Biometric setup error:', error);
        toast.error('Failed to set up biometric login');
      } finally {
        setSettingUpBiometric(false);
      }
    }
  };

  const handleTogglePIN = async () => {
    if (pinStatus?.pin_enabled) {
      if (confirm('Disable PIN login?')) {
        const success = await disablePIN();
        if (success) {
          toast.success('PIN disabled');
        }
      }
    } else {
      setShowPINSetupModal(true);
    }
  };

  const handlePINSetupSuccess = () => {
    refreshPINStatus();
  };

  const getInitials = () => {
    if (!user?.name) return 'U';
    const parts = user.name.split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen bg-stone-50">
        {/* Responsive container */}
        <div className="max-w-2xl mx-auto w-full">
          {/* Profile Section */}
          <div className="bg-stone-50 px-4 md:px-6 pt-6 pb-4 flex flex-col items-center">
            {/* Avatar */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-stone-100 flex items-center justify-center mb-3">
              <span className="text-2xl md:text-3xl font-semibold text-stone-500">
                {getInitials()}
              </span>
            </div>

            {/* Name */}
            <h2 className="text-lg md:text-xl font-semibold text-stone-900">
              {user?.name || 'User'} {user?.surname || ''}
            </h2>

            {/* Email/Phone */}
            <p className="text-sm text-stone-500 mt-1">
              {isEmployee ? user?.email : user?.phone || 'email@example.com'}
            </p>

            {/* Tier Badge */}
            <span className={`mt-3 px-3 py-1 text-xs font-medium rounded-full ${
              isEmployee ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {isEmployee ? 'Employee' : 'Gold Member'}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 px-4 md:px-6 pb-24 space-y-6">
            {/* Account Section */}
            <div>
              <p className="text-xs font-semibold text-stone-500 tracking-wider mb-3 uppercase">
                Account
              </p>
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                {/* Account Info - Display only */}
                <div className="px-4 py-4 border-b border-stone-100">
                  <div className="flex items-center gap-4">
                    <User className="w-5 h-5 text-stone-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900">{user?.name} {user?.surname}</p>
                      <p className="text-xs text-stone-500">{isEmployee ? user?.email : user?.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Security */}
                <button
                  onClick={() => setShowSecurityModal(true)}
                  className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-stone-50 transition-colors"
                >
                  <Shield className="w-5 h-5 text-stone-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-900">Security</p>
                    <p className="text-xs text-stone-500">
                      {isEmployee && biometricSupported ? 'Quick login with biometrics' : 'Account security settings'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-400" />
                </button>
              </div>
            </div>

            {/* Quick Login Section - PIN Setup */}
            {user?.email && (
              <div>
                <p className="text-xs font-semibold text-stone-500 tracking-wider mb-3 uppercase">
                  Quick Login
                </p>
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="flex items-center gap-4 px-4 py-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      pinStatus?.pin_enabled ? 'bg-green-100' : 'bg-stone-100'
                    }`}>
                      <Lock className={`w-5 h-5 ${pinStatus?.pin_enabled ? 'text-green-600' : 'text-stone-500'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900">
                        PIN Login
                      </p>
                      <p className="text-xs text-stone-500">
                        {pinStatus?.pin_enabled
                          ? 'Sign in with your 6-digit PIN'
                          : 'Skip magic link emails'}
                      </p>
                    </div>
                    {pinStatus?.pin_enabled ? (
                      <button
                        onClick={handleTogglePIN}
                        disabled={pinLoading}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowPINSetupModal(true)}
                        disabled={pinLoading}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 disabled:opacity-50"
                      >
                        Set Up
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Section */}
            <div>
              <p className="text-xs font-semibold text-stone-500 tracking-wider mb-3 uppercase">
                Preferences
              </p>
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                {/* Push Notifications */}
                <div className="flex items-center gap-4 px-4 py-4 border-b border-stone-100">
                  <Bell className="w-5 h-5 text-stone-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-900">Push Notifications</p>
                    <p className="text-xs text-stone-500">Receive push notifications</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPushEnabled(!pushEnabled)}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        pushEnabled ? 'bg-stone-900' : 'bg-stone-200'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        pushEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                    <span className={`text-[11px] font-medium w-6 ${pushEnabled ? 'text-stone-900' : 'text-stone-400'}`}>
                      {pushEnabled ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>

                {/* Email Updates */}
                <div className="flex items-center gap-4 px-4 py-4">
                  <Mail className="w-5 h-5 text-stone-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-900">Email Updates</p>
                    <p className="text-xs text-stone-500">Receive email notifications</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEmailEnabled(!emailEnabled)}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        emailEnabled ? 'bg-stone-900' : 'bg-stone-200'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        emailEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                    <span className={`text-[11px] font-medium w-6 ${emailEnabled ? 'text-stone-900' : 'text-stone-400'}`}>
                      {emailEnabled ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invite Friends Section - Employees Only */}
            {isEmployee && (
              <div>
                <p className="text-xs font-semibold text-stone-500 tracking-wider mb-3 uppercase">
                  Invite Friends
                </p>
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden p-4">
                  <p className="text-sm text-stone-500 mb-4">
                    Share your code and both get rewarded when friends join!
                  </p>

                  {referralCode ? (
                    <div className="space-y-3">
                      <div className="bg-stone-100 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-stone-400 mb-1">Your referral code</p>
                          <p className="text-lg font-bold text-stone-900 tracking-widest font-mono">{referralCode}</p>
                        </div>
                        <button
                          onClick={copyReferralCode}
                          className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-50 transition-colors"
                        >
                          {copiedCode ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-stone-500" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={shareReferralLink}
                        className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-stone-800 active:bg-stone-800 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        Share Invite Link
                      </button>
                    </div>
                  ) : referralError ? (
                    <div className="bg-stone-100 rounded-xl p-5 text-center">
                      <p className="text-sm text-stone-600 mb-2">Unable to load referral code</p>
                      <button
                        onClick={fetchReferralCode}
                        className="text-xs text-amber-600 font-medium"
                      >
                        Try again
                      </button>
                    </div>
                  ) : (
                    <div className="bg-stone-100 rounded-xl p-5 text-center">
                      <div className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-stone-500">Loading...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Log Out Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 text-red-600 font-medium transition-colors hover:bg-red-50 active:bg-red-100"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>

            {/* Version */}
            <p className="text-center text-xs text-stone-400">
              Sarnies Loyalty v2.0.0
            </p>
          </div>
        </div>
      </div>

      {/* PIN Setup Modal */}
      <PINSetupModal
        isOpen={showPINSetupModal}
        onClose={() => setShowPINSetupModal(false)}
        onSuccess={handlePINSetupSuccess}
      />

      {/* Security Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 bg-stone-50">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="bg-stone-50 px-4 md:px-6 pt-4 pb-3 border-b border-stone-200">
              <button
                onClick={() => setShowSecurityModal(false)}
                className="flex items-center gap-2 text-stone-500 hover:text-stone-700"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">Back</span>
              </button>
              <h1 className="text-xl font-semibold text-stone-900 mt-3">
                Security
              </h1>
            </div>

            <div className="px-4 md:px-6 py-6 space-y-6">
              {/* Face ID / Touch ID - For Employees on supported devices */}
              {isEmployee && biometricSupported && !biometricLoading && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 tracking-wider mb-3 uppercase">
                    Quick Login
                  </p>
                  <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                    <div className="flex items-center gap-4 px-4 py-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        hasBiometricSetup ? 'bg-green-100' : 'bg-stone-100'
                      }`}>
                        <Fingerprint className={`w-5 h-5 ${hasBiometricSetup ? 'text-green-600' : 'text-stone-500'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-stone-900">
                          Face ID / Touch ID
                        </p>
                        <p className="text-xs text-stone-500">
                          {hasBiometricSetup ? 'Enabled for quick login' : 'Sign in without magic link'}
                        </p>
                      </div>
                      <button
                        onClick={handleToggleBiometric}
                        disabled={settingUpBiometric}
                        className={`w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${
                          hasBiometricSetup ? 'bg-stone-900' : 'bg-stone-200'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                          hasBiometricSetup ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 mt-2 px-1">
                    {hasBiometricSetup
                      ? 'You can sign in instantly using Face ID or Touch ID.'
                      : 'Enable to sign in instantly instead of using magic links every time.'}
                  </p>
                </div>
              )}

              {/* PIN Login */}
              {user?.email && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 tracking-wider mb-3 uppercase">
                    PIN Login
                  </p>
                  <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                    <div className="flex items-center gap-4 px-4 py-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        pinStatus?.pin_enabled ? 'bg-green-100' : 'bg-stone-100'
                      }`}>
                        <Lock className={`w-5 h-5 ${pinStatus?.pin_enabled ? 'text-green-600' : 'text-stone-500'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-stone-900">
                          6-Digit PIN
                        </p>
                        <p className="text-xs text-stone-500">
                          {pinStatus?.pin_enabled ? 'PIN login enabled' : 'Quick login with a 6-digit PIN'}
                        </p>
                      </div>
                      <button
                        onClick={handleTogglePIN}
                        disabled={pinLoading}
                        className={`w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${
                          pinStatus?.pin_enabled ? 'bg-stone-900' : 'bg-stone-200'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                          pinStatus?.pin_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 mt-2 px-1">
                    {pinStatus?.pin_enabled
                      ? 'You can sign in with your 6-digit PIN instead of waiting for a magic link.'
                      : 'Set up a PIN to skip the magic link email next time you log in.'}
                  </p>
                </div>
              )}

              {/* Login Methods */}
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden p-4">
                <AuthMethodsManager />
              </div>

              {/* Delete Account */}
              <div>
                <p className="text-xs font-semibold text-stone-500 tracking-wider mb-3 uppercase">
                  Danger Zone
                </p>
                <button
                  onClick={() => {
                    toast.error('Please contact support to delete your account');
                  }}
                  className="w-full bg-white rounded-xl border border-stone-200 px-4 py-4 text-left hover:bg-stone-50 transition-colors"
                >
                  <p className="text-sm font-medium text-red-600">
                    Delete Account
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Permanently delete your account and data
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
