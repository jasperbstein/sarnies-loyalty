'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Archive,
  Trash2,
  Building2,
  Users,
  Briefcase,
  Check,
  ImageOff,
  Star,
} from 'lucide-react';

interface Company {
  id: number;
  name: string;
}

interface AdminVoucherCardProps {
  voucher: {
    id: number;
    title: string;
    description?: string;
    image_url?: string;
    category?: string;
    points_required: number;
    voucher_type: string;
    is_active: boolean;
    is_featured: boolean;
    is_company_exclusive: boolean;
    target_user_types: string[];
    allowed_companies?: Company[] | null;
    allowed_company_ids?: number[];
    times_redeemed: number;
    unique_users: number;
    redemption_window?: string;
  };
  companies?: Company[];
  isSelected?: boolean;
  onSelect?: (id: number) => void;
  onEdit: (id: number) => void;
  onDuplicate: (id: number) => void;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number, newStatus: boolean) => void;
}

export default function AdminVoucherCard({
  voucher,
  companies = [],
  isSelected = false,
  onSelect,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onToggleStatus,
}: AdminVoucherCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Get category label
  const categoryLabel = voucher.category ? voucher.category.charAt(0).toUpperCase() + voucher.category.slice(1) : 'General';

  // Determine audience
  const userTypes = voucher.target_user_types || [];
  const isForCustomers = userTypes.includes('customer');
  const isForEmployees = userTypes.includes('employee') || userTypes.includes('staff');

  // Get company names
  const companyNames: string[] = [];
  if (voucher.allowed_companies && voucher.allowed_companies.length > 0) {
    voucher.allowed_companies.forEach(c => companyNames.push(c.name));
  } else if (voucher.allowed_company_ids && voucher.allowed_company_ids.length > 0 && companies.length > 0) {
    voucher.allowed_company_ids.forEach(id => {
      const company = companies.find(c => c.id === id);
      if (company) companyNames.push(company.name);
    });
  }

  const hasImage = voucher.image_url && !imageError;

  return (
    <div
      className={`group relative admin-card rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 h-full flex flex-col ${
        isSelected
          ? 'ring-2 ring-[#007AFF] shadow-lg'
          : ''
      }`}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <button
          onClick={() => onSelect(voucher.id)}
          className={`absolute top-3 left-3 z-20 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-blue-500 border-blue-500 text-white shadow-md'
              : 'bg-white/90 backdrop-blur-sm border-stone-200 text-transparent hover:border-blue-400'
          }`}
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
      )}

      {/* Featured badge */}
      {voucher.is_featured && (
        <div className="absolute top-3 right-3 z-20">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-bold uppercase tracking-wide shadow-lg">
            <Star className="w-3 h-3 fill-current" />
            Featured
          </div>
        </div>
      )}

      {/* Image Section */}
      <div className="relative h-40 bg-gradient-to-br from-stone-100 to-stone-50">
        {hasImage ? (
          <Image
            src={voucher.image_url!}
            alt={voucher.title}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-200/50 flex items-center justify-center mb-2">
              <ImageOff className="w-7 h-7 text-stone-300" />
            </div>
            <span className="text-xs text-stone-400 font-medium">No image</span>
          </div>
        )}

        {/* Status & Points overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <button
            onClick={() => onToggleStatus(voucher.id, !voucher.is_active)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all shadow-sm ${
              voucher.is_active
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                : 'bg-white/95 backdrop-blur-sm text-stone-500 border border-stone-200'
            }`}
          >
            {voucher.is_active ? 'Active' : 'Draft'}
          </button>

          <div className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm ${
            voucher.points_required === 0
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
              : 'bg-white/95 backdrop-blur-sm text-stone-700'
          }`}>
            {voucher.points_required === 0 ? 'FREE' : `${voucher.points_required} pts`}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Title & Category */}
        <div className="mb-3">
          <h3 className="text-[15px] font-semibold text-stone-900 line-clamp-1 mb-1">
            {voucher.title}
          </h3>
          <div className="flex items-center gap-2 text-[12px] text-stone-500">
            <span className="font-medium">{categoryLabel}</span>
            <span className="w-1 h-1 rounded-full bg-stone-300" />
            <span>{voucher.times_redeemed || 0} uses</span>
          </div>
        </div>

        {/* Audience Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {isForCustomers && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 text-[10px] font-semibold">
              <Users className="w-3 h-3" />
              Customers
            </span>
          )}
          {isForEmployees && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 text-[10px] font-semibold">
              <Briefcase className="w-3 h-3" />
              Employees
            </span>
          )}
        </div>

        {/* Company Section */}
        {(voucher.is_company_exclusive || (voucher.allowed_company_ids && voucher.allowed_company_ids.length > 0)) && (
          <div className="mb-3 p-3 rounded-xl bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.04)]">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">
                  Company Exclusive
                </p>
                {companyNames.length > 0 ? (
                  <p className="text-[12px] font-semibold text-stone-700 truncate" title={companyNames.join(', ')}>
                    {companyNames.length <= 2
                      ? companyNames.join(', ')
                      : `${companyNames[0]} +${companyNames.length - 1} more`
                    }
                  </p>
                ) : (
                  <p className="text-[12px] text-stone-400">
                    {voucher.allowed_company_ids?.length
                      ? `${voucher.allowed_company_ids.length} companies`
                      : 'No companies assigned'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[rgba(0,0,0,0.06)] mt-auto">
          <button
            onClick={() => onEdit(voucher.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-44 bg-white rounded-xl shadow-xl border border-stone-100 py-2 z-30">
                <button
                  onClick={() => { onDuplicate(voucher.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <Copy className="w-4 h-4 text-stone-400" />
                  Duplicate
                </button>
                <button
                  onClick={() => { onArchive(voucher.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-amber-600 hover:bg-amber-50 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
                <div className="my-1.5 border-t border-stone-100" />
                <button
                  onClick={() => { onDelete(voucher.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
