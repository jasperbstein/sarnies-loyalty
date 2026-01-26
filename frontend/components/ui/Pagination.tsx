import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  maxPageNumbers?: number;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = true,
  maxPageNumbers = 5,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const halfMax = Math.floor(maxPageNumbers / 2);

    let startPage = Math.max(1, currentPage - halfMax);
    let endPage = Math.min(totalPages, currentPage + halfMax);

    // Adjust if we're near the start or end
    if (currentPage <= halfMax) {
      endPage = Math.min(totalPages, maxPageNumbers);
    } else if (currentPage >= totalPages - halfMax) {
      startPage = Math.max(1, totalPages - maxPageNumbers + 1);
    }

    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('...');
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50
          disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-100
          shadow-sm hover:shadow-md press-scale disabled:hover:shadow-sm disabled:scale-100"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
      </button>

      {/* Page Numbers */}
      {showPageNumbers && (
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-400">
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[40px] px-3 py-2 rounded-xl font-semibold text-sm
                  transition-all duration-100 shadow-sm hover:shadow-md press-scale ${
                  isActive
                    ? 'bg-gradient-to-br from-black to-gray-800 text-white shadow-md'
                    : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
                aria-label={`Go to page ${pageNum}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
      )}

      {/* Page Info (if not showing numbers) */}
      {!showPageNumbers && (
        <span className="text-sm text-gray-600 mx-2">
          Page {currentPage} of {totalPages}
        </span>
      )}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50
          disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-100
          shadow-sm hover:shadow-md press-scale disabled:hover:shadow-sm disabled:scale-100"
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </div>
  );
};
