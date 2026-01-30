/**
 * MemberHeroCard - Member Card with Background Image
 * Sarnies Design System v2.0
 *
 * Matches the .pen design with custom background image,
 * gradient overlay, and QR code in bottom right
 */

import React from "react";
import { QrCode } from "lucide-react";

interface MemberHeroCardProps {
  name: string;
  memberId: string;
  qrCodeUrl?: string;
  qrLoading?: boolean;
  userType?: string;
}

export const MemberHeroCard: React.FC<MemberHeroCardProps> = ({
  name,
  memberId,
  qrCodeUrl,
  qrLoading,
  userType,
}) => {
  const isEmployee = userType === 'employee';
  const labelText = isEmployee ? 'EMPLOYEE' : 'WELCOME BACK';
  const idPrefix = isEmployee ? 'EMP-' : 'SAR-';

  return (
    <section
      className="w-full relative h-[200px] rounded-2xl overflow-hidden cursor-pointer"
      style={{
        boxShadow: '0 12px 32px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.06)'
      }}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1720242569488-ece73980ba11?w=800&q=80)'
        }}
      />

      {/* Gradient Overlay - bottom to top fade */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)'
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 p-6 flex items-end justify-between">
        {/* Left: User Info */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold tracking-[2px] text-white/70 uppercase">
            {labelText}
          </p>
          <h1 className="text-xl font-bold text-white">
            {name}
          </h1>
          <p className="text-xs font-semibold tracking-wide text-white/70">
            {idPrefix}{memberId}
          </p>
        </div>

        {/* Right: QR Code */}
        <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
          {qrLoading ? (
            <div className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
          ) : qrCodeUrl ? (
            <img src={qrCodeUrl} alt="QR Code" className="w-9 h-9" />
          ) : (
            <QrCode className="w-9 h-9 text-stone-900" />
          )}
        </div>
      </div>
    </section>
  );
};
