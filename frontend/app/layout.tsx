import type { Metadata, Viewport } from 'next'
import { Spline_Sans, Instrument_Sans } from 'next/font/google'
import './globals.css'
import ClientProviders from './ClientProviders'

const splineSans = Spline_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-title',
  display: 'swap',
})

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-sans',
  display: 'swap',
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
  themeColor: '#131313',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${splineSans.variable} ${instrumentSans.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Force service worker update on new deploy
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistration().then(function(reg) {
                  if (reg) {
                    reg.update();
                    if (reg.waiting) {
                      reg.waiting.postMessage({type: 'SKIP_WAITING'});
                    }
                    reg.addEventListener('updatefound', function() {
                      var newWorker = reg.installing;
                      if (newWorker) {
                        newWorker.addEventListener('statechange', function() {
                          if (newWorker.state === 'activated' && !sessionStorage.getItem('sw-refreshed')) {
                            sessionStorage.setItem('sw-refreshed', '1');
                            window.location.reload();
                          }
                        });
                      }
                    });
                    // If there's already a waiting worker, activate it
                    var waiting = reg.waiting;
                    if (waiting) {
                      waiting.postMessage({type: 'SKIP_WAITING'});
                      if (!sessionStorage.getItem('sw-refreshed')) {
                        sessionStorage.setItem('sw-refreshed', '1');
                        window.location.reload();
                      }
                    }
                  }
                });
                navigator.serviceWorker.addEventListener('controllerchange', function() {
                  if (!sessionStorage.getItem('sw-refreshed')) {
                    sessionStorage.setItem('sw-refreshed', '1');
                    window.location.reload();
                  }
                });
              }

              // Auth recovery: detect stuck loading states
              // If user is on a protected route but auth is invalid, clear and redirect
              (function() {
                try {
                  var path = window.location.pathname;
                  var staffPublicPaths = ['/staff/login', '/staff/register', '/staff/forgot-password', '/staff/reset-password'];
                  var isStaffPublicPath = staffPublicPaths.some(function(p) { return path.startsWith(p); });
                  var isProtectedRoute = path.startsWith('/app/') || (path.startsWith('/staff/') && !isStaffPublicPath) || path.startsWith('/admin/');

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
      <body className="font-sans">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
