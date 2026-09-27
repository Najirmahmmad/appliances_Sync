import express from 'express';
import { login, refreshToken, forgotPassword, resetPassword } from '../controllers/authController.js';
import { authActivityLogger } from '../middlewares/activityLogger.js';

const router = express.Router();

router.post('/login', authActivityLogger('login'), login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', authActivityLogger('forgot-password'), forgotPassword);
router.post('/reset-password', authActivityLogger('reset-password'), resetPassword);

export default router;
