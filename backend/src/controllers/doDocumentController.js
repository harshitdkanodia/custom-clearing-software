const { PrismaClient } = require('@prisma/client');
const path = require('path');
const { checkDoChecklistComplete, checkAndProgressShipment } = require('../services/shipmentProgressionService');
const { logActivity } = require('../services/activityService');
const prisma = new PrismaClient();

const DO_DOC_TYPES = [
    { type: 'MBL', label: 'Master Bill of Lading', mandatory: true },
    { type: 'HBL', label: 'House Bill of Lading', mandatory: true },
    { type: 'SECURITY_DEPOSIT', label: 'Security Deposit', mandatory: true },
    { type: 'INSURANCE', label: 'Insurance', mandatory: false },
    { type: 'LOADED_DESTUFF', label: 'Loaded & Destuff', mandatory: false },
    { type: 'EMAIL_SHIPPING_LINE', label: 'Email Shipping Line', mandatory: true },
    { type: 'IMPORTER_KYC', label: 'Importer KYC', mandatory: true },
    { type: 'BOND_FORMAT', label: 'Bond Format', mandatory: true },
    { type: 'DO_CHARGES', label: 'DO Charges', mandatory: true },
    { type: 'DELIVERY_ORDER', label: 'Delivery Order', mandatory: true },
    { type: 'EMPTY_LETTER', label: 'Empty Letter', mandatory: false },
];

const DO_STATUS_ORDER = ['PENDING', 'RECEIVED', 'CHECKLIST_PENDING', 'CHECKLIST_READY', 'SENT_FOR_APPROVAL', 'APPROVED', 'SENT_FOR_SUBMISSION'];

// GET /api/shipments/:id/do-documents
async function getDoDocuments(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);

        let docs = await prisma.doDocument.findMany({
            where: { shipmentId },
            orderBy: { id: 'asc' },
        });

        // Initialize docs if none exist
        if (docs.length === 0) {
            const creates = DO_DOC_TYPES.map(d => prisma.doDocument.create({
                data: { shipmentId, documentType: d.type, isMandatory: d.mandatory },
            }));
            docs = await Promise.all(creates);
        }

        res.json({ success: true, data: docs, docTypes: DO_DOC_TYPES });
    } catch (err) {
        console.error('Get DO documents error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch DO documents' } });
    }
}

// POST /api/shipments/:id/do-documents/:docType/upload
async function uploadDoDocument(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const { docType } = req.params;

        if (!req.file) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } });
        }

        const fileUrl = `/uploads/${req.file.filename}`;

        const doc = await prisma.doDocument.updateMany({
            where: { shipmentId, documentType: docType },
            data: { fileUrl, uploadedAt: new Date(), status: 'RECEIVED', statusDate: new Date() },
        });

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'UPLOAD_DO_DOC',
            details: `Uploaded ${docType}`
        });

        res.json({ success: true, message: 'Document uploaded' });
    } catch (err) {
        console.error('Upload DO document error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Upload failed' } });
    }
}

// PATCH /api/shipments/:id/do-documents/:docType/status
async function updateDoDocumentStatus(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const { docType } = req.params;
        const { status } = req.body;

        if (!DO_STATUS_ORDER.includes(status)) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status' } });
        }

        await prisma.doDocument.updateMany({
            where: { shipmentId, documentType: docType },
            data: { status, statusDate: new Date() },
        });

        // Check if all mandatory docs are complete
        await checkDoChecklistComplete(shipmentId);

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'UPDATE_DO_STATUS',
            details: `${docType} status: ${status}`
        });

        await checkAndProgressShipment(shipmentId);

        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        console.error('Update DO status error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Status update failed' } });
    }
}

// DELETE /api/shipments/:id/do-documents/:docId
async function deleteDoDocument(req, res) {
    try {
        const docId = parseInt(req.params.docId);
        await prisma.doDocument.update({
            where: { id: docId },
            data: { fileUrl: null, uploadedAt: null, status: 'PENDING', statusDate: null },
        });
        res.json({ success: true, message: 'Document removed' });
    } catch (err) {
        console.error('Delete DO document error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Delete failed' } });
    }
}

module.exports = { getDoDocuments, uploadDoDocument, updateDoDocumentStatus, deleteDoDocument };
