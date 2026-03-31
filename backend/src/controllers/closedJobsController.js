const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

async function getClosedJobs(req, res) {
    try {
        const { from, to, customerId } = req.query;
        const where = { status: 'CLOSED' };
        if (customerId) where.customerId = parseInt(customerId);
        if (from || to) {
            where.updatedAt = {};
            if (from) where.updatedAt.gte = new Date(from);
            if (to) where.updatedAt.lte = new Date(to + 'T23:59:59');
        }

        const shipments = await prisma.shipment.findMany({
            where,
            include: {
                customer: { select: { customerName: true } },
                billing: { select: { billAmount: true, billDate: true } },
                courier: { select: { courierName: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });

        res.json({ success: true, data: shipments });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch closed jobs' } });
    }
}

async function getClosedJobDetail(req, res) {
    try {
        const shipment = await prisma.shipment.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                customer: true, containers: true, doDocuments: true, filingDocuments: true,
                boeStatus: true, billing: true, courier: true, transports: true,
            },
        });
        if (!shipment || shipment.status !== 'CLOSED') {
            return res.status(404).json({ success: false, error: { message: 'Closed job not found' } });
        }
        res.json({ success: true, data: shipment });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch job' } });
    }
}

async function downloadAllDocs(req, res) {
    try {
        const shipment = await prisma.shipment.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { doDocuments: true, filingDocuments: true, billing: true },
        });

        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment(`${shipment.onsJobNumber}-documents.zip`);
        archive.pipe(res);

        const addFile = (url, name) => {
            if (url) {
                // url is like "/uploads/filename.pdf"
                const relativePath = url.startsWith('/') ? url.substring(1) : url;
                const filePath = path.join(__dirname, '../../', relativePath);
                if (fs.existsSync(filePath)) {
                    archive.file(filePath, { name });
                } else {
                    console.warn(`File not found for zip: ${filePath}`);
                }
            }
        };

        shipment.doDocuments?.forEach(d => addFile(d.fileUrl, `DO/${d.documentType}.pdf`));
        shipment.filingDocuments?.forEach(d => addFile(d.fileUrl, `Filing/${d.documentType}.pdf`));
        if (shipment.billing) {
            Object.entries(shipment.billing).forEach(([key, val]) => {
                if (key.endsWith('Url') && val) addFile(val, `Billing/${key}.pdf`);
            });
        }

        archive.finalize();
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Download failed' } });
    }
}

module.exports = { getClosedJobs, getClosedJobDetail, downloadAllDocs };
