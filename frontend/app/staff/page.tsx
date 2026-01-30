'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import StaffLayout from '@/components/StaffLayout';
import { Scan, Keyboard, History, CheckCircle, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function StaffHomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const outletName = user?.branch || 'Raffles Place';
  const staffName = user?.name;
  const statusText = staffName ? `${staffName} • On duty` : 'Ready to scan';

  const reminders = [
    'Always scan QR before applying rewards',
    'Check voucher expiry countdown',
    'Verify points match receipt amount',
  ];

  return (
    <StaffLayout>
      {/* Desktop Header - only visible on lg+ */}
      <div className="hidden lg:block bg-white border-b border-[#E7E5E4]">
        <div className="flex items-center justify-between px-10 py-5">
          <div>
            <h1
              className="text-[24px] font-bold text-[#1C1917]"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              Staff Dashboard
            </h1>
            <p
              className="text-[14px] text-[#78716C] mt-1"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              {outletName} • {statusText}
            </p>
          </div>
          <button
            onClick={() => router.push('/staff/settings')}
            className="w-10 h-10 rounded-full bg-[#F5F5F4] flex items-center justify-center hover:bg-[#E7E5E4] transition-colors"
          >
            <Settings className="w-5 h-5 text-[#78716C]" />
          </button>
        </div>
      </div>

      <div className="min-h-screen bg-white lg:bg-[#FAFAF9]">
        {/* Mobile Layout */}
        <div className="lg:hidden px-5 pt-5 pb-6 space-y-5">
          <LocationCard outletName={outletName} statusText={statusText} />
          <ScanButton onClick={() => router.push('/staff/scan')} />
          <SecondaryButtons router={router} />
          <RemindersCard reminders={reminders} />
        </div>

        {/* Tablet Layout (md to lg) */}
        <div className="hidden md:flex lg:hidden px-6 pt-6 pb-6 gap-6">
          {/* Left Column */}
          <div className="flex-1 space-y-5">
            <LocationCard outletName={outletName} statusText={statusText} />
            <ScanButton onClick={() => router.push('/staff/scan')} />
            <SecondaryButtons router={router} />
          </div>
          {/* Right Column */}
          <div className="w-[300px] space-y-5">
            <RemindersCard reminders={reminders} />
            <StatsCard />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex p-10 gap-8">
          {/* Left/Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl border border-[#E7E5E4] p-8">
              <h2
                className="text-[18px] font-bold text-[#1C1917] mb-6"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Quick Actions
              </h2>
              <ScanButton onClick={() => router.push('/staff/scan')} />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button
                  onClick={() => router.push('/staff/manual-entry')}
                  className="flex flex-col items-center justify-center gap-2 px-4 py-5 bg-white rounded-xl border border-[#E7E5E4] hover:bg-[#FAFAF9] transition-colors"
                >
                  <Keyboard className="w-6 h-6 text-[#1C1917]" />
                  <span
                    className="text-[14px] font-medium text-[#1C1917]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    Manual Entry
                  </span>
                </button>
                <button
                  onClick={() => router.push('/staff/transactions')}
                  className="flex flex-col items-center justify-center gap-2 px-4 py-5 bg-white rounded-xl border border-[#E7E5E4] hover:bg-[#FAFAF9] transition-colors"
                >
                  <History className="w-6 h-6 text-[#1C1917]" />
                  <span
                    className="text-[14px] font-medium text-[#1C1917]"
                    style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                  >
                    View Transactions
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-[320px] space-y-6">
            <StatsCard />
            <RemindersCard reminders={reminders} />
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}

function LocationCard({ outletName, statusText }: { outletName: string; statusText: string }) {
  return (
    <div
      className="relative h-[180px] rounded-2xl overflow-hidden cursor-pointer"
      style={{
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
      }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80)'
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)'
        }}
      />
      <div className="absolute inset-0 p-5 flex flex-col justify-end">
        <p
          className="text-[10px] font-bold tracking-[2px] text-white/60 mb-1"
          style={{ fontFamily: 'Spline Sans, sans-serif' }}
        >
          YOU'RE AT
        </p>
        <p
          className="text-[24px] font-bold text-white"
          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
        >
          {outletName}
        </p>
        <p
          className="text-[13px] text-white/60 mt-1"
          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
        >
          {statusText}
        </p>
      </div>
    </div>
  );
}

function ScanButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-[#1C1917] text-white rounded-2xl font-semibold text-[18px] hover:bg-[#292524] transition-colors"
      style={{ fontFamily: 'Instrument Sans, sans-serif' }}
    >
      <Scan className="w-6 h-6" />
      Scan Customer
    </button>
  );
}

function SecondaryButtons({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => router.push('/staff/manual-entry')}
        className="flex flex-col items-center justify-center gap-2 px-4 py-5 bg-white rounded-xl border border-[#E7E5E4] hover:bg-[#FAFAF9] transition-colors"
      >
        <Keyboard className="w-6 h-6 text-[#1C1917]" />
        <span
          className="text-[13px] font-medium text-[#1C1917]"
          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
        >
          Manual Entry
        </span>
      </button>

      <button
        onClick={() => router.push('/staff/transactions')}
        className="flex flex-col items-center justify-center gap-2 px-4 py-5 bg-white rounded-xl border border-[#E7E5E4] hover:bg-[#FAFAF9] transition-colors"
      >
        <History className="w-6 h-6 text-[#1C1917]" />
        <span
          className="text-[13px] font-medium text-[#1C1917]"
          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
        >
          Transactions
        </span>
      </button>
    </div>
  );
}

function RemindersCard({ reminders }: { reminders: string[] }) {
  return (
    <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 lg:p-6">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-[18px] h-[18px] text-[#78716C]" />
        <p
          className="text-[11px] font-bold tracking-[1.5px] text-[#78716C]"
          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
        >
          REMINDERS
        </p>
      </div>
      <div className="space-y-2 lg:space-y-3">
        {reminders.map((reminder, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-[#FAFAF9] rounded-lg"
          >
            <CheckCircle className="w-4 h-4 text-[#78716C] mt-0.5 flex-shrink-0" />
            <p
              className="text-[13px] text-[#57534E]"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              {reminder}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsCard() {
  return (
    <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 lg:p-6">
      <p
        className="text-[11px] font-bold tracking-[1.5px] text-[#78716C] mb-4"
        style={{ fontFamily: 'Instrument Sans, sans-serif' }}
      >
        TODAY'S STATS
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#F5F5F4] rounded-xl p-3 text-center">
          <p
            className="text-[24px] font-bold text-[#1C1917]"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            24
          </p>
          <p
            className="text-[12px] text-[#78716C]"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            Scans
          </p>
        </div>
        <div className="bg-[#F0FDF4] rounded-xl p-3 text-center">
          <p
            className="text-[24px] font-bold text-[#16A34A]"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            1,280
          </p>
          <p
            className="text-[12px] text-[#16A34A]"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            Points Given
          </p>
        </div>
      </div>
    </div>
  );
}
