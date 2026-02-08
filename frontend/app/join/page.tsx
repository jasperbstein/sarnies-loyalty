'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { referralsAPI } from '@/lib/api';
import { Gift, AlertCircle, Loader2 } from 'lucide-react';

interface ReferralValidation {
  valid: boolean;
  referrerName?: string;
  error?: string;
}

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');

  const [validation, setValidation] = useState<ReferralValidation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateAndRedirect = async () => {
      if (!refCode) {
        // No referral code, redirect to login
        router.replace('/login');
        return;
      }

      try {
        const response = await referralsAPI.validateCode(refCode);

        if (response.data.valid) {
          setValidation({
            valid: true,
            referrerName: response.data.referrer_name
          });

          // Store in sessionStorage as backup
          sessionStorage.setItem('referral_code', refCode);

          // Brief delay to show the referrer info, then redirect
          setTimeout(() => {
            router.replace(`/login?ref=${refCode}`);
          }, 2000);
        } else {
          setValidation({
            valid: false,
            error: 'This referral link is no longer valid.'
          });

          // Redirect to login after showing error
          setTimeout(() => {
            router.replace('/login');
          }, 3000);
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Unable to validate referral code.';
        setValidation({
          valid: false,
          error: errorMessage
        });

        // Redirect to login after showing error
        setTimeout(() => {
          router.replace('/login');
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    validateAndRedirect();
  }, [refCode, router]);

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-[28px] font-bold text-[#1C1917] tracking-[6px] mb-2"
            style={{ fontFamily: 'Spline Sans, sans-serif' }}
          >
            SARNIES
          </h1>
          <p
            className="text-[14px] text-[#78716C]"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            Loyalty Rewards
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7E5E4] text-center">
            <Loader2 className="w-10 h-10 text-[#78716C] animate-spin mx-auto mb-4" />
            <p
              className="text-[14px] text-[#57534E]"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Validating referral link...
            </p>
          </div>
        )}

        {/* Valid Referral */}
        {!loading && validation?.valid && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7E5E4] text-center">
            <div className="w-16 h-16 bg-[#FEF3C7] rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-[#D97706]" />
            </div>
            <h2
              className="text-[20px] font-bold text-[#1C1917] mb-2"
              style={{ fontFamily: 'Spline Sans, sans-serif' }}
            >
              You&apos;ve been invited!
            </h2>
            <p
              className="text-[14px] text-[#57534E] mb-4"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              <span className="font-semibold text-[#1C1917]">{validation.referrerName}</span> invited you to join Sarnies Loyalty
            </p>
            <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-3">
              <p
                className="text-[13px] text-[#065F46]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Complete registration to earn bonus points!
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 mt-6">
              <Loader2 className="w-4 h-4 text-[#78716C] animate-spin" />
              <p
                className="text-[12px] text-[#78716C]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Redirecting to login...
              </p>
            </div>
          </div>
        )}

        {/* Invalid Referral */}
        {!loading && validation && !validation.valid && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7E5E4] text-center">
            <div className="w-16 h-16 bg-[#FEF2F2] rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-[#DC2626]" />
            </div>
            <h2
              className="text-[20px] font-bold text-[#1C1917] mb-2"
              style={{ fontFamily: 'Spline Sans, sans-serif' }}
            >
              Invalid Referral
            </h2>
            <p
              className="text-[14px] text-[#57534E] mb-4"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              {validation.error}
            </p>
            <p
              className="text-[13px] text-[#78716C]"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              You can still register without a referral code.
            </p>
            <div className="flex items-center justify-center gap-2 mt-6">
              <Loader2 className="w-4 h-4 text-[#78716C] animate-spin" />
              <p
                className="text-[12px] text-[#78716C]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Redirecting to login...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <p
        className="text-[11px] text-[#D6D3D1] mt-auto mb-6 pt-6"
        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
      >
        © 2025 Sarnies
      </p>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
