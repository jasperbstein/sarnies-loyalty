import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  className = '',
  autoFocus = false,
}) => {
  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className={`relative group ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400
        transition-colors duration-100 group-focus-within:text-black" strokeWidth={2} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-white
          focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
          transition-all duration-100 shadow-sm hover:shadow-md text-sm
          placeholder:text-gray-400"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
            hover:text-gray-900 transition-all duration-100 p-1 hover:bg-gray-100
            rounded-lg press-scale"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
};
