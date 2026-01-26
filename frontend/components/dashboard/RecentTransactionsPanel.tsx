import React from "react";
import { Transaction } from "../transactions/types";

interface RecentTransactionsPanelProps {
  items: Transaction[];
}

export const RecentTransactionsPanel: React.FC<RecentTransactionsPanelProps> = ({
  items,
}) => {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white shadow-sm px-6 py-5">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-semibold text-neutral-900">
          Recent transactions
        </h2>
      </header>

      {items.length === 0 ? (
        <div className="flex items-center justify-center h-28 text-[14px] text-neutral-500">
          No transactions yet
        </div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {items.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center h-[56px] text-[14px] px-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-neutral-900 font-medium truncate">{tx.userName}</div>
                <div className="text-[13px] text-neutral-500 truncate">
                  {tx.createdAtDisplay}
                </div>
              </div>
              <div className="w-[100px] text-right text-neutral-900 font-mono text-[13px]">
                {tx.points} pts
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
