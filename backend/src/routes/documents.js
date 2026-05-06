const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getDoDocuments, uploadDoDocument, updateDoDocumentStatus, deleteDoDocument, updateDoDocumentDetails, addOtherDoDocument, updateDoPaymentDetails } = require('../controllers/doDocumentController');
const { getFilingDocuments, uploadFilingDocument, deleteFilingDocument, addOtherFilingDocument } = require('../controllers/filingDocumentController');
const { getKycDocuments, uploadKycDocument, deleteKycDocument } = require('../controllers/kycDocumentController');
const { getBoeStatus, updateBoeStatus } = require('../controllers/boeController');
const { getTransport, createTransport, updateTransport, uploadTransportDocument, deleteTransportDocument, addOtherTransportDocument } = require('../controllers/transportController');

// ... (other routes)



const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, `doc-${Date.now()}-${file.originalname}`),
});
const upload = multer({
    storage, fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only PDF and image files are allowed'), false);
    }
});

// DO Documents
router.get('/:id/do-documents', verifyToken, getDoDocuments);
router.post('/:id/do-documents/:docType/upload', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), upload.single('file'), uploadDoDocument);
router.patch('/:id/do-documents/:docType/status', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), updateDoDocumentStatus);
router.patch('/:id/do-documents/:docId/details', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), updateDoDocumentDetails);
router.patch('/:id/do-documents/payment-details', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), updateDoPaymentDetails);
router.post('/:id/do-documents/add-other', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), addOtherDoDocument);
router.delete('/:id/do-documents/:docId', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), deleteDoDocument);

// Filing Documents
router.get('/:id/filing-documents', verifyToken, getFilingDocuments);
router.post('/:id/filing-documents/:docType/upload', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), upload.single('file'), uploadFilingDocument);
router.post('/:id/filing-documents/add-other', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), addOtherFilingDocument);
router.delete('/:id/filing-documents/:docId', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), deleteFilingDocument);

// BOE
router.get('/:id/boe', verifyToken, getBoeStatus);
router.patch('/:id/boe', verifyToken, requireRole('ADMIN', 'OPERATION_STAFF'), updateBoeStatus);

// Transport routes moved to shipments.js

module.exports = router;
