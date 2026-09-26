import mysql from 'mysql2/promise';
import masterPool from './masterPool.js';
import {
  TenantNotFoundError,
  DatabaseUnavailableError,
  PoolCreationError
} from '../utils/errors.js';

const TENANT_CACHE_TTL_MS = Number(process.env.TENANT_CACHE_TTL_MS) || 5 * 60 * 1000;
const MAX_CACHED_POOLS = Number(process.env.MAX_TENANT_POOLS) || 100;
const TENANT_POOL_LIMIT = Number(process.env.TENANT_POOL_LIMIT) || 10;

class PoolManager {
  constructor() {
    this.pools = new Map();
    this.tenantCache = new Map();
    this.accessOrder = [];
  }

  async getTenantRecord(tenantId) {
    const cacheKey = String(tenantId);
    const cached = this.tenantCache.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt < TENANT_CACHE_TTL_MS) {
      return cached.tenant;
    }

    let rows;
    try {
      [rows] = await masterPool.query(
        `SELECT id, company_name, db_name, status
         FROM tenants
         WHERE id = ?`,
        [tenantId]
      );
    } catch (error) {
      throw new DatabaseUnavailableError('Unable to reach master database');
    }

    const tenant = rows[0];

    if (!tenant) {
      throw new TenantNotFoundError(`Tenant ${tenantId} not found`);
    }

    if (tenant.status && tenant.status !== 'Active') {
      throw new TenantNotFoundError(`Tenant ${tenantId} is inactive`);
    }

    this.tenantCache.set(cacheKey, { tenant, cachedAt: Date.now() });
    return tenant;
  }

  createPool(dbName) {
    return mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: dbName,
      waitForConnections: true,
      connectionLimit: TENANT_POOL_LIMIT,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      charset: 'latin1',
      typeCast: function (field, next) {
        if (field.type === 'VAR_STRING' || field.type === 'STRING' || field.type === 'BLOB' || field.type === 'VARCHAR') {
          const buffer = field.buffer();
          if (buffer) {
            return buffer.toString('utf8');
          }
          return null;
        }
        return next();
      }
    });
  }

  touchPool(tenantId) {
    const key = String(tenantId);
    this.accessOrder = this.accessOrder.filter((id) => id !== key);
    this.accessOrder.push(key);
  }

  async evictIfNeeded() {
    while (this.pools.size >= MAX_CACHED_POOLS && this.accessOrder.length > 0) {
      const oldestTenantId = this.accessOrder.shift();
      const entry = this.pools.get(oldestTenantId);

      if (!entry) {
        continue;
      }

      try {
        await entry.pool.end();
      } catch (error) {
        console.error(`Failed to close pool for tenant ${oldestTenantId}:`, error.message);
      }

      this.pools.delete(oldestTenantId);
    }
  }

  async getPool(tenantId) {
    const key = String(tenantId);
    const existing = this.pools.get(key);

    if (existing) {
      this.touchPool(tenantId);

      try {
        const connection = await existing.pool.getConnection();
        await connection.ping();
        connection.release();
        return existing.pool;
      } catch (error) {
        console.error(`Stale pool for tenant ${tenantId}, recreating:`, error.message);

        try {
          await existing.pool.end();
        } catch (closeError) {
          console.error(`Failed to close stale pool for tenant ${tenantId}:`, closeError.message);
        }

        this.pools.delete(key);
      }
    }

    const tenant = await this.getTenantRecord(tenantId);

    await this.evictIfNeeded();

    let pool;
    try {
      pool = this.createPool(tenant.db_name);
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
    } catch (error) {
      if (pool) {
        try {
          await pool.end();
        } catch (closeError) {
          console.error(`Failed to close failed pool for tenant ${tenantId}:`, closeError.message);
        }
      }

      throw new PoolCreationError(
        `Unable to connect to tenant database for tenant ${tenantId}`
      );
    }

    this.pools.set(key, { pool, dbName: tenant.db_name });
    this.touchPool(tenantId);
    return pool;
  }

  invalidateTenant(tenantId) {
    const key = String(tenantId);
    this.tenantCache.delete(key);

    const entry = this.pools.get(key);
    if (entry) {
      entry.pool.end().catch((error) => {
        console.error(`Failed to close invalidated pool for tenant ${tenantId}:`, error.message);
      });
      this.pools.delete(key);
    }

    this.accessOrder = this.accessOrder.filter((id) => id !== key);
  }

  async shutdown() {
    const closeTasks = [];

    for (const [tenantId, entry] of this.pools.entries()) {
      closeTasks.push(
        entry.pool.end().catch((error) => {
          console.error(`Failed to close pool for tenant ${tenantId}:`, error.message);
        })
      );
    }

    await Promise.all(closeTasks);
    this.pools.clear();
    this.tenantCache.clear();
    this.accessOrder = [];
  }
}

const poolManager = new PoolManager();
export default poolManager;
