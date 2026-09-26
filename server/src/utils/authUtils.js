import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

const buildTokenPayload = (user) => ({
  user_id: user.id,
  tenant_id: user.tenant_id,
  role: user.role,
  id: user.id,
  username: user.id
});

export const generateToken = (user) => {
  return jwt.sign(buildTokenPayload(user), JWT_SECRET, { expiresIn: '10h' });
};

export const generateRefreshToken = (user) => {
  return jwt.sign(buildTokenPayload(user), JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};
