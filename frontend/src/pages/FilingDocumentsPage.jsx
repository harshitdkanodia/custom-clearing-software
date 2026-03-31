import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import ShipmentStatusBadge from '@/components/ShipmentStatusBadge';

export default function FilingDocumentsPage() {
    const navigate = useNavigate();
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPendingFiling() {
            try {
                const allRes = await api.get('/shipments', { params: { limit: 100 } });
                const pending = allRes.data.data.filter(s => !s.filingComplete && s.status !== 'CLOSED');
                setShipments(pending);
            } catch (err) {
                toast.error('Failed to load pending filing documents');
            } finally {
                setLoading(false);
            }
        }
        fetchPendingFiling();
    }, []);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Filing Documents</h1>
                <p className="text-gray-500 text-sm mt-0.5">Shipments with incomplete mandatory filing documentation (BL, Invoice, PL)</p>
            </div>

            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileCheck className="h-4 w-4" /> Pending Filing Mandatory Docs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Job Number</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Shipment Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : shipments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                                        All filing documentation is complete.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                shipments.map(s => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-mono font-medium text-blue-600">{s.onsJobNumber}</TableCell>
                                        <TableCell>{s.customer?.customerName || '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-[10px]">{s.shipmentType}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <ShipmentStatusBadge status={s.status} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <button
                                                onClick={() => navigate(`/shipments/${s.id}`)}
                                                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                                            >
                                                Open <ArrowRight className="h-3 w-3" />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
