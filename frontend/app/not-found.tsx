import { FileQuestion, Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-neutral-200 p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <FileQuestion size={32} className="text-amber-600" />
          </div>

          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Page Not Found
          </h1>
          <p className="text-neutral-600 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <Link
            href="/"
            className="w-full px-4 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
