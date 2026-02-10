'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Loader2, Mail, Gift, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { getWebSocketUrl } from '@/lib/config';
import api from '@/lib/api';

type PageState = 'email' | 'sent' | 'profile' | 'done';

function RegisterPageContent() {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();

  const [pageState, setPageState] = useState<PageState>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Profile form
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');

  // If user is authenticated but needs registration, go to profile step
  useEffect(() => {
    if (user && !(user as any).registration_completed) {
      setEmail(user.email || '');
      setName(user.name || '');
      setSurname(user.surname || '');
      setPageState('profile');
    } else if (user && (user as any).registration_completed) {
      router.push('/app/home');
    }
  }, [user, router]);

  // WebSocket for magic link verification
  useEffect(() => {
    if (!sessionId) return;

    const socket: Socket = io(getWebSocketUrl(), {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_magic_link_session', sessionId);
    });

    socket.on('magic_link_verified', (data: any) => {
      if (data.success && data.token) {
        setAuth(data.user, data.token);

        if (data.needs_registration) {
          setEmail(data.user.email || '');
          setPageState('profile');
        } else {
          toast.success('Welcome back!');
          router.push('/app/home');
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, router, setAuth]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.sendMagicLink(email.trim().toLowerCase());

      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
      }

      setPageState('sent');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.register({
        user_id: user?.id,
        name: name.trim(),
        surname: surname.trim(),
        birthday,
        gender,
        email_consent: true,
        sms_consent: true,
      });

      const { token, user: updatedUser } = response.data;
      setAuth(updatedUser, token);

      setPageState('done');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLINELogin = () => {
    const lineClientId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    const redirectUri = `${window.location.origin}/auth/line/callback`;
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('line_state', state);

    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${lineClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile%20openid%20email`;

    window.location.href = lineAuthUrl;
  };

  const handleTryAgain = () => {
    setPageState('email');
    setEmail('');
    setSessionId(null);
  };

  const handleGoHome = () => {
    router.push('/app/home');
  };

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

        {/* Step 1: Email Entry */}
        {pageState === 'email' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7E5E4]">
            <h2
              className="text-[20px] font-bold text-[#1C1917] mb-2 text-center"
              style={{ fontFamily: 'Spline Sans, sans-serif' }}
            >
              Join Sarnies Loyalty
            </h2>
            <p
              className="text-[14px] text-[#57534E] text-center mb-6"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Earn points and rewards on every visit
            </p>

            {/* Benefits preview */}
            <div className="bg-[#F5F5F4] rounded-xl p-4 mb-6 space-y-3">
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

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full px-4 py-3 border border-[#D6D3D1] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1C1917]"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#1C1917] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-[#292524] transition-colors"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </form>

            {/* LINE Login Option */}
            {process.env.NEXT_PUBLIC_LINE_CHANNEL_ID && (
              <>
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-[#E7E5E4]" />
                  <span className="text-[12px] text-[#A8A29E]">or</span>
                  <div className="flex-1 h-px bg-[#E7E5E4]" />
                </div>

                <button
                  onClick={handleLINELogin}
                  className="w-full py-3.5 bg-[#06C755] text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#05B04C] transition-colors"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Continue with LINE
                </button>
              </>
            )}

            <div className="mt-6 text-center">
              <p
                className="text-[13px] text-[#78716C]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Already have an account?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="text-[#1C1917] font-medium hover:underline"
                >
                  Log in
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Email Sent */}
        {pageState === 'sent' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7E5E4] text-center">
            <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-[#059669]" />
            </div>
            <h2
              className="text-[20px] font-bold text-[#1C1917] mb-2"
              style={{ fontFamily: 'Spline Sans, sans-serif' }}
            >
              Check your email
            </h2>
            <p
              className="text-[14px] text-[#57534E] mb-1"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              We sent a verification link to
            </p>
            <p
              className="text-[14px] font-semibold text-[#1C1917] mb-6"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              {email}
            </p>

            <div className="flex items-center justify-center gap-2 text-[13px] text-[#78716C] mb-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for verification...</span>
            </div>

            <button
              onClick={handleTryAgain}
              className="text-[13px] text-[#78716C] hover:text-[#1C1917]"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Use a different email
            </button>
          </div>
        )}

        {/* Step 3: Profile Completion */}
        {pageState === 'profile' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7E5E4]">
            <h2
              className="text-[20px] font-bold text-[#1C1917] mb-2 text-center"
              style={{ fontFamily: 'Spline Sans, sans-serif' }}
            >
              Almost there
            </h2>
            <p
              className="text-[14px] text-[#57534E] text-center mb-6"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Tell us a bit about yourself
            </p>

            {/* Show verified email */}
            <div className="bg-[#F5F5F4] rounded-xl p-3 mb-6 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#059669]" />
              <div>
                <p className="text-[11px] text-[#78716C]">Verified email</p>
                <p className="text-[13px] text-[#1C1917] font-medium">{email || user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#44403C] mb-2">
                  First name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your first name"
                  className="w-full px-4 py-3 border border-[#D6D3D1] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1C1917]"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#44403C] mb-2">
                  Last name
                </label>
                <input
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Your last name"
                  className="w-full px-4 py-3 border border-[#D6D3D1] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1C1917]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#44403C] mb-2">
                  Birthday (optional)
                </label>
                <input
                  type="text"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  placeholder="DD-MM"
                  maxLength={5}
                  className="w-full px-4 py-3 border border-[#D6D3D1] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1C1917]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#44403C] mb-2">
                  Gender (optional)
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-3 border border-[#D6D3D1] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1C1917] bg-white"
                >
                  <option value="">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#1C1917] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-[#292524] transition-colors"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 4: Done */}
        {pageState === 'done' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7E5E4] text-center">
            <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-[#059669]" />
            </div>
            <h2
              className="text-[20px] font-bold text-[#1C1917] mb-2"
              style={{ fontFamily: 'Spline Sans, sans-serif' }}
            >
              You&apos;re all set!
            </h2>
            <p
              className="text-[14px] text-[#57534E] mb-6"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Welcome to Sarnies Loyalty, {name}
            </p>

            <button
              onClick={handleGoHome}
              className="w-full py-3.5 bg-[#1C1917] text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#292524] transition-colors"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Start earning rewards
              <ArrowRight className="w-4 h-4" />
            </button>
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
