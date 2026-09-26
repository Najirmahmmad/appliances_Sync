import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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

const checkSchema = async () => {
  try {
    console.log('Checking company_profile table structure...');
    const [rows] = await pool.execute('DESCRIBE company_profile');
    console.log('Current company_profile table structure:');
    rows.forEach(row => {
      console.log(`${row.Field}: ${row.Type} ${row.Null} ${row.Key} ${row.Default} ${row.Extra}`);
    });
    
    // Check if there are records in the table
    const [records] = await pool.execute('SELECT COUNT(*) as count FROM company_profile');
    console.log(`\nTotal records in company_profile: ${records[0].count}`);
    
    if (records[0].count > 0) {
      const [sample] = await pool.execute('SELECT * FROM company_profile LIMIT 1');
      console.log('\nSample record:', JSON.stringify(sample[0], null, 2));
    }
  } catch (error) {
    console.error('Error checking table structure:', error);
  } finally {
    await pool.end();
  }
};

checkSchema();