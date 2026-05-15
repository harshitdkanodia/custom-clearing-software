const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../services/activityService');

/**
 * Resets all operational data in the system while preserving User accounts.
 * restricted to ADMIN role (handled by middleware).
 */
async function resetData(req, res) {
    try {
        await prisma.$transaction([
            prisma.activityLog.deleteMany(),
            prisma.alert.deleteMany(),
            prisma.transportDocument.deleteMany(),
            prisma.transport.deleteMany(),
            prisma.courier.deleteMany(),
            prisma.billingDocument.deleteMany(),
            prisma.billing.deleteMany(),
            prisma.boeStatus.deleteMany(),
            prisma.filingDocument.deleteMany(),
            prisma.doDocument.deleteMany(),
            prisma.container.deleteMany(),
            prisma.chaKycDocument.deleteMany(),
            prisma.shipment.deleteMany(),
            prisma.customer.deleteMany(),
        ]);

        // Log this massive action
        await logActivity({
            userId: req.user.id,
            action: 'SYSTEM_RESET',
            details: 'All operational data (customers, shipments, documents, logs) has been deleted.'
        });

        res.json({ 
            success: true, 
            message: 'All operational data has been successfully reset. User accounts were preserved.' 
        });
    } catch (err) {
        console.error('System Reset Error:', err);
        res.status(500).json({ 
            success: false, 
            error: { message: 'Failed to reset system data. ' + err.message } 
        });
    }
}

module.exports = { resetData };
