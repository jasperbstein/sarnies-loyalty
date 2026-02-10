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
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/login" className="text-stone-500 hover:text-stone-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-stone-900">
              Forgot Password
            </h1>
            <p className="text-[13px] text-stone-500">
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
              <p className="text-sm text-stone-600">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {/* Email Input */}
              <div>
                <label className="block text-[13px] font-medium text-stone-600 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-stone-200 text-base focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-stone-900 text-white rounded-xl font-semibold text-base hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p className="text-center text-sm text-stone-500">
                Remember your password?{' '}
                <Link href="/login" className="text-amber-600 font-semibold">
                  Login
                </Link>
              </p>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  Check Your Email
                </h2>
                <p className="text-sm text-stone-500 mt-2">
                  If an account exists for <strong>{email}</strong>, you will receive a password reset link.
                </p>
              </div>

              {/* Dev mode: Show reset link */}
              {resetLink && (
                <div className="bg-amber-100 rounded-xl p-4 text-left">
                  <p className="text-[11px] font-bold text-amber-800 tracking-wider mb-2">
                    DEV MODE - RESET LINK
                  </p>
                  <a
                    href={resetLink}
                    className="text-[13px] text-amber-600 underline break-all"
                  >
                    {resetLink}
                  </a>
                </div>
              )}

              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block w-full py-4 bg-stone-900 text-white rounded-xl font-semibold text-base hover:bg-stone-800 transition-colors text-center"
                >
                  Back to Login
                </Link>

                <button
                  onClick={() => {
                    setSubmitted(false);
                    setResetLink(null);
                  }}
                  className="w-full py-3 text-stone-500 font-medium text-sm"
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
