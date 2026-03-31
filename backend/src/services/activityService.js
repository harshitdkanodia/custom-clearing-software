const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function logActivity({ shipmentId, userId, action, details }) {
    try {
        await prisma.activityLog.create({
            data: {
                shipmentId: shipmentId ? parseInt(shipmentId) : null,
                userId: userId ? parseInt(userId) : null,
                action,
                details: typeof details === 'object' ? JSON.stringify(details) : details,
            },
        });
    } catch (err) {
        console.error('Activity log error:', err);
    }
}

module.exports = { logActivity };
