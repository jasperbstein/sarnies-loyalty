/**
 * MemberHeroCard - Member card with background image and QR
 * Sarnies Design System v2.0
 */

import React, { useState } from "react";
import Image from "next/image";
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
  const labelText = isEmployee ? 'EMPLOYEE' : 'MEMBER';
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <section
      className="w-full rounded-2xl overflow-hidden cursor-pointer relative min-h-[120px]"
      style={{
        boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.22)',
      }}
    >
      {/* Skeleton loader */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-stone-300 via-stone-200 to-stone-300 animate-pulse" />
      )}

      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/images/content/sarnies-exterior.jpg"
          alt="Sarnies"
          fill
          className={`object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          sizes="(max-width: 768px) 100vw, 50vw"
          onLoad={() => setImageLoaded(true)}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
      </div>

      <div className="relative px-5 py-5 flex items-center justify-between gap-4">
        {/* Left: User Info */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[2px] text-white/70 uppercase drop-shadow">
            {labelText}
          </p>
          <h1 className="text-xl font-bold text-white truncate mt-1 drop-shadow-md">
            {name}
          </h1>
          <p className="text-[12px] font-medium tracking-wide text-white/80 mt-1 font-mono drop-shadow">
            {memberId}
          </p>
          <p className="text-[11px] text-white/60 mt-2 drop-shadow">
            Tap to show QR code
          </p>
        </div>

        {/* Right: QR Code */}
        <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
          {qrLoading ? (
            <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
          ) : qrCodeUrl ? (
            <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain p-1.5" />
          ) : (
            <QrCode className="w-8 h-8 text-stone-400" strokeWidth={1.5} />
          )}
        </div>
      </div>
    </section>
  );
};
