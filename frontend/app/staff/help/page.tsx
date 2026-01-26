'use client';

import AdminLayout from '@/components/AdminLayout';
import Card from '@/components/ui/Card';
import {
  HelpCircle, QrCode, Award, Gift, AlertTriangle, CheckCircle,
  Clock, MapPin, Camera, Settings, Shield, Eye, Lock, Wifi, Smartphone
} from 'lucide-react';

export default function StaffHelpPage() {
  const sections = [
    {
      id: 'quick-rules',
      title: 'Quick Rules',
      icon: CheckCircle,
      color: 'text-sarnies-green',
      items: [
        {
          icon: QrCode,
          title: 'Always Scan QR First',
          description: 'Verify customer identity before applying any rewards or adding points',
        },
        {
          icon: Award,
          title: 'Points Must Match Receipt',
          description: 'Enter the exact purchase amount. 1 point = 100 THB spent',
        },
        {
          icon: Clock,
          title: 'Voucher QR Expires in 10 Minutes',
          description: 'Check the countdown timer. Expired QR codes cannot be used',
        },
        {
          icon: MapPin,
          title: 'Check Valid Locations',
          description: 'Some vouchers are only valid at specific outlets (Sukhumvit, Old Town, Roastery)',
        },
      ]
    },
    {
      id: 'earn-points',
      title: 'How to Add Points',
      icon: Award,
      color: 'text-green-600',
      steps: [
        'Scan customer\'s loyalty QR code',
        'Enter exact purchase amount from receipt',
        'Verify points calculation (1 point per 100 THB)',
        'Confirm transaction',
        'Points appear in customer account immediately'
      ]
    },
    {
      id: 'redeem-voucher',
      title: 'How to Redeem Voucher',
      icon: Gift,
      color: 'text-purple-600',
      steps: [
        'Customer shows voucher QR code on their phone',
        'Scan the voucher QR code',
        'Verify customer details and voucher information',
        'Check expiry countdown (must be above 0:00)',
        'Confirm voucher is valid at current branch',
        'Redeem voucher and provide item/discount'
      ]
    },
    {
      id: 'common-errors',
      title: 'Common Errors & Solutions',
      icon: AlertTriangle,
      color: 'text-red-600',
      errors: [
        {
          title: 'QR Code Expired',
          solution: 'Ask customer to regenerate voucher QR from their app',
          icon: Clock,
        },
        {
          title: 'Wrong Branch',
          solution: 'Check voucher location restrictions. Direct customer to correct outlet',
          icon: MapPin,
        },
        {
          title: 'Already Redeemed',
          solution: 'Voucher can only be used once. Cannot be redeemed again',
          icon: CheckCircle,
        },
        {
          title: 'Insufficient Points',
          solution: 'Customer needs more points to redeem this reward',
          icon: Award,
        },
      ]
    },
    {
      id: 'camera-troubleshooting',
      title: 'Camera Troubleshooting',
      icon: Camera,
      color: 'text-blue-600',
      items: [
        {
          title: 'Camera Permission Denied',
          description: 'Go to browser settings → Site settings → Allow camera access for this site',
        },
        {
          title: 'QR Code Not Scanning',
          description: 'Ask customer to increase screen brightness, hold phone steady 15-20cm from camera',
        },
        {
          title: 'Camera Already in Use',
          description: 'Close other apps using camera, refresh the page, try again',
        },
        {
          title: 'Camera Not Working',
          description: 'Use Manual Entry button to paste QR token directly',
        },
      ]
    },
    {
      id: 'offline-troubleshooting',
      title: 'Offline Troubleshooting',
      icon: Wifi,
      color: 'text-orange-600',
      items: [
        {
          title: 'No Internet Connection',
          description: 'Check WiFi/mobile data. Transactions require active internet connection',
        },
        {
          title: 'Transaction Failed',
          description: 'Do NOT retry immediately. Check "Today\'s Transactions" to see if it was recorded',
        },
        {
          title: 'Points Not Updating',
          description: 'Ask customer to pull down to refresh their app. Contact support if issue persists',
        },
      ]
    },
    {
      id: 'points-calculation',
      title: 'Points Calculation Reference',
      icon: Award,
      color: 'text-amber-600',
      content: (
        <div className="space-y-3">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-sarnies-card">
            <p className="font-bold text-amber-900 text-lg mb-2">1 Point = 100 THB</p>
            <p className="text-sm text-amber-800">Points are automatically calculated when you enter the purchase amount</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-gray-200 rounded-sarnies-button">
              <p className="text-sm text-sarnies-midgray mb-1">Purchase: 350 THB</p>
              <p className="font-bold text-sarnies-black">Earns: 3 points</p>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-sarnies-button">
              <p className="text-sm text-sarnies-midgray mb-1">Purchase: 1,250 THB</p>
              <p className="font-bold text-sarnies-black">Earns: 12 points</p>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-sarnies-button">
              <p className="text-sm text-sarnies-midgray mb-1">Purchase: 99 THB</p>
              <p className="font-bold text-sarnies-black">Earns: 0 points</p>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-sarnies-button">
              <p className="text-sm text-sarnies-midgray mb-1">Purchase: 5,000 THB</p>
              <p className="font-bold text-sarnies-black">Earns: 50 points</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'branch-rules',
      title: 'Branch Restrictions',
      icon: MapPin,
      color: 'text-purple-600',
      items: [
        {
          title: 'Your Branch is Locked',
          description: 'You are currently assigned to Sukhumvit branch. All transactions are recorded for this location',
        },
        {
          title: 'Branch-Specific Vouchers',
          description: 'Some vouchers can only be redeemed at specific outlets. Check the voucher details before confirming',
        },
        {
          title: 'Cross-Branch Loyalty Cards',
          description: 'Loyalty QR codes work at ALL branches. Points are shared across all Sarnies locations',
        },
      ]
    },
    {
      id: 'privacy-rules',
      title: 'Privacy Rules',
      icon: Eye,
      color: 'text-indigo-600',
      items: [
        {
          title: 'Never Share Customer Data',
          description: 'Customer phone numbers, points balance, and transaction history are confidential',
        },
        {
          title: 'Never Screenshot Customer QR Codes',
          description: 'QR codes are personal identifiers. Do not save, share, or reuse them',
        },
        {
          title: 'Verify Identity',
          description: 'Always verify the customer is the account owner before processing transactions',
        },
      ]
    },
    {
      id: 'security-rules',
      title: 'Security Rules',
      icon: Lock,
      color: 'text-red-600',
      items: [
        {
          title: 'Never Process Your Own Account',
          description: 'Staff cannot earn points or redeem vouchers on their own accounts during shifts',
        },
        {
          title: 'Report Suspicious Activity',
          description: 'Multiple scans, fake receipts, or unusual requests should be reported immediately',
        },
        {
          title: 'One Scan Per Purchase',
          description: 'Each receipt can only be scanned once. Check "Today\'s Transactions" to prevent duplicates',
        },
        {
          title: 'Logout After Shift',
          description: 'Always logout from the staff portal when your shift ends',
        },
      ]
    },
    {
      id: 'simulation-mode',
      title: 'Simulation Mode',
      icon: Smartphone,
      color: 'text-cyan-600',
      items: [
        {
          title: 'Practice Without Risk',
          description: 'Use Simulation Mode to practice scanning and transactions without affecting real customer data',
        },
        {
          title: 'Access via Sidebar',
          description: 'Navigate to Staff Tools → Simulator in the sidebar menu',
        },
        {
          title: 'Test All Scenarios',
          description: 'Try earning points, redeeming vouchers, and handling errors in a safe environment',
        },
      ]
    },
  ];

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-sarnies-lightgray rounded-full flex items-center justify-center">
              <HelpCircle className="w-7 h-7 text-sarnies-charcoal" />
            </div>
            <div>
              <h1 className="text-h2 text-sarnies-black">Staff Help Center</h1>
              <p className="text-sm text-sarnies-midgray">
                Quick reference guide for daily operations and troubleshooting
              </p>
            </div>
          </div>
        </Card>

        {/* Render all sections */}
        {sections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <Card key={section.id} padding="md">
              <div className="flex items-center gap-3 mb-4">
                <SectionIcon className={`w-6 h-6 ${section.color}`} />
                <h2 className="text-h3 text-sarnies-black">{section.title}</h2>
              </div>

              {/* Items grid layout */}
              {section.items && (
                <div className="grid grid-cols-1 gap-3">
                  {section.items.map((item, index) => {
                    const ItemIcon = ('icon' in item ? item.icon : null) || CheckCircle;
                    return (
                      <div
                        key={index}
                        className="p-4 bg-sarnies-lightgray rounded-sarnies-button border border-gray-200"
                      >
                        <div className="flex items-start gap-3">
                          <ItemIcon className="w-5 h-5 text-sarnies-charcoal flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-sarnies-black mb-1">{item.title}</h4>
                            <p className="text-sm text-sarnies-charcoal">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Steps numbered list */}
              {section.steps && (
                <ol className="space-y-3">
                  {section.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className={`w-7 h-7 ${section.color.replace('text-', 'bg-')} text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm`}>
                        {index + 1}
                      </div>
                      <p className="text-sarnies-charcoal pt-1">{step}</p>
                    </li>
                  ))}
                </ol>
              )}

              {/* Errors list */}
              {section.errors && (
                <div className="space-y-3">
                  {section.errors.map((error, index) => {
                    const ErrorIcon = error.icon;
                    return (
                      <div
                        key={index}
                        className="p-4 bg-red-50 rounded-sarnies-button border border-red-200"
                      >
                        <div className="flex items-start gap-3">
                          <ErrorIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-bold text-red-900 mb-1">{error.title}</h4>
                            <p className="text-sm text-red-800">{error.solution}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Custom content */}
              {section.content && section.content}
            </Card>
          );
        })}

        {/* Emergency Contact Footer */}
        <Card variant="bordered" padding="md">
          <div className="text-center">
            <h3 className="font-bold text-sarnies-black mb-2">Need Help?</h3>
            <p className="text-sm text-sarnies-midgray mb-4">
              If you encounter issues not covered here, contact your manager or the support team
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sarnies-lightgray rounded-sarnies-button">
              <Settings className="w-4 h-4 text-sarnies-charcoal" />
              <span className="text-sm font-medium text-sarnies-charcoal">Support: manager@sarnies.com</span>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
