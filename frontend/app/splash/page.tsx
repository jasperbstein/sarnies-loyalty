'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashScreen() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Auto-redirect after 2 seconds
    const timer = setTimeout(() => {
      router.push('/login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#1C1917] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(120, 113, 108, 0.3) 0%, transparent 70%)'
        }}
      />

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Logo wordmark */}
        <h1
          className="text-white text-[32px] font-bold tracking-[8px] mb-3"
          style={{ fontFamily: 'Spline Sans, sans-serif' }}
        >
          SARNIES
        </h1>

        {/* Divider line */}
        <div
          className={`w-12 h-[1px] bg-white/30 mb-3 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}
        />

        {/* Tagline */}
        <p
          className={`text-white/60 text-[13px] tracking-[3px] uppercase transition-all duration-700 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
        >
          Loyalty
        </p>
      </div>

      {/* Loading dots */}
      <div className={`absolute bottom-16 flex gap-1.5 transition-all duration-500 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  );
}
