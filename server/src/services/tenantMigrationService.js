import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, '../migrations/tenant');

const runSqlFile = async (connection, filePath) => {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await connection.query(statement);
  }
};

const ensureTenantUsersTable = async (connection) => {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(15),
      email VARCHAR(100),
      password VARCHAR(255) NOT NULL,
      tenant_id INT NULL,
      role ENUM('Admin', 'Operator', 'Technician') NOT NULL,
      status ENUM('Active', 'Inactive') DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  try {
    await connection.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INT NULL AFTER password
    `);
  } catch (err) {
    // Ignore error if column already exists or syntax differs
  }
};

const ensureCoreTables = async (connection) => {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS departments (
      dept_code VARCHAR(20) PRIMARY KEY,
      dept_name VARCHAR(100) NOT NULL,
      status ENUM('Active', 'Inactive') DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

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
      current_stock DECIMAL(12,2) DEFAULT 0.00,
      isAMC TINYINT(1) DEFAULT 0,
      isAccessories TINYINT(1) DEFAULT 0,
      LeadTimeDays INT DEFAULT 0,
      rack_no VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (dept_code) REFERENCES departments(dept_code) ON UPDATE CASCADE ON DELETE SET NULL
    )
  `);

  try {
    await connection.query(`
      ALTER TABLE items ADD COLUMN IF NOT EXISTS isAccessories TINYINT(1) DEFAULT 0 AFTER isAMC
    `);
  } catch (err) {
    // Ignore error if column already exists
  }

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
      comm_rate DECIMAL(10,2) DEFAULT 0.00,
      basic_amt DECIMAL(12,2) DEFAULT 0,
      tax_amt DECIMAL(12,2) DEFAULT 0,
      net_amt DECIMAL(12,2) DEFAULT 0,
      FOREIGN KEY (book_code, vouch_no) REFERENCES sales_header(book_code, vouch_no) ON DELETE CASCADE,
      FOREIGN KEY (item_code) REFERENCES items(item_code) ON UPDATE CASCADE
    )
  `);

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
      owner_name VARCHAR(255),
      owner_phone VARCHAR(50),
      owner_email VARCHAR(255),
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

  await connection.query(`
    CREATE TABLE IF NOT EXISTS user_activity_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      role ENUM('Admin', 'Operator', 'Technician') NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      action_target VARCHAR(100),
      description TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_activity_user_id (user_id),
      INDEX idx_activity_created_at (created_at)
    )
  `);
};

export const runTenantMigrations = async (pool) => {
  const connection = await pool.getConnection();

  try {
    await ensureTenantUsersTable(connection);
    await ensureCoreTables(connection);

    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();

      for (const file of files) {
        await runSqlFile(connection, path.join(migrationsDir, file));
      }
    }
  } finally {
    connection.release();
  }
};

export const seedDefaultDepartments = async (pool) => {
  const departments = [
    { dept_code: 'SALES', dept_name: 'Sales Department', status: 'Active' },
    { dept_code: 'SERVICE', dept_name: 'Service Department', status: 'Active' },
    { dept_code: 'WAREHOUSE', dept_name: 'Warehouse Department', status: 'Active' },
    { dept_code: 'ACCOUNTS', dept_name: 'Accounts Department', status: 'Active' }
  ];

  for (const dept of departments) {
    const [rows] = await pool.query('SELECT dept_code FROM departments WHERE dept_code = ?', [dept.dept_code]);
    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO departments (dept_code, dept_name, status) VALUES (?, ?, ?)',
        [dept.dept_code, dept.dept_name, dept.status]
      );
    }
  }
};

export const createTenantAdminUser = async (pool, adminUser) => {
  const hashedPassword = await bcrypt.hash(adminUser.password, 10);

  await pool.query(
    `INSERT INTO users (id, name, phone, email, password, role, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       phone = VALUES(phone),
       email = VALUES(email),
       password = VALUES(password),
       role = VALUES(role),
       status = VALUES(status)`,
    [
      adminUser.id,
      adminUser.name,
      adminUser.phone || null,
      adminUser.email || null,
      hashedPassword,
      adminUser.role || 'Admin',
      adminUser.status || 'Active'
    ]
  );
};
