import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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

const initDb = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Drop existing users table if exists (for schema update)
    // WARNING: Uncomment only when you need to reset the schema
    // await connection.query('DROP TABLE IF EXISTS users');
    
    // Create Users Table with updated schema
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(15),
        email VARCHAR(100),
        password VARCHAR(255) NOT NULL,
        role ENUM('Admin', 'Operator', 'Technician') NOT NULL,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Users table created or already exists.');

    // Seed Data with new schema
    const users = [
      { id: 'ADMIN001', name: 'Administrator', phone: '9876543210', email: 'admin@ifb.com', password: 'admin123', role: 'Admin', status: 'Active' },
      { id: 'OPR001', name: 'Operator User', phone: '9876543211', email: 'operator@ifb.com', password: 'operator123', role: 'Operator', status: 'Active' },
      { id: 'TECH001', name: 'Technician User', phone: '9876543212', email: 'tech@ifb.com', password: 'tech123', role: 'Technician', status: 'Active' }
    ];

    for (const user of users) {
      const [rows] = await connection.query('SELECT * FROM users WHERE id = ?', [user.id]);
      if (rows.length === 0) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await connection.query(
          'INSERT INTO users (id, name, phone, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [user.id, user.name, user.phone, user.email, hashedPassword, user.role, user.status]
        );
        console.log(`User ${user.id} (${user.name}) created.`);
      } else {
        console.log(`User ${user.id} already exists.`);
      }
    }

    // Create Departments Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departments (
        dept_code VARCHAR(20) PRIMARY KEY,
        dept_name VARCHAR(100) NOT NULL,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Departments table created or already exists.');

    // Seed Departments Data
    const departments = [
      { dept_code: 'SALES', dept_name: 'Sales Department', status: 'Active' },
      { dept_code: 'SERVICE', dept_name: 'Service Department', status: 'Active' },
      { dept_code: 'WAREHOUSE', dept_name: 'Warehouse Department', status: 'Active' },
      { dept_code: 'ACCOUNTS', dept_name: 'Accounts Department', status: 'Active' }
    ];

    for (const dept of departments) {
      const [rows] = await connection.query('SELECT * FROM departments WHERE dept_code = ?', [dept.dept_code]);
      if (rows.length === 0) {
        await connection.query(
          'INSERT INTO departments (dept_code, dept_name, status) VALUES (?, ?, ?)',
          [dept.dept_code, dept.dept_name, dept.status]
        );
        console.log(`Department ${dept.dept_code} (${dept.dept_name}) created.`);
      } else {
        console.log(`Department ${dept.dept_code} already exists.`);
      }
    }

    // Create Items Table with FK to departments
    await connection.query(`
      CREATE TABLE IF NOT EXISTS items (
        item_code VARCHAR(50) PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        dept_code VARCHAR(20),
        sale_rate DECIMAL(12,2) DEFAULT 0.00,
        tax_rate DECIMAL(5,2) DEFAULT 0.00,
        commission DECIMAL(10,2) DEFAULT 0.00,
        unit VARCHAR(20),
        hsn_code VARCHAR(20),
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (dept_code) REFERENCES departments(dept_code) ON UPDATE CASCADE ON DELETE SET NULL
      )
    `);

    console.log('Items table created or already exists.');

    // Seed Items Data
    const items = [
      { item_code: 'IFB-WM001', item_name: 'IFB Front Load Washing Machine 6.5kg', dept_code: 'SALES', tax_rate: 18.00, unit: 'Pcs', hsn_code: '84501100', status: 'Active' },
      { item_code: 'IFB-WM002', item_name: 'IFB Top Load Washing Machine 7kg', dept_code: 'SALES', tax_rate: 18.00, unit: 'Pcs', hsn_code: '84501100', status: 'Active' },
      { item_code: 'IFB-AC001', item_name: 'IFB Split AC 1.5 Ton 5 Star', dept_code: 'SALES', tax_rate: 28.00, unit: 'Pcs', hsn_code: '84151010', status: 'Active' },
      { item_code: 'IFB-MW001', item_name: 'IFB Microwave Oven 25L', dept_code: 'SALES', tax_rate: 18.00, unit: 'Pcs', hsn_code: '85165000', status: 'Active' },
      { item_code: 'IFB-SP001', item_name: 'Motor Belt Spare Part', dept_code: 'SERVICE', tax_rate: 12.00, unit: 'Nos', hsn_code: '40103900', status: 'Active' },
      { item_code: 'IFB-SP002', item_name: 'PCB Control Board', dept_code: 'SERVICE', tax_rate: 18.00, unit: 'Pcs', hsn_code: '85389000', status: 'Active' }
    ];

    for (const item of items) {
      const [rows] = await connection.query('SELECT * FROM items WHERE item_code = ?', [item.item_code]);
      if (rows.length === 0) {
        await connection.query(
          'INSERT INTO items (item_code, item_name, dept_code, tax_rate, unit, hsn_code, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [item.item_code, item.item_name, item.dept_code, item.tax_rate, item.unit, item.hsn_code, item.status]
        );
        console.log(`Item ${item.item_code} (${item.item_name}) created.`);
      } else {
        console.log(`Item ${item.item_code} already exists.`);
      }
    }

    // Create Sales Header Table (SA = Sale, SR = Sale Return)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales_header (
        book_code VARCHAR(5) NOT NULL,
        vouch_no INT NOT NULL,
        vouch_date DATE NOT NULL,
        party_phone VARCHAR(15),
        party_name VARCHAR(100) NOT NULL,
        party_address VARCHAR(255),
        party_email VARCHAR(100),
        party_gst VARCHAR(20),
        total_qty DECIMAL(10,2) DEFAULT 0,
        total_basic DECIMAL(12,2) DEFAULT 0,
        total_tax DECIMAL(12,2) DEFAULT 0,
        net_amount DECIMAL(12,2) DEFAULT 0,
        remarks TEXT,
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (book_code, vouch_no)
      )
    `);

    console.log('Sales Header table created or already exists.');

    // Create Sales Items Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        book_code VARCHAR(5) NOT NULL,
        vouch_no INT NOT NULL,
        sr_no INT NOT NULL,
        item_code VARCHAR(50) NOT NULL,
        item_name VARCHAR(255),
        qty DECIMAL(10,2) DEFAULT 1,
        rate DECIMAL(12,2) DEFAULT 0,
        tax_perc DECIMAL(5,2) DEFAULT 0,
        comm_rate DECIMAL(10,2) DEFAULT 0.00,  -- Stores the commission rate at the time of sale for item-wise commission reports
        basic_amt DECIMAL(12,2) DEFAULT 0,
        tax_amt DECIMAL(12,2) DEFAULT 0,
        net_amt DECIMAL(12,2) DEFAULT 0,
        FOREIGN KEY (book_code, vouch_no) REFERENCES sales_header(book_code, vouch_no) ON DELETE CASCADE,
        FOREIGN KEY (item_code) REFERENCES items(item_code) ON UPDATE CASCADE
      )
    `);

    console.log('Sales Items table created or already exists.');

    // Create Company Profile Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS company_profile (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        address TEXT,
        phone_number VARCHAR(20),
        phone_number2 VARCHAR(20),
        email_address VARCHAR(255),
        gst_number VARCHAR(50),
        pan_number VARCHAR(50),
        bank_name VARCHAR(255),
        ifsc_code VARCHAR(50),
        account_number VARCHAR(50),
        branch_name VARCHAR(255),
        terms_condition1 VARCHAR(255),
        terms_condition2 VARCHAR(255),
        terms_condition3 VARCHAR(255),
        terms_condition4 VARCHAR(255),
        terms_condition5 VARCHAR(255),
        terms_condition6 VARCHAR(255),
        terms_condition7 VARCHAR(255),
        terms_condition8 VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Company Profile table created or already exists.');

    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initDb();
