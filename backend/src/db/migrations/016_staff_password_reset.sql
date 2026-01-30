-- Migration 016: Staff Password Reset
-- Purpose: Add columns for staff password reset functionality

-- Add password reset columns to staff_users
ALTER TABLE staff_users
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Index for password reset token lookup
CREATE INDEX IF NOT EXISTS idx_staff_password_reset_token ON staff_users(password_reset_token);

SELECT 'Migration 016 complete: Staff password reset columns added' as status;
