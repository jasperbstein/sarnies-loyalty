import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { getErrorMessage, ERROR_MESSAGES, isTechnicalError } from './errorMessages';

// Use relative URL for API calls - this will use the same protocol (HTTPS) and domain as the frontend
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Track if we've shown network error toast recently to avoid spam
let lastNetworkErrorToast = 0;
const NETWORK_ERROR_TOAST_COOLDOWN = 5000; // 5 seconds

/**
 * Check if an error is a network error (no response from server)
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const axiosError = error as AxiosError;

  // Axios sets code to 'ERR_NETWORK' for network errors
  if (axiosError.code === 'ERR_NETWORK') return true;

  // Check for network error message
  if (axiosError.message === 'Network Error') return true;

  // No response typically means network error (but could also be CORS)
  if (axiosError.isAxiosError && !axiosError.response) return true;

  return false;
}

/**
 * Get user-friendly error message from API error
 * Uses the centralized error message utility for consistent messaging
 */
export function getApiErrorMessage(error: unknown, defaultMessage = 'Something went wrong'): string {
  if (isNetworkError(error)) {
    return ERROR_MESSAGES['network_error'] || 'No internet connection. Please check your network and try again.';
  }

  // Use the centralized error message utility
  return getErrorMessage(error, defaultMessage);
}

/**
 * Show network error toast (with cooldown to prevent spam)
 */
function showNetworkErrorToast() {
  const now = Date.now();
  if (now - lastNetworkErrorToast > NETWORK_ERROR_TOAST_COOLDOWN) {
    lastNetworkErrorToast = now;
    toast.error('No internet connection. Please check your network.', {
      duration: 4000,
      id: 'network-error', // Use static ID to prevent duplicates
    });
  }
}

// Add token to requests
api.interceptors.request.use((config) => {
  // Read token from Zustand persisted storage
  if (typeof window !== 'undefined') {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch (e) {
        console.error('Failed to parse auth storage:', e);
      }
    }
  }
  return config;
});

// Handle errors (auth errors, network errors)
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle network errors
    if (isNetworkError(error)) {
      showNetworkErrorToast();
      return Promise.reject(error);
    }

    // Only redirect on 401 if it's an auth-related endpoint failure
    // Don't logout on every 401 - only when token is actually invalid
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isLoginPage = currentPath.includes('/login');
      const isAuthEndpoint = error.config?.url?.includes('/auth/');

      // Only logout and redirect if:
      // 1. We're not already on the login page
      // 2. This is NOT an auth endpoint (OTP/login failures shouldn't clear session)
      // 3. We have a token (meaning we were logged in)
      const authStorage = localStorage.getItem('auth-storage');
      if (!isLoginPage && !isAuthEndpoint && authStorage) {
        localStorage.removeItem('auth-storage');
        // Clear auth cookies to stay in sync with localStorage
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'user-type=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  staffLogin: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  sendOTP: (phone: string) =>
    api.post('/auth/otp/send', { phone }),

  verifyOTP: (phone: string, otp: string) =>
    api.post('/auth/otp/verify', { phone, otp }),

  // Email OTP for employees
  sendEmailOTP: (email: string) =>
    api.post('/auth/otp/email/send', { email }),

  verifyEmailOTP: (email: string, otp: string) =>
    api.post('/auth/otp/email/verify', { email, otp }),

  // Magic link for employees
  sendMagicLink: (email: string) =>
    api.post('/auth/magic-link/send', { email }),

  verifyMagicLink: (token: string) =>
    api.get(`/auth/magic-link/verify/${token}`),

  // Biometric login for employees (device verified, backend validates trusted device)
  biometricLogin: (email: string) =>
    api.post('/auth/biometric-login', { email }),
};

// Users API
export const usersAPI = {
  getAll: (params?: any) =>
    api.get('/users', { params }),

  getOne: (id: number) =>
    api.get(`/users/${id}`),

  update: (id: number, data: any) =>
    api.put(`/users/${id}`, data),

  adjustPoints: (id: number, points: number, reason: string) =>
    api.post(`/users/${id}/points`, { points, reason }),

  getStaticQR: (id: number) =>
    api.get(`/users/${id}/static-qr`),

  getVoucherInstances: (id: number, status?: 'active' | 'used' | 'expired') =>
    api.get(`/users/${id}/voucher-instances`, { params: status ? { status } : undefined }),
};

// Vouchers API
export const vouchersAPI = {
  getAll: () =>
    api.get('/vouchers'),

  getAllAdmin: () =>
    api.get('/vouchers/all'),

  getOne: (id: number) =>
    api.get(`/vouchers/${id}`),

  create: (data: any) =>
    api.post('/vouchers', data),

  update: (id: number, data: any) =>
    api.patch(`/vouchers/${id}`, data),

  delete: (id: number) =>
    api.delete(`/vouchers/${id}`),

  redeem: (id: number, user_id: number) =>
    api.post(`/vouchers/${id}/redeem`, { user_id }),

  getInstances: (user_id: number, status?: string) =>
    api.get(`/vouchers/instances/${user_id}`, { params: { status } }),
};

// Transactions API
export const transactionsAPI = {
  earnPoints: (user_id: number, amount: number, outlet?: string) =>
    api.post('/transactions/earn', { user_id, amount, outlet }),

  redeemVoucher: (user_id: number, voucher_id: number, outlet?: string) =>
    api.post('/transactions/redeem', { user_id, voucher_id, outlet }),

  getAll: (params?: any) =>
    api.get('/transactions', { params }),
};

// QR API
export const qrAPI = {
  generateUserQR: (user_id: number) =>
    api.get(`/qr/user/${user_id}`),

  generateVoucherQR: (user_id: number, voucher_id: number) =>
    api.get(`/qr/voucher/${user_id}/${voucher_id}`),

  verifyQR: (token: string) =>
    api.post('/qr/verify', { token }),
};

// Announcements API
export const announcementsAPI = {
  getAll: (user_type?: string) =>
    api.get('/announcements', { params: { user_type } }),

  getAllAdmin: () =>
    api.get('/announcements/all'),

  getById: (id: number) =>
    api.get(`/announcements/${id}`),

  create: (data: any) =>
    api.post('/announcements', data),

  update: (id: number, data: any) =>
    api.patch(`/announcements/${id}`, data),

  delete: (id: number) =>
    api.delete(`/announcements/${id}`),
};

// Outlets API
export const outletsAPI = {
  getAll: () =>
    api.get('/outlets'),

  getNearby: (latitude: number, longitude: number, radius?: number) =>
    api.get('/outlets/nearby', {
      params: { latitude, longitude, radius: radius || 5000 }
    }),

  getOne: (id: number) =>
    api.get(`/outlets/${id}`),

  updateUserLocation: (userId: number, data: {
    latitude?: number;
    longitude?: number;
    location_enabled?: boolean;
    notification_enabled?: boolean;
  }) =>
    api.put(`/outlets/${userId}/location`, data),
};

// Investor Credits API
export const investorAPI = {
  // User endpoints
  getCredits: () =>
    api.get('/investors/credits'),

  getOutletCredits: (outletId: number) =>
    api.get(`/investors/credits/outlet/${outletId}`),

  getTransactions: (params?: { limit?: number; offset?: number }) =>
    api.get('/investors/transactions', { params }),

  // Admin endpoints
  allocateOutletCredits: (userId: number, data: {
    outletId: number;
    annualAllocation: number;
    creditsBalance?: number;
    autoRenew?: boolean;
    expiresAt?: string;
  }) =>
    api.post(`/investors/admin/${userId}/outlet-credits`, data),

  allocateGroupCredits: (userId: number, data: {
    enabled: boolean;
    annualAllocation: number;
    creditsBalance?: number;
    expiresAt?: string;
  }) =>
    api.post(`/investors/admin/${userId}/group-credits`, data),

  adjustCredits: (userId: number, data: {
    creditType: 'investor_outlet' | 'investor_group';
    outletId?: number;
    amount: number;
    notes?: string;
  }) =>
    api.patch(`/investors/admin/${userId}/credits/adjust`, data),

  getExpiringCredits: (days?: number) =>
    api.get('/investors/admin/credits/expiring', {
      params: days ? { days } : undefined
    }),
};

// Media Budget API
export const mediaAPI = {
  // User endpoints
  getBudget: () =>
    api.get('/media/budget'),

  getTransactions: (params?: { limit?: number; offset?: number }) =>
    api.get('/media/transactions', { params }),

  // Admin endpoints
  setBudget: (userId: number, data: {
    annualBudgetThb: number;
    spentThb?: number;
    expiresAt?: string;
  }) =>
    api.post(`/media/admin/${userId}/budget`, data),

  adjustBudget: (userId: number, data: {
    amountThb: number;
    notes?: string;
  }) =>
    api.patch(`/media/admin/${userId}/budget/adjust`, data),

  getExpiringBudgets: (days?: number) =>
    api.get('/media/admin/budgets/expiring', {
      params: days ? { days } : undefined
    }),

  getUsageReport: () =>
    api.get('/media/admin/usage-report'),
};

// Settings API
export const settingsAPI = {
  getAll: () =>
    api.get('/settings'),

  getOne: (key: string) =>
    api.get(`/settings/${key}`),

  update: (key: string, value: any) =>
    api.put(`/settings/${key}`, { value }),

  bulkUpdate: (settings: { [key: string]: any }) =>
    api.put('/settings', { settings }),

  create: (data: { key: string; value: any; type: string; description?: string; editable?: boolean }) =>
    api.post('/settings', data),

  // Public endpoint for tier thresholds
  getTiers: () =>
    api.get('/settings/tiers'),

  // Admin endpoint for system config
  getAdminConfig: () =>
    api.get('/settings/admin'),
};

// Notifications API
export const notificationsAPI = {
  getVapidKey: () =>
    api.get('/notifications/vapid-public-key'),

  subscribe: (subscription: PushSubscription) =>
    api.post('/notifications/subscribe', { subscription: subscription.toJSON() }),

  unsubscribe: (endpoint?: string) =>
    api.post('/notifications/unsubscribe', { endpoint }),

  getStatus: () =>
    api.get('/notifications/status'),

  getPreferences: () =>
    api.get('/notifications/preferences'),

  updatePreferences: (preferences: Record<string, boolean>) =>
    api.patch('/notifications/preferences', { preferences }),

  sendTest: () =>
    api.post('/notifications/test'),

  getHistory: (params?: { limit?: number; offset?: number }) =>
    api.get('/notifications/history', { params }),

  // Admin endpoints
  adminSend: (data: { user_ids: number[]; title: string; body: string; category?: string; data?: any }) =>
    api.post('/notifications/admin/send', data),

  adminBroadcast: (data: { title: string; body: string; category?: string; data?: any }) =>
    api.post('/notifications/admin/broadcast', data),

  adminStats: () =>
    api.get('/notifications/admin/stats'),

  adminProcessQueue: () =>
    api.post('/notifications/admin/process-queue'),
};

// Referrals API
export const referralsAPI = {
  getMyCode: () =>
    api.get('/referrals/my-code'),

  getMyReferrals: () =>
    api.get('/referrals/my-referrals'),

  validateCode: (code: string) =>
    api.get(`/referrals/validate/${code}`),

  applyCode: (data: { referee_user_id: number; referral_code: string }) =>
    api.post('/referrals/apply', data),

  getAdminStats: () =>
    api.get('/referrals/admin/stats'),
};

// POS API Keys API (Admin)
export const posKeysAPI = {
  getAll: () =>
    api.get('/pos/keys'),

  create: (data: { name: string; outlet_id?: number }) =>
    api.post('/pos/keys', data),

  revoke: (keyId: number) =>
    api.delete(`/pos/keys/${keyId}`),

  getLogs: (keyId: number, params?: { limit?: number; offset?: number }) =>
    api.get(`/pos/keys/${keyId}/logs`, { params }),

  getStats: () =>
    api.get('/pos/keys/stats'),
};
