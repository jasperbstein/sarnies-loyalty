'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { AlertCircle, CheckCircle, Fingerprint } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { getLoginErrorMessage, getOtpErrorMessage, getErrorMessage } from '@/lib/errorMessages';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [mode, setMode] = useState<'customer' | 'employee' | 'staff' | 'admin'>('customer');

  // Employee magic link
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Customer OTP login
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP cooldown timer
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Staff/Admin login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Biometric auth for employees
  const {
    isSupported: biometricSupported,
    isEnabled: biometricEnabled,
    isLoading: biometricLoading,
    authenticateWithBiometric,
    getStoredEmail,
  } = useBiometricAuth();
  const [biometricEmail, setBiometricEmail] = useState<string | null>(null);

  // Clear email/password when switching modes
  useEffect(() => {
    if (mode === 'admin' || mode === 'staff') {
      // Clear fields when switching to staff/admin mode
      setEmail('');
      setPassword('');
    }
  }, [mode]);

  // Remember last used mode
  useEffect(() => {
    const savedMode = localStorage.getItem('sarnies_login_mode');
    if (savedMode === 'staff' || savedMode === 'customer' || savedMode === 'admin' || savedMode === 'employee') {
      setMode(savedMode as 'customer' | 'employee' | 'staff' | 'admin');
    }
  }, []);

  // Check for stored biometric credentials
  useEffect(() => {
    if (!biometricLoading && biometricEnabled) {
      const storedEmail = getStoredEmail();
      if (storedEmail) {
        setBiometricEmail(storedEmail);
        // Auto-switch to employee mode if biometric is available
        setMode('employee');
      }
    }
  }, [biometricLoading, biometricEnabled, getStoredEmail]);

  useEffect(() => {
    localStorage.setItem('sarnies_login_mode', mode);
  }, [mode]);

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

  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\s/g, '');
    const regex = /^\+66\d{9}$/;
    return regex.test(cleaned);
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhone(formatted);
    setError('');
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanedPhone = phone.replace(/\s/g, '');

    if (!validatePhoneNumber(cleanedPhone)) {
      setError('Invalid phone number. Please enter a valid Thai number (+66xxxxxxxxx).');
      return;
    }

    if (cooldown > 0) {
      setError(`Please wait ${cooldown}s before requesting a new OTP.`);
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.sendOTP(cleanedPhone);
      setOtpSent(true);
      setCooldown(30);

      if (response.data.otp) {
        setOtp(response.data.otp);
        toast.success(`OTP auto-filled: ${response.data.otp}`, { duration: 10000 });
      } else {
        toast.success('OTP sent to your phone!');
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error, 'Unable to send verification code. Please try again.');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP code.');
      return;
    }

    setLoading(true);
    const cleanedPhone = phone.replace(/\s/g, '');

    try {
      const response = await authAPI.verifyOTP(cleanedPhone, otp);
      const { token, user, needs_registration } = response.data;

      setAuth({ ...user, type: 'customer' }, token);

      if (needs_registration || !user.registration_completed) {
        toast.success('Phone verified! Please complete your profile.');
        router.push(`/register?phone=${encodeURIComponent(cleanedPhone)}`);
      } else {
        toast.success('Welcome back!');
        router.push('/app/home');
      }
    } catch (error: any) {
      const errorMessage = getOtpErrorMessage(error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.staffLogin(email, password);
      const { token, user } = response.data;

      setAuth({ ...user, type: user.role === 'admin' ? 'admin' : 'staff' }, token);
      toast.success('Welcome back!');

      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/staff/scan');
      }
    } catch (error: any) {
      const errorMessage = getLoginErrorMessage(error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await authenticateWithBiometric();

      if (result.success && result.email) {
        // Biometric verified, now authenticate with backend
        const response = await authAPI.biometricLogin(result.email);
        const { token, user } = response.data;

        setAuth({ ...user, type: 'employee' }, token);
        toast.success('Welcome back!');
        router.push('/app/home');
      } else {
        setError('Biometric authentication failed. Please use magic link.');
        setBiometricEmail(null);
      }
    } catch (error: any) {
      console.error('Biometric login error:', error);
      const errorMessage = getErrorMessage(error, 'Biometric login failed. Please use magic link instead.');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!employeeEmail || !employeeEmail.includes('@')) {
      setError('Please enter a valid work email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.sendMagicLink(employeeEmail);
      setMagicLinkSent(true);

      if (response.data.magicLink) {
        toast.success(`Magic link sent! For testing: ${response.data.magicLink}`, { duration: 15000 });
      } else {
        toast.success('Magic link sent to your email!');
      }
    } catch (error: any) {
      console.error('Magic link error:', error);
      const errorMessage = getErrorMessage(error, 'Unable to send login link. Please check your email address and try again.');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    switch (mode) {
      case 'customer': return '+66 8 1234 5678';
      case 'employee': return 'you@sarnies.com';
      case 'staff': return 'staff@sarnies.com';
      case 'admin': return 'admin@sarnies.com';
    }
  };

  const getHelperText = () => {
    switch (mode) {
      case 'customer': return 'Enter your Thai mobile number';
      case 'employee': return 'Enter your @sarnies.com email address';
      case 'staff': return 'Enter your staff credentials';
      case 'admin': return 'Enter your admin credentials';
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col">
      {/* Background Image - High quality coffee shop image */}
      <div className="relative h-[45vh] min-h-[280px] max-h-[400px] w-full overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1920&q=95&fit=crop"
          alt="Sarnies Coffee Shop"
          fill
          priority
          quality={95}
          className="object-cover object-center"
          sizes="100vw"
          unoptimized
        />
        {/* Gradient overlay for smooth transition to white */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[120px]"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 60%, rgba(255,255,255,1) 100%)'
          }}
        />
      </div>

      {/* Login Card - positioned to overlap image smoothly */}
      <div
        className="flex-1 flex flex-col items-center px-5 relative z-10"
        style={{ marginTop: '-80px' }}
      >
        <div
          className="w-[340px] bg-white rounded-[12px] p-8"
          style={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            border: '1px solid #F0F0F0'
          }}
        >
          {/* Logo Section - matches .pen exactly */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <h1
              className="text-[24px] font-bold text-[#1C1917]"
              style={{
                fontFamily: 'Spline Sans, sans-serif',
                letterSpacing: '4px',
                lineHeight: 1.15
              }}
            >
              SARNIES
            </h1>
            <p
              className="text-[14px] text-[#57534E] text-center"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Welcome to Sarnies Loyalty
            </p>
          </div>

          {/* Mode Toggle Tabs - matches .pen exactly */}
          <div
            className="flex rounded-[8px] p-1 gap-1 mb-6"
            style={{ backgroundColor: '#FAFAF8' }}
          >
            {(['customer', 'employee', 'staff', 'admin'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setMode(tab);
                  setError('');
                  setOtpSent(false);
                  setMagicLinkSent(false);
                }}
                className={`flex-1 h-9 rounded-[6px] text-[13px] font-bold capitalize transition-all flex items-center justify-center ${
                  mode === tab
                    ? 'bg-white text-[#1C1917]'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
                style={{
                  fontFamily: 'Spline Sans, sans-serif',
                  boxShadow: mode === tab ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
              <p
                className="text-[12px] text-[#991B1B]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                {error}
              </p>
            </div>
          )}

          {/* Customer OTP Form */}
          {mode === 'customer' && !otpSent && (
            <form onSubmit={handleSendOTP} className="flex flex-col gap-4">
              <div>
                <input
                  type="tel"
                  className="w-full h-[56px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1C1917] transition-colors"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  placeholder={getPlaceholder()}
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  autoFocus
                  required
                />
                <p
                  className="text-[12px] font-semibold text-[#78716C] mt-2"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  {getHelperText()}
                </p>
              </div>

              <button
                type="submit"
                className="w-full h-[56px] bg-[#1C1917] text-white rounded-[12px] font-bold text-[14px] hover:bg-[#292524] transition-colors disabled:opacity-50"
                style={{
                  fontFamily: 'Spline Sans, sans-serif',
                  letterSpacing: '1.5px'
                }}
                disabled={loading || cooldown > 0}
              >
                {loading ? 'SENDING...' : cooldown > 0 ? `WAIT ${cooldown}S` : 'SEND OTP'}
              </button>

              <p
                className="text-[12px] font-semibold text-[#78716C] text-center"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                We&apos;ll send you a one-time code to verify
              </p>
            </form>
          )}

          {/* Customer OTP Verify Form */}
          {mode === 'customer' && otpSent && (
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
                  OTP sent to {phone}
                </p>
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
                {loading ? 'VERIFYING...' : 'VERIFY OTP'}
              </button>

              <div className="flex justify-between">
                <button
                  type="button"
                  className="text-[12px] font-semibold text-[#57534E] hover:text-[#1C1917] transition-colors"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                  }}
                >
                  Change Number
                </button>
                {cooldown === 0 ? (
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-[#1C1917]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    onClick={(e: any) => handleSendOTP(e)}
                  >
                    Resend OTP
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

          {/* Employee Login - Biometric or Magic Link */}
          {mode === 'employee' && !magicLinkSent && (
            <div className="flex flex-col gap-4">
              {/* Biometric Login Option */}
              {biometricSupported && biometricEnabled && biometricEmail && (
                <>
                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    className="w-full h-[72px] bg-[#1C1917] text-white rounded-[12px] font-bold text-[14px] hover:bg-[#292524] transition-colors disabled:opacity-50 flex flex-col items-center justify-center gap-1"
                    style={{ fontFamily: 'Spline Sans, sans-serif' }}
                    disabled={loading}
                  >
                    <Fingerprint className="w-6 h-6" />
                    <span style={{ letterSpacing: '1.5px' }}>
                      {loading ? 'VERIFYING...' : 'SIGN IN WITH FACE ID'}
                    </span>
                  </button>
                  <p
                    className="text-[12px] text-[#78716C] text-center"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    {biometricEmail}
                  </p>
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-[#E5E5E5]" />
                    <span className="text-[12px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                      or
                    </span>
                    <div className="flex-1 h-px bg-[#E5E5E5]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setBiometricEmail(null)}
                    className="text-[13px] font-semibold text-[#57534E] hover:text-[#1C1917]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Use a different account
                  </button>
                </>
              )}

              {/* Magic Link Form (shown when no biometric or user wants different account) */}
              {(!biometricEnabled || !biometricEmail) && (
                <form onSubmit={handleSendMagicLink} className="flex flex-col gap-4">
                  <div>
                    <input
                      type="email"
                      className="w-full h-[56px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1C1917] transition-colors"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                      placeholder={getPlaceholder()}
                      value={employeeEmail}
                      onChange={(e) => {
                        setEmployeeEmail(e.target.value);
                        setError('');
                      }}
                      autoFocus
                      required
                    />
                    <p
                      className="text-[12px] font-semibold text-[#78716C] mt-2"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    >
                      {getHelperText()}
                    </p>
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
                    {loading ? 'SENDING...' : 'SEND MAGIC LINK'}
                  </button>

                  <p
                    className="text-[12px] font-semibold text-[#78716C] text-center"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    We&apos;ll email you a link to sign in instantly
                  </p>
                </form>
              )}
            </div>
          )}

          {/* Employee Magic Link Sent */}
          {mode === 'employee' && magicLinkSent && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#059669]" />
              </div>
              <h3
                className="text-[18px] font-bold text-[#1C1917] mb-2"
                style={{ fontFamily: 'Spline Sans, sans-serif', lineHeight: 1.15 }}
              >
                Check Your Email
              </h3>
              <p
                className="text-[14px] text-[#57534E] mb-4"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                We sent a login link to<br/>
                <strong className="text-[#1C1917]">{employeeEmail}</strong>
              </p>
              <button
                type="button"
                className="text-[14px] font-semibold text-[#1C1917]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                onClick={() => {
                  setMagicLinkSent(false);
                  setEmployeeEmail('');
                }}
              >
                Use a different email
              </button>
            </div>
          )}

          {/* Staff/Admin Login Form */}
          {(mode === 'staff' || mode === 'admin') && (
            <form onSubmit={handleStaffLogin} className="flex flex-col gap-4">
              <input
                type="email"
                className="w-full h-[56px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1C1917] transition-colors"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                placeholder={getPlaceholder()}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                autoFocus
                required
              />
              <input
                type="password"
                className="w-full h-[56px] px-4 rounded-[12px] border border-[#E5E5E5] text-[14px] text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1C1917] transition-colors"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
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
                {loading ? 'LOGGING IN...' : mode === 'admin' ? 'ADMIN LOGIN' : 'STAFF LOGIN'}
              </button>

              {/* Staff Registration & Forgot Password Links */}
              {mode === 'staff' && (
                <div className="text-center mt-2 space-y-1">
                  <p
                    className="text-[13px] text-[#78716C]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    New staff member?{' '}
                    <a
                      href="/staff/register"
                      className="text-[#D97706] font-semibold hover:underline"
                    >
                      Register here
                    </a>
                  </p>
                  <p
                    className="text-[12px]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    <a
                      href="/staff/forgot-password"
                      className="text-[#78716C] hover:text-[#1C1917] hover:underline"
                    >
                      Forgot password?
                    </a>
                  </p>
                </div>
              )}
            </form>
          )}

          {/* Terms - matches .pen exactly */}
          <p
            className="text-[11px] font-semibold text-[#78716C] text-center mt-6"
            style={{
              fontFamily: 'Instrument Sans, sans-serif',
              lineHeight: 1.4
            }}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Footer - matches .pen exactly */}
        <p
          className="text-[11px] font-semibold text-[#57534E] mt-auto mb-4 pt-8"
          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
        >
          © 2025 Sarnies
        </p>
      </div>
    </div>
  );
}
