'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import AdminLayout from '@/components/AdminLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Camera, Keyboard, List, QrCode, Clock, MapPin, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function StaffHomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shiftStart] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const quickReminders = [
    {
      icon: QrCode,
      title: 'Scan QR first',
      description: 'Always verify customer identity before applying rewards',
      color: 'bg-blue-50 border-blue-200'
    },
    {
      icon: AlertCircle,
      title: 'Points must match receipt',
      description: 'Enter exact purchase amount from receipt',
      color: 'bg-green-50 border-green-200'
    },
    {
      icon: Clock,
      title: 'Voucher expires in 10 minutes',
      description: 'Check countdown timer before redeeming',
      color: 'bg-amber-50 border-amber-200'
    },
    {
      icon: MapPin,
      title: 'Check branch restrictions',
      description: 'Some vouchers are valid at specific outlets only',
      color: 'bg-purple-50 border-purple-200'
    }
  ];

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        {/* Top Status Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                {user?.name?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-base">{user?.name}</p>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-gray-600">Sukhumvit</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-gray-600">Shift: {formatTime(shiftStart)}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Time</p>
              <p className="text-xl font-bold text-gray-900 font-mono tabular-nums">
                {formatTime(currentTime)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>

            <div className="space-y-3">
              {/* Primary Action */}
              <button
                onClick={() => router.push('/staff/scan')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-900 text-white rounded-xl font-semibold text-base hover:bg-gray-800 transition-colors shadow-sm"
              >
                <Camera size={24} />
                Start Camera Scan
              </button>

              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push('/staff/manual-entry')}
                  className="flex flex-col items-center justify-center gap-2 px-4 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  <Keyboard size={22} />
                  <span>Manual Entry</span>
                </button>

                <button
                  onClick={() => router.push('/staff/transactions')}
                  className="flex flex-col items-center justify-center gap-2 px-4 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  <List size={22} />
                  <span>Transactions</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Reminders Card */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">Quick Reminders</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickReminders.map((reminder, index) => {
                const Icon = reminder.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-2.5 text-sm text-gray-700"
                  >
                    <Icon size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-0.5">{reminder.title}</p>
                      <p className="text-xs text-gray-600">{reminder.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
