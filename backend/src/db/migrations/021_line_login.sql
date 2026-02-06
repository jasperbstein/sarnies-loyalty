-- Add LINE Login fields to users table
-- LINE Login integration for customer authentication

-- Add LINE-specific columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_id VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_picture_url TEXT;

-- Create index on line_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_line_id ON users(line_id) WHERE line_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.line_id IS 'LINE user ID from LINE Login OAuth';
COMMENT ON COLUMN users.line_display_name IS 'Display name from LINE profile';
COMMENT ON COLUMN users.line_picture_url IS 'Profile picture URL from LINE';
