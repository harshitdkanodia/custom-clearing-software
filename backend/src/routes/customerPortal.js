const express = require('express');
const router = express.Router();
const customerPortalController = require('../controllers/customerPortalController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});
const upload = multer({ storage });

// Public routes (no auth required, but uses shareToken)
router.get('/:token', customerPortalController.getPublicShipment);
router.post('/:token/upload/:section/:docType', upload.single('file'), customerPortalController.uploadPublicDocument);

// Private route to generate token (admin only)
router.post('/generate/:id', verifyToken, customerPortalController.generateShareToken);

module.exports = router;
