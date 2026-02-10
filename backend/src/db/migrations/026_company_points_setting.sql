-- Migration 026: Add users_collect_points to companies
-- This determines whether company members earn/spend points or just get perks

-- Add the column with default true (backward compatible)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS users_collect_points BOOLEAN DEFAULT true;

-- Comment for documentation
COMMENT ON COLUMN companies.users_collect_points IS
'If true, company members earn and spend points like regular customers. If false, they only get free perks (employee discounts, daily drinks, etc.)';

-- Update vouchers table to support company-exclusive vouchers better
-- Add index for faster company voucher lookups
CREATE INDEX IF NOT EXISTS idx_vouchers_company_exclusive
ON vouchers(is_company_exclusive, company_id)
WHERE is_company_exclusive = true;

-- Add index for allowed_company_ids array lookup (GIN index for array containment)
CREATE INDEX IF NOT EXISTS idx_vouchers_allowed_companies
ON vouchers USING GIN (allowed_company_ids)
WHERE allowed_company_ids IS NOT NULL AND allowed_company_ids != '{}';
