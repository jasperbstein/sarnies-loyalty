import React from "react";
import clsx from "clsx";

interface PillFilterProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export const PillFilter: React.FC<PillFilterProps> = ({
  label,
  active,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "h-[32px] px-4 rounded-full border text-[14px] font-medium transition-colors",
        active
          ? "border-[#D5A253] bg-[#FFF6E8] text-[#1B1B1B]"
          : "border-[#E5E7EB] bg-white text-[#1B1B1B] hover:bg-[#F7F7F7]"
      )}
    >
      {label}
    </button>
  );
};
