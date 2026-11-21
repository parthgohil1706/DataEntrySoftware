import mysql from 'mysql2/promise';

let pool = null;
let isInitialized = false;

export async function getDbPool(env = process.env) {
  if (pool) return pool;

  const host = env.MYSQL_HOST || '127.0.0.1';
  const port = parseInt(env.MYSQL_PORT || '3306', 10);
  const user = env.MYSQL_USER || 'root';
  const password = env.MYSQL_PASSWORD || '';
  const database = env.MYSQL_DATABASE || 'quickentry_db';

  try {
    // 1. First connect to MySQL server to ensure database exists
    const rootConn = await mysql.createConnection({
      host,
      port,
      user,
      password
    });

    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await rootConn.end();

    // 2. Connect to the database pool
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 3. Auto-create tables if they do not exist
    if (!isInitialized) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS app_users (
          id VARCHAR(64) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          reset_otp JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS sheets (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          name VARCHAR(255) NOT NULL,
          columns JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_sheets_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS records (
          id VARCHAR(64) PRIMARY KEY,
          sheet_id VARCHAR(64) NOT NULL,
          user_id VARCHAR(64) NOT NULL,
          data JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_records_sheet_user (sheet_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      isInitialized = true;
      console.log(`[MySQL] Connected successfully to "${database}" at ${host}:${port}`);
    }

    return pool;
  } catch (err) {
    console.warn(`[MySQL Warning] Could not connect to MySQL at ${host}:${port}. Reason:`, err.message);
    return null;
  }
}
