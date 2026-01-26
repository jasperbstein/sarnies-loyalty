import React from "react";
import { StarIcon } from "@heroicons/react/24/outline";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-10 h-10 rounded-full bg-[#FFF6E8] flex items-center justify-center text-[#D5A253]">
        {icon || <StarIcon className="w-6 h-6" />}
      </div>
      <h3 className="mt-4 text-[18px] font-semibold text-[#1B1B1B]">
        {title}
      </h3>
      <p className="mt-1 text-[14px] text-[#6F6F6F] max-w-xs">{description}</p>
    </div>
  );
};
