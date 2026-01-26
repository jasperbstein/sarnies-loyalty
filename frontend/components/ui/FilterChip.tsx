import React from "react";

interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  active = false,
  onClick,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-4 rounded-xl border text-sm font-semibold whitespace-nowrap
        transition-all duration-100 shadow-sm press-scale ${
        active
          ? "border-black bg-gradient-to-br from-black to-gray-800 text-white shadow-md"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:shadow-md"
      } ${className}`}
    >
      {label}
    </button>
  );
};
