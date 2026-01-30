'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast.error('Please enter a new password');
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
      await api.post('/auth/staff/reset-password', { token, password });
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to reset password';
      toast.error(errorMessage);
      if (errorMessage.includes('expired') || errorMessage.includes('Invalid')) {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (error) {
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
                Reset Password
              </h1>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex-1 px-5 py-8">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-[#FEE2E2] flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-[#DC2626]" />
            </div>

            <div>
              <h2
                className="text-[20px] font-bold text-[#1C1917]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Invalid Link
              </h2>
              <p
                className="text-[14px] text-[#78716C] mt-2"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                {error}
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/staff/forgot-password"
                className="block w-full py-4 bg-[#1C1917] text-white rounded-xl font-semibold text-[16px] hover:bg-[#292524] transition-colors text-center"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Request New Link
              </Link>

              <Link
                href="/login"
                className="block w-full py-3 text-[#78716C] font-medium text-[14px]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-[#E7E5E4] px-5 py-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <div>
              <h1
                className="text-[18px] font-bold text-[#1C1917]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Password Reset
              </h1>
            </div>
          </div>
        </div>

        {/* Success Content */}
        <div className="flex-1 px-5 py-8">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-[#16A34A]" />
            </div>

            <div>
              <h2
                className="text-[20px] font-bold text-[#1C1917]"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Password Updated!
              </h2>
              <p
                className="text-[14px] text-[#78716C] mt-2"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Your password has been reset successfully. You can now login with your new password.
              </p>
            </div>

            <button
              onClick={() => router.push('/login')}
              className="w-full py-4 bg-[#1C1917] text-white rounded-xl font-semibold text-[16px] hover:bg-[#292524] transition-colors"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              Reset Password
            </h1>
            <p
              className="text-[13px] text-[#78716C]"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Create a new password
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-8">
        <div className="max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div>
              <label
                className="block text-[13px] font-medium text-[#57534E] mb-2"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                New Password
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
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function StaffResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97706]"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
