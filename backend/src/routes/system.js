const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { resetData } = require('../controllers/systemController');

// All system routes require ADMIN role
router.use(verifyToken, requireRole('ADMIN'));

router.post('/reset-data', resetData);

module.exports = router;
