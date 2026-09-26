import pool from '../config/db.js';
import masterPool from '../database/masterPool.js';
import bcrypt from 'bcryptjs';

export const changePassword = async (req, res, next) => {
  const userId = req.user?.id;
  const tenantId = req.user?.tenant_id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters'
    });
  }

  try {
    const [rows] = await pool.query('SELECT id, password, status FROM users WHERE id = ?', [userId]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled. Please contact admin.'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in tenant DB
    await pool.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );

    // Sync password update to master DB
    if (tenantId) {
      await masterPool.query(
        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?',
        [hashedPassword, userId, tenantId]
      );
    }

    return res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

