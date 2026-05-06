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
 * Full status flow from spec Step 10.1:
 * BOE_NOT_FILED → BOE_FILED → UNDER_ASSESSMENT → ASSESSMENT_DONE →
 * GOODS_REGISTRATION → EXAMINATION (or RMS skip) →
 * DUTY_PAYMENT → OOC → STAMP_DUTY → DELIVERY
 */
function calculateBoeStatus(boe) {
    if (boe.deliveryDate) return 'DELIVERED';
    if (boe.oocDate) return 'OOC_DONE';
    if (boe.stampDutyDate) return 'STAMP_DUTY_DONE';
    if (boe.dutyPaymentDate) return 'CUSTOM_DUTY_PAYMENT_DONE';
    
    // OOC Pending depends on RMS or Examination
    if (boe.examinationType === 'RMS') return 'OOC_PENDING';
    if (boe.examinationType === 'EXAMIN' && boe.examinationDate) return 'OOC_PENDING';
    if (boe.examinationType === 'EXAMIN') return 'EXAMINATION_PENDING';
    
    if (boe.assessmentDoneDate) return 'ASSESSMENT_DONE';
    if (boe.boeNumber && boe.boeFiledDate) return 'BOE_STATUS'; // Assessment Pending
    if (boe.boeNumber) return 'BOE_GENERATED';
    return 'READY_FOR_SUBMISSION';
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
        if (body.cfsCharges !== undefined) data.cfsCharges = parseFloat(body.cfsCharges);

        // Handle file URLs for deletion/clearing
        ['boeFileUrl', 'oocFileUrl', 'stampDutyFileUrl', 'gatepassCustodianUrl', 'cfsInvoiceUrl'].forEach(f => {
            if (body[f] === null || body[f] === '') data[f] = null;
            else if (body[f]) data[f] = body[f];
        });

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

// POST /api/shipments/:id/boe/upload/:docType
async function uploadBoeDocument(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const { docType } = req.params;

        if (!req.file) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        const fieldMap = {
            'BOE': 'boeFileUrl',
            'STAMP_DUTY': 'stampDutyFileUrl',
            'OOC': 'oocFileUrl',
            'GATEPASS_CUSTODIAN': 'gatepassCustodianUrl',
            'CFS_INVOICE': 'cfsInvoiceUrl',
        };

        const field = fieldMap[docType];
        if (!field) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid document type' } });
        }

        const boe = await prisma.boeStatus.update({
            where: { shipmentId },
            data: { [field]: fileUrl },
        });

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'UPLOAD_BOE_DOC',
            details: `Uploaded ${docType.replace(/_/g, ' ')} document`
        });

        res.json({ success: true, data: boe });
    } catch (err) {
        console.error('Upload BOE doc error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Upload failed' } });
    }
}

module.exports = { getBoeStatus, updateBoeStatus, uploadBoeDocument };
