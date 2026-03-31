const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getBillingList, getBillingDetail, uploadBillingDoc, markBillingComplete, saveBillAmount, sendBillEmail } = require('../controllers/billingController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, `bill-${Date.now()}-${file.originalname}`),
});
const upload = multer({
    storage, fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'), false);
    }
});

router.use(verifyToken);
router.get('/', getBillingList);
router.get('/:shipmentId', getBillingDetail);
router.post('/:shipmentId/upload/:docType', requireRole('ADMIN', 'OPERATION_STAFF'), upload.single('file'), uploadBillingDoc);
router.patch('/:shipmentId/complete', requireRole('ADMIN', 'OPERATION_STAFF'), markBillingComplete);
router.patch('/:shipmentId/bill-amount', requireRole('ADMIN', 'OPERATION_STAFF'), saveBillAmount);
router.post('/:shipmentId/send-email', requireRole('ADMIN', 'OPERATION_STAFF'), sendBillEmail);

module.exports = router;
