-- Migration: Add outlets table with geolocation support
-- Date: 2025-11-20

-- Create outlets table
CREATE TABLE IF NOT EXISTS outlets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  phone VARCHAR(20),
  opening_hours TEXT,
  is_active BOOLEAN DEFAULT true,
  notification_radius_meters INTEGER DEFAULT 500,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for geolocation queries
CREATE INDEX idx_outlets_location ON outlets(latitude, longitude);
CREATE INDEX idx_outlets_active ON outlets(is_active);

-- Add location preferences to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS location_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_known_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS last_known_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP;

-- Insert sample outlets (Bangkok locations)
INSERT INTO outlets (name, address, latitude, longitude, phone, opening_hours, notification_radius_meters) VALUES
('Sarnies Sukhumvit', '123 Sukhumvit Soi 55, Khlong Tan Nuea, Watthana, Bangkok 10110', 13.736717, 100.571159, '+66 2 123 4567', 'Mon-Sun: 7:00-22:00', 500),
('Sarnies Silom', '456 Silom Road, Suriya Wong, Bang Rak, Bangkok 10500', 13.726717, 100.531159, '+66 2 234 5678', 'Mon-Sun: 7:00-22:00', 500),
('Sarnies Thonglor', '789 Thonglor Soi 10, Khlong Tan Nuea, Watthana, Bangkok 10110', 13.736000, 100.585000, '+66 2 345 6789', 'Mon-Sun: 7:00-23:00', 500);

COMMENT ON TABLE outlets IS 'Physical outlet locations with geolocation data';
COMMENT ON COLUMN outlets.notification_radius_meters IS 'Distance in meters to trigger proximity notifications';
COMMENT ON COLUMN users.location_enabled IS 'User has granted location permission';
COMMENT ON COLUMN users.notification_enabled IS 'User wants proximity notifications';
