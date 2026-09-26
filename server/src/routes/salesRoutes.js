import express from 'express';
import { 
  getSalesHeaders,
  getSalesHeaderWithItems,
  createSalesTransaction,
  updateSalesTransaction,
  deleteSalesTransaction,
  getPartyDetailsByPhone
} from '../controllers/salesController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Technicians can handle sales transactions
router.use(authorizeRoles('admin', 'Admin', 'technician', 'Technician'));

// GET /api/sales/headers - Get all sales headers with optional filters
router.get('/headers', getSalesHeaders);

// GET /api/sales/:bookCode/:vouchNo - Get single sales header with items
router.get('/:bookCode/:vouchNo', getSalesHeaderWithItems);

// GET /api/sales/party-details/:phone - Get party details by phone for auto-fill
router.get('/party-details/:phone', getPartyDetailsByPhone);

// POST /api/sales - Create new sales transaction
router.post('/', createSalesTransaction);

// PUT /api/sales/:bookCode/:vouchNo - Update existing sales transaction
router.put('/:bookCode/:vouchNo', updateSalesTransaction);

// DELETE /api/sales/:bookCode/:vouchNo - Delete sales transaction
router.delete('/:bookCode/:vouchNo', authorizeRoles('admin', 'Admin'), deleteSalesTransaction);

export default router;
