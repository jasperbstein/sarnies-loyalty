-- Drop tables if they exist (in reverse order due to foreign keys)
DROP TABLE IF EXISTS voucher_instances CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS otp_sessions CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS staff_users CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (customers)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100),
    phone VARCHAR(20) UNIQUE NOT NULL,
    birthday VARCHAR(10), -- DD-MM format as per spec
    company VARCHAR(100),
    gender VARCHAR(20),
    static_qr_code TEXT, -- Permanent JWT token for user identification
    static_qr_image TEXT, -- Pre-generated QR code image (data URL)
    static_qr_created_at TIMESTAMP, -- When QR was generated
    points_balance INTEGER DEFAULT 0 NOT NULL,
    total_spend DECIMAL(10,2) DEFAULT 0,
    total_purchases_count INTEGER DEFAULT 0,
    member_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff users table (must be before transactions)
CREATE TABLE staff_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vouchers table (rewards catalog)
CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image_url TEXT,
    points_required INTEGER NOT NULL DEFAULT 0,
    cash_value DECIMAL(10,2),
    voucher_type VARCHAR(50) NOT NULL CHECK (voucher_type IN ('free_item', 'discount_amount', 'percentage_discount', 'merch')),
    expiry_type VARCHAR(20) DEFAULT 'no_expiry' CHECK (expiry_type IN ('fixed_date', 'no_expiry', 'days_after_redeem')),
    expiry_date TIMESTAMP,
    expiry_days INTEGER, -- Days after redemption
    is_staff_voucher BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    target_user_types TEXT[], -- Array of user types: ['customer', 'staff', 'admin', 'employee']
    valid_stores TEXT[], -- Array of store codes: ['SUK', 'OLD', 'ROASTERY']
    rules TEXT,
    limitations TEXT,
    -- Additional voucher settings
    category VARCHAR(100),
    benefit_type VARCHAR(50) DEFAULT 'free_item',
    benefit_value NUMERIC(10,2),
    max_redemptions_per_user INTEGER,
    max_redemptions_total INTEGER,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    redemption_window VARCHAR(50) DEFAULT 'unlimited', -- Values: 'unlimited', 'once_per_day', 'once_per_week', etc.
    requires_minimum_purchase NUMERIC(10,2),
    valid_days_of_week INTEGER[],
    valid_outlets INTEGER[],
    auto_expire_hours INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'redeem', 'grant')),
    points_delta INTEGER NOT NULL,
    amount_value DECIMAL(10,2),
    voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL,
    outlet VARCHAR(100),
    staff_id INTEGER REFERENCES staff_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP sessions table
CREATE TABLE otp_sessions (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voucher instances (tracks redeemed vouchers with QR codes)
CREATE TABLE voucher_instances (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voucher_id INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    qr_code_data TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_by_staff_id INTEGER REFERENCES staff_users(id) ON DELETE SET NULL,
    used_at_outlet VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Announcements table (news, promotions, updates)
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image_url TEXT,
    image_url_full TEXT,
    announcement_type VARCHAR(50) DEFAULT 'news' CHECK (announcement_type IN ('news', 'promotion', 'new_product', 'seasonal', 'announcement')),
    cta_text VARCHAR(100), -- Call to action text
    cta_link VARCHAR(255), -- Call to action link
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    target_user_types TEXT[], -- Array of user types: ['customer', 'staff', 'admin']
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_vouchers_is_active ON vouchers(is_active);
CREATE INDEX idx_vouchers_is_staff ON vouchers(is_staff_voucher);
CREATE INDEX idx_vouchers_is_featured ON vouchers(is_featured);
CREATE INDEX idx_vouchers_redemption_window ON vouchers(redemption_window);
CREATE INDEX idx_otp_phone ON otp_sessions(phone);
CREATE INDEX idx_otp_expires ON otp_sessions(expires_at);
CREATE INDEX idx_staff_email ON staff_users(email);
CREATE INDEX idx_voucher_instances_user_id ON voucher_instances(user_id);
CREATE INDEX idx_voucher_instances_status ON voucher_instances(status);
CREATE INDEX idx_voucher_instances_uuid ON voucher_instances(uuid);
CREATE INDEX idx_announcements_active ON announcements(is_active);
CREATE INDEX idx_announcements_dates ON announcements(start_date, end_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON vouchers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_users_updated_at BEFORE UPDATE ON staff_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
