import express from 'express';
import { login, refreshToken } from '../controllers/authController.js';
import { authActivityLogger } from '../middlewares/activityLogger.js';

const router = express.Router();

router.post('/login', authActivityLogger('login'), login);
router.post('/refresh-token', refreshToken);

export default router;
