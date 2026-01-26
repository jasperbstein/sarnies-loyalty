/**
 * MemberHeroCard - Employee Pass Style Card
 * Sarnies Design System v1.2
 *
 * Employee view: Pattern background with mustard accents
 * Customer view: Solid dark card
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

  // Employee variant with pattern background
  if (isEmployee) {
    return (
      <section className="w-full relative rounded-xl overflow-hidden min-h-[160px]">
        {/* Pattern Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/pattern-bg.jpg)' }}
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/50" />

        {/* Content */}
        <div className="relative z-10 p-6">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Greeting */}
            <div>
              <p
                className="text-[10px] font-medium uppercase tracking-[0.15em] mb-1.5"
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  textShadow: '0 2px 12px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.6)'
                }}
              >
                Welcome back
              </p>
              <h1
                className="text-[22px] font-bold uppercase tracking-[0.2em] text-white mb-2"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.6)' }}
              >
                {name.toUpperCase()}
              </h1>
              <p
                className="text-xs"
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  textShadow: '0 2px 8px rgba(0,0,0,0.6)'
                }}
              >
                Employee ID: #{memberId}
              </p>
            </div>

            {/* Right: QR Code */}
            <div className="flex-shrink-0 bg-white rounded-xl w-[100px] h-[100px] flex items-center justify-center">
              {qrLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" className="w-[80px] h-[80px]" />
              ) : (
                <QrCode className="w-14 h-14 text-black" />
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Customer variant - solid dark card
  return (
    <section className="w-full card-dark">
      {/* Greeting */}
      <div className="mb-4">
        <p className="text-caption text-white/40 mb-1">Welcome back</p>
        <h1 className="text-heading text-white">{name.toUpperCase()}</h1>
        <p className="text-caption text-white/30 mt-1">
          Member #{memberId}
        </p>
      </div>

      <div className="h-px bg-white/10 mb-4" />

      {/* QR Section */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 bg-white rounded-lg p-3">
          {qrLoading ? (
            <div className="w-[100px] h-[100px] flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            </div>
          ) : qrCodeUrl ? (
            <img src={qrCodeUrl} alt="QR Code" className="w-[100px] h-[100px]" />
          ) : (
            <div className="w-[100px] h-[100px] flex items-center justify-center bg-gray-100 rounded">
              <QrCode className="w-10 h-10 text-gray-300" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
              <QrCode className="w-3 h-3 text-accent" />
            </div>
            <span className="text-nav text-accent">SCAN TO REDEEM</span>
          </div>
          <p className="text-caption text-white/50">
            Earn & redeem points
          </p>
        </div>
      </div>
    </section>
  );
};
