const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getDoDocuments, uploadDoDocument, updateDoDocumentStatus, deleteDoDocument } = require('../controllers/doDocumentController');
const { getFilingDocuments, uploadFilingDocument, deleteFilingDocument } = require('../controllers/filingDocumentController');
const { getKycDocuments, uploadKycDocument, deleteKycDocument } = require('../controllers/kycDocumentController');
const { getBoeStatus, updateBoeStatus } = require('../controllers/boeController');
const { getTransport, createTransport, updateTransport } = require('../controllers/transportController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, `doc-${Date.now()}-${file.originalname}`),
});
const upload = multer({
    storage, fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'), false);
    }
});

// These routes are mounted under /api/shipments already — but we need a separate router
// for document endpoints. We'll add to the shipment routes.
// DO Documents
router.get('/:id/do-documents', verifyToken, getDoDocuments);
router.post('/:id/do-documents/:docType/upload', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), upload.single('file'), uploadDoDocument);
router.patch('/:id/do-documents/:docType/status', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), updateDoDocumentStatus);
router.delete('/:id/do-documents/:docId', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), deleteDoDocument);

// Filing Documents
router.get('/:id/filing-documents', verifyToken, getFilingDocuments);
router.post('/:id/filing-documents/:docType/upload', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), upload.single('file'), uploadFilingDocument);
router.delete('/:id/filing-documents/:docId', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), deleteFilingDocument);

// BOE
router.get('/:id/boe', verifyToken, getBoeStatus);
router.patch('/:id/boe', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), updateBoeStatus);

// Transport
router.get('/:id/transport', verifyToken, getTransport);
router.post('/:id/transport', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), createTransport);
router.put('/:id/transport/:transportId', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), updateTransport);

module.exports = router;
