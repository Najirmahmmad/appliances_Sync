import masterPool from '../database/masterPool.js';
import bcrypt from 'bcryptjs';

// --- TENANTS ---

// GET all tenants with search and filter
export const getTenants = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    
    let query = 'SELECT id, company_name, db_name, status, created_at, updated_at FROM tenants WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ' AND (company_name LIKE ? OR db_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    if (status && status !== 'All') {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await masterPool.query(query, params);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    next(error);
  }
};

// CREATE new tenant
export const createTenant = async (req, res, next) => {
  try {
    const { company_name, db_name, status = 'Active' } = req.body;
    
    if (!company_name || !db_name) {
      return res.status(400).json({ success: false, message: 'company_name and db_name are required' });
    }
    
    // Check if db_name already exists
    const [existing] = await masterPool.query('SELECT id FROM tenants WHERE db_name = ?', [db_name]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Database name already exists' });
    }
    
    const [result] = await masterPool.query(
      'INSERT INTO tenants (company_name, db_name, status) VALUES (?, ?, ?)',
      [company_name, db_name, status]
    );
    
    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: { id: result.insertId, company_name, db_name, status }
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE tenant
export const updateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { company_name, status } = req.body;
    
    const [existing] = await masterPool.query('SELECT id FROM tenants WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    
    await masterPool.query(
      'UPDATE tenants SET company_name = ?, status = ? WHERE id = ?',
      [company_name, status, id]
    );
    
    res.json({
      success: true,
      message: 'Tenant updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// --- MASTER USERS ---

// GET all master users with search and filter
export const getMasterUsers = async (req, res, next) => {
  try {
    const { search, role, status, tenant_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT u.id, u.name, u.phone, u.email, u.tenant_id, u.role, u.status, u.created_at, u.updated_at, t.company_name 
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE 1=1
    `;
    const params = [];
    
    if (search) {
      const searchClause = ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.id LIKE ?)';
      query += searchClause;
      countQuery += searchClause;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (role && role !== 'All') {
      query += ' AND u.role = ?';
      countQuery += ' AND u.role = ?';
      params.push(role);
    }
    
    if (status && status !== 'All') {
      query += ' AND u.status = ?';
      countQuery += ' AND u.status = ?';
      params.push(status);
    }
    
    if (tenant_id && tenant_id !== 'All') {
      query += ' AND u.tenant_id = ?';
      countQuery += ' AND u.tenant_id = ?';
      params.push(tenant_id);
    }
    
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    
    const [countRows] = await masterPool.query(countQuery, params);
    const total = countRows[0].total;

    const queryParams = [...params, parseInt(limit), parseInt(offset)];
    const [rows] = await masterPool.query(query, queryParams);
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// CREATE master user
export const createMasterUser = async (req, res, next) => {
  try {
    const { id, name, phone, email, password, tenant_id, role, status = 'Active' } = req.body;
    
    if (!name || !password || !role || !id) {
      return res.status(400).json({ success: false, message: 'id, name, password, and role are required' });
    }
    
    // Check if ID exists
    const [existingId] = await masterPool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existingId.length > 0) {
      return res.status(400).json({ success: false, message: 'User ID already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await masterPool.query(
      'INSERT INTO users (id, name, phone, email, password, tenant_id, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, phone || null, email || null, hashedPassword, tenant_id || null, role, status]
    );
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id, name, role }
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE master user
export const updateMasterUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, password, tenant_id, role, status } = req.body;
    
    const [existing] = await masterPool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    let query = 'UPDATE users SET name = ?, phone = ?, email = ?, tenant_id = ?, role = ?, status = ?';
    const params = [name, phone || null, email || null, tenant_id || null, role, status];
    
    if (password) {
      query += ', password = ?';
      const hashedPassword = await bcrypt.hash(password, 10);
      params.push(hashedPassword);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    await masterPool.query(query, params);
    
    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// DELETE master user
export const deleteMasterUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [existing] = await masterPool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    await masterPool.query('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
