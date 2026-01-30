'use client';

import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean; // Track if user was recently offline (for showing "back online" message)
}

/**
 * Hook to detect network connectivity status.
 * Uses navigator.onLine and online/offline events.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Check initial state (only in browser)
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      // Mark that we're back online (for potential "reconnected" message)
      if (!isOnline) {
        setWasOffline(true);
        // Reset wasOffline after 5 seconds
        setTimeout(() => setWasOffline(false), 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  return { isOnline, wasOffline };
}

/**
 * Check if an error is a network error (vs server error).
 * Useful for showing appropriate error messages.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  // Check for axios network errors
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // Axios sets code to 'ERR_NETWORK' for network errors
    if (err.code === 'ERR_NETWORK') return true;

    // No response typically means network error
    if (err.message === 'Network Error') return true;

    // Check for fetch abort/network errors
    if (err.name === 'TypeError' && String(err.message).includes('fetch')) return true;

    // Check if there's no response (network failure)
    if ('isAxiosError' in err && err.isAxiosError && !err.response) return true;
  }

  return false;
}

/**
 * Get a user-friendly error message based on error type.
 */
export function getErrorMessage(error: unknown, defaultMessage = 'Something went wrong'): string {
  if (isNetworkError(error)) {
    return 'No internet connection. Please check your network and try again.';
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // Handle axios error responses
    if (err.response && typeof err.response === 'object') {
      const response = err.response as Record<string, unknown>;
      const status = response.status as number;
      const data = response.data as Record<string, unknown> | undefined;

      // Check for server error message
      if (data?.message && typeof data.message === 'string') {
        return data.message;
      }

      // Return generic messages based on status code
      if (status === 401) return 'Please log in to continue.';
      if (status === 403) return 'You do not have permission to perform this action.';
      if (status === 404) return 'The requested resource was not found.';
      if (status === 429) return 'Too many requests. Please wait a moment and try again.';
      if (status >= 500) return 'Server error. Please try again later.';
    }

    // Check for error message property
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }
  }

  return defaultMessage;
}

/**
 * Simple utility to check if browser is online.
 * Can be called anywhere without a hook.
 */
export function checkOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}
