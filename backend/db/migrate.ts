import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { seedDatabase } from './seed';

dotenv.config();

async function migrate() {
  console.log('🚀 Connecting to MySQL server for migrations...');

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  const dbName = process.env.DB_NAME || 'mini_erp_crm';

  let connection;
  try {
    // 1. Connect without DB selected to ensure Database exists
    connection = await mysql.createConnection(dbConfig);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.query(`USE \`${dbName}\`;`);
    console.log(`✅ Connected & selected database: "${dbName}"`);

    // 2. Read and run schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Executing database schema migrations...');
    await connection.query(sql);
    console.log('✅ Schema migration executed successfully.');

    // 3. Seed data
    await seedDatabase(connection);

    console.log('✨ All migrations and seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
