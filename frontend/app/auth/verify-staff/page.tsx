'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyStaffContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await api.get(`/auth/staff/verify/${token}`);
        const data = response.data;

        // Set user and token in store
        if (data.token && data.user) {
          setAuth(data.user, data.token);
          setUserData(data.user);
        }

        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
      } catch (error: any) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(error.response?.data?.error || 'Verification failed. The link may be invalid or expired.');
      }
    };

    verifyToken();
  }, [searchParams, setAuth]);

  const handleContinue = () => {
    router.push('/staff');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-5">
      <div className="max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#F5F5F4] flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-[#78716C] animate-spin" />
            </div>
            <p
              className="text-[16px] text-[#78716C]"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Verifying your email...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white rounded-2xl border border-[#E7E5E4] p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-[#16A34A]" />
            </div>

            <div>
              <h1
                className="text-[24px] font-bold text-[#1C1917]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Email Verified!
              </h1>
              <p
                className="text-[14px] text-[#78716C] mt-2"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                {message}
              </p>
            </div>

            {userData && (
              <div className="bg-[#F5F5F4] rounded-xl p-4 text-left">
                <p
                  className="text-[13px] text-[#78716C]"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Logged in as
                </p>
                <p
                  className="text-[16px] font-semibold text-[#1C1917] mt-1"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  {userData.name}
                </p>
                <p
                  className="text-[14px] text-[#78716C]"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  {userData.email} {userData.branch && `• ${userData.branch}`}
                </p>
              </div>
            )}

            <button
              onClick={handleContinue}
              className="w-full py-4 bg-[#1C1917] text-white rounded-xl font-semibold text-[16px] hover:bg-[#292524] transition-colors"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Continue to Staff Portal
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white rounded-2xl border border-[#E7E5E4] p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-[#DC2626]" />
            </div>

            <div>
              <h1
                className="text-[24px] font-bold text-[#1C1917]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Verification Failed
              </h1>
              <p
                className="text-[14px] text-[#78716C] mt-2"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                {message}
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/staff/register"
                className="block w-full py-4 bg-[#1C1917] text-white rounded-xl font-semibold text-[16px] hover:bg-[#292524] transition-colors text-center"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Try Again
              </Link>

              <Link
                href="/login"
                className="block w-full py-3 text-[#78716C] font-medium text-[14px] text-center"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyStaffPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyStaffContent />
    </Suspense>
  );
}
