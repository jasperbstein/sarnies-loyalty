'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PINInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  showToggle?: boolean;
}

/**
 * 6-digit PIN input component with individual boxes
 * Sarnies Design System v2.0
 */
export default function PINInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = false,
  showToggle = true,
}: PINInputProps) {
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount if autoFocus
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Get individual digits from value
  const digits = value.split('').slice(0, 6);

  const handleDigitChange = useCallback((index: number, digit: string) => {
    // Only allow single digits
    const sanitized = digit.replace(/\D/g, '').slice(-1);

    // Build new value
    const newDigits = [...digits];
    while (newDigits.length < 6) newDigits.push('');

    if (sanitized) {
      newDigits[index] = sanitized;
      const newValue = newDigits.join('');
      onChange(newValue);

      // Move to next input
      if (index < 5 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
      }

      // Check if complete
      if (newValue.length === 6 && onComplete) {
        onComplete(newValue);
      }
    }
  }, [digits, onChange, onComplete]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];
      while (newDigits.length < 6) newDigits.push('');

      if (digits[index]) {
        // Clear current digit
        newDigits[index] = '';
        onChange(newDigits.join(''));
      } else if (index > 0) {
        // Move to previous and clear
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }, [digits, onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedText) {
      onChange(pastedText);
      // Focus the appropriate input
      const nextIndex = Math.min(pastedText.length, 5);
      inputRefs.current[nextIndex]?.focus();

      if (pastedText.length === 6 && onComplete) {
        onComplete(pastedText);
      }
    }
  }, [onChange, onComplete]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* PIN digit boxes */}
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digits[index] || ''}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={handleFocus}
            disabled={disabled}
            className={`
              w-12 h-14 text-center text-xl font-semibold
              rounded-xl border-2 transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error
                ? 'border-red-400 bg-red-50 focus:ring-red-300'
                : digits[index]
                  ? 'border-stone-900 bg-stone-50 focus:ring-stone-400'
                  : 'border-stone-200 bg-white focus:border-stone-900 focus:ring-stone-400'
              }
            `}
            style={{ fontFamily: 'monospace' }}
            aria-label={`PIN digit ${index + 1}`}
          />
        ))}
      </div>

      {/* Show/hide toggle */}
      {showToggle && (
        <button
          type="button"
          onClick={() => setShowPin(!showPin)}
          disabled={disabled}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors disabled:opacity-50"
        >
          {showPin ? (
            <>
              <EyeOff className="w-4 h-4" />
              Hide PIN
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Show PIN
            </>
          )}
        </button>
      )}
    </div>
  );
}
