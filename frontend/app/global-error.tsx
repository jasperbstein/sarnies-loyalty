'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '28rem',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e5e5',
            padding: '2rem'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <AlertTriangle size={32} color="#dc2626" />
              </div>

              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#171717',
                marginBottom: '0.5rem'
              }}>
                Critical Error
              </h1>
              <p style={{
                color: '#525252',
                marginBottom: '1.5rem'
              }}>
                A critical error occurred. Please reload the page.
              </p>

              <button
                onClick={reset}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem',
                  backgroundColor: '#171717',
                  color: 'white',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <RefreshCw size={16} />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
