'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AppLayout from '@/components/AppLayout';
import { useAuthStore } from '@/lib/store';
import { collabsAPI, CollabOffer } from '@/lib/api';
import { Building2, Gift, Percent, DollarSign, ChevronRight, Users2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useSwipeBack } from '@/hooks/useSwipeBack';

function getDiscountIcon(type: string) {
  switch (type) {
    case 'percentage':
      return <Percent className="w-4 h-4" />;
    case 'fixed':
      return <DollarSign className="w-4 h-4" />;
    case 'free_item':
      return <Gift className="w-4 h-4" />;
    default:
      return <Gift className="w-4 h-4" />;
  }
}

function formatDiscountValue(type: string, value: number) {
  switch (type) {
    case 'percentage':
      return `${value}% off`;
    case 'fixed':
      return `$${value} off`;
    case 'free_item':
      return 'Free item';
    default:
      return `${value}`;
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function CollabsPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [offers, setOffers] = useState<CollabOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useSwipeBack();

  useEffect(() => {
    if (hasHydrated && user) {
      fetchOffers();
    }
  }, [hasHydrated, user]);

  const fetchOffers = async () => {
    try {
      const response = await collabsAPI.getAvailableOffers();
      setOffers(response.data.offers || []);
    } catch (error) {
      console.error('Failed to load partner offers:', error);
      toast.error('Failed to load partner offers');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchOffers();
  };

  if (!hasHydrated || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-bg-primary">
          <div className="max-w-2xl lg:max-w-4xl mx-auto">
            {/* Header skeleton */}
            <div className="bg-surface border-b border-border px-5 py-4">
              <div className="h-8 bg-stone-200 rounded-lg w-48 animate-pulse" />
              <div className="h-4 bg-stone-100 rounded w-64 mt-2 animate-pulse" />
            </div>

            {/* Cards skeleton */}
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-stone-200 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-stone-200 rounded w-3/4" />
                      <div className="h-4 bg-stone-100 rounded w-1/2" />
                      <div className="h-6 bg-purple-100 rounded-full w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-bg-primary pb-24">
          <div className="max-w-2xl lg:max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 px-5 py-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Users2 className="w-5 h-5" />
                </div>
                <h1 className="text-[22px] font-bold">Partner Offers</h1>
              </div>
              <p className="text-purple-100 text-[14px]">
                Exclusive deals from our partner brands, just for you
              </p>
            </div>

            {/* Offers List */}
            <div className="p-4 space-y-4">
              {offers.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-[17px] font-semibold text-stone-900 mb-2">
                    No Partner Offers Yet
                  </h3>
                  <p className="text-[14px] text-stone-500 max-w-xs mx-auto">
                    Check back soon! We're working on bringing you exclusive deals from amazing partner brands.
                  </p>
                </div>
              ) : (
                offers.map((offer) => (
                  <button
                    key={offer.id}
                    onClick={() => router.push(`/app/collabs/${offer.id}`)}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm border border-stone-100 hover:shadow-md hover:border-purple-200 transition-all text-left group"
                  >
                    <div className="flex gap-4">
                      {/* Image/Logo */}
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex-shrink-0 overflow-hidden relative">
                        {offer.image_url ? (
                          <Image
                            src={offer.image_url}
                            alt={offer.title}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : offer.offering_company_logo ? (
                          <Image
                            src={offer.offering_company_logo}
                            alt={offer.offering_company_name || 'Partner'}
                            fill
                            className="object-contain p-2"
                            sizes="80px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-purple-300" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-purple-600 uppercase tracking-wide mb-0.5">
                              {offer.offering_company_name}
                            </p>
                            <h3 className="text-[15px] font-semibold text-stone-900 leading-snug line-clamp-2">
                              {offer.title}
                            </h3>
                          </div>
                          <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-purple-400 transition-colors flex-shrink-0 mt-1" />
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          {/* Discount badge */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-[12px] font-semibold">
                            {getDiscountIcon(offer.discount_type)}
                            {formatDiscountValue(offer.discount_type, offer.discount_value)}
                          </span>

                          {/* Validity */}
                          <span className="text-[12px] text-stone-400">
                            Until {formatDate(offer.valid_until)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>
    </AppLayout>
  );
}
