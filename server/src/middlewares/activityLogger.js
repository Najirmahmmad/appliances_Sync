import poolManager from '../database/PoolManager.js';

const normalizeRole = (role) => {
  const value = String(role || 'Operator');
  const formatted = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

  if (['Admin', 'Operator', 'Technician'].includes(formatted)) {
    return formatted;
  }

  return 'Operator';
};

const writeActivityLog = async (db, payload) => {
  const query = `
    INSERT INTO user_activity_log
    (user_id, role, action_type, action_target, description, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  await db.query(query, [
    payload.userId,
    payload.role,
    payload.actionType,
    payload.actionTarget,
    payload.description,
    payload.ip,
    payload.userAgent
  ]);
};

export const logActivity = async ({ userId, role, actionType, actionTarget, description, req, tenantId }) => {
  try {
    if (!userId) {
      return;
    }

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const safeDesc = typeof description === 'object' ? JSON.stringify(description) : description;
    const safeRole = normalizeRole(role);

    const payload = {
      userId,
      role: safeRole,
      actionType,
      actionTarget,
      description: safeDesc,
      ip,
      userAgent
    };

    if (req.db) {
      await writeActivityLog(req.db, payload);
      return;
    }

    if (tenantId) {
      const tenantPool = await poolManager.getPool(tenantId);
      await writeActivityLog(tenantPool, payload);
    }
  } catch (error) {
    console.error('Failed to write activity log:', error.message);
  }
};

export const authActivityLogger = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json;

    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = body.user || req.user;

        if (user?.id) {
          logActivity({
            userId: user.id,
            role: user.role,
            actionType: action,
            actionTarget: 'auth_system',
            description: `User ${action} successful`,
            req,
            tenantId: user.tenant_id
          });
        }
      }

      return originalJson.call(this, body);
    };

    next();
  };
};
