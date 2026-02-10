-- Migration 030: User PIN Authentication
-- Adds 6-digit PIN as a secondary authentication method

-- Add PIN-related columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP;

-- Create index for efficient PIN login lookups
CREATE INDEX IF NOT EXISTS idx_users_pin_enabled ON users(email) WHERE pin_enabled = true;

-- Comments for documentation
COMMENT ON COLUMN users.pin_hash IS 'Bcrypt hash of user 6-digit PIN';
COMMENT ON COLUMN users.pin_enabled IS 'Whether PIN authentication is enabled for this user';
COMMENT ON COLUMN users.pin_attempts IS 'Number of failed PIN attempts since last success or reset';
COMMENT ON COLUMN users.pin_locked_until IS 'Timestamp until which PIN login is locked (after 5 failed attempts)';
