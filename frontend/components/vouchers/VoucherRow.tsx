import React from "react";
import { Voucher } from "./types";
import { Badge } from "../ui/Badge";
import {
  PencilIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface VoucherRowProps {
  voucher: Voucher;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const VoucherRow: React.FC<VoucherRowProps> = ({
  voucher,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}) => {
  const typeVariant =
    voucher.type === "freeItem"
      ? "freeItem"
      : voucher.type === "discount"
      ? "discount"
      : "promotion";

  return (
    <div className="flex items-center h-[60px] border-b border-neutral-100 last:border-0 px-4 hover:bg-neutral-50 transition-colors">
      <div className="flex-1 px-4 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-neutral-900 truncate">{voucher.name}</span>
          {voucher.featured && (
            <span className="inline-flex items-center h-[18px] px-1.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700">
              Featured
            </span>
          )}
        </div>
      </div>

      <div className="w-[120px] px-4">
        <span className="inline-flex items-center h-[22px] px-2.5 rounded-md bg-neutral-100 text-[12px] font-medium text-neutral-700">
          {voucher.type === "freeItem" ? "Free Item" : voucher.type === "discount" ? "Discount" : "Promotion"}
        </span>
      </div>

      <div className="w-[140px] px-4 text-[13px] text-neutral-500 truncate">
        {voucher.category && voucher.category.trim() !== "" ? voucher.category : "—"}
      </div>

      <div className="w-[110px] px-4">
        <div className="flex items-center gap-2">
          <div className={`w-1 h-1 rounded-full ${voucher.status === "active" ? 'bg-green-500' : 'bg-neutral-300'}`}></div>
          <span className="text-[13px] font-medium text-neutral-700">
            {voucher.status === "active" ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="w-[80px] px-4 text-[13px] font-mono text-neutral-900 text-left">
        {voucher.points}
      </div>

      <div className="w-[100px] px-4 text-[13px] font-mono text-neutral-900 text-left">
        {voucher.valueDisplay}
      </div>

      <div className="w-[80px] px-4 text-[13px] font-mono text-neutral-900 text-left">
        {voucher.redeemedCount}
      </div>

      <div className="w-[80px] px-4 text-[13px] font-mono text-neutral-900 text-left">
        {voucher.userCount}
      </div>

      <div className="w-[120px] px-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onEdit && onEdit(voucher.id)}
          className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors rounded hover:bg-neutral-100"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDuplicate && onDuplicate(voucher.id)}
          className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors rounded hover:bg-neutral-100"
        >
          <DocumentDuplicateIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onArchive && onArchive(voucher.id)}
          className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-amber-600 transition-colors rounded hover:bg-amber-50"
        >
          <ArchiveBoxIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete && onDelete(voucher.id)}
          className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-red-600 transition-colors rounded hover:bg-red-50"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
