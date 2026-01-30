import bcrypt from 'bcrypt';
import pool from './database';
import { generateStaticQR } from '../utils/qrCode';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO staff_users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@sarnies.com', adminPassword, 'Admin User', 'admin']
    );
    console.log('✅ Admin user created (admin@sarnies.com / admin123)');

    // Create staff user
    const staffPassword = await bcrypt.hash('staff123', 10);
    await pool.query(
      `INSERT INTO staff_users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['staff@sarnies.com', staffPassword, 'Staff User', 'staff']
    );
    console.log('✅ Staff user created (staff@sarnies.com / staff123)');

    // Create sample vouchers with new fields
    const vouchers = [
      {
        title: 'Free Espresso',
        description: 'Redeem for a complimentary espresso shot, perfectly pulled from our house blend.',
        image_url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400',
        points_required: 25,
        cash_value: 80.00,
        voucher_type: 'free_item',
        expiry_type: 'no_expiry',
        is_staff_voucher: false,
        is_featured: true,
        valid_stores: ['SUK', 'OLD', 'ROASTERY'],
        rules: 'One redemption per visit. Cannot be combined with other offers.',
        limitations: 'Valid for regular espresso only'
      },
      {
        title: 'Free Latte',
        description: 'Get any size latte with your choice of milk — oat, almond, or dairy.',
        image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
        points_required: 50,
        cash_value: 120.00,
        voucher_type: 'free_item',
        expiry_type: 'no_expiry',
        is_staff_voucher: false,
        is_featured: true,
        valid_stores: ['SUK', 'OLD'],
        rules: 'Includes any milk alternative at no extra charge.',
        limitations: 'Not valid for specialty lattes'
      },
      {
        title: '฿50 Discount',
        description: '฿50 off your total purchase. Perfect for grabbing lunch with coffee.',
        image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
        points_required: 30,
        cash_value: 50.00,
        voucher_type: 'discount_amount',
        expiry_type: 'days_after_redeem',
        expiry_days: 30,
        is_staff_voucher: false,
        is_featured: false,
        valid_stores: ['SUK', 'OLD', 'ROASTERY'],
        rules: 'Minimum purchase ฿100 required.',
        limitations: 'Cannot be used on merchandise'
      },
      {
        title: 'Free Sandwich',
        description: 'Choose any signature sandwich from our menu — made fresh daily.',
        image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400',
        points_required: 100,
        cash_value: 180.00,
        voucher_type: 'free_item',
        expiry_type: 'no_expiry',
        is_staff_voucher: false,
        is_featured: true,
        valid_stores: ['SUK', 'OLD'],
        rules: 'Valid for any sandwich on the regular menu.',
        limitations: 'Excludes seasonal specials'
      },
      {
        title: '฿100 Discount',
        description: '฿100 off your order. Great for stocking up on coffee beans or trying new items.',
        image_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
        points_required: 60,
        cash_value: 100.00,
        voucher_type: 'discount_amount',
        expiry_type: 'days_after_redeem',
        expiry_days: 60,
        is_staff_voucher: false,
        is_featured: false,
        valid_stores: ['SUK', 'OLD', 'ROASTERY'],
        rules: 'Minimum purchase ฿200 required.',
        limitations: 'One per transaction'
      },
      {
        title: 'Sarnies Tote Bag',
        description: 'Limited edition Sarnies canvas tote bag. Sustainable and stylish.',
        image_url: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400',
        points_required: 200,
        cash_value: 350.00,
        voucher_type: 'merch',
        expiry_type: 'no_expiry',
        is_staff_voucher: false,
        is_featured: true,
        valid_stores: ['SUK', 'OLD', 'ROASTERY'],
        rules: 'Subject to availability. While stocks last.',
        limitations: 'Limited to 2 per customer'
      },
      {
        title: '250g Coffee Beans',
        description: 'Take home 250g of our freshly roasted house blend or single origin.',
        image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
        points_required: 150,
        cash_value: 280.00,
        voucher_type: 'free_item',
        expiry_type: 'no_expiry',
        is_staff_voucher: false,
        is_featured: false,
        valid_stores: ['ROASTERY', 'SUK'],
        rules: 'Choice of house blend or rotating single origin.',
        limitations: 'Roastery exclusive blends not included'
      },
      {
        title: 'Staff Meal Voucher',
        description: 'Staff only — complimentary meal and drink during shift.',
        image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
        points_required: 0,
        cash_value: 0,
        voucher_type: 'free_item',
        expiry_type: 'no_expiry',
        is_staff_voucher: true,
        is_featured: false,
        valid_stores: ['SUK', 'OLD', 'ROASTERY'],
        rules: 'Staff only. Must be redeemed during shift.',
        limitations: 'One per shift'
      }
    ];

    for (const voucher of vouchers) {
      await pool.query(
        `INSERT INTO vouchers (
          title, description, image_url, points_required, cash_value,
          voucher_type, expiry_type, expiry_days, is_staff_voucher,
          is_active, is_featured, valid_stores, rules, limitations
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          voucher.title,
          voucher.description,
          voucher.image_url,
          voucher.points_required,
          voucher.cash_value,
          voucher.voucher_type,
          voucher.expiry_type,
          voucher.expiry_days || null,
          voucher.is_staff_voucher,
          true, // is_active
          voucher.is_featured,
          voucher.valid_stores,
          voucher.rules,
          voucher.limitations
        ]
      );
    }
    console.log('✅ Sample vouchers created (8 rewards including 1 staff-only)');

    // Create announcements (using local high-quality images with fallbacks)
    const announcements = [
      {
        title: 'New Ethiopian Single Origin',
        description: 'Try our latest single origin from Yirgacheffe — bright, floral notes with hints of bergamot.',
        image_url: '/images/announcements/coffee-beans.jpg',
        image_url_full: '/images/announcements/coffee-beans-full.jpg',
        announcement_type: 'new_product',
        cta_text: 'Order Now',
        cta_link: null,
        display_order: 1
      },
      {
        title: 'Double Points Weekend',
        description: 'Earn 2x points on all purchases this Saturday and Sunday!',
        image_url: '/images/announcements/cafe-interior.jpg',
        image_url_full: '/images/announcements/cafe-interior-full.jpg',
        announcement_type: 'promotion',
        cta_text: 'Learn More',
        cta_link: null,
        display_order: 2
      },
      {
        title: 'New Menu Items',
        description: 'Check out our seasonal menu with fresh sandwiches and pastries made daily.',
        image_url: '/images/announcements/new-menu.jpg',
        image_url_full: '/images/announcements/new-menu-full.jpg',
        announcement_type: 'announcement',
        cta_text: 'View Menu',
        cta_link: null,
        display_order: 3
      }
    ];

    for (const announcement of announcements) {
      await pool.query(
        `INSERT INTO announcements (
          title, description, image_url, image_url_full, announcement_type,
          cta_text, cta_link, is_active, display_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          image_url = EXCLUDED.image_url,
          image_url_full = EXCLUDED.image_url_full`,
        [
          announcement.title,
          announcement.description,
          announcement.image_url,
          announcement.image_url_full,
          announcement.announcement_type,
          announcement.cta_text,
          announcement.cta_link,
          true,
          announcement.display_order
        ]
      );
    }
    console.log('✅ Announcements created (3 active)');

    // Create test customers with static QR codes
    const testCustomers = [
      { name: 'Khin', surname: 'Myat', phone: '+66812345678', birthday: '15-01', company: 'Sarnies', gender: 'female', points: 150 },
      { name: 'Som', surname: 'Thai', phone: '+66898765432', birthday: '22-05', company: 'Tech Startup', gender: 'male', points: 75 },
      { name: 'Alex', surname: 'Chen', phone: '+66887654321', birthday: '08-11', company: 'Creative Agency', gender: 'non-binary', points: 200 }
    ];

    for (const customer of testCustomers) {
      const result = await pool.query(
        `INSERT INTO users (name, surname, phone, birthday, company, gender, points_balance, static_qr_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (phone) DO UPDATE
         SET static_qr_code = EXCLUDED.static_qr_code
         RETURNING id`,
        [
          customer.name,
          customer.surname,
          customer.phone,
          customer.birthday,
          customer.company,
          customer.gender,
          customer.points,
          '' // Placeholder, will update below
        ]
      );

      const userId = result.rows[0].id;
      const staticQR = await generateStaticQR(userId);

      await pool.query(
        `UPDATE users SET static_qr_code = $1, static_qr_image = $2, static_qr_created_at = $3 WHERE id = $4`,
        [staticQR.token, staticQR.dataUrl, staticQR.createdAt, userId]
      );
    }
    console.log('✅ Test customers created (3 users with static QR codes)');

    await pool.end();
    console.log('✅ Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await pool.end();
    process.exit(1);
  }
}

seed();
