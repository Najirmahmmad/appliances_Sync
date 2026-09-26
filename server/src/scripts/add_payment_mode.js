import pool from '../config/db.js';

const migrate = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to database...');

        // Check if column exists
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'sales_header' 
            AND COLUMN_NAME = 'payment_mode'
        `);

        if (columns.length === 0) {
            console.log('Adding payment_mode column...');
            await connection.query(`
                ALTER TABLE sales_header 
                ADD COLUMN payment_mode VARCHAR(20) DEFAULT 'Cash' AFTER net_amount
            `);
            console.log('Column added successfully.');
        } else {
            console.log('Column payment_mode already exists.');
        }

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
