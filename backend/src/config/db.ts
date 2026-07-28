import mysql from 'mysql2/promise';
import { ENV } from './env';

let pool: mysql.Pool;

if (ENV.DATABASE_URL) {
  pool = mysql.createPool(ENV.DATABASE_URL);
} else {
  pool = mysql.createPool({
    host: ENV.DB_HOST,
    port: ENV.DB_PORT,
    user: ENV.DB_USER,
    password: ENV.DB_PASSWORD,
    database: ENV.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

export { pool };
export default pool;
