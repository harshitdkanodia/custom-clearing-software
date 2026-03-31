import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { hasRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import ShipmentStatusBadge from '@/components/ShipmentStatusBadge';
import {
    ArrowLeft, Ship, Container, FileText, Loader2, Upload, CheckCircle,
    Truck, Receipt, ClipboardList, AlertTriangle, History, Clock
} from 'lucide-react';
import { toast } from 'sonner';

const CONTAINER_STATUSES = [
    { value: 'AWAITING_VESSEL', label: 'Awaiting Vessel' },
    { value: 'PORT_IN', label: 'Port In' },
    { value: 'PORT_OUT', label: 'Port Out' },
    { value: 'CFS_IN', label: 'CFS In' },
    { value: 'CFS_OUT_DELIVERED', label: 'CFS Out / Delivered' },
];

const IGM_STATUSES = [
    { value: 'IGM_NOT_FILED', label: 'IGM Not Filed' },
    { value: 'AWAITING_VESSEL', label: 'Awaiting Vessel' },
    { value: 'VESSEL_ARRIVED', label: 'Vessel Arrived' },
];

export default function ShipmentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [shipment, setShipment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updateDialog, setUpdateDialog] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [updateForm, setUpdateForm] = useState({});

    // Documents state
    const [doDocs, setDoDocs] = useState([]);
    const [doTypes, setDoTypes] = useState([]);
    const [filingDocs, setFilingDocs] = useState([]);
    const [filingTypes, setFilingTypes] = useState([]);
    const [boe, setBoe] = useState(null);
    const [transports, setTransports] = useState([]);
    const [transportDialog, setTransportDialog] = useState(false);
    const [transportForm, setTransportForm] = useState({});
    const [transportSaving, setTransportSaving] = useState(false);
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    const canEdit = hasRole('ADMIN', 'OPERATION_STAFF');

    async function fetchShipment() {
        try {
            const res = await api.get(`/shipments/${id}`);
            setShipment(res.data.data);
        } catch (err) {
            toast.error('Failed to load shipment');
        } finally {
            setLoading(false);
        }
    }

    async function fetchDoDocs() {
        try {
            const res = await api.get(`/shipments/${id}/do-documents`);
            setDoDocs(res.data.data);
            setDoTypes(res.data.docTypes);
        } catch (err) { console.error(err); }
    }

    async function fetchFilingDocs() {
        try {
            const res = await api.get(`/shipments/${id}/filing-documents`);
            setFilingDocs(res.data.data);
            setFilingTypes(res.data.docTypes);
        } catch (err) { console.error(err); }
    }

    async function fetchBoe() {
        try {
            const res = await api.get(`/shipments/${id}/boe`);
            setBoe(res.data.data);
        } catch (err) { console.error(err); }
    }

    async function fetchTransports() {
        try {
            const res = await api.get(`/shipments/${id}/transport`);
            setTransports(res.data.data);
        } catch (err) { console.error(err); }
    }

    async function fetchActivities() {
        setLoadingActivities(true);
        try {
            const res = await api.get(`/shipments/${id}/activity`);
            setActivities(res.data.data);
        } catch (err) { console.error(err); }
        finally { setLoadingActivities(false); }
    }

    useEffect(() => {
        fetchShipment();
        fetchDoDocs();
        fetchFilingDocs();
        fetchBoe();
        fetchTransports();
        fetchActivities();
    }, [id]);

    // ---- Handlers ----
    async function handleBoeUpdate(data) {
        setUpdating(true);
        try {
            await api.patch(`/shipments/${id}/boe`, data);
            toast.success('BOE updated');
            setUpdateDialog(null);
            fetchBoe();
            fetchShipment();
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Update failed');
        } finally {
            setUpdating(false);
        }
    }

    async function handleIgmUpdate() {
        setUpdating(true);
        try {
            await api.patch(`/shipments/${id}/igm-status`, updateForm);
            toast.success('IGM status updated');
            setUpdateDialog(null);
            fetchShipment();
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Update failed');
        } finally {
            setUpdating(false);
        }
    }

    async function handleContainerUpdate() {
        setUpdating(true);
        try {
            await api.patch(`/shipments/${id}/containers/${updateDialog.data.id}/status`, updateForm);
            toast.success('Container status updated');
            setUpdateDialog(null);
            fetchShipment();
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Update failed');
        } finally {
            setUpdating(false);
        }
    }

    async function handleDoUpload(docType, file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post(`/shipments/${id}/do-documents/${docType}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('DO document uploaded');
            fetchDoDocs();
        } catch (err) { toast.error('Upload failed'); }
    }

    async function handleDoStatusChange(docType, status) {
        try {
            await api.patch(`/shipments/${id}/do-documents/${docType}/status`, { status });
            toast.success('Status updated');
            fetchDoDocs();
        } catch (err) { toast.error('Update failed'); }
    }

    async function handleFilingUpload(docType, file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post(`/shipments/${id}/filing-documents/${docType}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Filing document uploaded');
            fetchFilingDocs();
        } catch (err) { toast.error('Upload failed'); }
    }

    async function handleTransportSubmit(e) {
        e.preventDefault();
        setTransportSaving(true);
        try {
            if (transportForm.id) {
                await api.post(`/shipments/${id}/transport`, transportForm); // Backend handles id in body
                toast.success('Transport updated');
            } else {
                await api.post(`/shipments/${id}/transport`, transportForm);
                toast.success('Transport added');
            }
            setTransportDialog(false);
            fetchTransports();
        } catch (err) { toast.error('Failed'); }
        finally { setTransportSaving(false); }
    }

    if (loading) {
        return <div className="p-4 space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
    }
    if (!shipment) {
        return <div className="text-center py-16 text-gray-500">Shipment not found</div>;
    }

    const containerStatusBadge = (status) => {
        const map = { AWAITING_VESSEL: 'secondary', PORT_IN: 'warning', PORT_OUT: 'info', CFS_IN: 'purple', CFS_OUT_DELIVERED: 'success' };
        return <Badge variant={map[status] || 'secondary'} className="text-[10px]">{status.replace(/_/g, ' ')}</Badge>;
    };

    const doCompletionPct = doDocs.length > 0 ? Math.round((doDocs.filter(d => d.status === 'SENT_FOR_SUBMISSION').length / doDocs.filter(d => d.isMandatory).length) * 100) || 0 : 0;
    const filingCompletionPct = filingDocs.length > 0 ? Math.round((filingDocs.filter(d => d.status === 'UPLOADED').length / Math.max(filingDocs.filter(d => d.isMandatory).length, 1)) * 100) || 0 : 0;

    return (
        <div className="p-1 w-full">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/shipments')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">{shipment.onsJobNumber}</h1>
                        <ShipmentStatusBadge status={shipment.status} />
                    </div>
                    <p className="text-gray-500 text-sm mt-1">{shipment.customer?.customerName}</p>
                </div>
            </div>

            <Tabs defaultValue="basic" className="space-y-3">
                <TabsList className="bg-gray-100 p-1 h-auto flex-wrap border shadow-sm">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="containers">Containers ({shipment.containers?.length})</TabsTrigger>
                    <TabsTrigger value="igm">IGM</TabsTrigger>
                    <TabsTrigger value="do-docs">DO Docs</TabsTrigger>
                    <TabsTrigger value="filing-docs">Filing</TabsTrigger>
                    <TabsTrigger value="boe">BOE Status</TabsTrigger>
                    <TabsTrigger value="transport">Transport</TabsTrigger>
                    <TabsTrigger value="activity">Activity Log</TabsTrigger>
                </TabsList>

                <TabsContent value="basic">
                    <Card>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-sm">
                                {(() => {
                                    const eta = shipment.eta ? new Date(shipment.eta) : null;
                                    const inward = shipment.inwardDate ? new Date(shipment.inwardDate) : null;
                                    const shippingExpiry = eta && shipment.freeDaysShippingLine ? new Date(eta.getTime() + (shipment.freeDaysShippingLine * 24 * 60 * 60 * 1000)) : null;
                                    const cfsExpiry = inward && shipment.freeDaysCfs ? new Date(inward.getTime() + (shipment.freeDaysCfs * 24 * 60 * 60 * 1000)) : null;

                                    return [
                                        ['Job Number', shipment.onsJobNumber], ['Customer', shipment.customer?.customerName],
                                        ['Type', shipment.shipmentType], ['Cartons', shipment.noOfCtn || '—'],
                                        ['Gross Weight', shipment.grossWeight ? `${shipment.grossWeight} kg` : '—'],
                                        ['Description', shipment.description || '—'], ['MBL No', shipment.mblNo || '—'],
                                        ['HBL No', shipment.hblNo || '—'], ['Vessel / Voyage', shipment.vesselNameVoyage || '—'],
                                        ['CFS Name', shipment.cfsName || '—'], ['Liner', shipment.linerName || '—'],
                                        ['Forwarder', shipment.forwarderName || '—'], ['Port of Loading', shipment.portOfLoading || '—'],
                                        ['ETA', shipment.eta ? new Date(shipment.eta).toLocaleDateString() : '—'],
                                        ['Free Days (Shipping)', `${shipment.freeDaysShippingLine || 0} days`],
                                        ['Shipping Line Expiry', shippingExpiry ? <span className={shippingExpiry < new Date() ? 'text-red-600 font-bold' : 'text-green-600'}>{shippingExpiry.toLocaleDateString()}</span> : '—'],
                                        ['Free Days (CFS)', `${shipment.freeDaysCfs || 0} days`],
                                        ['CFS Expiry', cfsExpiry ? <span className={cfsExpiry < new Date() ? 'text-red-600 font-bold' : 'text-green-600'}>{cfsExpiry.toLocaleDateString()}</span> : '—'],
                                    ].map(([label, value]) => (
                                        <div key={label}><p className="text-xs text-gray-400 uppercase font-bold">{label}</p><div className="font-medium mt-0.5">{value}</div></div>
                                    ));
                                })()}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="containers">
                    <div className="space-y-2">
                        {shipment.containers?.map(c => (
                            <Card key={c.id}>
                                <CardContent className="py-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Container className="h-5 w-5" /></div>
                                            <div><p className="font-mono font-bold">{c.containerNumber}</p><p className="text-xs text-gray-400">{c.containerType} · {c.containerSize}</p></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {containerStatusBadge(c.status)}
                                            {canEdit && <Button variant="outline" size="sm" onClick={() => { setUpdateDialog({ type: 'container', data: c }); setUpdateForm({ status: c.status, portInDate: c.portInDate?.split?.('T')?.[0], portInCfsName: c.portInCfsName, portOutDate: c.portOutDate?.split?.('T')?.[0], cfsInDate: c.cfsInDate?.split?.('T')?.[0], cfsOutDate: c.cfsOutDate?.split?.('T')?.[0] }); }}>Update</Button>}
                                        </div>
                                    </div>
                                    {(c.portInDate || c.portOutDate || c.cfsInDate || c.cfsOutDate) && (
                                        <div className="mt-2 pt-2 border-t grid grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] text-gray-500 uppercase font-bold">
                                            {c.portInDate && <div>Port In: <span className="text-gray-900 ml-1">{new Date(c.portInDate).toLocaleDateString()}</span></div>}
                                            {c.portOutDate && <div>Port Out: <span className="text-gray-900 ml-1">{new Date(c.portOutDate).toLocaleDateString()}</span></div>}
                                            {c.cfsInDate && <div>CFS In: <span className="text-gray-900 ml-1">{new Date(c.cfsInDate).toLocaleDateString()}</span></div>}
                                            {c.cfsOutDate && <div>Delivered: <span className="text-gray-900 ml-1">{new Date(c.cfsOutDate).toLocaleDateString()}</span></div>}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="igm">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base"><Ship className="h-4 w-4 inline mr-2" /> IGM Status</CardTitle>
                            {canEdit && <Button variant="outline" size="sm" onClick={() => { setUpdateDialog({ type: 'igm' }); setUpdateForm({ igmStatus: shipment.igmStatus, igmNumber: shipment.igmNumber || '', igmDate: shipment.igmDate?.split?.('T')?.[0], igmItemNo: shipment.igmItemNo || '', inwardDate: shipment.inwardDate?.split?.('T')?.[0] }); }}>Update</Button>}
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-3 mb-4">
                                {IGM_STATUSES.map((s, i) => {
                                    const isActive = shipment.igmStatus === s.value;
                                    const isPast = IGM_STATUSES.findIndex(x => x.value === shipment.igmStatus) >= i;
                                    return (
                                        <div key={s.value} className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : isPast ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</div>
                                            <span className={`text-sm ${isActive ? 'font-bold' : 'text-gray-400'}`}>{s.label}</span>
                                            {i < IGM_STATUSES.length - 1 && <div className={`hidden sm:block w-8 h-0.5 ${isPast ? 'bg-green-200' : 'bg-gray-100'}`} />}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-gray-50 p-2.5 rounded-lg border">
                                <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase">IGM Number</p><p className="font-mono">{shipment.igmNumber || '—'}</p></div>
                                <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase">IGM Date</p><p>{shipment.igmDate ? new Date(shipment.igmDate).toLocaleDateString() : '—'}</p></div>
                                <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase">Item No</p><p>{shipment.igmItemNo || '—'}</p></div>
                                <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase">Inward Date</p><p>{shipment.inwardDate ? new Date(shipment.inwardDate).toLocaleDateString() : '—'}</p></div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="do-docs">
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> DO Documents</CardTitle>
                                <Badge variant={doCompletionPct === 100 ? 'success' : 'warning'}>{doCompletionPct}%</Badge>
                            </div>
                            <Progress value={doCompletionPct} className="h-1 mt-2" />
                        </CardHeader>
                        <CardContent className="p-0">
                            {doDocs.map(doc => <ShipmentDocumentRow key={doc.id} doc={doc} typeInfo={doTypes.find(t => t.type === doc.documentType)} canEdit={canEdit} onUpload={handleDoUpload} onStatusChange={handleDoStatusChange} statusOptions={['PENDING', 'RECEIVED', 'CHECKLIST_PENDING', 'CHECKLIST_READY', 'SENT_FOR_APPROVAL', 'APPROVED', 'SENT_FOR_SUBMISSION']} />)}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="filing-docs">
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Filing Documents</CardTitle>
                                <Badge variant={filingCompletionPct === 100 ? 'success' : 'warning'}>{filingCompletionPct}%</Badge>
                            </div>
                            <Progress value={filingCompletionPct} className="h-1 mt-2" />
                        </CardHeader>
                        <CardContent className="p-0">
                            {filingDocs.map(doc => <ShipmentDocumentRow key={doc.id} doc={doc} typeInfo={filingTypes.find(t => t.type === doc.documentType)} canEdit={canEdit} onUpload={handleFilingUpload} />)}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="boe">
                    {!boe ? <Skeleton className="h-48 w-full" /> : (
                        <Card>
                            <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-blue-600" /> Bill of Entry Tracking</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                    <div className="text-center md:text-left"><p className="text-[10px] text-blue-600 font-black uppercase mb-1">BOE Number</p><div className="flex items-center justify-center md:justify-start gap-2"><span className="font-mono text-lg font-bold">{boe.boeNumber || '—'}</span>{canEdit && <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => { setUpdateDialog({ type: 'boe', stage: 'BOE_FILED' }); setUpdateForm({ boeNumber: boe.boeNumber || '', boeFiledDate: boe.boeFiledDate?.split?.('T')?.[0] }); }}><History className="h-4 w-4" /></Button>}</div></div>
                                    <div className="text-center"><p className="text-[10px] text-blue-600 font-black uppercase mb-1">Filed Date</p><p className="font-bold">{boe.boeFiledDate ? new Date(boe.boeFiledDate).toLocaleDateString() : '—'}</p></div>
                                    <div className="text-center md:text-right"><p className="text-[10px] text-blue-600 font-black uppercase mb-1">BOE Status</p><Badge variant={boe.status === 'BOE_FILED' ? 'success' : 'secondary'}>{boe.status?.replace(/_/g, ' ') || 'PENDING'}</Badge></div>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Query', stage: 'QUERY', status: boe.queryStatus, date: boe.queryRepliedDate },
                                        { label: 'Assessment', stage: 'ASSESSMENT', status: boe.assessmentDoneDate ? 'DONE' : 'PENDING', date: boe.assessmentDoneDate },
                                        { label: 'Registration', stage: 'REGISTRATION', status: boe.goodsRegistrationStatus, date: boe.goodsRegistrationDate },
                                        { label: 'Examination', stage: 'EXAMINATION', status: boe.examinationType || 'PENDING', date: boe.examinationDate, meta: boe.examinationPercentage ? `${boe.examinationPercentage}%` : null },
                                        { label: 'Duty', stage: 'DUTY', status: boe.dutyPaymentStatus, date: boe.dutyPaymentDate },
                                        { label: 'OOC', stage: 'OOC', status: boe.oocStatus, date: boe.oocDate },
                                        { label: 'Stamp Duty', stage: 'STAMP_DUTY', status: boe.stampDutyStatus, date: boe.stampDutyDate, meta: boe.stampDutyAmount ? `₹${boe.stampDutyAmount}` : null },
                                    ].map((s, idx) => (
                                        <div key={`${s.label}-${idx}`} className="bg-gray-50 p-3 rounded-lg border flex flex-col justify-between">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{s.label}</p>
                                                {canEdit && <Button variant="ghost" size="xs" onClick={() => { setUpdateDialog({ type: 'boe', stage: s.stage }); setUpdateForm({ ...boe, [s.stage.toLowerCase() + 'Date']: boe[s.stage.toLowerCase() + 'Date']?.split?.('T')?.[0] }); }}>Edit</Button>}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <Badge variant={s.status === 'DONE' || (s.date && s.stage !== 'QUERY') ? 'success' : 'outline'} className="text-[9px] w-fit">
                                                        {s.status?.replace(/_/g, ' ') || 'PENDING'}
                                                    </Badge>
                                                    {s.meta && <span className="text-[9px] font-bold text-blue-600 mt-1">{s.meta}</span>}
                                                </div>
                                                {s.date && <p className="text-[10px] font-mono">{new Date(s.date).toLocaleDateString()}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl"><Truck className="h-6 w-6" /></div>
                                        <div><p className="text-sm font-bold text-gray-900">Cargo Delivery</p><p className="text-xs text-indigo-600">{boe.deliveryStatus || 'Pending'}{boe.deliveryDate ? ` · ${new Date(boe.deliveryDate).toLocaleDateString()}` : ''}</p></div>
                                    </div>
                                    {canEdit && <Button variant="outline" size="sm" onClick={() => { setUpdateDialog({ type: 'boe', stage: 'DELIVERY' }); setUpdateForm({ deliveryStatus: boe.deliveryStatus || '', deliveryDate: boe.deliveryDate?.split?.('T')?.[0] }); }}>Update</Button>}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="transport">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Transport Records</CardTitle>
                            {canEdit && <Button size="sm" onClick={() => { setTransportForm({}); setTransportDialog(true); }} className="gap-2"><Truck className="h-4 w-4" /> Add New</Button>}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {transports.length === 0 ? <p className="text-center py-12 text-gray-400">No transport records found.</p> : transports.map(t => (
                                <div key={t.id} className="p-4 rounded-xl border bg-gray-50 flex items-start justify-between">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2"><p className="font-bold text-gray-900">{t.transporterName}</p><Badge variant="secondary" className="text-[9px]">{t.vehicleNumber}</Badge></div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] text-gray-500 font-medium">
                                            <p>Driver: <span className="text-gray-900">{t.driverMobile || '—'}</span></p>
                                            <p>Weight: <span className="text-gray-900">{t.grossWeight ? `${t.grossWeight} kg` : '—'}</span></p>
                                            <p>From: <span className="text-gray-900">{t.transportFrom || '—'}</span></p>
                                            <p>To: <span className="text-gray-900">{t.transportTo || '—'}</span></p>
                                        </div>
                                    </div>
                                    {canEdit && <Button variant="ghost" size="sm" onClick={() => { setTransportForm(t); setTransportDialog(true); }}>Edit</Button>}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="activity">
                    <Card>
                        <CardHeader><CardTitle className="text-base"><History className="h-4 w-4 inline mr-2" /> Activity Log</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            {activities.map((a, i) => (
                                <div key={a.id} className="flex gap-4 relative">
                                    {i < activities.length - 1 && <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-100" />}
                                    <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center z-10 ${i === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}><Clock className="h-5 w-5" /></div>
                                    <div className="flex-1 bg-white p-4 rounded-xl border shadow-sm">
                                        <div className="flex justify-between items-center mb-1"><h4 className="text-sm font-bold">{a.action.replace(/_/g, ' ')}</h4><span className="text-[10px] text-gray-400 font-mono">{new Date(a.createdAt).toLocaleString()}</span></div>
                                        <p className="text-xs text-gray-600 mb-2">{a.details}</p>
                                        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 flex items-center justify-center uppercase">{a.user?.name?.[0]}</div><span className="text-[10px] text-gray-400">{a.user?.name} · {a.user?.role}</span></div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Update Dialogs */}
            <Dialog open={!!updateDialog} onOpenChange={() => setUpdateDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{updateDialog?.type === 'igm' ? 'Update IGM' : updateDialog?.type === 'container' ? 'Update Container' : 'Update ' + updateDialog?.stage?.replace(/_/g, ' ')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-2">
                        {updateDialog?.type === 'igm' && (
                            <>
                                <div className="space-y-2"><Label>IGM Status</Label><Select value={updateForm.igmStatus} onValueChange={v => setUpdateForm(p => ({ ...p, igmStatus: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{IGM_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>IGM Number</Label><Input value={updateForm.igmNumber || ''} onChange={e => setUpdateForm(p => ({ ...p, igmNumber: e.target.value }))} /></div>
                                <div className="space-y-2"><Label>IGM Date</Label><Input type="date" value={updateForm.igmDate || ''} onChange={e => setUpdateForm(p => ({ ...p, igmDate: e.target.value }))} /></div>
                                <div className="space-y-2"><Label>Item No</Label><Input value={updateForm.igmItemNo || ''} onChange={e => setUpdateForm(p => ({ ...p, igmItemNo: e.target.value }))} /></div>
                                <div className="space-y-2"><Label>Inward Date</Label><Input type="date" value={updateForm.inwardDate || ''} onChange={e => setUpdateForm(p => ({ ...p, inwardDate: e.target.value }))} /></div>
                            </>
                        )}
                        {updateDialog?.type === 'container' && (
                            <>
                                <div className="space-y-2"><Label>Status</Label><Select value={updateForm.status} onValueChange={v => setUpdateForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTAINER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Port In Date</Label><Input type="date" value={updateForm.portInDate || ''} onChange={e => setUpdateForm(p => ({ ...p, portInDate: e.target.value }))} /></div>
                                <div className="space-y-2"><Label>CFS Name (if Port In)</Label><Input value={updateForm.portInCfsName || ''} onChange={e => setUpdateForm(p => ({ ...p, portInCfsName: e.target.value }))} /></div>
                                <div className="space-y-2"><Label>Port Out Date</Label><Input type="date" value={updateForm.portOutDate || ''} onChange={e => setUpdateForm(p => ({ ...p, portOutDate: e.target.value }))} /></div>
                                <div className="space-y-2"><Label>CFS In Date</Label><Input type="date" value={updateForm.cfsInDate || ''} onChange={e => setUpdateForm(p => ({ ...p, cfsInDate: e.target.value }))} /></div>
                                <div className="space-y-2"><Label>CFS Out Date</Label><Input type="date" value={updateForm.cfsOutDate || ''} onChange={e => setUpdateForm(p => ({ ...p, cfsOutDate: e.target.value }))} /></div>
                            </>
                        )}
                        {updateDialog?.type === 'boe' && (
                            <>
                                {updateDialog.stage === 'BOE_FILED' && (
                                    <>
                                        <div className="space-y-2"><Label>BOE Number (7 Digits)*</Label><Input maxLength={7} value={updateForm.boeNumber || ''} onChange={e => setUpdateForm({ ...updateForm, boeNumber: e.target.value.replace(/\D/g, '') })} /></div>
                                        <div className="space-y-2"><Label>Filed Date*</Label><Input type="date" value={updateForm.boeFiledDate || ''} onChange={e => setUpdateForm({ ...updateForm, boeFiledDate: e.target.value })} /></div>
                                    </>
                                )}
                                {updateDialog.stage === 'QUERY' && (
                                    <>
                                        <div className="space-y-2"><Label>Query Status</Label><Select value={updateForm.queryStatus || 'NO_QUERY'} onValueChange={v => setUpdateForm({ ...updateForm, queryStatus: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NO_QUERY">No Query</SelectItem><SelectItem value="QUERY_RECEIVED">Query Received</SelectItem><SelectItem value="QUERY_REPLIED">Query Replied</SelectItem></SelectContent></Select></div>
                                        <div className="space-y-2"><Label>Date</Label><Input type="date" value={updateForm.queryRepliedDate || ''} onChange={e => setUpdateForm({ ...updateForm, queryRepliedDate: e.target.value })} /></div>
                                    </>
                                )}
                                {updateDialog.stage === 'ASSESSMENT' && (
                                    <>
                                        <div className="space-y-2"><Label>Assessment Done Date</Label><Input type="date" value={updateForm.assessmentDoneDate || ''} onChange={e => setUpdateForm({ ...updateForm, assessmentDoneDate: e.target.value })} /></div>
                                    </>
                                )}
                                {updateDialog.stage === 'EXAMINATION' && (
                                    <>
                                        <div className="space-y-2"><Label>Exam Type</Label><Select value={updateForm.examinationType || 'RMS'} onValueChange={v => setUpdateForm({ ...updateForm, examinationType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="RMS">RMS</SelectItem><SelectItem value="SCRUTINY">Scrutiny</SelectItem><SelectItem value="PHYSICAL">Physical</SelectItem></SelectContent></Select></div>
                                        <div className="space-y-2"><Label>Percentage (%)</Label><Input type="number" value={updateForm.examinationPercentage || ''} onChange={e => setUpdateForm({ ...updateForm, examinationPercentage: e.target.value })} /></div>
                                        <div className="space-y-2"><Label>Date</Label><Input type="date" value={updateForm.examinationDate || ''} onChange={e => setUpdateForm({ ...updateForm, examinationDate: e.target.value })} /></div>
                                    </>
                                )}
                                {updateDialog.stage === 'DUTY' && (
                                    <>
                                        <div className="space-y-2"><Label>Duty Status</Label><Select value={updateForm.dutyPaymentStatus || 'PENDING'} onValueChange={v => setUpdateForm({ ...updateForm, dutyPaymentStatus: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="DONE">Done</SelectItem></SelectContent></Select></div>
                                        <div className="space-y-2"><Label>Payment Date</Label><Input type="date" value={updateForm.dutyPaymentDate || ''} onChange={e => setUpdateForm({ ...updateForm, dutyPaymentDate: e.target.value })} /></div>
                                    </>
                                )}
                                {updateDialog.stage === 'OOC' && (
                                    <>
                                        <div className="space-y-2"><Label>OOC Status</Label><Badge>FINAL</Badge></div> {/* OOC is final status update */}
                                        <div className="space-y-2"><Label>OOC Date</Label><Input type="date" value={updateForm.oocDate || ''} onChange={e => setUpdateForm({ ...updateForm, oocDate: e.target.value })} /></div>
                                    </>
                                )}
                                {updateDialog.stage === 'STAMP_DUTY' && (
                                    <>
                                        <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" value={updateForm.stampDutyAmount || ''} onChange={e => setUpdateForm({ ...updateForm, stampDutyAmount: e.target.value })} /></div>
                                        <div className="space-y-2"><Label>Date</Label><Input type="date" value={updateForm.stampDutyDate || ''} onChange={e => setUpdateForm({ ...updateForm, stampDutyDate: e.target.value })} /></div>
                                    </>
                                )}
                                {updateDialog.stage === 'REGISTRATION' && (
                                    <div className="space-y-2"><Label>Registration Date</Label><Input type="date" value={updateForm.goodsRegistrationDate || ''} onChange={e => setUpdateForm({ ...updateForm, goodsRegistrationDate: e.target.value })} /></div>
                                )}
                                {updateDialog.stage === 'DELIVERY' && (
                                    <>
                                        <div className="space-y-2"><Label>Delivery Status</Label><Select value={updateForm.deliveryStatus || 'PENDING'} onValueChange={v => setUpdateForm({ ...updateForm, deliveryStatus: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="IN_TRANSIT">In Transit</SelectItem><SelectItem value="DELIVERED">Delivered</SelectItem></SelectContent></Select></div>
                                        <div className="space-y-2"><Label>Delivery Date</Label><Input type="date" value={updateForm.deliveryDate || ''} onChange={e => setUpdateForm({ ...updateForm, deliveryDate: e.target.value })} /></div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUpdateDialog(null)}>Cancel</Button>
                        <Button onClick={() => {
                            if (updateDialog.type === 'igm') handleIgmUpdate();
                            else if (updateDialog.type === 'container') handleContainerUpdate();
                            else if (updateDialog.type === 'boe') handleBoeUpdate(updateForm);
                        }} disabled={updating}>{updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Transport Dialog */}
            <Dialog open={transportDialog} onOpenChange={setTransportDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{transportForm.id ? 'Edit Transport' : 'Add Transport'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleTransportSubmit} className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Transporter Name</Label><Input value={transportForm.transporterName || ''} onChange={e => setTransportForm(p => ({ ...p, transporterName: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Vehicle Number</Label><Input value={transportForm.vehicleNumber || ''} onChange={e => setTransportForm(p => ({ ...p, vehicleNumber: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Driver Mobile</Label><Input value={transportForm.driverMobile || ''} onChange={e => setTransportForm(p => ({ ...p, driverMobile: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Arranged By</Label><Input value={transportForm.arrangedBy || ''} onChange={e => setTransportForm(p => ({ ...p, arrangedBy: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>From</Label><Input value={transportForm.transportFrom || ''} onChange={e => setTransportForm(p => ({ ...p, transportFrom: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>To</Label><Input value={transportForm.transportTo || ''} onChange={e => setTransportForm(p => ({ ...p, transportTo: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Delivery Date</Label><Input type="date" value={transportForm.deliveryDate?.split?.('T')?.[0] || ''} onChange={e => setTransportForm(p => ({ ...p, deliveryDate: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>DO Valid Till</Label><Input type="date" value={transportForm.doValidTill?.split?.('T')?.[0] || ''} onChange={e => setTransportForm(p => ({ ...p, doValidTill: e.target.value }))} /></div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setTransportDialog(false)}>Cancel</Button>
                            <Button type="submit" disabled={transportSaving}>{transportSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ShipmentDocumentRow({ doc, typeInfo, canEdit, onUpload, onStatusChange, statusOptions }) {
    const [expanded, setExpanded] = useState(false);
    const [uploading, setUploading] = useState(false);
    const hasFile = !!doc.fileUrl;

    async function handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try { await onUpload(doc.documentType, file); }
        finally { setUploading(false); }
    }

    return (
        <div className="border-b last:border-0">
            <div className={`p-2.5 flex items-center justify-between transition-colors ${hasFile ? 'hover:bg-gray-50 cursor-pointer' : ''}`} onClick={() => hasFile && setExpanded(!expanded)}>
                <div className="flex items-center gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasFile ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : hasFile ? <CheckCircle className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2"><p className="text-sm font-bold">{typeInfo?.label || doc.documentType}</p>{doc.isMandatory && !hasFile && <Badge variant="destructive" className="text-[8px] h-4">REQ</Badge>}</div>
                        <Badge variant="outline" className="text-[9px] mt-0.5">{doc.status.replace(/_/g, ' ')}</Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {onStatusChange && hasFile && canEdit && (
                        <Select value={doc.status} onValueChange={v => onStatusChange(doc.documentType, v)}>
                            <SelectTrigger className="h-7 text-[10px] w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                        </Select>
                    )}
                    {hasFile ? <Button variant="ghost" size="sm" className="text-blue-600 font-bold" onClick={() => setExpanded(!expanded)}>{expanded ? 'Hide' : 'View'}</Button> : canEdit && <label className="cursor-pointer bg-blue-600 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase"><input type="file" className="hidden" onChange={handleFileChange} />Upload</label>}
                </div>
            </div>
            {expanded && hasFile && <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200"><div className="rounded-xl border bg-gray-100 overflow-hidden min-h-[500px] flex items-center justify-center"><DocPreview url={doc.fileUrl} /></div></div>}
        </div>
    );
}

function DocPreview({ url }) {
    const isPdf = url.toLowerCase().endsWith('.pdf');
    const fullUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_BASE_URL || ''}${url}`;
    return isPdf ? <iframe src={`${fullUrl}#toolbar=0`} className="w-full h-[600px] border-none" title="Document Preview" /> : <img src={fullUrl} alt="Preview" className="max-w-full max-h-[800px] object-contain" />;
}
