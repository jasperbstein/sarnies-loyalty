-- Migration 011: Tier Perks Implementation
-- Silver: early menu access
-- Gold: free monthly drink

-- ==========================================
-- 1. Add min_tier_level to vouchers
-- ==========================================
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS min_tier_level VARCHAR(20) DEFAULT NULL
  CHECK (min_tier_level IS NULL OR min_tier_level IN ('Bronze', 'Silver', 'Gold'));

COMMENT ON COLUMN vouchers.min_tier_level IS 'Minimum tier required to see/redeem this voucher (NULL = all tiers)';

-- ==========================================
-- 2. Add tracking for Gold monthly voucher
-- ==========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_gold_monthly_voucher_at TIMESTAMP DEFAULT NULL;

COMMENT ON COLUMN users.last_gold_monthly_voucher_at IS 'Last time Gold member received their free monthly drink';

-- ==========================================
-- 3. Add app_settings for tier perks
-- ==========================================
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_editable) VALUES
  ('gold_monthly_voucher_id', NULL, 'number', 'Voucher ID for Gold monthly free drink', true),
  ('silver_early_access_days', '3', 'number', 'Days before launch Silver members can see new items', true)
ON CONFLICT (setting_key) DO NOTHING;

-- ==========================================
-- 4. Create Gold Monthly Drink Voucher
-- ==========================================
INSERT INTO vouchers (
  title,
  description,
  points_required,
  voucher_type,
  is_free,
  is_active,
  target_user_types,
  min_tier_level,
  recurrence_type,
  recurrence_interval,
  auto_generate,
  category,
  expiry_type,
  expiry_days,
  benefit_type,
  benefit_value
) VALUES (
  'Gold Member Monthly Drink',
  'Your complimentary drink as a Gold member. Available once per month.',
  0,
  'product',
  true,
  true,
  ARRAY['customer'],
  'Gold',
  'monthly',
  1,
  true,
  'drinks',
  'days_after_redeem',
  30,
  'free_item',
  1
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Store the voucher ID in settings (run after knowing the ID)
-- UPDATE app_settings SET setting_value = '<voucher_id>' WHERE setting_key = 'gold_monthly_voucher_id';

-- ==========================================
-- 5. Create Silver Early Access Announcement vouchers
-- (These will be regular vouchers marked with early_access flag)
-- ==========================================
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_early_access BOOLEAN DEFAULT false;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS early_access_date DATE DEFAULT NULL;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS public_release_date DATE DEFAULT NULL;

COMMENT ON COLUMN vouchers.is_early_access IS 'Silver+ members can see before public release';
COMMENT ON COLUMN vouchers.early_access_date IS 'Date Silver+ members can access this voucher';
COMMENT ON COLUMN vouchers.public_release_date IS 'Date all members can access this voucher';

-- ==========================================
-- 6. Function to check if user can access voucher based on tier
-- ==========================================
CREATE OR REPLACE FUNCTION can_user_access_voucher(
  p_user_tier VARCHAR(20),
  p_voucher_min_tier VARCHAR(20),
  p_is_early_access BOOLEAN,
  p_early_access_date DATE,
  p_public_release_date DATE
) RETURNS BOOLEAN AS $$
DECLARE
  tier_rank INTEGER;
  min_tier_rank INTEGER;
BEGIN
  -- Tier ranking: Bronze=1, Silver=2, Gold=3
  tier_rank := CASE p_user_tier
    WHEN 'Gold' THEN 3
    WHEN 'Silver' THEN 2
    ELSE 1
  END;

  -- Check min tier requirement
  IF p_voucher_min_tier IS NOT NULL THEN
    min_tier_rank := CASE p_voucher_min_tier
      WHEN 'Gold' THEN 3
      WHEN 'Silver' THEN 2
      ELSE 1
    END;
    IF tier_rank < min_tier_rank THEN
      RETURN false;
    END IF;
  END IF;

  -- Check early access
  IF p_is_early_access AND p_public_release_date IS NOT NULL THEN
    IF CURRENT_DATE < p_public_release_date THEN
      -- Not yet public, check if Silver+ and after early access date
      IF tier_rank >= 2 AND (p_early_access_date IS NULL OR CURRENT_DATE >= p_early_access_date) THEN
        RETURN true;
      ELSE
        RETURN false;
      END IF;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
