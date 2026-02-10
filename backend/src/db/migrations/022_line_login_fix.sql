-- Migration 022: LINE Login Fix
-- Ensure all required columns exist for LINE Login to work
-- This migration is idempotent and safe to run multiple times

-- Add registration_completed column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN DEFAULT false;

-- Add user_type column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'customer';

-- Drop existing constraint if it exists (so we can recreate it with correct values)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Add constraint with all valid user types
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('customer', 'employee', 'partner', 'staff', 'investor', 'media'));

-- Set defaults for existing records
UPDATE users SET user_type = 'customer' WHERE user_type IS NULL;
UPDATE users SET registration_completed = true WHERE registration_completed IS NULL AND name IS NOT NULL;

-- Create index for user_type lookups
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
