import { useState, useCallback, useEffect } from 'react';
import { pinAuthAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getErrorMessage } from '@/lib/errorMessages';

interface PINStatus {
  pin_enabled: boolean;
  has_pin: boolean;
}

interface UsePINAuthReturn {
  // State
  isLoading: boolean;
  error: string | null;
  pinStatus: PINStatus | null;

  // Actions
  checkPINAvailable: (email: string) => Promise<boolean>;
  setupPIN: (pin: string) => Promise<boolean>;
  verifyPIN: (email: string, pin: string, rememberMe?: string) => Promise<{ success: boolean; attemptsRemaining?: number }>;
  changePIN: (currentPin: string, newPin: string) => Promise<boolean>;
  disablePIN: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
  clearError: () => void;
}

export function usePINAuth(): UsePINAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinStatus, setPinStatus] = useState<PINStatus | null>(null);
  const { token, setAuth } = useAuthStore();

  // Fetch PIN status when authenticated
  const refreshStatus = useCallback(async () => {
    if (!token) {
      setPinStatus(null);
      return;
    }

    try {
      const response = await pinAuthAPI.getStatus();
      setPinStatus(response.data);
    } catch (err) {
      // Don't show error for status check - just reset
      setPinStatus(null);
    }
  }, [token]);

  // Auto-refresh on mount and token change
  useEffect(() => {
    if (token) {
      refreshStatus();
    }
  }, [token, refreshStatus]);

  // Check if PIN is available for email (for login page)
  const checkPINAvailable = useCallback(async (email: string): Promise<boolean> => {
    try {
      const response = await pinAuthAPI.checkByEmail(email);
      return response.data.pin_available;
    } catch {
      return false;
    }
  }, []);

  // Set up a new PIN
  const setupPIN = useCallback(async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await pinAuthAPI.setup(pin);
      setPinStatus({ pin_enabled: response.data.pin_enabled, has_pin: true });
      return true;
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to set up PIN. Please try again.');
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify PIN and login
  const verifyPIN = useCallback(async (
    email: string,
    pin: string,
    rememberMe?: string
  ): Promise<{ success: boolean; attemptsRemaining?: number }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await pinAuthAPI.verify(email, pin, rememberMe);
      const { token: authToken, user } = response.data;

      // Set auth state
      setAuth({ ...user, type: user.user_type || 'customer' }, authToken);

      return { success: true };
    } catch (err: any) {
      const errorData = err?.response?.data;

      // Extract attempts remaining if available
      if (errorData?.attempts_remaining !== undefined) {
        setError(errorData.message || 'Incorrect PIN.');
        return { success: false, attemptsRemaining: errorData.attempts_remaining };
      }

      // Handle lockout
      if (errorData?.error === 'account_locked') {
        setError(errorData.message || 'Account locked. Please use magic link.');
        return { success: false, attemptsRemaining: 0 };
      }

      const message = getErrorMessage(err, 'Failed to verify PIN.');
      setError(message);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [setAuth]);

  // Change PIN
  const changePIN = useCallback(async (currentPin: string, newPin: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await pinAuthAPI.change(currentPin, newPin);
      return true;
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to change PIN.');
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disable PIN
  const disablePIN = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await pinAuthAPI.disable();
      setPinStatus({ pin_enabled: false, has_pin: pinStatus?.has_pin || false });
      return true;
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to disable PIN.');
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [pinStatus?.has_pin]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    pinStatus,
    checkPINAvailable,
    setupPIN,
    verifyPIN,
    changePIN,
    disablePIN,
    refreshStatus,
    clearError,
  };
}
