-- Migration 018: Additional tier and system settings
-- Adds bronze/platinum thresholds and QR/OTP expiry settings

-- ==========================================
-- 1. Additional tier thresholds
-- ==========================================
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_editable) VALUES
  ('tier_bronze_threshold', '0', 'number', 'Points required for Bronze tier (base tier)', false),
  ('tier_platinum_threshold', '50000', 'number', 'Yearly spend in THB required for Platinum tier', true)
ON CONFLICT (setting_key) DO NOTHING;

-- ==========================================
-- 2. System configuration settings
-- ==========================================
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_editable) VALUES
  ('qr_token_expiry_seconds', '120', 'number', 'QR code token expiry time in seconds', true),
  ('otp_expiry_minutes', '5', 'number', 'OTP code expiry time in minutes', true)
ON CONFLICT (setting_key) DO NOTHING;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
