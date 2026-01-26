'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  name: string;
  error?: string | string[];
  required?: boolean;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  error,
  required = false,
  helperText,
  children,
  className = '',
}) => {
  const errors = Array.isArray(error) ? error : error ? [error] : [];
  const hasError = errors.length > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={name} className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>

      {children}

      {helperText && !hasError && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}

      {hasError && (
        <div className="space-y-1">
          {errors.map((err, index) => (
            <div key={index} className="flex items-start gap-1.5 text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs">{err}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Input component with built-in error styling
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input: React.FC<InputProps> = ({ error, className = '', ...props }) => {
  return (
    <input
      className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400
        focus:ring-2 focus:border-transparent transition-all duration-100 shadow-sm hover:shadow-md
        ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-black'}
        ${className}`}
      {...props}
    />
  );
};

// Textarea component with built-in error styling
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({ error, className = '', ...props }) => {
  return (
    <textarea
      className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400
        focus:ring-2 focus:border-transparent transition-all duration-100 shadow-sm hover:shadow-md
        resize-none
        ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-black'}
        ${className}`}
      {...props}
    />
  );
};

// Select component with built-in error styling
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select: React.FC<SelectProps> = ({ error, className = '', children, ...props }) => {
  return (
    <select
      className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-gray-900
        focus:ring-2 focus:border-transparent transition-all duration-100 shadow-sm hover:shadow-md
        cursor-pointer
        ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-black'}
        ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};
