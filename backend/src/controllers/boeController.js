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

/**
 * Helper to determine the current status based on completed stages
 */
function calculateBoeStatus(boe) {
    if (boe.deliveryStatus === 'DELIVERED' || boe.deliveryDate) return 'DELIVERY';
    if (boe.stampDutyStatus === 'DONE' || boe.stampDutyDate) return 'STAMP_DUTY';
    if (boe.oocStatus === 'DONE' || boe.oocDate) return 'OOC';
    if (boe.dutyPaymentStatus === 'DONE' || boe.dutyPaymentDate) return 'DUTY_PAYMENT';
    if (boe.examinationType === 'DONE' || boe.examinationDate) return 'EXAMINATION';
    if (boe.goodsRegistrationStatus === 'DONE' || boe.goodsRegistrationDate) return 'GOODS_REGISTRATION';
    if (boe.assessmentDoneDate) return 'ASSESSMENT_DONE';
    if (boe.queryStatus === 'QUERY_RECEIVED' || boe.queryStatus === 'QUERY_REPLIED') return 'UNDER_ASSESSMENT';
    if (boe.boeNumber || boe.boeFiledDate) return 'BOE_FILED';
    return 'BOE_NOT_FILED';
}

// PATCH /api/shipments/:id/boe
async function updateBoeStatus(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const body = req.body;
        const errors = {};

        // 1. Fetch current BOE to merge data
        let existingBoe = await prisma.boeStatus.findUnique({ where: { shipmentId } });
        if (!existingBoe) {
            existingBoe = await prisma.boeStatus.create({ data: { shipmentId } });
        }

        const data = {};

        // Map fields from request
        if (body.boeNumber) {
            if (!/^\d{7,10}$/.test(body.boeNumber)) {
                errors.boeNumber = 'BOE Number must be 7-10 digits';
            }
            data.boeNumber = body.boeNumber;
        }
        if (body.boeFiledDate) data.boeFiledDate = new Date(body.boeFiledDate);
        if (body.queryStatus) data.queryStatus = body.queryStatus;
        else if (!existingBoe.queryStatus) data.queryStatus = 'NO_QUERY'; // Default to NO_QUERY
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

        // 2. Calculate new status based on merged data
        const mergedBoe = { ...existingBoe, ...data };
        data.status = calculateBoeStatus(mergedBoe);

        const boe = await prisma.boeStatus.update({
            where: { shipmentId },
            data,
        });

        // Generate human readable details
        const changedFields = Object.keys(data).filter(f => f !== 'status');
        let detail = `Updated stages: ${changedFields.map(f => f.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ')}`;

        // Specific nice messages for major status changes
        if (boe.status !== existingBoe.status) {
            detail = `BOE Status progressed to ${boe.status.replace(/_/g, ' ')}`;
        } else if (data.boeNumber) {
            detail = `BOE Number updated to ${data.boeNumber}`;
        }

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'UPDATE_BOE',
            details: detail
        });

        // Check for progression on any update
        await checkAndProgressShipment(shipmentId);

        res.json({ success: true, data: boe });
    } catch (err) {
        console.error('Update BOE status error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update BOE status' } });
    }
}

module.exports = { getBoeStatus, updateBoeStatus };
