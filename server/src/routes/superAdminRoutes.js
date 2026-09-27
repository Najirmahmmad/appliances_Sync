import express from 'express';
import { getTenants, createTenant, updateTenant, getMasterUsers } from '../controllers/superAdminController.js';

// Note: You can add super-admin authentication middleware here
const router = express.Router();

// Tenant Management
router.get('/tenants', getTenants);
router.post('/tenants', createTenant);
router.put('/tenants/:id', updateTenant);

// Master Users Management
router.get('/users', getMasterUsers);

export default router;
