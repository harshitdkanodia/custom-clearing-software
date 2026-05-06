const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// KYC documents per spec Step 6
const KYC_DOC_TYPES = [
    { type: 'IEC', label: 'IEC Copy', mandatory: true },
    { type: 'GST', label: 'GST Certificate', mandatory: true },
    { type: 'AUTHORITY_LETTER', label: 'Authority Letter', mandatory: true },
    { type: 'PAN', label: 'PAN Card', mandatory: true },
    { type: 'ELECTRICITY_BILL', label: 'Electricity / Telephone Bill', mandatory: false },
    { type: 'CANCELLED_CHEQUE', label: 'Cancelled Cheque', mandatory: false },
    { type: 'TAN', label: 'TAN Copy', mandatory: false },
    { type: 'OTHER', label: 'Other Document', mandatory: false },
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

// POST /api/customers/:id/kyc-documents/add-other
async function addOtherKycDocument(req, res) {
    try {
        const customerId = parseInt(req.params.id);
        const { customType } = req.body;

        if (!customType?.trim()) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Custom type name is required' } });
        }

        const doc = await prisma.chaKycDocument.create({
            data: {
                customerId,
                documentType: 'OTHER',
                isMandatory: false,
                customType: customType.trim(),
            },
        });

        res.status(201).json({ success: true, data: doc });
    } catch (err) {
        console.error('Add other KYC doc error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add document' } });
    }
}

async function deleteKycDocument(req, res) {
    try {
        const docId = parseInt(req.params.docId);
        const doc = await prisma.chaKycDocument.findUnique({ where: { id: docId } });

        if (doc?.documentType === 'OTHER') {
            await prisma.chaKycDocument.delete({ where: { id: docId } });
        } else {
            await prisma.chaKycDocument.update({
                where: { id: docId },
                data: { fileUrl: null, uploadedAt: null, status: 'PENDING' },
            });
        }
        res.json({ success: true, message: 'KYC document removed' });
    } catch (err) {
        console.error('Delete KYC document error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Delete failed' } });
    }
}

module.exports = { getKycDocuments, uploadKycDocument, deleteKycDocument, addOtherKycDocument, KYC_DOC_TYPES };
