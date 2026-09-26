-- Master database schema for multi-tenant SaaS
-- Database: ifbmaster

CREATE TABLE IF NOT EXISTS tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  db_name VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15),
  email VARCHAR(100),
  password VARCHAR(255) NOT NULL,
  tenant_id INT NOT NULL,
  role ENUM('Admin', 'Operator', 'Technician') NOT NULL,
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Safe upgrades for existing master databases
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INT NULL AFTER password;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('Admin', 'Operator', 'Technician') NOT NULL DEFAULT 'Admin' AFTER tenant_id;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status ENUM('Active', 'Inactive') DEFAULT 'Active' AFTER role;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER status;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

CREATE INDEX IF NOT EXISTS idx_master_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_master_users_email ON users(email);
