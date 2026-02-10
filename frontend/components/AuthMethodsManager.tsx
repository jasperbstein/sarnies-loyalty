'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface AuthMethod {
  type: 'phone' | 'email' | 'line';
  identifier: string;
  is_verified: boolean;
  is_primary: boolean;
  picture_url?: string;
}

interface AuthMethodsManagerProps {
  onUpdate?: () => void;
}

export default function AuthMethodsManager({ onUpdate }: AuthMethodsManagerProps) {
  const [methods, setMethods] = useState<AuthMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<'phone' | 'email' | null>(null);
  const [newIdentifier, setNewIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAuthMethods();
  }, []);

  const fetchAuthMethods = async () => {
    try {
      const response = await api.get('/users/me/auth-methods');
      setMethods(response.data.auth_methods || []);
    } catch (err: any) {
      console.error('Failed to fetch auth methods:', err);
      setError('Failed to load login methods');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = async (type: 'phone' | 'email') => {
    if (!newIdentifier) return;

    setSubmitting(true);
    setError(null);

    try {
      const endpoint = type === 'phone' ? '/users/me/phone' : '/users/me/email';
      await api.post(endpoint, { [type]: newIdentifier });
      setOtpSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send verification code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!otp || !addingType) return;

    setSubmitting(true);
    setError(null);

    try {
      const endpoint = addingType === 'phone' ? '/users/me/phone/verify' : '/users/me/email/verify';
      await api.post(endpoint, { [addingType]: newIdentifier, otp });

      // Reset and refresh
      setAddingType(null);
      setNewIdentifier('');
      setOtp('');
      setOtpSent(false);
      await fetchAuthMethods();
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (type: string) => {
    if (methods.length <= 1) {
      setError('Cannot remove your only login method');
      return;
    }

    if (!confirm(`Remove ${type} from your account? You won't be able to log in with it anymore.`)) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.delete(`/users/me/auth-methods/${type}`);
      await fetchAuthMethods();
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove login method');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPrimary = async (type: string) => {
    setSubmitting(true);
    setError(null);

    try {
      await api.put(`/users/me/auth-methods/${type}/primary`);
      await fetchAuthMethods();
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set as primary');
    } finally {
      setSubmitting(false);
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'phone':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      case 'email':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'line':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
        );
      default:
        return null;
    }
  };

  const hasPhone = methods.some(m => m.type === 'phone');
  const hasEmail = methods.some(m => m.type === 'email');
  const hasLine = methods.some(m => m.type === 'line');

  if (loading) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-4 bg-neutral-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-12 bg-neutral-200 rounded"></div>
          <div className="h-12 bg-neutral-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-neutral-900">Login Methods</h3>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Existing methods */}
      <div className="space-y-2">
        {methods.map((method) => (
          <div
            key={method.type}
            className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                method.type === 'line' ? 'bg-[#00B900] text-white' : 'bg-neutral-200 text-neutral-600'
              }`}>
                {method.type === 'line' && method.picture_url ? (
                  <Image
                    src={method.picture_url}
                    alt="LINE"
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                ) : (
                  getMethodIcon(method.type)
                )}
              </div>
              <div>
                <div className="font-medium text-neutral-900 capitalize">
                  {method.type === 'line' ? 'LINE' : method.type}
                  {method.is_primary && (
                    <span className="ml-2 text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      Primary
                    </span>
                  )}
                </div>
                <div className="text-sm text-neutral-500">
                  {method.identifier}
                  {method.is_verified && (
                    <span className="ml-1 text-green-600">✓</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!method.is_primary && method.is_verified && (
                <button
                  onClick={() => handleSetPrimary(method.type)}
                  disabled={submitting}
                  className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  Set primary
                </button>
              )}
              {methods.length > 1 && (
                <button
                  onClick={() => handleRemove(method.type)}
                  disabled={submitting}
                  className="p-1 text-neutral-400 hover:text-red-500 disabled:opacity-50"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add new method */}
      {addingType ? (
        <div className="p-4 border border-neutral-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Add {addingType}</h4>
            <button
              onClick={() => {
                setAddingType(null);
                setNewIdentifier('');
                setOtp('');
                setOtpSent(false);
              }}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!otpSent ? (
            <>
              <input
                type={addingType === 'email' ? 'email' : 'tel'}
                value={newIdentifier}
                onChange={(e) => setNewIdentifier(e.target.value)}
                placeholder={addingType === 'email' ? 'Enter email address' : 'Enter phone number'}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={() => handleAddMethod(addingType)}
                disabled={submitting || !newIdentifier}
                className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Send Verification Code'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-600">
                Enter the verification code sent to {newIdentifier}
              </p>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-2xl tracking-widest"
                maxLength={6}
              />
              <button
                onClick={handleVerify}
                disabled={submitting || otp.length !== 6}
                className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Verifying...' : 'Verify'}
              </button>
              <button
                onClick={() => handleAddMethod(addingType)}
                disabled={submitting}
                className="w-full py-2 text-primary-600 hover:text-primary-700 text-sm disabled:opacity-50"
              >
                Resend code
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          {!hasPhone && (
            <button
              onClick={() => setAddingType('phone')}
              className="flex-1 flex items-center justify-center gap-2 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
            >
              {getMethodIcon('phone')}
              <span>Add Phone</span>
            </button>
          )}
          {!hasEmail && (
            <button
              onClick={() => setAddingType('email')}
              className="flex-1 flex items-center justify-center gap-2 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
            >
              {getMethodIcon('email')}
              <span>Add Email</span>
            </button>
          )}
        </div>
      )}

      {/* LINE linking button */}
      {!hasLine && (
        <LinkLineButton />
      )}
    </div>
  );
}

function LinkLineButton() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLinkLine = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Get LINE auth URL with link_user_id to link to existing account
      const response = await api.get('/line/auth-url', {
        params: { link_user_id: user.id }
      });

      // Redirect to LINE OAuth
      window.location.href = response.data.auth_url;
    } catch (err) {
      console.error('Failed to get LINE auth URL:', err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLinkLine}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-3 bg-[#00B900] text-white rounded-lg hover:bg-[#00A000] disabled:opacity-50"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
      <span>{loading ? 'Connecting...' : 'Link LINE Account'}</span>
    </button>
  );
}
