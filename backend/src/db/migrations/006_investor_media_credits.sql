-- Migration 006: Investor & Media Credits System
-- Purpose: Add multi-tiered credit system for investors and media users
-- Date: 2025-01-21

-- ============================================================================
-- 1. ADD USER TYPE TO USERS TABLE
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'customer'
  CHECK (user_type IN ('customer', 'employee', 'staff', 'investor', 'media'));

CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

COMMENT ON COLUMN users.user_type IS 'User category: customer, employee, staff, investor, or media';


-- ============================================================================
-- 2. CREATE INVESTOR OUTLET CREDITS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS investor_outlet_credits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,

  -- Credit balance and allocation
  credits_balance INTEGER DEFAULT 0 CHECK (credits_balance >= 0),
  annual_allocation INTEGER DEFAULT 0 CHECK (annual_allocation >= 0),

  -- Lifecycle tracking
  allocated_at TIMESTAMP,
  expires_at TIMESTAMP,
  auto_renew BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one credit account per user per outlet
  UNIQUE(user_id, outlet_id)
);

CREATE INDEX idx_investor_outlet_credits_user_id ON investor_outlet_credits(user_id);
CREATE INDEX idx_investor_outlet_credits_outlet_id ON investor_outlet_credits(outlet_id);
CREATE INDEX idx_investor_outlet_credits_expires ON investor_outlet_credits(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE investor_outlet_credits IS 'Outlet-specific credit allocations for investors';
COMMENT ON COLUMN investor_outlet_credits.credits_balance IS 'Current available credits for this outlet';
COMMENT ON COLUMN investor_outlet_credits.annual_allocation IS 'Credits allocated per year';
COMMENT ON COLUMN investor_outlet_credits.auto_renew IS 'If true, credits auto-renew on Jan 1st';


-- ============================================================================
-- 3. ADD INVESTOR GROUP CREDITS TO USERS TABLE
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS investor_group_credits_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS investor_group_credits_balance INTEGER DEFAULT 0 CHECK (investor_group_credits_balance >= 0),
ADD COLUMN IF NOT EXISTS investor_group_credits_annual_allocation INTEGER DEFAULT 0 CHECK (investor_group_credits_annual_allocation >= 0),
ADD COLUMN IF NOT EXISTS investor_group_credits_allocated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS investor_group_credits_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS investor_discount_percentage INTEGER DEFAULT 25 CHECK (investor_discount_percentage >= 0 AND investor_discount_percentage <= 100);

CREATE INDEX IF NOT EXISTS idx_users_group_credits_enabled ON users(investor_group_credits_enabled) WHERE investor_group_credits_enabled = true;

COMMENT ON COLUMN users.investor_group_credits_enabled IS 'If true, investor has group credits usable at any outlet';
COMMENT ON COLUMN users.investor_group_credits_balance IS 'Current group credits balance (any outlet)';
COMMENT ON COLUMN users.investor_discount_percentage IS 'Discount percentage for investor (default 25%)';


-- ============================================================================
-- 4. ADD MEDIA BUDGET TO USERS TABLE
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS media_annual_budget_thb DECIMAL(10,2) DEFAULT 0 CHECK (media_annual_budget_thb >= 0),
ADD COLUMN IF NOT EXISTS media_spent_this_year_thb DECIMAL(10,2) DEFAULT 0 CHECK (media_spent_this_year_thb >= 0),
ADD COLUMN IF NOT EXISTS media_budget_allocated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS media_budget_expires_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_media_budget ON users(media_annual_budget_thb) WHERE media_annual_budget_thb > 0;

COMMENT ON COLUMN users.media_annual_budget_thb IS 'Annual budget in THB for media users';
COMMENT ON COLUMN users.media_spent_this_year_thb IS 'Amount spent this year (resets annually)';


-- ============================================================================
-- 5. CREATE CREDIT TRANSACTIONS LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction details
  credit_type VARCHAR(30) NOT NULL CHECK (credit_type IN ('investor_outlet', 'investor_group', 'media')),
  outlet_id INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('allocation', 'redemption', 'expiry', 'adjustment', 'renewal')),

  -- Amounts
  credits_change INTEGER, -- For investor credits (can be negative)
  amount_thb DECIMAL(10,2), -- For media budget
  balance_after INTEGER, -- Balance after this transaction

  -- Context
  voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL,
  notes TEXT,
  staff_id INTEGER REFERENCES staff_users(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(credit_type, transaction_type);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_voucher ON credit_transactions(voucher_id) WHERE voucher_id IS NOT NULL;

COMMENT ON TABLE credit_transactions IS 'Audit log for all credit and media budget transactions';
COMMENT ON COLUMN credit_transactions.credit_type IS 'Type of credit: investor_outlet, investor_group, or media';
COMMENT ON COLUMN credit_transactions.transaction_type IS 'allocation, redemption, expiry, adjustment, or renewal';


-- ============================================================================
-- 6. UPDATE VOUCHERS TABLE - MULTI-CURRENCY PRICING
-- ============================================================================

ALTER TABLE vouchers
ADD COLUMN IF NOT EXISTS investor_credits_cost INTEGER CHECK (investor_credits_cost >= 0),
ADD COLUMN IF NOT EXISTS media_budget_cost_thb DECIMAL(10,2) CHECK (media_budget_cost_thb >= 0),
ADD COLUMN IF NOT EXISTS allowed_user_types TEXT[] DEFAULT ARRAY['customer', 'employee']::TEXT[];

CREATE INDEX IF NOT EXISTS idx_vouchers_allowed_user_types ON vouchers USING GIN(allowed_user_types);

COMMENT ON COLUMN vouchers.investor_credits_cost IS 'Cost in investor credits (if NULL, auto-calculated with discount)';
COMMENT ON COLUMN vouchers.media_budget_cost_thb IS 'Cost in THB for media users (if NULL, uses cash_value)';
COMMENT ON COLUMN vouchers.allowed_user_types IS 'Array of user types allowed to redeem (customer, employee, investor, media)';


-- ============================================================================
-- 7. ADD TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_investor_outlet_credits_updated_at
BEFORE UPDATE ON investor_outlet_credits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate investor credit cost with discount
CREATE OR REPLACE FUNCTION calculate_investor_credit_cost(
  p_voucher_id INTEGER,
  p_discount_percentage INTEGER DEFAULT 25
) RETURNS INTEGER AS $$
DECLARE
  v_points_required INTEGER;
  v_investor_cost INTEGER;
BEGIN
  SELECT
    points_required,
    investor_credits_cost
  INTO
    v_points_required,
    v_investor_cost
  FROM vouchers
  WHERE id = p_voucher_id;

  -- If investor cost explicitly set, use it
  IF v_investor_cost IS NOT NULL THEN
    RETURN v_investor_cost;
  END IF;

  -- Otherwise, apply discount to points_required
  RETURN CEIL(v_points_required * (100 - p_discount_percentage) / 100.0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_investor_credit_cost IS 'Calculate investor credit cost with discount (default 25%)';


-- Function to check if user can redeem voucher based on user type
CREATE OR REPLACE FUNCTION check_user_voucher_access(
  p_user_id INTEGER,
  p_voucher_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_type VARCHAR(20);
  v_allowed_types TEXT[];
BEGIN
  -- Get user type
  SELECT user_type INTO v_user_type
  FROM users
  WHERE id = p_user_id;

  -- Get allowed user types for voucher
  SELECT allowed_user_types INTO v_allowed_types
  FROM vouchers
  WHERE id = p_voucher_id;

  -- Check if user type is in allowed list
  RETURN v_user_type = ANY(v_allowed_types);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_user_voucher_access IS 'Check if user type is allowed to redeem voucher';


-- Function to get investor available credits for outlet
CREATE OR REPLACE FUNCTION get_investor_credits_for_outlet(
  p_user_id INTEGER,
  p_outlet_id INTEGER
) RETURNS TABLE (
  outlet_credits INTEGER,
  group_credits INTEGER,
  total_available INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ioc.credits_balance, 0) as outlet_credits,
    COALESCE(u.investor_group_credits_balance, 0) as group_credits,
    COALESCE(ioc.credits_balance, 0) + COALESCE(u.investor_group_credits_balance, 0) as total_available
  FROM users u
  LEFT JOIN investor_outlet_credits ioc
    ON ioc.user_id = u.id AND ioc.outlet_id = p_outlet_id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_investor_credits_for_outlet IS 'Get total available investor credits (outlet + group) for specific outlet';


-- Function to check media budget availability
CREATE OR REPLACE FUNCTION check_media_budget_available(
  p_user_id INTEGER,
  p_cost_thb DECIMAL(10,2)
) RETURNS BOOLEAN AS $$
DECLARE
  v_budget DECIMAL(10,2);
  v_spent DECIMAL(10,2);
BEGIN
  SELECT
    media_annual_budget_thb,
    media_spent_this_year_thb
  INTO v_budget, v_spent
  FROM users
  WHERE id = p_user_id;

  RETURN (v_budget - v_spent) >= p_cost_thb;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_media_budget_available IS 'Check if media user has sufficient budget remaining';


-- ============================================================================
-- 9. UPDATE EXISTING DATA
-- ============================================================================

-- Set default user_type for existing users
UPDATE users
SET user_type = CASE
  WHEN company_id IS NOT NULL AND is_company_verified = true THEN 'employee'
  ELSE 'customer'
END
WHERE user_type IS NULL;

-- Update existing vouchers to allow customers and employees by default
UPDATE vouchers
SET allowed_user_types = ARRAY['customer', 'employee']::TEXT[]
WHERE allowed_user_types IS NULL;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary verification
SELECT
  'User types' as metric,
  user_type,
  COUNT(*) as count
FROM users
GROUP BY user_type
UNION ALL
SELECT
  'Investor outlet credits' as metric,
  'total' as user_type,
  COUNT(*) as count
FROM investor_outlet_credits
UNION ALL
SELECT
  'Credit transactions' as metric,
  'total' as user_type,
  COUNT(*) as count
FROM credit_transactions;
