const { PrismaClient } = require('@prisma/client');
const { logActivity } = require('../services/activityService');
const prisma = new PrismaClient();

async function getTransport(req, res) {
    try {
        const shipmentId = parseInt(req.params.id);
        const transports = await prisma.transport.findMany({ 
            where: { shipmentId },
            include: { transportDocs: true }
        });
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
                transportRate: req.body.transportRate ? parseFloat(req.body.transportRate) : null,
                transportCharges: req.body.transportCharges ? parseFloat(req.body.transportCharges) : null,
                emptyUnloadingCharges: req.body.emptyUnloadingCharges ? parseFloat(req.body.emptyUnloadingCharges) : null,
                unionCharges: req.body.unionCharges ? parseFloat(req.body.unionCharges) : null,
                doValidTill: req.body.doValidTill ? new Date(req.body.doValidTill) : null,
                transportFrom: req.body.transportFrom,
                transportTo: req.body.transportTo,
                grossWeight: req.body.grossWeight ? parseFloat(req.body.grossWeight) : null,
                deliveryDate: req.body.deliveryDate ? new Date(req.body.deliveryDate) : null,
            },
            include: { transportDocs: true }
        });
        await logActivity({
            shipmentId,
            userId: req.user.id,
            action: 'CREATE_TRANSPORT',
            details: `Created transport record for ${req.body.transporterName || 'N/A'}`
        });

        res.status(201).json({ success: true, data: transport });
    } catch (err) {
        console.error('Create transport error:', err);
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
                transportRate: req.body.transportRate !== undefined ? (parseFloat(req.body.transportRate) || 0) : undefined,
                transportCharges: req.body.transportCharges !== undefined ? (parseFloat(req.body.transportCharges) || 0) : undefined,
                emptyUnloadingCharges: req.body.emptyUnloadingCharges !== undefined ? (parseFloat(req.body.emptyUnloadingCharges) || 0) : undefined,
                unionCharges: req.body.unionCharges !== undefined ? (parseFloat(req.body.unionCharges) || 0) : undefined,
                grossWeight: req.body.grossWeight !== undefined ? (parseFloat(req.body.grossWeight) || 0) : undefined,
                doValidTill: req.body.doValidTill ? new Date(req.body.doValidTill) : undefined,
                deliveryDate: req.body.deliveryDate ? new Date(req.body.deliveryDate) : undefined,
                transportFrom: req.body.transportFrom,
                transportTo: req.body.transportTo,
            },
            include: { transportDocs: true }
        });
        await logActivity({
            shipmentId: transport.shipmentId,
            userId: req.user.id,
            action: 'UPDATE_TRANSPORT',
            details: `Updated transport: ${req.body.transporterName || 'N/A'}`
        });

        res.json({ success: true, data: transport });
    } catch (err) {
        console.error('Update transport error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update transport' } });
    }
}

async function uploadTransportDocument(req, res) {
    try {
        const transportId = parseInt(req.params.transportId);
        const { docType } = req.params;
        const { customType } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        
        let doc;
        // Check if docType is actually an ID (for OTHER docs)
        const docId = parseInt(docType);
        
        if (!isNaN(docId)) {
            // Update existing record by ID
            doc = await prisma.transportDocument.update({
                where: { id: docId },
                data: { fileUrl, status: 'UPLOADED' }
            });
        } else {
            // It's a standard type (TRANSPORT_BILL, etc.)
            // Check if one already exists to avoid duplicates
            const existing = await prisma.transportDocument.findFirst({
                where: { transportId, documentType: docType }
            });

            if (existing) {
                doc = await prisma.transportDocument.update({
                    where: { id: existing.id },
                    data: { fileUrl, status: 'UPLOADED' }
                });
            } else {
                doc = await prisma.transportDocument.create({
                    data: {
                        transportId,
                        documentType: docType,
                        customType: docType === 'OTHER' ? customType : null,
                        fileUrl,
                        status: 'UPLOADED'
                    }
                });
            }
        }

        // Also update the legacy fields if they match for backward compatibility/quick access
        if (docType === 'TRANSPORT_BILL') {
            await prisma.transport.update({ where: { id: transportId }, data: { transportBillUrl: fileUrl } });
        } else if (docType === 'EMPTY_UNLOADING') {
            await prisma.transport.update({ where: { id: transportId }, data: { emptyUnloadingDocUrl: fileUrl } });
        }

        const transport = await prisma.transport.findUnique({
            where: { id: transportId },
            include: { transportDocs: true }
        });

        await logActivity({
            shipmentId: transport.shipmentId,
            userId: req.user.id,
            action: 'UPLOAD_TRANSPORT_DOC',
            details: `Uploaded ${docType} for transport ${transport.transporterName || transportId}`
        });

        res.json({ success: true, data: transport });
    } catch (err) {
        console.error('Upload transport doc error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Upload failed' } });
    }
}

async function deleteTransportDocument(req, res) {
    try {
        const docId = parseInt(req.params.docId);
        const doc = await prisma.transportDocument.findUnique({ where: { id: docId } });
        if (!doc) return res.status(404).json({ success: false, error: { message: 'Document not found' } });

        await prisma.transportDocument.delete({ where: { id: docId } });

        // Update legacy fields if necessary
        if (doc.documentType === 'TRANSPORT_BILL') {
            await prisma.transport.updateMany({ where: { id: doc.transportId }, data: { transportBillUrl: null } });
        } else if (doc.documentType === 'EMPTY_UNLOADING') {
            await prisma.transport.updateMany({ where: { id: doc.transportId }, data: { emptyUnloadingDocUrl: null } });
        }

        res.json({ success: true, message: 'Document deleted' });
    } catch (err) {
        console.error('Delete transport doc error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete document' } });
    }
}

async function addOtherTransportDocument(req, res) {
    try {
        const transportId = parseInt(req.params.id);
        const { customType } = req.body;

        const doc = await prisma.transportDocument.create({
            data: {
                transportId,
                documentType: 'OTHER',
                customType,
                status: 'PENDING'
            }
        });

        res.json({ success: true, data: doc });
    } catch (err) {
        console.error('Add other transport doc error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add document' } });
    }
}

async function deleteTransport(req, res) {
    try {
        const id = parseInt(req.params.transportId);
        await prisma.transport.delete({ where: { id } });
        res.json({ success: true, message: 'Transport record deleted' });
    } catch (err) {
        console.error('Delete transport error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Delete failed' } });
    }
}

module.exports = { getTransport, createTransport, updateTransport, uploadTransportDocument, deleteTransportDocument, addOtherTransportDocument, deleteTransport };
