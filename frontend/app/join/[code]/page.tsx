'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { Building2, AlertCircle, Loader2, Gift, Percent, CheckCircle, Mail } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store';

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
  invite_type: 'employee' | 'customer';
  direct_access: boolean;
  company: Company;
}

type PageState = 'loading' | 'error' | 'form' | 'email_sent';

function JoinCompanyContent() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const { setAuth } = useAuthStore();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Validate invite code on mount
  useEffect(() => {
    const validateCode = async () => {
      if (!code) {
        setError('Invalid invite link');
        setPageState('error');
        return;
      }

      try {
        const response = await api.get(`/companies/join/${code}`);
        setInviteData(response.data);
        setPageState('form');
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('This invite code is no longer valid or has expired.');
        } else if (err.response?.status === 410) {
          setError(err.response.data.error || 'This invite link has expired.');
        } else {
          setError('Unable to validate invite code. Please try again.');
        }
        setPageState('error');
      }
    };

    validateCode();
  }, [code]);

  // Listen for magic link verification via WebSocket
  useEffect(() => {
    if (!sessionId) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';
    const socket: Socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected, joining session:', sessionId);
      socket.emit('join_magic_link_session', sessionId);
    });

    socket.on('magic_link_verified', (data: any) => {
      console.log('✨ Magic link verified via WebSocket:', data);
      if (data.success && data.token) {
        // Set auth state
        setAuth(data.user, data.token);
        toast.success('Email verified!');

        // Navigate based on registration status
        if (data.needs_registration) {
          router.push('/register');
        } else {
          router.push('/app/home');
        }
      }
    });

    socket.on('connect_error', (error) => {
      console.warn('WebSocket connection error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, router, setAuth]);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setSending(true);
    try {
      const response = await api.post(`/companies/join/${code}/send-magic-link`, {
        email: email.trim().toLowerCase()
      });

      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
      }

      toast.success('Check your email for the login link!');
      setPageState('email_sent');
    } catch (err: any) {
      if (err.response?.status === 410) {
        toast.error(err.response.data.error || 'Invite link has expired');
      } else {
        toast.error(err.response?.data?.error || 'Failed to send email. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const company = inviteData?.company;
  const isEmployee = inviteData?.invite_type === 'employee';

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
        {pageState === 'loading' && (
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
        {pageState === 'error' && (
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

        {/* Form State - Email Input */}
        {pageState === 'form' && company && (
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
                {isEmployee
                  ? "You've been invited to join as a team member"
                  : "You've been invited to join our loyalty program"}
              </p>
            </div>

            {/* Benefits */}
            <div className="bg-[#F5F5F4] rounded-xl p-4 mb-6 space-y-3">
              {isEmployee && company.discount_percentage && company.discount_percentage > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#ECFDF5] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Percent className="w-4 h-4 text-[#059669]" />
                  </div>
                  <span
                    className="text-[13px] text-[#44403C]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    {company.discount_percentage}% employee discount
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
                  {isEmployee ? 'Exclusive team perks' : 'Exclusive member rewards'}
                </span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <div>
                <label
                  className="block text-[13px] font-medium text-[#44403C] mb-2"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Email Address
                </label>
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
                disabled={sending}
                className="w-full py-3.5 bg-[#1C1917] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-[#292524] transition-colors"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Login Link
                  </>
                )}
              </button>
            </form>

            <p
              className="text-[11px] text-[#A8A29E] text-center mt-4"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              We'll send you a magic link to sign in instantly
            </p>
          </div>
        )}

        {/* Email Sent State */}
        {pageState === 'email_sent' && company && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7E5E4] text-center">
            <div className="w-16 h-16 bg-[#FEF3C7] rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-[#D97706]" />
            </div>
            <h2
              className="text-[20px] font-bold text-[#1C1917] mb-2"
              style={{ fontFamily: 'Spline Sans, sans-serif' }}
            >
              Check Your Email
            </h2>
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
              {email}
            </p>
            <p
              className="text-[13px] text-[#78716C] mb-6"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Click the link to verify your email and {isEmployee ? 'join as a team member' : 'complete your membership'}.
            </p>

            <div className="flex items-center justify-center gap-2 text-[13px] text-[#78716C] mb-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for verification...</span>
            </div>

            <button
              onClick={() => {
                setPageState('form');
                setEmail('');
                setSessionId(null);
              }}
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
