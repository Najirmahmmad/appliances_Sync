import express from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { getAdminDashboardStats, getTechnicianDashboardStats, getOperatorDashboardStats } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(authenticateToken);

// Admin Dashboard Route
router.get('/admin', authorizeRoles('admin', 'Admin'), getAdminDashboardStats);

// Technician Dashboard Route
router.get('/technician', authorizeRoles('technician', 'Technician'), getTechnicianDashboardStats);

// Operator Dashboard Route
router.get('/operator', authorizeRoles('operator', 'Operator'), getOperatorDashboardStats);

export default router;
