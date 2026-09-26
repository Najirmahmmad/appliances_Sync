import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
} from '../controllers/userController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/users - Get all users with optional filters
router.get('/', authorizeRoles('admin', 'Admin', 'Operator'), getUsers);

// GET /api/users/:id - Get single user by ID
router.get('/:id', authorizeRoles('admin', 'Admin', 'Operator'), getUserById);

// POST /api/users - Create new user
router.post('/', authorizeRoles('admin', 'Admin'), createUser);

// PUT /api/users/:id - Update user
router.put('/:id', authorizeRoles('admin', 'Admin'), updateUser);

// DELETE /api/users/:id - Delete user
router.delete('/:id', authorizeRoles('admin', 'Admin'), deleteUser);

// PATCH /api/users/:id/toggle-status - Toggle user status
router.patch('/:id/toggle-status', authorizeRoles('admin', 'Admin'), toggleUserStatus);

export default router;
