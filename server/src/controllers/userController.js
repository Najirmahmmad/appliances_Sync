import pool from '../config/db.js';
import masterPool from '../database/masterPool.js';
import bcrypt from 'bcryptjs';

// Validation helper
const validateUser = (user, isUpdate = false) => {
  const errors = [];
  
  if (!user.id || user.id.trim() === '') {
    errors.push('User ID is required');
  }
  
  if (!user.name || user.name.trim() === '') {
    errors.push('Name is required');
  }
  
  // Password required only for new users
  if (!isUpdate && (!user.password || user.password.trim() === '')) {
    errors.push('Password is required');
  }
  
  if (!user.role || !['Admin', 'Operator', 'Technician'].includes(user.role)) {
    errors.push('Valid role (Admin, Operator, Technician) is required');
  }
  
  // Email validation (optional but if provided, validate format)
  if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    errors.push('Invalid email format');
  }
  
  // Phone validation (optional but if provided, validate)
  if (user.phone && !/^\d{10,15}$/.test(user.phone.replace(/[- ]/g, ''))) {
    errors.push('Invalid phone number');
  }
  
  return errors;
};

// GET all users with search and filter for current tenant
export const getUsers = async (req, res, next) => {
  try {
    const { search, role, status } = req.query;
    const tenantId = req.user?.tenant_id;
    
    let query = 'SELECT id, name, phone, email, role, status, created_at, updated_at FROM users WHERE 1=1';
    const params = [];
    
    // Search filter (by id, name, email, phone)
    if (search) {
      query += ' AND (id LIKE ? OR name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Role filter
    if (role && role !== 'All') {
      query += ' AND role = ?';
      params.push(role);
    }
    
    // Status filter
    if (status && status !== 'All') {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.query(query, params);
    
    // Attach tenant_id to each user object for complete tenant context
    const data = rows.map(user => ({
      ...user,
      tenant_id: tenantId
    }));
    
    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    next(error);
  }
};

// GET single user by ID for current tenant
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    
    const [rows] = await pool.query(
      'SELECT id, name, phone, email, role, status, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      data: {
        ...rows[0],
        tenant_id: tenantId
      }
    });
  } catch (error) {
    next(error);
  }
};

// CREATE new user for current tenant
export const createUser = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { id, name, phone, email, password, role, status = 'Active' } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID missing from context' });
    }
    
    // Validate
    const errors = validateUser({ id, name, password, role, email, phone });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    
    // Check if user ID already exists in tenant DB or Master DB
    const [existingTenantUser] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existingTenantUser.length > 0) {
      return res.status(400).json({ success: false, message: 'User ID already exists in this tenant' });
    }
    
    const [existingMasterUser] = await masterPool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existingMasterUser.length > 0) {
      return res.status(400).json({ success: false, message: 'User ID already exists in system' });
    }
    
    // Check if email already exists
    if (email) {
      const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existingEmail.length > 0) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user into Tenant Database
    await pool.query(
      'INSERT INTO users (id, name, phone, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, phone || null, email || null, hashedPassword, role, status]
    );

    // Sync insert to Master Database with assigned tenant_id for authentication isolation
    await masterPool.query(
      `INSERT INTO users (id, name, phone, email, password, tenant_id, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         phone = VALUES(phone),
         email = VALUES(email),
         password = VALUES(password),
         tenant_id = VALUES(tenant_id),
         role = VALUES(role),
         status = VALUES(status)`,
      [id, name, phone || null, email || null, hashedPassword, tenantId, role, status]
    );
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id, name, phone, email, role, status, tenant_id: tenantId }
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE user for current tenant
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const { name, phone, email, password, role, status } = req.body;
    
    // Check if user exists in tenant DB
    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found in current tenant' });
    }
    
    // Validate (isUpdate = true, so password not required)
    const errors = validateUser({ id, name, role, email, phone }, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    
    // Check if email already exists for another user
    if (email) {
      const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (existingEmail.length > 0) {
        return res.status(400).json({ success: false, message: 'Email already exists for another user' });
      }
    }
    
    // Build tenant DB update query
    let query = 'UPDATE users SET name = ?, phone = ?, email = ?, role = ?, status = ?';
    const params = [name, phone || null, email || null, role, status];
    
    let hashedPassword = null;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    await pool.query(query, params);

    // Sync update to Master DB filtered strictly by user id and tenant_id
    let masterQuery = 'UPDATE users SET name = ?, phone = ?, email = ?, role = ?, status = ?';
    const masterParams = [name, phone || null, email || null, role, status];
    
    if (hashedPassword) {
      masterQuery += ', password = ?';
      masterParams.push(hashedPassword);
    }
    
    masterQuery += ' WHERE id = ? AND tenant_id = ?';
    masterParams.push(id, tenantId);
    
    await masterPool.query(masterQuery, masterParams);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: { id, name, phone, email, role, status, tenant_id: tenantId }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE user for current tenant
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    
    // Check if user exists
    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found in current tenant' });
    }
    
    // Prevent deleting the last admin
    const [admins] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "Admin"');
    const [isAdmin] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
    
    if (isAdmin[0]?.role === 'Admin' && admins[0]?.count <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete the last admin user' });
    }
    
    // Delete from tenant DB
    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    // Delete from Master DB for this tenant
    await masterPool.query('DELETE FROM users WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Toggle user status for current tenant
export const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    
    // Check if user exists
    const [existing] = await pool.query('SELECT id, status, role FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found in current tenant' });
    }
    
    const currentStatus = existing[0].status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    
    // Prevent deactivating the last active admin
    if (existing[0].role === 'Admin' && newStatus === 'Inactive') {
      const [activeAdmins] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "Admin" AND status = "Active"');
      if (activeAdmins[0]?.count <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot deactivate the last active admin' });
      }
    }
    
    // Update tenant DB
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, id]);

    // Sync status change to Master DB for this tenant
    await masterPool.query('UPDATE users SET status = ? WHERE id = ? AND tenant_id = ?', [newStatus, id, tenantId]);
    
    res.json({
      success: true,
      message: `User ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`,
      data: { id, status: newStatus, tenant_id: tenantId }
    });
  } catch (error) {
    next(error);
  }
};
