import express from 'express';
import { uploadInvoice } from '../controllers/uploadController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/invoice', authenticateToken, uploadInvoice);

export default router;
