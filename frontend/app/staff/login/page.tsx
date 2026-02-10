'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';
import { isStaffUser, isAdminUser } from '@/lib/authUtils';
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function StaffLoginPage() {
  const router = useRouter();
  const { setAuth, user, hasHydrated } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already logged in as staff/admin
  useEffect(() => {
    if (mounted && hasHydrated && (isStaffUser(user) || isAdminUser(user))) {
      if (isAdminUser(user)) {
        router.push('/admin/dashboard');
      } else {
        router.push('/staff/scan');
      }
    }
  }, [mounted, hasHydrated, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.staffLogin(email.trim().toLowerCase(), password, 'true');
      const { token, user: userData } = response.data;

      setAuth({ ...userData, type: userData.role === 'admin' ? 'admin' : 'staff' }, token);
      toast.success('Welcome back!');

      if (userData.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/staff/scan');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response?.status === 401) {
        setError('Invalid email or password.');
      } else if (err.response?.status === 403) {
        setError('Your account is not active. Please contact an administrator.');
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#E5E5E5] border-t-[#111] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Header */}
      <header className="px-4 py-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[13px] text-[#666] hover:text-[#111] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to main login
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-[#111] rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-lg font-semibold text-white">S</span>
            </div>
            <h1 className="text-xl font-semibold text-[#111]">Staff Login</h1>
            <p className="text-[13px] text-[#666] mt-1">
              Sign in to access the staff portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[12px] font-medium text-[#666] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="staff@sarnies.com"
                  className="w-full h-11 pl-10 pr-4 bg-white border border-[#E5E5E5] rounded-lg text-[14px] text-[#111] placeholder:text-[#999] focus:outline-none focus:border-[#111] transition-colors"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[12px] font-medium text-[#666] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your password"
                  className="w-full h-11 pl-10 pr-10 bg-white border border-[#E5E5E5] rounded-lg text-[14px] text-[#111] placeholder:text-[#999] focus:outline-none focus:border-[#111] transition-colors"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#666] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg">
                <p className="text-[13px] text-[#DC2626]">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#111] text-white rounded-lg font-medium text-[14px] hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Forgot Password */}
            <div className="text-center">
              <Link
                href="/staff/forgot-password"
                className="text-[13px] text-[#666] hover:text-[#111] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </form>

          {/* Register */}
          <div className="mt-8 pt-6 border-t border-[#E5E5E5] text-center">
            <p className="text-[13px] text-[#666]">
              Need a staff account?{' '}
              <Link href="/staff/register" className="text-[#111] font-medium hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
