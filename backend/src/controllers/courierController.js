const { PrismaClient } = require('@prisma/client');
const { checkAndProgressShipment } = require('../services/shipmentProgressionService');
const { logActivity } = require('../services/activityService');
const prisma = new PrismaClient();

// GET /api/courier
async function getCourierList(req, res) {
    try {
        const shipments = await prisma.shipment.findMany({
            where: { status: 'READY_FOR_COURIER', billingComplete: true },
            include: {
                customer: { select: { customerName: true } },
                billing: { select: { billAmount: true, billDate: true } },
                courier: true,
            },
            orderBy: { updatedAt: 'desc' },
        });
        res.json({ success: true, data: shipments });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch courier list' } });
    }
}

// POST /api/courier/:shipmentId/dispatch
async function dispatchCourier(req, res) {
    try {
        const shipmentId = parseInt(req.params.shipmentId);
        const { courierName, dispatchDate } = req.body;
        const errors = {};

        if (!courierName?.trim()) errors.courierName = 'Courier name is required';
        else if (/\d/.test(courierName)) errors.courierName = 'Courier name should not contain numbers';
        if (!dispatchDate) errors.dispatchDate = 'Dispatch date is required';
        if (!req.file) errors.receipt = 'Receipt file is required';

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', fields: errors } });
        }

        const receiptUrl = `/uploads/${req.file.filename}`;

        await prisma.courier.upsert({
            where: { shipmentId },
            create: { shipmentId, courierName: courierName.trim(), dispatchDate: new Date(dispatchDate), receiptUrl, status: 'DISPATCHED' },
            update: { courierName: courierName.trim(), dispatchDate: new Date(dispatchDate), receiptUrl, status: 'DISPATCHED' },
        });

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'DISPATCH_COURIER',
            details: `Dispatched via ${courierName}`
        });

        await checkAndProgressShipment(shipmentId);
        res.json({ success: true, message: 'Courier dispatched — shipment closed' });
    } catch (err) {
        console.error('Dispatch courier error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to dispatch courier' } });
    }
}

// GET /api/courier/:shipmentId
async function getCourierDetail(req, res) {
    try {
        const shipmentId = parseInt(req.params.shipmentId);
        const courier = await prisma.courier.findUnique({ where: { shipmentId } });
        res.json({ success: true, data: courier });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch courier' } });
    }
}

module.exports = { getCourierList, dispatchCourier, getCourierDetail };
