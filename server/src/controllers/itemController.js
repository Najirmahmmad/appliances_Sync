import pool from '../config/db.js';

// Tax rate options
const VALID_TAX_RATES = [0, 5, 12, 18, 28];

// Unit options
const VALID_UNITS = ['Pcs', 'Set', 'Nos', 'Kg', 'Ltr', 'Mtr', 'Box', 'Pack'];

// Validation helper
const validateItem = (item, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate && (!item.item_code || item.item_code.trim() === '')) {
    errors.push('Item Code is required');
  }
  
  if (!item.item_name || item.item_name.trim() === '') {
    errors.push('Item Name is required');
  }
  
  // Validate sale_rate
  if (item.sale_rate === undefined || item.sale_rate === null || item.sale_rate === '') {
    errors.push('Sale Rate is required');
  } else {
    const saleRate = parseFloat(item.sale_rate);
    if (isNaN(saleRate) || saleRate < 0) {
      errors.push('Sale Rate must be a positive number or zero');
    }
  }
  
  // Validate commission
  if (item.commission !== undefined && item.commission !== null && item.commission !== '') {
    const commission = parseFloat(item.commission);
    if (isNaN(commission) || commission < 0) {
      errors.push('Commission must be a positive number or zero');
    }
  }
  
  if (item.tax_rate !== undefined && item.tax_rate !== null && item.tax_rate !== '') {
    const taxRate = parseFloat(item.tax_rate);
    if (!VALID_TAX_RATES.includes(taxRate)) {
      errors.push('Invalid tax rate. Must be one of: 0, 5, 12, 18, 28');
    }
  }
  
  if (item.unit && !VALID_UNITS.includes(item.unit)) {
    errors.push(`Invalid unit. Must be one of: ${VALID_UNITS.join(', ')}`);
  }
  
  return errors;
};

// GET all items with search, filters, and JOIN for department name
export const getItems = async (req, res, next) => {
  try {
    const { search, dept_code, status, active_only, isAMC, isAccessories } = req.query;
    
    let query = `
      SELECT 
        i.item_code, 
        i.item_name, 
        i.dept_code, 
        d.dept_name,
        i.sale_rate,
        i.commission,
        i.tax_rate, 
        i.unit, 
        i.hsn_code, 
        i.status, 
        i.created_at, 
        i.status, 
        i.current_stock,
        i.isAMC,
        IF(i.isAccessories = 1, 'Yes', 'No') as isAccessories,
        i.LeadTimeDays,
        i.rack_no,
        i.created_at, 
        i.updated_at
      FROM items i
      LEFT JOIN departments d ON i.dept_code = d.dept_code
      WHERE 1=1
    `;
    const params = [];
    
    // Search filter (by item_code or item_name)
    if (search) {
      query += ' AND (i.item_code LIKE ? OR i.item_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    // Department filter
    if (dept_code && dept_code !== 'All') {
      query += ' AND i.dept_code = ?';
      params.push(dept_code);
    }
    
    // Status filter
    if (status && status !== 'All') {
      query += ' AND i.status = ?';
      params.push(status);
    }
    
    // AMC filter
    if (isAMC && (isAMC === 'Yes' || isAMC === 'No')) {
      query += ' AND i.isAMC = ?';
      params.push(isAMC);
    }
    
    // Accessories filter
    if (isAccessories && (isAccessories === 'Yes' || isAccessories === 'No')) {
      query += ' AND i.isAccessories = ?';
      params.push(isAccessories === 'Yes' ? 1 : 0);
    }
    
    // Active only filter (for dropdowns in transactions)
    if (active_only === 'true') {
      query += ' AND i.status = ?';
      params.push('Active');
    }
    
    query += ' ORDER BY i.item_name ASC';
    
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

// GET single item by code with department name
export const getItemByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    
    const [rows] = await pool.query(
      `SELECT 
        i.item_code, 
        i.item_name, 
        i.dept_code, 
        d.dept_name,
        i.sale_rate,
        i.commission,
        i.tax_rate, 
        i.unit, 
        i.hsn_code, 
        i.status, 
        i.created_at, 
        i.status, 
        i.current_stock,
        i.isAMC,
        IF(i.isAccessories = 1, 'Yes', 'No') as isAccessories,
        i.LeadTimeDays,
        i.rack_no,
        i.created_at, 
        i.updated_at
      FROM items i
      LEFT JOIN departments d ON i.dept_code = d.dept_code
      WHERE i.item_code = ?`,
      [code]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// CREATE new item
export const createItem = async (req, res, next) => {
  try {
    const { item_code, item_name, dept_code, sale_rate, commission, tax_rate, unit, hsn_code, status = 'Active', opening_stock, isAMC = 'No', isAccessories = 'No', LeadTimeDays = 0, rack_no } = req.body;
    
    // Validate
    const errors = validateItem({ item_code, item_name, sale_rate, commission, tax_rate, unit });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    
    // Check if item code already exists
    const [existing] = await pool.query('SELECT item_code FROM items WHERE item_code = ?', [item_code]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Item Code already exists' });
    }
    
    // Check if department exists (if provided)
    if (dept_code) {
      const [deptExists] = await pool.query('SELECT dept_code FROM departments WHERE dept_code = ?', [dept_code]);
      if (deptExists.length === 0) {
        return res.status(400).json({ success: false, message: 'Department not found' });
      }
    }
    
    // Validate isAMC value
    const amcValue = isAMC === 'Yes' ? 'Yes' : 'No';
    const accessoriesValue = isAccessories === 'Yes' ? 1 : 0;
    
    // Insert item
    await pool.query(
      'INSERT INTO items (item_code, item_name, dept_code, sale_rate, commission, tax_rate, unit, hsn_code, status, current_stock, isAMC, isAccessories, LeadTimeDays, rack_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [item_code.toUpperCase(), item_name, dept_code || null, parseFloat(sale_rate), parseFloat(commission || 0), tax_rate || 0, unit || null, hsn_code || null, status, opening_stock || 0, amcValue, accessoriesValue, parseInt(LeadTimeDays) || 0, rack_no || null]
    );
    
    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: { item_code: item_code.toUpperCase(), item_name, dept_code, sale_rate: parseFloat(sale_rate), commission: parseFloat(commission || 0), tax_rate, unit, hsn_code, status, current_stock: opening_stock || 0, isAMC: amcValue, isAccessories: accessoriesValue === 1 ? 'Yes' : 'No', LeadTimeDays: parseInt(LeadTimeDays) || 0, rack_no }
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE item
export const updateItem = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { item_name, dept_code, sale_rate, commission, tax_rate, unit, hsn_code, status, current_stock, isAMC, isAccessories, LeadTimeDays, rack_no } = req.body;
    
    // Check if item exists
    const [existing] = await pool.query('SELECT item_code FROM items WHERE item_code = ?', [code]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    // Validate
    const errors = validateItem({ item_name, sale_rate, commission, tax_rate, unit }, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    
    // Check if department exists (if provided)
    if (dept_code) {
      const [deptExists] = await pool.query('SELECT dept_code FROM departments WHERE dept_code = ?', [dept_code]);
      if (deptExists.length === 0) {
        return res.status(400).json({ success: false, message: 'Department not found' });
      }
    }
    
    // Validate isAMC value
    const amcValue = isAMC === 'Yes' ? 'Yes' : 'No';
    const accessoriesValue = isAccessories === 'Yes' ? 1 : 0;
    
    // Update item
    await pool.query(
      'UPDATE items SET item_name = ?, dept_code = ?, sale_rate = ?, commission = ?, tax_rate = ?, unit = ?, hsn_code = ?, status = ?, current_stock = ?, isAMC = ?, isAccessories = ?, LeadTimeDays = ?, rack_no = ? WHERE item_code = ?',
      [item_name, dept_code || null, parseFloat(sale_rate), parseFloat(commission || 0), tax_rate || 0, unit || null, hsn_code || null, status, current_stock || 0, amcValue, accessoriesValue, parseInt(LeadTimeDays) || 0, rack_no || null, code]
    );
    
    res.json({
      success: true,
      message: 'Item updated successfully',
      data: { item_code: code, item_name, dept_code, sale_rate: parseFloat(sale_rate), commission: parseFloat(commission || 0), tax_rate, unit, hsn_code, status, current_stock, isAMC: amcValue, isAccessories: accessoriesValue === 1 ? 'Yes' : 'No', LeadTimeDays: parseInt(LeadTimeDays) || 0, rack_no }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE item
export const deleteItem = async (req, res, next) => {
  try {
    const { code } = req.params;
    
    // Check if item exists
    const [existing] = await pool.query('SELECT item_code FROM items WHERE item_code = ?', [code]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    // TODO: Check if item is used in transactions before deleting
    
    await pool.query('DELETE FROM items WHERE item_code = ?', [code]);
    
    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Toggle item status
export const toggleItemStatus = async (req, res, next) => {
  try {
    const { code } = req.params;
    
    // Check if item exists
    const [existing] = await pool.query('SELECT item_code, status FROM items WHERE item_code = ?', [code]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    const currentStatus = existing[0].status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    
    await pool.query('UPDATE items SET status = ? WHERE item_code = ?', [newStatus, code]);
    
    res.json({
      success: true,
      message: `Item ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`,
      data: { item_code: code, status: newStatus }
    });
  } catch (error) {
    next(error);
  }
};

// Get available options for dropdowns
export const getItemOptions = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        tax_rates: VALID_TAX_RATES,
        units: VALID_UNITS
      }
    });
  } catch (error) {
    next(error);
  }
};