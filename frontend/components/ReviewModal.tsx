'use client';

import { useState } from 'react';
import { X, Star, Send } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export default function ReviewModal({ isOpen, onClose, userName }: ReviewModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleStarClick = (selectedRating: number) => {
    setRating(selectedRating);

    // High rating (4-5 stars): Redirect to Google Maps review
    if (selectedRating >= 4) {
      // Sarnies Sukhumvit - URL with "Write a review" button highlighted
      const placeURL = 'https://www.google.com/maps/place/Sarnies+Sukhumvit/@13.7417168,100.5614754,17z/data=!4m8!3m7!1s0x30e29ecdb85f25e1:0xb3d71707071c17f4!8m2!3d13.7417168!4d100.5614754!9m1!1b1!16s/g/11fflt1q8l?entry=ttu&g_ep=EgoyMDI1MTExNi4wIKXMDSoASAFQAw%3D%3D#:~:text=%EE%95%A0-,Write,-a%20review';

      // Detect device type
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isAndroid = /Android/i.test(navigator.userAgent);

      if (isIOS) {
        // iOS: Try Google Maps app with proper fallback detection
        const googleMapsApp = `comgooglemaps://?center=13.7417168,100.5614754&q=Sarnies+Sukhumvit`;

        let appOpened = false;
        const timer = setTimeout(() => {
          // If still on page after 1.5s, app likely not installed - open web version
          if (!appOpened) {
            window.open(placeURL, '_blank');
          }
        }, 1500);

        // Detect if app opened successfully
        window.addEventListener('blur', () => {
          appOpened = true;
          clearTimeout(timer);
        }, { once: true });

        // Try to open app
        window.location.href = googleMapsApp;

      } else if (isAndroid) {
        // Android: Use intent URL that auto-falls back to Play Store or web
        const placeName = 'Sarnies+Sukhumvit';
        const lat = '13.7417168';
        const lng = '100.5614754';

        // Try Google Maps app intent first
        const appIntent = `intent://maps.google.com/maps?center=${lat},${lng}&q=${placeName}#Intent;scheme=https;package=com.google.android.apps.maps;end;`;

        let appOpened = false;
        const timer = setTimeout(() => {
          // Fallback to web if app doesn't open
          if (!appOpened) {
            window.open(placeURL, '_blank');
          }
        }, 1500);

        window.addEventListener('blur', () => {
          appOpened = true;
          clearTimeout(timer);
        }, { once: true });

        window.location.href = appIntent;

      } else {
        // Desktop: Open web version with "Write a review" button highlighted
        window.open(placeURL, '_blank');
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const handleSubmitFeedback = () => {
    // Handle low rating feedback submission (API call would go here)
    console.log('Low rating feedback:', { rating, feedback });
    setSubmitted(true);

    setTimeout(() => {
      onClose();
      // Reset state
      setRating(null);
      setFeedback('');
      setSubmitted(false);
    }, 2000);
  };

  const displayRating = hoverRating ?? rating ?? 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-br from-sarnies-black to-sarnies-charcoal text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold mb-2">How was your experience?</h2>
          <p className="text-white/80 text-sm">
            {userName ? `Hey ${userName}! ` : ''}Your feedback helps us improve
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {!submitted ? (
            <>
              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="transition-all transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      size={48}
                      className={`transition-all ${
                        star <= displayRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-none text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Rating Label */}
              <div className="text-center mb-6">
                {rating === null ? (
                  <p className="text-gray-500 text-sm">Tap a star to rate</p>
                ) : rating >= 4 ? (
                  <div>
                    <p className="text-lg font-bold text-green-600 mb-2">
                      {rating === 5 ? 'Amazing!' : 'Great!'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Redirecting you to Google to share your review...
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-bold text-amber-600 mb-2">
                      {rating === 1 ? 'We can do better 😔' : rating === 2 ? 'Not great 😐' : 'It was okay 🤔'}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Help us improve! What went wrong?
                    </p>

                    {/* Feedback Textarea */}
                    <textarea
                      placeholder="Tell us what happened... (optional)"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full h-32 p-4 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-sarnies-black focus:border-transparent text-sm"
                    />

                    {/* Submit Button */}
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={handleSubmitFeedback}
                      className="mt-4"
                    >
                      <Send size={18} />
                      <span>Submit Feedback</span>
                    </Button>

                    {/* Skip Button */}
                    <button
                      onClick={onClose}
                      className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Skip for now
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-sarnies-black mb-2">Thank you!</h3>
              <p className="text-gray-600">Your feedback has been received</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
