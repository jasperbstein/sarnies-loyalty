import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
}

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className={`w-full ${className}`}>{children}</table>
    </div>
  );
}

export function TableHead({ children, className = '' }: TableHeadProps) {
  return <thead className={className}>{children}</thead>;
}

export function TableBody({ children, className = '' }: TableBodyProps) {
  return <tbody className={`divide-y divide-border-subtle ${className}`}>{children}</tbody>;
}

export function TableRow({ children, className = '', onClick }: TableRowProps) {
  return (
    <tr
      className={`hover:bg-gray-50 transition-all duration-100 ${onClick ? 'cursor-pointer press-scale' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableHeader({ children, className = '', align = 'left' }: TableHeaderProps) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  return (
    <th
      className={`px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200 ${alignClass} ${className}`}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', align = 'left' }: TableCellProps) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  return <td className={`px-4 py-3 text-sm text-gray-900 ${alignClass} ${className}`}>{children}</td>;
}
