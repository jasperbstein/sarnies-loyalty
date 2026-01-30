'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Mail, Lock, User, MapPin, ArrowLeft, CheckCircle, Building2, ChevronDown } from 'lucide-react';

type RegistrationStep = 'email' | 'details' | 'success';

interface Company {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  staff_default_branch?: string;
}

interface Outlet {
  id: number;
  name: string;
}

export default function StaffRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<RegistrationStep>('email');
  const [loading, setLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');

  // Company info
  const [company, setCompany] = useState<Company | null>(null);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);

  // Outlets for branch selection
  const [outlets, setOutlets] = useState<Outlet[]>([]);

  // Fetch outlets when moving to details step
  useEffect(() => {
    if (step === 'details') {
      fetchOutlets();
    }
  }, [step]);

  const fetchOutlets = async () => {
    try {
      const response = await api.get('/outlets');
      setOutlets(response.data || []);
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    }
  };

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/staff/check-email', { email });
      const data = response.data;

      if (data.eligible) {
        setCompany(data.company);
        if (data.company.staff_default_branch) {
          setBranch(data.company.staff_default_branch);
        }

        if (data.pending_verification) {
          toast.error('Account pending verification. Check your email or request a new link.');
        } else {
          setStep('details');
        }
      } else {
        if (data.already_registered) {
          toast.error('An account with this email already exists. Please login instead.');
        } else {
          toast.error(data.message || 'This email domain is not authorized for staff registration');
        }
      }
    } catch (error: any) {
      console.error('Email check error:', error);
      toast.error(error.response?.data?.error || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      toast.error('Please enter your name');
      return;
    }
    if (!password) {
      toast.error('Please enter a password');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/staff/register', {
        email,
        password,
        name,
        branch: branch || undefined
      });

      const data = response.data;

      // In dev mode, save the verification link
      if (data.verificationLink) {
        setVerificationLink(data.verificationLink);
      }

      setStep('success');
      toast.success('Registration successful! Check your email to verify your account.');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#E7E5E4] px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/login" className="text-[#78716C] hover:text-[#1C1917]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1
              className="text-[18px] font-bold text-[#1C1917]"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Staff Registration
            </h1>
            <p
              className="text-[13px] text-[#78716C]"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Register using your company email
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-8">
        <div className="max-w-md mx-auto">
          {step === 'email' && (
            <form onSubmit={handleCheckEmail} className="space-y-6">
              {/* Info Card */}
              <div className="bg-[#FEF3C7] rounded-xl p-4">
                <div className="flex gap-3">
                  <Building2 className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
                  <div>
                    <p
                      className="text-[14px] font-semibold text-[#92400E]"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    >
                      Company Email Required
                    </p>
                    <p
                      className="text-[13px] text-[#B45309] mt-1"
                      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                    >
                      Use your company email address (e.g., name@sarnies.com) to register as staff.
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label
                  className="block text-[13px] font-medium text-[#57534E] mb-2"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Company Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A8A29E]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-[#E7E5E4] text-[16px] focus:outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#1C1917] text-white rounded-xl font-semibold text-[16px] hover:bg-[#292524] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                {loading ? 'Checking...' : 'Continue'}
              </button>

              <p
                className="text-center text-[14px] text-[#78716C]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Already have an account?{' '}
                <Link href="/login" className="text-[#D97706] font-semibold">
                  Login
                </Link>
              </p>
            </form>
          )}

          {step === 'details' && company && (
            <form onSubmit={handleRegister} className="space-y-6">
              {/* Company Badge */}
              <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#FEF3C7] flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-[#D97706]" />
                </div>
                <div>
                  <p
                    className="text-[15px] font-semibold text-[#1C1917]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    {company.name}
                  </p>
                  <p
                    className="text-[13px] text-[#78716C]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    {email}
                  </p>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label
                  className="block text-[13px] font-medium text-[#57534E] mb-2"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A8A29E]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-[#E7E5E4] text-[16px] focus:outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  />
                </div>
              </div>

              {/* Branch Selection */}
              <div>
                <label
                  className="block text-[13px] font-medium text-[#57534E] mb-2"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Branch / Location (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A8A29E] pointer-events-none" />
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full pl-12 pr-10 py-4 rounded-xl border border-[#E7E5E4] text-[16px] focus:outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706] appearance-none bg-white"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    <option value="">Select your branch</option>
                    {outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.name}>
                        {outlet.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A8A29E] pointer-events-none" />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  className="block text-[13px] font-medium text-[#57534E] mb-2"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A8A29E]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-[#E7E5E4] text-[16px] focus:outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  className="block text-[13px] font-medium text-[#57534E] mb-2"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A8A29E]" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-[#E7E5E4] text-[16px] focus:outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#1C1917] text-white rounded-xl font-semibold text-[16px] hover:bg-[#292524] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full py-3 text-[#78716C] font-medium text-[14px]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Back to email
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-[#16A34A]" />
              </div>

              <div>
                <h2
                  className="text-[20px] font-bold text-[#1C1917]"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Check Your Email
                </h2>
                <p
                  className="text-[14px] text-[#78716C] mt-2"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  We sent a verification link to <strong>{email}</strong>.
                  Click the link to activate your account.
                </p>
              </div>

              {/* Dev mode: Show verification link */}
              {verificationLink && (
                <div className="bg-[#FEF3C7] rounded-xl p-4 text-left">
                  <p
                    className="text-[11px] font-bold text-[#92400E] tracking-[1px] mb-2"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    DEV MODE - VERIFICATION LINK
                  </p>
                  <a
                    href={verificationLink}
                    className="text-[13px] text-[#D97706] underline break-all"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    {verificationLink}
                  </a>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full py-4 bg-[#1C1917] text-white rounded-xl font-semibold text-[16px] hover:bg-[#292524] transition-colors"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Go to Login
                </button>

                <button
                  onClick={async () => {
                    try {
                      const response = await api.post('/auth/staff/resend-verification', { email });
                      if (response.data.verificationLink) {
                        setVerificationLink(response.data.verificationLink);
                      }
                      toast.success('Verification email resent');
                    } catch {
                      toast.error('Failed to resend email');
                    }
                  }}
                  className="w-full py-3 text-[#78716C] font-medium text-[14px]"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Resend verification email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
