-- Migration: Create audit_logs table for tracking admin actions
-- Created: 2025-11-26

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,

    -- Who performed the action
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    staff_id INTEGER REFERENCES staff_users(id) ON DELETE SET NULL,
    user_email VARCHAR(255), -- Store email in case user is deleted
    user_name VARCHAR(255),  -- Store name in case user is deleted

    -- What action was performed
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'archive', 'restore', 'approve', 'reject'
    entity_type VARCHAR(50) NOT NULL, -- 'voucher', 'announcement', 'user', 'transaction', 'outlet', etc.
    entity_id INTEGER, -- ID of the affected record

    -- Details of the change
    description TEXT, -- Human-readable description
    changes JSONB, -- Structured data: { before: {...}, after: {...} }
    metadata JSONB, -- Additional context: { ip_address, user_agent, etc. }

    -- When it happened
    created_at TIMESTAMP DEFAULT NOW(),

    -- Severity/importance level
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical'

    -- For filtering
    success BOOLEAN DEFAULT true -- Whether the action succeeded
);

-- Indexes for common queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_staff_id ON audit_logs(staff_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);

-- Composite index for common queries
CREATE INDEX idx_audit_logs_entity_lookup ON audit_logs(entity_type, entity_id, created_at DESC);

-- Add comment
COMMENT ON TABLE audit_logs IS 'Audit trail for tracking all important admin and system actions';
