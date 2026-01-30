-- Migration 002: Company Profiles and Employee Management
-- Purpose: Enable company-based loyalty programs with exclusive vouchers

-- ============================================================================
-- 1. CREATE COMPANIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  slug VARCHAR(200) NOT NULL UNIQUE, -- URL-friendly identifier
  logo_url TEXT,
  description TEXT,
  discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),

  -- Contact information
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),

  -- Company status
  is_active BOOLEAN DEFAULT true,

  -- Settings
  allow_employee_self_registration BOOLEAN DEFAULT false, -- If true, employees can register with company email domain
  email_domain VARCHAR(100), -- e.g., "google.com" for auto-verification

  -- Metadata
  employee_count INTEGER DEFAULT 0,
  total_points_awarded INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE companies IS 'Corporate partners with employee loyalty programs';
COMMENT ON COLUMN companies.slug IS 'URL-safe identifier for company (e.g., "google", "acme-corp")';
COMMENT ON COLUMN companies.discount_percentage IS 'Additional discount percentage for company employees (0-100)';
COMMENT ON COLUMN companies.allow_employee_self_registration IS 'Allow employees to register using company email domain';
COMMENT ON COLUMN companies.email_domain IS 'Email domain for auto-verification (e.g., google.com)';


-- ============================================================================
-- 2. CREATE COMPANY EMPLOYEES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_employees (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Employee identification
  employee_email VARCHAR(255) NOT NULL,
  employee_id VARCHAR(100), -- Company's internal employee ID
  full_name VARCHAR(200),
  department VARCHAR(100),

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,

  -- Link to user account
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one email per company
  UNIQUE (company_id, employee_email)
);

COMMENT ON TABLE company_employees IS 'Pre-approved employee list for company programs';
COMMENT ON COLUMN company_employees.is_verified IS 'True if employee has registered and verified their account';
COMMENT ON COLUMN company_employees.user_id IS 'Link to users table once employee registers';

CREATE INDEX idx_company_employees_company_id ON company_employees(company_id);
CREATE INDEX idx_company_employees_email ON company_employees(employee_email);
CREATE INDEX idx_company_employees_user_id ON company_employees(user_id);
CREATE INDEX idx_company_employees_verified ON company_employees(is_verified);


-- ============================================================================
-- 3. ALTER USERS TABLE - ADD COMPANY LINK
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100), -- Reference to company's internal employee ID
ADD COLUMN IF NOT EXISTS is_company_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN DEFAULT false; -- Track if full registration done

COMMENT ON COLUMN users.company_id IS 'Company affiliation for employee loyalty programs';
COMMENT ON COLUMN users.is_company_verified IS 'True if user verified as company employee';
COMMENT ON COLUMN users.registration_completed IS 'True if user completed full registration (not just OTP)';

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);


-- ============================================================================
-- 4. ALTER VOUCHERS TABLE - ADD COMPANY RESTRICTIONS
-- ============================================================================

ALTER TABLE vouchers
ADD COLUMN IF NOT EXISTS is_company_exclusive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_company_ids INTEGER[] DEFAULT '{}', -- Array of company IDs that can access this voucher
ADD COLUMN IF NOT EXISTS company_discount_boost INTEGER DEFAULT 0 CHECK (company_discount_boost >= 0 AND company_discount_boost <= 100);

COMMENT ON COLUMN vouchers.is_company_exclusive IS 'If true, only employees of allowed companies can redeem';
COMMENT ON COLUMN vouchers.allowed_company_ids IS 'Array of company IDs with access (empty = all companies if not exclusive)';
COMMENT ON COLUMN vouchers.company_discount_boost IS 'Additional discount % for company employees (stacks with company.discount_percentage)';

CREATE INDEX IF NOT EXISTS idx_vouchers_company_exclusive ON vouchers(is_company_exclusive);


-- ============================================================================
-- 5. CREATE ANNOUNCEMENTS ADMIN TABLE (for CMS tracking)
-- ============================================================================

-- Track who created/updated announcements for audit purposes
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS created_by_staff_id INTEGER REFERENCES staff_users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by_staff_id INTEGER REFERENCES staff_users(id) ON DELETE SET NULL;

COMMENT ON COLUMN announcements.created_by_staff_id IS 'Staff user who created this announcement';
COMMENT ON COLUMN announcements.updated_by_staff_id IS 'Staff user who last updated this announcement';


-- ============================================================================
-- 6. UPDATE TRIGGERS
-- ============================================================================

-- Add updated_at trigger for companies
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for company_employees
CREATE TRIGGER update_company_employees_updated_at BEFORE UPDATE ON company_employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to verify employee eligibility for company vouchers
CREATE OR REPLACE FUNCTION check_user_company_eligibility(
  p_user_id INTEGER,
  p_voucher_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_company_exclusive BOOLEAN;
  v_allowed_companies INTEGER[];
  v_user_company_id INTEGER;
  v_is_verified BOOLEAN;
BEGIN
  -- Get voucher company restrictions
  SELECT is_company_exclusive, allowed_company_ids
  INTO v_is_company_exclusive, v_allowed_companies
  FROM vouchers
  WHERE id = p_voucher_id;

  -- If not company exclusive, everyone can access
  IF NOT v_is_company_exclusive THEN
    RETURN TRUE;
  END IF;

  -- Get user's company affiliation
  SELECT company_id, is_company_verified
  INTO v_user_company_id, v_is_verified
  FROM users
  WHERE id = p_user_id;

  -- User must be verified company employee
  IF v_user_company_id IS NULL OR NOT v_is_verified THEN
    RETURN FALSE;
  END IF;

  -- Check if user's company is in allowed list
  RETURN v_user_company_id = ANY(v_allowed_companies);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_user_company_eligibility IS 'Check if user is eligible for company-exclusive voucher';


-- Function to sync employee count
CREATE OR REPLACE FUNCTION update_company_employee_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update employee count for the company
  UPDATE companies
  SET employee_count = (
    SELECT COUNT(*)
    FROM company_employees
    WHERE company_id = COALESCE(NEW.company_id, OLD.company_id)
    AND is_active = true
  )
  WHERE id = COALESCE(NEW.company_id, OLD.company_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update employee count
CREATE TRIGGER sync_company_employee_count
AFTER INSERT OR UPDATE OR DELETE ON company_employees
FOR EACH ROW
EXECUTE FUNCTION update_company_employee_count();


-- ============================================================================
-- 8. SEED SAMPLE DATA (Optional - for development)
-- ============================================================================

-- Insert sample companies
INSERT INTO companies (name, slug, description, email_domain, allow_employee_self_registration, is_active, discount_percentage)
VALUES
  ('Google Thailand', 'google-thailand', 'Google employees in Thailand', 'google.com', true, true, 15),
  ('Agoda', 'agoda', 'Agoda team members', 'agoda.com', true, true, 10),
  ('Grab Thailand', 'grab-thailand', 'Grab Thailand employees', 'grab.com', true, true, 10),
  ('Demo Corp', 'demo-corp', 'Demo company for testing', 'democorp.com', true, true, 20)
ON CONFLICT (name) DO NOTHING;

-- Insert sample employees for Demo Corp
INSERT INTO company_employees (company_id, employee_email, full_name, department, is_verified, is_active)
SELECT
  (SELECT id FROM companies WHERE slug = 'demo-corp'),
  'john.doe@democorp.com',
  'John Doe',
  'Engineering',
  false,
  true
ON CONFLICT (company_id, employee_email) DO NOTHING;

INSERT INTO company_employees (company_id, employee_email, full_name, department, is_verified, is_active)
SELECT
  (SELECT id FROM companies WHERE slug = 'demo-corp'),
  'jane.smith@democorp.com',
  'Jane Smith',
  'Marketing',
  false,
  true
ON CONFLICT (company_id, employee_email) DO NOTHING;


-- ============================================================================
-- 9. GRANT PERMISSIONS (Optional - adjust based on your setup)
-- ============================================================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO loyalty_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON company_employees TO loyalty_app;
-- GRANT USAGE, SELECT ON SEQUENCE companies_id_seq TO loyalty_app;
-- GRANT USAGE, SELECT ON SEQUENCE company_employees_id_seq TO loyalty_app;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
SELECT
  'Companies table' as object,
  COUNT(*) as count
FROM companies
UNION ALL
SELECT
  'Company employees table' as object,
  COUNT(*) as count
FROM company_employees;
