'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { getWebSocketUrl } from '@/lib/config';

type PageState = 'email' | 'sent';

function LoginPageContent() {
  const router = useRouter();
  const { setAuth, user } = useAuthStore();

  const [pageState, setPageState] = useState<PageState>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
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
        toast.success('Welcome back!');

        if (data.needs_registration) {
          router.push('/register');
        } else {
          router.push('/app/home');
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, router, setAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      // Send magic link
      const response = await authAPI.sendMagicLink(email.trim().toLowerCase());

      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
      }

      setPageState('sent');
    } catch (error: any) {
      if (error.response?.status === 404) {
        // User not found - redirect to register
        toast.error('No account found. Please sign up first.');
        router.push('/register');
      } else {
        toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setPageState('email');
    setEmail('');
    setSessionId(null);
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

        {/* Email Entry */}
        {pageState === 'email' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7E5E4]">
            <h2
              className="text-[20px] font-bold text-[#1C1917] mb-2 text-center"
              style={{ fontFamily: 'Spline Sans, sans-serif' }}
            >
              Welcome back
            </h2>
            <p
              className="text-[14px] text-[#57534E] text-center mb-6"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Enter your email to continue
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="mt-6 text-center">
              <p
                className="text-[13px] text-[#78716C]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => router.push('/register')}
                  className="text-[#1C1917] font-medium hover:underline"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Email Sent */}
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
              We sent a login link to
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
