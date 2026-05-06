const { PrismaClient } = require('@prisma/client');
const { checkShipmentAlerts } = require('./alertService');
const prisma = new PrismaClient();

async function checkAndProgressShipment(shipmentId) {
    try {
        await checkShipmentAlerts(shipmentId);

        const shipment = await prisma.shipment.findUnique({
            where: { id: shipmentId },
            include: { 
                boeStatus: true, 
                billing: true, 
                courier: true,
                doDocuments: true,
                filingDocuments: true,
                containers: true
            },
        });

        if (!shipment || shipment.status === 'CLOSED') return;

        let newStatus = 'JOBS_CREATED';

        // 1. JOBS_CREATED (Default)
        
        // 2. DOCUMENT_PENDING (If any mandatory filing or DO doc missing)
        const mandatoryDoMissing = shipment.doDocuments.filter(d => d.isMandatory).some(d => !d.fileUrl);
        const mandatoryFilingMissing = shipment.filingDocuments.filter(d => d.isMandatory).some(d => !d.fileUrl);
        if (mandatoryDoMissing || mandatoryFilingMissing) newStatus = 'DOCUMENT_PENDING';
        else newStatus = 'CHECKLIST_PENDING';

        // 3. CHECKLIST_READY
        const checklistApproved = shipment.doDocuments.some(d => d.status === 'APPROVED');
        if (checklistApproved) newStatus = 'CHECKLIST_READY';

        // 4. CHECKLIST_SENT_FOR_APPROVAL
        const checklistSent = shipment.doDocuments.some(d => d.status === 'SENT_FOR_APPROVAL');
        if (checklistSent && newStatus === 'CHECKLIST_READY') newStatus = 'CHECKLIST_SENT_FOR_APPROVAL';

        // 5. IGM_PENDING
        if (shipment.igmStatus === 'IGM_NOT_FILED') newStatus = 'IGM_PENDING';
        else if (shipment.igmStatus === 'AWAITING_VESSEL') newStatus = 'IGM_PENDING';
        else if (shipment.igmStatus === 'VESSEL_ARRIVED') newStatus = 'READY_FOR_SUBMISSION';

        // 6. IGM_UPDATED_CHECKLIST_SENT_FOR_APPROVAL
        if (shipment.igmNumber && shipment.igmDate && newStatus === 'IGM_PENDING') {
             newStatus = 'IGM_UPDATED_CHECKLIST_SENT_FOR_APPROVAL';
        }

        // 7. READY_FOR_SUBMISSION
        if (shipment.igmStatus === 'VESSEL_ARRIVED' && checklistApproved) newStatus = 'READY_FOR_SUBMISSION';

        // 8. JOB_SENT_FOR_SUBMISSION
        const jobSent = shipment.doDocuments.some(d => d.status === 'SENT_FOR_SUBMISSION');
        if (jobSent) newStatus = 'JOB_SENT_FOR_SUBMISSION';

        // 9. BOE_GENERATED
        if (shipment.boeStatus?.boeNumber && shipment.boeStatus?.boeFiledDate) newStatus = 'BOE_GENERATED';

        // 10. BOE_STATUS (Assessment Pending)
        if (newStatus === 'BOE_GENERATED') newStatus = 'BOE_STATUS';

        // 11. ASSESSMENT_DONE
        if (shipment.boeStatus?.assessmentDoneDate) {
            newStatus = 'ASSESSMENT_DONE';
            
            // 12. EXAMIN or RMS
            if (shipment.boeStatus?.examinationType === 'EXAMIN') {
                newStatus = 'EXAMINATION_PENDING';
                if (shipment.boeStatus?.examinationDate) newStatus = 'OOC_PENDING';
            } else if (shipment.boeStatus?.examinationType === 'RMS') {
                newStatus = 'OOC_PENDING';
            }
        }

        // 13. CUSTOM_DUTY_PENDING
        if (newStatus === 'OOC_PENDING') {
            newStatus = 'CUSTOM_DUTY_PENDING';
            if (shipment.boeStatus?.dutyPaymentDate) newStatus = 'CUSTOM_DUTY_PAYMENT_DONE';
        }

        // 14. STAMP_DUTY_PENDING
        if (newStatus === 'CUSTOM_DUTY_PAYMENT_DONE') {
            newStatus = 'STAMP_DUTY_PENDING';
            if (shipment.boeStatus?.stampDutyDate) newStatus = 'STAMP_DUTY_DONE';
        }

        // 15. OOC_DONE
        if (shipment.boeStatus?.oocDate && newStatus === 'STAMP_DUTY_DONE') {
            newStatus = 'OOC_DONE';
        }

        // 16. READY_FOR_DELIVERY
        const allPortOut = shipment.containers.length > 0 && shipment.containers.every(c => ['PORT_OUT', 'CFS_IN', 'CFS_OUT_DELIVERED'].includes(c.status));
        if (newStatus === 'OOC_DONE' && allPortOut) {
            newStatus = 'READY_FOR_DELIVERY';
        }

        // 17. DELIVERED
        if (shipment.boeStatus?.deliveryDate) {
            newStatus = 'DELIVERED';
        }

        // Final overrides for Billing/Courier
        if (shipment.billingComplete) {
            newStatus = 'BILLING_DONE';
            if (!shipment.courierId) newStatus = 'READY_FOR_COURIER';
        }
        
        if (shipment.courier?.status === 'DISPATCHED') {
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

    const allComplete = mandatoryDocs.length > 0 && mandatoryDocs.every(d => d.status === 'SENT_FOR_SUBMISSION' || d.status === 'RECEIVED');

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
