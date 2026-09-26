import express from 'express';
import { 
  getDepartments, 
  getDepartmentByCode, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment,
  toggleDepartmentStatus 
} from '../controllers/departmentController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Admin and Operator can manage departments
router.use(authorizeRoles('admin', 'Admin', 'operator', 'Operator'));

// GET /api/departments - Get all departments with optional filters
router.get('/', getDepartments);

// GET /api/departments/:code - Get single department by code
router.get('/:code', getDepartmentByCode);

// POST /api/departments - Create new department
router.post('/', createDepartment);

// PUT /api/departments/:code - Update department
router.put('/:code', updateDepartment);

// DELETE /api/departments/:code - Delete department
router.delete('/:code', authorizeRoles('admin', 'Admin'), deleteDepartment);

// PATCH /api/departments/:code/toggle-status - Toggle department status
router.patch('/:code/toggle-status', toggleDepartmentStatus);

export default router;
