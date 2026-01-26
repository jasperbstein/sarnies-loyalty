import React from "react";
import { SectionCard } from "../ui/SectionCard";

interface DetailField {
  id: string;
  label: string;
  value: string;
  helper?: string;
}

interface DetailsListProps {
  title: string;
  fields: DetailField[];
}

export const DetailsList: React.FC<DetailsListProps> = ({
  title,
  fields,
}) => {
  return (
    <SectionCard>
      <h2 className="text-[16px] font-semibold text-[#1B1B1B] mb-3">
        {title}
      </h2>
      <div className="divide-y divide-[#F0F0F0]">
        {fields.map((f) => (
          <div key={f.id} className="py-3">
            <div className="text-[12px] text-[#6F6F6F] mb-1">{f.label}</div>
            <div className="text-[14px] text-[#1B1B1B]">
              {f.value || "Not set"}
            </div>
            {f.helper && (
              <div className="text-[12px] text-[#9CA3AF] mt-1">{f.helper}</div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
};
