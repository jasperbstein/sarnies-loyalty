const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function resetAdminPassword() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'loyalty_db',
    user: 'loyalty_user',
    password: 'loyalty_pass'
  });

  try {
    await client.connect();

    // Hash the new password: Admin123!
    const passwordHash = await bcrypt.hash('Admin123!', 10);

    // Update admin password
    await client.query(
      'UPDATE staff_users SET password_hash = $1 WHERE email = $2',
      [passwordHash, 'admin@sarnies.com']
    );

    console.log('✅ Admin password reset successfully to: Admin123!');
    console.log('   Email: admin@sarnies.com');
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await client.end();
  }
}

resetAdminPassword();
