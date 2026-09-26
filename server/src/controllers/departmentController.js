import pool from '../config/db.js';

// Validation helper
const validateDepartment = (department) => {
  const errors = [];
  
  if (!department.dept_code || department.dept_code.trim() === '') {
    errors.push('Department Code is required');
  }
  
  if (!department.dept_name || department.dept_name.trim() === '') {
    errors.push('Department Name is required');
  }
  
  return errors;
};

// GET all departments with search and filter
export const getDepartments = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    
    let query = 'SELECT dept_code, dept_name, status, created_at, updated_at FROM departments WHERE 1=1';
    const params = [];
    
    // Search filter (by dept_code or dept_name)
    if (search) {
      query += ' AND (dept_code LIKE ? OR dept_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    // Status filter
    if (status && status !== 'All') {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY dept_name ASC';
    
    const [rows] = await pool.query(query, params);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    next(error);
  }
};

// GET single department by code
export const getDepartmentByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    
    const [rows] = await pool.query(
      'SELECT dept_code, dept_name, status, created_at, updated_at FROM departments WHERE dept_code = ?',
      [code]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// CREATE new department
export const createDepartment = async (req, res, next) => {
  try {
    const { dept_code, dept_name, status = 'Active' } = req.body;
    
    // Validate
    const errors = validateDepartment({ dept_code, dept_name });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    
    // Check if department code already exists
    const [existing] = await pool.query('SELECT dept_code FROM departments WHERE dept_code = ?', [dept_code]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Department Code already exists' });
    }
    
    // Insert department
    await pool.query(
      'INSERT INTO departments (dept_code, dept_name, status) VALUES (?, ?, ?)',
      [dept_code.toUpperCase(), dept_name, status]
    );
    
    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: { dept_code: dept_code.toUpperCase(), dept_name, status }
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE department
export const updateDepartment = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { dept_name, status } = req.body;
    
    // Check if department exists
    const [existing] = await pool.query('SELECT dept_code FROM departments WHERE dept_code = ?', [code]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    
    // Validate
    const errors = validateDepartment({ dept_code: code, dept_name });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    
    // Update department
    await pool.query(
      'UPDATE departments SET dept_name = ?, status = ? WHERE dept_code = ?',
      [dept_name, status, code]
    );
    
    res.json({
      success: true,
      message: 'Department updated successfully',
      data: { dept_code: code, dept_name, status }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE department
export const deleteDepartment = async (req, res, next) => {
  try {
    const { code } = req.params;
    
    // Check if department exists
    const [existing] = await pool.query('SELECT dept_code FROM departments WHERE dept_code = ?', [code]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    
    // TODO: Check if department is used in other tables before deleting
    
    await pool.query('DELETE FROM departments WHERE dept_code = ?', [code]);
    
    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Toggle department status
export const toggleDepartmentStatus = async (req, res, next) => {
  try {
    const { code } = req.params;
    
    // Check if department exists
    const [existing] = await pool.query('SELECT dept_code, status FROM departments WHERE dept_code = ?', [code]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    
    const currentStatus = existing[0].status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    
    await pool.query('UPDATE departments SET status = ? WHERE dept_code = ?', [newStatus, code]);
    
    res.json({
      success: true,
      message: `Department ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`,
      data: { dept_code: code, status: newStatus }
    });
  } catch (error) {
    next(error);
  }
};
