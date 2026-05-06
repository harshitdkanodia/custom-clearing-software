import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Ship, Container, Upload, CheckCircle, FileText, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function PublicShipmentPortal() {
    const { token } = useParams();
    const [shipment, setShipment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(null);

    async function fetchShipment() {
        try {
            const res = await axios.get(`${API_URL}/portal/${token}`);
            setShipment(res.data.data);
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Failed to load shipment details');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchShipment();
    }, [token]);

    async function handleUpload(section, docType, file) {
        const formData = new FormData();
        formData.append('file', file);
        setUploading(docType);
        try {
            await axios.post(`${API_URL}/portal/${token}/upload/${section}/${docType}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Document uploaded successfully');
            fetchShipment();
        } catch (err) {
            toast.error('Upload failed');
        } finally {
            setUploading(null);
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    if (!shipment) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Invalid or expired link</div>;

    const pendingFiling = shipment.filingDocuments?.filter(d => d.isMandatory && !d.fileUrl) || [];
    const pendingDo = shipment.doDocuments?.filter(d => d.isMandatory && !d.fileUrl) || [];

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><Ship className="h-5 w-5" /></div>
                        <h1 className="font-bold text-gray-900 tracking-tight">Shipment Portal</h1>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">{shipment.onsJobNumber}</Badge>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Core Status */}
                <Card className="overflow-hidden border-none shadow-md">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Current Status</p>
                        <h2 className="text-2xl font-black">{shipment.status.replace(/_/g, ' ')}</h2>
                        <div className="mt-4 flex items-center gap-4 text-sm font-medium">
                            <div className="flex items-center gap-1.5"><Ship className="h-4 w-4 text-blue-200" /> {shipment.shipmentType}</div>
                            <div className="w-1.5 h-1.5 bg-blue-300/30 rounded-full" />
                            <div>{shipment.customer?.customerName}</div>
                        </div>
                    </div>
                </Card>

                {/* Container Status */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-sm font-bold flex items-center gap-2"><Container className="h-4 w-4 text-blue-600" /> Container Tracking</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {shipment.containers?.map(c => (
                                <div key={c.id} className="p-4 rounded-xl border bg-white flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-black font-mono text-gray-900">{c.containerNumber}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{c.containerSize} · {c.containerType}</p>
                                    </div>
                                    <Badge variant={c.status === 'CFS_OUT_DELIVERED' ? 'success' : 'blue'} className="text-[9px] uppercase font-bold">
                                        {c.status.replace(/_/g, ' ')}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Document Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Filing Documents */}
                    <Card className="border-none shadow-sm h-fit">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-sm font-bold flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /> Pending Filing Documents</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {pendingFiling.length === 0 ? (
                                <div className="p-8 text-center"><CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" /><p className="text-sm text-gray-500">All Filing documents uploaded</p></div>
                            ) : pendingFiling.map(doc => (
                                <div key={doc.id} className="p-4 flex items-center justify-between border-b last:border-0">
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">{doc.documentType.replace(/_/g, ' ')}</p>
                                        <p className="text-[10px] text-red-500 font-bold uppercase mt-1">Required</p>
                                    </div>
                                    <label className={`cursor-pointer h-8 px-3 rounded flex items-center justify-center gap-2 text-xs font-bold transition-all ${uploading === doc.documentType ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                                        {uploading === doc.documentType ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                        <input type="file" className="hidden" disabled={!!uploading} onChange={(e) => handleUpload('filing', doc.documentType, e.target.files[0])} />
                                        Upload
                                    </label>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* DO Documents */}
                    <Card className="border-none shadow-sm h-fit">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-sm font-bold flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /> Pending DO Documents</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {pendingDo.length === 0 ? (
                                <div className="p-8 text-center"><CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" /><p className="text-sm text-gray-500">All DO documents uploaded</p></div>
                            ) : pendingDo.map(doc => (
                                <div key={doc.id} className="p-4 flex items-center justify-between border-b last:border-0">
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">{doc.documentType.replace(/_/g, ' ')}</p>
                                        <p className="text-[10px] text-red-500 font-bold uppercase mt-1">Required</p>
                                    </div>
                                    <label className={`cursor-pointer h-8 px-3 rounded flex items-center justify-center gap-2 text-xs font-bold transition-all ${uploading === doc.documentType ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                                        {uploading === doc.documentType ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                        <input type="file" className="hidden" disabled={!!uploading} onChange={(e) => handleUpload('do', doc.documentType, e.target.files[0])} />
                                        Upload
                                    </label>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Footer Info */}
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3">
                    <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-800 leading-relaxed">This is a secure portal for document submission and real-time status tracking. All documents uploaded here will be processed by our operations team for customs clearance.</p>
                </div>
            </main>
        </div>
    );
}
