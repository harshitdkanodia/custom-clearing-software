const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const KYC_DOC_TYPES = [
    { type: 'KYC_FORM', label: 'KYC Form', mandatory: true },
    { type: 'AUTHORITY_LETTER', label: 'Authority Letter', mandatory: true },
    { type: 'IEC', label: 'IEC Copy', mandatory: true },
    { type: 'GST', label: 'GST Certificate', mandatory: true },
    { type: 'ELECTRICITY_BILL', label: 'Electricity Bill', mandatory: false },
    { type: 'PAN', label: 'PAN Card', mandatory: true },
    { type: 'TAN', label: 'TAN', mandatory: false },
    { type: 'AD_CODE', label: 'AD Code', mandatory: false },
    { type: 'CANCELLED_CHEQUE', label: 'Cancelled Cheque', mandatory: false },
    { type: 'FIRM_REGISTRATION', label: 'Firm Registration', mandatory: false },
    { type: 'CENTRAL_EXCISE', label: 'Central Excise', mandatory: false },
    { type: 'AADHAR_PAN_PARTNER', label: 'Aadhar/PAN of Partner', mandatory: false },
];

async function getKycDocuments(req, res) {
    try {
        const customerId = parseInt(req.params.id);
        let docs = await prisma.chaKycDocument.findMany({ where: { customerId }, orderBy: { id: 'asc' } });
        if (docs.length === 0) {
            const creates = KYC_DOC_TYPES.map(d => prisma.chaKycDocument.create({
                data: { customerId, documentType: d.type, isMandatory: d.mandatory },
            }));
            docs = await Promise.all(creates);
        }
        res.json({ success: true, data: docs, docTypes: KYC_DOC_TYPES });
    } catch (err) {
        console.error('Get KYC documents error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch KYC documents' } });
    }
}

async function uploadKycDocument(req, res) {
    try {
        const customerId = parseInt(req.params.id);
        const { docType } = req.params;
        if (!req.file) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } });
        const fileUrl = `/uploads/${req.file.filename}`;
        await prisma.chaKycDocument.updateMany({
            where: { customerId, documentType: docType },
            data: { fileUrl, uploadedAt: new Date(), status: 'UPLOADED' },
        });
        res.json({ success: true, message: 'KYC document uploaded' });
    } catch (err) {
        console.error('Upload KYC document error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Upload failed' } });
    }
}

async function deleteKycDocument(req, res) {
    try {
        const docId = parseInt(req.params.docId);
        await prisma.chaKycDocument.update({
            where: { id: docId },
            data: { fileUrl: null, uploadedAt: null, status: 'PENDING' },
        });
        res.json({ success: true, message: 'KYC document removed' });
    } catch (err) {
        console.error('Delete KYC document error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Delete failed' } });
    }
}

module.exports = { getKycDocuments, uploadKycDocument, deleteKycDocument, KYC_DOC_TYPES };
