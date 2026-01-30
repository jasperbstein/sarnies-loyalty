-- Migration 003: Branding Settings
-- Creates table for storing customizable branding elements

CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string', -- string, color, url, number, boolean
  description TEXT,
  is_editable BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default branding settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description) VALUES
  -- Logo
  ('logo_url', NULL, 'url', 'Main logo URL displayed in the app'),
  ('logo_alt_text', 'Sarnies Loyalty', 'string', 'Alt text for the logo'),

  -- Primary Brand Colors
  ('color_primary', '#8B5CF6', 'color', 'Primary brand color (buttons, accents)'),
  ('color_primary_dark', '#7C3AED', 'color', 'Darker shade of primary color (hover states)'),
  ('color_primary_light', '#A78BFA', 'color', 'Lighter shade of primary color (backgrounds)'),

  -- Secondary Colors
  ('color_secondary', '#10B981', 'color', 'Secondary color (success, positive actions)'),
  ('color_accent', '#F59E0B', 'color', 'Accent color (highlights, badges)'),

  -- Text Colors
  ('color_text_primary', '#1F2937', 'color', 'Primary text color'),
  ('color_text_secondary', '#6B7280', 'color', 'Secondary text color'),

  -- Background Colors
  ('color_background', '#FFFFFF', 'color', 'Main background color'),
  ('color_background_secondary', '#F9FAFB', 'color', 'Secondary background color'),

  -- Button Styles
  ('button_border_radius', '8', 'number', 'Button border radius in pixels'),
  ('button_font_weight', '600', 'number', 'Button font weight'),

  -- Card Styles
  ('card_border_radius', '12', 'number', 'Card border radius in pixels'),
  ('card_shadow', '0 1px 3px 0 rgb(0 0 0 / 0.1)', 'string', 'Card shadow CSS value'),

  -- App Name & Info
  ('app_name', 'Sarnies Loyalty', 'string', 'Application name'),
  ('app_tagline', 'Earn rewards with every visit', 'string', 'Application tagline'),
  ('contact_email', 'support@sarnies.com', 'string', 'Support contact email'),
  ('contact_phone', '+66 2 XXX XXXX', 'string', 'Support contact phone'),

  -- Points Configuration
  ('points_per_100_thb', '1', 'number', 'Points earned per 100 THB spent'),
  ('points_multiplier_enabled', 'false', 'boolean', 'Enable points multiplier events')
ON CONFLICT (setting_key) DO NOTHING;

-- Create index on setting_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();
