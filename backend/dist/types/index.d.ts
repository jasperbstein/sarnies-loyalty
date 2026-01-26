export type UserType = 'customer' | 'employee' | 'staff' | 'investor' | 'media';
export interface User {
    id: number;
    name: string;
    surname?: string;
    phone: string;
    birthday?: string;
    company?: string;
    gender?: string;
    static_qr_code?: string;
    points_balance: number;
    total_spend: number;
    total_purchases_count: number;
    member_since: Date;
    created_at: Date;
    updated_at: Date;
    email?: string;
    email_consent: boolean;
    sms_consent: boolean;
    preferred_outlet?: string;
    tier_level: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    last_purchase_date?: Date;
    lifetime_points_earned: number;
    company_id?: number;
    employee_id?: string;
    is_company_verified: boolean;
    registration_completed: boolean;
    user_type: UserType;
    investor_group_credits_enabled: boolean;
    investor_group_credits_balance: number;
    investor_group_credits_annual_allocation: number;
    investor_group_credits_allocated_at?: Date;
    investor_group_credits_expires_at?: Date;
    investor_discount_percentage: number;
    media_annual_budget_thb: number;
    media_spent_this_year_thb: number;
    media_budget_allocated_at?: Date;
    media_budget_expires_at?: Date;
}
export interface Voucher {
    id: number;
    title: string;
    description: string;
    image_url?: string;
    points_required: number;
    cash_value: number;
    voucher_type: 'free_item' | 'discount_amount' | 'percentage_discount' | 'merch';
    expiry_type: 'fixed_date' | 'no_expiry' | 'days_after_redeem';
    expiry_date?: Date;
    expiry_days?: number;
    is_staff_voucher: boolean;
    is_active: boolean;
    is_featured: boolean;
    valid_stores: string[];
    rules?: string;
    limitations?: string;
    created_at: Date;
    updated_at: Date;
    is_company_exclusive: boolean;
    allowed_company_ids: number[];
    company_discount_boost: number;
    investor_credits_cost?: number;
    media_budget_cost_thb?: number;
    allowed_user_types: UserType[];
}
export interface VoucherInstance {
    id: number;
    uuid: string;
    user_id: number;
    voucher_id: number;
    qr_code_data: string;
    status: 'active' | 'used' | 'expired';
    redeemed_at: Date;
    used_at?: Date;
    expires_at: Date;
    used_by_staff_id?: number;
    used_at_outlet?: string;
    created_at: Date;
    redemption_transaction_id?: number;
    usage_transaction_id?: number;
}
export interface Announcement {
    id: number;
    title: string;
    description: string;
    image_url?: string;
    announcement_type: 'news' | 'promotion' | 'new_product' | 'seasonal' | 'announcement';
    cta_text?: string;
    cta_link?: string;
    is_active: boolean;
    display_order: number;
    start_date?: Date;
    end_date?: Date;
    created_at: Date;
    updated_at: Date;
    created_by_staff_id?: number;
    updated_by_staff_id?: number;
}
export interface Transaction {
    id: number;
    user_id: number;
    transaction_type: 'earn' | 'redeem' | 'use' | 'expire' | 'adjust';
    points_delta: number;
    points_balance_after: number;
    amount_value?: number;
    voucher_id?: number;
    voucher_instance_id?: number;
    outlet?: string;
    staff_id?: number;
    notes?: string;
    created_at: Date;
    updated_at?: Date;
    receipt_number?: string;
    reversed_by?: number;
    is_reversal: boolean;
}
export interface StaffUser {
    id: number;
    email: string;
    password_hash: string;
    name: string;
    role: 'admin' | 'staff';
    active: boolean;
    created_at: Date;
    updated_at: Date;
    branch: 'Sukhumvit' | 'Old Town' | 'Roastery';
}
export interface Company {
    id: number;
    name: string;
    slug: string;
    logo_url?: string;
    description?: string;
    discount_percentage: number;
    contact_email?: string;
    contact_phone?: string;
    is_active: boolean;
    allow_employee_self_registration: boolean;
    email_domain?: string;
    employee_count: number;
    total_points_awarded: number;
    created_at: Date;
    updated_at: Date;
}
export interface CompanyEmployee {
    id: number;
    company_id: number;
    employee_email: string;
    employee_id?: string;
    full_name?: string;
    department?: string;
    is_verified: boolean;
    verified_at?: Date;
    user_id?: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface InvestorOutletCredit {
    id: number;
    user_id: number;
    outlet_id: number;
    credits_balance: number;
    annual_allocation: number;
    allocated_at?: Date;
    expires_at?: Date;
    auto_renew: boolean;
    created_at: Date;
    updated_at: Date;
}
export type CreditType = 'investor_outlet' | 'investor_group' | 'media';
export type CreditTransactionType = 'allocation' | 'redemption' | 'expiry' | 'adjustment' | 'renewal';
export interface CreditTransaction {
    id: number;
    user_id: number;
    credit_type: CreditType;
    outlet_id?: number;
    transaction_type: CreditTransactionType;
    credits_change?: number;
    amount_thb?: number;
    balance_after?: number;
    voucher_id?: number;
    notes?: string;
    staff_id?: number;
    created_at: Date;
}
export interface Outlet {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    phone?: string;
    opening_hours?: string;
    is_active: boolean;
    notification_radius_meters: number;
    created_at: Date;
    updated_at: Date;
}
//# sourceMappingURL=index.d.ts.map