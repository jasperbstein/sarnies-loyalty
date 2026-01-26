import React from "react";
import { SectionCard } from "../ui/SectionCard";
import { useAuthStore } from "@/lib/store";

interface ProfileHeaderCardProps {
  name: string;
  memberId: string;
  phone: string;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  name,
  memberId,
  phone,
}) => {
  const { user } = useAuthStore();
  const isEmployee = user?.user_type === 'employee';

  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <SectionCard>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-[16px] font-semibold ${
          isEmployee ? 'bg-mustard text-black' : 'bg-[#1B1B1B] text-white'
        }`}>
          {initials}
        </div>
        <div>
          <p className="text-[16px] font-semibold text-[#1B1B1B]">{name}</p>
          <p className="text-[13px] text-[#6F6F6F]">
            {isEmployee ? 'Employee' : 'Member'} #{memberId}
          </p>
          <p className="text-[13px] text-[#1B1B1B] mt-1">{phone}</p>
        </div>
      </div>
    </SectionCard>
  );
};
