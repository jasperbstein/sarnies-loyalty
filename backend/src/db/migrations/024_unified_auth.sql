-- Migration 024: Unified Auth
-- Create user_auth_methods table for multiple auth methods per user

CREATE TABLE IF NOT EXISTS user_auth_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  auth_type VARCHAR(20) NOT NULL,
  auth_identifier VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_auth_methods_type_check CHECK (auth_type IN ('phone', 'email', 'line', 'password')),
  CONSTRAINT user_auth_methods_unique UNIQUE(auth_type, auth_identifier)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_auth_methods_user ON user_auth_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_methods_lookup ON user_auth_methods(auth_type, LOWER(auth_identifier));
CREATE INDEX IF NOT EXISTS idx_auth_methods_primary ON user_auth_methods(user_id, is_primary) WHERE is_primary = true;

-- Migrate existing phone auth data
INSERT INTO user_auth_methods (user_id, auth_type, auth_identifier, is_verified, is_primary)
SELECT id, 'phone', phone, phone_verified, (primary_auth_method = 'phone')
FROM users WHERE phone IS NOT NULL
ON CONFLICT (auth_type, auth_identifier) DO NOTHING;

-- Migrate existing LINE auth data
INSERT INTO user_auth_methods (user_id, auth_type, auth_identifier, is_verified, is_primary, metadata)
SELECT
  id,
  'line',
  line_id,
  true,
  (primary_auth_method = 'line'),
  jsonb_build_object('display_name', line_display_name, 'picture_url', line_picture_url)
FROM users WHERE line_id IS NOT NULL
ON CONFLICT (auth_type, auth_identifier) DO NOTHING;

-- Migrate existing email auth data
INSERT INTO user_auth_methods (user_id, auth_type, auth_identifier, is_verified, is_primary)
SELECT id, 'email', LOWER(email), email_verified, (primary_auth_method = 'email')
FROM users WHERE email IS NOT NULL
ON CONFLICT (auth_type, auth_identifier) DO NOTHING;

-- Create trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_auth_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auth_methods_updated_at ON user_auth_methods;
CREATE TRIGGER auth_methods_updated_at
  BEFORE UPDATE ON user_auth_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_auth_methods_updated_at();
