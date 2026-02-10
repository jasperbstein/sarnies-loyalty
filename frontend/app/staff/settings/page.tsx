'use client';

import StaffLayout from '@/components/StaffLayout';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, MapPin, LogOut, Bell, Volume2, Fingerprint } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import toast from 'react-hot-toast';

const SETTINGS_KEY = 'sarnies_staff_settings';

interface StaffSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

function loadSettings(): StaffSettings {
  if (typeof window === 'undefined') return { soundEnabled: true, vibrationEnabled: true };
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { soundEnabled: true, vibrationEnabled: true };
}

function saveSettings(settings: StaffSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export default function StaffSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [settingUpBiometric, setSettingUpBiometric] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const settings = loadSettings();
    setSoundEnabled(settings.soundEnabled);
    setVibrationEnabled(settings.vibrationEnabled);
    setMounted(true);
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (mounted) {
      saveSettings({ soundEnabled, vibrationEnabled });
    }
  }, [soundEnabled, vibrationEnabled, mounted]);

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
            className="flex items-center gap-2 text-stone-500 mb-4 hover:text-stone-700"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-stone-900">
            Settings
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Outlet and app preferences
          </p>
        </div>

        <div className="px-5 pb-6 space-y-6">
          {/* Outlet Info */}
          <div>
            <p className="text-xs font-semibold text-stone-500 tracking-wider mb-3 uppercase">
              Outlet
            </p>
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-stone-900">
                    {outletName}
                  </p>
                  <p className="text-xs text-stone-500">
                    Currently logged in
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <p className="text-xs font-semibold text-stone-500 tracking-wider mb-3 uppercase">
              Preferences
            </p>
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {/* Sound */}
              <div className="flex items-center gap-4 px-4 py-4 border-b border-stone-100">
                <Volume2 className="w-5 h-5 text-stone-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-900">
                    Scan Sounds
                  </p>
                  <p className="text-xs text-stone-500">
                    Play sound on scan
                  </p>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    soundEnabled ? 'bg-amber-600' : 'bg-stone-200'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Vibration */}
              <div className="flex items-center gap-4 px-4 py-4">
                <Bell className="w-5 h-5 text-stone-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-900">
                    Vibration
                  </p>
                  <p className="text-xs text-stone-500">
                    Vibrate on scan feedback
                  </p>
                </div>
                <button
                  onClick={() => setVibrationEnabled(!vibrationEnabled)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    vibrationEnabled ? 'bg-amber-600' : 'bg-stone-200'
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
              <p className="text-xs font-semibold text-stone-500 tracking-wider mb-3 uppercase">
                Security
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
                      hasBiometricSetup ? 'bg-amber-600' : 'bg-stone-200'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      hasBiometricSetup ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
              {!hasBiometricSetup && (
                <p className="text-xs text-stone-500 mt-2 px-1">
                  Enable to sign in instantly using Face ID or Touch ID instead of magic links.
                </p>
              )}
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl border border-red-500 text-red-500 font-medium transition-colors hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>

          {/* Version */}
          <p className="text-center text-xs text-stone-400">
            Sarnies Staff v2.0.0
          </p>
        </div>
      </div>
    </StaffLayout>
  );
}
