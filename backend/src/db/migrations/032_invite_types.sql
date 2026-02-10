-- Migration 032: Invite Types
-- Purpose: Support different invite types (employee vs customer)

-- ============================================================================
-- 1. ADD INVITE TYPE TO PERSONAL INVITE CODES
-- ============================================================================

-- Add invite_type column to personal_invite_codes
ALTER TABLE personal_invite_codes ADD COLUMN IF NOT EXISTS invite_type VARCHAR(20) DEFAULT 'employee';

-- Valid types: 'employee' (joins as company employee with benefits)
--              'customer' (joins as regular customer)

COMMENT ON COLUMN personal_invite_codes.invite_type IS 'Type of invite: employee (company benefits) or customer (regular membership)';

-- ============================================================================
-- 2. ADD CUSTOMER INVITE CODE TO COMPANIES (for public customer invites)
-- ============================================================================

-- Add a separate invite code for customers (public link for customer referrals)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS customer_invite_code VARCHAR(10) UNIQUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS customer_invite_code_uses INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS customer_invite_code_created_at TIMESTAMP;

COMMENT ON COLUMN companies.customer_invite_code IS 'Public link for customer invites (no employee benefits)';
COMMENT ON COLUMN companies.invite_code IS 'Public link for employee invites (with company benefits)';

-- Create index for customer invite code lookup
CREATE INDEX IF NOT EXISTS idx_companies_customer_invite_code ON companies(customer_invite_code) WHERE customer_invite_code IS NOT NULL;

-- ============================================================================
-- 3. GENERATE CUSTOMER INVITE CODES FOR EXISTING COMPANIES
-- ============================================================================

UPDATE companies
SET
  customer_invite_code = generate_invite_code(),
  customer_invite_code_created_at = NOW()
WHERE is_active = true AND customer_invite_code IS NULL;

-- ============================================================================
-- 4. UPDATE TRIGGER TO AUTO-GENERATE CUSTOMER INVITE CODE
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_generate_company_codes()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate invite_code (employee link) if not set
  IF NEW.is_active = true AND NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
    NEW.invite_code_created_at := NOW();
  END IF;

  -- Generate access_code if not set
  IF NEW.is_active = true AND NEW.access_code IS NULL THEN
    NEW.access_code := generate_access_code();
    NEW.access_code_created_at := NOW();
  END IF;

  -- Generate customer_invite_code if not set
  IF NEW.is_active = true AND NEW.customer_invite_code IS NULL THEN
    NEW.customer_invite_code := generate_invite_code();
    NEW.customer_invite_code_created_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT
  'Companies with both invite codes' as metric,
  COUNT(*) as count
FROM companies
WHERE invite_code IS NOT NULL
  AND customer_invite_code IS NOT NULL
  AND is_active = true;
