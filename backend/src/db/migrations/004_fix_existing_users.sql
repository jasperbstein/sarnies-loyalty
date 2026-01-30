-- Fix existing users - mark them as registration completed
-- Only new users (created after this migration) should go through registration

UPDATE users 
SET registration_completed = true 
WHERE created_at < NOW() AND registration_completed = false;

-- This ensures existing users can login directly without registration
