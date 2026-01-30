-- Performance indexes for frequently queried columns

-- Index for transactions by user and date (used in /me endpoint and activity queries)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, created_at DESC);

-- Index for voucher instances by user and redemption date (used in availability checks)
CREATE INDEX IF NOT EXISTS idx_voucher_instances_user_redeemed ON voucher_instances(user_id, redeemed_at);

-- Composite index for voucher instances lookup
CREATE INDEX IF NOT EXISTS idx_voucher_instances_voucher_user ON voucher_instances(voucher_id, user_id);

-- Index for company employees active status lookup
CREATE INDEX IF NOT EXISTS idx_company_emp_active ON company_employees(company_id, is_active);

-- Index for magic link tokens lookup by token
CREATE INDEX IF NOT EXISTS idx_magic_link_token ON magic_link_tokens(token);

-- Index for OTP sessions by phone
CREATE INDEX IF NOT EXISTS idx_otp_sessions_phone ON otp_sessions(phone, created_at DESC);

-- GIN index for announcements target_user_types array lookups
CREATE INDEX IF NOT EXISTS idx_announcements_target_types ON announcements USING GIN(target_user_types);

-- Index for active announcements (already exists but included for completeness)
-- CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
