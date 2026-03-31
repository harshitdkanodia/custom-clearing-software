import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function KycDocumentsPage() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchKycStatus() {
            try {
                // Fetch all customers, then we'll check their KYC status
                // In a real app, we might have a dedicated endpoint for this
                const res = await api.get('/customers');
                const customersData = res.data.data;

                // For each customer, check if they have pending mandatory KYC
                const enriched = await Promise.all(customersData.map(async (c) => {
                    const kycRes = await api.get(`/customers/${c.id}/kyc-documents`);
                    const docs = kycRes.data.data;
                    const mandatoryPending = docs.filter(d => d.isMandatory && d.status === 'PENDING').length;
                    const totalMandatory = docs.filter(d => d.isMandatory).length;
                    return { ...c, mandatoryPending, totalMandatory };
                }));

                setCustomers(enriched);
            } catch (err) {
                toast.error('Failed to load KYC status');
            } finally {
                setLoading(false);
            }
        }
        fetchKycStatus();
    }, []);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">CHA KYC Documents</h1>
                <p className="text-gray-500 text-sm mt-0.5">Customer-level KYC compliance status</p>
            </div>

            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" /> KYC Compliance Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer Name</TableHead>
                                <TableHead>IEC Code</TableHead>
                                <TableHead>Compliance Status</TableHead>
                                <TableHead>Pending Mandatory</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : customers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                                        No customers found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customers.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.customerName}</TableCell>
                                        <TableCell className="font-mono text-xs">{c.iecCode}</TableCell>
                                        <TableCell>
                                            {c.mandatoryPending === 0 ? (
                                                <Badge variant="success" className="text-[10px] gap-1">
                                                    <CheckCircle2 className="h-2 w-2" /> Compliant
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="text-[10px] gap-1">
                                                    <AlertCircle className="h-2 w-2" /> Incomplete
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className={c.mandatoryPending > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                                                {c.mandatoryPending} / {c.totalMandatory}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <button
                                                onClick={() => navigate(`/customers/${c.id}`)}
                                                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                                            >
                                                Manage KYC <ArrowRight className="h-3 w-3" />
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
