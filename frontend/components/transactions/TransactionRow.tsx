import React from "react";
import { Transaction } from "./types";
import { AvatarCircle } from "../ui/AvatarCircle";
import { Badge } from "../ui/Badge";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";

interface TransactionRowProps {
  tx: Transaction;
  onClick?: (id: string) => void;
  onMore?: (id: string) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  tx,
  onClick,
  onMore,
}) => {
  const handleRowClick = () => {
    onClick && onClick(tx.id);
  };

  const typeLabel =
    tx.type === "earned"
      ? "Earned"
      : tx.type === "redeemed"
      ? "Redeemed"
      : "Adjusted";

  const statusVariant =
    tx.status === "completed"
      ? "statusActive"
      : tx.status === "pending"
      ? "neutral"
      : "statusInactive";

  const statusLabel =
    tx.status === "completed"
      ? "Completed"
      : tx.status === "pending"
      ? "Pending"
      : "Failed";

  return (
    <div
      className="flex items-center h-[60px] border-b border-neutral-100 last:border-0 px-4 hover:bg-neutral-50 cursor-pointer transition-colors"
      onClick={handleRowClick}
    >
      {/* User */}
      <div className="flex-1 px-4 min-w-0">
        <div className="text-[14px] font-medium text-neutral-900 truncate">
          {tx.userName}
        </div>
        {tx.userSubtitle && (
          <div className="text-[13px] text-neutral-500 truncate">
            {tx.userSubtitle}
          </div>
        )}
      </div>

      {/* Type */}
      <div className="w-[120px] px-4">
        <span className="inline-flex items-center h-[22px] px-2.5 rounded-md bg-neutral-100 text-[12px] font-medium text-neutral-700">
          {typeLabel}
        </span>
      </div>

      {/* Outlet */}
      <div className="w-[140px] px-4 text-[13px] text-neutral-500 truncate">
        {tx.outlet || "—"}
      </div>

      {/* Points */}
      <div className="w-[100px] px-4 text-[13px] font-mono text-neutral-900">
        {tx.points}
      </div>

      {/* Value */}
      <div className="w-[100px] px-4 text-[13px] font-mono text-neutral-900">
        {tx.valueDisplay}
      </div>

      {/* Status */}
      <div className="w-[110px] px-4">
        <div className="flex items-center gap-2">
          <div className={`w-1 h-1 rounded-full ${
            tx.status === "completed" ? 'bg-green-500' :
            tx.status === "pending" ? 'bg-amber-500' :
            'bg-red-500'
          }`}></div>
          <span className="text-[13px] font-medium text-neutral-700">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Date */}
      <div className="w-[140px] px-4 text-[13px] text-neutral-700">
        {tx.createdAtDisplay}
      </div>

      {/* Actions */}
      <div className="w-10 flex items-center justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMore && onMore(tx.id);
          }}
          className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors rounded hover:bg-neutral-100"
        >
          <EllipsisHorizontalIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
