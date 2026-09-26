import pool from '../config/db.js';

// Auto-numbering utility function for Stock Transfer
export const getNextStockVoucherNumber = async (bookCode) => {
    try {
        const [rows] = await pool.query(
            'SELECT MAX(vouch_no) as max_vouch_no FROM stock_header WHERE book_code = ?',
            [bookCode]
        );

        const maxVouchNo = rows[0].max_vouch_no;
        return maxVouchNo ? maxVouchNo + 1 : 1;
    } catch (error) {
        throw error;
    }
};

// CREATE new Stock Transfer (Main -> Technician)
export const createStockTransfer = async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { header, items } = req.body;

        // Header validations
        if (!header.technician_id) {
            throw new Error('Technician ID is required');
        }
        if (!header.vouch_date) {
            throw new Error('Voucher Date is required');
        }

        // Get next voucher number
        const bookCode = header.book_code || 'ST';
        const nextVouchNo = await getNextStockVoucherNumber(bookCode);

        // Insert Header
        await connection.query(
            'INSERT INTO stock_header (book_code, vouch_no, vouch_date, technician_id, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [
                bookCode,
                nextVouchNo,
                header.vouch_date,
                header.technician_id,
                header.remarks || null,
                req.user.id
            ]
        );

        // Process Items
        for (const item of items) {
            if (!item.item_code || !item.qty || item.qty <= 0) {
                throw new Error('Invalid item data');
            }

            // 1. Check Main Stock and Technican Stock
            const [mainItem] = await connection.query(
                'SELECT current_stock, item_name FROM items WHERE item_code = ? FOR UPDATE',
                [item.item_code]
            );

            if (mainItem.length === 0) {
                throw new Error(`Item ${item.item_code} not found`);
            }

            let techStockRecord = null;
            if (bookCode === 'STR') {
                // For Return, technician MUST have sufficient stock
                const [techStock] = await connection.query(
                    'SELECT id, current_qty FROM technician_stock WHERE technician_id = ? AND item_code = ? FOR UPDATE',
                    [header.technician_id, item.item_code]
                );
                
                if (techStock.length === 0 || techStock[0].current_qty < item.qty) {
                    throw new Error(`Insufficient technician stock for item ${mainItem[0].item_name}. Available: ${techStock.length > 0 ? techStock[0].current_qty : 0}, Requested: ${item.qty}`);
                }
                techStockRecord = techStock[0];
            } else {
                // For Transfer, main stock MUST be sufficient
                if (mainItem[0].current_stock < item.qty) {
                    throw new Error(`Insufficient stock for item ${mainItem[0].item_name}. Available: ${mainItem[0].current_stock}, Requested: ${item.qty}`);
                }
            }

            // 2. Insert into stock_items
            await connection.query(
                'INSERT INTO stock_items (book_code, vouch_no, sr_no, item_code, item_name, qty, serial_numbers) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    bookCode,
                    nextVouchNo,
                    items.indexOf(item) + 1,
                    item.item_code,
                    mainItem[0].item_name,
                    item.qty,
                    item.serial_numbers || null
                ]
            );

            // 3. Update Stocks
            if (bookCode === 'STR') {
                // Transfer from Technician to Main
                await connection.query(
                    'UPDATE items SET current_stock = current_stock + ? WHERE item_code = ?',
                    [item.qty, item.item_code]
                );
                
                await connection.query(
                    'UPDATE technician_stock SET current_qty = current_qty - ? WHERE id = ?',
                    [item.qty, techStockRecord.id]
                );
            } else {
                // Transfer from Main to Technician
                await connection.query(
                    'UPDATE items SET current_stock = current_stock - ? WHERE item_code = ?',
                    [item.qty, item.item_code]
                );

                const [techStock] = await connection.query(
                    'SELECT id FROM technician_stock WHERE technician_id = ? AND item_code = ?',
                    [header.technician_id, item.item_code]
                );

                if (techStock.length > 0) {
                    await connection.query(
                        'UPDATE technician_stock SET current_qty = current_qty + ? WHERE id = ?',
                        [item.qty, techStock[0].id]
                    );
                } else {
                    await connection.query(
                        'INSERT INTO technician_stock (technician_id, item_code, current_qty) VALUES (?, ?, ?)',
                        [header.technician_id, item.item_code, item.qty]
                    );
                }
            }
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: `Stock Transfer ${bookCode} #${nextVouchNo} created successfully`,
            data: {
                book_code: bookCode,
                vouch_no: nextVouchNo
            }
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// Get Stock for a specific technician
export const getTechnicianStock = async (req, res, next) => {
    try {
        const { technicianId } = req.params;

        const [rows] = await pool.query(
            `SELECT ts.item_code, i.item_name, ts.current_qty 
             FROM technician_stock ts
             JOIN items i ON ts.item_code = i.item_code
             WHERE ts.technician_id = ?`,
            [technicianId]
        );

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

// GET Stock Transfer Headers with Filters
export const getStockTransfers = async (req, res, next) => {
    try {
        const { startDate, endDate, technician_id, book_code, page, limit } = req.query;

        let query = `
            SELECT 
                sh.book_code, 
                sh.vouch_no, 
                sh.vouch_date, 
                sh.remarks, 
                u.name as technician_name,
                sh.technician_id
            FROM stock_header sh
            LEFT JOIN users u ON sh.technician_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (technician_id) {
            query += ' AND sh.technician_id = ?';
            params.push(technician_id);
        }

        if (startDate) {
            query += ' AND sh.vouch_date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND sh.vouch_date <= ?';
            params.push(endDate);
        }

        if (book_code) {
            query += ' AND sh.book_code = ?';
            params.push(book_code);
        }

        query += ' ORDER BY sh.vouch_date DESC, sh.vouch_no DESC';

        // Get total count using subquery
        const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS countTable`;
        const [countRows] = await pool.query(countQuery, params);
        const totalRecords = countRows[0].total;

        // Pagination logic
        const parsedPage = parseInt(page) || 1;
        const parsedLimit = parseInt(limit) || 50;
        const offset = (parsedPage - 1) * parsedLimit;

        query += ' LIMIT ? OFFSET ?';
        params.push(parsedLimit, offset);

        const [rows] = await pool.query(query, params);

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: totalRecords,
                page: parsedPage,
                limit: parsedLimit,
                totalPages: Math.ceil(totalRecords / parsedLimit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET Single Stock Transfer with Items
export const getStockTransfer = async (req, res, next) => {
    try {
        const { bookCode, vouchNo } = req.params;

        // Get Header
        const [header] = await pool.query(
            'SELECT * FROM stock_header WHERE book_code = ? AND vouch_no = ?',
            [bookCode, vouchNo]
        );

        if (header.length === 0) {
            return res.status(404).json({ success: false, message: 'Stock transfer not found' });
        }

        // Get Items with Current Stock info
        const [items] = await pool.query(
            `SELECT 
                si.*, 
                i.current_stock as main_stock 
             FROM stock_items si
             JOIN items i ON si.item_code = i.item_code
             WHERE si.book_code = ? AND si.vouch_no = ?`,
            [bookCode, vouchNo]
        );

        res.json({
            success: true,
            data: {
                header: header[0],
                items: items
            }
        });
    } catch (error) {
        next(error);
    }
};

// DELETE Stock Transfer (Revert Stock)
export const deleteStockTransfer = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { bookCode, vouchNo } = req.params;

        // 1. Get Details
        const [header] = await connection.query(
            'SELECT technician_id FROM stock_header WHERE book_code = ? AND vouch_no = ?',
            [bookCode, vouchNo]
        );

        if (header.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Stock transfer not found' });
        }

        const technicianId = header[0].technician_id;

        const [items] = await connection.query(
            'SELECT item_code, qty FROM stock_items WHERE book_code = ? AND vouch_no = ?',
            [bookCode, vouchNo]
        );

        // 2. Revert Stock
        for (const item of items) {
            if (bookCode === 'STR') {
                // Revert STR: Decrease Main Stock, Increase Technician Stock
                await connection.query(
                    'UPDATE items SET current_stock = current_stock - ? WHERE item_code = ?',
                    [item.qty, item.item_code]
                );
                
                const [techStock] = await connection.query(
                    'SELECT id FROM technician_stock WHERE technician_id = ? AND item_code = ?',
                    [technicianId, item.item_code]
                );
                if (techStock.length > 0) {
                    await connection.query(
                        'UPDATE technician_stock SET current_qty = current_qty + ? WHERE id = ?',
                        [item.qty, techStock[0].id]
                    );
                } else {
                    await connection.query(
                        'INSERT INTO technician_stock (technician_id, item_code, current_qty) VALUES (?, ?, ?)',
                        [technicianId, item.item_code, item.qty]
                    );
                }
            } else {
                // Revert ST: Decrease Technician Stock, Increase Main Stock
                await connection.query(
                    'UPDATE technician_stock SET current_qty = current_qty - ? WHERE technician_id = ? AND item_code = ?',
                    [item.qty, technicianId, item.item_code]
                );

                await connection.query(
                    'UPDATE items SET current_stock = current_stock + ? WHERE item_code = ?',
                    [item.qty, item.item_code]
                );
            }
        }

        // 3. Delete Record (Items cascade delete due to FK)
        await connection.query(
            'DELETE FROM stock_header WHERE book_code = ? AND vouch_no = ?',
            [bookCode, vouchNo]
        );

        await connection.commit();
        res.json({ success: true, message: 'Stock transfer deleted successfully' });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// UPDATE Stock Transfer
export const updateStockTransfer = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { bookCode, vouchNo } = req.params;
        const { header, items } = req.body;

        // 1. Get Existing Details to Revert
        const [existingHeader] = await connection.query(
            'SELECT technician_id FROM stock_header WHERE book_code = ? AND vouch_no = ?',
            [bookCode, vouchNo]
        );

        if (existingHeader.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Stock transfer not found' });
        }

        const oldTechnicianId = existingHeader[0].technician_id;

        const [oldItems] = await connection.query(
            'SELECT item_code, qty FROM stock_items WHERE book_code = ? AND vouch_no = ?',
            [bookCode, vouchNo]
        );

        // 2. Revert Old Stock
        for (const item of oldItems) {
            if (bookCode === 'STR') {
                // Revert STR: Decrease Main, Increase Tech
                await connection.query(
                    'UPDATE items SET current_stock = current_stock - ? WHERE item_code = ?',
                    [item.qty, item.item_code]
                );
                
                const [techStock] = await connection.query(
                    'SELECT id FROM technician_stock WHERE technician_id = ? AND item_code = ?',
                    [oldTechnicianId, item.item_code]
                );
                if (techStock.length > 0) {
                    await connection.query(
                        'UPDATE technician_stock SET current_qty = current_qty + ? WHERE id = ?',
                        [item.qty, techStock[0].id]
                    );
                } else {
                    await connection.query(
                        'INSERT INTO technician_stock (technician_id, item_code, current_qty) VALUES (?, ?, ?)',
                        [oldTechnicianId, item.item_code, item.qty]
                    );
                }
            } else {
                // Decrease from Old Technician
                await connection.query(
                    'UPDATE technician_stock SET current_qty = current_qty - ? WHERE technician_id = ? AND item_code = ?',
                    [item.qty, oldTechnicianId, item.item_code]
                );

                // Increase Main Stock
                await connection.query(
                    'UPDATE items SET current_stock = current_stock + ? WHERE item_code = ?',
                    [item.qty, item.item_code]
                );
            }
        }

        // 3. Delete Old Items
        await connection.query('DELETE FROM stock_items WHERE book_code = ? AND vouch_no = ?', [bookCode, vouchNo]);

        // 4. Update Header
        await connection.query(
            'UPDATE stock_header SET vouch_date = ?, technician_id = ?, remarks = ? WHERE book_code = ? AND vouch_no = ?',
            [header.vouch_date, header.technician_id, header.remarks, bookCode, vouchNo]
        );

        // 5. Process New Items (Copying logic from create)
        for (const item of items) {
            // Check Main Stock (Locking)
            const [mainItem] = await connection.query(
                'SELECT current_stock, item_name FROM items WHERE item_code = ? FOR UPDATE',
                [item.item_code]
            );

            if (mainItem.length === 0) {
                throw new Error(`Item ${item.item_code} not found`);
            }

            let techStockRecord = null;
            if (bookCode === 'STR') {
                // For Return, technician MUST have sufficient stock
                const [techStock] = await connection.query(
                    'SELECT id, current_qty FROM technician_stock WHERE technician_id = ? AND item_code = ? FOR UPDATE',
                    [header.technician_id, item.item_code]
                );
                
                if (techStock.length === 0 || techStock[0].current_qty < item.qty) {
                    throw new Error(`Insufficient technician stock for item ${mainItem[0].item_name}. Available: ${techStock.length > 0 ? techStock[0].current_qty : 0}, Requested: ${item.qty}`);
                }
                techStockRecord = techStock[0];
            } else {
                if (mainItem[0].current_stock < item.qty) {
                    throw new Error(`Insufficient stock for item ${mainItem[0].item_name}. Available: ${mainItem[0].current_stock}, Requested: ${item.qty}`);
                }
            }

            // Insert Item
            await connection.query(
                'INSERT INTO stock_items (book_code, vouch_no, sr_no, item_code, item_name, qty, serial_numbers) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    bookCode,
                    vouchNo,
                    items.indexOf(item) + 1,
                    item.item_code,
                    mainItem[0].item_name,
                    item.qty,
                    item.serial_numbers || null
                ]
            );

            // Update Stocks
            if (bookCode === 'STR') {
                // Transfer from Technician to Main
                await connection.query(
                    'UPDATE items SET current_stock = current_stock + ? WHERE item_code = ?',
                    [item.qty, item.item_code]
                );
                
                await connection.query(
                    'UPDATE technician_stock SET current_qty = current_qty - ? WHERE id = ?',
                    [item.qty, techStockRecord.id]
                );
            } else {
                // Decrease Main Stock
                await connection.query(
                    'UPDATE items SET current_stock = current_stock - ? WHERE item_code = ?',
                    [item.qty, item.item_code]
                );

                // Increase Technician Stock (Upsert)
                const [techStock] = await connection.query(
                    'SELECT id FROM technician_stock WHERE technician_id = ? AND item_code = ?',
                    [header.technician_id, item.item_code]
                );

                if (techStock.length > 0) {
                    await connection.query(
                        'UPDATE technician_stock SET current_qty = current_qty + ? WHERE id = ?',
                        [item.qty, techStock[0].id]
                    );
                } else {
                    await connection.query(
                        'INSERT INTO technician_stock (technician_id, item_code, current_qty) VALUES (?, ?, ?)',
                        [header.technician_id, item.item_code, item.qty]
                    );
                }
            }
        }

        await connection.commit();
        res.json({ success: true, message: 'Stock transfer updated successfully' });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
