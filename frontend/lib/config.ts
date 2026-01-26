/**
 * Centralized configuration for API and WebSocket URLs
 * This ensures consistent URL handling across the application
 */

/**
 * Get the base API URL (without /api suffix)
 */
export function getBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (apiUrl) {
    // If it's a relative URL like /api, return empty string (use relative paths)
    if (apiUrl.startsWith('/')) {
      return '';
    }
    // Remove /api suffix if present
    return apiUrl.replace(/\/api\/?$/, '');
  }

  // Fallback for development
  if (typeof window !== 'undefined') {
    // Use current window location protocol (http or https)
    const port = window.location.port === '3001' ? '3000' : '3000';
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }

  return 'http://localhost:3000';
}

/**
 * Get the API URL (with /api suffix)
 */
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || '/api';
}

/**
 * Get the WebSocket URL
 */
export function getWebSocketUrl(): string {
  // Use explicit WS URL if configured
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  // Otherwise derive from API URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (apiUrl && apiUrl.startsWith('http')) {
    return apiUrl.replace(/\/api.*$/, '');
  }

  // Fallback to current window location
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }

  return 'http://localhost:3000';
}
