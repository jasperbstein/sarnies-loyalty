'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuthStore } from '@/lib/store';
import { MapPin, Navigation, Phone, Clock } from 'lucide-react';
import axios from 'axios';
import { getBaseUrl } from '@/lib/config';
import toast from 'react-hot-toast';

interface Outlet {
  id: number;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  distance?: number;
  is_active: boolean;
}

export default function OutletsPage() {
  const { user, token } = useAuthStore();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number; lon: number} | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);

  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${getBaseUrl()}/api/outlets`);
      setOutlets(response.data);
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
      toast.error('Failed to load outlets');
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = () => {
    setLocationLoading(true);

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        setLocationEnabled(true);

        // Save location to backend
        if (user && token) {
          try {
            await axios.put(
              `${getBaseUrl()}/api/outlets/${user.id}/location`,
              {
                latitude,
                longitude,
                location_enabled: true
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (error) {
            console.error('Failed to save location:', error);
          }
        }

        // Fetch nearby outlets
        try {
          const response = await axios.get(
            `${getBaseUrl()}/api/outlets/nearby?latitude=${latitude}&longitude=${longitude}&radius=50000`
          );
          setOutlets(response.data);
          toast.success('Location updated!');
        } catch (error) {
          console.error('Failed to fetch nearby outlets:', error);
        }

        setLocationLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Unable to get your location');
        setLocationLoading(false);
      }
    );
  };

  const openInMaps = (outlet: Outlet) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${outlet.latitude},${outlet.longitude}`;
    window.open(url, '_blank');
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return null;
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-20">
        <header>
          <h1 className="text-[28px] font-bold text-gray-900">Sarnies Outlets</h1>
          <p className="text-gray-600 mt-2">Find a location near you</p>
        </header>

        {/* Location Permission Card */}
        {!locationEnabled && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <MapPin className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Find nearest outlets
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enable location to see outlets sorted by distance and get directions
                </p>
                <button
                  onClick={requestLocation}
                  disabled={locationLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {locationLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" />
                      Enable Location
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 rounded-2xl h-32 animate-pulse" />
            ))}
          </div>
        )}

        {/* Outlets List */}
        {!loading && (
          <div className="space-y-4">
            {outlets.map((outlet) => (
              <div
                key={outlet.id}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{outlet.name}</h3>
                    {outlet.distance && (
                      <div className="flex items-center gap-1 text-amber-600 font-semibold mt-1">
                        <Navigation className="w-4 h-4" />
                        {formatDistance(outlet.distance)} away
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>{outlet.address}</p>
                  </div>

                  <button
                    onClick={() => openInMaps(outlet)}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    Get Directions
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && outlets.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No outlets found</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
