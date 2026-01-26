import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'bordered' | 'elevated' | 'admin';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = ''
}: CardProps) {
  const baseStyles = 'bg-white overflow-hidden transition-all duration-100';

  const variantStyles = {
    default: 'shadow-sm hover:shadow-md rounded-xl border border-gray-100',
    bordered: 'border border-gray-200 rounded-xl hover:shadow-sm',
    elevated: 'shadow-md hover:shadow-lg rounded-xl border border-gray-100',
    admin: 'border border-gray-200 rounded-xl shadow-sm hover:shadow-md',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6', // 24px padding
    lg: 'p-8'
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}
