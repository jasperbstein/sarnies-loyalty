'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-neutral-200 p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-neutral-600 mb-6">
            We apologize for the inconvenience. Please try again or return to the home page.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="w-full mb-6 p-4 bg-neutral-100 rounded-lg text-left overflow-auto max-h-48">
              <p className="text-xs font-mono text-red-700 mb-2">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs font-mono text-neutral-500">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 w-full">
            <button
              onClick={reset}
              className="flex-1 px-4 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
            <a
              href="/"
              className="flex-1 px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-medium text-sm flex items-center justify-center gap-2"
            >
              <Home size={16} />
              Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
