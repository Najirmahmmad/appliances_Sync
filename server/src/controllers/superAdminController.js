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
    const { search, role, status, tenant_id } = req.query;
    
    let query = `
      SELECT u.id, u.name, u.phone, u.email, u.tenant_id, u.role, u.status, u.created_at, u.updated_at, t.company_name 
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE 1=1
    `;
    const params = [];
    
    if (search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.id LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (role && role !== 'All') {
      query += ' AND u.role = ?';
      params.push(role);
    }
    
    if (status && status !== 'All') {
      query += ' AND u.status = ?';
      params.push(status);
    }
    
    if (tenant_id) {
      query += ' AND u.tenant_id = ?';
      params.push(tenant_id);
    }
    
    query += ' ORDER BY u.created_at DESC';
    
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
