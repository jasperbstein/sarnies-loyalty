-- Sarnies News & Announcements
-- Created: December 2025
-- Purpose: Add news items showcasing Unicode capability and IG posts

-- 1. Unicode Article - Thailand Geisha Coffee (Award-Winning)
INSERT INTO announcements (
    title,
    description,
    image_url,
    announcement_type,
    cta_text,
    cta_link,
    is_active,
    display_order,
    target_user_types,
    start_date,
    created_at
) VALUES (
    '🏆 Limited Release: Thailand Geisha ชาไทย',
    'Award-winning Thailand Geisha from Nan, Lao Tua farm ฟาร์มเล่าตัว — 3rd place at Thailand Specialty Coffee Awards 2025 🇹🇭 Taste notes: Jasmine มะลิ, Bergamot, Citrus, Peach พีช. Now available in 80g limited-edition tins.',
    'https://images.unsplash.com/photo-1610632380900-87f2f7d80669?w=800&q=80',
    'new_product',
    'Shop Now',
    'https://sarnies.com/shop',
    true,
    1,
    ARRAY['customer'],
    NOW(),
    NOW()
);

-- 2. Flood Relief Donation Campaign
INSERT INTO announcements (
    title,
    description,
    image_url,
    announcement_type,
    cta_text,
    cta_link,
    is_active,
    display_order,
    target_user_types,
    start_date,
    created_at
) VALUES (
    'Supporting Southern Thailand Flood Relief',
    'For the next 7 days, THB 10 from every coffee sold across all Sarnies outlets will be donated to the Raks Thai Foundation to support on-ground relief efforts in Southern Thailand. Every cup makes a difference.',
    'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80',
    'announcement',
    'Learn More',
    'https://raksthai.org',
    true,
    2,
    ARRAY['customer'],
    NOW(),
    NOW()
);

-- 3. Christmas Specials 2025
INSERT INTO announcements (
    title,
    description,
    image_url,
    announcement_type,
    cta_text,
    cta_link,
    is_active,
    display_order,
    target_user_types,
    start_date,
    end_date,
    created_at
) VALUES (
    '🎄 Christmas Specials Are Here!',
    'Christmas is one of our favourite seasons! Enjoy our Signature Festive line-up: Freshly baked Mini Panettone ✨ Mince Pies ✨ Jolly Joe Coffee & Cold Brew ✨ Christmas Toastie ✨ Fruit Cake. Available at all Sarnies outlets until 31 December!',
    'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=800&q=80',
    'seasonal',
    'View Menu',
    'https://sarnies.com/christmas',
    true,
    3,
    ARRAY['customer'],
    NOW(),
    '2025-12-31 23:59:59',
    NOW()
);

-- 4. New Limited Thai Coffee Origin
INSERT INTO announcements (
    title,
    description,
    image_url,
    announcement_type,
    cta_text,
    cta_link,
    is_active,
    display_order,
    target_user_types,
    start_date,
    created_at
) VALUES (
    'Discover Thailand Coffee Excellence',
    'Our Limited Release features exceptional Thai coffee from Nan Province. Hand-picked, naturally processed, and roasted to perfection. Experience flavors of orange blossom, stone fruit, and jasmine in every cup.',
    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80',
    'new_product',
    'Order Online',
    'https://sarnies.com/limited-release',
    true,
    4,
    ARRAY['customer'],
    NOW(),
    NOW()
);

-- Update announcement types to match current system
-- Note: The schema shows types: 'news', 'promotion', 'new_product', 'seasonal', 'announcement'
