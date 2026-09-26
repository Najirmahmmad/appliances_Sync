import poolManager from '../database/PoolManager.js';
import { runWithTenantPool } from '../database/tenantContext.js';
import { verifyToken } from '../utils/authUtils.js';
import {
  AppError,
  AuthenticationError,
  AuthorizationError
} from '../utils/errors.js';

const normalizeRole = (role = '') => {
  const value = String(role);
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new AuthenticationError('Access denied. No token provided.'));
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    return next(new AuthorizationError('Invalid token.'));
  }

  const tenantId = decoded.tenant_id;
  const userId = decoded.user_id || decoded.id;

  if (!tenantId || !userId) {
    return next(new AuthorizationError('Invalid token payload.'));
  }

  try {
    const pool = await poolManager.getPool(tenantId);

    req.user = {
      user_id: userId,
      id: userId,
      tenant_id: tenantId,
      role: decoded.role,
      username: userId
    };
    req.db = pool;

    runWithTenantPool(pool, () => next());
  } catch (error) {
    next(error);
  }
};

export const authorizeRoles = (...roles) => {
  const allowedRoles = new Set(
    roles.flatMap((role) => [role, normalizeRole(role)])
  );

  return (req, res, next) => {
    if (!req.user?.role) {
      return next(new AuthorizationError('Access denied. Insufficient permissions.'));
    }

    const userRole = req.user.role;
    const normalizedUserRole = normalizeRole(userRole);

    if (!allowedRoles.has(userRole) && !allowedRoles.has(normalizedUserRole)) {
      return next(new AuthorizationError('Access denied. Insufficient permissions.'));
    }

    next();
  };
};

export const attachTenantDb = authenticateToken;
