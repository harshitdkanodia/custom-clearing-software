import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { hasRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import ShipmentStatusBadge from '@/components/ShipmentStatusBadge';
import CustomerForm from '@/components/CustomerForm';
import { ArrowLeft, Pencil, Ship, FileCheck, Upload, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
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
import { toast } from 'sonner';

export default function CustomerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const [kycDocs, setKycDocs] = useState([]);
    const [kycTypes, setKycTypes] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const canEdit = hasRole('ADMIN', 'OPERATION_STAFF');

    async function fetchCustomer() {
        try {
            const res = await api.get(`/customers/${id}`);
            setCustomer(res.data.data);
        } catch (err) {
            toast.error('Failed to load customer');
        } finally {
            setLoading(false);
        }
    }

    async function fetchKycDocs() {
        try {
            const res = await api.get(`/customers/${id}/kyc-documents`);
            setKycDocs(res.data.data);
            setKycTypes(res.data.docTypes);
        } catch (err) {
            console.error(err);
        }
    }

    useEffect(() => {
        fetchCustomer();
        fetchKycDocs();
    }, [id]);

    async function handleKycUpload(docType, file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post(`/customers/${id}/kyc-documents/${docType}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('KYC document uploaded');
            fetchKycDocs();
        } catch (err) {
            toast.error('Upload failed');
        }
    }

    async function handleKycDelete(docId) {
        setConfirmDialog({
            title: 'Remove KYC Document?',
            description: 'This will delete the uploaded file for this KYC requirement.',
            onConfirm: async () => {
                try {
                    await api.delete(`/customers/${id}/kyc-documents/${docId}`);
                    toast.success('Document removed');
                    fetchKycDocs();
                } catch (err) {
                    toast.error('Delete failed');
                }
            }
        });
    }

    if (loading) {
        return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
    }

    if (!customer) {
        return <div className="text-center py-16 text-gray-500">Customer not found</div>;
    }

    return (
        <div className="p-1 w-full">
            <div className="flex items-center gap-2 mb-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-gray-900">{customer.customerName}</h1>
                        <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'destructive'} className="text-[10px]">
                            {customer.status}
                        </Badge>
                        {customer.dpd && <Badge variant="warning" className="text-[10px]">DPD</Badge>}
                    </div>
                    <p className="text-gray-500 text-sm mt-1">IEC: {customer.iecCode} | GST: {customer.gstNumber}</p>
                </div>
                {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1">
                        <Pencil className="h-3 w-3" /> Edit Profile
                    </Button>
                )}
            </div>

            <Tabs defaultValue="kyc" className="space-y-3">
                <TabsList className="bg-gray-100 p-1 h-auto flex-wrap border shadow-sm">
                    <TabsTrigger value="info">Information</TabsTrigger>
                    <TabsTrigger value="shipments">Shipments ({customer.shipments?.length || 0})</TabsTrigger>
                    <TabsTrigger value="kyc">KYC Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                    <Card>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-y-2 gap-x-4">
                                {[
                                    ['Customer Name', customer.customerName],
                                    ['IEC Code', customer.iecCode],
                                    ['GST Number', customer.gstNumber],
                                    ['Email', customer.email || '—'],
                                    ['Address', customer.address || '—'],
                                    ['DPD Status', customer.dpd ? 'DPD' : 'Non-DPD'],
                                    ['Status', customer.status],
                                    ['Created', new Date(customer.createdAt).toLocaleDateString()],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <p className="text-xs text-gray-500 font-bold uppercase">{label}</p>
                                        <p className="text-sm font-medium mt-0.5">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="shipments">
                    <div className="bg-white rounded-lg border shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Job Number</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Vessel</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!customer.shipments || customer.shipments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">No shipments found</TableCell>
                                    </TableRow>
                                ) : (
                                    customer.shipments.map(s => (
                                        <TableRow key={s.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/shipments/${s.id}`)}>
                                            <TableCell className="font-mono text-blue-600 font-bold">{s.onsJobNumber}</TableCell>
                                            <TableCell><Badge variant="secondary" className="text-[10px]">{s.shipmentType} / {s.shipmentSubType?.replace(/_/g, ' ')}</Badge></TableCell>
                                            <TableCell className="text-sm">{s.vesselNameVoyage || '—'}</TableCell>
                                            <TableCell><ShipmentStatusBadge status={s.status} /></TableCell>
                                            <TableCell className="text-xs">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="kyc">
                    <Card className="border-gray-100 shadow-sm">
                        <CardHeader className="pb-3 border-b border-gray-50">
                            <CardTitle className="text-base flex items-center gap-2 text-gray-800">
                                <FileCheck className="h-5 w-5 text-blue-600" /> Step 6: CHA KYC Documents
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-100">
                                {kycDocs.map(doc => (
                                    <div key={doc.id} className="group">
                                        <KycDocumentRow
                                            doc={doc}
                                            typeInfo={kycTypes.find(t => t.type === doc.documentType)}
                                            canEdit={canEdit}
                                            onUpload={(type, file) => {
                                                setConfirmDialog({
                                                    title: 'Upload KYC?',
                                                    description: `Confirm upload for ${type.replace(/_/g, ' ')}?`,
                                                    onConfirm: () => handleKycUpload(type, file)
                                                });
                                            }}
                                            onDelete={handleKycDelete}
                                        />
                                    </div>
                                ))}
                                {kycDocs.length === 0 && (
                                    <div className="py-12 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-300" />
                                        <p className="text-sm text-gray-400 mt-2">Initializing KYC list...</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <CustomerForm
                open={editOpen}
                onOpenChange={setEditOpen}
                customer={customer}
                onSuccess={fetchCustomer}
            />

            <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> {confirmDialog?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmDialog?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }} className="bg-blue-600 hover:bg-blue-700">Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function KycDocumentRow({ doc, typeInfo, canEdit, onUpload, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const [uploading, setUploading] = useState(false);
    const hasFile = !!doc.fileUrl;

    async function handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        onUpload(doc.documentType, file);
    }

    return (
        <div className="flex flex-col">
            <div
                className={`flex items-center justify-between p-2.5 transition-colors ${hasFile ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => hasFile && setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasFile ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : hasFile ? <CheckCircle className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900 truncate">{typeInfo?.label || doc.documentType}</p>
                            {doc.isMandatory && !hasFile && <Badge variant="destructive" className="text-[9px] px-1.5 h-4 leading-none">REQUIRED</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {hasFile ? `Last updated ${new Date(doc.updatedAt || doc.uploadedAt).toLocaleDateString()}` : 'No file uploaded'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                    {hasFile ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 text-xs font-bold h-8 px-3"
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded ? 'Hide' : 'View'}
                            </Button>
                            {canEdit && (
                                <>
                                    <label className="cursor-pointer text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors" title="Update / Re-upload">
                                        <input type="file" className="hidden" onChange={handleFileChange} />
                                        <Upload className="h-4 w-4" />
                                    </label>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                        onClick={() => onDelete(doc.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    ) : (
                        canEdit && (
                            <label className="cursor-pointer" onClick={e => e.stopPropagation()}>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
                                <div className="text-[10px] font-black uppercase bg-blue-600 text-white px-3 py-1.5 rounded shadow-sm hover:bg-blue-700 transition-colors">
                                    Upload
                                </div>
                            </label>
                        )
                    )}
                </div>
            </div>

            {expanded && hasFile && (
                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="rounded-xl border border-gray-200 bg-gray-100 overflow-hidden shadow-inner flex items-center justify-center min-h-[400px]">
                        <DocPreview url={doc.fileUrl} />
                    </div>
                </div>
            )}
        </div>
    );
}

function DocPreview({ url }) {
    const isPdf = url.toLowerCase().endsWith('.pdf');
    const fullUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_BASE_URL || ''}${url}`;
    return isPdf ? <iframe src={`${fullUrl}#toolbar=0`} className="w-full h-[600px] border-none" title="Document Preview" /> : <img src={fullUrl} alt="Preview" className="max-w-full max-h-[800px] object-contain" />;
}

function Trash2(props) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
}
