'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import BottomNav from '@/components/BottomNav';
import ReviewModal from '@/components/ReviewModal';
import { useAuthStore } from '@/lib/store';
import { CheckCircle } from 'lucide-react';

// Disable static generation for this page (uses searchParams)
export const dynamic = 'force-dynamic';

function ReviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Get transaction details from URL params
  const type = searchParams.get('type'); // 'earn' or 'redeem'
  const points = searchParams.get('points');
  const amount = searchParams.get('amount');

  useEffect(() => {
    // Auto-open review modal after short delay
    const timer = setTimeout(() => {
      setShowReviewModal(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleCloseReview = () => {
    setShowReviewModal(false);
    // Redirect to home after closing review
    setTimeout(() => {
      router.push('/app/dashboard');
    }, 300);
  };

  return (
    <AppLayout>
      <div className="min-h-screen flex items-center justify-center p-6 pb-24">
        <div className="max-w-md w-full">
          {/* Success Message */}
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={48} className="text-green-600" />
            </div>

            <h1 className="text-2xl font-bold text-sarnies-black mb-3">
              {type === 'earn' ? 'Points Earned!' : 'Voucher Redeemed!'}
            </h1>

            <div className="space-y-2 mb-6">
              {type === 'earn' && points && (
                <p className="text-lg text-gray-700">
                  You earned <span className="font-bold text-green-600">+{points} points</span>
                </p>
              )}
              {amount && (
                <p className="text-sm text-gray-600">
                  Transaction: ฿{amount}
                </p>
              )}
              <p className="text-sm text-gray-500">
                Current balance: {user?.points_balance || 0} points
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-gray-700 font-medium mb-4">
                How was your experience today?
              </p>
              <button
                onClick={() => setShowReviewModal(true)}
                className="w-full bg-sarnies-black text-white py-3 rounded-xl font-bold hover:bg-sarnies-charcoal transition-all shadow-sm hover:shadow-md"
              >
                Rate Your Experience
              </button>

              <button
                onClick={() => router.push('/app/dashboard')}
                className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
              >
                Skip and return home
              </button>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Leaving a 5-star review helps us serve you better!
            </p>
          </div>
        </div>
      </div>

      <BottomNav currentTab="home" />

      <ReviewModal
        isOpen={showReviewModal}
        onClose={handleCloseReview}
        userName={user?.name}
      />
    </AppLayout>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    }>
      <ReviewPageContent />
    </Suspense>
  );
}
