-- Migration 012: Magic Link Authentication for Employees
-- Adds magic_link_tokens table to support email-based passwordless authentication

-- ==========================================
-- 1. Create magic_link_tokens table
-- ==========================================
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_token ON magic_link_tokens(token);

-- Index for rate limiting checks
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_email_created ON magic_link_tokens(email, created_at);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_expires ON magic_link_tokens(expires_at);

COMMENT ON TABLE magic_link_tokens IS 'Stores magic link tokens for passwordless employee authentication';
COMMENT ON COLUMN magic_link_tokens.email IS 'Employee email the magic link was sent to';
COMMENT ON COLUMN magic_link_tokens.token IS 'Unique secure token for the magic link';
COMMENT ON COLUMN magic_link_tokens.expires_at IS 'When the token expires (15 minutes from creation)';
COMMENT ON COLUMN magic_link_tokens.used_at IS 'When the token was used (NULL if unused)';

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
