'use client';

import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AlertProvider } from '@/components/ui/AlertStack';
import { OfflineBanner } from '@/components/OfflineBanner';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AlertProvider position="top-right" maxAlerts={3}>
      <ErrorBoundary>
        <OfflineBanner />
        {children}
      </ErrorBoundary>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
          },
          error: {
            duration: 5000,
          },
        }}
      />
    </AlertProvider>
  );
}
