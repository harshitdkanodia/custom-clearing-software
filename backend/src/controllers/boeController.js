const { PrismaClient } = require('@prisma/client');
const { checkAndProgressShipment } = require('../services/shipmentProgressionService');
const { logActivity } = require('../services/activityService');
const prisma = new PrismaClient();

// GET /api/shipments/:id/boe
async function getBoeStatus(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        let boe = await prisma.boeStatus.findUnique({ where: { shipmentId } });
        if (!boe) {
            boe = await prisma.boeStatus.create({ data: { shipmentId } });
        }
        res.json({ success: true, data: boe });
    } catch (err) {
        console.error('Get BOE status error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch BOE status' } });
    }
}

// PATCH /api/shipments/:id/boe
async function updateBoeStatus(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const data = {};
        const body = req.body;
        const errors = {};

        // Map fields from request
        if (body.status) data.status = body.status;
        if (body.boeNumber) {
            if (!/^\d{7}$/.test(body.boeNumber)) {
                errors.boeNumber = 'BOE Number must be exactly 7 digits';
            }
            data.boeNumber = body.boeNumber;
        }
        if (body.boeFiledDate) data.boeFiledDate = new Date(body.boeFiledDate);
        if (body.queryStatus) data.queryStatus = body.queryStatus;
        if (body.queryRepliedDate) data.queryRepliedDate = new Date(body.queryRepliedDate);
        if (body.assessmentDoneDate) data.assessmentDoneDate = new Date(body.assessmentDoneDate);
        if (body.goodsRegistrationStatus) data.goodsRegistrationStatus = body.goodsRegistrationStatus;
        if (body.goodsRegistrationDate) data.goodsRegistrationDate = new Date(body.goodsRegistrationDate);
        if (body.examinationType) data.examinationType = body.examinationType;
        if (body.examinationDate) data.examinationDate = new Date(body.examinationDate);
        if (body.examinationPercentage !== undefined) data.examinationPercentage = parseFloat(body.examinationPercentage);
        if (body.dutyPaymentStatus) data.dutyPaymentStatus = body.dutyPaymentStatus;
        if (body.dutyPaymentDate) data.dutyPaymentDate = new Date(body.dutyPaymentDate);
        if (body.oocStatus) data.oocStatus = body.oocStatus;
        if (body.oocDate) data.oocDate = new Date(body.oocDate);
        if (body.stampDutyStatus) data.stampDutyStatus = body.stampDutyStatus;
        if (body.stampDutyDate) data.stampDutyDate = new Date(body.stampDutyDate);
        if (body.stampDutyAmount !== undefined) data.stampDutyAmount = parseFloat(body.stampDutyAmount);
        if (body.deliveryStatus) data.deliveryStatus = body.deliveryStatus;
        if (body.deliveryDate) data.deliveryDate = new Date(body.deliveryDate);

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors } });
        }

        const boe = await prisma.boeStatus.update({
            where: { shipmentId },
            data,
        });

        // Generate human readable details
        const changedFields = Object.keys(data);
        let detail = `Updated stages: ${changedFields.map(f => f.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ')}`;

        // Specific nice messages for major status changes
        if (data.status) detail = `BOE Status changed to ${data.status.replace(/_/g, ' ')}`;
        else if (data.boeNumber) detail = `BOE Number updated to ${data.boeNumber}`;
        else if (data.deliveryStatus) detail = `Delivery status: ${data.deliveryStatus.replace(/_/g, ' ')}`;

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'UPDATE_BOE',
            details: detail
        });

        // Check for progression on any update (specifically delivery status changes)
        await checkAndProgressShipment(shipmentId);

        res.json({ success: true, data: boe });
    } catch (err) {
        console.error('Update BOE status error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update BOE status' } });
    }
}

module.exports = { getBoeStatus, updateBoeStatus };
