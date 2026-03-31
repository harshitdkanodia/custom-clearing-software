const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
    getCustomers, searchCustomers, getCustomer,
    createCustomer, updateCustomer, deleteCustomer, toggleCustomerStatus
} = require('../controllers/customerController');

// All routes require authentication
router.use(verifyToken);

// Search (must be before /:id)
router.get('/search', searchCustomers);

// CRUD
router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.post('/', requireRole('ADMIN', 'OPERATION_STAFF'), createCustomer);
router.put('/:id', requireRole('ADMIN', 'OPERATION_STAFF'), updateCustomer);
router.delete('/:id', requireRole('ADMIN'), deleteCustomer);
router.patch('/:id/status', requireRole('ADMIN', 'OPERATION_STAFF'), toggleCustomerStatus);

module.exports = router;
