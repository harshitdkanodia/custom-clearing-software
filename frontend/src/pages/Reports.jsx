import { useState, useEffect } from 'react';
import api from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import CustomerSearchDropdown from '@/components/CustomerSearchDropdown';

const STATUS_COLORS = {
    ACTIVE: 'bg-blue-100 text-blue-700',
    READY_FOR_BILLING: 'bg-amber-100 text-amber-700',
    READY_FOR_COURIER: 'bg-purple-100 text-purple-700',
    CLOSED: 'bg-green-100 text-green-700',
};

export default function Reports() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [customerId, setCustomerId] = useState(null);

    useEffect(() => {
        fetchReport();
    }, []);

    async function fetchReport() {
        setLoading(true);
        try {
            const params = {};
            if (from) params.from = from;
            if (to) params.to = to;
            if (customerId) params.customerId = customerId;
            const res = await api.get('/reports/shipment-status', { params });
            setData(res.data.data);
        } catch (err) {
            toast.error('Failed to load report');
        } finally {
            setLoading(false);
        }
    }

    // FIX: Use axios blob download instead of window.open so JWT token is sent correctly
    async function handleExportCsv() {
        setDownloading(true);
        try {
            const params = {};
            if (from) params.from = from;
            if (to) params.to = to;
            if (customerId) params.customerId = customerId;
            const res = await api.get('/reports/export/csv', {
                params,
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `shipment-report-${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Report exported successfully');
        } catch (err) {
            toast.error('Export failed. Please try again.');
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Shipment Reports</h1>
                    <p className="text-gray-500 text-sm mt-1">{data.length} shipments found</p>
                </div>
                <Button onClick={handleExportCsv} disabled={downloading} className="gap-2">
                    {downloading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export CSV
                </Button>
            </div>

            {/* Filters */}
            <Card className="mb-3">
                <CardContent className="py-3">
                    <div className="grid grid-cols-2 md:flex md:flex-wrap gap-4 items-end">
                        <div className="space-y-1 col-span-2 md:col-span-1">
                            <Label className="text-xs font-medium text-gray-600">Customer</Label>
                            <div className="w-full md:w-64">
                                <CustomerSearchDropdown
                                    onSelect={(c) => setCustomerId(c?.id || null)}
                                    placeholder="All Customers"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-600">From Date</Label>
                            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-600">To Date</Label>
                            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
                        </div>
                        <Button onClick={fetchReport} size="sm" variant="outline" className="gap-1">
                            <Search className="h-3.5 w-3.5" /> Apply Filter
                        </Button>
                        {(from || to || customerId) && (
                            <Button onClick={() => { setFrom(''); setTo(''); setCustomerId(null); }} size="sm" variant="ghost" className="text-gray-500">
                                Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">Job No.</TableHead>
                            <TableHead className="font-semibold">Customer</TableHead>
                            <TableHead className="font-semibold">ETA</TableHead>
                            <TableHead className="font-semibold">IGM Status</TableHead>
                            <TableHead className="font-semibold">BOE Status</TableHead>
                            <TableHead className="font-semibold">Delivery</TableHead>
                            <TableHead className="font-semibold">Job Status</TableHead>
                            <TableHead className="font-semibold">Closed Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 8 }).map((_, j) => (
                                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                    <p className="font-medium">No shipments found</p>
                                    <p className="text-sm mt-1">Try adjusting your date filters</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((r, i) => (
                                <TableRow key={i} className="hover:bg-gray-50 transition-colors">
                                    <TableCell className="font-mono text-blue-600 text-xs font-medium">{r.jobNumber}</TableCell>
                                    <TableCell className="text-sm font-medium">{r.customerName}</TableCell>
                                    <TableCell className="text-xs text-gray-600">
                                        {r.eta ? new Date(r.eta).toLocaleDateString('en-IN') : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                            {r.igmStatus?.replace(/_/g, ' ') || '—'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                            {r.boeStatus?.replace(/_/g, ' ') || '—'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.deliveryStatus === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {r.deliveryStatus?.replace(/_/g, ' ') || 'Pending'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.currentStatus] || 'bg-gray-100 text-gray-700'}`}>
                                            {r.currentStatus?.replace(/_/g, ' ')}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs text-gray-600">
                                        {r.closedDate ? new Date(r.closedDate).toLocaleDateString('en-IN') : '—'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
