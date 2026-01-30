'use client';

import StaffLayout from '@/components/StaffLayout';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, MapPin, LogOut, ChevronRight, Bell, Volume2, Fingerprint } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import toast from 'react-hot-toast';

export default function StaffSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [settingUpBiometric, setSettingUpBiometric] = useState(false);

  const {
    isSupported: biometricSupported,
    isEnabled: biometricEnabled,
    isLoading: biometricLoading,
    registerBiometric,
    disableBiometric,
    hasCredentialFor,
  } = useBiometricAuth();

  const outletName = user?.branch || 'Raffles Place';
  const hasBiometricSetup = user?.email && hasCredentialFor(user.email);

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
          <h1 className="text-[24px] font-bold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            Settings
          </h1>
          <p className="text-[14px] text-[#78716C] mt-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            Outlet and app preferences
          </p>
        </div>

        <div className="px-5 pb-6 space-y-6">
          {/* Outlet Info */}
          <div>
            <p className="text-[11px] font-bold text-[#78716C] tracking-[1.5px] mb-3" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              OUTLET
            </p>
            <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-4">
                <div className="w-10 h-10 rounded-full bg-[#FEF3C7] flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#D97706]" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    {outletName}
                  </p>
                  <p className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    Currently logged in
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <p className="text-[11px] font-bold text-[#78716C] tracking-[1.5px] mb-3" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              PREFERENCES
            </p>
            <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
              {/* Sound */}
              <div className="flex items-center gap-4 px-4 py-4 border-b border-[#F0F0F0]">
                <Volume2 className="w-5 h-5 text-[#78716C]" />
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    Scan Sounds
                  </p>
                  <p className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    Play sound on scan
                  </p>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    soundEnabled ? 'bg-[#D97706]' : 'bg-[#E7E5E4]'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Vibration */}
              <div className="flex items-center gap-4 px-4 py-4">
                <Bell className="w-5 h-5 text-[#78716C]" />
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    Vibration
                  </p>
                  <p className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    Vibrate on scan feedback
                  </p>
                </div>
                <button
                  onClick={() => setVibrationEnabled(!vibrationEnabled)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    vibrationEnabled ? 'bg-[#D97706]' : 'bg-[#E7E5E4]'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    vibrationEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Security - Face ID / Touch ID */}
          {biometricSupported && !biometricLoading && (
            <div>
              <p className="text-[11px] font-bold text-[#78716C] tracking-[1.5px] mb-3" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                SECURITY
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
                      hasBiometricSetup ? 'bg-[#D97706]' : 'bg-[#E7E5E4]'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      hasBiometricSetup ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
              {!hasBiometricSetup && (
                <p className="text-[12px] text-[#78716C] mt-2 px-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Enable to sign in instantly using Face ID or Touch ID instead of magic links.
                </p>
              )}
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl border border-[#DC2626] text-[#DC2626] font-medium transition-colors hover:bg-[#FEF2F2]"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>

          {/* Version */}
          <p className="text-center text-[11px] text-[#A8A29E]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            Sarnies Staff v2.0.0
          </p>
        </div>
      </div>
    </StaffLayout>
  );
}
