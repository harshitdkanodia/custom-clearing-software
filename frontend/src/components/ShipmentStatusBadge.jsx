import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const statusConfig = {
    ACTIVE: { label: 'Active', variant: 'info' },
    READY_FOR_BILLING: { label: 'Ready for Billing', variant: 'warning' },
    READY_FOR_COURIER: { label: 'Ready for Courier', variant: 'purple' },
    CLOSED: { label: 'Closed', variant: 'success' },
};

export default function ShipmentStatusBadge({ status, className }) {
    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return (
        <Badge variant={config.variant} className={cn('text-[10px]', className)}>
            {config.label}
        </Badge>
    );
}
