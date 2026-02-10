-- Migration 023: Auth Cleanup
-- Track auth methods properly and clean up placeholder phones

-- Track primary auth method
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_auth_method VARCHAR(20) DEFAULT 'phone';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_primary_auth_method_check;
ALTER TABLE users ADD CONSTRAINT users_primary_auth_method_check
  CHECK (primary_auth_method IN ('phone', 'email', 'line', 'magic_link'));

-- Track verification status
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Mark existing verified phones (those without placeholder prefixes)
UPDATE users SET phone_verified = true
WHERE phone IS NOT NULL
  AND phone NOT LIKE 'LINE%'
  AND phone NOT LIKE 'E%'
  AND phone NOT LIKE 'EM%';

-- Set primary auth method based on existing data
UPDATE users SET primary_auth_method = 'line'
WHERE phone LIKE 'LINE%' AND line_id IS NOT NULL;

UPDATE users SET primary_auth_method = 'email'
WHERE (phone LIKE 'E%' OR phone LIKE 'EM%') AND email IS NOT NULL;

-- Clean up placeholder phones
UPDATE users SET phone = NULL
WHERE phone LIKE 'LINE%' AND line_id IS NOT NULL;

UPDATE users SET phone = NULL
WHERE (phone LIKE 'E%' OR phone LIKE 'EM%') AND email IS NOT NULL;

-- Allow NULL phone for LINE-only and email-only users
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Ensure at least one auth method exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_has_auth_method;
ALTER TABLE users ADD CONSTRAINT users_has_auth_method
  CHECK (phone IS NOT NULL OR email IS NOT NULL OR line_id IS NOT NULL);

-- Create indexes for auth method lookups
CREATE INDEX IF NOT EXISTS idx_users_primary_auth ON users(primary_auth_method);
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified) WHERE email IS NOT NULL;
