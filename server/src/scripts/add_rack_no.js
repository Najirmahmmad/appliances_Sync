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
            AND TABLE_NAME = 'items' 
            AND COLUMN_NAME = 'rack_no'
        `);

        if (columns.length === 0) {
            console.log('Adding rack_no column to items...');
            await connection.query(`
                ALTER TABLE items 
                ADD COLUMN rack_no VARCHAR(100) DEFAULT NULL
            `);
            console.log('Column added successfully.');
        } else {
            console.log('Column rack_no already exists.');
        }

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
