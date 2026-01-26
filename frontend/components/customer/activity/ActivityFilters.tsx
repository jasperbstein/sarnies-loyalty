import React from "react";
import { PillFilter } from "../ui/PillFilter";

export type ActivityFilterValue =
  | "all"
  | "earned"
  | "redeemed"
  | "used"
  | "expired";

interface ActivityFiltersProps {
  value: ActivityFilterValue;
  onChange: (value: ActivityFilterValue) => void;
}

export const ActivityFilters: React.FC<ActivityFiltersProps> = ({
  value,
  onChange,
}) => {
  const options: ActivityFilterValue[] = [
    "all",
    "earned",
    "redeemed",
    "used",
    "expired",
  ];

  const labels: Record<ActivityFilterValue, string> = {
    all: "All",
    earned: "Earned",
    redeemed: "Redeemed",
    used: "Used",
    expired: "Expired",
  };

  return (
    <div className="flex flex-wrap gap-8 items-center mt-4">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <PillFilter
            key={opt}
            label={labels[opt]}
            active={value === opt}
            onClick={() => onChange(opt)}
          />
        ))}
      </div>
    </div>
  );
};
