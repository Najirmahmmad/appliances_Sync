import express from 'express';
import { getLogs, getActiveLogById, deleteLog, createLogFromClient } from '../controllers/activityLogController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes in this system securely
router.use(authenticateToken);

// Record action from frontend client manually
router.post('/activity-log', createLogFromClient);

// Get paginated list with optional filters
router.get('/activity-log', getLogs);

// Single view
router.get('/activity-log/:id', getActiveLogById);

// Admin-only hard delete from logs
router.delete('/activity-log/:id', authorizeRoles('admin', 'Admin'), deleteLog);

export default router;
