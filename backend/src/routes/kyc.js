const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getKycDocuments, uploadKycDocument, deleteKycDocument } = require('../controllers/kycDocumentController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, `kyc-${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// These are mounted under /api/customers
router.get('/:id/kyc-documents', verifyToken, getKycDocuments);
router.post('/:id/kyc-documents/:docType/upload', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), upload.single('file'), uploadKycDocument);
router.delete('/:id/kyc-documents/:docId', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), deleteKycDocument);

module.exports = router;
