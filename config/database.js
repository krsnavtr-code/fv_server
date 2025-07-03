require('dotenv').config();

exports.dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',  // Default empty password for XAMPP
  database: 'firstvite',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
