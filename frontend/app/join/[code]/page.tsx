'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { authAPI } from '@/lib/api';
import { Building2, AlertCircle, Loader2, Gift, Percent, CheckCircle, Mail, Key, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface Company {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  discount_percentage?: number;
  description?: string;
}

interface InviteData {
  type: 'personal' | 'company';
  direct_access: boolean;
  requires_verification?: boolean;
  invite_id?: number;
  email?: string;
  verification_options?: {
    email_domain: string | null;
    access_code: boolean;
  };
  company: Company;
}

type VerificationStep = 'options' | 'email' | 'access_code' | 'verified';

function JoinCompanyContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const refCode = searchParams.get('ref');

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification state
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('options');
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const validateCode = async () => {
      if (!code) {
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/companies/join/${code}`);
        setInviteData(response.data);

        // If personal invite with direct access, show login options immediately
        if (response.data.direct_access) {
          setVerificationStep('verified');
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('This invite code is no longer valid or has expired.');
        } else if (err.response?.status === 410) {
          setError(err.response.data.error || 'This invite link has expired.');
        } else {
          setError('Unable to validate invite code. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    validateCode();
  }, [code]);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);

    try {
      await api.post(`/companies/join/${code}/verify-email`, { email });
      toast.success('Verification email sent! Check your inbox.');
      // TODO: Redirect to magic link waiting page or show message
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error(err.response.data.error || 'Email domain not allowed');
      } else {
        toast.error('Failed to send verification email');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);

    try {
      await api.post(`/companies/join/${code}/verify-access-code`, { access_code: accessCode });
      toast.success('Verified!');
      setVerificationStep('verified');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid access code');
    } finally {
      setVerifying(false);
    }
  };

  const handleLineLogin = async () => {
    try {
      // Store company info in session for the callback to pick up
      sessionStorage.setItem('company_invite_code', code);
      if (inviteData?.company) {
        sessionStorage.setItem('company_id', inviteData.company.id.toString());
        sessionStorage.setItem('company_name', inviteData.company.name);
      }

      // Get LINE auth URL with referral code and company code
      const response = await authAPI.getLineAuthUrl(undefined, refCode || undefined, code);
      window.location.href = response.data.auth_url;
    } catch (err) {
      setError('Failed to start LINE login. Please try again.');
    }
  };

  const handleContinueWithPhone = () => {
    // Store company info and redirect to login with company context
    sessionStorage.setItem('company_invite_code', code);
    if (inviteData?.company) {
      sessionStorage.setItem('company_id', inviteData.company.id.toString());
      sessionStorage.setItem('company_name', inviteData.company.name);
    }
    router.push(`/login?company=${code}${refCode ? `&ref=${refCode}` : ''}`);
  };

  const company = inviteData?.company;

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
              Validating invite code...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7E5E4] text-center">
            <div className="w-16 h-16 bg-[#FEF2F2] rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-[#DC2626]" />
            </div>
            <h2
              className="text-[20px] font-bold text-[#1C1917] mb-2"
              style={{ fontFamily: 'Spline Sans, sans-serif' }}
            >
              Invalid Invite Code
            </h2>
            <p
              className="text-[14px] text-[#57534E] mb-6"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              {error}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 bg-[#1C1917] text-white rounded-xl font-medium"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Continue to Login
            </button>
          </div>
        )}

        {/* Valid Invite - Show Verification or Login Options */}
        {!loading && !error && company && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7E5E4]">
            {/* Company Header */}
            <div className="text-center mb-6">
              {company.logo_url ? (
                <div className="w-20 h-20 mx-auto mb-4 relative">
                  <Image
                    src={company.logo_url}
                    alt={company.name}
                    fill
                    className="object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-[#FEF3C7] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-10 h-10 text-[#D97706]" />
                </div>
              )}
              <h2
                className="text-[20px] font-bold text-[#1C1917] mb-1"
                style={{ fontFamily: 'Spline Sans, sans-serif' }}
              >
                Join {company.name}
              </h2>
              <p
                className="text-[14px] text-[#57534E]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                {inviteData?.direct_access
                  ? "You've been invited to join the loyalty program"
                  : 'Verify your eligibility to join'}
              </p>
            </div>

            {/* Benefits (show in verified state or personal invite) */}
            {(verificationStep === 'verified' || inviteData?.direct_access) && (
              <>
                <div className="bg-[#F5F5F4] rounded-xl p-4 mb-6 space-y-3">
                  {company.discount_percentage && company.discount_percentage > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#ECFDF5] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Percent className="w-4 h-4 text-[#059669]" />
                      </div>
                      <span
                        className="text-[13px] text-[#44403C]"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        {company.discount_percentage}% discount on all purchases
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#FEF3C7] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Gift className="w-4 h-4 text-[#D97706]" />
                    </div>
                    <span
                      className="text-[13px] text-[#44403C]"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    >
                      Earn points on every purchase
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#EDE9FE] rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-[#7C3AED]" />
                    </div>
                    <span
                      className="text-[13px] text-[#44403C]"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    >
                      Exclusive member rewards
                    </span>
                  </div>
                </div>

                {/* Login Options */}
                <button
                  onClick={handleLineLogin}
                  className="w-full py-3.5 bg-[#06C755] text-white rounded-xl font-medium flex items-center justify-center gap-2 mb-3 hover:bg-[#05B64D] transition-colors"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                  Continue with LINE
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-[#E7E5E4]" />
                  <span
                    className="text-[12px] text-[#A8A29E]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    or
                  </span>
                  <div className="flex-1 h-px bg-[#E7E5E4]" />
                </div>

                <button
                  onClick={handleContinueWithPhone}
                  className="w-full py-3 bg-white border border-[#D6D3D1] text-[#1C1917] rounded-xl font-medium hover:bg-[#F5F5F4] transition-colors"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Continue with Phone or Email
                </button>
              </>
            )}

            {/* Verification Options (for company invite requiring verification) */}
            {verificationStep === 'options' && inviteData?.requires_verification && (
              <div className="space-y-3">
                <p
                  className="text-[13px] text-[#57534E] text-center mb-4"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  How would you like to verify?
                </p>

                {inviteData.verification_options?.email_domain && (
                  <button
                    onClick={() => setVerificationStep('email')}
                    className="w-full py-4 px-4 bg-white border border-[#D6D3D1] rounded-xl hover:bg-[#F5F5F4] transition-colors flex items-center gap-4"
                  >
                    <div className="w-10 h-10 bg-[#DBEAFE] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-[#2563EB]" />
                    </div>
                    <div className="text-left">
                      <p
                        className="text-[14px] font-medium text-[#1C1917]"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        Work Email
                      </p>
                      <p
                        className="text-[12px] text-[#78716C]"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        @{inviteData.verification_options.email_domain} emails only
                      </p>
                    </div>
                  </button>
                )}

                {inviteData.verification_options?.access_code && (
                  <button
                    onClick={() => setVerificationStep('access_code')}
                    className="w-full py-4 px-4 bg-white border border-[#D6D3D1] rounded-xl hover:bg-[#F5F5F4] transition-colors flex items-center gap-4"
                  >
                    <div className="w-10 h-10 bg-[#FEF3C7] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Key className="w-5 h-5 text-[#D97706]" />
                    </div>
                    <div className="text-left">
                      <p
                        className="text-[14px] font-medium text-[#1C1917]"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        Access Code
                      </p>
                      <p
                        className="text-[12px] text-[#78716C]"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        Enter code from HR
                      </p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Email Verification Form */}
            {verificationStep === 'email' && (
              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setVerificationStep('options')}
                  className="flex items-center gap-1 text-[13px] text-[#78716C] hover:text-[#1C1917] mb-2"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>

                <div>
                  <label
                    className="block text-[13px] font-medium text-[#44403C] mb-2"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`you@${inviteData?.verification_options?.email_domain || 'company.com'}`}
                    className="w-full px-4 py-3 border border-[#D6D3D1] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1C1917]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying}
                  className="w-full py-3 bg-[#1C1917] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Verification Email
                </button>
              </form>
            )}

            {/* Access Code Form */}
            {verificationStep === 'access_code' && (
              <form onSubmit={handleVerifyAccessCode} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setVerificationStep('options')}
                  className="flex items-center gap-1 text-[13px] text-[#78716C] hover:text-[#1C1917] mb-2"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>

                <div>
                  <label
                    className="block text-[13px] font-medium text-[#44403C] mb-2"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Access Code
                  </label>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character code"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-[#D6D3D1] rounded-xl text-[14px] text-center tracking-[0.3em] font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1C1917]"
                    required
                  />
                  <p
                    className="text-[11px] text-[#A8A29E] mt-2 text-center"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Get this code from your HR or manager
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={verifying || accessCode.length < 6}
                  className="w-full py-3 bg-[#1C1917] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <p
        className="text-[11px] text-[#D6D3D1] mt-auto mb-6 pt-6"
        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
      >
        &copy; 2025 Sarnies
      </p>
    </div>
  );
}

export default function JoinCompanyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
      </div>
    }>
      <JoinCompanyContent />
    </Suspense>
  );
}
