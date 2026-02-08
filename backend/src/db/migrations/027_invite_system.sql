-- Migration 027: Dual Invite System
-- Purpose: Support both personal invite links and company public links with verification

-- ============================================================================
-- 1. ADD COMPANY ACCESS CODE (for public link verification)
-- ============================================================================

-- Add access_code to companies (separate from invite_code which is the public slug)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS access_code VARCHAR(10);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS access_code_created_at TIMESTAMP;

-- Create unique index for access code lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_access_code ON companies(access_code) WHERE access_code IS NOT NULL;

COMMENT ON COLUMN companies.access_code IS 'Shared access code for employees to verify via public company link';
COMMENT ON COLUMN companies.invite_code IS 'Public company link slug (e.g., /join/STRIPE2024)';

-- ============================================================================
-- 2. CREATE PERSONAL INVITE CODES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS personal_invite_codes (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- The unique personal code
  code VARCHAR(12) NOT NULL UNIQUE,

  -- Optional: pre-assign to specific email
  email VARCHAR(255),

  -- Usage tracking
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP,
  used_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Expiry (optional)
  expires_at TIMESTAMP,

  -- Metadata
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Notes from admin
  notes TEXT
);

CREATE INDEX idx_personal_invite_company ON personal_invite_codes(company_id);
CREATE INDEX idx_personal_invite_email ON personal_invite_codes(email) WHERE email IS NOT NULL;
CREATE INDEX idx_personal_invite_unused ON personal_invite_codes(is_used) WHERE is_used = false;

COMMENT ON TABLE personal_invite_codes IS 'One-time personal invite codes for direct employee access';
COMMENT ON COLUMN personal_invite_codes.code IS 'Unique 12-char personal invite code';
COMMENT ON COLUMN personal_invite_codes.email IS 'Optional: restrict this code to specific email';

-- ============================================================================
-- 3. FUNCTION TO GENERATE PERSONAL INVITE CODE
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_personal_invite_code() RETURNS VARCHAR(12) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    -- 12 chars for personal codes (vs 8 for company codes)
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. FUNCTION TO GENERATE ACCESS CODE
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_access_code() RETURNS VARCHAR(6) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    -- 6 chars for access codes (easy to type/remember)
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. GENERATE ACCESS CODES FOR EXISTING COMPANIES
-- ============================================================================

UPDATE companies
SET
  access_code = generate_access_code(),
  access_code_created_at = NOW()
WHERE is_active = true AND access_code IS NULL;

-- ============================================================================
-- 6. UPDATE TRIGGER TO AUTO-GENERATE ACCESS CODE ON COMPANY CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_generate_company_codes()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate invite_code (public link slug) if not set
  IF NEW.is_active = true AND NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
    NEW.invite_code_created_at := NOW();
  END IF;

  -- Generate access_code if not set
  IF NEW.is_active = true AND NEW.access_code IS NULL THEN
    NEW.access_code := generate_access_code();
    NEW.access_code_created_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger and create new combined one
DROP TRIGGER IF EXISTS trg_auto_invite_code ON companies;
DROP TRIGGER IF EXISTS trg_auto_company_codes ON companies;

CREATE TRIGGER trg_auto_company_codes
  BEFORE INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_company_codes();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT
  'Companies with access codes' as metric,
  COUNT(*) as count
FROM companies WHERE access_code IS NOT NULL AND is_active = true;
