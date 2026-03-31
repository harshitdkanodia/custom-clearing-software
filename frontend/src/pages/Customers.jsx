import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { hasRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import CustomerForm from '@/components/CustomerForm';
import { Search, Plus, Eye, Pencil, Trash2, Ban, CheckCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function Customers() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editCustomer, setEditCustomer] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [disableTarget, setDisableTarget] = useState(null);

    const canEdit = hasRole('ADMIN', 'OPERATION_STAFF');
    const canDelete = hasRole('ADMIN');

    const fetchCustomers = useCallback(async () => {
        try {
            const params = search ? { search } : {};
            const res = await api.get('/customers', { params });
            setCustomers(res.data.data);
        } catch (err) {
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(fetchCustomers, 300);
        return () => clearTimeout(timer);
    }, [fetchCustomers]);

    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            await api.delete(`/customers/${deleteTarget.id}`);
            toast.success('Customer deleted successfully');
            setDeleteTarget(null);
            fetchCustomers();
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Delete failed');
            setDeleteTarget(null);
        }
    }

    async function handleToggleStatus() {
        if (!disableTarget) return;
        try {
            await api.patch(`/customers/${disableTarget.id}/status`);
            toast.success(`Customer ${disableTarget.status === 'ACTIVE' ? 'disabled' : 'enabled'} successfully`);
            setDisableTarget(null);
            fetchCustomers();
        } catch (err) {
            toast.error('Status update failed');
            setDisableTarget(null);
        }
    }

    function handleEdit(c) {
        setEditCustomer(c);
        setFormOpen(true);
    }

    function handleAdd() {
        setEditCustomer(null);
        setFormOpen(true);
    }

    const activeCount = customers.filter(c => c.status === 'ACTIVE').length;

    return (
        <div>
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {customers.length} total · {activeCount} active
                    </p>
                </div>
                {canEdit && (
                    <Button onClick={handleAdd} className="gap-2 shadow-sm">
                        <Plus className="h-4 w-4" /> Add Customer
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="relative mb-3 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, IEC or GST..."
                    className="pl-9"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-100">
                            <TableHead className="font-semibold text-gray-700">Customer Name</TableHead>
                            <TableHead className="font-semibold text-gray-700">IEC Code</TableHead>
                            <TableHead className="font-semibold text-gray-700">GST Number</TableHead>
                            <TableHead className="font-semibold text-gray-700">DPD</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-center">Total</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-center">Active</TableHead>
                            <TableHead className="font-semibold text-gray-700">Status</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 8 }).map((_, j) => (
                                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8">
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <Users className="h-10 w-10 opacity-30" />
                                        <p className="font-medium text-gray-500">
                                            {search ? `No customers match "${search}"` : 'No customers yet'}
                                        </p>
                                        {!search && canEdit && (
                                            <Button onClick={handleAdd} size="sm" className="mt-2 gap-1">
                                                <Plus className="h-3.5 w-3.5" /> Add First Customer
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            customers.map(c => (
                                <TableRow
                                    key={c.id}
                                    className="hover:bg-blue-50/30 transition-colors"
                                >
                                    <TableCell>
                                        <button
                                            onClick={() => navigate(`/customers/${c.id}`)}
                                            className="font-semibold text-gray-900 hover:text-blue-700 transition-colors text-left"
                                        >
                                            {c.customerName}
                                        </button>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-gray-600">{c.iecCode}</TableCell>
                                    <TableCell className="font-mono text-xs text-gray-600">{c.gstNumber}</TableCell>
                                    <TableCell>
                                        <Badge
                                            className={`text-[10px] font-semibold ${c.dpd ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}
                                        >
                                            {c.dpd ? 'DPD' : 'Non-DPD'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center font-medium">{c.totalShipments}</TableCell>
                                    <TableCell className="text-center">
                                        <span className={`font-bold ${c.activeShipments > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                            {c.activeShipments}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={`text-[10px] font-semibold ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
                                        >
                                            {c.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <TooltipProvider>
                                            <div className="flex items-center justify-end gap-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600" onClick={() => navigate(`/customers/${c.id}`)}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>View Details</TooltipContent>
                                                </Tooltip>

                                                {canEdit && (
                                                    <>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-indigo-600" onClick={() => handleEdit(c)}>
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Edit Customer</TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className={`h-8 w-8 ${c.status === 'ACTIVE' ? 'text-amber-500 hover:text-amber-700' : 'text-emerald-500 hover:text-emerald-700'}`}
                                                                    onClick={() => setDisableTarget(c)}
                                                                >
                                                                    {c.status === 'ACTIVE' ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>{c.status === 'ACTIVE' ? 'Disable Customer' : 'Enable Customer'}</TooltipContent>
                                                        </Tooltip>
                                                    </>
                                                )}

                                                {canDelete && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => c.activeShipments > 0 ? toast.warning('Cannot delete: customer has active shipments') : setDeleteTarget(c)}
                                                                disabled={c.totalShipments > 0}
                                                            >
                                                                <Trash2 className={`h-4 w-4 ${c.totalShipments > 0 ? 'text-gray-300' : 'text-red-500 hover:text-red-700'}`} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {c.totalShipments > 0 ? 'Cannot delete: has shipment records' : 'Delete Customer'}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </TooltipProvider>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Customer Form Modal */}
            <CustomerForm
                open={formOpen}
                onOpenChange={setFormOpen}
                customer={editCustomer}
                onSuccess={fetchCustomers}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete <strong>{deleteTarget?.customerName}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Disable/Enable Confirmation */}
            <AlertDialog open={!!disableTarget} onOpenChange={() => setDisableTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{disableTarget?.status === 'ACTIVE' ? 'Disable' : 'Enable'} Customer</AlertDialogTitle>
                        <AlertDialogDescription>
                            {disableTarget?.status === 'ACTIVE'
                                ? `Disabling "${disableTarget?.customerName}" will prevent creating new shipments. Existing shipments will not be affected.`
                                : `Re-enable "${disableTarget?.customerName}"? They will be able to have new shipments created.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleToggleStatus}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
