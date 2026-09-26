import express from 'express';
import {
    createStockTransfer,
    getTechnicianStock,
    getStockTransfers,
    getStockTransfer,
    updateStockTransfer,
    deleteStockTransfer
} from '../controllers/stockController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create new Stock Transfer (Admin only)
router.post('/transfer', authenticateToken, authorizeRoles('Admin', 'Operator'), createStockTransfer);

// Get Stock for a specific Technician (Admin, Operator, or the Technician themselves)
// Note: Ideally we should verify if requesting user matches technicianId or is Admin
router.get('/technician/:technicianId', authenticateToken, getTechnicianStock);

// Get Stock Transfer List (Admin, Operator)
router.get('/transfers', authenticateToken, authorizeRoles('Admin', 'Operator'), getStockTransfers);

// Single Stock Transfer Operations (Get, Update, Delete)
router.get('/:bookCode/:vouchNo', authenticateToken, authorizeRoles('Admin', 'Operator'), getStockTransfer);
router.put('/:bookCode/:vouchNo', authenticateToken, authorizeRoles('Admin', 'Operator'), updateStockTransfer);
router.delete('/:bookCode/:vouchNo', authenticateToken, authorizeRoles('admin', 'Admin'), deleteStockTransfer);

export default router;
