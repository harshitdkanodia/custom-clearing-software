const { logActivity } = require('../services/activityService');
const { checkAndProgressShipment } = require('../services/shipmentProgressionService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper for financial year (April - March)
function getFinancialYear() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const startYear = month >= 4 ? year : year - 1;
    const endYear = startYear + 1;
    return `${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`;
}


// POST /api/shipments
async function createShipment(req, res) {
    try {
        const {
            onsJobNumber, customerId, shipmentType, noOfCtn, description, grossWeight, cfsName,
            mblNo, hblNo, vesselNameVoyage, linerName, forwarderName, portOfLoading,
            eta, freeDaysShippingLine, freeDaysCfs, containers
        } = req.body;

        const errors = {};
        if (!onsJobNumber) errors.onsJobNumber = 'Job Number is required';
        if (!customerId) errors.customerId = 'Customer is required';
        if (!shipmentType) errors.shipmentType = 'Shipment type is required';
        if (!containers || containers.length === 0) errors.containers = 'At least one container is required';

        // Check for duplicate Job Number
        if (onsJobNumber) {
            const existingJob = await prisma.shipment.findUnique({ where: { onsJobNumber } });
            if (existingJob) errors.onsJobNumber = 'Job Number already exists';
        }

        // Validate containers
        if (containers?.length > 0) {
            const containerNumbers = containers.map(c => c.containerNumber.trim().toUpperCase());
            const duplicates = containerNumbers.filter((n, i) => containerNumbers.indexOf(n) !== i);
            if (duplicates.length > 0) {
                errors.containers = `Duplicate container numbers in request: ${[...new Set(duplicates)].join(', ')}`;
            }

            for (let i = 0; i < containers.length; i++) {
                const c = containers[i];
                if (!c.containerNumber?.trim()) {
                    errors[`container_${i}`] = 'Container number is required';
                    continue;
                }

                // Global uniqueness across active shipments
                const globalDup = await prisma.container.findFirst({
                    where: {
                        containerNumber: c.containerNumber.trim().toUpperCase(),
                        shipment: { status: { not: 'CLOSED' } }
                    },
                    include: { shipment: { select: { onsJobNumber: true } } }
                });
                if (globalDup) {
                    errors[`container_${i}`] = `Container ${c.containerNumber} is already active in job ${globalDup.shipment.onsJobNumber}`;
                }
            }
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors } });
        }

        const shipment = await prisma.shipment.create({
            data: {
                onsJobNumber: onsJobNumber.toString(),
                customerId: parseInt(customerId),
                shipmentType,
                noOfCtn: noOfCtn ? parseInt(noOfCtn) : null,
                description: description || null,
                grossWeight: grossWeight ? parseFloat(grossWeight) : null,
                cfsName: cfsName || null,
                mblNo: mblNo || null,
                hblNo: hblNo || null,
                vesselNameVoyage: vesselNameVoyage || null,
                linerName: linerName || null,
                forwarderName: forwarderName || null,
                portOfLoading: portOfLoading || null,
                eta: eta ? new Date(eta) : null,
                freeDaysShippingLine: freeDaysShippingLine ? parseInt(freeDaysShippingLine) : null,
                freeDaysCfs: freeDaysCfs ? parseInt(freeDaysCfs) : null,
                containers: {
                    create: containers.map(c => ({
                        containerNumber: c.containerNumber.trim().toUpperCase(),
                        containerType: c.containerType || 'FCL',
                        containerSize: c.containerSize || 'TWENTY',
                    })),
                },
                boeStatus: { create: {} },
            },
            include: { containers: true, customer: true },
        });

        await logActivity({ shipmentId: shipment.id, userId: req.user.id, action: 'CREATE_SHIPMENT', details: `Created job ${onsJobNumber}` });
        await checkAndProgressShipment(shipment.id);

        res.status(201).json({ success: true, data: shipment });
    } catch (err) {
        console.error('Create shipment error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create shipment' } });
    }
}

// GET /api/shipments
async function getShipments(req, res) {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const where = {};

        if (status && status !== 'ALL') where.status = status;

        if (search) {
            where.OR = [
                { onsJobNumber: { contains: search } },
                { customer: { customerName: { contains: search } } },
                { containers: { some: { containerNumber: { contains: search } } } },
                { boeStatus: { boeNumber: { contains: search } } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [shipments, total] = await Promise.all([
            prisma.shipment.findMany({
                where,
                include: {
                    customer: { select: { customerName: true, dpd: true } },
                    containers: { select: { containerNumber: true, status: true } },
                    boeStatus: { select: { status: true, boeNumber: true, deliveryStatus: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            prisma.shipment.count({ where }),
        ]);

        res.json({
            success: true,
            data: shipments,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
        });
    } catch (err) {
        console.error('Get shipments error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch shipments' } });
    }
}

// GET /api/shipments/:id
async function getShipment(req, res) {
    try {
        const shipment = await prisma.shipment.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                customer: true,
                containers: true,
                doDocuments: true,
                filingDocuments: true,
                boeStatus: true,
                billing: true,
                courier: true,
                transports: true,
                alerts: { orderBy: { createdAt: 'desc' }, take: 20 },
            },
        });

        if (!shipment) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Shipment not found' } });
        }

        res.json({ success: true, data: shipment });
    } catch (err) {
        console.error('Get shipment error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch shipment' } });
    }
}

// PUT /api/shipments/:id
async function updateShipment(req, res) {
    try {
        const id = parseInt(req.params.id);
        const {
            shipmentType, noOfCtn, description, grossWeight, cfsName,
            mblNo, hblNo, vesselNameVoyage, linerName, forwarderName,
            portOfLoading, eta, freeDaysShippingLine, freeDaysCfs
        } = req.body;

        const shipment = await prisma.shipment.update({
            where: { id },
            data: {
                shipmentType, noOfCtn: noOfCtn ? parseInt(noOfCtn) : null,
                description, grossWeight: grossWeight ? parseFloat(grossWeight) : null,
                cfsName, mblNo, hblNo, vesselNameVoyage, linerName, forwarderName,
                portOfLoading, eta: eta ? new Date(eta) : null,
                freeDaysShippingLine: freeDaysShippingLine ? parseInt(freeDaysShippingLine) : null,
                freeDaysCfs: freeDaysCfs ? parseInt(freeDaysCfs) : null,
            },
            include: { customer: true, containers: true },
        });

        res.json({ success: true, data: shipment });
    } catch (err) {
        console.error('Update shipment error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update shipment' } });
    }
}

// PATCH /api/shipments/:id/igm-status
async function updateIgmStatus(req, res) {
    try {
        const id = parseInt(req.params.id);
        const { igmStatus, igmNumber, igmDate, igmItemNo, inwardDate } = req.body;
        const errors = {};

        if (igmStatus === 'AWAITING_VESSEL') {
            if (!igmNumber) errors.igmNumber = 'IGM Number is required';
            if (!igmDate) errors.igmDate = 'IGM Date is required';
            if (!igmItemNo) errors.igmItemNo = 'IGM Item No is required';
        }

        if (igmStatus === 'VESSEL_ARRIVED') {
            if (!inwardDate) errors.inwardDate = 'Inward Date is required';
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors } });
        }

        const data = { igmStatus };
        if (igmNumber) data.igmNumber = igmNumber;
        if (igmDate) data.igmDate = new Date(igmDate);
        if (igmItemNo) data.igmItemNo = igmItemNo;
        if (inwardDate) data.inwardDate = new Date(inwardDate);

        const shipment = await prisma.shipment.update({
            where: { id },
            data,
            include: { customer: true, containers: true },
        });

        let detail = `Status: ${igmStatus.replace(/_/g, ' ')}`;
        if (igmNumber) detail += ` · IGM No: ${igmNumber}`;
        if (igmDate) detail += ` · Date: ${new Date(igmDate).toLocaleDateString()}`;

        await logActivity({ shipmentId: id, userId: req.user.id, action: 'UPDATE_IGM', details: detail });
        await checkAndProgressShipment(id);

        res.json({ success: true, data: shipment });
    } catch (err) {
        console.error('Update IGM status error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update IGM status' } });
    }
}

// PATCH /api/shipments/:id/containers/:containerId/status
async function updateContainerStatus(req, res) {
    try {
        const { containerId } = req.params;
        const { status, portInDate, portInCfsName, portOutDate, cfsInDate, cfsOutDate } = req.body;
        const errors = {};

        if (status === 'PORT_IN') {
            if (!portInDate) errors.portInDate = 'Port In Date is required';
            if (!portInCfsName) errors.portInCfsName = 'Port In CFS Name is required';
        }
        if (status === 'PORT_OUT' && !portOutDate) errors.portOutDate = 'Port Out Date is required';
        if (status === 'CFS_IN' && !cfsInDate) errors.cfsInDate = 'CFS In Date is required';
        if (status === 'CFS_OUT_DELIVERED' && !cfsOutDate) errors.cfsOutDate = 'CFS Out Date is required';

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors } });
        }

        const data = { status };
        if (portInDate) data.portInDate = new Date(portInDate);
        if (portInCfsName) data.portInCfsName = portInCfsName;
        if (portOutDate) data.portOutDate = new Date(portOutDate);
        if (cfsInDate) data.cfsInDate = new Date(cfsInDate);
        if (cfsOutDate) data.cfsOutDate = new Date(cfsOutDate);

        const container = await prisma.container.update({
            where: { id: parseInt(containerId) },
            data,
        });

        const detail = `Container ${container.containerNumber} status: ${status.replace(/_/g, ' ')}`;

        await logActivity({ shipmentId: container.shipmentId, userId: req.user.id, action: 'UPDATE_CONTAINER', details: detail });
        await checkAndProgressShipment(container.shipmentId);

        res.json({ success: true, data: container });
    } catch (err) {
        console.error('Update container status error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update container status' } });
    }
}

// GET /api/shipments/:id/boe
async function getBoeStatus(req, res) {
    try {
        const boe = await prisma.boeStatus.findUnique({
            where: { shipmentId: parseInt(req.params.id) },
        });
        res.json({ success: true, data: boe });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch BOE status' } });
    }
}

// PATCH /api/shipments/:id/boe
async function updateBoeStatus(req, res) {
    try {
        const id = parseInt(req.params.id);
        const data = req.body;

        // Convert date strings to Date objects
        const dateFields = [
            'boeFiledDate', 'queryRepliedDate', 'goodsRegistrationDate',
            'examinationDate', 'dutyPaymentDate', 'stampDutyDate', 'oocDate', 'deliveryDate'
        ];
        dateFields.forEach(f => {
            if (data[f]) data[f] = new Date(data[f]);
        });

        const boe = await prisma.boeStatus.upsert({
            where: { shipmentId: id },
            update: data,
            create: { ...data, shipmentId: id },
        });

        // Generate human readable details
        const changedFields = Object.keys(req.body).filter(k => !['id', 'shipmentId'].includes(k));
        let detail = `Updated stages: ${changedFields.map(f => f.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ')}`;

        // Specific nice messages for major status changes
        if (data.status) detail = `BOE Status changed to ${data.status.replace(/_/g, ' ')}`;
        else if (data.boeNumber) detail = `BOE Number updated to ${data.boeNumber}`;
        else if (data.deliveryStatus) detail = `Delivery status: ${data.deliveryStatus.replace(/_/g, ' ')}`;

        await logActivity({
            shipmentId: id,
            userId: req.user.id,
            action: 'UPDATE_BOE',
            details: detail
        });

        // Trigger side effects (e.g. progressing shipment status)
        await checkAndProgressShipment(id);

        res.json({ success: true, data: boe });
    } catch (err) {
        console.error('Update BOE status error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update BOE status' } });
    }
}

// GET /api/shipments/:id/transport
async function getTransports(req, res) {
    try {
        const transports = await prisma.transport.findMany({
            where: { shipmentId: parseInt(req.params.id) },
        });
        res.json({ success: true, data: transports });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch transports' } });
    }
}

// POST /api/shipments/:id/transport
async function createOrUpdateTransport(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const { id, ...data } = req.body;

        // Convert dates
        ['deliveryDate', 'doValidTill'].forEach(f => {
            if (data[f]) data[f] = new Date(data[f]);
        });

        let transport;
        if (id) {
            transport = await prisma.transport.update({
                where: { id: parseInt(id) },
                data,
            });
        } else {
            transport = await prisma.transport.create({
                data: { ...data, shipmentId },
            });
        }

        const detail = id
            ? `Updated Transporter: ${data.transporterName || 'N/A'}`
            : `Created Transport record for ${data.transporterName || 'N/A'}`;

        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: id ? 'UPDATE_TRANSPORT' : 'CREATE_TRANSPORT',
            details: detail
        });

        res.json({ success: true, data: transport });
    } catch (err) {
        console.error('Transport update error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to save transport' } });
    }
}

// GET /api/shipments/:id/activity
async function getShipmentActivity(req, res) {
    try {
        const activity = await prisma.activityLog.findMany({
            where: { shipmentId: parseInt(req.params.id) },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: activity });
    } catch (err) {
        console.error('Get activity error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch activity' } });
    }
}

// DELETE /api/shipments/:id
async function deleteShipment(req, res) {
    try {
        const id = parseInt(req.params.id);
        const shipment = await prisma.shipment.findUnique({
            where: { id },
            include: { billing: true }
        });

        if (!shipment) return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });

        // Safety check: Don't delete if billing is complete or in progress
        if (shipment.status === 'CLOSED' || shipment.billingComplete) {
            return res.status(400).json({ success: false, error: { message: 'Cannot delete a closed or billed shipment' } });
        }

        await prisma.shipment.delete({ where: { id } });
        await logActivity({ action: 'DELETE_SHIPMENT', userId: req.user.id, details: `Deleted shipment ${shipment.onsJobNumber}` });

        res.json({ success: true, message: 'Shipment deleted successfully' });
    } catch (err) {
        console.error('Delete shipment error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete shipment' } });
    }
}

module.exports = {
    createShipment, getShipments, getShipment, updateShipment,
    updateIgmStatus, updateContainerStatus, getShipmentActivity,
    getBoeStatus, updateBoeStatus, getTransports, createOrUpdateTransport,
    deleteShipment
};
