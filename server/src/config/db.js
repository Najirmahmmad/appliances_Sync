import { getTenantPool } from '../database/tenantContext.js';
import { checkMasterConnection } from '../database/masterPool.js';
import { AppError } from '../utils/errors.js';

const requireTenantPool = () => {
  const pool = getTenantPool();

  if (!pool) {
    throw new AppError(
      'Tenant database context is not available. Ensure auth middleware is applied.',
      500,
      'TENANT_CONTEXT_MISSING'
    );
  }

  return pool;
};

const tenantPoolProxy = new Proxy(
  {},
  {
    get(_target, prop) {
      const pool = requireTenantPool();
      const value = pool[prop];

      if (typeof value === 'function') {
        return value.bind(pool);
      }

      return value;
    }
  }
);

export const checkConnection = async () => {
  const masterHealthy = await checkMasterConnection();

  if (!masterHealthy) {
    return false;
  }

  const pool = getTenantPool();
  if (!pool) {
    return true;
  }

  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('Tenant Database Connection Error:', error.message);
    return false;
  }
};

export default tenantPoolProxy;
