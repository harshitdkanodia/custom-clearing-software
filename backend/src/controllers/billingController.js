const { PrismaClient } = require('@prisma/client');
const { checkAndProgressShipment } = require('../services/shipmentProgressionService');
const { logActivity } = require('../services/activityService');
const prisma = new PrismaClient();

// GET /api/billing
async function getBillingList(req, res) {
    try {
        const shipments = await prisma.shipment.findMany({
            where: { status: 'READY_FOR_BILLING' },
            include: {
                customer: { select: { customerName: true } },
                billing: true,
                containers: { select: { containerNumber: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
        res.json({ success: true, data: shipments });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch billing list' } });
    }
}

// GET /api/billing/:shipmentId
async function getBillingDetail(req, res) {
    try {
        const shipmentId = parseInt(req.params.shipmentId);
        let billing = await prisma.billing.findUnique({ where: { shipmentId } });
        if (!billing) {
            billing = await prisma.billing.create({ data: { shipmentId } });
        }
        const shipment = await prisma.shipment.findUnique({
            where: { id: shipmentId },
            include: { customer: true, containers: { select: { containerNumber: true } } },
        });
        res.json({ success: true, data: { billing, shipment } });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch billing' } });
    }
}

// POST /api/billing/:shipmentId/upload/:docType
async function uploadBillingDoc(req, res) {
    try {
        const shipmentId = parseInt(req.params.shipmentId);
        const { docType } = req.params;
        if (!req.file) return res.status(400).json({ success: false, error: { message: 'File is required' } });

        const fileUrl = `/uploads/${req.file.filename}`;
        const fieldMap = {
            FINAL_BILL: 'finalBillUrl', STAMP_DUTY: 'stampDutyUrl', CFS_CHARGES: 'cfsChargesUrl',
            TRANSPORT_CHARGES: 'transportChargesUrl', FIRST_TIME_IMPORT: 'firstTimeImportUrl',
            DELIVERY_CHARGES: 'deliveryChargesUrl', OOC_DOC: 'oocDocUrl', BOE_DOC: 'boeDocUrl',
            INSURANCE: 'insuranceUrl', UNION_CHARGES: 'unionChargesUrl',
        };

        const field = fieldMap[docType];
        if (!field) return res.status(400).json({ success: false, error: { message: 'Invalid document type' } });

        let billing = await prisma.billing.findUnique({ where: { shipmentId } });
        if (!billing) billing = await prisma.billing.create({ data: { shipmentId } });

        await prisma.billing.update({ where: { shipmentId }, data: { [field]: fileUrl } });

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'UPLOAD_BILLING_DOC',
            details: `Uploaded ${docType}`
        });

        res.json({ success: true, message: 'Document uploaded' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Upload failed' } });
    }
}

// PATCH /api/billing/:shipmentId/complete
async function markBillingComplete(req, res) {
    try {
        const shipmentId = parseInt(req.params.shipmentId);
        await prisma.billing.update({
            where: { shipmentId },
            data: { isComplete: true, billDate: new Date() },
        });
        await prisma.shipment.update({ where: { id: shipmentId }, data: { billingComplete: true } });

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'COMPLETE_BILLING',
            details: 'Marked billing as complete'
        });

        await checkAndProgressShipment(shipmentId);
        res.json({ success: true, message: 'Billing marked complete' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to complete billing' } });
    }
}

// PATCH /api/billing/:shipmentId/bill-amount
async function saveBillAmount(req, res) {
    try {
        const shipmentId = parseInt(req.params.shipmentId);
        const { billAmount } = req.body;
        await prisma.billing.update({ where: { shipmentId }, data: { billAmount: parseFloat(billAmount) } });

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'SAVE_BILL_AMOUNT',
            details: `Bill Amount: ${billAmount}`
        });

        res.json({ success: true, message: 'Bill amount saved' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to save amount' } });
    }
}

// POST /api/billing/:shipmentId/send-email
async function sendBillEmail(req, res) {
    try {
        const shipmentId = parseInt(req.params.shipmentId);
        const shipment = await prisma.shipment.findUnique({
            where: { id: shipmentId },
            include: { customer: true, containers: { select: { containerNumber: true } } },
        });

        const containerNos = shipment.containers.map(c => c.containerNumber).join(', ');
        const subject = `Bill // ${shipment.customer.customerName} // ${shipment.noOfCtn || 0} ctns // Cont: ${containerNos}`;

        const { sendBillingEmail } = require('../services/emailService');
        const billing = await prisma.billing.findUnique({ where: { shipmentId } });

        if (shipment.customer.email) {
            await sendBillingEmail(shipment.customer.email, subject, shipment, billing);
        }

        await prisma.billing.update({ where: { shipmentId }, data: { billEmailSentDate: new Date() } });

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'SEND_BILL_EMAIL',
            details: `Sent bill email to ${shipment.customer.email || 'N/A'}`
        });

        res.json({ success: true, message: shipment.customer.email ? 'Email sent successfully' : 'No customer email found, but status updated' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to send email' } });
    }
}

module.exports = { getBillingList, getBillingDetail, uploadBillingDoc, markBillingComplete, saveBillAmount, sendBillEmail };
