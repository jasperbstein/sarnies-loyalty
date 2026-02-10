-- Migration 031: Collab Offers
-- Cross-company partnership feature for sharing promotional offers

-- ============================================
-- Company Partnerships (which companies can collaborate)
-- ============================================
CREATE TABLE IF NOT EXISTS company_partnerships (
  id SERIAL PRIMARY KEY,
  company_a_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_b_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES staff_users(id),
  UNIQUE(company_a_id, company_b_id),
  -- Prevent self-partnerships
  CONSTRAINT no_self_partnership CHECK (company_a_id <> company_b_id)
);

-- Index for querying partnerships by company
CREATE INDEX IF NOT EXISTS idx_partnerships_company_a ON company_partnerships(company_a_id, is_active);
CREATE INDEX IF NOT EXISTS idx_partnerships_company_b ON company_partnerships(company_b_id, is_active);

COMMENT ON TABLE company_partnerships IS 'Defines which companies can share collab offers with each other';
COMMENT ON COLUMN company_partnerships.company_a_id IS 'First company in the partnership';
COMMENT ON COLUMN company_partnerships.company_b_id IS 'Second company in the partnership';

-- ============================================
-- Collab Offers
-- ============================================
CREATE TABLE IF NOT EXISTS collab_offers (
  id SERIAL PRIMARY KEY,

  -- Who creates/gives the offer
  offering_company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Whose customers see it
  target_company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Offer details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL,
  discount_value INTEGER NOT NULL,
  image_url VARCHAR(500),
  terms TEXT,

  -- Limits
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  max_redemptions INTEGER,
  max_per_user INTEGER DEFAULT 1,
  redemptions_count INTEGER DEFAULT 0,

  -- Approval workflow
  status VARCHAR(20) DEFAULT 'pending',
  rejection_reason TEXT,
  approved_at TIMESTAMP,
  approved_by INTEGER REFERENCES staff_users(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES staff_users(id),

  -- Constraints
  CONSTRAINT valid_discount_type CHECK (discount_type IN ('percentage', 'fixed', 'free_item')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'rejected', 'paused', 'expired')),
  CONSTRAINT valid_dates CHECK (valid_until >= valid_from),
  CONSTRAINT positive_discount CHECK (discount_value > 0),
  CONSTRAINT no_self_offer CHECK (offering_company_id <> target_company_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_collab_offers_target ON collab_offers(target_company_id, status);
CREATE INDEX IF NOT EXISTS idx_collab_offers_offering ON collab_offers(offering_company_id, status);
CREATE INDEX IF NOT EXISTS idx_collab_offers_validity ON collab_offers(valid_from, valid_until) WHERE status = 'active';

COMMENT ON TABLE collab_offers IS 'Partnership offers created by one company for another company''s customers';
COMMENT ON COLUMN collab_offers.offering_company_id IS 'Company that creates and honors the offer';
COMMENT ON COLUMN collab_offers.target_company_id IS 'Company whose customers can see and redeem the offer';
COMMENT ON COLUMN collab_offers.discount_type IS 'Type: percentage, fixed amount, or free_item';

-- ============================================
-- Collab Redemptions (track who used what)
-- ============================================
CREATE TABLE IF NOT EXISTS collab_redemptions (
  id SERIAL PRIMARY KEY,
  collab_offer_id INTEGER NOT NULL REFERENCES collab_offers(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP DEFAULT NOW(),
  redeemed_at_outlet VARCHAR(255),
  staff_id INTEGER REFERENCES staff_users(id),
  notes TEXT
);

-- Indexes for redemption queries
CREATE INDEX IF NOT EXISTS idx_collab_redemptions_user ON collab_redemptions(user_id, collab_offer_id);
CREATE INDEX IF NOT EXISTS idx_collab_redemptions_offer ON collab_redemptions(collab_offer_id, redeemed_at DESC);

COMMENT ON TABLE collab_redemptions IS 'Records of collab offer redemptions by users';

-- ============================================
-- Trigger to update updated_at on collab_offers
-- ============================================
CREATE OR REPLACE FUNCTION update_collab_offer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_collab_offer_updated ON collab_offers;
CREATE TRIGGER trigger_collab_offer_updated
  BEFORE UPDATE ON collab_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_collab_offer_timestamp();

-- ============================================
-- Function to check if partnership exists (bidirectional)
-- ============================================
CREATE OR REPLACE FUNCTION check_partnership_exists(company_1 INTEGER, company_2 INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM company_partnerships
    WHERE is_active = true
    AND (
      (company_a_id = company_1 AND company_b_id = company_2)
      OR (company_a_id = company_2 AND company_b_id = company_1)
    )
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_partnership_exists IS 'Checks if an active partnership exists between two companies (bidirectional)';
