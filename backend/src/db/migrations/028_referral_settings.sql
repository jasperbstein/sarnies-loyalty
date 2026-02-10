-- Migration 028: Referral Program Settings
-- Add configurable referral program settings to app_settings

-- Insert referral settings with defaults
INSERT INTO app_settings (setting_key, setting_value, setting_type)
VALUES
  ('referral_enabled', 'true', 'boolean'),
  ('referral_points_reward', '50', 'number'),
  ('referral_monthly_cap', '10', 'number'),
  ('referral_referee_discount_percent', '0', 'number')
ON CONFLICT (setting_key) DO NOTHING;

-- Add referral-specific columns to users table for per-user overrides
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_enabled_override BOOLEAN DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_discount_override INTEGER DEFAULT NULL
  CHECK (referral_discount_override IS NULL OR (referral_discount_override >= 0 AND referral_discount_override <= 100));

COMMENT ON COLUMN users.referral_enabled_override IS 'Per-user override for referral capability (NULL = use global setting)';
COMMENT ON COLUMN users.referral_discount_override IS 'Per-user override for referral discount % (NULL = use global setting)';

-- Add is_active column to users if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';
