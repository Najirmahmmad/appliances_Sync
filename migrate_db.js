import pool from './server/src/config/db.js';

async function migrate() {
  try {
    const connection = await pool.getConnection();
    
    // Check if columns already exist
    const [columns] = await connection.query("SHOW COLUMNS FROM sales_items LIKE 'model_no'");
    if (columns.length === 0) {
      console.log("Adding model_no and serial_no to sales_items...");
      await connection.query("ALTER TABLE sales_items ADD COLUMN model_no VARCHAR(100), ADD COLUMN serial_no VARCHAR(100);");
      console.log("Columns added successfully.");
    } else {
      console.log("Columns already exist.");
    }
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
