import React from "react";
import { SectionCard } from "../ui/SectionCard";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

interface SettingItem {
  id: string;
  label: string;
  description?: string;
  tone?: "default" | "danger";
  onClick: () => void;
}

interface SettingsListProps {
  items: SettingItem[];
}

export const SettingsList: React.FC<SettingsListProps> = ({ items }) => {
  return (
    <SectionCard>
      <h2 className="text-[16px] font-semibold text-[#1B1B1B] mb-3">
        Settings
      </h2>
      <div className="divide-y divide-[#F0F0F0]">
        {items.map((item) => {
          const danger = item.tone === "danger";
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="w-full flex items-center justify-between py-3 text-left"
            >
              <div>
                <p
                  className={
                    danger
                      ? "text-[14px] font-medium text-[#D32F2F]"
                      : "text-[14px] font-medium text-[#1B1B1B]"
                  }
                >
                  {item.label}
                </p>
                {item.description && (
                  <p className="text-[12px] text-[#6F6F6F]">
                    {item.description}
                  </p>
                )}
              </div>
              <ChevronRightIcon className="w-5 h-5 text-[#9CA3AF]" />
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
};
