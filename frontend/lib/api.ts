import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { getErrorMessage, ERROR_MESSAGES, isTechnicalError } from './errorMessages';
import type {
  User,
  UserParams,
  UserUpdateData,
  Voucher,
  VoucherCreateData,
  VoucherUpdateData,
  TransactionParams,
  AnnouncementCreateData,
  AnnouncementUpdateData,
  UserLocationUpdate,
  SettingCreateData,
  NotificationData,
  BroadcastData,
  NotificationPreferences,
  ReferralApplyData,
  POSKeyCreateData,
} from './types';

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
        // Silently handle parse error
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

// Auth Identify Response Type
export interface IdentifyResponse {
  identifier_type: 'phone' | 'email';
  user_type: 'customer' | 'employee' | 'partner' | 'staff' | 'admin' | 'new_staff' | 'unknown';
  auth_method: 'otp' | 'magic_link' | 'password' | null;
  existing_user: boolean;
  registration_completed?: boolean;
  is_verified?: boolean;
  is_active?: boolean;
  company?: {
    id: number;
    name: string;
    logo_url?: string;
    discount_percentage?: number;
    default_branch?: string;
  };
  next_step: 'send_otp' | 'send_magic_link' | 'enter_password' | 'staff_register' | 'use_phone' | 'verify_email';
  message?: string;
}

// LINE Login Response Type
export interface LineAuthUrlResponse {
  auth_url: string;
  state: string;
}

export interface LineCallbackResponse {
  token: string;
  user: {
    id: number;
    name: string;
    surname?: string;
    phone: string;
    email?: string;
    points_balance: number;
    user_type: string;
    registration_completed: boolean;
    line_display_name?: string;
    line_picture_url?: string;
    type: string;
  };
  needs_registration: boolean;
  account_linked?: boolean;
  referral_code?: string;
  company_invite_code?: string;
  remember_me: string;
}

// Auth API
export const authAPI = {
  // Unified identifier detection
  identify: (identifier: string) =>
    api.post<IdentifyResponse>('/auth/identify', { identifier }),

  staffLogin: (email: string, password: string, remember_me?: string) =>
    api.post('/auth/login', { email, password, remember_me }),

  sendOTP: (phone: string) =>
    api.post('/auth/otp/send', { phone }),

  verifyOTP: (phone: string, otp: string, remember_me?: string) =>
    api.post('/auth/otp/verify', { phone, otp, remember_me }),

  // Email OTP for customers (alternative to SMS)
  sendEmailOTP: (email: string) =>
    api.post('/auth/otp/email/send', { email }),

  verifyEmailOTP: (email: string, otp: string, remember_me?: string) =>
    api.post('/auth/otp/email/verify', { email, otp, remember_me }),

  // Magic link for employees
  sendMagicLink: (email: string) =>
    api.post('/auth/magic-link/send', { email }),

  verifyMagicLink: (token: string, remember_me?: string) =>
    api.get(`/auth/magic-link/verify/${token}${remember_me ? `?remember_me=${remember_me}` : ''}`),

  // Biometric login for employees (device verified, backend validates trusted device)
  biometricLogin: (email: string) =>
    api.post('/auth/biometric-login', { email }),

  // Staff registration
  staffCheckEmail: (email: string) =>
    api.post('/auth/staff/check-email', { email }),

  staffRegister: (data: { email: string; password: string; name: string; branch?: string }) =>
    api.post('/auth/staff/register', data),

  staffResendVerification: (email: string) =>
    api.post('/auth/staff/resend-verification', { email }),

  // Customer registration
  register: (data: {
    phone?: string;
    user_id?: number;
    name: string;
    surname?: string;
    email?: string;
    birthday?: string;
    gender?: string;
    company?: string;
    email_consent?: boolean;
    sms_consent?: boolean;
    preferred_outlet?: string;
    company_id?: number; // From company invite code
  }) =>
    api.post('/auth/register', data),

  // LINE Login
  getLineAuthUrl: (remember_me?: string, ref?: string, company?: string) =>
    api.get<LineAuthUrlResponse>('/line/auth-url', { params: { remember_me, ref, company } }),

  lineCallback: (code: string, state?: string) =>
    api.post<LineCallbackResponse>('/line/callback', { code, state }),

  linkLine: (code: string, user_id: number) =>
    api.post('/line/link', { code, user_id }),

  unlinkLine: (user_id: number) =>
    api.post('/line/unlink', { user_id }),
};

// Users API
export const usersAPI = {
  getAll: (params?: UserParams) =>
    api.get('/users', { params }),

  getOne: (id: number) =>
    api.get(`/users/${id}`),

  update: (id: number, data: UserUpdateData) =>
    api.put(`/users/${id}`, data),

  adjustPoints: (id: number, points: number, reason: string) =>
    api.post(`/users/${id}/points`, { points, reason }),

  getStaticQR: (id: number) =>
    api.get(`/users/${id}/static-qr`),

  getVoucherInstances: (id: number, status?: 'active' | 'used' | 'expired') =>
    api.get(`/users/${id}/voucher-instances`, { params: status ? { status } : undefined }),

  updateCompany: (userId: number, companyId: number | null) =>
    api.patch(`/users/${userId}/company`, { company_id: companyId }),

  sendInvite: (userId: number) =>
    api.post(`/users/${userId}/send-invite`),

  create: (data: { name: string; surname?: string; email: string; user_type?: string }) =>
    api.post('/users', data),
};

// Vouchers API
export const vouchersAPI = {
  getAll: () =>
    api.get('/vouchers'),

  getAllAdmin: () =>
    api.get('/vouchers/all'),

  getOne: (id: number) =>
    api.get(`/vouchers/${id}`),

  create: (data: VoucherCreateData) =>
    api.post('/vouchers', data),

  update: (id: number, data: VoucherUpdateData) =>
    api.patch(`/vouchers/${id}`, data),

  delete: (id: number) =>
    api.delete(`/vouchers/${id}`),

  redeem: (id: number, user_id: number) =>
    api.post(`/vouchers/${id}/redeem`, { user_id }),

  getInstances: (user_id: number, status?: string) =>
    api.get(`/vouchers/instances/${user_id}`, { params: { status } }),

  // Employee vouchers with today's availability
  getEmployeeVouchers: (userId: number) =>
    api.get(`/vouchers/employee/${userId}/available`),
};

// Transactions API
export const transactionsAPI = {
  earnPoints: (user_id: number, amount: number, outlet?: string) =>
    api.post('/transactions/earn', { user_id, amount, outlet }),

  redeemVoucher: (user_id: number, voucher_id: number, outlet?: string) =>
    api.post('/transactions/redeem', { user_id, voucher_id, outlet }),

  getAll: (params?: TransactionParams) =>
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

  create: (data: AnnouncementCreateData) =>
    api.post('/announcements', data),

  update: (id: number, data: AnnouncementUpdateData) =>
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

  updateUserLocation: (userId: number, data: UserLocationUpdate) =>
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

  update: (key: string, value: string | number | boolean | Record<string, unknown>) =>
    api.put(`/settings/${key}`, { value }),

  bulkUpdate: (settings: Record<string, string | number | boolean | Record<string, unknown>>) =>
    api.put('/settings', { settings }),

  create: (data: SettingCreateData) =>
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

  updatePreferences: (preferences: NotificationPreferences) =>
    api.patch('/notifications/preferences', { preferences }),

  sendTest: () =>
    api.post('/notifications/test'),

  getHistory: (params?: { limit?: number; offset?: number }) =>
    api.get('/notifications/history', { params }),

  // Admin endpoints
  adminSend: (data: NotificationData) =>
    api.post('/notifications/admin/send', data),

  adminBroadcast: (data: BroadcastData) =>
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

  applyCode: (data: ReferralApplyData) =>
    api.post('/referrals/apply', data),

  getAdminStats: () =>
    api.get('/referrals/admin/stats'),
};

// POS API Keys API (Admin)
export const posKeysAPI = {
  getAll: () =>
    api.get('/pos/keys'),

  create: (data: POSKeyCreateData) =>
    api.post('/pos/keys', data),

  revoke: (keyId: number) =>
    api.delete(`/pos/keys/${keyId}`),

  getLogs: (keyId: number, params?: { limit?: number; offset?: number }) =>
    api.get(`/pos/keys/${keyId}/logs`, { params }),

  getStats: () =>
    api.get('/pos/keys/stats'),
};

// Companies API (public endpoints for invite codes)
export const companiesAPI = {
  // Look up company by invite code (public)
  getByInviteCode: (code: string) =>
    api.get(`/companies/invite/${code}`),

  // Look up any invite code (personal or company) for join flow
  lookupJoinCode: (code: string) =>
    api.get(`/companies/join/${code}`),

  // Verify access code for company join
  verifyAccessCode: (code: string, accessCode: string) =>
    api.post(`/companies/join/${code}/verify-access-code`, { access_code: accessCode }),

  // Verify if email is eligible for company program
  verifyEmail: (email: string) =>
    api.post('/companies/verify-email', { email }),

  // Get all companies (admin)
  getAll: () =>
    api.get('/companies'),
};

// Auth Methods API (for linking multiple auth methods)
export const authMethodsAPI = {
  list: () =>
    api.get('/users/me/auth-methods'),

  addPhone: (phone: string) =>
    api.post('/users/me/phone', { phone }),

  verifyPhone: (phone: string, otp: string) =>
    api.post('/users/me/phone/verify', { phone, otp }),

  addEmail: (email: string) =>
    api.post('/users/me/email', { email }),

  verifyEmail: (email: string, otp: string) =>
    api.post('/users/me/email/verify', { email, otp }),

  remove: (type: 'phone' | 'email' | 'line') =>
    api.delete(`/users/me/auth-methods/${type}`),

  setPrimary: (type: 'phone' | 'email' | 'line') =>
    api.put(`/users/me/auth-methods/${type}/primary`),
};

// PIN Auth API
export const pinAuthAPI = {
  // Check if user has PIN set up (for login page - no auth required)
  checkByEmail: (email: string) =>
    api.post<{ pin_available: boolean }>('/auth/pin/check', { email }),

  // Get PIN status for current user (requires auth)
  getStatus: () =>
    api.get<{ pin_enabled: boolean; has_pin: boolean }>('/auth/pin/status'),

  // Set up a new PIN (requires auth)
  setup: (pin: string) =>
    api.post<{ message: string; pin_enabled: boolean }>('/auth/pin/setup', { pin }),

  // Login with PIN (no auth required)
  verify: (email: string, pin: string, remember_me?: string) =>
    api.post('/auth/pin/verify', { email, pin, remember_me }),

  // Change PIN (requires auth + current PIN)
  change: (current_pin: string, new_pin: string) =>
    api.post<{ message: string }>('/auth/pin/change', { current_pin, new_pin }),

  // Disable PIN (requires auth)
  disable: () =>
    api.post<{ message: string; pin_enabled: boolean }>('/auth/pin/disable'),
};

// Collab Offers Types
export interface CollabPartner {
  partnership_id: number;
  partner_id: number;
  partner_name: string;
  partner_logo?: string;
  is_active: boolean;
  created_at: string;
}

export interface CollabOffer {
  id: number;
  offering_company_id: number;
  target_company_id: number;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed' | 'free_item';
  discount_value: number;
  image_url?: string;
  terms?: string;
  valid_from: string;
  valid_until: string;
  max_redemptions?: number;
  max_per_user?: number;
  redemptions_count: number;
  status: 'pending' | 'active' | 'rejected' | 'paused' | 'expired';
  rejection_reason?: string;
  approved_at?: string;
  created_at: string;
  // Joined fields
  offering_company_name?: string;
  offering_company_logo?: string;
  target_company_name?: string;
  target_company_logo?: string;
  user_redemption_count?: number;
}

export interface CollabOfferCreateData {
  target_company_id: number;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed' | 'free_item';
  discount_value: number;
  image_url?: string;
  terms?: string;
  valid_from: string;
  valid_until: string;
  max_redemptions?: number;
  max_per_user?: number;
}

export interface CollabRedemption {
  id: number;
  collab_offer_id: number;
  user_id: number;
  redeemed_at: string;
  redeemed_at_outlet?: string;
  staff_id?: number;
  customer_name?: string;
  customer_email?: string;
  staff_name?: string;
}

// Collabs API
export const collabsAPI = {
  // Partnership management (Admin)
  getPartners: () =>
    api.get<{ partners: CollabPartner[] }>('/collabs/partners'),

  getAvailablePartners: () =>
    api.get<{ companies: { id: number; name: string; logo_url?: string }[] }>('/collabs/partners/available'),

  addPartner: (partner_company_id: number) =>
    api.post('/collabs/partners', { partner_company_id }),

  removePartner: (partnershipId: number) =>
    api.delete(`/collabs/partners/${partnershipId}`),

  // Offer management (Admin - outgoing)
  getOffers: () =>
    api.get<{ offers: CollabOffer[] }>('/collabs/offers'),

  getOffer: (id: number) =>
    api.get<CollabOffer>(`/collabs/offers/${id}`),

  createOffer: (data: CollabOfferCreateData) =>
    api.post<CollabOffer>('/collabs/offers', data),

  updateOffer: (id: number, data: Partial<CollabOfferCreateData>) =>
    api.patch<CollabOffer>(`/collabs/offers/${id}`, data),

  deleteOffer: (id: number) =>
    api.delete(`/collabs/offers/${id}`),

  // Incoming offers (Admin - from partners)
  getIncomingOffers: (status?: string) =>
    api.get<{ offers: CollabOffer[] }>('/collabs/incoming', { params: status ? { status } : undefined }),

  approveOffer: (id: number) =>
    api.post<CollabOffer>(`/collabs/offers/${id}/approve`),

  rejectOffer: (id: number, reason?: string) =>
    api.post<CollabOffer>(`/collabs/offers/${id}/reject`, { reason }),

  pauseOffer: (id: number) =>
    api.post<CollabOffer>(`/collabs/offers/${id}/pause`),

  resumeOffer: (id: number) =>
    api.post<CollabOffer>(`/collabs/offers/${id}/resume`),

  // Customer endpoints
  getAvailableOffers: () =>
    api.get<{ offers: CollabOffer[] }>('/collabs/available'),

  redeemOffer: (id: number) =>
    api.post<{
      qr_code: string;
      qr_token: string;
      redemption_id: string;
      expires_at: string;
      offer: {
        id: number;
        title: string;
        description?: string;
        discount_type: string;
        discount_value: number;
        offering_company_name: string;
      };
    }>(`/collabs/offers/${id}/redeem`),

  // Staff verification
  verifyRedemption: (qr_data: string, outlet?: string) =>
    api.post<{
      success: boolean;
      message: string;
      offer: {
        id: number;
        title: string;
        discount_type: string;
        discount_value: number;
        partner_company: string;
      };
      customer: {
        id: number;
        name: string;
      };
    }>('/collabs/verify', { qr_data, outlet }),

  // Redemption history (Admin)
  getOfferRedemptions: (offerId: number) =>
    api.get<{ redemptions: CollabRedemption[] }>(`/collabs/offers/${offerId}/redemptions`),
};
