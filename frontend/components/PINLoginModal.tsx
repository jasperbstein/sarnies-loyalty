'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, AlertCircle, Loader2, ArrowLeft, Mail } from 'lucide-react';
import PINInput from './PINInput';
import { usePINAuth } from '@/hooks/usePINAuth';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface PINLoginModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
  onUseMagicLink: () => void;
  rememberMe?: string;
}

/**
 * Modal for logging in with PIN
 * Sarnies Design System v2.0
 */
export default function PINLoginModal({
  isOpen,
  email,
  onClose,
  onUseMagicLink,
  rememberMe = '7d',
}: PINLoginModalProps) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const { verifyPIN, isLoading, error, clearError } = usePINAuth();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setAttemptsRemaining(null);
      clearError();
    }
  }, [isOpen, clearError]);

  const handlePinComplete = async (value: string) => {
    const result = await verifyPIN(email, value, rememberMe);

    if (result.success) {
      // Save email for next time (for returning users)
      localStorage.setItem('last_login_email', email);
      toast.success('Welcome back!');
      router.push('/app/home');
    } else {
      setPin('');
      if (result.attemptsRemaining !== undefined) {
        setAttemptsRemaining(result.attemptsRemaining);
      }
    }
  };

  const handleUseMagicLink = () => {
    onClose();
    onUseMagicLink();
  };

  if (!isOpen) return null;

  const isLockedOut = attemptsRemaining === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isLockedOut ? 'bg-red-100' : 'bg-stone-100'
            }`}>
              <Lock className={`w-5 h-5 ${isLockedOut ? 'text-red-600' : 'text-stone-600'}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                {isLockedOut ? 'Account Locked' : 'Enter PIN'}
              </h2>
              <p className="text-sm text-stone-500 truncate max-w-[200px]">
                {email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {isLockedOut ? (
            <div className="flex flex-col items-center gap-6">
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-700 text-center">
                  Too many failed attempts. Your account is temporarily locked.
                </p>
              </div>

              <p className="text-sm text-stone-500 text-center">
                You can still log in using a magic link sent to your email.
              </p>

              <button
                onClick={handleUseMagicLink}
                className="w-full h-12 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Send Magic Link
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              {/* Error message */}
              {error && (
                <div className="w-full p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Attempts remaining warning */}
              {attemptsRemaining !== null && attemptsRemaining <= 2 && attemptsRemaining > 0 && (
                <div className="w-full p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-sm text-amber-700 text-center">
                    {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before lockout
                  </p>
                </div>
              )}

              {/* PIN Input */}
              <PINInput
                value={pin}
                onChange={setPin}
                onComplete={handlePinComplete}
                disabled={isLoading}
                error={!!error}
                autoFocus
              />

              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center gap-2 text-stone-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Verifying...</span>
                </div>
              )}

              {/* Forgot PIN / Magic link option */}
              <button
                onClick={handleUseMagicLink}
                className="text-sm text-stone-500 hover:text-stone-700 transition-colors flex items-center gap-1"
              >
                <Mail className="w-4 h-4" />
                Forgot PIN? Use magic link
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-xl border border-stone-200 text-stone-500 font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Use a different email
          </button>
        </div>
      </div>
    </div>
  );
}
