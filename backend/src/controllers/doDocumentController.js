const { PrismaClient } = require('@prisma/client');
const { logActivity } = require('../services/activityService');
const { checkAndProgressShipment } = require('../services/shipmentProgressionService');
const prisma = new PrismaClient();

const LOADED_DO_DOC_TYPES = [
    { type: 'MASTER_BL', label: 'Master Bill of Lading', mandatory: true },
    { type: 'ENDORSED_BL', label: 'Endorsed BL Copy', mandatory: true },
    { type: 'HOUSE_BL', label: 'House Bill of Lading', mandatory: true },
    { type: 'IMPORTER_KYC', label: 'Importer KYC Form', mandatory: true },
    { type: 'BOND_FORMAT', label: 'Bond Format Shipping Line', mandatory: true },
    { type: 'INSURANCE', label: 'Insurance', mandatory: true },
    { type: 'DO_CHARGES_RECEIPT', label: 'DO Charges Receipt', mandatory: true },
    { type: 'DELIVERY_ORDER', label: 'Delivery Order', mandatory: true },
    { type: 'EMPTY_LETTER', label: 'Empty Letter', mandatory: true },
    { type: 'SECURITY_DEPOSIT', label: 'Security Deposit', mandatory: false },
    { type: 'SECURITY_DEPOSIT_REFUND', label: 'Security Deposit Refund', mandatory: false },
    { type: 'OTHER', label: 'Other Document', mandatory: false },
];

const DESTUFF_DO_DOC_TYPES = [
    { type: 'MASTER_BL', label: 'Master Bill of Lading', mandatory: true },
    { type: 'HOUSE_BL', label: 'House Bill of Lading', mandatory: true },
    { type: 'ENDORSED_BL', label: 'Endorsed BL Copy', mandatory: true },
    { type: 'IMPORTER_KYC', label: 'Importer KYC Form', mandatory: true },
    { type: 'DO_CHARGES_RECEIPT', label: 'DO Charges Receipt', mandatory: true },
    { type: 'DELIVERY_ORDER', label: 'Delivery Order', mandatory: true },
    { type: 'OTHER', label: 'Other Document', mandatory: false },
];

async function getDoDocuments(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const doType = req.query.doType || 'LOADED';
        const docTypes = doType === 'DESTUFF' ? DESTUFF_DO_DOC_TYPES : LOADED_DO_DOC_TYPES;

        let docs = await prisma.doDocument.findMany({ where: { shipmentId, doType }, orderBy: { id: 'asc' } });

        if (docs.length === 0) {
            await prisma.doDocument.createMany({
                data: docTypes.map(t => ({
                    shipmentId,
                    documentType: t.type,
                    isMandatory: t.mandatory,
                    doType,
                    status: 'PENDING',
                })),
            });
            docs = await prisma.doDocument.findMany({ where: { shipmentId, doType }, orderBy: { id: 'asc' } });
        }

        res.json({ success: true, data: docs, docTypes });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch DO documents' } });
    }
}

async function uploadDoDocument(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const { docType } = req.params;
        const doType = req.query.doType || 'LOADED';

        if (!req.file) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } });

        const fileUrl = `/uploads/${req.file.filename}`;

        await prisma.doDocument.updateMany({
            where: { shipmentId, documentType: docType, doType },
            data: { fileUrl, uploadedAt: new Date(), status: 'RECEIVED', statusDate: new Date() },
        });

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'UPLOAD_DO_DOC',
            details: `Uploaded ${docType} (${doType})`
        });

        res.json({ success: true, message: 'Document uploaded' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Upload failed' } });
    }
}

async function updateDoDocumentStatus(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const { docType } = req.params;
        const { status, doType } = req.body;

        await prisma.doDocument.updateMany({
            where: { shipmentId, documentType: docType, doType: doType || 'LOADED' },
            data: { status, statusDate: new Date() },
        });

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'UPDATE_DO_STATUS',
            details: `${docType} status: ${status}`
        });

        await checkAndProgressShipment(shipmentId);
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Status update failed' } });
    }
}

async function deleteDoDocument(req, res) {
    try {
        const docId = parseInt(req.params.docId);
        const doc = await prisma.doDocument.findUnique({ where: { id: docId } });
        if (!doc) return res.status(404).json({ success: false, error: { message: 'Document not found' } });

        if (doc.documentType === 'OTHER') {
            await prisma.doDocument.delete({ where: { id: docId } });
        } else {
            // Mandatory/Standard docs just get their file cleared
            await prisma.doDocument.update({
                where: { id: docId },
                data: { fileUrl: null, status: 'PENDING', statusDate: null, uploadedAt: null }
            });
        }

        await logActivity({
            shipmentId: doc.shipmentId,
            userId: req.user.id,
            action: 'DELETE_DO_DOC',
            details: `Deleted ${doc.documentType} file`
        });

        res.json({ success: true, message: 'Document deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Delete failed' } });
    }
}

async function updateDoDocumentDetails(req, res) {
    try {
        const docId = parseInt(req.params.docId);
        const { charges, invoiceDate, receivedDate, validityDate, paymentStatus, bankName, bankBranch, utrNumber, paymentDate, customType } = req.body;

        const data = {
            charges: charges ? parseFloat(charges) : null,
            invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
            receivedDate: receivedDate ? new Date(receivedDate) : null,
            validityDate: validityDate ? new Date(validityDate) : null,
            paymentStatus,
            bankName,
            bankBranch,
            utrNumber,
            paymentDate: paymentDate ? new Date(paymentDate) : null,
            customType
        };

        const doc = await prisma.doDocument.update({
            where: { id: docId },
            data,
        });

        await logActivity({
            shipmentId: doc.shipmentId,
            userId: req.user.id,
            action: 'UPDATE_DO_DETAILS',
            details: `Updated details for ${doc.documentType}`
        });

        res.json({ success: true, data: doc });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Update failed' } });
    }
}

async function addOtherDoDocument(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const { customType, doType } = req.body;

        const doc = await prisma.doDocument.create({
            data: {
                shipmentId,
                documentType: 'OTHER',
                isMandatory: false,
                doType: doType || 'LOADED',
                customType,
                status: 'PENDING',
            },
        });

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'ADD_DO_DOC',
            details: `Added custom DO document: ${customType}`
        });

        res.status(201).json({ success: true, data: doc });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Add failed' } });
    }
}

async function updateDoPaymentDetails(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const { doType, ...data } = req.body;

        await prisma.doDocument.updateMany({
            where: { shipmentId, doType: doType || 'LOADED' },
            data,
        });

        res.json({ success: true, message: 'Payment details updated' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Update failed' } });
    }
}

module.exports = {
    getDoDocuments, uploadDoDocument, updateDoDocumentStatus, deleteDoDocument,
    updateDoDocumentDetails, addOtherDoDocument, updateDoPaymentDetails,
    LOADED_DO_DOC_TYPES, DESTUFF_DO_DOC_TYPES
};
