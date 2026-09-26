import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import masterPool from '../database/masterPool.js';
import poolManager from '../database/PoolManager.js';
import {
  runTenantMigrations,
  seedDefaultDepartments,
  createTenantAdminUser
} from './tenantMigrationService.js';
import { AppError, DatabaseUnavailableError } from '../utils/errors.js';

dotenv.config();

const createServerConnection = async () => {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
  });
};

const createTenantPool = (dbName) => {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });
};

const rollbackMasterTenant = async (tenantId, adminUserId) => {
  if (adminUserId) {
    await masterPool.query('DELETE FROM users WHERE id = ?', [adminUserId]).catch(() => {});
  }

  if (tenantId) {
    await masterPool.query('DELETE FROM tenants WHERE id = ?', [tenantId]).catch(() => {});
  }
};

export const createTenant = async ({
  companyName,
  dbName,
  adminUser
}) => {
  if (!companyName || !dbName || !adminUser?.id || !adminUser?.password) {
    throw new AppError(
      'companyName, dbName, adminUser.id, and adminUser.password are required',
      400,
      'INVALID_TENANT_INPUT'
    );
  }

  const normalizedDbName = dbName.trim().toLowerCase();

  if (!/^[a-z0-9_]+$/.test(normalizedDbName)) {
    throw new AppError(
      'db_name may only contain lowercase letters, numbers, and underscores',
      400,
      'INVALID_DB_NAME'
    );
  }

  const [existingTenants] = await masterPool.query(
    'SELECT id FROM tenants WHERE db_name = ?',
    [normalizedDbName]
  );

  if (existingTenants.length > 0) {
    throw new AppError('Tenant database name already exists', 409, 'TENANT_EXISTS');
  }

  const [existingMasterUsers] = await masterPool.query(
    'SELECT id FROM users WHERE id = ?',
    [adminUser.id]
  );

  if (existingMasterUsers.length > 0) {
    throw new AppError('Master user id already exists', 409, 'USER_EXISTS');
  }

  let tenantId;
  let serverConnection;
  let tenantPool;

  try {
    const [tenantResult] = await masterPool.query(
      'INSERT INTO tenants (company_name, db_name, status) VALUES (?, ?, ?)',
      [companyName, normalizedDbName, 'Active']
    );

    tenantId = tenantResult.insertId;
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);

    await masterPool.query(
      `INSERT INTO users (id, name, phone, email, password, tenant_id, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminUser.id,
        adminUser.name || adminUser.id,
        adminUser.phone || null,
        adminUser.email || null,
        hashedPassword,
        tenantId,
        adminUser.role || 'Admin',
        adminUser.status || 'Active'
      ]
    );

    serverConnection = await createServerConnection();
    await serverConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${normalizedDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    tenantPool = createTenantPool(normalizedDbName);
    await runTenantMigrations(tenantPool);
    await seedDefaultDepartments(tenantPool);
    await createTenantAdminUser(tenantPool, {
      id: adminUser.id,
      name: adminUser.name || adminUser.id,
      phone: adminUser.phone,
      email: adminUser.email,
      password: adminUser.password,
      role: adminUser.role || 'Admin',
      status: adminUser.status || 'Active'
    });

    poolManager.invalidateTenant(tenantId);

    return {
      tenant_id: tenantId,
      company_name: companyName,
      db_name: normalizedDbName,
      admin_user_id: adminUser.id
    };
  } catch (error) {
    if (serverConnection) {
      await serverConnection.query(`DROP DATABASE IF EXISTS \`${normalizedDbName}\``).catch(() => {});
    }

    await rollbackMasterTenant(tenantId, adminUser.id);

    if (error instanceof AppError) {
      throw error;
    }

    throw new DatabaseUnavailableError(error.message || 'Failed to create tenant');
  } finally {
    if (serverConnection) {
      await serverConnection.end().catch(() => {});
    }

    if (tenantPool) {
      await tenantPool.end().catch(() => {});
    }
  }
};

export const listTenants = async () => {
  const [rows] = await masterPool.query(
    `SELECT id, company_name, db_name, status, created_at, updated_at
     FROM tenants
     ORDER BY id ASC`
  );

  return rows;
};
