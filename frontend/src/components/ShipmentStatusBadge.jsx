import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const statusConfig = {
    // 20+ Steps Flow
    JOBS_CREATED: { label: 'Jobs Created', variant: 'info' },
    DOCUMENT_PENDING: { label: 'Document Pending', variant: 'warning' },
    CHECKLIST_PENDING: { label: 'Checklist Pending', variant: 'warning' },
    CHECKLIST_READY: { label: 'Checklist Ready', variant: 'info' },
    CHECKLIST_SENT_FOR_APPROVAL: { label: 'Checklist Sent', variant: 'warning' },
    IGM_PENDING: { label: 'IGM Pending', variant: 'warning' },
    IGM_UPDATED_CHECKLIST_SENT_FOR_APPROVAL: { label: 'IGM Updated / Sent', variant: 'warning' },
    READY_FOR_SUBMISSION: { label: 'Ready for Submission', variant: 'info' },
    JOB_SENT_FOR_SUBMISSION: { label: 'Sent for Submission', variant: 'warning' },
    BOE_GENERATED: { label: 'BOE Generated', variant: 'purple' },
    BOE_STATUS: { label: 'Assessment Pending', variant: 'warning' },
    ASSESSMENT_DONE: { label: 'Assessment Done', variant: 'info' },
    EXAMINATION_PENDING: { label: 'Examination Pending', variant: 'warning' },
    OOC_PENDING: { label: 'OOC Pending', variant: 'warning' },
    CUSTOM_DUTY_PENDING: { label: 'Custom Duty Pending', variant: 'warning' },
    CUSTOM_DUTY_PAYMENT_DONE: { label: 'Custom Duty Payment Done', variant: 'success' },
    STAMP_DUTY_PENDING: { label: 'Stamp Duty Pending', variant: 'warning' },
    STAMP_DUTY_DONE: { label: 'Stamp Duty Done', variant: 'success' },
    OOC_DONE: { label: 'OOC Done', variant: 'success' },
    READY_FOR_DELIVERY: { label: 'Ready for Delivery', variant: 'info' },
    DELIVERED: { label: 'Delivered', variant: 'success' },
    BILLING_DONE: { label: 'Billing Done', variant: 'success' },
    
    // Lifecycle
    ACTIVE: { label: 'Active', variant: 'info' },
    READY_FOR_BILLING: { label: 'Ready for Billing', variant: 'warning' },
    READY_FOR_COURIER: { label: 'Ready for Courier', variant: 'purple' },
    CLOSED: { label: 'Closed', variant: 'success' },
};

export default function ShipmentStatusBadge({ status, className }) {
    const config = statusConfig[status] || { label: status?.replace(/_/g, ' '), variant: 'secondary' };
    return (
        <Badge variant={config.variant} className={cn('text-[10px] whitespace-nowrap', className)}>
            {config.label}
        </Badge>
    );
}
