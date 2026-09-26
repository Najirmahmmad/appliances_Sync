import express from 'express';
import { getCompanyProfile, upsertCompanyProfile } from '../controllers/companyProfileController.js';
import adminOnly from '../middlewares/adminMiddleware.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET company profile - Admin only
router.get('/', authenticateToken, adminOnly, getCompanyProfile);

// UPSERT company profile - Admin only
router.post('/', authenticateToken, adminOnly, upsertCompanyProfile);
router.put('/', authenticateToken, adminOnly, upsertCompanyProfile);

export default router;