'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

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
        const { token: jwtToken, user } = response.data;

        // Store auth
        setAuth(user, jwtToken);

        setStatus('success');

        // Redirect after brief delay
        setTimeout(() => {
          router.push('/app/home');
        }, 1500);
      } catch (err: any) {
        setStatus('error');
        setError(err.response?.data?.error || 'Failed to verify link');
      }
    };

    verifyToken();
  }, [searchParams, setAuth, router]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-neutral-900 mb-2">
                Verifying...
              </h1>
              <p className="text-neutral-500">
                Please wait while we sign you in
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-neutral-900 mb-2">
                Welcome!
              </h1>
              <p className="text-neutral-500">
                You're signed in. Redirecting...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-neutral-900 mb-2">
                Link Invalid
              </h1>
              <p className="text-neutral-500 mb-6">
                {error || 'This link has expired or already been used.'}
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-neutral-900 text-white py-3 rounded-xl font-medium hover:bg-neutral-800 transition-colors"
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
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">
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
