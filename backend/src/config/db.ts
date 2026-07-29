import mysql from 'mysql2/promise';
import { ENV } from './env';

const sslConfig = ENV.DB_CA_CERT
  ? { ca: ENV.DB_CA_CERT, rejectUnauthorized: true }
  : { rejectUnauthorized: false }; // fallback: encrypts traffic but doesn't verify Aiven's cert

let pool: mysql.Pool;

if (ENV.DATABASE_URL) {
  pool = mysql.createPool({
    uri: ENV.DATABASE_URL,
    ssl: sslConfig,
  });
} else {
  pool = mysql.createPool({
    host: ENV.DB_HOST,
    port: ENV.DB_PORT,
    user: ENV.DB_USER,
    password: ENV.DB_PASSWORD,
    database: ENV.DB_NAME,
    ssl: sslConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

export { pool };
export default pool;