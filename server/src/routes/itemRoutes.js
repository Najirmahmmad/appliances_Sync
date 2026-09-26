import express from 'express';
import {
  getItems,
  getItemByCode,
  createItem,
  updateItem,
  deleteItem,
  toggleItemStatus,
  getItemOptions
} from '../controllers/itemController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/items/options - Get dropdown options (tax rates, units)
router.get('/options', authorizeRoles('admin', 'Admin', 'operator', 'Operator', 'technician', 'Technician'), getItemOptions);

// GET /api/items - Get all items with optional filters
router.get('/', authorizeRoles('admin', 'Admin', 'operator', 'Operator', 'technician', 'Technician'), getItems);

// GET /api/items/:code - Get single item by code
router.get('/:code', authorizeRoles('admin', 'Admin', 'operator', 'Operator', 'technician', 'Technician'), getItemByCode);

// POST /api/items - Create new item
router.post('/', authorizeRoles('admin', 'Admin', 'operator', 'Operator'), createItem);

// PUT /api/items/:code - Update item
router.put('/:code', authorizeRoles('admin', 'Admin', 'operator', 'Operator'), updateItem);

// DELETE /api/items/:code - Delete item
router.delete('/:code', authorizeRoles('admin', 'Admin'), deleteItem);

// PATCH /api/items/:code/toggle-status - Toggle item status
router.patch('/:code/toggle-status', authorizeRoles('admin', 'Admin', 'operator', 'Operator'), toggleItemStatus);

export default router;
