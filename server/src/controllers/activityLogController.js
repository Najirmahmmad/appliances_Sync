import pool from '../config/db.js';

// GET /api/activity-log
export const getLogs = async (req, res) => {
  try {
    const { role, user_id, action_type, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    let query = `SELECT l.*, u.name as user_name FROM user_activity_log l LEFT JOIN users u ON l.user_id = u.id WHERE 1=1`;
    let queryParams = [];

    // Optional filters
    if (role) { 
      query += ` AND l.role = ?`; 
      queryParams.push(role); 
    }
    if (user_id) { 
      query += ` AND l.user_id = ?`; 
      queryParams.push(user_id); 
    }
    if (action_type) { 
      query += ` AND l.action_type = ?`; 
      queryParams.push(action_type); 
    }
    if (startDate && endDate) { 
      // Ensure date compares correctly
      query += ` AND DATE(l.created_at) BETWEEN ? AND ?`; 
      queryParams.push(startDate, endDate); 
    } else if (startDate) {
      query += ` AND DATE(l.created_at) >= ?`; 
      queryParams.push(startDate);
    } else if (endDate) {
      query += ` AND DATE(l.created_at) <= ?`; 
      queryParams.push(endDate);
    }

    // Pagination setup
    query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    const offset = parseInt((page - 1) * limit);
    queryParams.push(parseInt(limit), offset);

    // Run main query
    const [logs] = await pool.query(query, queryParams);
    
    // Total count for pagination (building base query again without limits)
    let countQuery = `SELECT COUNT(*) as total FROM user_activity_log l WHERE 1=1`;
    let countParams = [];
    if (role) { countQuery += ` AND l.role = ?`; countParams.push(role); }
    if (user_id) { countQuery += ` AND l.user_id = ?`; countParams.push(user_id); }
    if (action_type) { countQuery += ` AND l.action_type = ?`; countParams.push(action_type); }
    if (startDate && endDate) { countQuery += ` AND DATE(l.created_at) BETWEEN ? AND ?`; countParams.push(startDate, endDate); }
    else if (startDate) { countQuery += ` AND DATE(l.created_at) >= ?`; countParams.push(startDate); }
    else if (endDate) { countQuery += ` AND DATE(l.created_at) <= ?`; countParams.push(endDate); }

    const [countResult] = await pool.query(countQuery, countParams);

    res.json({ 
      success: true, 
      data: logs, 
      total: countResult[0].total, 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving logs' });
  }
};

// GET /api/activity-log/:id
export const getActiveLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const [log] = await pool.query(`SELECT l.*, u.name as user_name FROM user_activity_log l LEFT JOIN users u ON l.user_id = u.id WHERE l.id = ?`, [id]);
    
    if (log.length === 0) {
      return res.status(404).json({ success: false, message: 'Log entry not found' });
    }
    
    res.json({ success: true, data: log[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving log' });
  }
};

// DELETE /api/activity-log/:id
// Admins only (Should be protected by role Middleware)
export const deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete is preferred, but for this requirement:
    const [result] = await pool.query('DELETE FROM user_activity_log WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }
    
    res.json({ success: true, message: 'Log deleted securely' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting log' });
  }
};

// POST /api/activity-log  (Used by Frontend service)
export const createLogFromClient = async (req, res) => {
    try {
      // Must be authenticated to reach this point
      const userId = req.user ? req.user.id : req.body.userId;
      const role = req.user ? req.user.role : req.body.role;
      const { actionType, actionTarget, description } = req.body;
      
      if (!userId || !actionType) {
         return res.status(400).json({ success: false, message: 'Missing required log fields' });
      }

      // We import it manually to avoid circular dependancy, but we can reuse the logic
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown';

      // Ensure valid actions according to enum
      const validActions = ['login', 'logout', 'add', 'edit', 'delete', 'view_report', 'export_report', 'other'];
      const safeAction = validActions.includes(actionType) ? actionType : 'other';

      const query = `
        INSERT INTO user_activity_log 
        (user_id, role, action_type, action_target, description, ip_address, user_agent) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      await pool.query(query, [userId, role, safeAction, actionTarget, description || '', ip, userAgent]);
      
      res.json({ success: true, message: 'Log recorded gracefully.' });
    } catch (err) {
      // Silence client errors so we dont break UI
      console.warn("Client activity log insertion error:", err.message);
      res.json({ success: false, message: 'Logging failed but suppressed.' });
    }
}
