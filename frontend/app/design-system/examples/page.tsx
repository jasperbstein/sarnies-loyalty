'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, QrCode, Gift, Activity, ChevronRight, Search,
  Home, User, Coffee, Check, MapPin, Ticket, Clock, Star,
  Bell, Settings, CreditCard, Smartphone, X, Menu
} from 'lucide-react';

// ============================================
// SARNIES BRAND DESIGN TOKENS
// Based on Brand Guidelines v1.0 (February 2025)
// ============================================
const tokens = {
  colors: {
    black: '#000000',
    white: '#FFFFFF',
    sarniesGreen: '#2D4A3E',
    textPrimary: '#000000',
    textSecondary: '#6B6B6B',
    textMuted: '#9B9B9B',
    textOnDark: '#FFFFFF',
    bgPage: '#FFFFFF',
    bgPageAlt: '#F5F5F5',
    bgCard: '#FFFFFF',
    bgCardDark: '#000000',
    border: 'rgba(0, 0, 0, 0.1)',
    success: '#34C759',
    successBg: 'rgba(52, 199, 89, 0.12)',
    error: '#FF3B30',
  },
};

// Title style helper
const titleStyle = (size: string, weight: string = '500', spacing: string = '0.2em') => ({
  fontSize: size,
  fontWeight: weight,
  letterSpacing: spacing,
  textTransform: 'uppercase' as const,
});

export default function DesignExamplesPage() {
  const [activeScreen, setActiveScreen] = useState<'home' | 'vouchers' | 'voucher-detail' | 'profile' | 'scan'>('home');

  return (
    <div style={{ background: tokens.colors.bgPageAlt, minHeight: '100vh', fontFamily: "'Circular Std', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <div style={{ background: tokens.colors.white, borderBottom: `1px solid ${tokens.colors.border}` }}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/design-system"
              className="flex items-center gap-2 text-black hover:opacity-70 transition-opacity"
            >
              <ArrowLeft style={{ width: 20, height: 20 }} />
              <span style={{ ...titleStyle('12px', '500', '0.15em') }}>BACK TO DESIGN SYSTEM</span>
            </Link>
            <h1 style={{ ...titleStyle('14px', '500', '0.2em'), color: tokens.colors.textPrimary }}>
              APP EXAMPLES
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Screen Selector */}
        <div className="mb-8">
          <p style={{ ...titleStyle('11px', '500', '0.15em'), color: tokens.colors.textSecondary, marginBottom: '12px' }}>
            SELECT SCREEN
          </p>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'home', label: 'HOME' },
              { id: 'vouchers', label: 'VOUCHERS' },
              { id: 'voucher-detail', label: 'VOUCHER DETAIL' },
              { id: 'profile', label: 'PROFILE' },
              { id: 'scan', label: 'STAFF SCAN' },
            ].map((screen) => (
              <button
                key={screen.id}
                onClick={() => setActiveScreen(screen.id as typeof activeScreen)}
                className="px-4 py-2 rounded-full transition-all"
                style={{
                  background: activeScreen === screen.id ? tokens.colors.black : tokens.colors.white,
                  color: activeScreen === screen.id ? tokens.colors.white : tokens.colors.textSecondary,
                  border: `1px solid ${activeScreen === screen.id ? tokens.colors.black : tokens.colors.border}`,
                  ...titleStyle('11px', '500', '0.1em'),
                }}
              >
                {screen.label}
              </button>
            ))}
          </div>
        </div>

        {/* Phone Frame */}
        <div className="flex justify-center">
          <div
            className="relative rounded-[40px] p-3"
            style={{
              background: tokens.colors.black,
              width: '375px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Phone Screen */}
            <div
              className="rounded-[32px] overflow-hidden"
              style={{
                background: tokens.colors.bgPage,
                height: '750px',
              }}
            >
              {/* Status Bar */}
              <div className="flex items-center justify-between px-6 py-2" style={{ background: tokens.colors.bgPage }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 rounded-sm" style={{ background: tokens.colors.black }} />
                  <div className="w-4 h-2 rounded-sm" style={{ background: tokens.colors.black }} />
                  <div className="w-6 h-3 rounded-sm border" style={{ borderColor: tokens.colors.black }}>
                    <div className="w-4 h-full rounded-sm" style={{ background: tokens.colors.black }} />
                  </div>
                </div>
              </div>

              {/* Screen Content */}
              <div className="h-full overflow-y-auto pb-24">
                {activeScreen === 'home' && <HomeScreen />}
                {activeScreen === 'vouchers' && <VouchersScreen />}
                {activeScreen === 'voucher-detail' && <VoucherDetailScreen />}
                {activeScreen === 'profile' && <ProfileScreen />}
                {activeScreen === 'scan' && <StaffScanScreen />}
              </div>

              {/* Bottom Navigation */}
              {activeScreen !== 'scan' && (
                <div
                  className="absolute bottom-0 left-0 right-0 px-4 py-3 rounded-b-[32px]"
                  style={{ background: tokens.colors.white, borderTop: `1px solid ${tokens.colors.border}` }}
                >
                  <nav className="flex justify-around">
                    {[
                      { icon: Home, label: 'HOME', active: activeScreen === 'home' },
                      { icon: Ticket, label: 'VOUCHERS', active: activeScreen === 'vouchers' || activeScreen === 'voucher-detail' },
                      { icon: MapPin, label: 'OUTLETS', active: false },
                      { icon: Activity, label: 'ACTIVITY', active: false },
                      { icon: User, label: 'PROFILE', active: activeScreen === 'profile' },
                    ].map((item, idx) => (
                      <button key={idx} className="flex flex-col items-center gap-1 px-2 py-1">
                        <item.icon
                          style={{
                            width: 22,
                            height: 22,
                            color: item.active ? tokens.colors.textPrimary : tokens.colors.textMuted,
                            strokeWidth: item.active ? 2.5 : 1.5
                          }}
                        />
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '500',
                          letterSpacing: '0.08em',
                          color: item.active ? tokens.colors.textPrimary : tokens.colors.textMuted
                        }}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-8 text-center">
          <p style={{ fontSize: '15px', color: tokens.colors.textSecondary, letterSpacing: '-0.01em' }}>
            {activeScreen === 'home' && 'Employee home screen with QR code card, quick redeem action, and announcements.'}
            {activeScreen === 'vouchers' && 'Voucher listing with filter pills and card grid layout.'}
            {activeScreen === 'voucher-detail' && 'Individual voucher detail with redemption action.'}
            {activeScreen === 'profile' && 'User profile with account settings and logout.'}
            {activeScreen === 'scan' && 'Staff scanner interface for processing redemptions.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HOME SCREEN
// ============================================
function HomeScreen() {
  return (
    <div className="px-5 py-4">
      {/* Hero Card */}
      <div
        className="rounded-2xl p-5 mb-5"
        style={{ background: tokens.colors.bgCardDark }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p style={{ ...titleStyle('10px', '500', '0.15em'), color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
              WELCOME BACK
            </p>
            <h2 style={{ ...titleStyle('22px', '500', '0.2em'), color: tokens.colors.textOnDark, marginBottom: '6px' }}>
              SUNDAY
            </h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              Employee ID: #000022
            </p>
          </div>
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center"
            style={{ background: tokens.colors.white }}
          >
            <QrCode style={{ width: 32, height: 32, color: tokens.colors.black }} />
          </div>
        </div>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
          Show this QR code at checkout
        </p>
      </div>

      {/* Quick Redeem */}
      <div
        className="rounded-2xl p-4 mb-5"
        style={{ background: tokens.colors.sarniesGreen }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <Coffee style={{ width: 24, height: 24, color: tokens.colors.white }} />
            </div>
            <div>
              <p style={{ ...titleStyle('9px', '500', '0.1em'), color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>
                QUICK REDEEM
              </p>
              <p style={{ fontSize: '14px', fontWeight: '500', color: tokens.colors.white }}>
                Daily Coffee
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                3 left today
              </p>
            </div>
          </div>
          <ChevronRight style={{ width: 20, height: 20, color: tokens.colors.white, opacity: 0.6 }} />
        </div>
      </div>

      {/* Browse Benefits */}
      <div
        className="rounded-2xl p-4 mb-5"
        style={{ background: tokens.colors.white, border: `1px solid ${tokens.colors.border}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: tokens.colors.bgPageAlt }}
            >
              <Gift style={{ width: 20, height: 20, color: tokens.colors.black }} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: tokens.colors.black }}>
                Browse All Benefits
              </p>
              <p style={{ fontSize: '12px', color: tokens.colors.textSecondary }}>
                View all your vouchers
              </p>
            </div>
          </div>
          <ChevronRight style={{ width: 18, height: 18, color: tokens.colors.textMuted }} />
        </div>
      </div>

      {/* How It Works */}
      <div
        className="rounded-2xl p-4 mb-5"
        style={{ background: tokens.colors.white, border: `1px solid ${tokens.colors.border}` }}
      >
        <p style={{ ...titleStyle('11px', '500', '0.15em'), color: tokens.colors.textPrimary, marginBottom: '12px' }}>
          HOW IT WORKS
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {['Choose', 'Redeem', 'Show QR'].map((step, idx) => (
            <div key={idx}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"
                style={{ background: tokens.colors.black, color: tokens.colors.white, fontSize: '12px', fontWeight: '500' }}
              >
                {idx + 1}
              </div>
              <p style={{ fontSize: '11px', color: tokens.colors.textSecondary }}>
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* News Section */}
      <p style={{ ...titleStyle('11px', '500', '0.15em'), color: tokens.colors.textPrimary, marginBottom: '12px' }}>
        NEWS & UPDATES
      </p>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: tokens.colors.white, border: `1px solid ${tokens.colors.border}` }}
      >
        <div className="h-28 bg-gradient-to-br from-gray-200 to-gray-300" />
        <div className="p-4">
          <span
            className="inline-block px-2 py-1 rounded-full mb-2"
            style={{ background: tokens.colors.bgPageAlt, ...titleStyle('9px', '500', '0.1em'), color: tokens.colors.textSecondary }}
          >
            ANNOUNCEMENT
          </span>
          <p style={{ fontSize: '14px', fontWeight: '500', color: tokens.colors.black }}>
            New Summer Menu Available
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// VOUCHERS SCREEN
// ============================================
function VouchersScreen() {
  return (
    <div className="px-5 py-4">
      {/* Header */}
      <h1 style={{ ...titleStyle('20px', '500', '0.2em'), color: tokens.colors.textPrimary, marginBottom: '16px' }}>
        VOUCHERS
      </h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ width: 18, height: 18, color: tokens.colors.textMuted }}
        />
        <input
          type="text"
          placeholder="Search vouchers..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg outline-none"
          style={{
            background: tokens.colors.bgPageAlt,
            border: `1px solid ${tokens.colors.border}`,
            fontSize: '14px',
            color: tokens.colors.textPrimary,
          }}
        />
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {['ALL', 'DRINKS', 'FOOD', 'DISCOUNT'].map((filter, idx) => (
          <button
            key={filter}
            className="px-3 py-1.5 rounded-full whitespace-nowrap"
            style={{
              background: idx === 0 ? tokens.colors.black : tokens.colors.white,
              color: idx === 0 ? tokens.colors.white : tokens.colors.textSecondary,
              border: `1px solid ${idx === 0 ? tokens.colors.black : tokens.colors.border}`,
              ...titleStyle('10px', '500', '0.08em'),
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Voucher Cards */}
      <div className="space-y-3">
        {[
          { title: 'Daily Coffee', desc: 'Free coffee each shift', remaining: '3 left today', type: 'drinks' },
          { title: 'Lunch Discount', desc: '50% off any main', remaining: '1 per day', type: 'food' },
          { title: 'Pastry of the Day', desc: 'Free pastry selection', remaining: '2 left today', type: 'food' },
        ].map((voucher, idx) => (
          <div
            key={idx}
            className="rounded-xl p-4"
            style={{ background: tokens.colors.white, border: `1px solid ${tokens.colors.border}` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: tokens.colors.bgPageAlt }}
                >
                  {voucher.type === 'drinks' ? (
                    <Coffee style={{ width: 22, height: 22, color: tokens.colors.black }} />
                  ) : (
                    <Gift style={{ width: 22, height: 22, color: tokens.colors.black }} />
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: tokens.colors.black }}>
                    {voucher.title}
                  </p>
                  <p style={{ fontSize: '12px', color: tokens.colors.textSecondary }}>
                    {voucher.desc}
                  </p>
                  <p style={{ fontSize: '11px', color: tokens.colors.sarniesGreen, marginTop: '2px' }}>
                    {voucher.remaining}
                  </p>
                </div>
              </div>
              <ChevronRight style={{ width: 18, height: 18, color: tokens.colors.textMuted }} />
            </div>
          </div>
        ))}
      </div>

      {/* Empty state hint */}
      <p style={{ fontSize: '12px', color: tokens.colors.textMuted, textAlign: 'center', marginTop: '20px' }}>
        Pull down to refresh
      </p>
    </div>
  );
}

// ============================================
// VOUCHER DETAIL SCREEN
// ============================================
function VoucherDetailScreen() {
  return (
    <div>
      {/* Back Button */}
      <div className="px-5 py-3">
        <button className="flex items-center gap-2">
          <ArrowLeft style={{ width: 20, height: 20, color: tokens.colors.black }} />
          <span style={{ ...titleStyle('11px', '500', '0.1em'), color: tokens.colors.black }}>BACK</span>
        </button>
      </div>

      {/* Hero Image */}
      <div className="h-44 bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
        <Coffee style={{ width: 64, height: 64, color: tokens.colors.black, opacity: 0.3 }} />
      </div>

      <div className="px-5 py-5">
        {/* Badge */}
        <span
          className="inline-block px-3 py-1 rounded-full mb-3"
          style={{ background: tokens.colors.sarniesGreen, color: tokens.colors.white, ...titleStyle('9px', '500', '0.1em') }}
        >
          EMPLOYEE BENEFIT
        </span>

        {/* Title */}
        <h1 style={{ ...titleStyle('22px', '500', '0.15em'), color: tokens.colors.textPrimary, marginBottom: '8px' }}>
          DAILY COFFEE
        </h1>

        {/* Description */}
        <p style={{ fontSize: '14px', color: tokens.colors.textSecondary, lineHeight: '1.6', marginBottom: '16px' }}>
          Enjoy a free coffee of your choice during each shift. Valid for any size hot or iced coffee from our regular menu.
        </p>

        {/* Stats */}
        <div
          className="grid grid-cols-2 gap-3 mb-6 p-4 rounded-xl"
          style={{ background: tokens.colors.bgPageAlt }}
        >
          <div>
            <p style={{ ...titleStyle('9px', '500', '0.1em'), color: tokens.colors.textSecondary, marginBottom: '4px' }}>
              REMAINING TODAY
            </p>
            <p style={{ fontSize: '20px', fontWeight: '600', color: tokens.colors.black }}>
              3
            </p>
          </div>
          <div>
            <p style={{ ...titleStyle('9px', '500', '0.1em'), color: tokens.colors.textSecondary, marginBottom: '4px' }}>
              DAILY LIMIT
            </p>
            <p style={{ fontSize: '20px', fontWeight: '600', color: tokens.colors.black }}>
              3
            </p>
          </div>
        </div>

        {/* Terms */}
        <div className="mb-6">
          <p style={{ ...titleStyle('10px', '500', '0.1em'), color: tokens.colors.textPrimary, marginBottom: '8px' }}>
            TERMS & CONDITIONS
          </p>
          <ul className="space-y-2">
            {[
              'Valid during working hours only',
              'One redemption per transaction',
              'Cannot be combined with other offers',
            ].map((term, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Check style={{ width: 14, height: 14, color: tokens.colors.sarniesGreen, marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: tokens.colors.textSecondary }}>{term}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Redeem Button */}
        <button
          className="w-full py-4 rounded-xl transition-all active:scale-[0.98]"
          style={{
            background: tokens.colors.black,
            color: tokens.colors.white,
            ...titleStyle('13px', '500', '0.15em'),
          }}
        >
          REDEEM NOW
        </button>
      </div>
    </div>
  );
}

// ============================================
// PROFILE SCREEN
// ============================================
function ProfileScreen() {
  return (
    <div className="px-5 py-4">
      {/* Header */}
      <h1 style={{ ...titleStyle('20px', '500', '0.2em'), color: tokens.colors.textPrimary, marginBottom: '20px' }}>
        PROFILE
      </h1>

      {/* User Card */}
      <div
        className="rounded-2xl p-5 mb-5"
        style={{ background: tokens.colors.bgCardDark }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <User style={{ width: 28, height: 28, color: tokens.colors.white }} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '500', color: tokens.colors.white, marginBottom: '4px' }}>
              Sunday Morning
            </h2>
            <p style={{ ...titleStyle('10px', '500', '0.1em'), color: 'rgba(255,255,255,0.6)' }}>
              EMPLOYEE
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div
        className="rounded-xl p-4 mb-5"
        style={{ background: tokens.colors.white, border: `1px solid ${tokens.colors.border}` }}
      >
        <p style={{ ...titleStyle('10px', '500', '0.1em'), color: tokens.colors.textSecondary, marginBottom: '12px' }}>
          ACCOUNT DETAILS
        </p>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span style={{ fontSize: '14px', color: tokens.colors.textSecondary }}>Phone</span>
            <span style={{ fontSize: '14px', color: tokens.colors.textPrimary }}>+66 123 123 123</span>
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: '14px', color: tokens.colors.textSecondary }}>Employee ID</span>
            <span style={{ fontSize: '14px', color: tokens.colors.textPrimary }}>#000022</span>
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: '14px', color: tokens.colors.textSecondary }}>Member Since</span>
            <span style={{ fontSize: '14px', color: tokens.colors.textPrimary }}>Jan 2025</span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div
        className="rounded-xl overflow-hidden mb-5"
        style={{ background: tokens.colors.white, border: `1px solid ${tokens.colors.border}` }}
      >
        {[
          { icon: Bell, label: 'Notifications' },
          { icon: CreditCard, label: 'Card Settings' },
          { icon: Settings, label: 'Preferences' },
        ].map((item, idx) => (
          <button
            key={idx}
            className="w-full flex items-center justify-between p-4"
            style={{ borderBottom: idx < 2 ? `1px solid ${tokens.colors.border}` : 'none' }}
          >
            <div className="flex items-center gap-3">
              <item.icon style={{ width: 20, height: 20, color: tokens.colors.textPrimary }} />
              <span style={{ fontSize: '14px', color: tokens.colors.textPrimary }}>{item.label}</span>
            </div>
            <ChevronRight style={{ width: 18, height: 18, color: tokens.colors.textMuted }} />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        className="w-full py-3 rounded-xl"
        style={{
          background: 'transparent',
          color: tokens.colors.error,
          border: `1px solid ${tokens.colors.error}`,
          fontSize: '14px',
          fontWeight: '500',
        }}
      >
        Log Out
      </button>
    </div>
  );
}

// ============================================
// STAFF SCAN SCREEN
// ============================================
function StaffScanScreen() {
  return (
    <div style={{ background: tokens.colors.bgCardDark, height: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button>
          <Menu style={{ width: 24, height: 24, color: tokens.colors.white }} />
        </button>
        <p style={{ ...titleStyle('12px', '500', '0.15em'), color: tokens.colors.white }}>
          STAFF SCANNER
        </p>
        <div style={{ width: 24 }} />
      </div>

      {/* Scanner Area */}
      <div className="px-5 py-8">
        <div
          className="aspect-square rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.2)' }}
        >
          {/* Corner Markers */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />

          {/* Scan Line */}
          <div
            className="absolute left-4 right-4 h-0.5"
            style={{
              background: tokens.colors.sarniesGreen,
              top: '50%',
              boxShadow: `0 0 10px ${tokens.colors.sarniesGreen}`,
            }}
          />

          <Smartphone style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.3)' }} />
        </div>

        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: '16px' }}>
          Position the customer's QR code within the frame
        </p>
      </div>

      {/* Recent Scans */}
      <div className="px-5">
        <p style={{ ...titleStyle('10px', '500', '0.1em'), color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
          RECENT SCANS
        </p>
        <div className="space-y-3">
          {[
            { name: 'John D.', voucher: 'Daily Coffee', time: '2 min ago', status: 'success' },
            { name: 'Sarah M.', voucher: 'Lunch Discount', time: '15 min ago', status: 'success' },
          ].map((scan, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: tokens.colors.successBg }}
                >
                  <Check style={{ width: 18, height: 18, color: tokens.colors.success }} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: tokens.colors.white }}>
                    {scan.name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    {scan.voucher}
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                {scan.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Entry */}
      <div className="absolute bottom-8 left-5 right-5">
        <button
          className="w-full py-3 rounded-xl"
          style={{
            background: 'transparent',
            color: tokens.colors.white,
            border: `1px solid rgba(255,255,255,0.3)`,
            ...titleStyle('12px', '500', '0.1em'),
          }}
        >
          MANUAL ENTRY
        </button>
      </div>
    </div>
  );
}
