'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  variant: AlertVariant;
  title?: string;
  message: string;
  onClose?: () => void;
  autoDismiss?: boolean;
  dismissDelay?: number;
  className?: string;
}

const variantStyles = {
  success: {
    container: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200/60 shadow-sm',
    icon: 'text-green-600',
    title: 'text-green-900',
    message: 'text-green-700',
    closeButton: 'text-green-600 hover:text-green-800 hover:bg-green-100/50',
    Icon: CheckCircle,
  },
  error: {
    container: 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200/60 shadow-sm',
    icon: 'text-red-600',
    title: 'text-red-900',
    message: 'text-red-700',
    closeButton: 'text-red-600 hover:text-red-800 hover:bg-red-100/50',
    Icon: AlertCircle,
  },
  warning: {
    container: 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200/60 shadow-sm',
    icon: 'text-yellow-600',
    title: 'text-yellow-900',
    message: 'text-yellow-700',
    closeButton: 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100/50',
    Icon: AlertTriangle,
  },
  info: {
    container: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/60 shadow-sm',
    icon: 'text-blue-600',
    title: 'text-blue-900',
    message: 'text-blue-700',
    closeButton: 'text-blue-600 hover:text-blue-800 hover:bg-blue-100/50',
    Icon: Info,
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  message,
  onClose,
  autoDismiss = false,
  dismissDelay = 5000,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const styles = variantStyles[variant];
  const Icon = styles.Icon;

  useEffect(() => {
    if (autoDismiss && onClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, dismissDelay);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, dismissDelay, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 200); // Match animation duration
  };

  if (!isVisible) return null;

  return (
    <div
      className={`rounded-xl border p-4 ${styles.container} ${className}
        animate-slide-up transition-all duration-200 backdrop-blur-sm`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`} strokeWidth={2} />
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`text-sm font-semibold mb-1 ${styles.title}`}>
              {title}
            </h3>
          )}
          <p className={`text-sm leading-relaxed ${styles.message}`}>{message}</p>
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className={`flex-shrink-0 ${styles.closeButton} p-1 rounded-lg transition-all duration-100 press-scale`}
            aria-label="Close alert"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
};
