import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const runMigration = async () => {
  try {
    console.log('Connecting to database:', process.env.DB_HOST);
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('Connected! Creating user_activity_log table...');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_activity_log (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL,
          role ENUM('Admin', 'Operator', 'Technician') NOT NULL,
          action_type ENUM('login', 'logout', 'add', 'edit', 'delete', 'view_report', 'export_report', 'other') NOT NULL,
          action_target VARCHAR(255) DEFAULT NULL,
          description TEXT,
          ip_address VARCHAR(45) NOT NULL,
          user_agent VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          
          INDEX idx_user_id (user_id),
          INDEX idx_action_type (action_type),
          INDEX idx_created_at (created_at),
          INDEX idx_role (role)
      );
    `;

    await connection.execute(createTableQuery);
    console.log('Table user_activity_log created successfully!');

    await connection.end();
  } catch (err) {
    console.error('Migration failed:', err);
  }
};

runMigration();
