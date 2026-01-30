'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function StaffForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/staff/forgot-password', { email });

      // In dev mode, save the reset link
      if (response.data.resetLink) {
        setResetLink(response.data.resetLink);
      }

      setSubmitted(true);
      toast.success('Check your email for reset instructions');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send reset email');
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
              Forgot Password
            </h1>
            <p
              className="text-[13px] text-[#78716C]"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Reset your staff account password
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-8">
        <div className="max-w-md mx-auto">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p
                className="text-[14px] text-[#57534E]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {/* Email Input */}
              <div>
                <label
                  className="block text-[13px] font-medium text-[#57534E] mb-2"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Email Address
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
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p
                className="text-center text-[14px] text-[#78716C]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Remember your password?{' '}
                <Link href="/login" className="text-[#D97706] font-semibold">
                  Login
                </Link>
              </p>
            </form>
          ) : (
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
                  If an account exists for <strong>{email}</strong>, you will receive a password reset link.
                </p>
              </div>

              {/* Dev mode: Show reset link */}
              {resetLink && (
                <div className="bg-[#FEF3C7] rounded-xl p-4 text-left">
                  <p
                    className="text-[11px] font-bold text-[#92400E] tracking-[1px] mb-2"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    DEV MODE - RESET LINK
                  </p>
                  <a
                    href={resetLink}
                    className="text-[13px] text-[#D97706] underline break-all"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    {resetLink}
                  </a>
                </div>
              )}

              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block w-full py-4 bg-[#1C1917] text-white rounded-xl font-semibold text-[16px] hover:bg-[#292524] transition-colors text-center"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Back to Login
                </Link>

                <button
                  onClick={() => {
                    setSubmitted(false);
                    setResetLink(null);
                  }}
                  className="w-full py-3 text-[#78716C] font-medium text-[14px]"
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Try a different email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
