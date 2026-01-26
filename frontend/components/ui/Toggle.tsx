'use client';

import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  enabled,
  onChange,
  label,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm
        ${enabled
          ? 'bg-gradient-to-r from-black to-gray-800 focus:ring-black'
          : 'bg-gradient-to-r from-gray-300 to-gray-200 focus:ring-gray-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md press-scale'}
        ${className}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-200
          ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
};

// Toggle with label component
interface ToggleWithLabelProps extends ToggleProps {
  label: string;
  description?: string;
}

export const ToggleWithLabel: React.FC<ToggleWithLabelProps> = ({
  label,
  description,
  ...toggleProps
}) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <label className="text-sm font-semibold text-gray-700">{label}</label>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
      <Toggle {...toggleProps} label={label} />
    </div>
  );
};
