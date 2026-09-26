import pool from '../config/db.js';

// Auto-numbering utility function
export const getNextVoucherNumber = async (bookCode) => {
    try {
        const [rows] = await pool.query(
            'SELECT MAX(vouch_no) as max_vouch_no FROM sales_header WHERE book_code = ?',
            [bookCode]
        );

        const maxVouchNo = rows[0].max_vouch_no;
        return maxVouchNo ? maxVouchNo + 1 : 1;
    } catch (error) {
        throw error;
    }
};

// Validation helpers (Reused pattern from sales)
const validateHeader = (header) => {
    const errors = [];
    if (!header.vouch_date) errors.push('Voucher date is required');
    if (!header.party_name || header.party_name.trim() === '') errors.push('Supplier name is required');
    return errors;
};

const validateItem = (item, index) => {
    const errors = [];
    if (!item.item_code) errors.push(`Row ${index + 1}: Item code is required`);
    if (!item.qty || parseFloat(item.qty) <= 0) errors.push(`Row ${index + 1}: Quantity must be greater than 0`);
    return errors;
};

// Calculate item totals (Same as Sales)
const calculateTaxAmounts = (netRate, taxPercentage) => {
    const basic = parseFloat(netRate) / (1 + (parseFloat(taxPercentage) / 100));
    const taxAmount = parseFloat(netRate) - basic;
    return {
        basic: parseFloat(basic.toFixed(2)),
        taxAmount: parseFloat(taxAmount.toFixed(2))
    };
};

const calculateItemTotals = (item) => {
    const { basic, taxAmount } = calculateTaxAmounts(item.rate, item.tax_perc);
    const basicAmt = basic * parseFloat(item.qty);
    const taxAmt = taxAmount * parseFloat(item.qty);
    const netAmt = parseFloat(item.rate) * parseFloat(item.qty);

    return {
        basic_amt: parseFloat(basicAmt.toFixed(2)),
        tax_amt: parseFloat(taxAmt.toFixed(2)),
        net_amt: parseFloat(netAmt.toFixed(2))
    };
};

// GET all purchases
export const getPurchases = async (req, res, next) => {
    try {
        const { search, startDate, endDate, page, limit } = req.query;
        const book_code = 'PU'; // Hardcoded for Purchase

        let query = 'SELECT book_code, vouch_no, vouch_date, party_name, party_phone, net_amount, total_qty, created_at FROM sales_header WHERE book_code = ?';
        const params = [book_code];

        if (startDate) {
            query += ' AND vouch_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND vouch_date <= ?';
            params.push(endDate);
        }

        if (search) {
            query += ' AND (party_name LIKE ? OR party_phone LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY vouch_date DESC, vouch_no DESC';

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

// GET all purchase returns
export const getPurchaseReturns = async (req, res, next) => {
    try {
        const { search, startDate, endDate, page, limit } = req.query;
        const book_code = 'PR'; // Hardcoded for Purchase Return

        let query = 'SELECT book_code, vouch_no, vouch_date, party_name, party_phone, net_amount, total_qty, created_at FROM sales_header WHERE book_code = ?';
        const params = [book_code];

        if (startDate) {
            query += ' AND vouch_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND vouch_date <= ?';
            params.push(endDate);
        }

        if (search) {
            query += ' AND (party_name LIKE ? OR party_phone LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY vouch_date DESC, vouch_no DESC';

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


// GET single purchase (reused for PR)
export const getPurchaseById = async (req, res, next) => {
    try {
        const { vouchNo } = req.params;
        const { bookCode } = req.params; // Expect bookCode from route param too, or query? Or infer?
        // Actually route is /:bookCode/:vouchNo usually, but currently purchase is just /:vouchNo hardcoded.
        // I should probably make getPurchaseById support a 'bookCode' param if flexible.
        // But for now, my existing route is /:vouchNo which calls getPurchaseById for PU.
        // I will make a NEW function getPurchaseReturnById or modify this one.
        // Given I might reuse this controller, assume 'PU' unless specified? 
        // Route parameter is best.
        // Let's check route definition: `router.route('/:vouchNo').get(getPurchaseById).delete(deletePurchase);`
        // For PR, I will likely use `router.route('/return/:vouchNo').get(getPurchaseReturnById)...`

        let targetBookCode = 'PU';
        // Hack: Check if route path implies return, or req.baseUrl
        // Better: Make a separate function for PR Get By ID.

        const [headerRows] = await pool.query(
            'SELECT * FROM sales_header WHERE book_code IN (?, ?) AND vouch_no = ?',
            ['PU', 'PR', vouchNo] // Allow fetching both, let frontend handle context
        );

        if (headerRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        const header = headerRows[0];
        targetBookCode = header.book_code; // Use found book code

        const [itemRows] = await pool.query(
            `SELECT si.*, COALESCE(i.item_name, si.item_name) AS item_name, i.unit, i.hsn_code, i.tax_rate, i.current_stock
       FROM sales_items si
       LEFT JOIN items i ON i.item_code = si.item_code
       WHERE si.book_code = ? AND si.vouch_no = ?
       ORDER BY si.sr_no ASC`,
            [targetBookCode, vouchNo]
        );

        // Get company profile
        let companyData = {};
        try {
            const [companyRows] = await pool.query('SELECT * FROM company_profile WHERE id = 1');
            if (companyRows.length > 0) companyData = companyRows[0];
        } catch (e) { /* ignore */ }


        res.json({
            success: true,
            data: {
                header: header,
                items: itemRows,
                company: companyData
            }
        });
    } catch (error) {
        next(error);
    }
};

// CREATE Purchase (Stock Increase)
export const createPurchase = async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { header, items } = req.body;
        header.book_code = 'PU'; // Enforce PU

        // Validation
        const headerErrors = validateHeader(header);
        if (headerErrors.length > 0) return res.status(400).json({ success: false, message: headerErrors.join(', ') });

        const itemErrors = [];
        items.forEach((item, index) => itemErrors.push(...validateItem(item, index)));
        if (itemErrors.length > 0) return res.status(400).json({ success: false, message: itemErrors.join(', ') });

        const nextVouchNo = await getNextVoucherNumber(header.book_code);

        // Insert Header
        await connection.query(
            'INSERT INTO sales_header (book_code, vouch_no, vouch_date, party_phone, party_name, party_address, party_email, party_gst, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                header.book_code,
                nextVouchNo,
                header.vouch_date,
                header.party_phone,
                header.party_name,
                header.party_address,
                header.party_email,
                header.party_gst,
                header.remarks,
                req.user.id
            ]
        );

        let totalQty = 0;
        let totalBasic = 0;
        let totalTax = 0;
        let netAmount = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const [itemDetails] = await connection.query('SELECT item_name, tax_rate FROM items WHERE item_code = ?', [item.item_code]);

            const taxRate = item.tax_perc || (itemDetails[0] ? itemDetails[0].tax_rate : 0);
            const itemName = itemDetails[0] ? itemDetails[0].item_name : 'Unknown Item';

            const itemTotals = calculateItemTotals({ rate: item.rate, tax_perc: taxRate, qty: item.qty });

            await connection.query(
                'INSERT INTO sales_items (book_code, vouch_no, sr_no, item_code, item_name, qty, rate, tax_perc, basic_amt, tax_amt, net_amt, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    header.book_code,
                    nextVouchNo,
                    i + 1,
                    item.item_code,
                    itemName,
                    item.qty,
                    item.rate,
                    taxRate,
                    itemTotals.basic_amt,
                    itemTotals.tax_amt,
                    itemTotals.net_amt,
                    req.user.id
                ]
            );

            totalQty += parseFloat(item.qty);
            totalBasic += itemTotals.basic_amt;
            totalTax += itemTotals.tax_amt;
            netAmount += itemTotals.net_amt;

            // STOCK INCREASE Logic
            await connection.query(
                'UPDATE items SET current_stock = current_stock + ? WHERE item_code = ?',
                [parseFloat(item.qty), item.item_code]
            );
        }

        // Update Header Totals
        await connection.query(
            'UPDATE sales_header SET total_qty = ?, total_basic = ?, total_tax = ?, net_amount = ? WHERE book_code = ? AND vouch_no = ?',
            [totalQty, totalBasic, totalTax, netAmount, header.book_code, nextVouchNo]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: `Purchase #${nextVouchNo} saved successfully`,
            data: { vouch_no: nextVouchNo }
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// CREATE Purchase Return (Stock Decrease)
export const createPurchaseReturn = async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { header, items } = req.body;
        header.book_code = 'PR'; // Enforce PR

        // Validation
        const headerErrors = validateHeader(header);
        if (headerErrors.length > 0) return res.status(400).json({ success: false, message: headerErrors.join(', ') });

        const itemErrors = [];
        items.forEach((item, index) => itemErrors.push(...validateItem(item, index)));
        if (itemErrors.length > 0) return res.status(400).json({ success: false, message: itemErrors.join(', ') });

        // Stock Availability Check Validation
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const [stockCheck] = await connection.query('SELECT current_stock, item_name FROM items WHERE item_code = ?', [item.item_code]);
            if (stockCheck.length === 0) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: `Item ${item.item_code} not found` });
            }
            if (parseFloat(stockCheck[0].current_stock) < parseFloat(item.qty)) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${stockCheck[0].item_name}. Available: ${stockCheck[0].current_stock}, Return Qty: ${item.qty}`
                });
            }
        }

        const nextVouchNo = await getNextVoucherNumber(header.book_code);

        // Insert Header
        await connection.query(
            'INSERT INTO sales_header (book_code, vouch_no, vouch_date, party_phone, party_name, party_address, party_email, party_gst, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                header.book_code,
                nextVouchNo,
                header.vouch_date,
                header.party_phone,
                header.party_name,
                header.party_address,
                header.party_email,
                header.party_gst,
                header.remarks,
                req.user.id
            ]
        );

        let totalQty = 0;
        let totalBasic = 0;
        let totalTax = 0;
        let netAmount = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const [itemDetails] = await connection.query('SELECT item_name, tax_rate FROM items WHERE item_code = ?', [item.item_code]);

            const taxRate = item.tax_perc || (itemDetails[0] ? itemDetails[0].tax_rate : 0);
            const itemName = itemDetails[0] ? itemDetails[0].item_name : 'Unknown Item';

            const itemTotals = calculateItemTotals({ rate: item.rate, tax_perc: taxRate, qty: item.qty });

            await connection.query(
                'INSERT INTO sales_items (book_code, vouch_no, sr_no, item_code, item_name, qty, rate, tax_perc, basic_amt, tax_amt, net_amt, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    header.book_code,
                    nextVouchNo,
                    i + 1,
                    item.item_code,
                    itemName,
                    item.qty,
                    item.rate,
                    taxRate,
                    itemTotals.basic_amt,
                    itemTotals.tax_amt,
                    itemTotals.net_amt,
                    req.user.id
                ]
            );

            totalQty += parseFloat(item.qty);
            totalBasic += itemTotals.basic_amt;
            totalTax += itemTotals.tax_amt;
            netAmount += itemTotals.net_amt;

            // STOCK DECREASE Logic for Purchase Return
            await connection.query(
                'UPDATE items SET current_stock = current_stock - ? WHERE item_code = ?',
                [parseFloat(item.qty), item.item_code]
            );
        }

        // Update Header Totals
        await connection.query(
            'UPDATE sales_header SET total_qty = ?, total_basic = ?, total_tax = ?, net_amount = ? WHERE book_code = ? AND vouch_no = ?',
            [totalQty, totalBasic, totalTax, netAmount, header.book_code, nextVouchNo]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: `Purchase Return #${nextVouchNo} saved successfully`,
            data: { vouch_no: nextVouchNo }
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// DELETE Purchase (Stock Decrease - Reversal)
export const deletePurchase = async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const { vouchNo } = req.params;
        const bookCode = 'PU'; // For now delete logic is separated per book code to ensure opposite stock effect

        const [existingHeader] = await connection.query(
            'SELECT * FROM sales_header WHERE book_code = ? AND vouch_no = ?',
            [bookCode, vouchNo]
        );

        if (existingHeader.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Purchase not found' });
        }

        // Get items to reverse stock
        const [items] = await connection.query(
            'SELECT item_code, qty FROM sales_items WHERE book_code = ? AND vouch_no = ?',
            [bookCode, vouchNo]
        );

        for (const item of items) {
            // STOCK DECREASE Logic (Reversal of Purchase)
            await connection.query(
                'UPDATE items SET current_stock = current_stock - ? WHERE item_code = ?',
                [item.qty, item.item_code]
            );
        }

        // Delete details and header
        await connection.query('DELETE FROM sales_items WHERE book_code = ? AND vouch_no = ?', [bookCode, vouchNo]);
        await connection.query('DELETE FROM sales_header WHERE book_code = ? AND vouch_no = ?', [bookCode, vouchNo]);

        await connection.commit();
        res.json({ success: true, message: 'Purchase deleted successfully' });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};


// DELETE Purchase Return (Stock Increase - Reversal)
export const deletePurchaseReturn = async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const { vouchNo } = req.params;
        const bookCode = 'PR';

        const [existingHeader] = await connection.query(
            'SELECT * FROM sales_header WHERE book_code = ? AND vouch_no = ?',
            [bookCode, vouchNo]
        );

        if (existingHeader.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Purchase Return not found' });
        }

        // Get items to reverse stock
        const [items] = await connection.query(
            'SELECT item_code, qty FROM sales_items WHERE book_code = ? AND vouch_no = ?',
            [bookCode, vouchNo]
        );

        for (const item of items) {
            // STOCK INCREASE Logic (Reversal of Purchase Return)
            await connection.query(
                'UPDATE items SET current_stock = current_stock + ? WHERE item_code = ?',
                [item.qty, item.item_code]
            );
        }

        // Delete details and header
        await connection.query('DELETE FROM sales_items WHERE book_code = ? AND vouch_no = ?', [bookCode, vouchNo]);
        await connection.query('DELETE FROM sales_header WHERE book_code = ? AND vouch_no = ?', [bookCode, vouchNo]);

        await connection.commit();
        res.json({ success: true, message: 'Purchase Return deleted successfully' });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
