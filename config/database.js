require('dotenv').config();

exports.dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',  // Default empty password for XAMPP
  database: 'firsevite',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
