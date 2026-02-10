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
      <div className="min-h-screen bg-stone-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-stone-200 px-5 py-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Link href="/login" className="text-stone-500 hover:text-stone-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-stone-900">
                Reset Password
              </h1>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex-1 px-5 py-8">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-stone-900">
                Invalid Link
              </h2>
              <p className="text-sm text-stone-500 mt-2">
                {error}
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/staff/forgot-password"
                className="block w-full py-4 bg-stone-900 text-white rounded-xl font-semibold text-base hover:bg-stone-800 transition-colors text-center"
              >
                Request New Link
              </Link>

              <Link
                href="/login"
                className="block w-full py-3 text-stone-500 font-medium text-sm"
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
      <div className="min-h-screen bg-stone-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-stone-200 px-5 py-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold text-stone-900">
                Password Reset
              </h1>
            </div>
          </div>
        </div>

        {/* Success Content */}
        <div className="flex-1 px-5 py-8">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-stone-900">
                Password Updated!
              </h2>
              <p className="text-sm text-stone-500 mt-2">
                Your password has been reset successfully. You can now login with your new password.
              </p>
            </div>

            <button
              onClick={() => router.push('/login')}
              className="w-full py-4 bg-stone-900 text-white rounded-xl font-semibold text-base hover:bg-stone-800 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              Reset Password
            </h1>
            <p className="text-[13px] text-stone-500">
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
              <label className="block text-[13px] font-medium text-stone-600 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-stone-200 text-base focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[13px] font-medium text-stone-600 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-stone-200 text-base focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-stone-900 text-white rounded-xl font-semibold text-base hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
