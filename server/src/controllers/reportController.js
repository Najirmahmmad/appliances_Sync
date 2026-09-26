
import pool from '../config/db.js';

// GET Commission Report
export const getCommissionReport = async (req, res, next) => {
    try {
        const { startDate, endDate, technicianId, book_code } = req.query;

        let query = `
      SELECT 
        sh.vouch_date,
        sh.book_code,
        sh.vouch_no,
        u.name AS technician_name,
        si.item_code,
        si.item_name,
        si.qty,
        si.comm_rate,
        si.tot_commission
      FROM sales_header sh
      JOIN sales_items si ON sh.book_code = si.book_code AND sh.vouch_no = si.vouch_no
      LEFT JOIN users u ON sh.created_by = u.id
      WHERE 1=1
    `;

        const params = [];

        // Date Filters (Mandatory)
        if (startDate) {
            query += ' AND sh.vouch_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND sh.vouch_date <= ?';
            params.push(endDate);
        }

        // Role-Based Logic
        if (req.user.role === 'technician' || req.user.role === 'Technician') {
            // Technician can ONLY see their own data
            query += ' AND sh.created_by = ?';
            params.push(req.user.id);
        } else {
            // Admin can filter by specific technician (if provided)
            if (technicianId && technicianId !== 'All') {
                query += ' AND sh.created_by = ?';
                params.push(technicianId);
            }
        }

        query += ' ORDER BY sh.vouch_date DESC';

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

// GET Stock Transfer Report
export const getStockTransferReport = async (req, res, next) => {
    try {
        const { startDate, endDate, technicianId, book_code } = req.query;

        let query = `
            SELECT 
                sh.vouch_date,
                sh.book_code,
                sh.vouch_no,
                u.name AS technician_name,
                si.item_code,
                si.item_name,
                si.qty,
                sh.remarks,
                sh.technician_id
            FROM stock_header sh
            JOIN stock_items si ON sh.book_code = si.book_code AND sh.vouch_no = si.vouch_no
            LEFT JOIN users u ON sh.technician_id = u.id
            WHERE 1=1
        `;

        const params = [];
        // Book Code Filter
        query += ' AND sh.book_code = ?';
        params.push(book_code || 'ST');

        // Date Filters
        if (startDate) {
            query += ' AND sh.vouch_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND sh.vouch_date <= ?';
            params.push(endDate);
        }

        // Role-Based Logic
        if (req.user.role === 'technician' || req.user.role === 'Technician') {
            // Technician can ONLY see their own data
            query += ' AND sh.technician_id = ?';
            params.push(req.user.id);
        } else {
            // Admin/Operator can filter by specific technician
            if (technicianId && technicianId !== 'All') {
                query += ' AND sh.technician_id = ?';
                params.push(technicianId);
            }
        }

        query += ' ORDER BY sh.vouch_date DESC, sh.vouch_no DESC';

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

// GET Sale Summary Report
export const getSaleSummaryReport = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        let query = `
            SELECT 
                sh.vouch_date,
                sh.book_code,
                sh.vouch_no,
                sh.party_name,
                sh.party_gst,
                sh.net_amount,
                sh.payment_mode,
                u.name AS created_by_name
            FROM sales_header sh
            LEFT JOIN users u ON sh.created_by = u.id
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            query += ' AND sh.vouch_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND sh.vouch_date <= ?';
            params.push(endDate);
        }

        // Payment Mode Filter
        if (req.query.payment_mode && req.query.payment_mode !== 'All') {
            query += ' AND sh.payment_mode = ?';
            params.push(req.query.payment_mode);
        }

        // Created By Filter
        if (req.query.created_by && req.query.created_by !== 'All') {
            query += ' AND sh.created_by = ?';
            params.push(req.query.created_by);
        }

        query += ' ORDER BY sh.vouch_date DESC';

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

// GET Sale Register Report
export const getSaleRegisterReport = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        let query = `
            SELECT 
                sh.vouch_date,
                sh.book_code,
                sh.vouch_no,
                sh.party_name,
                si.item_name,
                si.qty,
                si.rate,
                si.tax_amt,
                si.net_amt,
                u.name AS created_by_name
            FROM sales_header sh
            JOIN sales_items si ON sh.book_code = si.book_code AND sh.vouch_no = si.vouch_no
            LEFT JOIN users u ON sh.created_by = u.id
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            query += ' AND sh.vouch_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND sh.vouch_date <= ?';
            params.push(endDate);
        }

        // Item Filter
        if (req.query.item_code && req.query.item_code !== 'All') {
            query += ' AND si.item_code = ?';
            params.push(req.query.item_code);
        }

        // Created By Filter
        if (req.query.created_by && req.query.created_by !== 'All') {
            query += ' AND sh.created_by = ?';
            params.push(req.query.created_by);
        }

        query += ' ORDER BY sh.vouch_date DESC, sh.vouch_no DESC';

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

// GET Purchase Summary Report
export const getPurchaseSummaryReport = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        let query = `
            SELECT 
                sh.vouch_date,
                sh.book_code,
                sh.vouch_no,
                sh.party_name,
                sh.party_gst,
                sh.net_amount,
                u.name AS created_by_name
            FROM sales_header sh
            LEFT JOIN users u ON sh.created_by = u.id
            WHERE sh.book_code = 'PU'
        `;
        const params = [];

        if (startDate) {
            query += ' AND sh.vouch_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND sh.vouch_date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY sh.vouch_date DESC';

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

// GET Purchase Register Report
export const getPurchaseRegisterReport = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        let query = `
            SELECT 
                sh.vouch_date,
                sh.book_code,
                sh.vouch_no,
                sh.party_name,
                si.item_name,
                si.qty,
                si.rate,
                si.tax_amt,
                si.net_amt
            FROM sales_header sh
            JOIN sales_items si ON sh.book_code = si.book_code AND sh.vouch_no = si.vouch_no
            WHERE sh.book_code = 'PU'
        `;
        const params = [];

        if (startDate) {
            query += ' AND sh.vouch_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND sh.vouch_date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY sh.vouch_date DESC, sh.vouch_no DESC';

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

// GET Current Stock Report
export const getCurrentStockReport = async (req, res, next) => {
    try {
        const { technicianId } = req.query; // For Admin to filter by technician

        let query = '';
        const params = [];

        // Technician View (or Admin viewing a specific Technician)
        // If logged in as Technician OR (Admin AND technicianId is provided and not 'All')
        if (
            (req.user.role === 'technician' || req.user.role === 'Technician') ||
            ((req.user.role === 'admin' || req.user.role === 'Admin') && technicianId && technicianId !== 'All')
        ) {

            // Determine the target technician ID
            const targetTechId = (req.user.role === 'technician' || req.user.role === 'Technician')
                ? req.user.id
                : technicianId;

            query = `
                SELECT 
                    ts.item_code,
                    i.item_name,
                    ts.current_qty,
                    u.name as technician_name
                FROM technician_stock ts
                JOIN items i ON ts.item_code = i.item_code
                LEFT JOIN users u ON ts.technician_id = u.id
                WHERE ts.technician_id = ?
            `;
            params.push(targetTechId);

            // Optional: Filter by item name or code if needed in future
            query += ' ORDER BY i.item_name ASC';

        } else {
            // Admin View (Main Stock) - Default if no technician selected
            query = `
                SELECT 
                    item_code,
                    item_name,
                    current_stock as current_qty,
                    'Main Stock' as technician_name
                FROM items
                WHERE 1=1
            `;

            query += ' ORDER BY item_name ASC';
        }

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

// GET Reminder Lead Report
export const getReminderReport = async (req, res, next) => {
    try {
        const { created_by, item_code } = req.query;

        let query = `
            SELECT 
                sh.vouch_date,
                sh.book_code,
                sh.vouch_no,
                sh.party_name,
                sh.party_phone,
                sh.party_address,
                sh.party_gst,
                sh.remarks,
                si.item_name,
                si.item_code,
                si.qty,
                u.name AS created_by_name,
                DATE_ADD(sh.vouch_date, INTERVAL (si.qty * i.LeadTimeDays) DAY) AS reminder_date
            FROM sales_header sh
            JOIN sales_items si ON sh.book_code = si.book_code AND sh.vouch_no = si.vouch_no
            JOIN items i ON si.item_code = i.item_code
            LEFT JOIN users u ON sh.created_by = u.id
            WHERE i.LeadTimeDays > 0
              AND DATE_ADD(sh.vouch_date, INTERVAL (si.qty * i.LeadTimeDays) DAY) <= CURDATE()
        `;
        const params = [];

        // Role-Based Logic for Technician
        if (req.user.role === 'technician' || req.user.role === 'Technician') {
            // Technician can ONLY see their own data
            query += ' AND sh.created_by = ?';
            params.push(req.user.id);
        } else {
            // Created By Filter
            if (created_by && created_by !== 'All') {
                query += ' AND sh.created_by = ?';
                params.push(created_by);
            }
        }

        // Item Filter
        if (item_code && item_code !== 'All' && item_code !== '') {
            query += ' AND si.item_code = ?';
            params.push(item_code);
        }

        query += ' ORDER BY reminder_date ASC, sh.vouch_date DESC';
        console.log(query);
        console.log(params);

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
