import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const updateSchema = async () => {
  try {
    const connection = await pool.getConnection();
    
    console.log('Starting database schema update...');
    
    // Add terms_condition1 to terms_condition8 columns if they don't exist
    const columnsToAdd = ['terms_condition1', 'terms_condition2', 'terms_condition3', 'terms_condition4', 'terms_condition5', 'terms_condition6', 'terms_condition7', 'terms_condition8'];
    
    for (const col of columnsToAdd) {
      try {
        await connection.query(`
          ALTER TABLE company_profile 
          ADD COLUMN IF NOT EXISTS ${col} VARCHAR(255)
        `);
        console.log(`Column ${col} added to company_profile table`);
      } catch (err) {
        console.log(`Column ${col} may already exist or error occurred:`, err.message);
      }
    }
    
    // Remove print header and footer columns if they exist
    const columnsToRemove = ['header1', 'header2', 'header3', 'header4', 'header5', 'header6', 'header7', 'header8', 'header9', 'header10', 'footer1', 'footer2', 'footer3', 'footer4', 'footer5', 'footer6', 'footer7', 'footer8', 'footer9', 'footer10'];
    
    for (const col of columnsToRemove) {
      try {
        await connection.query(`
          ALTER TABLE company_profile 
          DROP COLUMN IF EXISTS ${col}
        `);
        console.log(`Column ${col} removed from company_profile table`);
      } catch (err) {
        console.log(`Column ${col} may not exist or error occurred:`, err.message);
      }
    }
    
    connection.release();
    console.log('Database schema updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating database schema:', error);
    process.exit(1);
  }
};

updateSchema();