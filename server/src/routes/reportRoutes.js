import { getCommissionReport, getStockTransferReport, getSaleSummaryReport, getSaleRegisterReport, getPurchaseSummaryReport, getPurchaseRegisterReport, getCurrentStockReport, getReminderReport } from '../controllers/reportController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import express from 'express';
const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/reports/commission
// Technician can access, Admin can access
router.get('/commission', authorizeRoles('admin', 'Admin', 'technician', 'Technician'), getCommissionReport);

// GET /api/reports/stock-transfer
// Admin, Operator, Technician can access
router.get('/stock-transfer', authorizeRoles('admin', 'Admin', 'operator', 'Operator', 'technician', 'Technician'), getStockTransferReport);

// GET /api/reports/sale-summary (Admin Only)
router.get('/sale-summary', authorizeRoles('admin', 'Admin'), getSaleSummaryReport);

// GET /api/reports/sale-register (Admin Only)
router.get('/sale-register', authorizeRoles('admin', 'Admin'), getSaleRegisterReport);

// GET /api/reports/purchase-summary (Admin Only)
router.get('/purchase-summary', authorizeRoles('admin', 'Admin'), getPurchaseSummaryReport);

// GET /api/reports/purchase-register (Admin Only)
router.get('/purchase-register', authorizeRoles('admin', 'Admin'), getPurchaseRegisterReport);

// GET /api/reports/current-stock
// Admin, Technician can access
router.get('/current-stock', authorizeRoles('admin', 'Admin', 'technician', 'Technician'), getCurrentStockReport);

// GET /api/reports/reminder-lead
// Admin, Operator, Technician can access
router.get('/reminder-lead', authorizeRoles('admin', 'Admin', 'operator', 'Operator', 'technician', 'Technician'), getReminderReport);

export default router;
