import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'srv1429.hstgr.io',
  user: process.env.MYSQL_USER || 'u226633699_kitsu',
  password: process.env.MYSQL_PASSWORD || 'K1tsUwU&2002',
  database: process.env.MYSQL_DATABASE || 'u226633699_sdk',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection on startup
pool.getConnection()
  .then(connection => {
    console.log('Connected to MySQL database');
    connection.release();
  })
  .catch(err => {
    console.error('Failed to connect to MySQL:', err.message);
  });

export default pool;

// Helper function to execute queries
export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const [results] = await pool.execute(sql, params);
  return results as T;
}

// Initialize database tables
export async function initDatabase() {
  try {
    // Create users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        profile_picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username)
      )
    `);

    // Create game_records table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS game_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        difficulty ENUM('easy', 'medium', 'hard', 'extreme') NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        won BOOLEAN DEFAULT FALSE,
        time_seconds INT NOT NULL,
        score INT DEFAULT 0,
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_user_difficulty (user_id, difficulty),
        INDEX idx_played_at (played_at)
      )
    `);

    // Create daily_challenge_completions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS daily_challenge_completions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        date_string VARCHAR(10) NOT NULL,
        time_seconds INT NOT NULL,
        score INT DEFAULT 0,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_date (user_id, date_string),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_date (date_string)
      )
    `);

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

