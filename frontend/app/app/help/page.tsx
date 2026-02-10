'use client';

import React from "react";
import AppLayout from "@/components/AppLayout";
import { useAuthStore } from "@/lib/store";
import { Coffee, Gift, QrCode, CheckCircle, Clock, Repeat } from 'lucide-react';
import { useRouter } from "next/navigation";
import { isEmployeeUser } from '@/lib/authUtils';

export default function HelpPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const isEmployee = isEmployeeUser(user);

  if (!isEmployee) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6">
          <h1 className="text-2xl font-bold text-gray-900">Help & Instructions</h1>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <p className="text-gray-700">Customer help content coming soon...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-24">
        <header>
          <h1 className="text-[28px] font-bold text-gray-900">How It Works</h1>
          <p className="text-gray-600 mt-2">Your complete guide to Sarnies employee benefits</p>
        </header>

        {/* Quick Start Guide */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Coffee className="w-6 h-6 text-amber-600" />
            Quick Start Guide
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-lg">1</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Open the Vouchers Tab</h3>
                <p className="text-sm text-gray-700">Navigate to the "Vouchers" section at the bottom of your screen to see all available employee benefits.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-lg">2</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Select Your Benefit</h3>
                <p className="text-sm text-gray-700">Tap on any voucher (like "Employee Daily Drink" or "Employee Discount 50%") to view details.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-lg">3</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Redeem to Generate QR</h3>
                <p className="text-sm text-gray-700">Click "Redeem Now" button - this instantly creates your unique QR code for that benefit.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-lg">4</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Show QR at Counter</h3>
                <p className="text-sm text-gray-700">Present the QR code to any staff member at the counter. They'll scan it to apply your discount or free item.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Benefits */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Gift className="w-6 h-6 text-amber-600" />
            Your Employee Benefits
          </h2>
          <div className="space-y-4">
            <div className="flex gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <Coffee className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900">Daily Drink</h3>
                <p className="text-sm text-gray-700">One free drink per day (any size, any coffee or beverage)</p>
                <p className="text-xs text-green-700 mt-1">✓ Can be redeemed multiple times daily</p>
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Gift className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900">Employee Discount (50% Off)</h3>
                <p className="text-sm text-gray-700">50% discount on all food and beverages purchases</p>
                <p className="text-xs text-blue-700 mt-1">✓ Unlimited use - redeem as many times as you want!</p>
              </div>
            </div>
          </div>
        </div>

        {/* How QR Codes Work */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-amber-600" />
            Understanding QR Codes
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700"><strong>Each redemption creates a unique QR code</strong> - You'll get a new code each time you redeem a benefit.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700"><strong>QR codes remain active</strong> - Your code stays valid until staff scans it at the counter.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Repeat className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700"><strong>Check your history</strong> - View all your redemptions in the "Activity" tab, grouped by date.</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">How many times can I redeem per day?</h3>
              <p className="text-sm text-gray-700">As many times as you want! Both the Daily Drink and 50% Discount have unlimited daily redemptions.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Can I redeem multiple vouchers at once?</h3>
              <p className="text-sm text-gray-700">Yes! You can redeem a Daily Drink and 50% Discount for the same purchase if you want.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">What if my QR code doesn't scan?</h3>
              <p className="text-sm text-gray-700">Make sure your screen brightness is up. If issues persist, try redeeming the voucher again to generate a fresh QR code.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Do my benefits expire?</h3>
              <p className="text-sm text-gray-700">No! Your employee benefits are active as long as you're employed at Sarnies.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Where can I see my redemption history?</h3>
              <p className="text-sm text-gray-700">Go to the "Activity" tab at the bottom to see all your past redemptions, grouped by date with timestamps.</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <button
          onClick={() => router.push("/app/vouchers")}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          Browse Your Vouchers →
        </button>

        {/* Support */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center">
          <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-sm text-gray-600">Contact your manager or visit the admin office</p>
        </div>
      </div>
    </AppLayout>
  );
}
