const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkShipmentAlerts(shipmentId) {
    try {
        const shipment = await prisma.shipment.findUnique({
            where: { id: shipmentId },
            include: { containers: true, transports: true, customer: true, doDocuments: true },
        });

        if (!shipment || shipment.status === 'CLOSED') return;

        const now = new Date();
        const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

        // 1. Shipping Line Free Days Alert (Calculated from Inward Date - Step 3.2)
        if (shipment.freeDaysShippingLine && shipment.inwardDate) {
            const inward = new Date(shipment.inwardDate);
            const expiry = new Date(inward.getTime() + shipment.freeDaysShippingLine * 24 * 60 * 60 * 1000);
            
            const notDelivered = shipment.containers.some(c => c.status !== 'CFS_OUT_DELIVERED');
            
            if (notDelivered && expiry.getTime() - now.getTime() < twoDaysMs && expiry.getTime() > now.getTime()) {
                await createAlert(shipmentId, 'SHIPPING_LINE_FREE_DAYS_EXPIRING', `Shipping line free days for ${shipment.onsJobNumber} expiring on ${expiry.toLocaleDateString()}`);
            }
        }

        // 2. CFS Free Days Alert (Calculated from Container CFS IN Date - Step 3.2)
        if (shipment.freeDaysCfs) {
            for (const container of shipment.containers) {
                if (container.status === 'CFS_IN' && container.cfsInDate) {
                    const cfsInDate = new Date(container.cfsInDate);
                    const expiry = new Date(cfsInDate.getTime() + shipment.freeDaysCfs * 24 * 60 * 60 * 1000);
                    
                    if (expiry.getTime() - now.getTime() < twoDaysMs && expiry.getTime() > now.getTime()) {
                        await createAlert(shipmentId, 'CFS_FREE_DAYS_EXPIRING', `CFS free days for container ${container.containerNumber} expiring on ${expiry.toLocaleDateString()}`);
                    }
                }
            }
        }

        // 3. DO Validity Alert (2 days before per spec)
        // Check DO Documents
        for (const doc of shipment.doDocuments) {
            if (doc.validityDate) {
                const expiry = new Date(doc.validityDate);
                if (expiry.getTime() - now.getTime() < twoDaysMs && expiry.getTime() > now.getTime()) {
                    await createAlert(shipmentId, 'DO_VALIDITY_EXPIRING', `DO Document (${doc.documentType}) validity expiring on ${expiry.toLocaleDateString()}`);
                }
            }
        }
        // Check Transports
        for (const transport of shipment.transports) {
            if (transport.doValidTill) {
                const expiry = new Date(transport.doValidTill);
                if (expiry.getTime() - now.getTime() < twoDaysMs && expiry.getTime() > now.getTime()) {
                    await createAlert(shipmentId, 'DO_VALIDITY_EXPIRING', `DO validity expiring for vehicle ${transport.vehicleNumber} on ${expiry.toLocaleDateString()}`);
                }
            }
        }

        // 4. ETA Alert (2 days before per Step 11)
        if (shipment.eta) {
            const etaDate = new Date(shipment.eta);
            if (etaDate.getTime() - now.getTime() < twoDaysMs && etaDate.getTime() > now.getTime()) {
                await createAlert(shipmentId, 'ETA_ALERT', `Shipment ${shipment.onsJobNumber} ETA is in 2 days`);
            }
        }

        // 5. DPD Port In Alert
        if (shipment.customer?.dpd) {
            const portInContainer = shipment.containers.find(c => c.status === 'PORT_IN');
            if (portInContainer) {
                await createAlert(shipmentId, 'DPD_PORT_IN', `DPD Shipment ${shipment.onsJobNumber} has arrived at Port`);
            }
        }
    } catch (err) {
        console.error('Check alerts error:', err);
    }
}

async function createAlert(shipmentId, alertType, message) {
    const exists = await prisma.alert.findFirst({
        where: { shipmentId, alertType, isRead: false },
    });

    if (!exists) {
        await prisma.alert.create({
            data: { shipmentId, alertType, message, isRead: false },
        });
    }
}

async function checkAllActiveAlerts() {
    try {
        const activeShipments = await prisma.shipment.findMany({
            where: { NOT: { status: 'CLOSED' } },
            select: { id: true }
        });

        console.log(`Running batch alert check for ${activeShipments.length} active shipments...`);
        for (const s of activeShipments) {
            await checkShipmentAlerts(s.id);
        }
    } catch (err) {
        console.error('Batch alert check error:', err);
    }
}

module.exports = { checkShipmentAlerts, checkAllActiveAlerts };
