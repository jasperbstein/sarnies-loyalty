// ============================================
// API Types - Single source of truth for API data structures
// ============================================

// ========== User Types ==========
export type UserType = 'customer' | 'employee' | 'staff' | 'investor' | 'media';
export type UserRole = 'admin' | 'user' | 'manager';

export interface User {
  id: number;
  name: string;
  surname?: string;
  phone?: string;
  email?: string;
  role?: UserRole;
  points_balance?: number;
  type: 'customer' | 'staff' | 'employee';
  branch?: string;
  user_type?: UserType;
  total_spend?: number;
  total_purchases_count?: number;
  created_at?: string;
  birthday?: string;
  gender?: string;
  company?: string;
  customer_id?: string;
  company_id?: number;
  is_company_verified?: boolean;
}

export interface UserParams {
  page?: number;
  limit?: number;
  search?: string;
  user_type?: UserType;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface UserUpdateData {
  name?: string;
  surname?: string;
  email?: string | null;
  phone?: string;
  birthday?: string | null;
  gender?: string | null;
  company_id?: number;
  user_type?: UserType;
  is_active?: boolean;
  referral_enabled_override?: boolean | null;
  referral_discount_override?: number | null;
}

// ========== Voucher Types ==========
export type VoucherType = 'freeItem' | 'discount' | 'promotion' | 'percentage' | 'fixed' | 'free_item';
export type VoucherStatus = 'active' | 'inactive';

export interface Voucher {
  id: number;
  name: string;
  description?: string;
  type: VoucherType;
  category?: string | null;
  status: VoucherStatus;
  points_cost: number;
  value?: number;
  discount_percentage?: number;
  discount_amount?: number;
  featured?: boolean;
  image_url?: string;
  min_purchase?: number;
  max_discount?: number;
  valid_from?: string;
  valid_until?: string;
  redemption_limit?: number;
  redemption_count?: number;
  target_user_types?: UserType[];
  is_staff_voucher?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VoucherCreateData {
  name: string;
  description?: string;
  type: VoucherType;
  category?: string;
  status?: VoucherStatus;
  points_cost: number;
  value?: number;
  discount_percentage?: number;
  discount_amount?: number;
  featured?: boolean;
  image_url?: string;
  min_purchase?: number;
  max_discount?: number;
  valid_from?: string;
  valid_until?: string;
  redemption_limit?: number;
  target_user_types?: UserType[];
  redemption_window?: string;
}

export interface VoucherUpdateData extends Partial<VoucherCreateData> {
  id?: never; // id should not be in update data
  is_active?: boolean;
}

export interface VoucherInstance {
  id: number;
  voucher_id: number;
  user_id: number;
  status: 'active' | 'used' | 'expired';
  redeemed_at?: string;
  expires_at?: string;
  created_at: string;
  voucher?: Voucher;
}

// ========== Transaction Types ==========
export type TransactionType = 'earn' | 'redeem' | 'adjust' | 'referral_bonus';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface Transaction {
  id: number;
  user_id: number;
  type: TransactionType;
  status: TransactionStatus;
  points: number;
  amount?: number;
  outlet?: string;
  notes?: string;
  voucher_id?: number;
  created_at: string;
  user?: User;
  voucher?: Voucher;
}

export interface TransactionParams {
  page?: number;
  limit?: number;
  user_id?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  outlet?: string;
  from_date?: string;
  to_date?: string;
}

// ========== Announcement Types ==========
export type AnnouncementStatus = 'active' | 'inactive' | 'scheduled';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  summary?: string;
  image_url?: string;
  status: AnnouncementStatus;
  target_user_types?: UserType[];
  featured?: boolean;
  publish_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface AnnouncementCreateData {
  title: string;
  content: string;
  summary?: string;
  image_url?: string;
  status?: AnnouncementStatus;
  target_user_types?: UserType[];
  featured?: boolean;
  publish_at?: string;
  expires_at?: string;
}

export interface AnnouncementUpdateData extends Partial<AnnouncementCreateData> {
  id?: never;
  is_active?: boolean;
}

// ========== Outlet Types ==========
export interface Outlet {
  id: number;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  opening_hours?: string;
  is_active: boolean;
  company_id?: number;
  created_at?: string;
}

export interface UserLocationUpdate {
  latitude?: number;
  longitude?: number;
  location_enabled?: boolean;
  notification_enabled?: boolean;
}

// ========== Settings Types ==========
export type SettingType = 'string' | 'number' | 'boolean' | 'json';

export interface Setting {
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  type: SettingType;
  description?: string;
  editable: boolean;
}

export interface SettingCreateData {
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  type: SettingType;
  description?: string;
  editable?: boolean;
}

// ========== Notification Types ==========
export interface NotificationData {
  user_ids: number[];
  title: string;
  body: string;
  category?: string;
  data?: Record<string, unknown>;
}

export interface BroadcastData {
  title: string;
  body: string;
  category?: string;
  data?: Record<string, unknown>;
}

export interface NotificationPreferences {
  [key: string]: boolean;
}

// ========== Referral Types ==========
export interface ReferralCode {
  code: string;
  user_id: number;
  usage_count: number;
  created_at: string;
}

export interface Referral {
  id: number;
  referrer_id: number;
  referee_id: number;
  referral_code: string;
  status: 'pending' | 'completed' | 'expired';
  bonus_points?: number;
  created_at: string;
  completed_at?: string;
}

export interface ReferralApplyData {
  code?: string;
  referee_user_id?: number;
  referral_code?: string;
}

// ========== POS API Key Types ==========
export interface POSKey {
  id: number;
  name: string;
  key_prefix: string;
  outlet_id?: number;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
  outlet?: Outlet;
}

export interface POSKeyCreateData {
  name: string;
  outlet_id?: number;
}

export interface POSKeyLog {
  id: number;
  key_id: number;
  action: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ========== Investor/Media Types ==========
export interface InvestorCredits {
  outlet_credits: OutletCredit[];
  group_credits?: GroupCredit;
}

export interface OutletCredit {
  outlet_id: number;
  outlet_name: string;
  annual_allocation: number;
  credits_balance: number;
  auto_renew: boolean;
  expires_at?: string;
}

export interface GroupCredit {
  enabled: boolean;
  annual_allocation: number;
  credits_balance: number;
  expires_at?: string;
}

export interface MediaBudget {
  annual_budget_thb: number;
  spent_thb: number;
  remaining_thb: number;
  expires_at?: string;
}

// ========== API Response Types ==========
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
