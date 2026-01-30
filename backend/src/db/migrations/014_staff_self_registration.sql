-- Migration 014: Staff Self-Registration
-- Purpose: Enable staff members to self-register using company email domain

-- ============================================================================
-- 1. ADD STAFF REGISTRATION FIELDS TO COMPANIES TABLE
-- ============================================================================

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS allow_staff_self_registration BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS staff_email_domain VARCHAR(100),
ADD COLUMN IF NOT EXISTS staff_default_branch VARCHAR(100);

COMMENT ON COLUMN companies.allow_staff_self_registration IS 'Allow staff to self-register using company email domain';
COMMENT ON COLUMN companies.staff_email_domain IS 'Email domain for staff self-registration (e.g., sarnies.com)';
COMMENT ON COLUMN companies.staff_default_branch IS 'Default branch for new staff registrations';

-- ============================================================================
-- 2. ADD COMPANY REFERENCE TO STAFF_USERS TABLE
-- ============================================================================

ALTER TABLE staff_users
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;

COMMENT ON COLUMN staff_users.company_id IS 'Company affiliation for the staff member';
COMMENT ON COLUMN staff_users.is_verified IS 'True if email has been verified';
COMMENT ON COLUMN staff_users.verified_at IS 'Timestamp when email was verified';
COMMENT ON COLUMN staff_users.verification_token IS 'Email verification token';
COMMENT ON COLUMN staff_users.verification_token_expires IS 'Token expiration timestamp';

CREATE INDEX IF NOT EXISTS idx_staff_users_company_id ON staff_users(company_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_verification_token ON staff_users(verification_token);

-- ============================================================================
-- 3. UPDATE SARNIES COMPANY WITH STAFF REGISTRATION
-- ============================================================================

-- Insert or update Sarnies company with staff registration enabled
INSERT INTO companies (
  name,
  slug,
  description,
  email_domain,
  allow_employee_self_registration,
  allow_staff_self_registration,
  staff_email_domain,
  staff_default_branch,
  is_active
)
VALUES (
  'Sarnies',
  'sarnies',
  'Sarnies Coffee & Deli',
  'sarnies.com',
  true,
  true,
  'sarnies.com',
  'Raffles Place',
  true
)
ON CONFLICT (name) DO UPDATE SET
  allow_staff_self_registration = true,
  staff_email_domain = 'sarnies.com',
  staff_default_branch = 'Raffles Place';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 014 complete: Staff self-registration enabled' as status;
