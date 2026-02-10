'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { referralsAPI, companiesAPI } from '@/lib/api';
import { Gift, AlertCircle, Loader2, Building2, Users, Sparkles } from 'lucide-react';

interface ReferralValidation {
  valid: boolean;
  referrerName?: string;
  error?: string;
}

interface CompanyInviteData {
  type: 'personal' | 'company';
  invite_type?: 'employee' | 'customer'; // NEW: employee benefits vs regular customer
  direct_access?: boolean;
  requires_verification?: boolean;
  invite_id?: number;
  email?: string;
  verification_options?: {
    email_domain?: string;
    access_code?: boolean;
  };
  company: {
    id: number;
    name: string;
    slug?: string;
    logo_url?: string;
    discount_percentage?: number;
    description?: string;
  };
  error?: string;
}

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  const companyCode = searchParams.get('company');

  const [validation, setValidation] = useState<ReferralValidation | null>(null);
  const [companyInvite, setCompanyInvite] = useState<CompanyInviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateAndRedirect = async () => {
      // Handle company invite code
      if (companyCode) {
        try {
          const response = await companiesAPI.lookupJoinCode(companyCode);
          const data = response.data;

          setCompanyInvite(data);

          // Store company invite info in sessionStorage
          sessionStorage.setItem('company_invite_code', companyCode);
          sessionStorage.setItem('company_invite_data', JSON.stringify(data));

          // Redirect to login with company context
          setTimeout(() => {
            router.replace(`/login?company=${companyCode}`);
          }, 2500);
        } catch (err: any) {
          const status = err.response?.status;
          const errorMessage = err.response?.data?.error || 'Invalid invite code';

          if (status === 410) {
            // Personal invite expired or used
            setError(err.response?.data?.error || 'This invite link is no longer valid');
          } else if (status === 404) {
            setError('Invalid invite code. Please check the link and try again.');
          } else {
            setError(errorMessage);
          }
        } finally {
          setLoading(false);
        }
        return;
      }

      // Handle referral code
      if (refCode) {
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
        } catch (err: any) {
          const errorMessage = err.response?.data?.message || 'Unable to validate referral code.';
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
        return;
      }

      // No code provided, redirect to login
      router.replace('/login');
    };

    validateAndRedirect();
  }, [refCode, companyCode, router]);

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
              {companyCode ? 'Validating invite link...' : 'Validating referral link...'}
            </p>
          </div>
        )}

        {/* Valid Company Invite */}
        {!loading && companyInvite && !error && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7E5E4] text-center">
            {/* Company Logo or Icon */}
            {companyInvite.company.logo_url ? (
              <div className="w-20 h-20 mx-auto mb-4 rounded-xl overflow-hidden border border-stone-100">
                <img
                  src={companyInvite.company.logo_url}
                  alt={companyInvite.company.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-[#FEF3C7] rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-[#D97706]" />
              </div>
            )}

            <h2
              className="text-[20px] font-bold text-[#1C1917] mb-2"
              style={{ fontFamily: 'Spline Sans, sans-serif' }}
            >
              {companyInvite.type === 'personal' ? 'You\'re Invited!' : 'Join via ' + companyInvite.company.name}
            </h2>

            <p
              className="text-[14px] text-[#57534E] mb-4"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              {companyInvite.invite_type === 'customer' ? (
                <>Join <span className="font-semibold text-[#1C1917]">{companyInvite.company.name}</span> Loyalty and start earning rewards</>
              ) : companyInvite.type === 'personal' ? (
                <>You've been invited to join the <span className="font-semibold text-[#1C1917]">{companyInvite.company.name}</span> team</>
              ) : (
                <>Join <span className="font-semibold text-[#1C1917]">{companyInvite.company.name}</span>'s employee benefits program</>
              )}
            </p>

            {/* Benefits - different for employee vs customer */}
            {companyInvite.invite_type === 'customer' ? (
              <div className="bg-[#FEF3C7] border border-[#FCD34D] rounded-xl p-4 mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gift className="w-4 h-4 text-[#D97706]" />
                  <p
                    className="text-[13px] font-semibold text-[#92400E]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Loyalty Rewards
                  </p>
                </div>
                <p
                  className="text-[12px] text-[#92400E]"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Earn points on every purchase and unlock exclusive rewards
                </p>
              </div>
            ) : (
              <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4 mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#059669]" />
                  <p
                    className="text-[13px] font-semibold text-[#065F46]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Employee Benefits
                  </p>
                </div>
                {companyInvite.company.discount_percentage && (
                  <p
                    className="text-[12px] text-[#065F46]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    {companyInvite.company.discount_percentage}% discount on all purchases
                  </p>
                )}
              </div>
            )}

            {companyInvite.type === 'personal' && companyInvite.email && (
              <p
                className="text-[12px] text-[#78716C] mb-4"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                This invite is for: <span className="font-medium">{companyInvite.email}</span>
              </p>
            )}

            <div className="flex items-center justify-center gap-2 mt-6">
              <Loader2 className="w-4 h-4 text-[#78716C] animate-spin" />
              <p
                className="text-[12px] text-[#78716C]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Redirecting to sign in...
              </p>
            </div>
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

        {/* Error State (for company invites) */}
        {!loading && error && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7E5E4] text-center">
            <div className="w-16 h-16 bg-[#FEF2F2] rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-[#DC2626]" />
            </div>
            <h2
              className="text-[20px] font-bold text-[#1C1917] mb-2"
              style={{ fontFamily: 'Spline Sans, sans-serif' }}
            >
              Invalid Invite
            </h2>
            <p
              className="text-[14px] text-[#57534E] mb-6"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              {error}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-[#1C1917] text-white py-3 rounded-xl font-medium hover:bg-[#292524] transition-colors"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Go to Login
            </button>
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
