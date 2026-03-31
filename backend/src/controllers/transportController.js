const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getTransport(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const transports = await prisma.transport.findMany({ where: { shipmentId } });
        res.json({ success: true, data: transports });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch transport' } });
    }
}

async function createTransport(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const transport = await prisma.transport.create({
            data: {
                shipmentId,
                arrangedBy: req.body.arrangedBy,
                transporterName: req.body.transporterName,
                gstNo: req.body.gstNo,
                vehicleNumber: req.body.vehicleNumber,
                driverMobile: req.body.driverMobile,
                emptyUnloadingCharges: req.body.emptyUnloadingCharges ? parseFloat(req.body.emptyUnloadingCharges) : null,
                unionCharges: req.body.unionCharges ? parseFloat(req.body.unionCharges) : null,
                doValidTill: req.body.doValidTill ? new Date(req.body.doValidTill) : null,
                transportFrom: req.body.transportFrom,
                transportTo: req.body.transportTo,
                grossWeight: req.body.grossWeight ? parseFloat(req.body.grossWeight) : null,
                deliveryDate: req.body.deliveryDate ? new Date(req.body.deliveryDate) : null,
            },
        });
        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'CREATE_TRANSPORT',
            details: `Created transport record for ${req.body.transporterName || 'N/A'}`
        });

        res.status(201).json({ success: true, data: transport });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create transport' } });
    }
}

async function updateTransport(req, res) {
    try {
        const id = parseInt(req.params.transportId);
        const transport = await prisma.transport.update({
            where: { id },
            data: {
                arrangedBy: req.body.arrangedBy,
                transporterName: req.body.transporterName,
                gstNo: req.body.gstNo,
                vehicleNumber: req.body.vehicleNumber,
                driverMobile: req.body.driverMobile,
                emptyUnloadingCharges: req.body.emptyUnloadingCharges ? parseFloat(req.body.emptyUnloadingCharges) : null,
                unionCharges: req.body.unionCharges ? parseFloat(req.body.unionCharges) : null,
                doValidTill: req.body.doValidTill ? new Date(req.body.doValidTill) : null,
                transportFrom: req.body.transportFrom,
                transportTo: req.body.transportTo,
                grossWeight: req.body.grossWeight ? parseFloat(req.body.grossWeight) : null,
                deliveryDate: req.body.deliveryDate ? new Date(req.body.deliveryDate) : null,
            },
        });
        await logActivity({
            shipmentId: transport.shipmentId,
            userId: req.user.id,
            action: 'UPDATE_TRANSPORT',
            details: `Updated transport: ${req.body.transporterName || 'N/A'}`
        });

        res.json({ success: true, data: transport });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update transport' } });
    }
}

module.exports = { getTransport, createTransport, updateTransport };
