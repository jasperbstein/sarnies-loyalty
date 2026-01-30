-- Migration 015: Sarnies Outlets/Locations
-- Purpose: Add all Sarnies brand locations

-- ============================================================================
-- 1. CREATE OUTLETS TABLE IF NOT EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS outlets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Thailand',
  phone VARCHAR(50),
  email VARCHAR(255),
  opening_hours TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outlets_company_id ON outlets(company_id);
CREATE INDEX IF NOT EXISTS idx_outlets_is_active ON outlets(is_active);

-- ============================================================================
-- 2. INSERT SARNIES OUTLETS
-- ============================================================================

-- Get Sarnies company ID
DO $$
DECLARE
  sarnies_id INTEGER;
BEGIN
  SELECT id INTO sarnies_id FROM companies WHERE slug = 'sarnies' OR name = 'Sarnies' LIMIT 1;

  -- If Sarnies company doesn't exist, create it
  IF sarnies_id IS NULL THEN
    INSERT INTO companies (name, slug, email_domain, allow_employee_self_registration, allow_staff_self_registration, staff_email_domain, is_active)
    VALUES ('Sarnies', 'sarnies', 'sarnies.com', true, true, 'sarnies.com', true)
    RETURNING id INTO sarnies_id;
  END IF;

  -- Insert all outlets
  INSERT INTO outlets (name, slug, company_id, city, is_active) VALUES
    ('Carito''s', 'caritos', sarnies_id, 'Bangkok', true),
    ('Fantree Cafe', 'fantree-cafe', sarnies_id, 'Bangkok', true),
    ('Funkytown', 'funkytown', sarnies_id, 'Bangkok', true),
    ('Pimp My Salad Bangkok', 'pimp-my-salad-bangkok', sarnies_id, 'Bangkok', true),
    ('Santi''s Pizza & Produce', 'santis-pizza-produce', sarnies_id, 'Bangkok', true),
    ('Sarnies', 'sarnies-main', sarnies_id, 'Bangkok', true),
    ('Sarnies & Friends', 'sarnies-and-friends', sarnies_id, 'Bangkok', true),
    ('Sarnies Bangkok', 'sarnies-bangkok', sarnies_id, 'Bangkok', true),
    ('Sarnies Cantina', 'sarnies-cantina', sarnies_id, 'Bangkok', true),
    ('Sarnies One Bangkok', 'sarnies-one-bangkok', sarnies_id, 'Bangkok', true),
    ('Sarnies Roastery', 'sarnies-roastery', sarnies_id, 'Bangkok', true),
    ('Sarnies Sourdough', 'sarnies-sourdough', sarnies_id, 'Bangkok', true),
    ('Sarnies x Pimp My Salad Emporium Tower', 'sarnies-pimp-emporium', sarnies_id, 'Bangkok', true),
    ('Sarnies Cafe Sukhumvit', 'sarnies-cafe-sukhumvit', sarnies_id, 'Bangkok', true),
    ('Toma y Toma', 'toma-y-toma', sarnies_id, 'Bangkok', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = true;

END $$;

-- ============================================================================
-- 3. UPDATE STAFF DEFAULT BRANCH OPTIONS
-- ============================================================================

-- Update Sarnies company to use first outlet as default
UPDATE companies
SET staff_default_branch = 'Sarnies'
WHERE slug = 'sarnies' OR name = 'Sarnies';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 015 complete: Sarnies outlets added' as status;
SELECT name, slug FROM outlets ORDER BY name;
