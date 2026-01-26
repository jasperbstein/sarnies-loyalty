import React, { useState } from "react";
import { VoucherGroup as VoucherGroupType, Voucher } from "./types";
import { VoucherRow } from "./VoucherRow";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

interface VoucherGroupProps {
  group: VoucherGroupType;
  onEditVoucher?: (id: string) => void;
  onDuplicateVoucher?: (id: string) => void;
  onArchiveVoucher?: (id: string) => void;
  onDeleteVoucher?: (id: string) => void;
}

export const VoucherGroup: React.FC<VoucherGroupProps> = ({
  group,
  onEditVoucher,
  onDuplicateVoucher,
  onArchiveVoucher,
  onDeleteVoucher,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="w-full rounded-xl border border-neutral-200 bg-white shadow-sm mb-6 overflow-hidden">
      <header className="flex items-center justify-between h-14 px-4 border-b border-neutral-200 bg-neutral-50">
        <div className="flex items-center gap-3">
          <h2 className="text-[16px] font-semibold text-neutral-900">
            {group.name}
          </h2>
          <span className="inline-flex items-center h-[22px] px-2.5 rounded-md bg-neutral-100 text-[12px] font-medium text-neutral-600">
            {group.voucherCount}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          {collapsed ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronUpIcon className="w-4 h-4" />
          )}
        </button>
      </header>

      {!collapsed && (
        <div className="w-full">
          <div className="flex items-center h-[48px] px-4 border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
            <div className="flex-1 px-4">Name</div>
            <div className="w-[120px] px-4">Type</div>
            <div className="w-[140px] px-4">Category</div>
            <div className="w-[110px] px-4">Status</div>
            <div className="w-[80px] px-4">Points</div>
            <div className="w-[100px] px-4">Value</div>
            <div className="w-[80px] px-4">Redeemed</div>
            <div className="w-[80px] px-4">Users</div>
            <div className="w-[120px] px-4 text-right">Actions</div>
          </div>

          {group.vouchers.length === 0 ? (
            <div className="flex items-center justify-center h-28 text-[14px] text-neutral-500">
              No vouchers found in this group
            </div>
          ) : (
            group.vouchers.map((voucher: Voucher) => (
              <VoucherRow
                key={voucher.id}
                voucher={voucher}
                onEdit={onEditVoucher}
                onDuplicate={onDuplicateVoucher}
                onArchive={onArchiveVoucher}
                onDelete={onDeleteVoucher}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
};
