-- Token blacklist for logout/revocation functionality
-- Stores JTI (JWT ID) of revoked tokens until they would naturally expire

CREATE TABLE IF NOT EXISTS token_blacklist (
    id SERIAL PRIMARY KEY,
    jti VARCHAR(255) NOT NULL UNIQUE,  -- JWT ID to blacklist
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    staff_id INTEGER REFERENCES staff_users(id) ON DELETE CASCADE,
    reason VARCHAR(50) DEFAULT 'logout',  -- logout, password_change, admin_revoke, etc.
    expires_at TIMESTAMP NOT NULL,  -- When the original token would expire
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup during auth
CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(jti);

-- Index for cleanup job
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Cleanup function to remove expired entries (can be called periodically)
-- Tokens that have naturally expired don't need to be in the blacklist
CREATE OR REPLACE FUNCTION cleanup_token_blacklist()
RETURNS void AS $$
BEGIN
    DELETE FROM token_blacklist WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Failed login attempts tracking for security monitoring
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255),
    ip_address VARCHAR(45),  -- Supports IPv6
    user_agent TEXT,
    attempt_type VARCHAR(20) DEFAULT 'staff',  -- staff, customer, admin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for rate limiting and monitoring
CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts(ip_address, created_at);

-- Cleanup old failed attempts (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_failed_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM failed_login_attempts WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
