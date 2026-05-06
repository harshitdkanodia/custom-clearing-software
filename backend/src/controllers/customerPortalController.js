const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function getPublicShipment(req, res) {
    try {
        const { token } = req.params;
        const shipment = await prisma.shipment.findUnique({
            where: { shareToken: token },
            include: {
                containers: true,
                filingDocuments: true,
                doDocuments: true,
                boeStatus: true,
                customer: { select: { customerName: true } }
            }
        });

        if (!shipment) {
            return res.status(404).json({ success: false, error: { message: 'Link expired or invalid' } });
        }

        res.json({ success: true, data: shipment });
    } catch (err) {
        res.status(500).json({ success: false, error: { message: 'Server error' } });
    }
}

async function uploadPublicDocument(req, res) {
    try {
        const { token, section, docType } = req.params; // section: filing | do
        if (!req.file) return res.status(400).json({ success: false, error: { message: 'File required' } });

        const shipment = await prisma.shipment.findUnique({ where: { shareToken: token } });
        if (!shipment) return res.status(404).json({ success: false, error: { message: 'Invalid link' } });

        const fileUrl = `/uploads/${req.file.filename}`;

        if (section === 'filing') {
            await prisma.filingDocument.updateMany({
                where: { shipmentId: shipment.id, documentType: docType },
                data: { fileUrl, uploadedAt: new Date(), status: 'UPLOADED' }
            });
        } else if (section === 'do') {
            await prisma.doDocument.updateMany({
                where: { shipmentId: shipment.id, documentType: docType },
                data: { fileUrl, uploadedAt: new Date(), status: 'RECEIVED', statusDate: new Date() }
            });
        }

        res.json({ success: true, message: 'Document uploaded successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: { message: 'Upload failed' } });
    }
}

async function generateShareToken(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const token = crypto.randomBytes(32).toString('hex');
        
        await prisma.shipment.update({
            where: { id: shipmentId },
            data: { shareToken: token }
        });

        res.json({ success: true, token });
    } catch (err) {
        res.status(500).json({ success: false, error: { message: 'Failed to generate link' } });
    }
}

module.exports = { getPublicShipment, uploadPublicDocument, generateShareToken };
