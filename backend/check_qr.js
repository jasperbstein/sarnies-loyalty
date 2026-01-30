const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sarnies_loyalty',
  user: process.env.DB_USER || 'kacperblonski',
  password: process.env.DB_PASSWORD || ''
});

(async () => {
  const result = await pool.query('SELECT id, LENGTH(static_qr_code) as token_length, LENGTH(static_qr_image) as image_length, static_qr_created_at FROM users LIMIT 3');
  console.log('QR Data Check:');
  console.table(result.rows);
  await pool.end();
})();
