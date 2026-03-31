const { PrismaClient } = require('@prisma/client');
const { checkFilingComplete, checkAndProgressShipment } = require('../services/shipmentProgressionService');
const { logActivity } = require('../services/activityService');
const prisma = new PrismaClient();

const FILING_DOC_TYPES = [
    { type: 'BL', label: 'Bill of Lading', mandatory: true },
    { type: 'INVOICE', label: 'Invoice', mandatory: true },
    { type: 'PL', label: 'Packing List', mandatory: true },
    { type: 'COO', label: 'Certificate of Origin', mandatory: false },
    { type: 'BIS', label: 'BIS Certificate', mandatory: false },
    { type: 'FREIGHT_CERT', label: 'Freight Certificate', mandatory: false },
    { type: 'INSURANCE_CERT', label: 'Insurance Certificate', mandatory: false },
    { type: 'SIMS', label: 'SIMS', mandatory: false },
    { type: 'PIMS', label: 'PIMS', mandatory: false },
    { type: 'NFIMS', label: 'NFIMS', mandatory: false },
    { type: 'CHIMS', label: 'CHIMS', mandatory: false },
    { type: 'REEIMS', label: 'REEIMS', mandatory: false },
    { type: 'LICENCE', label: 'Licence', mandatory: false },
    { type: 'EPRA_PLASTIC', label: 'EPRA Plastic', mandatory: false },
    { type: 'EPRA_EWASTE', label: 'EPRA E-Waste', mandatory: false },
    { type: 'EPRA_BATTERY', label: 'EPRA Battery', mandatory: false },
    { type: 'ETA_WPC', label: 'ETA WPC', mandatory: false },
    { type: 'PHYTOSANITARY', label: 'Phytosanitary', mandatory: false },
    { type: 'FSSAI', label: 'FSSAI', mandatory: false },
    { type: 'OTHER', label: 'Other', mandatory: false },
];

async function getFilingDocuments(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        let docs = await prisma.filingDocument.findMany({ where: { shipmentId }, orderBy: { id: 'asc' } });
        if (docs.length === 0) {
            const creates = FILING_DOC_TYPES.map(d => prisma.filingDocument.create({
                data: { shipmentId, documentType: d.type, isMandatory: d.mandatory },
            }));
            docs = await Promise.all(creates);
        }
        res.json({ success: true, data: docs, docTypes: FILING_DOC_TYPES });
    } catch (err) {
        console.error('Get filing documents error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch documents' } });
    }
}

async function uploadFilingDocument(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const { docType } = req.params;
        if (!req.file) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } });
        const fileUrl = `/uploads/${req.file.filename}`;
        await prisma.filingDocument.updateMany({
            where: { shipmentId, documentType: docType },
            data: { fileUrl, uploadedAt: new Date(), status: 'UPLOADED' },
        });

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'UPLOAD_FILING_DOC',
            details: `Uploaded ${docType}`
        });

        await checkFilingComplete(shipmentId);
        await checkAndProgressShipment(shipmentId);

        res.json({ success: true, message: 'Document uploaded' });
    } catch (err) {
        console.error('Upload filing document error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Upload failed' } });
    }
}

async function deleteFilingDocument(req, res) {
    try {
        const docId = parseInt(req.params.docId);
        await prisma.filingDocument.update({
            where: { id: docId },
            data: { fileUrl: null, uploadedAt: null, status: 'PENDING' },
        });
        res.json({ success: true, message: 'Document removed' });
    } catch (err) {
        console.error('Delete filing document error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Delete failed' } });
    }
}

module.exports = { getFilingDocuments, uploadFilingDocument, deleteFilingDocument, FILING_DOC_TYPES };
