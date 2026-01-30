import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientProviders from './ClientProviders'

// Inter as Circular Std alternative
// Book = 400, Medium = 500
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Sarnies Loyalty',
  description: 'Earn points, get rewards',
  manifest: '/manifest.json',
  appleWebApp: {
    statusBarStyle: 'black-translucent',
    title: 'Sarnies',
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icon-192x192.png',
    shortcut: '/favicon.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Unregister old service workers and clear caches
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
              if ('caches' in window) {
                caches.keys().then(function(names) {
                  for (let name of names) {
                    caches.delete(name);
                  }
                });
              }

              // Auth recovery: detect stuck loading states
              // If user is on a protected route but auth is invalid, clear and redirect
              (function() {
                try {
                  var path = window.location.pathname;
                  var isProtectedRoute = path.startsWith('/app/') || path.startsWith('/staff/') || path.startsWith('/admin/');

                  if (isProtectedRoute) {
                    var authData = localStorage.getItem('auth-storage');
                    var hasValidAuth = false;

                    if (authData) {
                      try {
                        var parsed = JSON.parse(authData);
                        var user = parsed.state && parsed.state.user;
                        var token = parsed.state && parsed.state.token;

                        // Check if auth looks valid
                        if (user && token && (user.type || user.user_type)) {
                          // For staff routes, verify staff/employee type
                          if (path.startsWith('/staff/')) {
                            hasValidAuth = user.type === 'staff' || user.user_type === 'staff' || user.user_type === 'employee';
                          }
                          // For admin routes, verify admin role
                          else if (path.startsWith('/admin/')) {
                            hasValidAuth = user.role === 'admin';
                          }
                          // For app routes, any valid user
                          else {
                            hasValidAuth = true;
                          }
                        }
                      } catch (e) {
                        hasValidAuth = false;
                      }
                    }

                    // If no valid auth, clear everything and redirect after a delay
                    // This gives React a chance to handle it, but if stuck, this kicks in
                    if (!hasValidAuth) {
                      setTimeout(function() {
                        // Check if still on same page (not redirected by React)
                        if (window.location.pathname === path) {
                          localStorage.removeItem('auth-storage');
                          localStorage.removeItem('sarnies_login_mode');
                          document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                          document.cookie = 'user-type=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                          window.location.href = '/login';
                        }
                      }, 2500);
                    }
                  }
                } catch (e) {
                  console.error('Auth recovery error:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
