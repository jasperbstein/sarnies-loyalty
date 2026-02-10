-- Add session_id to magic_link_tokens for WebSocket-based login
-- This allows the login page to receive real-time notification when magic link is clicked

ALTER TABLE magic_link_tokens
ADD COLUMN IF NOT EXISTS session_id VARCHAR(64);

-- Index for quick lookup by session_id
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_session ON magic_link_tokens(session_id);
