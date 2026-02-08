-- Migration 026: Company Simplification & Auto Invite Codes
-- Purpose: Streamline company management and ensure all companies have invite codes

-- ============================================================================
-- 1. ADD COMPANY_ID TO VOUCHERS FOR DIRECT COMPANY VOUCHER LINKING
-- ============================================================================

-- Add company_id to vouchers table for company-specific discount vouchers
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vouchers_company_id ON vouchers(company_id) WHERE company_id IS NOT NULL;

COMMENT ON COLUMN vouchers.company_id IS 'Direct link to company for company-specific vouchers (e.g., employee discounts)';

-- ============================================================================
-- 2. ENSURE ALL ACTIVE COMPANIES HAVE INVITE CODES
-- ============================================================================

-- Generate invite codes for any active companies that don't have one
UPDATE companies
SET
  invite_code = generate_invite_code(),
  invite_code_created_at = NOW()
WHERE is_active = true AND invite_code IS NULL;

-- ============================================================================
-- 3. AUTO-GENERATE INVITE CODE ON COMPANY CREATION (TRIGGER)
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_generate_company_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if is_active is true and invite_code is null
  IF NEW.is_active = true AND NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
    NEW.invite_code_created_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_auto_invite_code ON companies;

-- Create trigger for new company creation
CREATE TRIGGER trg_auto_invite_code
  BEFORE INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_company_invite_code();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
SELECT
  'Companies with invite codes' as metric,
  COUNT(*) as count
FROM companies
WHERE invite_code IS NOT NULL AND is_active = true
UNION ALL
SELECT
  'Companies without invite codes' as metric,
  COUNT(*) as count
FROM companies
WHERE invite_code IS NULL AND is_active = true;
