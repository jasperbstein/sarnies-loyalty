'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authAPI, referralsAPI } from '@/lib/api';
import { X } from 'lucide-react';

function LineCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'linked' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle LINE OAuth error
      if (errorParam) {
        setStatus('error');
        setError(errorDescription || 'LINE login was cancelled or failed.');
        return;
      }

      if (!code) {
        setStatus('error');
        setError('No authorization code received from LINE.');
        return;
      }

      try {
        // Exchange code for token
        const response = await authAPI.lineCallback(code, state || undefined);
        const { token, user, needs_registration, referral_code, company_invite_code, account_linked } = response.data;

        // Store auth - cast types to expected values
        const authUser = {
          ...user,
          type: user.type as 'customer' | 'employee' | 'staff',
          user_type: user.user_type as 'customer' | 'employee' | 'staff' | 'investor' | 'media' | undefined
        };
        setAuth(authUser, token);

        if (account_linked) {
          // Account was linked - redirect to profile
          setStatus('linked');
          setTimeout(() => {
            router.push('/app/profile');
          }, 1500);
        } else if (needs_registration) {
          // Redirect to registration with LINE context
          const params = new URLSearchParams();
          if (referral_code) params.set('ref', referral_code);
          if (company_invite_code) params.set('company', company_invite_code);
          params.set('from', 'line');

          setStatus('success');
          setTimeout(() => {
            router.push(`/register?${params.toString()}`);
          }, 1500);
        } else {
          // Apply referral if present
          if (referral_code) {
            try {
              await referralsAPI.applyCode({ code: referral_code });
            } catch {
              // Referral may already be applied or invalid
            }
          }

          setStatus('success');
          setTimeout(() => {
            router.push('/app/home');
          }, 1500);
        }
      } catch (err: any) {
        console.error('LINE callback error:', err);
        setStatus('error');

        const errorMessage = err.response?.data?.message;
        if (errorMessage) {
          setError(errorMessage);
        } else {
          setError('Unable to complete LINE login. Please try again.');
        }
      }
    };

    handleCallback();
  }, [searchParams, setAuth, router]);

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-8 text-center">
          {status === 'loading' && (
            <>
              {/* LINE Logo */}
              <div className="w-16 h-16 bg-[#06C755] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
              </div>
              <div className="w-8 h-8 border-4 border-[#E7E5E4] border-t-[#06C755] rounded-full animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Signing in with LINE...
              </h1>
              <p className="text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Please wait while we complete your login
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
                LINE Login Successful!
              </h1>
              <p className="text-[#78716C] mb-4" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Redirecting you now...
              </p>
            </>
          )}

          {status === 'linked' && (
            <>
              <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                LINE Account Linked!
              </h1>
              <p className="text-[#78716C] mb-4" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                You can now log in with LINE or your other methods.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-[#FEE2E2] rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-6 h-6 text-[#DC2626]" />
              </div>
              <h1 className="text-xl font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                Login Failed
              </h1>
              <p className="text-[#78716C] mb-6" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                {error || 'Unable to complete LINE login.'}
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
          <div className="w-12 h-12 border-4 border-[#E7E5E4] border-t-[#06C755] rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            Loading...
          </h1>
        </div>
      </div>
    </div>
  );
}

export default function LineCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LineCallbackContent />
    </Suspense>
  );
}
