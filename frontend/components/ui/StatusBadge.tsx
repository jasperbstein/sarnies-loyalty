import React from 'react';

interface StatusBadgeProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

export default function StatusBadge({
  active,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
        transition-all duration-100 border ${
        active
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200'
          : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 border-gray-200'
      } ${className}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
        active ? 'bg-green-500 shadow-sm shadow-green-300' : 'bg-gray-400'
      }`} />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
