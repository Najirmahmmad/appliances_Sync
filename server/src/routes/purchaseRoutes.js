import express from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import {
    createPurchase,
    getPurchases,
    getPurchaseById,
    deletePurchase,
    createPurchaseReturn,
    getPurchaseReturns,
    deletePurchaseReturn
} from '../controllers/purchaseController.js';

const router = express.Router();

router.use(authenticateToken); // Protect all routes
// Restrict to Admin and Operator as per requirements
router.use(authorizeRoles('admin', 'Admin', 'operator', 'Operator'));

// Purchase Return Routes (PR)
router.route('/return')
    .get(getPurchaseReturns)
    .post(createPurchaseReturn);

router.route('/return/:vouchNo')
    .get(getPurchaseById)
    .delete(authorizeRoles('admin', 'Admin'), deletePurchaseReturn);

// Purchase Routes (PU)
router.route('/')
    .get(getPurchases)
    .post(createPurchase);

router.route('/:vouchNo')
    .get(getPurchaseById)
    .delete(authorizeRoles('admin', 'Admin'), deletePurchase);

export default router;
