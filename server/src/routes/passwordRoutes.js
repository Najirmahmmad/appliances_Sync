import express from 'express';
import { changePassword } from '../controllers/passwordController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/change-password', authenticateToken, changePassword);

export default router;

