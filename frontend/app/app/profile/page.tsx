'use client';

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { LogOut, Copy, Check, Share2, QrCode } from 'lucide-react';
import AppLayout from "@/components/AppLayout";
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getBaseUrl } from '@/lib/config';
import { referralsAPI } from '@/lib/api';
import { isEmployeeUser } from '@/lib/authUtils';

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const isEmployee = isEmployeeUser(user);

  useEffect(() => {
    fetchQRCode();
    fetchReferralCode();
  }, []);

  const fetchReferralCode = async () => {
    try {
      const response = await referralsAPI.getMyCode();
      setReferralCode(response.data.referral_code);
    } catch (error) {
      console.error('Failed to fetch referral code:', error);
      setReferralCode(null);
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
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${referralCode}`;
    const shareData = {
      title: 'Join Sarnies Loyalty',
      text: `Join me on Sarnies Loyalty and start earning rewards! Use my code: ${referralCode}`,
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

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout();
      router.push('/login');
    }
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
        <div className="max-w-md mx-auto w-full px-4 py-6">

          {/* Profile Header */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-4">
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mb-3">
                <span className="text-2xl font-semibold text-stone-500">
                  {getInitials()}
                </span>
              </div>

              {/* Name */}
              <h2 className="text-lg font-semibold text-stone-900">
                {user?.name || 'User'} {user?.surname || ''}
              </h2>

              {/* Email */}
              <p className="text-sm text-stone-500 mt-1">
                {user?.email || ''}
              </p>

              {/* Badge */}
              {isEmployee && (
                <span className="mt-3 px-3 py-1 text-xs font-medium rounded-full bg-stone-800 text-white">
                  Team Member
                </span>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-stone-400" />
              <h3 className="text-sm font-semibold text-stone-900">Your Member Code</h3>
            </div>

            <div className="flex justify-center">
              {qrLoading ? (
                <div className="w-48 h-48 bg-stone-100 rounded-xl flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                </div>
              ) : qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="Your QR Code"
                  className="w-48 h-48 rounded-xl"
                />
              ) : (
                <div className="w-48 h-48 bg-stone-100 rounded-xl flex items-center justify-center">
                  <p className="text-sm text-stone-400">QR not available</p>
                </div>
              )}
            </div>

            <p className="text-xs text-stone-500 text-center mt-3">
              Show this code when you visit
            </p>
          </div>

          {/* Share with Friends */}
          {referralCode && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="w-5 h-5 text-stone-400" />
                <h3 className="text-sm font-semibold text-stone-900">Share with Friends</h3>
              </div>

              <p className="text-sm text-stone-600 mb-4">
                Invite friends to join Sarnies Loyalty
              </p>

              {/* Referral Code Display */}
              <div className="bg-stone-50 rounded-xl p-4 mb-4">
                <p className="text-xs text-stone-500 mb-1">Your referral code</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-semibold text-stone-900 tracking-wider">
                    {referralCode}
                  </span>
                  <button
                    onClick={copyReferralCode}
                    className="p-2 text-stone-500 hover:text-stone-700"
                  >
                    {copiedCode ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Share Button */}
              <button
                onClick={shareReferralLink}
                className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share Link
              </button>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full bg-white rounded-2xl border border-stone-200 p-4 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log Out</span>
          </button>

        </div>
      </div>
    </AppLayout>
  );
}
