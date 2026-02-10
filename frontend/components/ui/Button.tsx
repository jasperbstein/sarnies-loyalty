'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-xl';

  const variantStyles = {
    primary: 'bg-stone-900 text-white hover:bg-stone-800 shadow-sm focus:ring-stone-500',
    secondary: 'bg-white text-stone-900 hover:bg-stone-50 border border-stone-200 shadow-sm focus:ring-stone-400',
    ghost: 'bg-transparent text-stone-900 hover:bg-stone-100 focus:ring-stone-400',
    tertiary: 'bg-transparent text-stone-600 hover:bg-stone-100 focus:ring-stone-400',
    success: 'bg-green-600 text-white hover:bg-green-700 shadow-sm focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm focus:ring-red-500',
  };

  const sizeStyles = {
    sm: 'px-3 py-2 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {icon && !loading && icon}
      {children}
    </button>
  );
}

// Named export for backwards compatibility with customer/ui/Button usage
export { Button };
