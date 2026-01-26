'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

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

      if (remaining === 0) {
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onClose]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-black mb-2 pr-8">{title}</h2>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 mb-6">{description}</p>
        )}

        {/* QR Code */}
        <div className="flex justify-center mb-6 bg-white p-4 rounded-lg">
          {loading ? (
            <div className="w-[320px] h-[320px] flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-[320px] h-[320px]"
              style={{ imageRendering: 'crisp-edges' }}
            />
          ) : (
            <div className="w-[320px] h-[320px] flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="text-center px-6">
                <p className="text-gray-600 font-medium mb-2">QR Code Unavailable</p>
                <p className="text-sm text-gray-500">Please try closing and reopening, or contact support</p>
              </div>
            </div>
          )}
        </div>

        {/* Countdown */}
        {timeRemaining !== null && (
          <div className="text-center mb-4">
            {timeRemaining > 0 ? (
              <div>
                <p className="text-sm text-gray-600 mb-1">Expires in</p>
                <p className="text-3xl font-bold text-black">
                  {formatTime(timeRemaining)}
                </p>
              </div>
            ) : (
              <p className="text-lg font-semibold text-red-600">
                QR Code Expired
              </p>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-center text-sm font-semibold text-blue-900 mb-2">
            Show this QR code to staff at checkout
          </p>
          <div className="text-xs text-blue-800 space-y-1">
            <p>💡 Turn screen brightness to 100%</p>
            <p>📏 Hold device 15-20cm from scanner camera</p>
            <p>📱 Keep screen flat and steady</p>
            <p>🖥️ Scanning from computer screen? Tilt screen to avoid glare</p>
          </div>
        </div>

        {/* Done button */}
        <button
          onClick={onClose}
          className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
