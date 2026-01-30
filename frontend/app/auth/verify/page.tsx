'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { Fingerprint, X } from 'lucide-react';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'biometric_prompt' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [userData, setUserData] = useState<any>(null);
  const [settingUpBiometric, setSettingUpBiometric] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);

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
        const response = await api.get(`/auth/magic-link/verify/${token}`);
        const data = response.data;

        // Check if user needs to complete registration
        if (data.needs_registration && !data.token) {
          // Store partial data for registration flow
          sessionStorage.setItem('magic_link_data', JSON.stringify({
            email: data.email,
            company: data.company,
            employee: data.employee
          }));

          setStatus('success');
          setTimeout(() => {
            router.push('/register?from=magic-link');
          }, 1500);
          return;
        }

        const { token: jwtToken, user } = data;

        // Store auth
        setAuth(user, jwtToken);
        setUserData({ ...user, jwtToken });
        setVerificationComplete(true);
      } catch (err: any) {
        setStatus('error');
        setError(err.response?.data?.error || 'Failed to verify link');
      }
    };

    verifyToken();
  }, [searchParams, setAuth, router]);

  // Second effect: After verification and biometric check complete, decide next step
  useEffect(() => {
    if (!verificationComplete || biometricLoading || !userData) return;

    const isEmployee = userData.user_type === 'employee';
    const alreadySetUp = userData.email && hasCredentialFor(userData.email);

    // Only offer biometric setup for employees on supported devices
    if (isEmployee && biometricSupported && !biometricEnabled && !alreadySetUp) {
      setStatus('biometric_prompt');
    } else {
      setStatus('success');
      setTimeout(() => {
        router.push('/app/home');
      }, 1500);
    }
  }, [verificationComplete, biometricLoading, biometricSupported, biometricEnabled, userData, hasCredentialFor, router]);

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
              <div className="w-12 h-12 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Welcome!
              </h1>
              <p className="text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                You're signed in. Redirecting...
              </p>
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
                Link Invalid
              </h1>
              <p className="text-[#78716C] mb-6" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                {error || 'This link has expired or already been used.'}
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-[#1C1917] text-white py-3 rounded-xl font-medium hover:bg-[#292524] transition-colors"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Back to Login
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
