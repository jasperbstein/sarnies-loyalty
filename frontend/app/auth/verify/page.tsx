'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api, { pinAuthAPI } from '@/lib/api';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { Fingerprint, X, Lock, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import PINInput from '@/components/PINInput';
import toast from 'react-hot-toast';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'pin_prompt' | 'biometric_prompt' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [userData, setUserData] = useState<any>(null);
  const [settingUpBiometric, setSettingUpBiometric] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [hasPinSetup, setHasPinSetup] = useState<boolean | null>(null);

  // PIN setup state
  const [pinStep, setPinStep] = useState<'enter' | 'confirm' | 'done'>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const {
    isSupported: biometricSupported,
    isEnabled: biometricEnabled,
    isLoading: biometricLoading,
    registerBiometric,
    hasCredentialFor,
  } = useBiometricAuth();

  // First effect: Verify the magic link token
  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setError('No token provided');
        return;
      }

      try {
        // Get remember_me preference from localStorage (set on login page)
        const rememberMe = localStorage.getItem('remember_me_preference') || '7d';
        const url = `/auth/magic-link/verify/${token}?remember_me=${rememberMe}`;
        const response = await api.get(url);
        const data = response.data;

        const { token: jwtToken, user, needs_registration } = data;

        // Store auth
        setAuth(user, jwtToken);
        setUserData({ ...user, jwtToken });

        // Check if user needs to complete registration
        if (needs_registration) {
          setStatus('success');
          setTimeout(() => {
            router.push(`/register?user_id=${user.id}`);
          }, 1500);
          return;
        }

        setVerificationComplete(true);
      } catch (err: any) {
        setStatus('error');
        const errorCode = err.response?.data?.error;
        const errorMessage = err.response?.data?.message;

        // Map error codes to user-friendly messages
        if (errorCode === 'magic_link_expired') {
          setError('This link has expired or has already been used. Please request a new one.');
        } else if (errorCode === 'rate_limit_exceeded') {
          setError('Too many attempts. Please wait a few minutes and try again.');
        } else if (errorMessage) {
          setError(errorMessage);
        } else {
          setError('Unable to verify link. Please request a new one.');
        }
      }
    };

    verifyToken();
  }, [searchParams, setAuth, router]);

  // Second effect: After verification complete, check if user has PIN and show prompt if not
  useEffect(() => {
    if (!verificationComplete || !userData) return;

    const checkPinStatus = async () => {
      try {
        console.log('[PIN Check] Checking PIN status for user...');
        const response = await pinAuthAPI.getStatus();
        const { pin_enabled } = response.data;
        console.log('[PIN Check] PIN enabled:', pin_enabled);
        setHasPinSetup(pin_enabled);

        if (!pin_enabled) {
          // User doesn't have PIN, show setup prompt
          console.log('[PIN Check] No PIN set, showing setup prompt');
          setStatus('pin_prompt');
        } else {
          // User already has PIN, just redirect
          console.log('[PIN Check] PIN already set, redirecting to home');
          setStatus('success');
          setTimeout(() => {
            router.push('/app/home');
          }, 1500);
        }
      } catch (err: any) {
        // Error checking PIN status - could be auth issue, show prompt anyway if user seems valid
        console.error('[PIN Check] Error checking PIN status:', err);
        // If the user has an email (meaning they just verified), show PIN prompt
        if (userData?.email) {
          console.log('[PIN Check] User has email, showing PIN prompt despite error');
          setStatus('pin_prompt');
        } else {
          // Really can't proceed, redirect to home
          setStatus('success');
          setTimeout(() => {
            router.push('/app/home');
          }, 1500);
        }
      }
    };

    checkPinStatus();
  }, [verificationComplete, userData, router]);

  const handleSetupBiometric = async () => {
    if (!userData) return;

    setSettingUpBiometric(true);
    try {
      const success = await registerBiometric(userData.email, userData.id);
      if (success) {
        setStatus('success');
        setTimeout(() => {
          router.push('/app/home');
        }, 1500);
      } else {
        // Registration failed, just continue without biometric
        router.push('/app/home');
      }
    } catch (error) {
      console.error('Biometric setup failed:', error);
      router.push('/app/home');
    } finally {
      setSettingUpBiometric(false);
    }
  };

  const handleSkipBiometric = () => {
    router.push('/app/home');
  };

  // PIN setup handlers
  const handlePinComplete = (value: string) => {
    if (pinStep === 'enter') {
      setPin(value);
      setPinStep('confirm');
      setConfirmPin('');
      setPinError('');
    }
  };

  const handleConfirmPinComplete = async (value: string) => {
    setConfirmPin(value);

    if (value !== pin) {
      setPinError('PINs do not match. Try again.');
      setConfirmPin('');
      return;
    }

    // Submit PIN
    setPinLoading(true);
    try {
      await pinAuthAPI.setup(value);
      setPinStep('done');
      toast.success('PIN set up! You can now sign in quickly.');
      // Redirect after short delay
      setTimeout(() => {
        router.push('/app/home');
      }, 2000);
    } catch (error: any) {
      setPinError(error.response?.data?.message || 'Failed to set up PIN');
      setConfirmPin('');
    } finally {
      setPinLoading(false);
    }
  };

  const handleSkipPin = () => {
    router.push('/app/home');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="w-12 h-12 border-4 border-[#E7E5E4] border-t-[#1C1917] rounded-full animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Verifying...
              </h1>
              <p className="text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Please wait while we sign you in
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                You're Signed In!
              </h1>
              <p className="text-[#78716C] mb-4" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                You can close this tab and return to the app.
              </p>
              <p className="text-[13px] text-[#A8A29E]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Or wait to be redirected automatically...
              </p>
            </>
          )}

          {status === 'pin_prompt' && (
            <>
              {pinStep === 'done' ? (
                <>
                  <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-[#059669]" />
                  </div>
                  <h1 className="text-xl font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    PIN Created!
                  </h1>
                  <p className="text-[14px] text-[#78716C] mb-4" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    Next time, just enter your email and PIN to sign in instantly.
                  </p>
                  <p className="text-[13px] text-[#A8A29E]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    Redirecting...
                  </p>
                </>
              ) : pinStep === 'enter' || pinStep === 'confirm' ? (
                <>
                  <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-6 h-6 text-stone-600" />
                  </div>
                  <h1 className="text-xl font-semibold text-[#1C1917] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    {pinStep === 'enter' ? 'Set up quick PIN login' : 'Confirm your PIN'}
                  </h1>
                  <p className="text-[14px] text-[#78716C] mb-6" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    {pinStep === 'enter'
                      ? 'Sign in instantly with a 6-digit PIN'
                      : 'Enter the same PIN again'}
                  </p>

                  {pinError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-[13px] text-red-700">{pinError}</p>
                    </div>
                  )}

                  <div className="flex justify-center mb-6">
                    {pinStep === 'enter' ? (
                      <PINInput
                        value={pin}
                        onChange={setPin}
                        onComplete={handlePinComplete}
                        disabled={pinLoading}
                        autoFocus
                      />
                    ) : (
                      <PINInput
                        value={confirmPin}
                        onChange={setConfirmPin}
                        onComplete={handleConfirmPinComplete}
                        disabled={pinLoading}
                        error={!!pinError}
                        autoFocus
                      />
                    )}
                  </div>

                  {pinLoading && (
                    <div className="flex items-center justify-center gap-2 text-stone-500 mb-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-[13px]">Setting up PIN...</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {pinStep === 'confirm' && (
                      <button
                        type="button"
                        onClick={() => {
                          setPinStep('enter');
                          setPin('');
                          setConfirmPin('');
                          setPinError('');
                        }}
                        disabled={pinLoading}
                        className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 text-[14px] font-medium hover:bg-stone-50 transition-colors disabled:opacity-50"
                      >
                        Back
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSkipPin}
                      disabled={pinLoading}
                      className={`${pinStep === 'confirm' ? 'flex-1' : 'w-full'} py-3 rounded-xl border border-stone-200 text-stone-500 text-[14px] font-medium hover:bg-stone-50 transition-colors disabled:opacity-50`}
                    >
                      Skip for now
                    </button>
                  </div>
                </>
              ) : null}
            </>
          )}

          {status === 'biometric_prompt' && (
            <>
              <div className="w-16 h-16 bg-[#FEF3C7] rounded-xl flex items-center justify-center mx-auto mb-5">
                <Fingerprint className="w-8 h-8 text-[#D97706]" />
              </div>
              <h1 className="text-xl font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Enable Face ID?
              </h1>
              <p className="text-[14px] text-[#78716C] mb-6" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Sign in instantly next time using Face ID or Touch ID. No more magic links!
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleSetupBiometric}
                  disabled={settingUpBiometric}
                  className="w-full h-14 bg-[#1C1917] text-white rounded-xl font-semibold text-[14px] hover:bg-[#292524] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  <Fingerprint className="w-5 h-5" />
                  {settingUpBiometric ? 'Setting up...' : 'Enable Face ID'}
                </button>
                <button
                  onClick={handleSkipBiometric}
                  className="w-full py-3 text-[14px] text-[#78716C] font-medium hover:text-[#1C1917] transition-colors"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Maybe later
                </button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-[#FEE2E2] rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-6 h-6 text-[#DC2626]" />
              </div>
              <h1 className="text-xl font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Link Expired
              </h1>
              <p className="text-[#78716C] mb-6" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                {error || 'This link has expired or already been used.'}
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-[#1C1917] text-white py-3 rounded-xl font-medium hover:bg-[#292524] transition-colors"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Request New Link
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-8 text-center">
          <div className="w-12 h-12 border-4 border-[#E7E5E4] border-t-[#1C1917] rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            Loading...
          </h1>
        </div>
      </div>
    </div>
  );
}

export default function VerifyMagicLinkPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyContent />
    </Suspense>
  );
}
