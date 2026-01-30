import fs from 'fs';
import path from 'path';
import pool from './database';

async function migrate() {
  console.log('Running database migrations...');

  try {
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf-8'
    );

    await pool.query(schemaSQL);
    console.log('✅ Database schema created successfully');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

migrate();
