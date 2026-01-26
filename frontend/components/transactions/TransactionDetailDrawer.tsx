import React from "react";
import { Transaction } from "./types";
import { AvatarCircle } from "../ui/AvatarCircle";
import { Badge } from "../ui/Badge";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface TransactionDetailDrawerProps {
  open: boolean;
  tx: Transaction | null;
  onClose: () => void;
}

export const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({
  open,
  tx,
  onClose,
}) => {
  if (!open || !tx) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <aside className="w-full max-w-md h-full bg-white shadow-lg border-l border-[#E5E7EB] flex flex-col">
        <header className="flex items-center justify-between px-6 h-14 border-b border-[#E5E7EB]">
          <h2 className="text-[16px] font-semibold text-[#1B1B1B]">
            Transaction details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#6F6F6F] hover:text-[#1B1B1B]"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <section className="flex items-center gap-3">
            <AvatarCircle initials={tx.userInitials} size={40} />
            <div>
              <div className="text-[16px] font-semibold text-[#1B1B1B]">
                {tx.userName}
              </div>
              {tx.userSubtitle && (
                <div className="text-[13px] text-[#6F6F6F]">
                  {tx.userSubtitle}
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Badge
                  label={
                    tx.status === "completed"
                      ? "Completed"
                      : tx.status === "pending"
                      ? "Pending"
                      : "Failed"
                  }
                  variant={
                    tx.status === "completed"
                      ? "statusActive"
                      : tx.status === "failed"
                      ? "statusInactive"
                      : "neutral"
                  }
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[13px] font-medium text-[#6F6F6F] uppercase">
              Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#E5E7EB] px-3 py-2">
                <div className="text-[12px] text-[#6F6F6F]">Type</div>
                <div className="text-[14px] text-[#1B1B1B]">
                  {tx.type}
                </div>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] px-3 py-2">
                <div className="text-[12px] text-[#6F6F6F]">Points</div>
                <div className="text-[16px] font-semibold text-[#1B1B1B]">
                  {tx.points}
                </div>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] px-3 py-2">
                <div className="text-[12px] text-[#6F6F6F]">Value</div>
                <div className="text-[14px] text-[#1B1B1B]">
                  {tx.valueDisplay}
                </div>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] px-3 py-2">
                <div className="text-[12px] text-[#6F6F6F]">Date</div>
                <div className="text-[14px] text-[#1B1B1B]">
                  {tx.createdAtDisplay}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-[13px] font-medium text-[#6F6F6F] uppercase">
              Outlet
            </h3>
            <div className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#1B1B1B]">
              {tx.outlet || "—"}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};
