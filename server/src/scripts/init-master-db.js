import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import masterPool, { checkMasterConnection } from '../database/masterPool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const columnExists = async (tableName, columnName) => {
  const [rows] = await masterPool.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  return rows.length > 0;
};

const indexExists = async (tableName, indexName) => {
  const [rows] = await masterPool.query(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName]
  );

  return rows.length > 0;
};

const ensureTenantsTable = async () => {
  await masterPool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL,
      db_name VARCHAR(100) NOT NULL UNIQUE,
      status ENUM('Active', 'Inactive') DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
};

const ensureUsersTable = async () => {
  await masterPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(15),
      email VARCHAR(100),
      password VARCHAR(255) NOT NULL,
      tenant_id INT NULL,
      role ENUM('Admin', 'Operator', 'Technician') NOT NULL DEFAULT 'Admin',
      status ENUM('Active', 'Inactive') DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const upgrades = [
    ['tenant_id', 'ALTER TABLE users ADD COLUMN tenant_id INT NULL AFTER password'],
    ['role', "ALTER TABLE users ADD COLUMN role ENUM('Admin', 'Operator', 'Technician') NOT NULL DEFAULT 'Admin' AFTER tenant_id"],
    ['status', "ALTER TABLE users ADD COLUMN status ENUM('Active', 'Inactive') DEFAULT 'Active' AFTER role"],
    ['created_at', 'ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER status'],
    ['updated_at', 'ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at']
  ];

  for (const [columnName, statement] of upgrades) {
    if (!(await columnExists('users', columnName))) {
      await masterPool.query(statement);
    }
  }

  if (!(await indexExists('users', 'idx_master_users_tenant_id'))) {
    await masterPool.query('CREATE INDEX idx_master_users_tenant_id ON users(tenant_id)');
  }

  if (!(await indexExists('users', 'idx_master_users_email'))) {
    await masterPool.query('CREATE INDEX idx_master_users_email ON users(email)');
  }
};

const ensureForeignKey = async () => {
  const [constraints] = await masterPool.query(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'
       AND CONSTRAINT_NAME = 'fk_master_users_tenant'`
  );

  if (constraints.length === 0) {
    await masterPool.query(
      `ALTER TABLE users
       ADD CONSTRAINT fk_master_users_tenant
       FOREIGN KEY (tenant_id) REFERENCES tenants(id)
       ON UPDATE CASCADE
       ON DELETE RESTRICT`
    );
  }
};

const initMasterDb = async () => {
  try {
    const isConnected = await checkMasterConnection();

    if (!isConnected) {
      console.error('Unable to connect to master database.');
      process.exit(1);
    }

    console.log('Applying master schema...');
    await ensureTenantsTable();
    await ensureUsersTable();

    try {
      await ensureForeignKey();
    } catch (error) {
      console.warn('Skipped foreign key creation:', error.message);
    }

    console.log('Master database initialized successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Master database initialization failed:', error);
    process.exit(1);
  }
};

initMasterDb();
