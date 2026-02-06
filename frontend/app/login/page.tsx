'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI, referralsAPI, IdentifyResponse } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { AlertCircle, Loader2, Mail, Building2, Gift, Eye, EyeOff, ArrowLeft, ChevronRight, Clock } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import toast from 'react-hot-toast';
import { getLoginErrorMessage, getOtpErrorMessage, getErrorMessage } from '@/lib/errorMessages';
import { io, Socket } from 'socket.io-client';
import { getWebSocketUrl } from '@/lib/config';

type AuthState =
  | 'INITIAL'
  | 'PHONE_OTP'
  | 'EMAIL_OTP'
  | 'MAGIC_LINK_SENT'
  | 'PASSWORD_LOGIN'
  | 'STAFF_REGISTER'
  | 'UNKNOWN_EMAIL';

interface ReferralInfo {
  valid: boolean;
  referrerName?: string;
  code: string;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  // Core state
  const [authState, setAuthState] = useState<AuthState>('INITIAL');
  const [identifier, setIdentifier] = useState('');
  const [identifyResult, setIdentifyResult] = useState<IdentifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP state
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Password state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Staff registration state
  const [staffName, setStaffName] = useState('');
  const [staffBranch, setStaffBranch] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Remember me state - persist to localStorage for magic link flow
  const [rememberMe, setRememberMe] = useState<string>('7d'); // Default 7 days

  // Save remember me preference to localStorage when it changes (for magic link flow)
  useEffect(() => {
    localStorage.setItem('remember_me_preference', rememberMe);
  }, [rememberMe]);

  // Magic link WebSocket state
  const [magicLinkSessionId, setMagicLinkSessionId] = useState<string | null>(null);
  const [waitingForMagicLink, setWaitingForMagicLink] = useState(false);
  const magicLinkSocketRef = useRef<Socket | null>(null);

  // Referral state
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);

  // Biometric state
  const {
    isSupported: biometricSupported,
    isEnabled: biometricEnabled,
    isLoading: biometricLoading,
    authenticateWithBiometric,
    getStoredEmail,
  } = useBiometricAuth();
  const [biometricEmail, setBiometricEmail] = useState<string | null>(null);

  // Check for referral code on mount
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode && !referralInfo) {
      validateReferralCode(refCode);
    }
  }, [searchParams]);

  // Check for stored biometric credentials
  useEffect(() => {
    if (!biometricLoading && biometricEnabled) {
      const storedEmail = getStoredEmail();
      if (storedEmail) {
        setBiometricEmail(storedEmail);
      }
    }
  }, [biometricLoading, biometricEnabled, getStoredEmail]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      cooldownTimerRef.current = setTimeout(() => {
        setCooldown(cooldown - 1);
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, [cooldown]);

  // WebSocket connection for magic link verification
  useEffect(() => {
    if (!magicLinkSessionId || !waitingForMagicLink) return;

    const wsUrl = getWebSocketUrl();
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
    });

    magicLinkSocketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Connected to WebSocket for magic link');
      socket.emit('join_magic_link_session', magicLinkSessionId);
    });

    socket.on('magic_link_session_joined', ({ sessionId }) => {
      console.log(`✅ Joined magic link session: ${sessionId}`);
    });

    socket.on('magic_link_verified', (data: { success: boolean; token: string; user: any }) => {
      console.log('🎉 Magic link verified via WebSocket!');
      if (data.success && data.token && data.user) {
        setAuth({ ...data.user, type: 'employee' }, data.token);
        toast.success("Welcome! You're now signed in.");
        router.push('/app/home');
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
    });

    return () => {
      socket.disconnect();
      magicLinkSocketRef.current = null;
    };
  }, [magicLinkSessionId, waitingForMagicLink, setAuth, router]);

  // Cleanup WebSocket when leaving magic link state
  useEffect(() => {
    if (authState !== 'MAGIC_LINK_SENT' && magicLinkSocketRef.current) {
      magicLinkSocketRef.current.disconnect();
      magicLinkSocketRef.current = null;
      setMagicLinkSessionId(null);
      setWaitingForMagicLink(false);
    }
  }, [authState]);

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

  const formatPhoneNumber = (value: string) => {
    let cleaned = value.replace(/[^\d+]/g, '');

    if (!cleaned.startsWith('+66')) {
      if (cleaned.startsWith('66')) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('0')) {
        cleaned = '+66' + cleaned.substring(1);
      } else if (cleaned.length > 0 && !cleaned.startsWith('+')) {
        cleaned = '+66' + cleaned;
      }
    }

    if (cleaned.length > 12) {
      cleaned = cleaned.substring(0, 12);
    }

    if (cleaned.length > 3) {
      const prefix = cleaned.substring(0, 3);
      const rest = cleaned.substring(3);

      if (rest.length <= 1) {
        return `${prefix} ${rest}`;
      } else if (rest.length <= 5) {
        return `${prefix} ${rest.substring(0, 1)} ${rest.substring(1)}`;
      } else {
        return `${prefix} ${rest.substring(0, 1)} ${rest.substring(1, 5)} ${rest.substring(5)}`;
      }
    }

    return cleaned;
  };

  const handleIdentifierChange = (value: string) => {
    // Check if it looks like a phone number
    const isLikelyPhone = /^[+\d\s()-]+$/.test(value) && value.replace(/\D/g, '').length >= 3;

    if (isLikelyPhone) {
      setIdentifier(formatPhoneNumber(value));
    } else {
      setIdentifier(value);
    }
    setError('');
  };

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your phone number or email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.identify(identifier.replace(/\s/g, ''));
      const result = response.data;
      setIdentifyResult(result);

      // Route to appropriate state
      switch (result.next_step) {
        case 'send_otp':
          // Auto-send OTP for phone
          await handleSendOTP(identifier.replace(/\s/g, ''));
          break;
        case 'send_magic_link':
          // Auto-send magic link for employees
          await handleSendMagicLink(identifier.trim().toLowerCase());
          break;
        case 'enter_password':
          setAuthState('PASSWORD_LOGIN');
          break;
        case 'staff_register':
          setAuthState('STAFF_REGISTER');
          if (result.company?.default_branch) {
            setStaffBranch(result.company.default_branch);
          }
          break;
        case 'use_phone':
          // For unknown emails, offer email-based OTP instead of rejecting
          await handleSendEmailOTP(identifier.trim().toLowerCase());
          break;
        case 'verify_email':
          toast.error('Your account is pending email verification. Please check your email.');
          break;
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Unable to verify your information. Please try again.');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (phone: string) => {
    const cleanedPhone = phone.replace(/\s/g, '');

    if (cooldown > 0) {
      setError(`Please wait ${cooldown}s before requesting a new code.`);
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.sendOTP(cleanedPhone);
      setAuthState('PHONE_OTP');
      setCooldown(30);

      if (response.data.otp) {
        setOtp(response.data.otp);
        toast.success(`OTP auto-filled: ${response.data.otp}`, { duration: 10000 });
      } else {
        toast.success('Verification code sent to your phone!');
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Unable to send verification code. Please try again.');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }

    setLoading(true);
    const cleanedPhone = identifier.replace(/\s/g, '');

    try {
      const response = await authAPI.verifyOTP(cleanedPhone, otp, rememberMe);
      const { token, user, needs_registration } = response.data;

      setAuth({ ...user, type: 'customer' }, token);

      if (needs_registration || !user.registration_completed) {
        toast.success('Phone verified! Please complete your profile.');
        const refParam = referralInfo?.valid ? `&ref=${referralInfo.code}` : '';
        router.push(`/register?phone=${encodeURIComponent(cleanedPhone)}${refParam}`);
      } else {
        // Apply referral if present
        if (referralInfo?.valid) {
          try {
            await referralsAPI.applyCode({ code: referralInfo.code });
            toast.success(`Referral from ${referralInfo.referrerName} applied!`);
          } catch {
            // Referral may already be applied or invalid
          }
        }
        toast.success('Welcome back!');
        router.push('/app/home');
      }
    } catch (err: any) {
      const errorMessage = getOtpErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async (email: string) => {
    setLoading(true);
    try {
      const response = await authAPI.sendMagicLink(email);

      if (response.data.sessionId) {
        setMagicLinkSessionId(response.data.sessionId);
        setWaitingForMagicLink(true);
      }

      setAuthState('MAGIC_LINK_SENT');
      toast.success('Check your email for the login link!');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Unable to send login link. Please try again.');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOTP = async (email: string) => {
    if (cooldown > 0) {
      setError(`Please wait ${cooldown}s before requesting a new code.`);
      return;
    }

    setLoading(true);
    try {
      await authAPI.sendEmailOTP(email);
      setAuthState('EMAIL_OTP');
      setCooldown(30);
      toast.success('Verification code sent to your email!');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Unable to send verification code. Please try again.');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }

    setLoading(true);
    const emailLower = identifier.trim().toLowerCase();

    try {
      const response = await authAPI.verifyEmailOTP(emailLower, otp, rememberMe);
      const { token, user, needs_registration } = response.data;

      setAuth({ ...user, type: 'customer' }, token);

      if (needs_registration || !user.registration_completed) {
        toast.success('Email verified! Please complete your profile.');
        const refParam = referralInfo?.valid ? `&ref=${referralInfo.code}` : '';
        router.push(`/register?email=${encodeURIComponent(emailLower)}${refParam}`);
      } else {
        // Apply referral if present
        if (referralInfo?.valid) {
          try {
            await referralsAPI.applyCode({ code: referralInfo.code });
            toast.success(`Referral from ${referralInfo.referrerName} applied!`);
          } catch {
            // Referral may already be applied or invalid
          }
        }
        toast.success('Welcome back!');
        router.push('/app/home');
      }
    } catch (err: any) {
      const errorMessage = getOtpErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.staffLogin(identifier.trim().toLowerCase(), password, rememberMe);
      const { token, user } = response.data;

      setAuth({ ...user, type: user.role === 'admin' ? 'admin' : 'staff' }, token);
      toast.success('Welcome back!');

      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/staff/scan');
      }
    } catch (err: any) {
      const errorMessage = getLoginErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.staffRegister({
        email: identifier.trim().toLowerCase(),
        password,
        name: staffName.trim(),
        branch: staffBranch || undefined
      });

      toast.success('Registration successful! Please check your email to verify your account.');
      setAuthState('INITIAL');
      setIdentifier('');
      setPassword('');
      setConfirmPassword('');
      setStaffName('');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Registration failed. Please try again.');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setAuthState('INITIAL');
    setError('');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setStaffName('');
    setIdentifyResult(null);
  };

  const handleLineLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const refCode = referralInfo?.valid ? referralInfo.code : undefined;
      const response = await authAPI.getLineAuthUrl(rememberMe, refCode);
      const { auth_url } = response.data;

      // Redirect to LINE Login page
      window.location.href = auth_url;
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Unable to start LINE login. Please try again.');
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const getInputPlaceholder = () => {
    return 'Phone number or email';
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-8 px-6 flex flex-col items-center">
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-5">
        <div className="w-full max-w-[380px]">
          {/* Referral Banner */}
          {referralInfo?.valid && (
            <div className="mb-4 p-4 bg-[#FEF3C7] border border-[#F59E0B] rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F59E0B] rounded-full flex items-center justify-center">
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

          {/* Login Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E7E5E4]">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <p
                  className="text-[13px] text-[#991B1B]"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  {error}
                </p>
              </div>
            )}

            {/* INITIAL STATE - Single Input */}
            {authState === 'INITIAL' && (
              <form onSubmit={handleIdentify} className="flex flex-col gap-4">
                <div>
                  <input
                    type="text"
                    className="w-full h-[56px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1C1917] transition-colors"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    placeholder={getInputPlaceholder()}
                    value={identifier}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    autoFocus
                    required
                  />
                  <p
                    className="text-[12px] font-semibold text-[#78716C] mt-2"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Enter your phone or work email to continue
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full h-[56px] bg-[#1C1917] text-white rounded-[12px] font-bold text-[14px] hover:bg-[#292524] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    fontFamily: 'Spline Sans, sans-serif',
                    letterSpacing: '1.5px'
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      CHECKING...
                    </>
                  ) : (
                    <>
                      CONTINUE
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-[#E5E5E5]" />
                  <span
                    className="text-[12px] text-[#A8A29E]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    or continue with
                  </span>
                  <div className="flex-1 h-px bg-[#E5E5E5]" />
                </div>

                {/* LINE Login Button */}
                <button
                  type="button"
                  onClick={handleLineLogin}
                  disabled={loading}
                  className="w-full h-[56px] bg-[#06C755] text-white rounded-[12px] font-bold text-[14px] hover:bg-[#05B54C] transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                  style={{
                    fontFamily: 'Instrument Sans, sans-serif',
                  }}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                  Continue with LINE
                </button>
              </form>
            )}

            {/* PHONE_OTP STATE */}
            {authState === 'PHONE_OTP' && (
              <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
                <div>
                  <input
                    type="text"
                    className="w-full h-[56px] px-4 rounded-[12px] border border-[#E5E5E5] text-center text-[24px] tracking-[0.5em] font-mono text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1C1917] transition-colors"
                    placeholder="------"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                    autoFocus
                    required
                  />
                  <p
                    className="text-[12px] font-semibold text-[#78716C] mt-2 text-center"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Enter the 6-digit code sent to {identifier}
                  </p>
                </div>

                {/* Remember Me Selector */}
                <div className="flex items-center gap-2 p-3 bg-[#F5F5F4] rounded-xl">
                  <Clock className="w-4 h-4 text-[#78716C]" />
                  <span
                    className="text-[12px] text-[#78716C]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Stay signed in for
                  </span>
                  <select
                    className="flex-1 text-[12px] font-semibold text-[#1C1917] bg-transparent border-none focus:outline-none cursor-pointer"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    value={rememberMe}
                    onChange={(e) => setRememberMe(e.target.value)}
                  >
                    <option value="1d">1 day</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                    <option value="90d">90 days</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full h-[56px] bg-[#1C1917] text-white rounded-[12px] font-bold text-[14px] hover:bg-[#292524] transition-colors disabled:opacity-50"
                  style={{
                    fontFamily: 'Spline Sans, sans-serif',
                    letterSpacing: '1.5px'
                  }}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? 'VERIFYING...' : 'VERIFY CODE'}
                </button>

                <div className="flex justify-between">
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-[#57534E] hover:text-[#1C1917] transition-colors flex items-center gap-1"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    onClick={handleBack}
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Change Number
                  </button>
                  {cooldown === 0 ? (
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-[#1C1917]"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      onClick={() => handleSendOTP(identifier)}
                    >
                      Resend Code
                    </button>
                  ) : (
                    <span
                      className="text-[12px] font-semibold text-[#78716C]"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    >
                      Resend in {cooldown}s
                    </span>
                  )}
                </div>
              </form>
            )}

            {/* EMAIL_OTP STATE */}
            {authState === 'EMAIL_OTP' && (
              <form onSubmit={handleVerifyEmailOTP} className="flex flex-col gap-4">
                <div className="text-center mb-2">
                  <div className="w-12 h-12 bg-[#FEF3C7] rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6 text-[#D97706]" />
                  </div>
                  <p
                    className="text-[13px] text-[#57534E]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    We sent a code to
                  </p>
                  <p
                    className="text-[14px] font-semibold text-[#1C1917]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    {identifier}
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    className="w-full h-[56px] px-4 rounded-[12px] border border-[#E5E5E5] text-center text-[24px] tracking-[0.5em] font-mono text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1C1917] transition-colors"
                    placeholder="------"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                    autoFocus
                    required
                  />
                  <p
                    className="text-[12px] font-semibold text-[#78716C] mt-2 text-center"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Enter the 6-digit code from your email
                  </p>
                </div>

                {/* Remember Me Selector */}
                <div className="flex items-center gap-2 p-3 bg-[#F5F5F4] rounded-xl">
                  <Clock className="w-4 h-4 text-[#78716C]" />
                  <span
                    className="text-[12px] text-[#78716C]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Stay signed in for
                  </span>
                  <select
                    className="flex-1 text-[12px] font-semibold text-[#1C1917] bg-transparent border-none focus:outline-none cursor-pointer"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    value={rememberMe}
                    onChange={(e) => setRememberMe(e.target.value)}
                  >
                    <option value="1d">1 day</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                    <option value="90d">90 days</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full h-[56px] bg-[#1C1917] text-white rounded-[12px] font-bold text-[14px] hover:bg-[#292524] transition-colors disabled:opacity-50"
                  style={{
                    fontFamily: 'Spline Sans, sans-serif',
                    letterSpacing: '1.5px'
                  }}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? 'VERIFYING...' : 'VERIFY CODE'}
                </button>

                <div className="flex justify-between">
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-[#57534E] hover:text-[#1C1917] transition-colors flex items-center gap-1"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    onClick={handleBack}
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Change Email
                  </button>
                  {cooldown === 0 ? (
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-[#1C1917]"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      onClick={() => handleSendEmailOTP(identifier.trim().toLowerCase())}
                    >
                      Resend Code
                    </button>
                  ) : (
                    <span
                      className="text-[12px] font-semibold text-[#78716C]"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    >
                      Resend in {cooldown}s
                    </span>
                  )}
                </div>
              </form>
            )}

            {/* MAGIC_LINK_SENT STATE */}
            {authState === 'MAGIC_LINK_SENT' && (
              <div className="text-center py-4">
                {/* Company badge if applicable */}
                {identifyResult?.company && (
                  <div className="mb-4 p-3 bg-[#F5F5F4] rounded-xl inline-flex items-center gap-2">
                    {identifyResult.company.logo_url ? (
                      <img
                        src={identifyResult.company.logo_url}
                        alt={identifyResult.company.name}
                        className="w-6 h-6 object-contain"
                      />
                    ) : (
                      <Building2 className="w-5 h-5 text-[#57534E]" />
                    )}
                    <span
                      className="text-[13px] font-semibold text-[#1C1917]"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    >
                      {identifyResult.company.name}
                    </span>
                  </div>
                )}

                {/* Animated waiting indicator */}
                <div className="w-20 h-20 bg-[#FEF3C7] rounded-full flex items-center justify-center mx-auto mb-4 relative">
                  <Mail className="w-9 h-9 text-[#D97706]" />
                  {waitingForMagicLink && (
                    <div className="absolute inset-0 rounded-full border-2 border-[#D97706] border-t-transparent animate-spin" />
                  )}
                </div>
                <h3
                  className="text-[18px] font-bold text-[#1C1917] mb-2"
                  style={{ fontFamily: 'Spline Sans, sans-serif', lineHeight: 1.15 }}
                >
                  Check Your Email
                </h3>
                <p
                  className="text-[14px] text-[#57534E] mb-1"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  We sent a login link to
                </p>
                <p
                  className="text-[14px] font-semibold text-[#1C1917] mb-4"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  {identifier}
                </p>

                <div className="bg-[#F5F5F4] rounded-lg px-4 py-3 mb-4">
                  <p
                    className="text-[13px] text-[#57534E] flex items-center justify-center gap-2"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    {waitingForMagicLink ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Waiting for you to click the link...
                      </>
                    ) : (
                      'Click the link in your email to sign in'
                    )}
                  </p>
                </div>

                {/* Remember Me Selector for magic link */}
                <div className="flex items-center gap-2 p-3 bg-white border border-[#E5E5E5] rounded-xl mb-4">
                  <Clock className="w-4 h-4 text-[#78716C]" />
                  <span
                    className="text-[12px] text-[#78716C]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Stay signed in for
                  </span>
                  <select
                    className="flex-1 text-[12px] font-semibold text-[#1C1917] bg-transparent border-none focus:outline-none cursor-pointer"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    value={rememberMe}
                    onChange={(e) => setRememberMe(e.target.value)}
                  >
                    <option value="1d">1 day</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                    <option value="90d">90 days</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="text-[14px] font-semibold text-[#78716C] hover:text-[#1C1917] transition-colors flex items-center gap-1 mx-auto"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  onClick={handleBack}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Use a different email
                </button>
              </div>
            )}

            {/* PASSWORD_LOGIN STATE */}
            {authState === 'PASSWORD_LOGIN' && (
              <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
                {/* Company/Role badge */}
                {identifyResult && (
                  <div className="mb-2 p-3 bg-[#F5F5F4] rounded-xl flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#57534E]" />
                    <div className="flex-1">
                      <p
                        className="text-[13px] font-semibold text-[#1C1917]"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        {identifier}
                      </p>
                      <p
                        className="text-[11px] text-[#78716C]"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        {identifyResult.user_type === 'admin' ? 'Admin Account' : 'Staff Account'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full h-[56px] px-4 pr-12 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1C1917] transition-colors"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#1C1917]"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Remember Me Selector */}
                <div className="flex items-center gap-2 p-3 bg-[#F5F5F4] rounded-xl">
                  <Clock className="w-4 h-4 text-[#78716C]" />
                  <span
                    className="text-[12px] text-[#78716C]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Stay signed in for
                  </span>
                  <select
                    className="flex-1 text-[12px] font-semibold text-[#1C1917] bg-transparent border-none focus:outline-none cursor-pointer"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    value={rememberMe}
                    onChange={(e) => setRememberMe(e.target.value)}
                  >
                    <option value="1d">1 day</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                    <option value="90d">90 days</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full h-[56px] bg-[#1C1917] text-white rounded-[12px] font-bold text-[14px] hover:bg-[#292524] transition-colors disabled:opacity-50"
                  style={{
                    fontFamily: 'Spline Sans, sans-serif',
                    letterSpacing: '1.5px'
                  }}
                  disabled={loading}
                >
                  {loading ? 'SIGNING IN...' : 'SIGN IN'}
                </button>

                <div className="flex justify-between">
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-[#57534E] hover:text-[#1C1917] transition-colors flex items-center gap-1"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    onClick={handleBack}
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back
                  </button>
                  <a
                    href="/staff/forgot-password"
                    className="text-[12px] font-semibold text-[#78716C] hover:text-[#1C1917]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Forgot password?
                  </a>
                </div>
              </form>
            )}

            {/* STAFF_REGISTER STATE */}
            {authState === 'STAFF_REGISTER' && (
              <form onSubmit={handleStaffRegister} className="flex flex-col gap-4">
                {/* Company badge */}
                {identifyResult?.company && (
                  <div className="mb-2 p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl flex items-center gap-2">
                    {identifyResult.company.logo_url ? (
                      <img
                        src={identifyResult.company.logo_url}
                        alt={identifyResult.company.name}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <Building2 className="w-6 h-6 text-[#059669]" />
                    )}
                    <div>
                      <p
                        className="text-[13px] font-semibold text-[#065F46]"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        {identifyResult.company.name}
                      </p>
                      <p
                        className="text-[11px] text-[#047857]"
                        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      >
                        New Staff Registration
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-[#F5F5F4] rounded-xl">
                  <p
                    className="text-[12px] text-[#78716C]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Registering as:
                  </p>
                  <p
                    className="text-[14px] font-semibold text-[#1C1917]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    {identifier}
                  </p>
                </div>

                <input
                  type="text"
                  className="w-full h-[56px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1C1917] transition-colors"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  placeholder="Your full name"
                  value={staffName}
                  onChange={(e) => {
                    setStaffName(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  required
                />

                <select
                  className="w-full h-[56px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] focus:outline-none focus:border-[#1C1917] transition-colors appearance-none bg-white"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  value={staffBranch}
                  onChange={(e) => setStaffBranch(e.target.value)}
                >
                  <option value="">Select branch (optional)</option>
                  <option value="Central">Central</option>
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                </select>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full h-[56px] px-4 pr-12 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1C1917] transition-colors"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    placeholder="Password (min 8 characters)"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#1C1917]"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full h-[56px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1C1917] transition-colors"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  required
                />

                <button
                  type="submit"
                  className="w-full h-[56px] bg-[#1C1917] text-white rounded-[12px] font-bold text-[14px] hover:bg-[#292524] transition-colors disabled:opacity-50"
                  style={{
                    fontFamily: 'Spline Sans, sans-serif',
                    letterSpacing: '1.5px'
                  }}
                  disabled={loading}
                >
                  {loading ? 'REGISTERING...' : 'CREATE ACCOUNT'}
                </button>

                <button
                  type="button"
                  className="text-[12px] font-semibold text-[#57534E] hover:text-[#1C1917] transition-colors flex items-center gap-1"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  onClick={handleBack}
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back
                </button>
              </form>
            )}

            {/* UNKNOWN_EMAIL STATE */}
            {authState === 'UNKNOWN_EMAIL' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-[#FEF2F2] rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-[#DC2626]" />
                </div>
                <h3
                  className="text-[18px] font-bold text-[#1C1917] mb-2"
                  style={{ fontFamily: 'Spline Sans, sans-serif', lineHeight: 1.15 }}
                >
                  Email Not Recognized
                </h3>
                <p
                  className="text-[14px] text-[#57534E] mb-4"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  This email is not associated with any company account. Please use your phone number to register as a customer.
                </p>

                <button
                  type="button"
                  className="w-full h-[56px] bg-[#1C1917] text-white rounded-[12px] font-bold text-[14px] hover:bg-[#292524] transition-colors"
                  style={{
                    fontFamily: 'Spline Sans, sans-serif',
                    letterSpacing: '1.5px'
                  }}
                  onClick={handleBack}
                >
                  USE PHONE NUMBER
                </button>
              </div>
            )}

            {/* Terms */}
            <p
              className="text-[11px] text-[#A8A29E] text-center mt-6 leading-relaxed"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
