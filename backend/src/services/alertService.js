const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkShipmentAlerts(shipmentId) {
    try {
        const shipment = await prisma.shipment.findUnique({
            where: { id: shipmentId },
            include: { containers: true, transports: true },
        });

        if (!shipment || shipment.status === 'CLOSED') return;

        const now = new Date();
        const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
        const oneDayMs = 1 * 24 * 60 * 60 * 1000;

        // 1. Container Free Days Alert
        for (const container of shipment.containers) {
            if (container.status !== 'CFS_OUT_DELIVERED' && shipment.freeDaysShippingLine) {
                // If we have an ETA, we can estimate. Usually, free days start from Port In or Vessel Arrived.
                // Simplified: if ETA + freeDays < 2 days from now
                const eta = shipment.eta ? new Date(shipment.eta) : null;
                if (eta) {
                    const expiry = new Date(eta.getTime() + shipment.freeDaysShippingLine * 24 * 60 * 60 * 1000);
                    if (expiry.getTime() - now.getTime() < twoDaysMs && expiry.getTime() > now.getTime()) {
                        await createAlert(shipmentId, 'CONTAINER_FREE_DAYS_EXPIRING', `Container ${container.containerNumber} free days expiring soon`);
                    }
                }
            }
        }

        // 2. CFS Free Days Alert
        if (shipment.freeDaysCfs) {
            // Check if any container is in CFS
            const inCfs = shipment.containers.find(c => c.status === 'CFS_IN');
            if (inCfs && inCfs.cfsInDate) {
                const expiry = new Date(new Date(inCfs.cfsInDate).getTime() + shipment.freeDaysCfs * 24 * 60 * 60 * 1000);
                if (expiry.getTime() - now.getTime() < twoDaysMs && expiry.getTime() > now.getTime()) {
                    await createAlert(shipmentId, 'CFS_FREE_DAYS_EXPIRING', `CFS free days expiring soon`);
                }
            }
        }

        // 3. DO Validity Alert
        for (const transport of shipment.transports) {
            if (transport.doValidTill) {
                const expiry = new Date(transport.doValidTill);
                if (expiry.getTime() - now.getTime() < oneDayMs && expiry.getTime() > now.getTime()) {
                    await createAlert(shipmentId, 'DO_VALIDITY_EXPIRING', `DO validity expiring for vehicle ${transport.vehicleNumber}`);
                }
            }
        }

        // 4. ETA Tomorrow Alert
        if (shipment.eta) {
            const etaDate = new Date(shipment.eta);
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            if (etaDate.toDateString() === tomorrow.toDateString()) {
                await createAlert(shipmentId, 'ETA_TOMORROW', `Shipment ${shipment.onsJobNumber} is arriving tomorrow`);
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

module.exports = { checkShipmentAlerts };
