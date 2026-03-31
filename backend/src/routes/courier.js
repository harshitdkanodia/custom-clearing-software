const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getCourierList, dispatchCourier, getCourierDetail } = require('../controllers/courierController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, `courier-${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.use(verifyToken);
router.get('/', getCourierList);
router.get('/:shipmentId', getCourierDetail);
router.post('/:shipmentId/dispatch', requireRole('ADMIN', 'OPERATION_STAFF'), upload.single('receipt'), dispatchCourier);

module.exports = router;
