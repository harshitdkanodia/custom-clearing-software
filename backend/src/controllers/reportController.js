const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getShipmentReport(req, res) {
    try {
        const { from, to, customerId } = req.query;
        const where = {};
        if (customerId) where.customerId = parseInt(customerId);
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to + 'T23:59:59');
        }

        const shipments = await prisma.shipment.findMany({
            where,
            include: {
                customer: { select: { customerName: true } },
                containers: { select: { containerNumber: true } },
                boeStatus: { select: { status: true, boeNumber: true, deliveryStatus: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const data = shipments.map(s => ({
            jobNumber: s.onsJobNumber,
            customerName: s.customer?.customerName,
            eta: s.eta,
            igmStatus: s.igmStatus,
            boeStatus: s.boeStatus?.status || 'N/A',
            boeNumber: s.boeStatus?.boeNumber,
            deliveryStatus: s.boeStatus?.deliveryStatus || 'N/A',
            currentStatus: s.status,
            closedDate: s.status === 'CLOSED' ? s.updatedAt : null,
            containerCount: s.containers?.length || 0,
        }));

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate report' } });
    }
}

async function exportCsv(req, res) {
    try {
        const { from, to, customerId } = req.query;
        const where = {};
        if (customerId) where.customerId = parseInt(customerId);
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to + 'T23:59:59');
        }

        const shipments = await prisma.shipment.findMany({
            where,
            include: {
                customer: { select: { customerName: true } },
                boeStatus: { select: { status: true, boeNumber: true, deliveryStatus: true } },
                containers: { select: { containerNumber: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const { Parser } = require('json2csv');
        const fields = ['jobNumber', 'customerName', 'eta', 'igmStatus', 'boeStatus', 'boeNumber', 'deliveryStatus', 'currentStatus', 'closedDate', 'containerCount'];
        const data = shipments.map(s => ({
            jobNumber: s.onsJobNumber, customerName: s.customer?.customerName,
            eta: s.eta ? new Date(s.eta).toLocaleDateString() : '',
            igmStatus: s.igmStatus, boeStatus: s.boeStatus?.status || '',
            boeNumber: s.boeStatus?.boeNumber || '', deliveryStatus: s.boeStatus?.deliveryStatus || '',
            currentStatus: s.status, closedDate: s.status === 'CLOSED' ? new Date(s.updatedAt).toLocaleDateString() : '',
            containerCount: s.containers?.length || 0,
        }));

        const parser = new Parser({ fields });
        const csv = parser.parse(data);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=shipment-report.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to export' } });
    }
}

module.exports = { getShipmentReport, exportCsv };
