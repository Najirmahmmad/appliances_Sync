import pool from '../config/db.js';

export const getAdminDashboardStats = async (req, res, next) => {
    try {
        const stats = {};
        const charts = {};

        // 1. Total Stocks & Low Stock Count
        const [itemRows] = await pool.query(`
            SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN current_stock <= 10 THEN 1 ELSE 0 END) as low_stock_count
            FROM items 
            WHERE status = 'Active'
        `);
        stats.totalStocks = itemRows[0].total_items || 0;
        stats.lowStockCount = itemRows[0].low_stock_count || 0;

        // 2. Weekly Revenue (Last 7 Days) - Sales (SO)
        const [revenueRows] = await pool.query(`
            SELECT SUM(net_amount) as weekly_revenue
            FROM sales_header 
            WHERE book_code = 'SO' 
            AND vouch_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        `);
        stats.totalRevenue = revenueRows[0].weekly_revenue || 0;

        // 3. Top Selling Product (All time or Monthly? Let's do Monthly for relevance)
        // Or actually "Highest Sale Product" as per UI mock
        const [topProductRows] = await pool.query(`
            SELECT item_name, SUM(qty) as total_sold
            FROM sales_items 
            WHERE book_code = 'SO'
            GROUP BY item_code, item_name
            ORDER BY total_sold DESC
            LIMIT 1
        `);
        stats.highestSaleProduct = topProductRows[0]
            ? { name: topProductRows[0].item_name, quantity: topProductRows[0].total_sold }
            : { name: 'N/A', quantity: 0 };

        // 4. Low Stock Product (The one with minimum stock)
        const [minStockRows] = await pool.query(`
            SELECT item_name, current_stock 
            FROM items 
            WHERE status = 'Active' 
            ORDER BY current_stock ASC 
            LIMIT 1
        `);
        stats.minimumStockProduct = minStockRows[0]
            ? { name: minStockRows[0].item_name, quantity: minStockRows[0].current_stock }
            : { name: 'N/A', quantity: 0 };


        // 5. Sales Chart Data (Last 7 Days)
        const [chartRows] = await pool.query(`
            SELECT 
                DATE_FORMAT(vouch_date, '%a') as day, 
                DATE(vouch_date) as date,
                SUM(net_amount) as sales
            FROM sales_header
            WHERE book_code = 'SO'
            AND vouch_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY date, day
            ORDER BY date ASC
        `);

        // Fill in missing days
        const salesData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

            const found = chartRows.find(row => {
                // Handle different date formats returned by driver if necessary, assuming YYYY-MM-DD or Object
                const rowDate = new Date(row.date).toISOString().split('T')[0];
                return rowDate === dateStr;
            });

            salesData.push({
                day: dayName,
                sales: found ? parseFloat(found.sales) : 0
            });
        }
        charts.salesData = salesData;

        // 6. Top Products List (Top 5 by Revenue)
        const [topProductsRows] = await pool.query(`
             SELECT 
                si.item_code as id,
                si.item_name as name, 
                SUM(si.qty) as sold, 
                SUM(si.net_amt) as revenue
            FROM sales_items si
            LEFT JOIN items i ON si.item_code = i.item_code
            WHERE si.book_code = 'SO'
            GROUP BY si.item_code, si.item_name
            ORDER BY revenue DESC
            LIMIT 5
        `);
        charts.topProducts = topProductsRows;

        // 7. Low Stock List (Top 4)
        const [lowStockListRows] = await pool.query(`
            SELECT item_name as name, current_stock as stock 
            FROM items 
            WHERE status = 'Active' AND current_stock <= 20
            ORDER BY current_stock ASC
            LIMIT 4
        `);
        // Add arbitrary minStock for UI context if not in DB, roughly 20 as threshold
        charts.lowStockItems = lowStockListRows.map(item => ({ ...item, minStock: 20 }));


        res.json({
            success: true,
            data: {
                stats,
                charts
            }
        });

    } catch (error) {
        next(error);
    }
};

export const getTechnicianDashboardStats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        // Last 7 days + today
        const [commissionRows] = await pool.query(`
            SELECT 
                si.item_name as product,
                SUM(si.qty) as quantity,
                si.comm_rate as unitCommission,
                SUM(si.tot_commission) as totalCommission,
                sh.vouch_date
            FROM sales_items si
            JOIN sales_header sh ON si.vouch_no = sh.vouch_no AND si.book_code = sh.book_code
            WHERE si.book_code = 'SO' 
            AND sh.created_by = ?
            AND sh.vouch_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY si.item_name, si.comm_rate, sh.vouch_date
        `, [userId]);

        // Aggregate stats
        const salesBreakdown = []; // For table, we want breakdown by product (aggregated over week)
        const commissionByDay = {}; // For chart

        // Group by product for table
        const productMap = new Map();

        // Group by day for chart
        const dayMap = new Map();

        commissionRows.forEach(row => {
            // Product Breakdown
            const productKey = row.product;
            if (!productMap.has(productKey)) {
                productMap.set(productKey, {
                    id: productBreakdownId++,
                    product: row.product,
                    quantity: 0,
                    unitCommission: parseFloat(row.unitCommission || 0),
                    totalCommission: 0
                });
            }
            const p = productMap.get(productKey);
            p.quantity += parseFloat(row.quantity);
            p.totalCommission += parseFloat(row.totalCommission);

            // Daily Chart
            const dateStr = new Date(row.vouch_date).toISOString().split('T')[0];
            if (!dayMap.has(dateStr)) {
                dayMap.set(dateStr, 0);
            }
            dayMap.set(dateStr, dayMap.get(dateStr) + parseFloat(row.totalCommission));
        });

        let productBreakdownId = 1;
        const finalBreakdown = Array.from(productMap.values()).map(p => ({
            ...p,
            id: productBreakdownId++
        }));

        // Fill chart data (Last 7 days)
        const commissionData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

            const dailyComm = dayMap.get(dateStr) || 0;
            commissionData.push({
                day: dayName,
                commission: dailyComm
            });
        }

        // Calculate Totals for cards
        const totalCommission = finalBreakdown.reduce((sum, item) => sum + item.totalCommission, 0);
        const totalQuantity = finalBreakdown.reduce((sum, item) => sum + item.quantity, 0);
        const totalProducts = finalBreakdown.length;
        const avgCommission = Math.round(totalCommission / 7);

        // Best Day
        let maxComm = 0;
        let bestDay = 'N/A';
        commissionData.forEach(d => {
            if (d.commission > maxComm) {
                maxComm = d.commission;
                bestDay = d.day; // e.g., "Sat"
                // To get full name like "Saturday" would verify map above
            }
        });

        // Return structured data for frontend
        res.json({
            success: true,
            data: {
                commissionData,
                salesBreakdown: finalBreakdown,
                stats: {
                    totalCommission,
                    totalQuantity,
                    totalProducts,
                    avgCommission,
                    bestDay,
                    maxComm
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

export const getOperatorDashboardStats = async (req, res, next) => {
    try {
        // 1. Stock Overview
        // Fetch all active items with their stock levels
        const [itemRows] = await pool.query(`
            SELECT 
                item_name as name,
                item_model as model,
                current_stock as stock,
                10 as minStock, -- Default minStock if not in DB, or join with settings if exists
                CASE 
                    WHEN current_stock = 0 THEN 'out-of-stock'
                    WHEN current_stock <= 10 THEN 'low-stock'
                    ELSE 'in-stock'
                END as status
            FROM items 
            WHERE status = 'Active'
            ORDER BY item_name ASC
        `);

        const stockSummary = {
            total: itemRows.length,
            inStock: itemRows.filter(i => i.status === 'in-stock').length,
            lowStock: itemRows.filter(i => i.status === 'low-stock').length,
            outOfStock: itemRows.filter(i => i.status === 'out-of-stock').length,
        };

        // 2. Today's Stock Transfers ('ST')
        // Join sales_header (for Party/Technician Name) and sales_items (for Item details)
        const [transferRows] = await pool.query(`
            SELECT 
                sh.party_name as technician,
                si.item_name,
                si.item_code,
                si.qty
            FROM sales_items si
            JOIN sales_header sh ON si.vouch_no = sh.vouch_no AND si.book_code = sh.book_code
            WHERE sh.book_code = 'ST' 
            AND DATE(sh.vouch_date) = CURDATE()
            ORDER BY sh.created_at DESC
        `);

        res.json({
            success: true,
            data: {
                stockSummary,
                stockItems: itemRows,
                todaysTransfers: transferRows
            }
        });

    } catch (error) {
        next(error);
    }
};
