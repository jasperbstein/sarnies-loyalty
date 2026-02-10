'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, Check, AlertCircle, Loader2 } from 'lucide-react';
import PINInput from './PINInput';
import { usePINAuth } from '@/hooks/usePINAuth';
import toast from 'react-hot-toast';

type Step = 'enter' | 'confirm' | 'success';

interface PINSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Modal for setting up a 6-digit PIN
 * Sarnies Design System v2.0
 */
export default function PINSetupModal({ isOpen, onClose, onSuccess }: PINSetupModalProps) {
  const [step, setStep] = useState<Step>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [localError, setLocalError] = useState('');

  const { setupPIN, isLoading, error, clearError } = usePINAuth();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('enter');
      setPin('');
      setConfirmPin('');
      setLocalError('');
      clearError();
    }
  }, [isOpen, clearError]);

  const handlePinComplete = (value: string) => {
    if (step === 'enter') {
      setPin(value);
      setStep('confirm');
      setConfirmPin('');
      setLocalError('');
    }
  };

  const handleConfirmComplete = async (value: string) => {
    setConfirmPin(value);

    if (value !== pin) {
      setLocalError('PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }

    // Submit PIN
    const success = await setupPIN(value);
    if (success) {
      setStep('success');
      toast.success('PIN set up successfully!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    }
  };

  const handleBack = () => {
    setStep('enter');
    setConfirmPin('');
    setLocalError('');
    clearError();
  };

  if (!isOpen) return null;

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                {step === 'success' ? 'PIN Created' : 'Set Up PIN'}
              </h2>
              <p className="text-sm text-stone-500">
                {step === 'enter' && 'Enter a 6-digit PIN'}
                {step === 'confirm' && 'Confirm your PIN'}
                {step === 'success' && 'Your PIN is ready to use'}
              </p>
            </div>
          </div>
          {step !== 'success' && (
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {step === 'success' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-center text-stone-600">
                You can now use your PIN to sign in quickly.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${step === 'enter' ? 'bg-stone-900' : 'bg-stone-300'}`} />
                <div className={`w-2 h-2 rounded-full ${step === 'confirm' ? 'bg-stone-900' : 'bg-stone-300'}`} />
              </div>

              {/* Error message */}
              {displayError && (
                <div className="w-full p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{displayError}</p>
                </div>
              )}

              {/* PIN Input */}
              {step === 'enter' && (
                <PINInput
                  value={pin}
                  onChange={setPin}
                  onComplete={handlePinComplete}
                  disabled={isLoading}
                  autoFocus
                />
              )}

              {step === 'confirm' && (
                <PINInput
                  value={confirmPin}
                  onChange={setConfirmPin}
                  onComplete={handleConfirmComplete}
                  disabled={isLoading}
                  error={!!localError}
                  autoFocus
                />
              )}

              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center gap-2 text-stone-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Setting up PIN...</span>
                </div>
              )}

              {/* Instructions */}
              <p className="text-sm text-stone-500 text-center">
                {step === 'enter'
                  ? 'Choose a 6-digit PIN you can remember easily.'
                  : 'Enter the same PIN again to confirm.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="px-6 pb-6 flex gap-3">
            {step === 'confirm' && (
              <button
                onClick={handleBack}
                disabled={isLoading}
                className="flex-1 h-12 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                Back
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isLoading}
              className={`${step === 'confirm' ? 'flex-1' : 'w-full'} h-12 rounded-xl border border-stone-200 text-stone-500 font-medium hover:bg-stone-50 transition-colors disabled:opacity-50`}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
