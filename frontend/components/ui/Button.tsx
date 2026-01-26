import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'admin-primary' | 'admin-secondary';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles = {
    // Customer-facing (Sarnies brand)
    primary: 'bg-gradient-to-br from-black to-gray-800 text-white hover:shadow-lg press-scale shadow-md rounded-xl focus:ring-black',
    secondary: 'bg-white text-black hover:bg-gray-50 press-scale border border-gray-200 shadow-sm hover:shadow-md rounded-xl focus:ring-gray-400',
    success: 'bg-gradient-to-br from-green-600 to-green-700 text-white hover:shadow-lg press-scale shadow-md rounded-xl focus:ring-green-500',
    danger: 'bg-gradient-to-br from-red-600 to-red-700 text-white hover:shadow-lg press-scale shadow-md rounded-xl focus:ring-red-500',
    ghost: 'bg-transparent text-black hover:bg-gray-100 press-scale rounded-xl focus:ring-gray-400',

    // Admin panel (Refined design system)
    'admin-primary': 'bg-gradient-to-br from-black to-gray-800 text-white hover:shadow-lg press-scale shadow-md rounded-xl focus:ring-black',
    'admin-secondary': 'bg-white border border-gray-200 text-black hover:bg-gray-50 press-scale shadow-sm hover:shadow-md rounded-xl focus:ring-gray-400',
  };

  const sizeStyles = {
    sm: 'px-3 py-2 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
