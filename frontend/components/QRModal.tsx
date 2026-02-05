'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  qrDataUrl: string; // Now expects a data URL from backend
  expiresAt?: string;
  description?: string;
  loading?: boolean;
}

export default function QRModal({
  isOpen,
  onClose,
  title,
  qrDataUrl,
  expiresAt,
  description,
  loading = false
}: QRModalProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const isExpired = timeRemaining !== null && timeRemaining <= 0;
  const isUrgent = timeRemaining !== null && timeRemaining > 0 && timeRemaining <= 60;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-xl max-w-sm w-full p-6 relative border border-border">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-text-tertiary hover:bg-stone-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <h2 className="text-heading text-text-primary mb-1 pr-10">{title}</h2>

        {/* Description */}
        {description && (
          <p className="text-caption text-text-tertiary mb-5">{description}</p>
        )}

        {/* QR Code */}
        <div className="flex justify-center mb-5">
          <div className="bg-surface rounded-lg border border-border p-3">
            {loading ? (
              <div className="w-56 h-56 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-56 h-56"
                style={{ imageRendering: 'crisp-edges' }}
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center bg-surface-muted rounded-lg">
                <div className="text-center px-4">
                  <p className="text-subheading text-text-secondary mb-1">QR Code Unavailable</p>
                  <p className="text-caption text-text-tertiary">Please try again or contact support</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Countdown */}
        {timeRemaining !== null && (
          <div className="text-center mb-5">
            {!isExpired ? (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                isUrgent
                  ? 'bg-amber-50 border border-amber-100'
                  : 'bg-stone-100'
              }`}>
                <span className={`text-caption font-medium ${isUrgent ? 'text-warning' : 'text-text-tertiary'}`}>
                  Expires in
                </span>
                <span className={`text-lg font-semibold tabular-nums ${isUrgent ? 'text-warning' : 'text-text-primary'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            ) : (
              <div className="bg-error-light border border-error rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-error mb-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-subheading">QR Code Expired</p>
                </div>
                <p className="text-caption text-error">
                  If scanned, it may take a moment to process. Check your voucher history for updates.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-surface-muted rounded-lg p-3.5 mb-5">
          <p className="text-center text-caption font-semibold text-text-secondary mb-2">
            Show this QR code to staff at checkout
          </p>
          <div className="text-caption text-text-tertiary space-y-1">
            <p>Turn screen brightness to maximum</p>
            <p>Hold device 15-20cm from scanner</p>
          </div>
        </div>

        {/* Done button */}
        <button
          onClick={onClose}
          className="btn-primary w-full h-12 rounded-lg"
        >
          Done
        </button>
      </div>
    </div>
  );
}
