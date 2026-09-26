import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import masterPool from '../database/masterPool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const seedDefaultTenant = async () => {
  const companyName = process.env.DEFAULT_TENANT_COMPANY || 'Default Company';
  const dbName = process.env.DEFAULT_TENANT_DB || process.env.DB_NAME || 'ifberp';
  const adminId = process.env.DEFAULT_TENANT_ADMIN_ID || 'ADMIN001';
  const adminPassword = process.env.DEFAULT_TENANT_ADMIN_PASSWORD || 'admin123';

  const [existingTenant] = await masterPool.query(
    'SELECT id FROM tenants WHERE db_name = ?',
    [dbName]
  );

  let tenantId;

  if (existingTenant.length > 0) {
    tenantId = existingTenant[0].id;
    console.log(`Tenant already exists for database ${dbName} (id: ${tenantId}).`);
  } else {
    const [result] = await masterPool.query(
      'INSERT INTO tenants (company_name, db_name, status) VALUES (?, ?, ?)',
      [companyName, dbName, 'Active']
    );
    tenantId = result.insertId;
    console.log(`Created tenant ${tenantId} for database ${dbName}.`);
  }

  const [existingUser] = await masterPool.query(
    'SELECT id FROM users WHERE id = ?',
    [adminId]
  );

  if (existingUser.length === 0) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await masterPool.query(
      `INSERT INTO users (id, name, email, password, tenant_id, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, 'Administrator', 'admin@ifb.com', hashedPassword, tenantId, 'Admin', 'Active']
    );
    console.log(`Created master login user ${adminId}.`);
  } else {
    await masterPool.query(
      'UPDATE users SET tenant_id = ?, role = COALESCE(role, ?), status = COALESCE(status, ?) WHERE id = ? AND tenant_id IS NULL',
      [tenantId, 'Admin', 'Active', adminId]
    );
    console.log(`Linked master login user ${adminId} to tenant ${tenantId}.`);
  }

  console.log('Default tenant seed completed.');
};

seedDefaultTenant()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Default tenant seed failed:', error);
    process.exit(1);
  });
