import bcrypt from 'bcryptjs';
import masterPool from '../database/masterPool.js';
import poolManager from '../database/PoolManager.js';
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/authUtils.js';
import {
  AuthenticationError,
  AuthorizationError,
  DatabaseUnavailableError
} from '../utils/errors.js';

const findUserByLogin = async (username) => {
  try {
    const [rows] = await masterPool.query(
      `SELECT u.id, u.name, u.phone, u.email, u.password, u.tenant_id, u.role, u.status,
              t.company_name, t.db_name, t.status AS tenant_status
       FROM users u
       INNER JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = ? OR u.email = ?`,
      [username, username]
    );

    return rows[0] ?? null;
  } catch (error) {
    throw new DatabaseUnavailableError('Unable to reach master database');
  }
};

const findActiveUserById = async (userId) => {
  try {
    const [rows] = await masterPool.query(
      `SELECT u.id, u.name, u.phone, u.email, u.password, u.tenant_id, u.role, u.status,
              t.company_name, t.db_name, t.status AS tenant_status
       FROM users u
       INNER JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = ?`,
      [userId]
    );

    return rows[0] ?? null;
  } catch (error) {
    throw new DatabaseUnavailableError('Unable to reach master database');
  }
};

export const loginUser = async ({ username, password }) => {
  if (!username || !password) {
    throw new AuthenticationError('Username and password are required');
  }

  const user = await findUserByLogin(username);

  if (!user) {
    throw new AuthenticationError('Invalid credentials');
  }

  if (user.status === 'Inactive') {
    throw new AuthorizationError('Account is disabled. Please contact admin.');
  }

  if (user.tenant_status && user.tenant_status !== 'Active') {
    throw new AuthorizationError('Tenant account is inactive. Please contact support.');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AuthenticationError('Invalid credentials');
  }

  await poolManager.getPool(user.tenant_id);

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      username: user.id,
      name: user.name,
      email: user.email,
      tenant_id: user.tenant_id,
      company_name: user.company_name,
      role: user.role.toLowerCase()
    }
  };
};

export const refreshAccessToken = async (refreshTokenValue) => {
  if (!refreshTokenValue) {
    throw new AuthenticationError('Refresh token is required');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshTokenValue);
  } catch (error) {
    throw new AuthorizationError('Invalid or expired refresh token');
  }

  const userId = decoded.user_id || decoded.id;
  const user = await findActiveUserById(userId);

  if (!user || user.status === 'Inactive') {
    throw new AuthorizationError('User account is invalid or disabled');
  }

  if (user.tenant_status && user.tenant_status !== 'Active') {
    throw new AuthorizationError('Tenant account is inactive. Please contact support.');
  }

  await poolManager.getPool(user.tenant_id);

  return {
    token: generateToken(user),
    refreshToken: generateRefreshToken(user)
  };
};
