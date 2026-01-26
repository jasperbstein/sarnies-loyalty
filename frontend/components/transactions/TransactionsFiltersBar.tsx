import React from "react";
import { FilterChip } from "../ui/FilterChip";
import { TransactionType, TransactionStatus } from "./types";

export type TypeFilter = "all" | TransactionType;
export type StatusFilter = "all" | TransactionStatus;

interface TransactionsFiltersBarProps {
  typeFilter: TypeFilter;
  statusFilter: StatusFilter;
  onTypeChange: (value: TypeFilter) => void;
  onStatusChange: (value: StatusFilter) => void;
}

export const TransactionsFiltersBar: React.FC<TransactionsFiltersBarProps> = ({
  typeFilter,
  statusFilter,
  onTypeChange,
  onStatusChange,
}) => {
  return (
    <div className="flex flex-col gap-3 mt-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-medium text-[#6F6F6F] uppercase">
          Type
        </span>
        <FilterChip
          label="All"
          active={typeFilter === "all"}
          onClick={() => onTypeChange("all")}
        />
        <FilterChip
          label="Earned"
          active={typeFilter === "earned"}
          onClick={() => onTypeChange("earned")}
        />
        <FilterChip
          label="Redeemed"
          active={typeFilter === "redeemed"}
          onClick={() => onTypeChange("redeemed")}
        />
        <FilterChip
          label="Adjusted"
          active={typeFilter === "adjusted"}
          onClick={() => onTypeChange("adjusted")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-medium text-[#6F6F6F] uppercase">
          Status
        </span>
        <FilterChip
          label="All"
          active={statusFilter === "all"}
          onClick={() => onStatusChange("all")}
        />
        <FilterChip
          label="Completed"
          active={statusFilter === "completed"}
          onClick={() => onStatusChange("completed")}
        />
        <FilterChip
          label="Pending"
          active={statusFilter === "pending"}
          onClick={() => onStatusChange("pending")}
        />
        <FilterChip
          label="Failed"
          active={statusFilter === "failed"}
          onClick={() => onStatusChange("failed")}
        />
      </div>
    </div>
  );
};
