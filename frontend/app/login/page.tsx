'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Coffee, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<'customer' | 'staff' | 'admin'>('customer');

  // DEV MODE: Auto-login as admin (set to false to disable)
  const DEV_AUTO_LOGIN = false;

  // Customer OTP login
  const [phone, setPhone] = useState(process.env.NODE_ENV === 'development' ? '+66812345678' : '');
  const [otp, setOtp] = useState(process.env.NODE_ENV === 'development' ? '123456' : '');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP cooldown timer
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Staff/Admin login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Update email/password based on mode
  useEffect(() => {
    if (mode === 'admin') {
      setEmail('admin@sarnies.com');
      setPassword('admin');
    } else if (mode === 'staff') {
      setEmail('staff@sarnies.com');
      setPassword('staff123');
    }
  }, [mode]);

  // Remember last used mode
  useEffect(() => {
    const savedMode = localStorage.getItem('sarnies_login_mode');
    if (savedMode === 'staff' || savedMode === 'customer' || savedMode === 'admin') {
      setMode(savedMode as 'customer' | 'staff' | 'admin');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sarnies_login_mode', mode);
  }, [mode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 0); // Removed artificial delay

    return () => clearTimeout(timer);
  }, []);

  // DEV MODE: Auto-login after splash
  useEffect(() => {
    if (DEV_AUTO_LOGIN && !showSplash && process.env.NODE_ENV === 'development') {
      // Simulate admin user
      const mockAdminUser = {
        id: 1,
        name: 'Admin User',
        email: 'admin@sarnies.com',
        role: 'admin',
        type: 'staff' as const,
      };
      const mockToken = 'dev-mode-token';

      setAuth(mockAdminUser as any, mockToken);
      router.push('/admin/dashboard');
    }
  }, [showSplash, router, setAuth]);

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
    // Remove all non-numeric characters except +
    let cleaned = value.replace(/[^\d+]/g, '');

    // Ensure it starts with +66
    if (!cleaned.startsWith('+66')) {
      if (cleaned.startsWith('66')) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('0')) {
        cleaned = '+66' + cleaned.substring(1);
      } else if (cleaned.length > 0 && !cleaned.startsWith('+')) {
        cleaned = '+66' + cleaned;
      }
    }

    // Limit to +66 + 9 digits
    if (cleaned.length > 12) {
      cleaned = cleaned.substring(0, 12);
    }

    // Format as +66 8 1234 5678
    if (cleaned.length > 3) {
      const prefix = cleaned.substring(0, 3); // +66
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
      setCooldown(30); // 30 second cooldown

      // Auto-fill OTP if returned in response (development/testing mode)
      if (response.data.otp) {
        setOtp(response.data.otp);
        toast.success(`OTP auto-filled: ${response.data.otp}`, { duration: 10000 });
      } else {
        toast.success('OTP sent to your phone!');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to send OTP';
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

      // Check if user needs to complete registration
      if (needs_registration || !user.registration_completed) {
        toast.success('Phone verified! Please complete your profile.');
        router.push(`/register?phone=${encodeURIComponent(cleanedPhone)}`);
      } else {
        toast.success('Welcome back!');
        router.push('/app/dashboard');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Invalid OTP. Please try again.';
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

      // Redirect based on user role
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/staff/scan');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Invalid credentials. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (showSplash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center animate-fade-in">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <Coffee className="w-24 h-24 text-white animate-bounce" strokeWidth={1.5} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border-4 border-white/20 rounded-full animate-ping" />
              </div>
            </div>
          </div>

          <h1 className="text-title text-white mb-4">
            SARNIES
          </h1>
          <p className="text-body text-white/70">Loyalty Program</p>

          <div className="flex justify-center gap-2 mt-8">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/announcements/coffee-beans-full.jpg"
          alt="Coffee beans background"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-black/80" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Sarnies Header - Brand Compliant */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6 shadow-2xl">
            <Coffee className="w-10 h-10 text-black" strokeWidth={2} />
          </div>
          <h1 className="text-title text-white mb-3 drop-shadow-lg">
            SARNIES
          </h1>
          <div className="inline-block bg-white text-black px-4 py-1 rounded-full mb-3">
            <span className="text-nav">DEMO</span>
          </div>
          <p className="text-body text-white/90 mb-2">Welcome to Sarnies Loyalty</p>
          <p className="text-caption text-white/60">Earn points for every purchase. Redeem for rewards.</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 animate-slide-up border border-white/20" style={{ animationDelay: '100ms' }}>
          {/* Mode Toggle */}
          <div className="flex mb-6 bg-black/5 rounded-xl p-1">
            <button
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                mode === 'customer'
                  ? 'bg-black text-white shadow-md'
                  : 'text-black/60 hover:text-black'
              }`}
              onClick={() => {
                setMode('customer');
                setError('');
              }}
            >
              <span className="text-nav">CUSTOMER</span>
            </button>
            <button
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                mode === 'staff'
                  ? 'bg-black text-white shadow-md'
                  : 'text-black/60 hover:text-black'
              }`}
              onClick={() => {
                setMode('staff');
                setError('');
              }}
            >
              <span className="text-nav">STAFF</span>
            </button>
            <button
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                mode === 'admin'
                  ? 'bg-black text-white shadow-md'
                  : 'text-black/60 hover:text-black'
              }`}
              onClick={() => {
                setMode('admin');
                setError('');
              }}
            >
              <span className="text-nav">ADMIN</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-caption text-red-800">{error}</p>
            </div>
          )}

          {/* Customer Login (OTP) */}
          {mode === 'customer' && (
            <div>
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-5">
                  {/* Quick Login (Dev Only) */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mb-6 p-4 bg-black/5 border border-black/10 rounded-xl">
                      <p className="text-nav text-black/60 mb-3">
                        QUICK LOGIN (DEV ONLY)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="px-3 py-2 bg-white border border-black/10 rounded-lg text-xs font-medium hover:bg-black/5 transition-colors text-left"
                          onClick={() => handlePhoneChange('+66898765432')}
                        >
                          Customer<br/>
                          <span className="text-black/50">Som</span>
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 bg-white border border-black/10 rounded-lg text-xs font-medium hover:bg-black/5 transition-colors text-left"
                          onClick={() => handlePhoneChange('+66812345678')}
                        >
                          Employee<br/>
                          <span className="text-black/50">Khin</span>
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 bg-white border border-black/10 rounded-lg text-xs font-medium hover:bg-black/5 transition-colors text-left"
                          onClick={() => handlePhoneChange('+66811111111')}
                        >
                          Investor<br/>
                          <span className="text-black/50">Test</span>
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 bg-white border border-black/10 rounded-lg text-xs font-medium hover:bg-black/5 transition-colors text-left"
                          onClick={() => handlePhoneChange('+66822222222')}
                        >
                          Media<br/>
                          <span className="text-black/50">Test</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-nav text-black/60 mb-2">
                      PHONE NUMBER
                    </label>
                    <input
                      type="tel"
                      className={`w-full px-4 py-3.5 rounded-xl border ${
                        error ? 'border-red-300' : 'border-black/10'
                      } focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-lg`}
                      placeholder="+66 8 1234 5678"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      autoFocus
                      required
                    />
                    <p className="text-caption text-black/40 mt-2">
                      Enter your Thai mobile number
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-black/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    disabled={loading || cooldown > 0}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-label">Sending OTP...</span>
                      </span>
                    ) : cooldown > 0 ? (
                      <span className="text-label">Wait {cooldown}s to resend</span>
                    ) : (
                      <span className="text-label">SEND OTP</span>
                    )}
                  </button>

                  {/* Consent Message */}
                  <p className="text-caption text-black/40 text-center leading-relaxed">
                    By continuing, you agree to receive OTP messages for account verification.
                  </p>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-nav text-black/60">
                        ENTER OTP
                      </label>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <input
                      type="text"
                      className="w-full px-4 py-4 rounded-xl border border-black/10 text-center text-3xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
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
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <p className="text-caption text-black/60">
                        OTP sent to {phone}
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-black/90 transition-all disabled:opacity-50 active:scale-[0.98]"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-label">Verifying...</span>
                      </span>
                    ) : (
                      <span className="text-label">VERIFY & LOGIN</span>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      className="text-caption text-black/60 hover:text-black transition-colors font-medium"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp('');
                        setError('');
                      }}
                    >
                      Change Number
                    </button>

                    {cooldown === 0 && (
                      <button
                        type="button"
                        className="text-caption text-black hover:underline font-medium"
                        onClick={(e: any) => handleSendOTP(e)}
                        disabled={loading}
                      >
                        Resend OTP
                      </button>
                    )}

                    {cooldown > 0 && (
                      <span className="text-caption text-black/40">
                        Resend in {cooldown}s
                      </span>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Staff Login */}
          {mode === 'staff' && (
            <form onSubmit={handleStaffLogin} className="space-y-5">
              <div>
                <label className="block text-nav text-black/60 mb-2">
                  EMAIL
                </label>
                <input
                  type="email"
                  className={`w-full px-4 py-3.5 rounded-xl border ${
                    error ? 'border-red-300' : 'border-black/10'
                  } focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all`}
                  placeholder="staff@sarnies.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-nav text-black/60 mb-2">
                  PASSWORD
                </label>
                <input
                  type="password"
                  className={`w-full px-4 py-3.5 rounded-xl border ${
                    error ? 'border-red-300' : 'border-black/10'
                  } focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all`}
                  placeholder="--------"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-black/90 transition-all disabled:opacity-50 active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-label">Logging in...</span>
                  </span>
                ) : (
                  <span className="text-label">STAFF LOGIN</span>
                )}
              </button>
            </form>
          )}

          {/* Admin Login (Email + Password) */}
          {mode === 'admin' && (
            <form onSubmit={handleStaffLogin} className="space-y-5">
              <div>
                <label className="block text-nav text-black/60 mb-2">
                  EMAIL
                </label>
                <input
                  type="email"
                  className={`w-full px-4 py-3.5 rounded-xl border ${
                    error ? 'border-red-300' : 'border-black/10'
                  } focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all`}
                  placeholder="admin@sarnies.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-nav text-black/60 mb-2">
                  PASSWORD
                </label>
                <input
                  type="password"
                  className={`w-full px-4 py-3.5 rounded-xl border ${
                    error ? 'border-red-300' : 'border-black/10'
                  } focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all`}
                  placeholder="--------"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-black/90 transition-all disabled:opacity-50 active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-label">Logging in...</span>
                  </span>
                ) : (
                  <span className="text-label">ADMIN LOGIN</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-caption text-white/60 mt-6 drop-shadow">
          2025 Sarnies. All rights reserved.
        </p>
      </div>
    </div>
  );
}
