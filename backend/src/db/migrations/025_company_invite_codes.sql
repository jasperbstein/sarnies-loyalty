-- Migration 025: Company Invite Codes
-- Adds invite code system for company registration links

-- Add invite_code to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invite_code VARCHAR(10) UNIQUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invite_code_uses INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invite_code_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for fast invite code lookup
CREATE INDEX IF NOT EXISTS idx_companies_invite_code ON companies(invite_code) WHERE invite_code IS NOT NULL;

-- Function to generate random invite code (8 chars, uppercase alphanumeric)
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS VARCHAR(10) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluded: I, O, 0, 1 (confusable)
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generate invite codes for existing active companies
UPDATE companies
SET invite_code = generate_invite_code(),
    invite_code_created_at = NOW()
WHERE is_active = true AND invite_code IS NULL;

-- Add constraint to ensure invite codes are uppercase
ALTER TABLE companies ADD CONSTRAINT companies_invite_code_uppercase
    CHECK (invite_code = UPPER(invite_code));
