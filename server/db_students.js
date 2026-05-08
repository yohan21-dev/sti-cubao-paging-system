require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:             process.env.STU_DB_HOST     || process.env.DB_HOST     || 'localhost',
  user:             process.env.STU_DB_USER     || process.env.DB_USER     || 'root',
  password:         process.env.STU_DB_PASSWORD || process.env.DB_PASSWORD || '',
  database:         process.env.STU_DB_NAME     || 'sti_cubao',
  waitForConnections: true,
  connectionLimit:  5,
  queueLimit:       0,
  charset:          'utf8mb4',
});

module.exports = pool;