const { PrismaClient } = require('@prisma/client');
const { checkShipmentAlerts } = require('./alertService');
const prisma = new PrismaClient();

async function checkAndProgressShipment(shipmentId) {
    try {
        await checkShipmentAlerts(shipmentId);

        const shipment = await prisma.shipment.findUnique({
            where: { id: shipmentId },
            include: { boeStatus: true, billing: true, courier: true },
        });

        if (!shipment) return;

        let newStatus = shipment.status;

        // If delivery = DELIVERED and billing not complete → READY_FOR_BILLING
        if (shipment.boeStatus?.deliveryStatus === 'DELIVERED' && !shipment.billingComplete && shipment.status === 'ACTIVE') {
            newStatus = 'READY_FOR_BILLING';
        }

        // If billing complete → READY_FOR_COURIER
        if (shipment.billingComplete && shipment.status === 'READY_FOR_BILLING') {
            newStatus = 'READY_FOR_COURIER';
        }

        // If courier dispatched → CLOSED
        if (shipment.courier?.status === 'DISPATCHED' && shipment.status === 'READY_FOR_COURIER') {
            newStatus = 'CLOSED';
        }

        if (newStatus !== shipment.status) {
            await prisma.shipment.update({
                where: { id: shipmentId },
                data: { status: newStatus },
            });
            console.log(`Shipment ${shipmentId} progressed: ${shipment.status} → ${newStatus}`);
        }

        return newStatus;
    } catch (err) {
        console.error('Check and progress error:', err);
    }
}

async function checkDoChecklistComplete(shipmentId) {
    const mandatoryDocs = await prisma.doDocument.findMany({
        where: { shipmentId, isMandatory: true },
    });

    const allComplete = mandatoryDocs.length > 0 && mandatoryDocs.every(d => d.status === 'SENT_FOR_SUBMISSION');

    if (allComplete) {
        await prisma.shipment.update({
            where: { id: shipmentId },
            data: { doChecklistComplete: true },
        });
    }

    return allComplete;
}

async function checkFilingComplete(shipmentId) {
    const mandatoryDocs = await prisma.filingDocument.findMany({
        where: { shipmentId, isMandatory: true },
    });

    const allComplete = mandatoryDocs.length > 0 && mandatoryDocs.every(d => d.status === 'UPLOADED');

    if (allComplete) {
        await prisma.shipment.update({
            where: { id: shipmentId },
            data: { filingComplete: true },
        });
    }

    return allComplete;
}

module.exports = { checkAndProgressShipment, checkDoChecklistComplete, checkFilingComplete };
