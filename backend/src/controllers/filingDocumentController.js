const { PrismaClient } = require('@prisma/client');
const { logActivity } = require('../services/activityService');
const { checkAndProgressShipment } = require('../services/shipmentProgressionService');
const prisma = new PrismaClient();

const HOME_CONSUMPTION_DOC_TYPES = [
    { type: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice', mandatory: true },
    { type: 'PACKING_LIST', label: 'Packing List', mandatory: true },
    { type: 'HOUSE_BL', label: 'House Bill of Lading', mandatory: true },
    { type: 'MASTER_BL', label: 'Master Bill of Lading', mandatory: true },
    { type: 'COO', label: 'COO (Certificate of Origin)', mandatory: true },
    { type: 'FREIGHT_CERTIFICATE', label: 'Freight Certificate', mandatory: true },
    { type: 'INSURANCE', label: 'Insurance', mandatory: true },
    { type: 'BIS_CERTIFICATE', label: 'BIS Certificate (if applicable)', mandatory: false },
    { type: 'LMPC', label: 'LMPC', mandatory: false },
    { type: 'EPRA_PLASTIC', label: 'EPRA Certificate (Plastic)', mandatory: false },
    { type: 'EPRA_EWASTE', label: 'EPRA certificate (E waste)', mandatory: false },
    { type: 'CATALOGUE', label: 'Catalogue of Goods', mandatory: false },
    { type: 'OTHER', label: 'Other Document', mandatory: false },
];

const IN_BOND_DOC_TYPES = [
    { type: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice', mandatory: true },
    { type: 'PACKING_LIST', label: 'Packing List', mandatory: true },
    { type: 'MASTER_BL', label: 'Master Bill of Lading', mandatory: true },
    { type: 'HBL', label: 'HBL', mandatory: true },
    { type: 'COO', label: 'COO', mandatory: true },
    { type: 'FREIGHT_CERTIFICATE', label: 'Freight Certificate', mandatory: true },
    { type: 'INSURANCE', label: 'Insurance', mandatory: true },
    { type: 'BIS_CERTIFICATE', label: 'BIS Certificate', mandatory: true },
    { type: 'AUTHORITY_LETTER', label: 'Authority Letter', mandatory: true },
    { type: 'DIMENSION_CERTIFICATE', label: 'Dimension Certificate', mandatory: true },
    { type: 'SPACE_CERTIFICATE', label: 'Space Certificate', mandatory: true },
    { type: 'BOND_LICENSE', label: 'Bond & License', mandatory: true },
    { type: 'TRANSIT_INSURANCE', label: 'Transit Insurance Policy', mandatory: true },
    { type: 'OT_PHOTO', label: 'OT Container Photographs', mandatory: true },
    { type: 'CHA_AUTH', label: 'CHA Authorization Documents – Authority letter and Custom Pass', mandatory: true },
    { type: 'OTHER', label: 'Other Document', mandatory: false },
];

function getFilingDocTypes(shipmentSubType) {
    return shipmentSubType === 'IN_BOND' ? IN_BOND_DOC_TYPES : HOME_CONSUMPTION_DOC_TYPES;
}

async function getFilingDocuments(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const shipment = await prisma.shipment.findUnique({
            where: { id: shipmentId },
            select: { shipmentSubType: true },
        });

        const docTypes = getFilingDocTypes(shipment?.shipmentSubType);
        const relevantTypes = docTypes.map(t => t.type);
        
        let docs = await prisma.filingDocument.findMany({ 
            where: { 
                shipmentId,
                OR: [
                    { documentType: { in: relevantTypes } },
                    { documentType: 'OTHER' }
                ]
            }, 
            orderBy: { id: 'asc' } 
        });

        // Ensure all mandatory/standard types exist for this subtype
        const existingTypes = docs.map(d => d.documentType);
        const missingTypes = docTypes.filter(t => !existingTypes.includes(t.type));

        if (missingTypes.length > 0) {
            await prisma.filingDocument.createMany({
                data: missingTypes.map(t => ({
                    shipmentId,
                    documentType: t.type,
                    isMandatory: t.mandatory,
                    status: 'PENDING',
                })),
            });
            // Re-fetch to get complete list
            docs = await prisma.filingDocument.findMany({ 
                where: { 
                    shipmentId,
                    OR: [
                        { documentType: { in: relevantTypes } },
                        { documentType: 'OTHER' }
                    ]
                }, 
                orderBy: { id: 'asc' } 
            });
        }

        res.json({ success: true, data: docs, docTypes });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch filing documents' } });
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

        await checkAndProgressShipment(shipmentId);
        res.json({ success: true, message: 'Document uploaded' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Upload failed' } });
    }
}

async function deleteFilingDocument(req, res) {
    try {
        const docId = parseInt(req.params.docId);
        const doc = await prisma.filingDocument.findUnique({ where: { id: docId } });
        if (!doc) return res.status(404).json({ success: false, error: { message: 'Document not found' } });

        if (doc.documentType === 'OTHER') {
            await prisma.filingDocument.delete({ where: { id: docId } });
        } else {
            await prisma.filingDocument.update({
                where: { id: docId },
                data: { fileUrl: null, status: 'PENDING', uploadedAt: null }
            });
        }

        await logActivity({
            shipmentId: doc.shipmentId,
            userId: req.user.id,
            action: 'DELETE_FILING_DOC',
            details: `Deleted ${doc.documentType} file`
        });

        res.json({ success: true, message: 'Document deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Delete failed' } });
    }
}

async function addOtherFilingDocument(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const { customType } = req.body;

        const doc = await prisma.filingDocument.create({
            data: {
                shipmentId,
                documentType: 'OTHER',
                isMandatory: false,
                customType: customType.trim(),
                status: 'PENDING',
            },
        });

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'ADD_FILING_DOC',
            details: `Added custom filing document: ${customType}`
        });

        res.status(201).json({ success: true, data: doc });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Add failed' } });
    }
}

module.exports = { getFilingDocuments, uploadFilingDocument, deleteFilingDocument, addOtherFilingDocument };
