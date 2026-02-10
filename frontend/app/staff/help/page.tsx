'use client';

import StaffLayout from '@/components/StaffLayout';
import { ArrowLeft, QrCode, Award, Clock, MapPin, Camera, Wifi, HelpCircle, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: { title: string; description: string }[];
}

export default function StaffHelpPage() {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>('quick-rules');

  const sections: HelpSection[] = [
    {
      id: 'quick-rules',
      title: 'Quick Rules',
      icon: QrCode,
      items: [
        { title: 'Always Scan QR First', description: 'Verify customer identity before applying any rewards or adding points' },
        { title: 'Points Must Match Receipt', description: 'Enter the exact purchase amount. 1 point = 100 THB spent' },
        { title: 'Voucher QR Expires in 10 Minutes', description: 'Check the countdown timer. Expired QR codes cannot be used' },
        { title: 'Check Valid Locations', description: 'Some vouchers are only valid at specific outlets' },
      ]
    },
    {
      id: 'earn-points',
      title: 'How to Add Points',
      icon: Award,
      items: [
        { title: 'Step 1', description: "Scan customer's loyalty QR code" },
        { title: 'Step 2', description: 'Enter exact purchase amount from receipt' },
        { title: 'Step 3', description: 'Verify points calculation (1 point per 100 THB)' },
        { title: 'Step 4', description: 'Confirm transaction' },
      ]
    },
    {
      id: 'camera-issues',
      title: 'Camera Troubleshooting',
      icon: Camera,
      items: [
        { title: 'Permission Denied', description: 'Go to browser settings → Allow camera access' },
        { title: 'Not Scanning', description: 'Increase screen brightness, hold phone 15-20cm away' },
        { title: 'Camera Not Working', description: 'Use Manual Entry button to enter code directly' },
      ]
    },
    {
      id: 'connection-issues',
      title: 'Connection Issues',
      icon: Wifi,
      items: [
        { title: 'No Internet', description: 'Check WiFi/mobile data. Transactions require internet' },
        { title: 'Transaction Failed', description: "Don't retry immediately. Check Transactions to see if it was recorded" },
        { title: 'Points Not Updating', description: 'Ask customer to refresh their app' },
      ]
    },
  ];

  return (
    <StaffLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-stone-500 mb-4 hover:text-stone-700"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-stone-900">
            Help Center
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Quick reference for daily operations
          </p>
        </div>

        {/* Help Sections */}
        <div className="px-5 pb-6 space-y-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;

            return (
              <div key={section.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  className="w-full flex items-center justify-between px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-amber-600" />
                    </div>
                    <span className="text-[15px] font-semibold text-stone-900">
                      {section.title}
                    </span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-stone-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {section.items.map((item, index) => (
                      <div key={index} className="bg-stone-50 rounded-lg p-3">
                        <p className="text-sm font-semibold text-stone-900">
                          {item.title}
                        </p>
                        <p className="text-[13px] text-stone-500 mt-1">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Contact Support */}
          <div className="bg-stone-100 rounded-xl p-4 text-center mt-6">
            <HelpCircle className="w-8 h-8 text-stone-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-stone-900">
              Need more help?
            </p>
            <p className="text-[13px] text-stone-500 mt-1">
              Contact your manager or support@sarnies.com
            </p>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}
