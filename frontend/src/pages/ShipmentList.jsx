import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { hasRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import ShipmentStatusBadge from '@/components/ShipmentStatusBadge';
import { Search, Plus, Eye, Pencil, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_TABS = [
    { value: 'ALL', label: 'All' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'READY_FOR_BILLING', label: 'Ready for Billing' },
    { value: 'READY_FOR_COURIER', label: 'Ready for Courier' },
    { value: 'CLOSED', label: 'Closed' },
];

export default function ShipmentList() {
    const navigate = useNavigate();
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [deleteId, setDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const canEdit = hasRole('ADMIN', 'OPERATION_STAFF');

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const params = { page, limit: 20 };
                if (statusFilter !== 'ALL') params.status = statusFilter;
                if (search) params.search = search;
                const res = await api.get('/shipments', { params });
                setShipments(res.data.data);
                setPagination(res.data.pagination);
            } catch (err) {
                toast.error('Failed to load shipments');
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search, statusFilter, page]);

    const igmStatusBadge = (s) => {
        const map = {
            IGM_NOT_FILED: { label: 'Not Filed', variant: 'secondary' },
            AWAITING_VESSEL: { label: 'Awaiting Vessel', variant: 'warning' },
            VESSEL_ARRIVED: { label: 'Vessel Arrived', variant: 'success' },
        };
        const cfg = map[s] || { label: s, variant: 'secondary' };
        return <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>;
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {pagination.total || 0} total shipments
                    </p>
                </div>
                {canEdit && (
                    <Button onClick={() => navigate('/shipments/new')} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Shipment
                    </Button>
                )}
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-1 mb-2 bg-gray-100 rounded-lg p-1 w-fit">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                        className={`px-3 py-1.5 text-sm rounded-md transition-all ${statusFilter === tab.value
                            ? 'bg-white text-gray-900 shadow-sm font-medium'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative mb-3 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search by Job No, Customer, Container No, BOE..."
                    className="pl-9"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-100">
                            <TableHead className="font-semibold text-gray-700">Job Number</TableHead>
                            <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                            <TableHead className="font-semibold text-gray-700">Type</TableHead>
                            <TableHead className="font-semibold text-gray-700">Vessel / Voyage</TableHead>
                            <TableHead className="font-semibold text-gray-700">ETA</TableHead>
                            <TableHead className="font-semibold text-gray-700">Status</TableHead>
                            <TableHead className="font-semibold text-gray-700">IGM</TableHead>
                            <TableHead className="font-semibold text-gray-700">BOE</TableHead>
                            <TableHead className="font-semibold text-gray-700">Delivery</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 9 }).map((_, j) => (
                                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : shipments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-4 text-gray-500">
                                    No shipments found
                                </TableCell>
                            </TableRow>
                        ) : (
                            shipments.map(s => (
                                <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/shipments/${s.id}`)}>
                                    <TableCell className="font-mono font-medium text-blue-600">{s.onsJobNumber}</TableCell>
                                    <TableCell>{s.customer?.customerName}</TableCell>
                                    <TableCell>
                                        <Badge variant={s.shipmentType === 'IMPORT' ? 'info' : 'teal'} className="text-[10px]">
                                            {s.shipmentType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">{s.vesselNameVoyage || '—'}</TableCell>
                                    <TableCell className="text-sm">{s.eta ? new Date(s.eta).toLocaleDateString() : '—'}</TableCell>
                                    <TableCell><ShipmentStatusBadge status={s.status} /></TableCell>
                                    <TableCell>{igmStatusBadge(s.igmStatus)}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-[10px]">
                                            {s.boeStatus?.status?.replace(/_/g, ' ') || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.boeStatus?.deliveryStatus === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {s.boeStatus?.deliveryStatus?.replace(/_/g, ' ') || 'Pending'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => navigate(`/shipments/${s.id}`)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {canEdit && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => navigate(`/shipments/${s.id}?edit=true`)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteId(s.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-500">
                        Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" /> Previous
                        </Button>
                        <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !deleting && !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the shipment record
                            from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async (e) => {
                                e.preventDefault();
                                if (!deleteId) return;
                                setDeleting(true);
                                try {
                                    await api.delete(`/shipments/${deleteId}`);
                                    toast.success('Shipment deleted');
                                    setShipments(shipments.filter(x => x.id !== deleteId));
                                    setDeleteId(null);
                                } catch (err) {
                                    toast.error(err.response?.data?.error?.message || 'Delete failed');
                                } finally {
                                    setDeleting(false);
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700 hover:text-white"
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
