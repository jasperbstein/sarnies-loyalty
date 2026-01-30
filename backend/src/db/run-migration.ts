import { query } from './database';
import * as fs from 'fs';
import * as path from 'path';

const runMigration = async (migrationFile: string) => {
  try {
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`Running migration: ${migrationFile}`);
    await query(sql);
    console.log(`✅ Migration ${migrationFile} completed successfully`);
  } catch (error) {
    console.error(`❌ Migration ${migrationFile} failed:`, error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: ts-node run-migration.ts <migration-file.sql>');
  process.exit(1);
}

runMigration(migrationFile);
