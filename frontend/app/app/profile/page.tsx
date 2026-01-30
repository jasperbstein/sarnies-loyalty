'use client';

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { X, User, CreditCard, Shield, Bell, Mail, ChevronRight, LogOut, Users, Copy, Check, Share2, Fingerprint, ArrowLeft } from 'lucide-react';
import AppLayout from "@/components/AppLayout";
import { useTabSwipeNavigation } from "@/hooks/useSwipeNavigation";
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getBaseUrl } from '@/lib/config';
import { referralsAPI } from '@/lib/api';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [showPhoneChangeModal, setShowPhoneChangeModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
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

  useTabSwipeNavigation();

  const isEmployee = user?.user_type === 'employee';
  const hasBiometricSetup = user?.email && hasCredentialFor(user.email);

  useEffect(() => {
    fetchQRCode();
    if (isEmployee) {
      fetchReferralCode();
    }
  }, [isEmployee]);

  const fetchReferralCode = async () => {
    try {
      const response = await referralsAPI.getMyCode();
      setReferralCode(response.data.referral_code);
    } catch (error) {
      console.error('Failed to fetch referral code:', error);
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
      // Disable biometric
      if (confirm('Disable Face ID / Touch ID login?')) {
        disableBiometric();
        toast.success('Biometric login disabled');
      }
    } else {
      // Enable biometric
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

  // Get initials for avatar
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
      <div className="flex flex-col min-h-screen bg-[#FAFAF9]">
        {/* Profile Section */}
        <div className="bg-[#FAFAF9] px-4 pt-6 pb-4 flex flex-col items-center">
          {/* Avatar - no shadow */}
          <div className="w-16 h-16 rounded-xl bg-[#F5F5F4] flex items-center justify-center mb-3">
            <span className="text-[20px] font-semibold text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              {getInitials()}
            </span>
          </div>

          {/* Name */}
          <h2 className="text-[18px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            {user?.name || 'User'} {user?.surname || ''}
          </h2>

          {/* Email */}
          <p className="text-[13px] text-[#78716C] mt-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            {user?.email || 'email@example.com'}
          </p>

          {/* Tier Badge */}
          <span className="mt-3 px-3 py-1 bg-[#F5F5F4] text-[#57534E] text-[12px] font-medium rounded-xl" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            {isEmployee ? 'Employee' : 'Gold Member'}
          </span>
        </div>

        {/* Content - 24px section gaps */}
        <div className="flex-1 px-4 pb-24 space-y-6">
          {/* Account Section */}
          <div>
            <p className="text-[11px] font-semibold text-[#78716C] tracking-[1px] mb-3">
              ACCOUNT
            </p>
            <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
              {/* Personal Information */}
              <button className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-[#FAFAF9] transition-colors border-b border-[#F0F0F0]">
                <User className="w-5 h-5 text-[#78716C]" />
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#1C1917]">Personal Information</p>
                  <p className="text-[13px] text-[#78716C]">Name, email, phone</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#A8A29E]" />
              </button>

              {/* Payment Methods */}
              <button className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-[#FAFAF9] transition-colors border-b border-[#F0F0F0]">
                <CreditCard className="w-5 h-5 text-[#78716C]" />
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#1C1917]">Payment Methods</p>
                  <p className="text-[13px] text-[#78716C]">Manage saved cards</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#A8A29E]" />
              </button>

              {/* Security */}
              <button
                onClick={() => setShowSecurityModal(true)}
                className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-[#FAFAF9] transition-colors"
              >
                <Shield className="w-5 h-5 text-[#78716C]" />
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#1C1917]">Security</p>
                  <p className="text-[13px] text-[#78716C]">
                    {isEmployee && biometricSupported ? 'Face ID, Touch ID' : 'Account security'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#A8A29E]" />
              </button>
            </div>
          </div>

          {/* Preferences Section */}
          <div>
            <p className="text-[11px] font-semibold text-[#78716C] tracking-[1px] mb-3">
              PREFERENCES
            </p>
            <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
              {/* Push Notifications */}
              <div className="flex items-center gap-4 px-4 py-4 border-b border-[#F0F0F0]">
                <Bell className="w-5 h-5 text-[#78716C]" />
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#1C1917]">Push Notifications</p>
                  <p className="text-[13px] text-[#78716C]">Receive push notifications</p>
                </div>
                <button
                  onClick={() => setPushEnabled(!pushEnabled)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    pushEnabled ? 'bg-[#1C1917]' : 'bg-[#E7E5E4]'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    pushEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Email Updates */}
              <div className="flex items-center gap-4 px-4 py-4">
                <Mail className="w-5 h-5 text-[#78716C]" />
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#1C1917]">Email Updates</p>
                  <p className="text-[13px] text-[#78716C]">Receive email notifications</p>
                </div>
                <button
                  onClick={() => setEmailEnabled(!emailEnabled)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    emailEnabled ? 'bg-[#1C1917]' : 'bg-[#E7E5E4]'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    emailEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Invite Friends Section - Employees Only */}
          {isEmployee && (
            <div>
              <p className="text-[11px] font-semibold text-[#78716C] tracking-[1px] mb-3 uppercase" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Invite Friends
              </p>
              <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden p-4">
                <p className="text-[13px] text-[#78716C] mb-4" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Share your code and both get rewarded when friends join!
                </p>

                {referralCode ? (
                  <div className="space-y-3">
                    <div className="bg-[#F5F5F4] rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-[#A8A29E] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Your referral code</p>
                        <p className="text-[18px] font-semibold text-[#1C1917] tracking-[2px] font-mono">{referralCode}</p>
                      </div>
                      <button
                        onClick={copyReferralCode}
                        className="w-10 h-10 rounded-xl bg-white border border-[#E7E5E4] flex items-center justify-center"
                      >
                        {copiedCode ? (
                          <Check className="w-4 h-4 text-[#16A34A]" />
                        ) : (
                          <Copy className="w-4 h-4 text-[#78716C]" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={shareReferralLink}
                      className="w-full bg-[#1C1917] text-white py-3 rounded-xl font-medium text-[14px] flex items-center justify-center gap-2 active:bg-[#292524] transition-colors"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    >
                      <Share2 className="w-4 h-4" />
                      Share Invite Link
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#F5F5F4] rounded-xl p-5 text-center">
                    <div className="w-5 h-5 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-[12px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Loading...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Log Out Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#E7E5E4] text-[#78716C] font-medium transition-colors active:bg-[#F5F5F4]"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            Log Out
          </button>

          {/* Version */}
          <p className="text-center text-[11px] text-[#A8A29E]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            Sarnies Loyalty v2.0.0
          </p>
        </div>
      </div>

      {/* Security Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 bg-[#FAFAF9]">
          {/* Header */}
          <div className="bg-[#FAFAF9] px-4 pt-4 pb-3 border-b border-[#E7E5E4]">
            <button
              onClick={() => setShowSecurityModal(false)}
              className="flex items-center gap-2 text-[#78716C]"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-[14px]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Back</span>
            </button>
            <h1 className="text-[20px] font-semibold text-[#1C1917] mt-3" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              Security
            </h1>
          </div>

          <div className="px-4 py-6 space-y-6">
            {/* Face ID / Touch ID - For Employees on supported devices */}
            {isEmployee && biometricSupported && !biometricLoading && (
              <div>
                <p className="text-[11px] font-semibold text-[#78716C] tracking-[1px] mb-3 uppercase" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Quick Login
                </p>
                <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
                  <div className="flex items-center gap-4 px-4 py-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      hasBiometricSetup ? 'bg-[#DCFCE7]' : 'bg-[#F5F5F4]'
                    }`}>
                      <Fingerprint className={`w-5 h-5 ${hasBiometricSetup ? 'text-[#16A34A]' : 'text-[#78716C]'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-medium text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                        Face ID / Touch ID
                      </p>
                      <p className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                        {hasBiometricSetup ? 'Enabled for quick login' : 'Sign in without magic link'}
                      </p>
                    </div>
                    <button
                      onClick={handleToggleBiometric}
                      disabled={settingUpBiometric}
                      className={`w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${
                        hasBiometricSetup ? 'bg-[#1C1917]' : 'bg-[#E7E5E4]'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        hasBiometricSetup ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
                <p className="text-[12px] text-[#78716C] mt-2 px-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  {hasBiometricSetup
                    ? 'You can sign in instantly using Face ID or Touch ID.'
                    : 'Enable to sign in instantly instead of using magic links every time.'}
                </p>
              </div>
            )}

            {/* Account Security Info */}
            <div>
              <p className="text-[11px] font-semibold text-[#78716C] tracking-[1px] mb-3 uppercase" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Account
              </p>
              <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
                <div className="px-4 py-4 border-b border-[#F0F0F0]">
                  <p className="text-[14px] font-medium text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    Login Method
                  </p>
                  <p className="text-[13px] text-[#78716C] mt-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    {isEmployee ? 'Magic Link (Email)' : 'Phone OTP'}
                  </p>
                </div>
                <div className="px-4 py-4">
                  <p className="text-[14px] font-medium text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    {isEmployee ? 'Email' : 'Phone'}
                  </p>
                  <p className="text-[13px] text-[#78716C] mt-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    {isEmployee ? user?.email : user?.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Delete Account */}
            <div>
              <p className="text-[11px] font-semibold text-[#78716C] tracking-[1px] mb-3 uppercase" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Danger Zone
              </p>
              <button
                onClick={() => {
                  toast.error('Please contact support to delete your account');
                }}
                className="w-full bg-white rounded-xl border border-[#E7E5E4] px-4 py-4 text-left"
              >
                <p className="text-[14px] font-medium text-[#DC2626]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Delete Account
                </p>
                <p className="text-[13px] text-[#78716C] mt-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Permanently delete your account and data
                </p>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
