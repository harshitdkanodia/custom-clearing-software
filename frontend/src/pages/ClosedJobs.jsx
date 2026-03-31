import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Archive, Search, Download, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function ClosedJobs() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [downloading, setDownloading] = useState(null);

    useEffect(() => { fetchJobs(); }, []);

    async function fetchJobs() {
        setLoading(true);
        try {
            const params = {};
            if (from) params.from = from;
            if (to) params.to = to;
            if (search) params.search = search;
            const res = await api.get('/closed-jobs', { params });
            setJobs(res.data.data);
        } catch (err) {
            toast.error('Failed to load closed jobs');
        } finally {
            setLoading(false);
        }
    }

    // Authenticated download using axios blob
    async function handleDownload(id, jobNumber) {
        setDownloading(id);
        try {
            const res = await api.get(`/closed-jobs/${id}/download-all`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${jobNumber}-documents.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Documents downloaded');
        } catch (err) {
            toast.error('Download failed. Please try again.');
        } finally {
            setDownloading(null);
        }
    }

    const filtered = jobs.filter(j => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            j.onsJobNumber?.toLowerCase().includes(s) ||
            j.customer?.customerName?.toLowerCase().includes(s)
        );
    });

    return (
        <div>
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Closed Jobs</h1>
                <p className="text-gray-500 text-sm mt-0.5">{jobs.length} archived shipments</p>
            </div>

            {/* Filters */}
            <Card className="mb-3 border-gray-100">
                <CardContent className="py-3">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by Job No or Customer..."
                                className="pl-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-600">From Date</Label>
                            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-600">To Date</Label>
                            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
                        </div>
                        <Button onClick={fetchJobs} size="sm" variant="outline" className="gap-1.5">
                            <Search className="h-3.5 w-3.5" /> Apply Filter
                        </Button>
                        {(from || to) && (
                            <Button onClick={() => { setFrom(''); setTo(''); }} size="sm" variant="ghost" className="text-gray-400">Clear</Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-100">
                            <TableHead className="font-semibold">Job No.</TableHead>
                            <TableHead className="font-semibold">Customer</TableHead>
                            <TableHead className="font-semibold">Bill Amount</TableHead>
                            <TableHead className="font-semibold">Courier</TableHead>
                            <TableHead className="font-semibold">Closed Date</TableHead>
                            <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    <Archive className="h-9 w-9 mx-auto mb-2 text-gray-300" />
                                    <p className="text-gray-500 font-medium">{search ? `No results for "${search}"` : 'No closed jobs yet'}</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(j => (
                                <TableRow key={j.id} className="hover:bg-gray-50 transition-colors">
                                    <TableCell className="font-mono font-medium text-blue-600 text-xs">{j.onsJobNumber}</TableCell>
                                    <TableCell className="font-medium text-sm">{j.customer?.customerName}</TableCell>
                                    <TableCell className="text-sm">
                                        {j.billing?.billAmount
                                            ? <span className="font-semibold text-gray-800">₹{parseFloat(j.billing.billAmount).toLocaleString('en-IN')}</span>
                                            : <span className="text-gray-400">—</span>
                                        }
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">{j.courier?.courierName || '—'}</TableCell>
                                    <TableCell className="text-xs text-gray-600">
                                        {new Date(j.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500 hover:text-blue-600"
                                                title="View Shipment"
                                                onClick={() => navigate(`/shipments/${j.id}`)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500 hover:text-green-600"
                                                title="Download All Documents"
                                                onClick={() => handleDownload(j.id, j.onsJobNumber)}
                                                disabled={downloading === j.id}
                                            >
                                                {downloading === j.id
                                                    ? <RefreshCw className="h-4 w-4 animate-spin" />
                                                    : <Download className="h-4 w-4" />
                                                }
                                            </Button>
                                        </div>
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
