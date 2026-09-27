import bcrypt from 'bcryptjs';
import masterPool from '../database/masterPool.js';
import poolManager from '../database/PoolManager.js';
import crypto from 'crypto';
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

export const requestPasswordReset = async ({ email }) => {
  if (!email) throw new AuthenticationError('Email is required');
  
  const [rows] = await masterPool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (rows.length === 0) {
    // For security, do not reveal if email exists, just return success
    return { success: true, message: 'If that email is in our system, a reset link has been sent.' };
  }
  
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 hour from now
  
  await masterPool.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?', [token, expires, email]);
  
  // In a real app, send email here. For now we will return the token for testing purposes
  return { success: true, message: 'Password reset token generated', token };
};

export const resetPassword = async ({ token, newPassword }) => {
  if (!token || !newPassword) throw new AuthenticationError('Token and new password are required');
  
  const [rows] = await masterPool.query('SELECT id, reset_token_expires FROM users WHERE reset_token = ?', [token]);
  if (rows.length === 0) throw new AuthenticationError('Invalid or expired reset token');
  
  const user = rows[0];
  if (new Date(user.reset_token_expires) < new Date()) {
    throw new AuthenticationError('Reset token has expired');
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await masterPool.query('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hashedPassword, user.id]);
  
  return { success: true, message: 'Password has been successfully reset' };
};
