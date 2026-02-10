'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle, Building2, Sparkles, Gift, Loader2, Percent, Lock } from 'lucide-react';
import PINInput from '@/components/PINInput';
import { pinAuthAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import api, { referralsAPI, authAPI, companiesAPI } from '@/lib/api';

type Step = 1 | 2 | 3;

// Check if user is registering as employee (via domain match or employee invite code)
const isEmployeeRegistration = (companyInfo: CompanyInfo | null, email: string): boolean => {
  // If company was set via employee invite code, it's employee registration
  if (companyInfo?.fromInviteCode && companyInfo?.inviteType === 'employee') return true;
  // If email domain matches company (without invite code), it's employee registration
  if (companyInfo && !companyInfo.fromInviteCode && email) return true;
  return false;
};

interface CompanyInfo {
  id: number;
  name: string;
  slug?: string;
  discount_percentage?: number;
  logo_url?: string;
  description?: string;
  fromInviteCode?: boolean; // Track if company was set via invite code
  inviteType?: 'employee' | 'customer'; // Type of invite
}

interface ReferralInfo {
  valid: boolean;
  referrerName?: string;
  code: string;
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateUser, setAuth, token } = useAuthStore();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [outlets, setOutlets] = useState<{ id: number; name: string }[]>([]);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // PIN setup state
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinStep, setPinStep] = useState<'enter' | 'confirm' | 'done'>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // LINE user detection
  const isFromLine = searchParams.get('from') === 'line' || !!(user as any)?.line_display_name;
  const hasRealPhone = user?.phone && !user.phone.startsWith('LINE') && !user.phone.startsWith('E');

  // Phone verification state for LINE users
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(!!hasRealPhone);

  // Form data
  const [formData, setFormData] = useState({
    phone: searchParams.get('phone') || (hasRealPhone ? user?.phone : '') || '',
    name: (user as any)?.line_display_name || user?.name || '',
    surname: user?.surname || '',
    email: searchParams.get('email') || user?.email || '',
    birthday: '', // DD-MM format
    gender: '',
    company: '', // Freetext
    email_consent: false,
    sms_consent: false,
    preferred_outlet: ''
  });

  // Check for referral code on mount
  useEffect(() => {
    const refCode = searchParams.get('ref') || sessionStorage.getItem('referral_code');
    if (refCode && !referralInfo) {
      validateReferralCode(refCode);
    }
  }, [searchParams]);

  // Check for company invite code on mount
  useEffect(() => {
    const companyCode = searchParams.get('company') || sessionStorage.getItem('company_invite_code');
    if (companyCode && !companyInfo) {
      fetchCompanyFromInviteCode(companyCode);
    }
  }, [searchParams]);

  const fetchCompanyFromInviteCode = async (code: string) => {
    try {
      // Try to get from session storage first (set by /join page)
      const storedData = sessionStorage.getItem('company_invite_data');
      let inviteData: any = null;

      if (storedData) {
        try {
          inviteData = JSON.parse(storedData);
        } catch {
          // Invalid JSON, fetch from API
        }
      }

      // If not in session, fetch from API
      if (!inviteData) {
        const response = await companiesAPI.lookupJoinCode(code);
        inviteData = response.data;
        sessionStorage.setItem('company_invite_data', JSON.stringify(inviteData));
      }

      if (inviteData?.company) {
        const isEmployeeInvite = inviteData.invite_type === 'employee';

        setCompanyInfo({
          ...inviteData.company,
          fromInviteCode: true,
          inviteType: inviteData.invite_type || 'employee'
        });

        // Store company code in session for registration
        sessionStorage.setItem('company_invite_code', code);

        if (isEmployeeInvite) {
          // Employee invite: auto-enable marketing consent
          handleChange('email_consent', true);
          handleChange('sms_consent', true);
          // Set company name for employees
          handleChange('company', inviteData.company.name);
        }
        // Customer invite: they join as regular customer, no special handling needed
      }
    } catch (error) {
      // Invalid or expired invite code - clear session storage
      sessionStorage.removeItem('company_invite_code');
      sessionStorage.removeItem('company_invite_data');
      console.error('Invalid company invite code:', error);
    }
  };

  // Redirect if already registered
  useEffect(() => {
    if ((user as any)?.registration_completed) {
      router.push('/app/home');
    }
  }, [user, router]);

  // Fetch outlets on mount
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const response = await api.get('/outlets');
        setOutlets(response.data || []);
      } catch (error) {
        console.error('Failed to fetch outlets:', error);
      }
    };
    fetchOutlets();
  }, []);

  // Check company eligibility when email changes
  useEffect(() => {
    const checkCompanyEligibility = async () => {
      if (formData.email && formData.email.includes('@')) {
        setCheckingEmail(true);
        try {
          const response = await api.post('/companies/verify-email', {
            email: formData.email
          });

          if (response.data.eligible) {
            setCompanyInfo(response.data.company);
            // Auto-enable marketing consent for employees
            handleChange('email_consent', true);
            handleChange('sms_consent', true);
            // Set company name for employees
            handleChange('company', response.data.company.name);
            toast.success(
              `Welcome ${response.data.company.name} team member!`,
              { duration: 3000 }
            );
          } else {
            setCompanyInfo(null);
          }
        } catch {
          setCompanyInfo(null);
        } finally {
          setCheckingEmail(false);
        }
      }
    };

    const timeoutId = setTimeout(checkCompanyEligibility, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  const validateReferralCode = async (code: string) => {
    setLoadingReferral(true);
    try {
      const response = await referralsAPI.validateCode(code);
      if (response.data.valid) {
        setReferralInfo({
          valid: true,
          referrerName: response.data.referrer_name,
          code: code
        });
      } else {
        setReferralInfo({ valid: false, code: code });
      }
    } catch {
      setReferralInfo({ valid: false, code: code });
    } finally {
      setLoadingReferral(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Phone verification for LINE users
  const sendPhoneOtp = async () => {
    if (!formData.phone) {
      toast.error('Please enter your phone number');
      return;
    }
    setVerifyingPhone(true);
    try {
      await api.post('/users/me/phone', { phone: formData.phone });
      setPhoneOtpSent(true);
      toast.success('Verification code sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send code');
    } finally {
      setVerifyingPhone(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setVerifyingPhone(true);
    try {
      await api.post('/users/me/phone/verify', { phone: formData.phone, otp: phoneOtp });
      setPhoneVerified(true);
      toast.success('Phone verified!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid code');
    } finally {
      setVerifyingPhone(false);
    }
  };

  const validateStep = (currentStep: Step): boolean => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        toast.error('Please enter your first name');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(3, prev + 1) as Step);
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(1, prev - 1) as Step);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(step)) return;

    setLoading(true);
    try {
      // Include user_id for LINE users who may not have phone
      // Include company_id if coming from invite code
      const registrationData = {
        ...formData,
        user_id: user?.id,
        company_id: companyInfo?.fromInviteCode ? companyInfo.id : undefined
      };
      const response = await authAPI.register(registrationData);

      const { token, user: updatedUser } = response.data;

      // Update auth store
      // Use backend-returned user_type (employee/customer) - don't hardcode!
      setAuth({ ...updatedUser, type: updatedUser.user_type || updatedUser.type || 'customer' }, token);

      // Apply referral if valid
      if (referralInfo?.valid) {
        try {
          await referralsAPI.applyCode({ code: referralInfo.code });
          toast.success(`Referral from ${referralInfo.referrerName} applied! You earned bonus points.`);
          // Clear from session storage
          sessionStorage.removeItem('referral_code');
        } catch {
          // Referral may already be applied
        }
      }

      toast.success('Registration complete! Welcome to Sarnies Loyalty');

      // Show success state instead of auto-redirecting
      setRegistrationComplete(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const canSkip = step === 2 || step === 3;

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

  const handleSkip = async () => {
    // Submit with current data
    setLoading(true);
    try {
      // Include user_id for LINE users who may not have phone
      // Include company_id if coming from invite code
      const registrationData = {
        ...formData,
        user_id: user?.id,
        company_id: companyInfo?.fromInviteCode ? companyInfo.id : undefined
      };
      const response = await authAPI.register(registrationData);
      const { token, user: updatedUser } = response.data;

      // Use backend-returned user_type (employee/customer) - don't hardcode!
      setAuth({ ...updatedUser, type: updatedUser.user_type || updatedUser.type || 'customer' }, token);

      // Apply referral if valid
      if (referralInfo?.valid) {
        try {
          await referralsAPI.applyCode({ code: referralInfo.code });
          sessionStorage.removeItem('referral_code');
        } catch {
          // Ignore
        }
      }

      router.push('/app/home');
    } catch {
      router.push('/app/home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      {/* Header */}
      <div className="pt-12 pb-6 px-6 flex flex-col items-center">
        <h1
          className="text-[24px] font-bold text-[#1C1917] tracking-[4px] mb-1"
          style={{ fontFamily: 'Spline Sans, sans-serif' }}
        >
          SARNIES
        </h1>
        <p
          className="text-[13px] text-[#78716C]"
          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
        >
          Complete Your Profile
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-5">
        <div className="w-full max-w-[420px]">
          {/* Company Invite Banner */}
          {companyInfo?.fromInviteCode && (
            <div className="mb-4 p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl">
              <div className="flex items-center gap-3">
                {companyInfo.logo_url ? (
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <img src={companyInfo.logo_url} alt={companyInfo.name} className="w-8 h-8 object-contain" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Building2 className="w-6 h-6 text-[#059669]" />
                  </div>
                )}
                <div className="flex-1">
                  <p
                    className="text-[14px] font-bold text-[#065F46]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Joining via {companyInfo.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {companyInfo.discount_percentage && companyInfo.discount_percentage > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#047857] bg-[#D1FAE5] px-2 py-0.5 rounded-full">
                        <Percent className="w-3 h-3" />
                        {companyInfo.discount_percentage}% off
                      </span>
                    )}
                    <span className="text-[11px] text-[#047857]">+ earn points</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Referral Banner */}
          {referralInfo?.valid && (
            <div className="mb-4 p-4 bg-[#FEF3C7] border border-[#F59E0B] rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F59E0B] rounded-full flex items-center justify-center flex-shrink-0">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p
                    className="text-[14px] font-bold text-[#92400E]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Referred by {referralInfo.referrerName}
                  </p>
                  <p
                    className="text-[12px] text-[#B45309]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Complete registration to earn bonus points!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[13px] font-semibold text-[#57534E]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Step {step} of 3
              </span>
              <span
                className="text-[12px] text-[#78716C]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                {Math.round((step / 3) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-[#E7E5E4] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#1C1917] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Success Screen */}
          {registrationComplete ? (
            <div className="bg-white rounded-2xl shadow-sm border border-[#E7E5E4] p-6 text-center">
              {!showPinSetup ? (
                <>
                  <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-[#059669]" />
                  </div>

                  <h2
                    className="text-[20px] font-bold text-[#1C1917] mb-2"
                    style={{ fontFamily: 'Spline Sans, sans-serif' }}
                  >
                    You're All Set!
                  </h2>

                  <p
                    className="text-[14px] text-[#78716C] mb-6"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Welcome to Sarnies{companyInfo ? `, ${formData.name}` : ''}! Your account is ready.
                  </p>

                  {/* PIN Setup Prompt */}
                  <div className="bg-[#F5F5F4] rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-stone-900 rounded-full flex items-center justify-center">
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p
                          className="text-[14px] font-semibold text-[#1C1917]"
                          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                        >
                          Set up quick PIN login
                        </p>
                        <p
                          className="text-[12px] text-[#78716C]"
                          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                        >
                          Sign in instantly with a 6-digit PIN
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPinSetup(true)}
                      className="w-full bg-stone-900 text-white py-2.5 rounded-lg text-[13px] font-semibold hover:bg-stone-800 transition-colors"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    >
                      Set Up PIN
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push('/app/home')}
                    className="w-full bg-white border border-stone-200 text-stone-700 py-3 rounded-xl text-[13px] font-medium hover:bg-stone-50 transition-all"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Skip for now
                  </button>
                </>
              ) : pinStep === 'done' ? (
                <>
                  <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-[#059669]" />
                  </div>

                  <h2
                    className="text-[20px] font-bold text-[#1C1917] mb-2"
                    style={{ fontFamily: 'Spline Sans, sans-serif' }}
                  >
                    PIN Created!
                  </h2>

                  <p
                    className="text-[14px] text-[#78716C] mb-6"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Next time, just enter your email and PIN to sign in instantly.
                  </p>

                  <button
                    type="button"
                    onClick={() => router.push('/app/home')}
                    className="w-full bg-[#1C1917] text-white py-3.5 rounded-xl text-[14px] font-bold hover:bg-[#292524] transition-all flex items-center justify-center gap-2"
                    style={{ fontFamily: 'Spline Sans, sans-serif', letterSpacing: '1px' }}
                  >
                    Let's Go
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-6 h-6 text-stone-600" />
                  </div>

                  <h2
                    className="text-[18px] font-bold text-[#1C1917] mb-1"
                    style={{ fontFamily: 'Spline Sans, sans-serif' }}
                  >
                    {pinStep === 'enter' ? 'Create your PIN' : 'Confirm your PIN'}
                  </h2>

                  <p
                    className="text-[13px] text-[#78716C] mb-6"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    {pinStep === 'enter'
                      ? 'Choose a 6-digit PIN you can remember'
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
                        className="flex-1 py-2.5 rounded-lg border border-stone-200 text-stone-600 text-[13px] font-medium hover:bg-stone-50 transition-colors disabled:opacity-50"
                      >
                        Back
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSkipPin}
                      disabled={pinLoading}
                      className={`${pinStep === 'confirm' ? 'flex-1' : 'w-full'} py-2.5 rounded-lg border border-stone-200 text-stone-500 text-[13px] font-medium hover:bg-stone-50 transition-colors disabled:opacity-50`}
                    >
                      Skip
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
          /* Form Card */
          <div className="bg-white rounded-2xl shadow-sm border border-[#E7E5E4] p-6">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-5">
                  <h2
                    className="text-[18px] font-bold text-[#1C1917] mb-4"
                    style={{ fontFamily: 'Spline Sans, sans-serif' }}
                  >
                    Basic Information
                  </h2>

                  {/* Phone verification for LINE users */}
                  {isFromLine && !hasRealPhone && (
                    <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl mb-4">
                      <p className="text-[13px] font-semibold text-[#166534] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                        Add your phone number
                      </p>
                      <p className="text-[11px] text-[#15803D] mb-3" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                        Link your phone to earn points at the counter
                      </p>

                      {!phoneOtpSent ? (
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            className="flex-1 h-[44px] px-3 rounded-lg border border-[#D1D5DB] text-[14px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#166534]"
                            placeholder="+66 812 345 678"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={sendPhoneOtp}
                            disabled={verifyingPhone || !formData.phone}
                            className="px-4 h-[44px] bg-[#166534] text-white rounded-lg text-[13px] font-semibold disabled:opacity-50"
                          >
                            {verifyingPhone ? 'Sending...' : 'Verify'}
                          </button>
                        </div>
                      ) : !phoneVerified ? (
                        <div className="space-y-2">
                          <p className="text-[12px] text-[#15803D]">Enter the code sent to {formData.phone}</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              className="flex-1 h-[44px] px-3 rounded-lg border border-[#D1D5DB] text-[18px] text-center tracking-widest"
                              placeholder="000000"
                              maxLength={6}
                              value={phoneOtp}
                              onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                            />
                            <button
                              type="button"
                              onClick={verifyPhoneOtp}
                              disabled={verifyingPhone || phoneOtp.length !== 6}
                              className="px-4 h-[44px] bg-[#166534] text-white rounded-lg text-[13px] font-semibold disabled:opacity-50"
                            >
                              {verifyingPhone ? '...' : 'Confirm'}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setPhoneOtpSent(false); setPhoneOtp(''); }}
                            className="text-[12px] text-[#166534] underline"
                          >
                            Change number
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[#166534]">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-[13px] font-medium">Phone verified: {formData.phone}</span>
                        </div>
                      )}

                      {!phoneVerified && !phoneOtpSent && (
                        <button
                          type="button"
                          onClick={() => setPhoneVerified(true)}
                          className="mt-2 text-[12px] text-[#78716C] underline"
                        >
                          Skip for now
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-[12px] font-semibold text-[#57534E] mb-2"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full h-[48px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1C1917] transition-colors"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                        placeholder="John"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label
                        className="block text-[12px] font-semibold text-[#57534E] mb-2"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        Last Name
                      </label>
                      <input
                        type="text"
                        className="w-full h-[48px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1C1917] transition-colors"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                        placeholder="Doe"
                        value={formData.surname}
                        onChange={(e) => handleChange('surname', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-[12px] font-semibold text-[#57534E] mb-2"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        Birthday <span className="text-[10px] font-normal">(DD-MM)</span>
                      </label>
                      <input
                        type="text"
                        className="w-full h-[48px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1C1917] transition-colors"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                        placeholder="15-03"
                        maxLength={5}
                        value={formData.birthday}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length >= 2) {
                            value = value.slice(0, 2) + '-' + value.slice(2, 4);
                          }
                          handleChange('birthday', value);
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-[12px] font-semibold text-[#57534E] mb-2"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        Gender
                      </label>
                      <select
                        className="w-full h-[48px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] focus:outline-none focus:border-[#1C1917] transition-colors appearance-none bg-white"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                        value={formData.gender}
                        onChange={(e) => handleChange('gender', e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Contact & Company - Simplified for employees */}
              {step === 2 && (
                <div className="space-y-5">
                  <h2
                    className="text-[18px] font-bold text-[#1C1917] mb-4"
                    style={{ fontFamily: 'Spline Sans, sans-serif' }}
                  >
                    Contact Information
                  </h2>

                  {/* Email field - show as read-only for employees, editable for customers */}
                  <div>
                    <label
                      className="block text-[12px] font-semibold text-[#57534E] mb-2"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    >
                      Email Address {!isEmployeeRegistration(companyInfo, formData.email) && <span className="text-[10px] font-normal">(Optional - unlocks partner benefits)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        className={`w-full h-[48px] px-4 pr-10 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1C1917] transition-colors ${isEmployeeRegistration(companyInfo, formData.email) ? 'bg-[#F5F5F4]' : ''}`}
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                        placeholder="you@company.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        readOnly={isEmployeeRegistration(companyInfo, formData.email)}
                      />
                      {checkingEmail && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-5 h-5 text-[#78716C] animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Show company info for employees */}
                    {companyInfo && (
                      <div className="mt-3 p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                            {companyInfo.logo_url ? (
                              <img src={companyInfo.logo_url} alt={companyInfo.name} className="w-6 h-6 object-contain" />
                            ) : (
                              <Building2 className="w-4 h-4 text-[#059669]" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
                              <p
                                className="text-[12px] font-bold text-[#065F46]"
                                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                              >
                                {isEmployeeRegistration(companyInfo, formData.email) ? `Welcome, ${companyInfo.name} Team!` : 'Partner Benefits Unlocked!'}
                              </p>
                            </div>
                            <p
                              className="text-[11px] text-[#047857]"
                              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                            >
                              {isEmployeeRegistration(companyInfo, formData.email)
                                ? `You'll receive company news and updates`
                                : <><strong>{companyInfo.name}</strong> • {companyInfo.discount_percentage}% discount + earn points</>
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Company field - only show for non-employees */}
                  {!isEmployeeRegistration(companyInfo, formData.email) && (
                    <div>
                      <label
                        className="block text-[12px] font-semibold text-[#57534E] mb-2"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        Company <span className="text-[10px] font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="w-full h-[48px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1C1917] transition-colors"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                        placeholder="Your company name"
                        value={formData.company}
                        onChange={(e) => handleChange('company', e.target.value)}
                      />
                    </div>
                  )}

                  {/* Marketing preferences - only show for non-employees */}
                  {!isEmployeeRegistration(companyInfo, formData.email) && (
                    <div className="border-t border-[#E7E5E4] pt-4">
                      <p
                        className="text-[12px] font-semibold text-[#57534E] mb-3"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        Marketing Preferences
                      </p>

                      <div className="space-y-3">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-[#D6D3D1] text-[#1C1917] focus:ring-[#1C1917] mt-0.5"
                            checked={formData.email_consent}
                            onChange={(e) => handleChange('email_consent', e.target.checked)}
                          />
                          <div className="flex-1">
                            <p
                              className="text-[13px] font-medium text-[#1C1917] group-hover:text-black"
                              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                            >
                              Email updates
                            </p>
                            <p
                              className="text-[11px] text-[#78716C]"
                              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                            >
                              Exclusive offers and new reward notifications
                            </p>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-[#D6D3D1] text-[#1C1917] focus:ring-[#1C1917] mt-0.5"
                            checked={formData.sms_consent}
                            onChange={(e) => handleChange('sms_consent', e.target.checked)}
                          />
                          <div className="flex-1">
                            <p
                              className="text-[13px] font-medium text-[#1C1917] group-hover:text-black"
                              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                            >
                              SMS notifications
                            </p>
                            <p
                              className="text-[11px] text-[#78716C]"
                              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                            >
                              Points updates and special promotions
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Preferences - Skip outlet for employees */}
              {step === 3 && (
                <div className="space-y-5">
                  <h2
                    className="text-[18px] font-bold text-[#1C1917] mb-4"
                    style={{ fontFamily: 'Spline Sans, sans-serif' }}
                  >
                    {isEmployeeRegistration(companyInfo, formData.email) ? 'Almost Done!' : 'Preferences'}
                  </h2>

                  {/* Preferred outlet - only show for non-employees */}
                  {!isEmployeeRegistration(companyInfo, formData.email) && (
                    <div>
                      <label
                        className="block text-[12px] font-semibold text-[#57534E] mb-2"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        Preferred Outlet <span className="text-[10px] font-normal">(Optional)</span>
                      </label>
                      <select
                        className="w-full h-[48px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] focus:outline-none focus:border-[#1C1917] transition-colors appearance-none bg-white"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                        value={formData.preferred_outlet}
                        onChange={(e) => handleChange('preferred_outlet', e.target.value)}
                      >
                        <option value="">Select your favorite location</option>
                        {outlets.map((o) => (
                          <option key={o.id} value={o.name}>{o.name}</option>
                        ))}
                      </select>
                      <p
                        className="text-[11px] text-[#78716C] mt-2"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        We'll personalize your experience and notify you of outlet-specific offers
                      </p>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="border-t border-[#E7E5E4] pt-4 mt-4">
                    <p
                      className="text-[12px] font-semibold text-[#57534E] mb-3"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    >
                      Summary
                    </p>
                    <div className="bg-[#F5F5F4] rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-[13px]">
                        <span className="text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Name:</span>
                        <span className="font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                          {formData.name} {formData.surname}
                        </span>
                      </div>
                      {formData.email && (
                        <div className="flex justify-between text-[13px]">
                          <span className="text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Email:</span>
                          <span className="font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                            {formData.email}
                          </span>
                        </div>
                      )}
                      {companyInfo && (
                        <div className="flex justify-between text-[13px]">
                          <span className="text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Partner:</span>
                          <span className="font-semibold text-[#059669]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                            {companyInfo.name} ({companyInfo.discount_percentage}% off)
                          </span>
                        </div>
                      )}
                      {referralInfo?.valid && (
                        <div className="flex justify-between text-[13px]">
                          <span className="text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Referral:</span>
                          <span className="font-semibold text-[#D97706]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                            From {referralInfo.referrerName}
                          </span>
                        </div>
                      )}
                      {formData.birthday && (
                        <div className="flex justify-between text-[13px]">
                          <span className="text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>Birthday:</span>
                          <span className="font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                            {formData.birthday}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E7E5E4]">
                <div>
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-[#57534E] hover:text-[#1C1917] transition-colors"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      disabled={loading}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {canSkip && (
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="px-4 py-2.5 text-[13px] font-semibold text-[#78716C] hover:text-[#1C1917] transition-colors"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      disabled={loading}
                    >
                      Skip for now
                    </button>
                  )}

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex items-center gap-1.5 bg-[#1C1917] text-white px-6 py-2.5 rounded-xl text-[13px] font-bold hover:bg-[#292524] transition-all"
                      style={{ fontFamily: 'Spline Sans, sans-serif', letterSpacing: '1px' }}
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 bg-[#1C1917] text-white px-6 py-2.5 rounded-xl text-[13px] font-bold hover:bg-[#292524] transition-all disabled:opacity-50"
                      style={{ fontFamily: 'Spline Sans, sans-serif', letterSpacing: '1px' }}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
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
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}
