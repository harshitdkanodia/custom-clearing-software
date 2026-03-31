const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/dashboard/counts
async function getDashboardCounts(req, res) {
    try {
        const [
            totalShipments,
            activeShipments,
            readyForBilling,
            readyForCourier,
            closedJobs,
            pendingDo,
            pendingFiling,
            pendingKyc,
            alerts
        ] = await Promise.all([
            prisma.shipment.count(),
            prisma.shipment.count({ where: { status: 'ACTIVE' } }),
            prisma.shipment.count({ where: { status: 'READY_FOR_BILLING' } }),
            prisma.shipment.count({ where: { status: 'READY_FOR_COURIER' } }),
            prisma.shipment.count({ where: { status: 'CLOSED' } }),
            prisma.shipment.count({ where: { doChecklistComplete: false, status: 'ACTIVE' } }),
            prisma.shipment.count({ where: { filingComplete: false, status: 'ACTIVE' } }),
            prisma.customer.count({
                where: {
                    OR: [
                        { kycDocuments: { none: {} } }, // No documents uploaded yet
                        { kycDocuments: { some: { isMandatory: true, status: 'PENDING' } } }
                    ]
                }
            }),
            prisma.alert.findMany({
                where: { isRead: false },
                include: { shipment: { select: { onsJobNumber: true } } },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
        ]);

        res.json({
            success: true,
            data: {
                totalShipments,
                activeShipments,
                readyForBilling,
                readyForCourier,
                closedJobs,
                pendingDo,
                pendingFiling,
                pendingKyc,
                alerts
            },
        });
    } catch (err) {
        console.error('Dashboard counts error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch dashboard' } });
    }
}

// POST /api/dashboard/alerts/:id/read
async function markAlertRead(req, res) {
    try {
        await prisma.alert.update({ where: { id: parseInt(req.params.id) }, data: { isRead: true } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to mark alert' } });
    }
}

// GET /api/dashboard/alerts
async function getAlerts(req, res) {
    try {
        const alerts = await prisma.alert.findMany({
            where: { isRead: false },
            include: { shipment: { select: { onsJobNumber: true, customer: { select: { customerName: true } } } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: alerts });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch alerts' } });
    }
}

// POST /api/dashboard/alerts/mark-all-read
async function markAllAlertsRead(req, res) {
    try {
        await prisma.alert.updateMany({ where: { isRead: false }, data: { isRead: true } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed' } });
    }
}

module.exports = { getDashboardCounts, markAlertRead, getAlerts, markAllAlertsRead };
