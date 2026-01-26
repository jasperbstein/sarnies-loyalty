'use client';

import React, { useState, useEffect } from "react";
import { ProfileHeaderCard } from "@/components/customer/profile/ProfileHeaderCard";
import { QRCodeCard } from "@/components/customer/profile/QRCodeCard";
import { SummaryStatsGrid } from "@/components/customer/profile/SummaryStatsGrid";
import { DetailsList } from "@/components/customer/profile/DetailsList";
import { SettingsList } from "@/components/customer/profile/SettingsList";
import { Button } from "@/components/customer/ui/Button";
import { useAuthStore } from "@/lib/store";
import { X } from 'lucide-react';
import AppLayout from "@/components/AppLayout";
import { useTabSwipeNavigation } from "@/hooks/useSwipeNavigation";
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getBaseUrl } from '@/lib/config';

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [showPhoneChangeModal, setShowPhoneChangeModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Enable swipe navigation between tabs
  useTabSwipeNavigation();

  useEffect(() => {
    fetchQRCode();
  }, []);

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
      toast.error('Failed to load QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const isEmployee = user?.user_type === 'employee';

  const formatBirthday = (birthday?: string) => {
    if (!birthday) return "";
    const date = new Date(birthday);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}`;
  };

  const personalDetails = [
    { id: "firstName", label: "First name", value: user?.name || "" },
    { id: "lastName", label: "Last name", value: user?.surname || "" },
    {
      id: "phone",
      label: "Phone number",
      value: user?.phone || "",
      helper: "Contact support to change",
    },
    { id: "email", label: "Email", value: user?.email || "" },
    { id: "birthday", label: "Birthday (DD-MM)", value: formatBirthday(user?.birthday) },
    { id: "company", label: "Company", value: user?.company || "" },
    { id: "gender", label: "Gender", value: user?.gender || "" },
  ];

  const settingsItems = [
    {
      id: "phone",
      label: "Change phone number",
      description: "Update your contact information",
      onClick: () => setShowPhoneChangeModal(true),
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Manage your preferences",
      onClick: () => setShowNotificationsModal(true),
    },
    {
      id: "delete",
      label: "Deactivate account",
      description: "Archive your account (can be restored)",
      tone: "danger" as const,
      onClick: () => setShowDeleteModal(true),
    },
  ];

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout();
      router.push('/login');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="sarnies-title-sm text-black">
            PROFILE
          </h1>
        </header>

        <ProfileHeaderCard
          name={user?.name || "Guest"}
          memberId={user?.id?.toString().padStart(6, '0') || "000000"}
          phone={user?.phone || ""}
        />

        <QRCodeCard qrCodeUrl={qrCodeUrl || undefined} qrLoading={qrLoading} customerId={user?.customer_id} />

        {!isEmployee && (
          <SummaryStatsGrid
            points={user?.points_balance || 0}
            totalSpentDisplay={`฿${Number(user?.total_spend || 0).toLocaleString()}`}
            memberSinceDisplay={user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Nov 2025'}
          />
        )}

        {isEmployee && (
          <div className="bg-white rounded-xl p-5 border border-black/10">
            <h3 className="sarnies-caption text-black/50 mb-3">MEMBER SINCE</h3>
            <p className="sarnies-title-sm text-black">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase() : 'NOVEMBER 2025'}
            </p>
          </div>
        )}

        <DetailsList title="Personal Details" fields={personalDetails} />

        <SettingsList items={settingsItems} />

        <button
          onClick={handleLogout}
          className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-black/90 transition-colors active:scale-[0.98]"
        >
          <span className="sarnies-subhead">LOGOUT</span>
        </button>

        <p className="mt-2 sarnies-caption text-center text-black/30">
          SARNIES LOYALTY V2.0.0
        </p>
      </div>

      {/* Phone Change Modal */}
      {showPhoneChangeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPhoneChangeModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-black/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="sarnies-headline text-black">CHANGE PHONE NUMBER</h2>
              <button onClick={() => setShowPhoneChangeModal(false)} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                <X size={20} className="text-black/60" />
              </button>
            </div>
            <p className="sarnies-body text-black/60 mb-4">
              Contact support to update your phone number for security reasons.
            </p>
            <div className="bg-black/5 p-4 rounded-lg mb-4 border border-black/10">
              <p className="sarnies-footnote text-black">Support: +66 2 xxx xxxx</p>
              <p className="sarnies-footnote text-black">Email: support@sarnies.com</p>
            </div>
            <button
              onClick={() => setShowPhoneChangeModal(false)}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-black/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNotificationsModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-black/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="sarnies-headline text-black">NOTIFICATIONS</h2>
              <button onClick={() => setShowNotificationsModal(false)} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                <X size={20} className="text-black/60" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="sarnies-subhead text-black">SMS Notifications</p>
                  <p className="sarnies-footnote text-black/50">Receive updates via SMS</p>
                </div>
                <input type="checkbox" className="w-5 h-5 rounded border-black/30 accent-black" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="sarnies-subhead text-black">Email Notifications</p>
                  <p className="sarnies-footnote text-black/50">Receive updates via email</p>
                </div>
                <input type="checkbox" className="w-5 h-5 rounded border-black/30 accent-black" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="sarnies-subhead text-black">Promotional Offers</p>
                  <p className="sarnies-footnote text-black/50">Get special deals and offers</p>
                </div>
                <input type="checkbox" className="w-5 h-5 rounded border-black/30 accent-black" defaultChecked />
              </div>
            </div>
            <button
              onClick={() => setShowNotificationsModal(false)}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-black/90 transition-colors mt-6"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* Deactivate Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-black/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="sarnies-headline text-red-600">DEACTIVATE ACCOUNT</h2>
              <button onClick={() => setShowDeleteModal(false)} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                <X size={20} className="text-black/60" />
              </button>
            </div>
            <p className="sarnies-body text-black/60 mb-4">
              Your account will be archived and can be restored by contacting support. Your points and data will be preserved.
            </p>
            <div className="bg-amber-50 p-4 rounded-lg mb-4 border border-amber-200">
              <p className="sarnies-footnote text-amber-800">You won't be able to access your account after deactivation</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-white border-2 border-black/10 text-black py-3 rounded-xl font-semibold hover:bg-black/5 transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors">
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
