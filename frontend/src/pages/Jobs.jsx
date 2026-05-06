import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { hasRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import ShipmentStatusBadge from '@/components/ShipmentStatusBadge';
import { Search, Plus, Eye, Pencil, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export default function Jobs() {
    const navigate = useNavigate();
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});

    const canEdit = hasRole('ADMIN', 'OPERATION_STAFF');

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                // Filter for non-closed jobs
                const params = { page, limit: 20, excludeStatus: 'CLOSED' };
                if (search) params.search = search;
                const res = await api.get('/shipments', { params });
                setShipments(res.data.data);
                setPagination(res.data.pagination);
            } catch (err) {
                toast.error('Failed to load jobs');
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search, page]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Briefcase className="h-6 w-6 text-blue-600" /> Active Jobs
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Track and manage ongoing clearance operations
                    </p>
                </div>
                {canEdit && (
                    <Button onClick={() => navigate('/shipments/new')} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4" /> New Job
                    </Button>
                )}
            </div>

            {/* Search & Stats */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search Job No, Customer, Container..."
                        className="pl-9 border-gray-200 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Active</p>
                        <p className="text-xl font-black text-blue-600">{pagination.total || 0}</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead className="font-bold text-gray-700">Job Number</TableHead>
                            <TableHead className="font-bold text-gray-700">Customer</TableHead>
                            <TableHead className="font-bold text-gray-700">Type</TableHead>
                            <TableHead className="font-bold text-gray-700">Current Status</TableHead>
                            <TableHead className="font-bold text-gray-700">ETA</TableHead>
                            <TableHead className="font-bold text-gray-700 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : shipments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <Briefcase className="h-8 w-8 opacity-20" />
                                        <p>No active jobs found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            shipments.map(s => (
                                <TableRow key={s.id} className="hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => navigate(`/shipments/${s.id}`)}>
                                    <TableCell className="font-mono font-bold text-blue-600">{s.onsJobNumber}</TableCell>
                                    <TableCell className="font-medium">{s.customer?.customerName}</TableCell>
                                    <TableCell>
                                        <Badge variant={s.shipmentType === 'IMPORT' ? 'info' : 'teal'} className="text-[10px] font-bold">
                                            {s.shipmentType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell><ShipmentStatusBadge status={s.status} /></TableCell>
                                    <TableCell className="text-sm text-gray-500">
                                        {s.eta ? new Date(s.eta).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                    </TableCell>
                                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => navigate(`/shipments/${s.id}`)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {canEdit && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => navigate(`/shipments/${s.id}`)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
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
                <div className="flex items-center justify-between px-2">
                    <p className="text-xs text-gray-500 font-medium">
                        Showing page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-8 shadow-sm">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="h-8 shadow-sm">
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
