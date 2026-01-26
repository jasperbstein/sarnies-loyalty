import React from "react";
import { SectionCard } from "../ui/SectionCard";
import { useAuthStore } from "@/lib/store";

interface QRCodeCardProps {
  qrCodeUrl?: string;
  qrLoading?: boolean;
  customerId?: string;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({ qrCodeUrl, qrLoading, customerId }) => {
  const { user } = useAuthStore();
  const isEmployee = user?.user_type === 'employee';

  return (
    <SectionCard>
      <div className="flex flex-col items-center gap-4">
        <div className="text-[14px] font-medium text-[#1B1B1B]">
          {isEmployee ? 'Employee QR Code' : 'Membership QR Code'}
        </div>
        <div className={`w-48 h-48 bg-white rounded-xl flex items-center justify-center border-2 ${
          isEmployee ? 'border-mustard' : 'border-gray-200'
        }`}>
          {qrLoading ? (
            <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${
              isEmployee ? 'border-mustard' : 'border-black'
            }`} />
          ) : qrCodeUrl ? (
            <img src={qrCodeUrl} alt={isEmployee ? "Employee QR Code" : "Membership QR Code"} className="w-44 h-44" />
          ) : (
            <div className="text-[#9CA3AF] text-[12px]">Loading...</div>
          )}
        </div>
        {customerId && (
          <div className="text-[11px] text-[#9CA3AF] font-mono">
            ID: {customerId}
          </div>
        )}
        <p className="text-[13px] text-[#6F6F6F] text-center">
          {isEmployee
            ? 'Show this for employee identification.'
            : 'Show this at checkout to earn and redeem points.'
          }
        </p>
      </div>
    </SectionCard>
  );
};
