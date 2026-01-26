'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect after 2.5 seconds
    const timer = setTimeout(() => {
      router.push('/login');
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://cdn05.zipify.com/pmUrUYL-_MnvM-QCJENL0jYktWQ=/489528f1af314521b022292af6af9645/sot-exterior.jpeg)',
        }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        {/* Logo - Using SVG from Sarnies website */}
        <div className="mb-12 animate-fade-in">
          <img
            src="https://freight.cargo.site/w/796/q/94/i/055d5523ddf8c8847f76a2588cda65df3a1ad91cbdb1c05d0c38920eca2c0feb/Sarnies-logo-white-website-big.svg"
            alt="Sarnies"
            className="h-24 w-auto"
          />
        </div>

        {/* Subtitle */}
        <div className="mb-16 animate-fade-in-delay">
          <p
            className="text-white text-xl tracking-[0.3em] uppercase text-center"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400 }}
          >
            Loyalty Rewards
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex gap-2 animate-fade-in-delay-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="absolute bottom-12 left-0 right-0 text-center z-10 animate-fade-in-delay-3">
        <p
          className="text-white/80 text-sm tracking-wider"
          style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300 }}
        >
          Earn rewards with every visit
        </p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.3s both;
        }

        .animate-fade-in-delay-2 {
          animation: fade-in 0.8s ease-out 0.6s both;
        }

        .animate-fade-in-delay-3 {
          animation: fade-in 0.8s ease-out 0.9s both;
        }
      `}</style>
    </div>
  );
}
