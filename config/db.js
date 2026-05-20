const mysql = require('mysql2/promise');

let dbPool = null;
let fallbackMode = false;
require('dotenv').config();

async function initDb() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const port = process.env.DB_PORT || 3306;
  const database = process.env.DB_NAME || 'gps_tracker';

  console.log(`Attempting to connect to MySQL on ${host}:${port} as ${user}...`);

  // Connect without DB name first to check/create DB
  const connection = await mysql.createConnection({ host, user, password, port });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await connection.end();

  // Create pool
  dbPool = mysql.createPool({
    host,
    user,
    password,
    port,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Verify connection and create tables
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS sharing_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      mobile VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      ip VARCHAR(100),
      battery VARCHAR(50),
      start_time DATETIME NOT NULL,
      end_time DATETIME NULL
    )
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS otp_records (
      email VARCHAR(255) PRIMARY KEY,
      otp VARCHAR(10) NOT NULL,
      expires_at DATETIME NOT NULL
    )
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      mobile VARCHAR(50) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('MySQL Database and tables initialized successfully!');
  return dbPool;
}

const initPromise = initDb().catch(err => {
  console.warn('⚠️ WARNING: Could not connect to MySQL database.');
  console.warn(err.message);
  console.log('👉 Falling back to IN-MEMORY operations for development/testing.');
  fallbackMode = true;
  return null;
});

module.exports = {
  getPool: () => dbPool,
  isFallback: () => fallbackMode,
  initPromise
};
