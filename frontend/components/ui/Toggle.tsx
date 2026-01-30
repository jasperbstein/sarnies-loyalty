'use client';

/**
 * Toggle Switch Component
 * Sarnies Design System v2.0
 *
 * Accessible toggle switch with keyboard support and animations.
 */

import React, { useId } from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'accent' | 'success';
}

const sizeConfig = {
  sm: {
    track: 'h-5 w-9',
    thumb: 'h-4 w-4',
    translateOn: 'translate-x-4',
    translateOff: 'translate-x-0.5',
  },
  md: {
    track: 'h-6 w-11',
    thumb: 'h-5 w-5',
    translateOn: 'translate-x-5',
    translateOff: 'translate-x-0.5',
  },
  lg: {
    track: 'h-7 w-14',
    thumb: 'h-6 w-6',
    translateOn: 'translate-x-7',
    translateOff: 'translate-x-0.5',
  },
};

const variantConfig = {
  default: {
    on: 'bg-stone-900',
    off: 'bg-stone-200',
    focusRing: 'focus-visible:ring-stone-500',
  },
  accent: {
    on: 'bg-accent',
    off: 'bg-stone-200',
    focusRing: 'focus-visible:ring-accent',
  },
  success: {
    on: 'bg-success',
    off: 'bg-stone-200',
    focusRing: 'focus-visible:ring-success',
  },
};

export const Toggle: React.FC<ToggleProps> = ({
  enabled,
  onChange,
  label,
  disabled = false,
  className = '',
  size = 'md',
  variant = 'accent',
}) => {
  const sizes = sizeConfig[size];
  const variants = variantConfig[variant];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`
        relative inline-flex items-center rounded-full
        transition-colors duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        ${sizes.track}
        ${enabled ? variants.on : variants.off}
        ${variants.focusRing}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <span
        className={`
          inline-block rounded-full bg-white shadow-sm
          transition-transform duration-200 ease-in-out
          ${sizes.thumb}
          ${enabled ? sizes.translateOn : sizes.translateOff}
        `}
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
  const id = useId();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className="text-sm font-medium text-text-primary cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-sm text-text-tertiary mt-0.5">{description}</p>
        )}
      </div>
      <Toggle {...toggleProps} label={label} />
    </div>
  );
};

export default Toggle;
