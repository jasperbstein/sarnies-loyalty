-- ============================================================================
-- Migration 008: Performance Optimizations
-- Created: 2024-01-15
-- Purpose: Add indexes and optimize queries for production performance
-- ============================================================================

-- Add indexes for frequently queried columns
-- These improve query performance for common operations

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_points_balance ON users(points_balance DESC);

-- Staff users table indexes
CREATE INDEX IF NOT EXISTS idx_staff_users_email ON staff_users(email);
CREATE INDEX IF NOT EXISTS idx_staff_users_active ON staff_users(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_staff_users_role ON staff_users(role);

-- Vouchers table indexes
CREATE INDEX IF NOT EXISTS idx_vouchers_category ON vouchers(category);
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON vouchers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vouchers_valid_dates ON vouchers(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_vouchers_points ON vouchers(points_required);

-- Transactions table indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_staff_id ON transactions(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);

-- Announcements table indexes
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_valid_dates ON announcements(valid_from, valid_until);

-- Companies table indexes
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_email_domain ON companies(email_domain) WHERE email_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active) WHERE is_active = true;

-- Company employees table indexes
CREATE INDEX IF NOT EXISTS idx_company_employees_company_id ON company_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_company_employees_user_id ON company_employees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_employees_email ON company_employees(employee_email);
CREATE INDEX IF NOT EXISTS idx_company_employees_verified ON company_employees(is_verified, is_active);

-- OTP sessions table indexes
CREATE INDEX IF NOT EXISTS idx_otp_sessions_phone ON otp_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_expires_at ON otp_sessions(expires_at);

-- Settings table index
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);

-- Outlets table indexes
CREATE INDEX IF NOT EXISTS idx_outlets_active ON outlets(is_active) WHERE is_active = true;

-- Add composite indexes for common query patterns

-- User search (name + surname)
CREATE INDEX IF NOT EXISTS idx_users_name_search ON users
  USING gin(to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(surname, '')));

-- Voucher redemptions by user
CREATE INDEX IF NOT EXISTS idx_transactions_user_voucher ON transactions(user_id, voucher_id)
  WHERE type = 'redemption';

-- Company employee lookup
CREATE INDEX IF NOT EXISTS idx_company_employees_lookup ON company_employees(company_id, employee_email)
  WHERE is_active = true;

-- ============================================================================
-- Maintenance: Analyze tables for query planner
-- ============================================================================

ANALYZE users;
ANALYZE staff_users;
ANALYZE vouchers;
ANALYZE transactions;
ANALYZE announcements;
ANALYZE companies;
ANALYZE company_employees;
ANALYZE otp_sessions;
ANALYZE app_settings;
ANALYZE outlets;
ANALYZE audit_logs;

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 008 completed successfully!';
  RAISE NOTICE 'Performance indexes created.';
  RAISE NOTICE 'Tables analyzed for query optimization.';
END $$;
