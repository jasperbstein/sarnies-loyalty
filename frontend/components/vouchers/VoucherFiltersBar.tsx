import React from "react";
import { FilterChip } from "../ui/FilterChip";

export type StatusFilter = "all" | "active" | "inactive";
export type ScopeFilter = "all" | "company" | "general";

interface VoucherFiltersBarProps {
  statusFilter: StatusFilter;
  scopeFilter: ScopeFilter;
  onStatusChange: (value: StatusFilter) => void;
  onScopeChange: (value: ScopeFilter) => void;
}

export const VoucherFiltersBar: React.FC<VoucherFiltersBarProps> = ({
  statusFilter,
  scopeFilter,
  onStatusChange,
  onScopeChange,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          label="All"
          active={statusFilter === "all"}
          onClick={() => onStatusChange("all")}
        />
        <FilterChip
          label="Active"
          active={statusFilter === "active"}
          onClick={() => onStatusChange("active")}
        />
        <FilterChip
          label="Inactive"
          active={statusFilter === "inactive"}
          onClick={() => onStatusChange("inactive")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          label="All"
          active={scopeFilter === "all"}
          onClick={() => onScopeChange("all")}
        />
        <FilterChip
          label="Company Exclusive"
          active={scopeFilter === "company"}
          onClick={() => onScopeChange("company")}
        />
        <FilterChip
          label="General"
          active={scopeFilter === "general"}
          onClick={() => onScopeChange("general")}
        />
      </div>
    </div>
  );
};
