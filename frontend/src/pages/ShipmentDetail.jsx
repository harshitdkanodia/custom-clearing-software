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
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import ShipmentStatusBadge from '@/components/ShipmentStatusBadge';
import {
    ArrowLeft, Ship, Container, FileText, Loader2, Upload, CheckCircle,
    Truck, Receipt, ClipboardList, AlertTriangle, History, Clock, Plus, Trash2, FileCheck, Share2,
    IndianRupee, Mail, CheckCircle2, Paperclip, Pencil
} from 'lucide-react';
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

const CONTAINER_STATUSES = [
    { value: 'AWAITING_VESSEL', label: 'Awaiting Vessel' },
    { value: 'PORT_IN', label: 'Port In' },
    { value: 'PORT_OUT', label: 'Port Out' },
    { value: 'CFS_IN', label: 'CFS In' },
    { value: 'CFS_OUT_DELIVERED', label: 'CFS Out / Delivered' },
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
    const [doTypeFilter, setDoTypeFilter] = useState('LOADED');
    const [filingDocs, setFilingDocs] = useState([]);
    const [filingTypes, setFilingTypes] = useState([]);
    const [kycDocs, setKycDocs] = useState([]);
    const [kycTypes, setKycTypes] = useState([]);
    const [boe, setBoe] = useState(null);
    const [transports, setTransports] = useState([]);
    const [transportDialog, setTransportDialog] = useState(false);
    const [transportForm, setTransportForm] = useState({});
    const [transportSaving, setTransportSaving] = useState(false);
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [addOtherName, setAddOtherName] = useState('');
    const [addingOther, setAddingOther] = useState(false);
    const [doDetailsDialog, setDoDetailsDialog] = useState(null);
    const [doDetailsForm, setDoDetailsForm] = useState({});
    const [confirmDialog, setConfirmDialog] = useState(null); // { title, description, onConfirm }
    const [otherDocDialog, setOtherDocDialog] = useState(null); // 'FILING' | 'DO'
    const [customDocName, setCustomDocName] = useState('');
    const [editShipmentDialog, setEditShipmentDialog] = useState(false);
    const [editShipmentForm, setEditShipmentForm] = useState({});
    const [editShipmentSaving, setEditShipmentSaving] = useState(false);

    const canEdit = hasRole('ADMIN', 'OPERATION_STAFF');

    async function fetchShipment() {
        try {
            const res = await api.get(`/shipments/${id}`);
            setShipment(res.data.data);
            return res.data.data;
        } catch (err) {
            toast.error('Failed to load shipment');
            return null;
        } finally {
            setLoading(false);
        }
    }

    async function fetchDoDocs(type) {
        try {
            const dt = type || doTypeFilter;
            const res = await api.get(`/shipments/${id}/do-documents`, { params: { doType: dt } });
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
            const res = await api.get(`/shipments/${id}/activities`);
            setActivities(res.data.data);
        } catch (err) { console.error(err); }
        finally { setLoadingActivities(false); }
    }

    async function fetchKycDocs(customerId) {
        if (!customerId) return;
        try {
            const res = await api.get(`/customers/${customerId}/kyc-documents`);
            setKycDocs(res.data.data);
            setKycTypes(res.data.docTypes);
        } catch (err) { console.error(err); }
    }

    async function handleShareLink() {
        try {
            const res = await api.post(`/portal/generate/${id}`);
            const token = res.data.token;
            const url = `${window.location.origin}/portal/${token}`;
            await navigator.clipboard.writeText(url);
            toast.success('Portal link copied to clipboard');
            fetchShipment();
        } catch (err) {
            toast.error('Failed to generate share link');
        }
    }

    useEffect(() => {
        fetchShipment().then(s => {
            if (s?.customerId) fetchKycDocs(s.customerId);
        });
        fetchDoDocs();
        fetchFilingDocs();
        fetchBoe();
        fetchTransports();
    }, [id]);

    function openEditShipmentDialog() {
        setEditShipmentForm({
            shipmentType: shipment.shipmentType || 'IMPORT',
            shipmentSubType: shipment.shipmentSubType || 'HOME_CONSUMPTION',
            noOfCtn: shipment.noOfCtn || '',
            description: shipment.description || '',
            grossWeight: shipment.grossWeight || '',
            cfsName: shipment.cfsName || '',
            mblNo: shipment.mblNo || '',
            hblNo: shipment.hblNo || '',
            vesselNameVoyage: shipment.vesselNameVoyage || '',
            linerName: shipment.linerName || '',
            forwarderName: shipment.forwarderName || '',
            portOfLoading: shipment.portOfLoading || '',
            eta: shipment.eta ? shipment.eta.split('T')[0] : '',
            freeDaysShippingLine: shipment.freeDaysShippingLine || '',
            freeDaysCfs: shipment.freeDaysCfs || '',
            inwardDate: shipment.inwardDate ? shipment.inwardDate.split('T')[0] : '',
        });
        setEditShipmentDialog(true);
    }

    async function handleEditShipmentSubmit(e) {
        e.preventDefault();
        setEditShipmentSaving(true);
        try {
            await api.put(`/shipments/${id}`, editShipmentForm);
            toast.success('Shipment details updated');
            setEditShipmentDialog(false);
            fetchShipment();
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Update failed');
        } finally {
            setEditShipmentSaving(false);
        }
    }

    async function handleIgmUpdate() {
        setUpdating(true);
        try {
            await api.patch(`/shipments/${id}/igm-status`, updateForm);
            toast.success('IGM details updated');
            fetchShipment();
            setUpdateDialog(null);
        } catch (err) { toast.error('Update failed'); }
        finally { setUpdating(false); }
    }

    async function handleContainerUpdate() {
        setUpdating(true);
        try {
            await api.patch(`/shipments/${id}/containers/${updateForm.id}`, updateForm);
            toast.success('Container updated');
            fetchShipment();
            setUpdateDialog(null);
        } catch (err) { toast.error('Update failed'); }
        finally { setUpdating(false); }
    }

    async function handleBoeUpdate(data) {
        setUpdating(true);
        try {
            await api.patch(`/shipments/${id}/boe`, data);
            toast.success('BOE status updated');
            fetchBoe();
            setUpdateDialog(null);
        } catch (err) { toast.error('Update failed'); }
        finally { setUpdating(false); }
    }

    async function handleDoUpload(docType, file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post(`/shipments/${id}/do-documents/${docType}/upload?doType=${doTypeFilter}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('DO document uploaded');
            fetchDoDocs();
        } catch (err) { toast.error('Upload failed'); }
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

    async function handleDeleteDo(docId) {
        setConfirmDialog({
            title: 'Delete DO Document?',
            description: 'This will remove the uploaded file for this DO requirement.',
            onConfirm: async () => {
                try {
                    await api.delete(`/shipments/${id}/do-documents/${docId}`);
                    toast.success('Document deleted');
                    fetchDoDocs();
                } catch (err) { toast.error('Delete failed'); }
            }
        });
    }

    async function handleAddOtherFiling(name) {
        if (!name.trim()) return;
        setAddingOther(true);
        try {
            await api.post(`/shipments/${id}/filing-documents/add-other`, { customType: name });
            toast.success('Filing document added');
            fetchFilingDocs();
            setOtherDocDialog(null);
            setCustomDocName('');
        } catch (err) { toast.error('Add failed'); }
        finally { setAddingOther(false); }
    }

    async function handleAddOtherKyc(name) {
        if (!name.trim()) return;
        setAddingOther(true);
        try {
            await api.post(`/customers/${shipment.customerId}/kyc-documents/add-other`, { customType: name });
            toast.success('KYC document added');
            const res = await api.get(`/customers/${shipment.customerId}/kyc-documents`);
            setKycDocs(res.data.data);
            setOtherDocDialog(null);
            setCustomDocName('');
        } catch (err) { toast.error('Add failed'); }
        finally { setAddingOther(false); }
    }

    async function handleAddOtherTransport(transportId, name) {
        if (!name.trim()) return;
        setAddingOther(true);
        try {
            await api.post(`/shipments/transport/${transportId}/add-other`, { customType: name });
            toast.success('Document added');
            fetchShipment(); // Refresh all
            setOtherDocDialog(null);
            setCustomDocName('');
        } catch (err) { toast.error('Add failed'); }
        finally { setAddingOther(false); }
    }

    async function handleAddOtherDo(name) {
        if (!name.trim()) return;
        setAddingOther(true);
        try {
            await api.post(`/shipments/${id}/do-documents/add-other`, { customType: name, doType: doTypeFilter });
            toast.success('DO document added');
            fetchDoDocs();
            setOtherDocDialog(null);
            setCustomDocName('');
        } catch (err) { toast.error('Add failed'); }
        finally { setAddingOther(false); }
    }

    async function handleDeleteFiling(docId) {
        setConfirmDialog({
            title: 'Delete Filing Document?',
            description: 'This will remove the uploaded file from this filing requirement.',
            onConfirm: async () => {
                try {
                    await api.delete(`/shipments/${id}/filing-documents/${docId}`);
                    toast.success('Document deleted');
                    fetchFilingDocs();
                } catch (err) { toast.error('Delete failed'); }
            }
        });
    }

    async function handleBoeUpload(docType, file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post(`/shipments/${id}/boe/upload/${docType}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('BOE stage document uploaded');
            fetchBoe();
        } catch (err) { toast.error('Upload failed'); }
    }

    async function handleKycUpload(docType, file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post(`/customers/${shipment.customerId}/kyc-documents/${docType}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('KYC document uploaded');
            const res = await api.get(`/customers/${shipment.customerId}/kyc-documents`);
            setKycDocs(res.data.data);
        } catch (err) { toast.error('Upload failed'); }
    }

    async function handleKycDelete(docId) {
        setConfirmDialog({
            title: 'Delete KYC?',
            description: 'This will remove the custom KYC record.',
            onConfirm: async () => {
                try {
                    await api.delete(`/customers/${shipment.customerId}/kyc-documents/${docId}`);
                    toast.success('Document deleted');
                    const res = await api.get(`/customers/${shipment.customerId}/kyc-documents`);
                    setKycDocs(res.data.data);
                } catch (err) { toast.error('Delete failed'); }
            }
        });
    }

    async function handleDeleteBoeDoc(docType) {
        const fieldMap = {
            'BOE': 'boeFileUrl',
            'STAMP_DUTY': 'stampDutyFileUrl',
            'OOC': 'oocFileUrl',
            'GATEPASS_CUSTODIAN': 'gatepassCustodianUrl',
            'CFS_INVOICE': 'cfsInvoiceUrl',
        };
        try {
            await api.patch(`/shipments/${id}/boe`, { [fieldMap[docType]]: null });
            toast.success('Document deleted');
            fetchBoe();
        } catch (err) { toast.error('Delete failed'); }
    }

    async function handleDoDetailsUpdate(e) {
        e.preventDefault();
        setUpdating(true);
        try {
            await api.patch(`/shipments/${id}/do-documents/${doDetailsForm.id}/details`, doDetailsForm);
            toast.success('DO details updated');
            fetchDoDocs();
            setDoDetailsDialog(null);
        } catch (err) { toast.error('Update failed'); }
        finally { setUpdating(false); }
    }

    async function handleDoStatusChange(docType, status) {
        try {
            await api.patch(`/shipments/${id}/do-documents/${docType}/status`, { status, doType: doTypeFilter });
            toast.success('Status updated');
            fetchDoDocs();
        } catch (err) { toast.error('Update failed'); }
    }

    async function handleTransportUpload(transportId, docType, file, customType) {
        const formData = new FormData();
        formData.append('file', file);
        if (customType) formData.append('customType', customType);
        try {
            await api.post(`/shipments/${id}/transport/${transportId}/upload/${docType}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Transport document uploaded');
            fetchTransports();
        } catch (err) { toast.error('Upload failed'); }
    }

    async function handleDeleteTransport(transportId) {
        try {
            await api.delete(`/shipments/${id}/transport/${transportId}`);
            toast.success('Transport record deleted');
            fetchTransports();
        } catch (err) { toast.error('Delete failed'); }
    }

    async function handleTransportDocDelete(docId) {
        try {
            await api.delete(`/shipments/transport-docs/${docId}`);
            toast.success('Document deleted');
            fetchTransports();
        } catch (err) { toast.error('Delete failed'); }
    }

    async function handleAddOtherDoc(section) {
        if (!addOtherName.trim()) return;
        setAddingOther(true);
        try {
            if (section === 'do') {
                await api.post(`/shipments/${id}/do-documents/add-other`, { customType: addOtherName, doType: doTypeFilter });
                fetchDoDocs();
            } else if (section === 'filing') {
                await api.post(`/shipments/${id}/filing-documents/add-other`, { customType: addOtherName });
                fetchFilingDocs();
            } else if (section === 'BILLING') {
                await handleBillingExtraDocAdd(addOtherName);
            }
            setAddOtherName('');
        } catch (err) { toast.error('Failed to add document'); }
        finally { setAddingOther(false); }
    }

    async function handleTransportSubmit(e) {
        e.preventDefault();
        setTransportSaving(true);
        try {
            if (transportForm.id) {
                await api.put(`/shipments/${id}/transport/${transportForm.id}`, transportForm);
            } else {
                await api.post(`/shipments/${id}/transport`, transportForm);
            }
            toast.success('Transport details saved');
            setTransportDialog(false);
            fetchTransports();
        } catch (err) { toast.error('Save failed'); }
        finally { setTransportSaving(false); }
    }

    async function handleBillingSaveAmount(amount) {
        try {
            await api.patch(`/billing/${id}/bill-amount`, { billAmount: amount });
            toast.success('Bill amount saved');
            fetchShipment();
        } catch (err) { toast.error('Failed to save amount'); }
    }

    async function handleBillingUpload(docType, file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post(`/billing/${id}/upload/${docType}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Document uploaded');
            fetchShipment();
        } catch (err) { toast.error('Upload failed'); }
    }

    async function handleBillingDocDelete(field) {
        try {
            await api.delete(`/billing/${id}/delete/${field}`);
            toast.success('Document removed');
            fetchShipment();
        } catch (err) { toast.error('Delete failed'); }
    }

    async function handleBillingExtraDocAdd(customType) {
        try {
            await api.post(`/billing/${id}/add-other`, { customType });
            toast.success('Extra document slot added');
            setOtherDocDialog(null);
            setCustomDocName('');
            fetchShipment();
        } catch (err) { toast.error('Failed to add slot'); }
    }

    async function handleBillingExtraDocUpload(docId, file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post(`/billing/extra/${docId}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Document uploaded');
            fetchShipment();
        } catch (err) { toast.error('Upload failed'); }
    }

    async function handleBillingExtraDocDelete(docId) {
        try {
            await api.delete(`/billing/extra/${docId}`);
            toast.success('Document removed');
            fetchShipment();
        } catch (err) { toast.error('Delete failed'); }
    }

    async function handleBillingComplete() {
        try {
            await api.patch(`/billing/${id}/complete`);
            toast.success('Billing marked complete');
            fetchShipment();
        } catch (err) { toast.error('Failed to complete billing'); }
    }

    async function handleBillingSendEmail() {
        try {
            await api.post(`/billing/${id}/send-email`);
            toast.success('Bill email sent');
            fetchShipment();
        } catch (err) { toast.error('Failed to send email'); }
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

    const doCompletionPct = doDocs.length > 0 ? Math.round((doDocs.filter(d => d.status === 'SENT_FOR_SUBMISSION').length / Math.max(doDocs.filter(d => d.isMandatory).length, 1)) * 100) || 0 : 0;
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
                <div className="flex items-center gap-2">
                </div>
            </div>

            <Tabs defaultValue="step1" className="space-y-3">
                <div className="overflow-x-auto pb-1 scrollbar-hide">
                    <TabsList className="bg-gray-100/80 p-1 w-full border shadow-sm flex justify-start h-auto min-w-max">
                        <TabsTrigger value="basic" className="text-[11px] font-bold flex-1 md:flex-none py-2 px-4">Basic Info</TabsTrigger>
                        <TabsTrigger value="containers" className="text-[11px] font-bold flex-1 md:flex-none py-2 px-4">Containers ({shipment.containers?.length})</TabsTrigger>
                        <TabsTrigger value="step1" className="text-[11px] font-bold flex-1 md:flex-none py-2 px-4">Filing</TabsTrigger>
                        <TabsTrigger value="step2" className="text-[11px] font-bold flex-1 md:flex-none py-2 px-4">DO Docs</TabsTrigger>
                        <TabsTrigger value="step3" className="text-[11px] font-bold flex-1 md:flex-none py-2 px-4">BOE Status</TabsTrigger>
                        <TabsTrigger value="step4" className="text-[11px] font-bold flex-1 md:flex-none py-2 px-4">Checklist</TabsTrigger>
                        <TabsTrigger value="step6" className="text-[11px] font-bold flex-1 md:flex-none py-2 px-4">KYC Docs</TabsTrigger>
                        <TabsTrigger value="step7" className="text-[11px] font-bold flex-1 md:flex-none py-2 px-4">Transport</TabsTrigger>
                        <TabsTrigger value="step8" className="text-[11px] font-bold flex-1 md:flex-none py-2 px-4">Billing</TabsTrigger>
                        <TabsTrigger value="activity" className="text-[11px] font-bold flex-1 md:flex-none py-2 px-4">Activity Log</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="basic">
                    <Card>
                        <CardHeader className="pb-3 border-b flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2"><Ship className="h-4 w-4" /> Shipment Core Details</CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge variant="blue" className="px-3 py-1 font-black text-sm">{shipment.shipmentType} / {shipment.shipmentSubType?.replace(/_/g, ' ')}</Badge>
                                {canEdit && <Button variant="outline" size="sm" onClick={openEditShipmentDialog} className="gap-1.5 text-xs font-bold"><Pencil className="h-3.5 w-3.5" /> Edit</Button>}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-sm">
                                {(() => {
                                    const inward = shipment.inwardDate ? new Date(shipment.inwardDate) : null;
                                    const etaDate = shipment.eta ? new Date(shipment.eta) : null;
                                    const firstCfsIn = shipment.containers?.[0]?.cfsInDate ? new Date(shipment.containers[0].cfsInDate) : null;
                                    
                                    const shippingBaseDate = inward || etaDate;
                                    const shippingExpiry = shippingBaseDate && shipment.freeDaysShippingLine ? new Date(shippingBaseDate.getTime() + (shipment.freeDaysShippingLine * 24 * 60 * 60 * 1000)) : null;
                                    const shippingExpiryIsEstimate = !inward && !!etaDate;
                                    const cfsExpiry = firstCfsIn && shipment.freeDaysCfs ? new Date(firstCfsIn.getTime() + (shipment.freeDaysCfs * 24 * 60 * 60 * 1000)) : null;

                                    return [
                                        ['Job Number', shipment.onsJobNumber], ['Customer', shipment.customer?.customerName],
                                        ['Type', shipment.shipmentType], ['Sub Type', (shipment.shipmentSubType || 'HOME_CONSUMPTION').replace(/_/g, ' ')],
                                        ['Cartons', shipment.noOfCtn || '—'],
                                        ['Gross Weight', shipment.grossWeight ? `${shipment.grossWeight} kg` : '—'],
                                        ['Description', shipment.description || '—'], ['MBL No', shipment.mblNo || '—'],
                                        ['HBL No', shipment.hblNo || '—'], ['Vessel / Voyage', shipment.vesselNameVoyage || '—'],
                                        ['CFS Name', shipment.cfsName || '—'], ['Liner', shipment.linerName || '—'],
                                        ['Forwarder', shipment.forwarderName || '—'], ['Port of Loading', shipment.portOfLoading || '—'],
                                        ['ETA', shipment.eta ? new Date(shipment.eta).toLocaleDateString() : '—'],
                                        ['Free Days (Shipping)', `${shipment.freeDaysShippingLine || 0} days`],
                                        ['Shipping Line Expiry', shippingExpiry ? <span className={shippingExpiry < new Date() ? 'text-red-600 font-bold' : 'text-green-600'}>{shippingExpiry.toLocaleDateString()}{shippingExpiryIsEstimate ? ' (est.)' : ''}</span> : '—'],
                                        ['Free Days (CFS)', `${shipment.freeDaysCfs || 0} days`],
                                        ['CFS Expiry', cfsExpiry ? <span className={cfsExpiry < new Date() ? 'text-red-600 font-bold' : 'text-green-600'}>{cfsExpiry.toLocaleDateString()}</span> : '—'],
                                        ['IGM Details', shipment.igmNumber ? `IGM: ${shipment.igmNumber} (Item ${shipment.igmItemNo || '—'})` : 'Not Filed'],
                                        ['Inward Date', shipment.inwardDate ? new Date(shipment.inwardDate).toLocaleDateString() : '—'],
                                    ].map(([label, value]) => (
                                        <div key={label}>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
                                            <div className="font-semibold mt-0.5">{value}</div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </CardContent>
                        {canEdit && (
                            <div className="px-4 py-3 border-t bg-gray-50/50 flex justify-end">
                                <Button variant="outline" size="sm" onClick={() => { setUpdateDialog({ type: 'igm' }); setUpdateForm({ igmStatus: shipment.igmStatus || 'IGM_NOT_FILED', igmNumber: shipment.igmNumber || '', igmDate: shipment.igmDate ? shipment.igmDate.split('T')[0] : '', igmItemNo: shipment.igmItemNo || '', inwardDate: shipment.inwardDate ? shipment.inwardDate.split('T')[0] : '' }); }} className="gap-1.5 text-xs font-bold">
                                    <Pencil className="h-3.5 w-3.5" /> Update IGM Details
                                </Button>
                            </div>
                        )}
                    </Card>
                </TabsContent>

                <TabsContent value="containers">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Container Number</TableHead>
                                        <TableHead>Type/Size</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>CFS IN</TableHead>
                                        <TableHead>CFS OUT</TableHead>
                                        {canEdit && <TableHead className="w-16"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shipment.containers?.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-mono font-bold">{c.containerNumber}</TableCell>
                                            <TableCell className="text-xs">{c.containerSize} {c.containerType}</TableCell>
                                            <TableCell>{containerStatusBadge(c.status)}</TableCell>
                                            <TableCell className="text-xs">{c.cfsInDate ? new Date(c.cfsInDate).toLocaleDateString() : '—'}</TableCell>
                                            <TableCell className="text-xs">{c.cfsOutDate ? new Date(c.cfsOutDate).toLocaleDateString() : '—'}</TableCell>
                                            {canEdit && (
                                                <TableCell>
                                                    <Button variant="ghost" size="xs" onClick={() => { setUpdateDialog({ type: 'container' }); setUpdateForm(c); }}>Update</Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="step1">
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Step 1: Filing Documents</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[10px] uppercase font-bold text-blue-600">{shipment.shipmentType}</Badge>
                                        <Badge variant="outline" className="text-[10px] uppercase">{(shipment?.shipmentSubType || 'HOME_CONSUMPTION').replace(/_/g, ' ')}</Badge>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Filing Progress</p>
                                    <Badge variant={filingCompletionPct === 100 ? 'success' : 'warning'}>{filingCompletionPct}%</Badge>
                                </div>
                            </div>
                            <Progress value={filingCompletionPct} className="h-1.5 mt-3" />
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-4 bg-blue-50/50 border-b">
                                <p className="text-xs text-blue-700 font-medium">Please upload all mandatory documents for <span className="font-bold">{(shipment?.shipmentSubType || 'HOME_CONSUMPTION').replace(/_/g, ' ')}</span> processing as per Step 1 of the specification.</p>
                            </div>
                            {filingDocs.map(doc => (
                                <ShipmentDocumentRow 
                                    key={doc.id} 
                                    doc={doc} 
                                    typeInfo={filingTypes.find(t => t.type === doc.documentType)} 
                                    canEdit={canEdit} 
                                    onUpload={(type, file) => {
                                        setConfirmDialog({
                                            title: 'Upload Document?',
                                            description: `Do you want to upload this file as ${type.replace(/_/g, ' ')}?`,
                                            onConfirm: () => handleFilingUpload(type, file)
                                        });
                                    }} 
                                    onDelete={() => handleDeleteFiling(doc.id)}
                                    statusOptions={['PENDING', 'UPLOADED']} 
                                />
                            ))}
                            {canEdit && (
                                <div className="p-4 flex justify-center border-t bg-gray-50/50">
                                    <Button variant="outline" size="sm" onClick={() => setOtherDocDialog('FILING')} className="gap-2 font-bold text-blue-600 border-blue-200 hover:bg-blue-50">
                                        <Plus className="h-4 w-4" /> Add Other Document
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="step2">
                    <Card>
                        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Step 2: DO Documents</CardTitle>
                                <Select value={doTypeFilter} onValueChange={v => { setDoTypeFilter(v); fetchDoDocs(v); }}>
                                    <SelectTrigger className="h-8 w-32 text-xs font-bold bg-blue-50 border-blue-200"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="LOADED">LOADED</SelectItem><SelectItem value="DESTUFF">DESTUFF</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <Badge variant={doCompletionPct === 100 ? 'success' : 'warning'}>{doCompletionPct}% Complete</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            {doDocs.map(doc => (
                                <ShipmentDocumentRow 
                                    key={doc.id} 
                                    doc={doc} 
                                    typeInfo={doTypes.find(t => t.type === doc.documentType)} 
                                    canEdit={canEdit} 
                                    onUpload={(type, file) => {
                                        setConfirmDialog({
                                            title: 'Upload DO Document?',
                                            description: `Confirm upload for ${type.replace(/_/g, ' ')} (${doTypeFilter})?`,
                                            onConfirm: () => handleDoUpload(type, file)
                                        });
                                    }} 
                                    onDelete={() => handleDeleteDo(doc.id)}
                                    onStatusChange={handleDoStatusChange} 
                                    onEditDetails={() => {
                                        setDoDetailsForm({
                                            ...doc,
                                            invoiceDate: doc.invoiceDate?.split?.('T')?.[0] || '',
                                            receivedDate: doc.receivedDate?.split?.('T')?.[0] || '',
                                            validityDate: doc.validityDate?.split?.('T')?.[0] || '',
                                            paymentDate: doc.paymentDate?.split?.('T')?.[0] || '',
                                            charges: doc.charges || '',
                                            bankName: doc.bankName || '',
                                            bankBranch: doc.bankBranch || '',
                                            utrNumber: doc.utrNumber || '',
                                            paymentStatus: doc.paymentStatus || 'PENDING'
                                        });
                                        setDoDetailsDialog(doc);
                                    }}
                                    statusOptions={['PENDING', 'SENT_FOR_SUBMISSION', 'RECEIVED']} 
                                />
                            ))}
                            {canEdit && (
                                <div className="p-4 flex justify-center border-t bg-gray-50/50">
                                    <Button variant="outline" size="sm" onClick={() => setOtherDocDialog('DO')} className="gap-2 font-bold text-blue-600 border-blue-200 hover:bg-blue-50">
                                        <Plus className="h-4 w-4" /> Add Other Document
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="step3">
                    <Card>
                        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" /> Step 3: BOE Milestones</CardTitle>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-500">BOE No: <span className="font-mono font-bold text-gray-900">{boe?.boeNumber || '—'}</span></p>
                                {canEdit && <Button variant="outline" size="xs" onClick={() => { setUpdateDialog({ type: 'boe', stage: 'BASIC' }); setUpdateForm(boe || {}); }}>Edit BOE Info</Button>}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {!boe ? <Skeleton className="h-48 w-full" /> : (
                                <>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: 'BOE Filed', stage: 'BASIC', status: boe.boeNumber ? 'DONE' : 'PENDING', date: boe.boeFiledDate, meta: boe.boeNumber },
                                            { label: 'Assessment', stage: 'ASSESSMENT', status: boe.assessmentDoneDate ? 'DONE' : 'PENDING', date: boe.assessmentDoneDate },
                                            { label: 'Examination', stage: 'EXAMINATION', status: boe.examinationType || 'PENDING', date: boe.examinationDate, meta: boe.examinationType === 'RMS' ? 'RMS' : (boe.examinationPercentage ? `${boe.examinationPercentage}%` : null) },
                                            { label: 'Duty Payment', stage: 'DUTY', status: boe.dutyPaymentDate ? 'DONE' : 'PENDING', date: boe.dutyPaymentDate },
                                            { label: 'Stamp Duty', stage: 'STAMP_DUTY', status: boe.stampDutyDate ? 'DONE' : 'PENDING', date: boe.stampDutyDate, meta: boe.stampDutyAmount ? `₹${boe.stampDutyAmount}` : null },
                                            { label: 'OOC', stage: 'OOC', status: boe.oocDate ? 'DONE' : 'PENDING', date: boe.oocDate },
                                        ].map((s, idx) => (
                                            <div key={`${s.label}-${idx}`} className="bg-gray-50 p-3 rounded-lg border flex flex-col justify-between">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{s.label}</p>
                                                    {canEdit && <Button variant="ghost" size="xs" onClick={() => { setUpdateDialog({ type: 'boe', stage: s.stage }); setUpdateForm({ ...boe, [s.stage.toLowerCase() + 'Date']: boe[s.stage.toLowerCase() + 'Date']?.split?.('T')?.[0] }); }}>Edit</Button>}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <Badge variant={s.status === 'DONE' ? 'success' : 'outline'} className="text-[9px] w-fit">
                                                            {s.status?.replace(/_/g, ' ')}
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
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Cargo Delivery</p>
                                                <p className="text-xs text-indigo-600">{boe.deliveryDate ? `DELIVERED · ${new Date(boe.deliveryDate).toLocaleDateString()}` : 'Pending'}</p>
                                            </div>
                                        </div>
                                        {canEdit && <Button variant="outline" size="sm" onClick={() => { setUpdateDialog({ type: 'boe', stage: 'DELIVERY' }); setUpdateForm({ deliveryStatus: boe.deliveryStatus || '', deliveryDate: boe.deliveryDate?.split?.('T')?.[0] }); }}>Update</Button>}
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Stage Documents</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {[
                                                { label: 'BOE Copy', type: 'BOE', url: boe.boeFileUrl, enabled: !!boe.assessmentDoneDate },
                                                { label: 'OOC Copy', type: 'OOC', url: boe.oocFileUrl, enabled: !!boe.oocDate },
                                                { label: 'Stamp Duty Copy', type: 'STAMP_DUTY', url: boe.stampDutyFileUrl, enabled: !!boe.stampDutyDate },
                                                { label: 'Custodian Copy', type: 'GATEPASS_CUSTODIAN', url: boe.gatepassCustodianUrl, enabled: !!boe.oocDate },
                                                { label: 'CFS Invoice', type: 'CFS_INVOICE', url: boe.cfsInvoiceUrl, enabled: !!boe.deliveryDate },
                                            ].map((d) => (
                                                <div key={d.type} className={`flex items-center justify-between p-2 rounded-lg border bg-white shadow-sm transition-opacity ${!d.enabled && !d.url ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <div className={`p-1.5 rounded ${d.url ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                                                            <FileText className="h-4 w-4" />
                                                        </div>
                                                        <span className="text-[11px] font-bold truncate">{d.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {d.url ? (
                                                            <div className="flex items-center gap-1">
                                                                 <Button variant="ghost" size="xs" onClick={() => window.open(d.url.startsWith('http') ? d.url : `${import.meta.env.VITE_BASE_URL || ''}${d.url}`, '_blank')} className="h-7 px-2 text-[10px] text-blue-600 font-bold">View</Button>
                                                                 {canEdit && (
                                                                     <>
                                                                         <label className="cursor-pointer text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors" title="Update / Re-upload">
                                                                             <input type="file" className="hidden" onChange={(e) => {
                                                                                 const file = e.target.files[0];
                                                                                 if (file) handleBoeUpload(d.type, file);
                                                                             }} />
                                                                             <Upload className="h-3.5 w-3.5" />
                                                                         </label>
                                                                         <Button variant="ghost" size="xs" onClick={() => {
                                                                             setConfirmDialog({
                                                                                 title: `Delete ${d.label}?`,
                                                                                 description: 'This will remove the file from the BOE record.',
                                                                                 onConfirm: () => handleDeleteBoeDoc(d.type)
                                                                             });
                                                                         }} className="h-7 px-1 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button>
                                                                     </>
                                                                 )}
                                                            </div>
                                                        ) : (canEdit && d.enabled) && (
                                                            <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors">
                                                                <input type="file" className="hidden" onChange={async (e) => {
                                                                    const file = e.target.files[0];
                                                                    if (file) {
                                                                        setConfirmDialog({
                                                                            title: `Upload ${d.label}?`,
                                                                            description: 'Confirm file selection for this BOE stage.',
                                                                            onConfirm: () => handleBoeUpload(d.type, file)
                                                                        });
                                                                    }
                                                                }} />
                                                                Upload
                                                            </label>
                                                        )}
                                                        {(!d.url && !d.enabled) && (
                                                            <Badge variant="outline" className="text-[8px] opacity-60">LOCKED</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="step4">
                    <Card>
                        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Step 4: Delivery Document Checklist</CardTitle>
                            {(() => {
                                const checklist = [
                                    boe?.boeFileUrl,
                                    filingDocs.find(d => d.documentType === 'COMMERCIAL_INVOICE')?.fileUrl,
                                    filingDocs.find(d => d.documentType === 'PACKING_LIST')?.fileUrl,
                                    filingDocs.find(d => ['HOUSE_BL', 'MASTER_BL'].includes(d.documentType))?.fileUrl,
                                    boe?.stampDutyFileUrl,
                                    doDocs.find(d => d.documentType === 'DELIVERY_ORDER')?.fileUrl,
                                    doDocs.find(d => d.documentType === 'EMPTY_LETTER')?.fileUrl,
                                    boe?.oocFileUrl,
                                    boe?.gatepassCustodianUrl,
                                ];
                                const allReady = checklist.every(url => !!url);
                                return allReady ? (
                                    <Badge className="bg-green-600 text-white font-black animate-pulse py-1 px-3">READY FOR DELIVERY</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-gray-400">DOCUMENTS PENDING</Badge>
                                );
                            })()}
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead className="w-10 text-center">#</TableHead>
                                            <TableHead>Document Name</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[
                                            { name: 'BOE', url: boe?.boeFileUrl },
                                            { name: 'Invoice', url: filingDocs.find(d => d.documentType === 'COMMERCIAL_INVOICE')?.fileUrl },
                                            { name: 'Packing List', url: filingDocs.find(d => d.documentType === 'PACKING_LIST')?.fileUrl },
                                            { name: 'Bill of Lading', url: filingDocs.find(d => ['HOUSE_BL', 'MASTER_BL'].includes(d.documentType))?.fileUrl },
                                            { name: 'Stamp Duty', url: boe?.stampDutyFileUrl },
                                            { name: 'Delivery Order', url: doDocs.find(d => d.documentType === 'DELIVERY_ORDER')?.fileUrl },
                                            { name: 'Empty Letter', url: doDocs.find(d => d.documentType === 'EMPTY_LETTER')?.fileUrl },
                                            { name: 'OOC Copy', url: boe?.oocFileUrl },
                                            { name: 'Custodian Copy', url: boe?.gatepassCustodianUrl },
                                        ].map((item, idx) => (
                                            <TableRow key={item.name}>
                                                <TableCell className="text-center font-mono text-xs text-gray-400">{idx + 1}</TableCell>
                                                <TableCell className="font-bold text-sm">{item.name}</TableCell>
                                                <TableCell className="text-right">
                                                    {item.url ? (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Badge variant="success" className="text-[9px] px-1 h-4">READY</Badge>
                                                            <Button variant="ghost" size="xs" onClick={() => window.open(item.url.startsWith('http') ? item.url : `${import.meta.env.VITE_BASE_URL || ''}${item.url}`, '_blank')} className="h-6 w-6 p-0 text-blue-600"><FileText className="h-3.5 w-3.5" /></Button>
                                                        </div>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[9px] px-1 h-4 text-gray-400">PENDING</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="step6">
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-base flex items-center gap-2"><FileCheck className="h-4 w-4" /> Step 6: KYC Documents</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {kycDocs.map(doc => (
                                <ShipmentDocumentRow 
                                    key={doc.id} 
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
                                    onDelete={doc.documentType === 'OTHER' ? () => {
                                        setConfirmDialog({
                                            title: 'Delete KYC?',
                                            description: 'This will remove the custom KYC record.',
                                            onConfirm: () => handleKycDelete(doc.id)
                                        });
                                    } : null}
                                    statusOptions={['PENDING', 'UPLOADED']} 
                                />
                            ))}
                            {canEdit && (
                                <div className="p-4 flex justify-center border-t bg-gray-50/50">
                                    <Button variant="outline" size="sm" onClick={() => setOtherDocDialog('KYC')} className="gap-2 font-bold text-blue-600 border-blue-200 hover:bg-blue-50">
                                        <Plus className="h-4 w-4" /> Add Other Document
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="step7">
                    <Card>
                        <CardHeader className="pb-3 border-b flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Step 7: Transport Details</CardTitle>
                            {canEdit && <Button size="sm" onClick={() => { setTransportForm({}); setTransportDialog(true); }} className="h-8 gap-1"><Plus className="h-3 w-3" /> Add Transporter</Button>}
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {transports.length === 0 ? <p className="text-center py-8 text-gray-400">No transport records added</p> : transports.map(t => (
                                <div key={t.id} className="p-4 rounded-xl border bg-gray-50 flex items-start justify-between">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2"><p className="font-bold text-gray-900">{t.transporterName}</p><Badge variant="secondary" className="text-[9px]">{t.vehicleNumber}</Badge></div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] text-gray-500 font-medium">
                                            <p>Driver: <span className="text-gray-900">{t.driverMobile || '—'}</span></p>
                                            <p>Weight: <span className="text-gray-900">{t.grossWeight ? `${t.grossWeight} kg` : '—'}</span></p>
                                            <p>From: <span className="text-gray-900">{t.transportFrom || '—'}</span></p>
                                            <p>To: <span className="text-gray-900">{t.transportTo || '—'}</span></p>
                                            <p>Rate: <span className="text-gray-900">₹{t.transportRate ? parseFloat(t.transportRate).toLocaleString('en-IN') : '—'}</span></p>
                                            <p>Charges: <span className="text-gray-900 font-bold">₹{t.transportCharges ? parseFloat(t.transportCharges).toLocaleString('en-IN') : '—'}</span></p>
                                            <p>Empty/Unloading: <span className="text-gray-900">₹{t.emptyUnloadingCharges ? parseFloat(t.emptyUnloadingCharges).toLocaleString('en-IN') : '—'}</span></p>
                                            <p>Union: <span className="text-gray-900">₹{t.unionCharges ? parseFloat(t.unionCharges).toLocaleString('en-IN') : '—'}</span></p>
                                            <p>DO Valid Till: <span className="text-gray-900">{t.doValidTill ? new Date(t.doValidTill).toLocaleDateString() : '—'}</span></p>
                                        </div>
                                        
                                        {/* Transport Documents Section */}
                                        <div className="mt-4 pt-3 border-t">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Transport Documents</p>
                                                {canEdit && (
                                                    <Button variant="ghost" size="xs" className="h-5 text-[9px] text-blue-600 font-bold hover:bg-blue-50 px-2" onClick={() => {
                                                        setOtherDocDialog('TRANSPORT');
                                                        updateForm.currentTransportId = t.id;
                                                    }}>+ Add Other</Button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {[
                                                    { label: 'Transport Bill', type: 'TRANSPORT_BILL' },
                                                    { label: 'Empty Unloading', type: 'EMPTY_UNLOADING' },
                                                    ...(t.transportDocs?.filter(td => td.documentType === 'OTHER') || []).map(td => ({
                                                        label: td.customType,
                                                        type: 'OTHER',
                                                        id: td.id,
                                                        fileUrl: td.fileUrl
                                                    }))
                                                ].map(d => {
                                                    const doc = d.id ? d : t.transportDocs?.find(td => td.documentType === d.type);
                                                    return (
                                                        <div key={d.id || d.type} className="flex items-center justify-between p-2 rounded bg-white border shadow-sm text-[10px]">
                                                            <div className="flex items-center gap-2 pr-2 truncate">
                                                                <div className={`p-1 rounded ${doc?.fileUrl ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                                                                    <FileText className="h-3 w-3" />
                                                                </div>
                                                                <span className="font-bold truncate" title={d.label}>{d.label}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {doc?.fileUrl ? (
                                                                    <>
                                                                        <Button variant="ghost" size="xs" className="h-6 px-2 text-blue-600 font-bold hover:bg-blue-50" onClick={() => window.open(doc.fileUrl.startsWith('http') ? doc.fileUrl : `${import.meta.env.VITE_BASE_URL || ''}${doc.fileUrl}`, '_blank')}>View</Button>
                                                                        {canEdit && (
                                                                            <Button variant="ghost" size="xs" className="h-6 w-6 p-0 text-red-500 hover:bg-red-50" onClick={() => {
                                                                                setConfirmDialog({
                                                                                    title: 'Delete Document?',
                                                                                    description: `Remove ${d.label}?`,
                                                                                    onConfirm: () => handleTransportDocDelete(doc.id)
                                                                                });
                                                                            }}><Trash2 className="h-3 w-3" /></Button>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    canEdit && (
                                                                        <label className="cursor-pointer bg-blue-600 text-white px-2 py-1 rounded text-[9px] font-black uppercase shadow-sm hover:bg-blue-700 transition-colors">
                                                                            <input type="file" className="hidden" onChange={e => {
                                                                                const file = e.target.files[0];
                                                                                if (file) {
                                                                                    setConfirmDialog({
                                                                                        title: 'Upload Transport Doc?',
                                                                                        description: `Confirm upload for ${d.label}?`,
                                                                                        onConfirm: () => handleTransportUpload(t.id, d.type, file)
                                                                                    });
                                                                                }
                                                                            }} />
                                                                            Upload
                                                                        </label>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {canEdit && (
                                                    <Button variant="ghost" size="xs" onClick={() => {
                                                        setUpdateForm({ ...updateForm, currentTransportId: t.id });
                                                        setOtherDocDialog('TRANSPORT');
                                                    }} className="h-7 border border-dashed border-gray-300 text-[9px] font-bold text-gray-500 hover:text-blue-600 hover:border-blue-300">
                                                        + Add Other
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {canEdit && (
                                        <div className="flex flex-col gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => { setTransportForm(t); setTransportDialog(true); }}>Edit</Button>
                                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
                                                setConfirmDialog({
                                                    title: 'Delete Transport Record?',
                                                    description: 'This will permanently remove this transport entry.',
                                                    onConfirm: () => handleDeleteTransport(t.id)
                                                });
                                            }}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="step8">
                    <Card>
                        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Step 8: Billing Details</CardTitle>
                            <div className="flex gap-2 items-center">
                                <Button variant="outline" size="sm" onClick={handleBillingSendEmail} className="h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 px-3">
                                    <Mail className="h-3.5 w-3.5 mr-1.5" /> Send Bill Email
                                </Button>
                                {!shipment.billing?.isComplete && (
                                    <Button size="sm" onClick={handleBillingComplete} className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white shadow-sm px-3 font-bold">
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Complete Billing
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-6">
                            {/* Bill Amount Section */}
                            <div className="bg-gray-50 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-end gap-4">
                                <div className="flex-1 space-y-1.5">
                                    <Label className="text-[10px] font-black text-gray-400 uppercase">Total Bill Amount (₹)</Label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input 
                                            type="number" 
                                            defaultValue={shipment.billing?.billAmount || ''} 
                                            onBlur={(e) => handleBillingSaveAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="pl-9 h-10 font-bold text-lg"
                                        />
                                    </div>
                                </div>
                                <div className="sm:w-1/3 space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Billing Date</p>
                                    <p className="text-sm font-medium">{shipment.billing?.billDate ? new Date(shipment.billing.billDate).toLocaleDateString() : 'Pending'}</p>
                                </div>
                            </div>

                            {/* Billing Documents */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Standard Billing Documents</p>
                                    <span className="text-[10px] text-gray-500 italic">Auto-fetched from BOE status where applicable</span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        { label: 'Final Bill', field: 'finalBillUrl', type: 'FINAL_BILL' },
                                        { label: 'BOE Copy', field: 'boeDocUrl', type: 'BOE_DOC' },
                                        { label: 'OOC Copy', field: 'oocDocUrl', type: 'OOC_DOC' },
                                        { label: 'Stamp Duty', field: 'stampDutyUrl', type: 'STAMP_DUTY' },
                                        { label: 'CFS Charges', field: 'cfsChargesUrl', type: 'CFS_CHARGES' },
                                    ].map(doc => {
                                        const url = shipment.billing?.[doc.field];
                                        return (
                                            <div key={doc.field} className="flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm transition-hover hover:border-blue-200">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${url ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-700">{doc.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {url ? (
                                                        <>
                                                            <Button variant="ghost" size="xs" onClick={() => window.open(url.startsWith('http') ? url : `${import.meta.env.VITE_BASE_URL || ''}${url}`, '_blank')} className="h-8 px-3 text-blue-600 font-bold hover:bg-blue-50">View</Button>
                                                            {canEdit && (
                                                                <Button variant="ghost" size="xs" onClick={() => {
                                                                    setConfirmDialog({
                                                                        title: `Delete ${doc.label}?`,
                                                                        description: 'This will remove the file reference.',
                                                                        onConfirm: () => handleBillingDocDelete(doc.field)
                                                                    });
                                                                }} className="h-8 px-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        canEdit && (
                                                            <label className="cursor-pointer bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-sm hover:bg-blue-700 transition-colors">
                                                                <input type="file" className="hidden" onChange={e => {
                                                                    const file = e.target.files[0];
                                                                    if (file) handleBillingUpload(doc.type, file);
                                                                }} />
                                                                UPLOAD
                                                            </label>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Extra Documents */}
                            <div className="space-y-3 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Extra Other Documents</p>
                                    {canEdit && (
                                        <Button variant="outline" size="sm" onClick={() => setOtherDocDialog('BILLING')} className="h-8 text-[10px] font-bold border-dashed px-3">
                                            + ADD EXTRA DOCUMENT
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(shipment.billing?.documents || []).map(doc => (
                                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${doc.fileUrl ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'}`}>
                                                    <Paperclip className="h-4 w-4" />
                                                </div>
                                                <span className="text-sm font-bold text-gray-700">{doc.customType}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {doc.fileUrl ? (
                                                    <>
                                                        <Button variant="ghost" size="xs" onClick={() => window.open(doc.fileUrl.startsWith('http') ? doc.fileUrl : `${import.meta.env.VITE_BASE_URL || ''}${doc.fileUrl}`, '_blank')} className="h-8 px-3 text-blue-600 font-bold hover:bg-blue-50">View</Button>
                                                        {canEdit && (
                                                            <Button variant="ghost" size="xs" onClick={() => {
                                                                setConfirmDialog({
                                                                    title: 'Delete Document?',
                                                                    description: `Remove ${doc.customType}?`,
                                                                    onConfirm: () => handleBillingExtraDocDelete(doc.id)
                                                                });
                                                            }} className="h-8 px-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                                                        )}
                                                    </>
                                                ) : (
                                                    canEdit && (
                                                        <label className="cursor-pointer bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-sm hover:bg-blue-700 transition-colors">
                                                            <input type="file" className="hidden" onChange={e => {
                                                                const file = e.target.files[0];
                                                                if (file) handleBillingExtraDocUpload(doc.id, file);
                                                            }} />
                                                            UPLOAD
                                                        </label>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="activity">
                    <Card>
                        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Activity Log</CardTitle>
                            <Button variant="outline" size="xs" onClick={fetchActivities} disabled={loadingActivities}>Refresh</Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingActivities ? <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></div> : (
                                <div className="divide-y max-h-[600px] overflow-y-auto">
                                    {activities.length === 0 ? <p className="p-8 text-center text-gray-400">No activity logged yet</p> : activities.map(a => (
                                        <div key={a.id} className="p-3 text-xs">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{a.action}</span>
                                                <span className="text-gray-400 font-mono">{new Date(a.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="text-gray-700 font-medium">{a.details}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">By: {a.user?.name || 'System'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Common Update Dialog */}
            <Dialog open={!!updateDialog} onOpenChange={() => setUpdateDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Update {updateDialog?.type?.toUpperCase()}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        {updateDialog?.type === 'container' && (
                            <>
                                <div className="space-y-2"><Label>Container Number</Label><Input value={updateForm.containerNumber || ''} disabled /></div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={updateForm.status} onValueChange={v => setUpdateForm({ ...updateForm, status: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{CONTAINER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>CFS IN Date</Label><Input type="date" value={updateForm.cfsInDate?.split?.('T')?.[0] || ''} onChange={e => setUpdateForm({ ...updateForm, cfsInDate: e.target.value })} /></div>
                                <div className="space-y-2"><Label>CFS OUT Date</Label><Input type="date" value={updateForm.cfsOutDate?.split?.('T')?.[0] || ''} onChange={e => setUpdateForm({ ...updateForm, cfsOutDate: e.target.value })} /></div>
                            </>
                        )}
                        {updateDialog?.type === 'igm' && (
                            <>
                                <div className="space-y-2">
                                    <Label>IGM Status</Label>
                                    <Select value={updateForm.igmStatus || 'IGM_NOT_FILED'} onValueChange={v => setUpdateForm({ ...updateForm, igmStatus: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="IGM_NOT_FILED">Not Filed</SelectItem>
                                            <SelectItem value="AWAITING_VESSEL">Awaiting Vessel</SelectItem>
                                            <SelectItem value="VESSEL_ARRIVED">Vessel Arrived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>IGM Number</Label><Input value={updateForm.igmNumber || ''} onChange={e => setUpdateForm({ ...updateForm, igmNumber: e.target.value })} placeholder="IGM Number" /></div>
                                <div className="space-y-2"><Label>IGM Date</Label><Input type="date" value={updateForm.igmDate || ''} onChange={e => setUpdateForm({ ...updateForm, igmDate: e.target.value })} /></div>
                                <div className="space-y-2"><Label>IGM Item No</Label><Input value={updateForm.igmItemNo || ''} onChange={e => setUpdateForm({ ...updateForm, igmItemNo: e.target.value })} placeholder="Item Number" /></div>
                                <div className="space-y-2"><Label>Inward Date</Label><Input type="date" value={updateForm.inwardDate || ''} onChange={e => setUpdateForm({ ...updateForm, inwardDate: e.target.value })} /></div>
                            </>
                        )}
                        {updateDialog?.type === 'boe' && (
                            <>
                                {updateDialog.stage === 'BASIC' && (
                                    <>
                                        <div className="space-y-2"><Label>BOE Number</Label><Input value={updateForm.boeNumber || ''} onChange={e => setUpdateForm({ ...updateForm, boeNumber: e.target.value })} maxLength={7} /></div>
                                        <div className="space-y-2"><Label>BOE Date</Label><Input type="date" value={updateForm.boeFiledDate?.split?.('T')?.[0] || ''} onChange={e => setUpdateForm({ ...updateForm, boeFiledDate: e.target.value })} /></div>
                                    </>
                                )}
                                {updateDialog.stage === 'ASSESSMENT' && (
                                    <>
                                        <div className="space-y-2"><Label>Assessment Done Date</Label><Input type="date" value={updateForm.assessmentDoneDate || ''} onChange={e => setUpdateForm({ ...updateForm, assessmentDoneDate: e.target.value })} /></div>
                                    </>
                                )}
                                {updateDialog.stage === 'EXAMINATION' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Delivery / Exam Type</Label>
                                            <Select value={updateForm.examinationType || 'RMS'} onValueChange={v => setUpdateForm({ ...updateForm, examinationType: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="RMS">RMS (Skip Exam)</SelectItem>
                                                    <SelectItem value="EXAMIN">EXAMIN (Required)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {updateForm.examinationType === 'EXAMIN' && (
                                            <>
                                                <div className="space-y-2"><Label>Percentage (%)</Label><Input type="number" value={updateForm.examinationPercentage || ''} onChange={e => setUpdateForm({ ...updateForm, examinationPercentage: e.target.value })} /></div>
                                                <div className="space-y-2"><Label>Examination Date</Label><Input type="date" value={updateForm.examinationDate || ''} onChange={e => setUpdateForm({ ...updateForm, examinationDate: e.target.value })} /></div>
                                            </>
                                        )}
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
                                        <div className="space-y-2"><Label>OOC Status</Label><Badge>FINAL</Badge></div>
                                        <div className="space-y-2"><Label>OOC Date</Label><Input type="date" value={updateForm.oocDate || ''} onChange={e => setUpdateForm({ ...updateForm, oocDate: e.target.value })} /></div>
                                    </>
                                )}
                                {updateDialog.stage === 'STAMP_DUTY' && (
                                    <>
                                        <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" value={updateForm.stampDutyAmount || ''} onChange={e => setUpdateForm({ ...updateForm, stampDutyAmount: e.target.value })} /></div>
                                        <div className="space-y-2"><Label>Date</Label><Input type="date" value={updateForm.stampDutyDate || ''} onChange={e => setUpdateForm({ ...updateForm, stampDutyDate: e.target.value })} /></div>
                                    </>
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
                            if (updateDialog.type === 'container') handleContainerUpdate();
                            else if (updateDialog.type === 'boe') handleBoeUpdate(updateForm);
                            else if (updateDialog.type === 'igm') handleIgmUpdate();
                        }} disabled={updating}>{updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* DO Details Dialog */}
            <Dialog open={!!doDetailsDialog} onOpenChange={() => setDoDetailsDialog(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Edit DO Details: {doDetailsDialog?.documentType?.replace(/_/g, ' ')}</DialogTitle></DialogHeader>
                    <form onSubmit={handleDoDetailsUpdate} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Charges (₹)</Label><Input type="number" value={doDetailsForm.charges} onChange={e => setDoDetailsForm({ ...doDetailsForm, charges: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Invoice Date</Label><Input type="date" value={doDetailsForm.invoiceDate} onChange={e => setDoDetailsForm({ ...doDetailsForm, invoiceDate: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Received Date</Label><Input type="date" value={doDetailsForm.receivedDate} onChange={e => setDoDetailsForm({ ...doDetailsForm, receivedDate: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Validity Date</Label><Input type="date" value={doDetailsForm.validityDate} onChange={e => setDoDetailsForm({ ...doDetailsForm, validityDate: e.target.value })} /></div>
                             <div className="space-y-2">
                                <Label>{doDetailsDialog?.documentType === 'SECURITY_DEPOSIT_REFUND' ? 'Refund Status' : 'Payment Status'}</Label>
                                <Select value={doDetailsForm.paymentStatus} onValueChange={v => setDoDetailsForm({ ...doDetailsForm, paymentStatus: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="DONE">Done</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label>Payment Date</Label><Input type="date" value={doDetailsForm.paymentDate} onChange={e => setDoDetailsForm({ ...doDetailsForm, paymentDate: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Bank Name</Label><Input value={doDetailsForm.bankName} onChange={e => setDoDetailsForm({ ...doDetailsForm, bankName: e.target.value })} /></div>
                            <div className="space-y-2"><Label>Bank Branch</Label><Input value={doDetailsForm.bankBranch} onChange={e => setDoDetailsForm({ ...doDetailsForm, bankBranch: e.target.value })} /></div>
                            <div className="space-y-2 col-span-2"><Label>UTR Number</Label><Input value={doDetailsForm.utrNumber} onChange={e => setDoDetailsForm({ ...doDetailsForm, utrNumber: e.target.value })} /></div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDoDetailsDialog(null)}>Cancel</Button>
                            <Button type="submit" disabled={updating}>{updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Details'}</Button>
                        </DialogFooter>
                    </form>
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
                            <div className="space-y-2"><Label>GST No</Label><Input value={transportForm.gstNo || ''} onChange={e => setTransportForm(p => ({ ...p, gstNo: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Transport Rate (₹)</Label><Input type="number" value={transportForm.transportRate || ''} onChange={e => setTransportForm(p => ({ ...p, transportRate: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Transport Charges (₹)</Label><Input type="number" value={transportForm.transportCharges || ''} onChange={e => setTransportForm(p => ({ ...p, transportCharges: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>From</Label><Input value={transportForm.transportFrom || ''} onChange={e => setTransportForm(p => ({ ...p, transportFrom: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>To</Label><Input value={transportForm.transportTo || ''} onChange={e => setTransportForm(p => ({ ...p, transportTo: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Gross Weight (kg)</Label><Input type="number" value={transportForm.grossWeight || ''} onChange={e => setTransportForm(p => ({ ...p, grossWeight: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Delivery Date</Label><Input type="date" value={transportForm.deliveryDate?.split?.('T')?.[0] || ''} onChange={e => setTransportForm(p => ({ ...p, deliveryDate: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>DO Valid Till</Label><Input type="date" value={transportForm.doValidTill?.split?.('T')?.[0] || ''} onChange={e => setTransportForm(p => ({ ...p, doValidTill: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Empty/Unloading Charges (₹)</Label><Input type="number" value={transportForm.emptyUnloadingCharges || ''} onChange={e => setTransportForm(p => ({ ...p, emptyUnloadingCharges: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Union Charges (₹)</Label><Input type="number" value={transportForm.unionCharges || ''} onChange={e => setTransportForm(p => ({ ...p, unionCharges: e.target.value }))} /></div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setTransportDialog(false)}>Cancel</Button>
                            <Button type="submit" disabled={transportSaving}>{transportSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirmation AlertDialog */}
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

            {/* Other Doc Dialog */}
            <Dialog open={!!otherDocDialog} onOpenChange={() => setOtherDocDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Custom {otherDocDialog} Document</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Document Name / Type</Label>
                            <Input value={customDocName} onChange={e => setCustomDocName(e.target.value)} placeholder="e.g. Export Permit, Special License" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOtherDocDialog(null)}>Cancel</Button>
                        <Button onClick={() => {
                            if (otherDocDialog === 'FILING') handleAddOtherFiling(customDocName);
                            else if (otherDocDialog === 'DO') handleAddOtherDo(customDocName);
                            else if (otherDocDialog === 'KYC') handleAddOtherKyc(customDocName);
                            else if (otherDocDialog === 'TRANSPORT') handleAddOtherTransport(updateForm.currentTransportId, customDocName);
                            else if (otherDocDialog === 'BILLING') handleBillingExtraDocAdd(customDocName);
                        }} disabled={addingOther || !customDocName.trim()}>
                            {addingOther ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Document'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Shipment Dialog */}
            <Dialog open={editShipmentDialog} onOpenChange={setEditShipmentDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" /> Edit Shipment Details</DialogTitle></DialogHeader>
                    <form onSubmit={handleEditShipmentSubmit} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold uppercase">Shipment Type</Label>
                                <Select value={editShipmentForm.shipmentType} onValueChange={v => setEditShipmentForm(p => ({ ...p, shipmentType: v }))}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="IMPORT">Import</SelectItem><SelectItem value="EXPORT">Export</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold uppercase">Sub-Type</Label>
                                <Select value={editShipmentForm.shipmentSubType} onValueChange={v => setEditShipmentForm(p => ({ ...p, shipmentSubType: v }))}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="HOME_CONSUMPTION">Home Consumption</SelectItem><SelectItem value="IN_BOND">IN Bond</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">Cartons</Label><Input type="number" value={editShipmentForm.noOfCtn} onChange={e => setEditShipmentForm(p => ({ ...p, noOfCtn: e.target.value }))} className="h-9" /></div>
                            <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">Gross Weight (kg)</Label><Input type="number" step="0.01" value={editShipmentForm.grossWeight} onChange={e => setEditShipmentForm(p => ({ ...p, grossWeight: e.target.value }))} className="h-9" /></div>
                            <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">MBL No</Label><Input value={editShipmentForm.mblNo} onChange={e => setEditShipmentForm(p => ({ ...p, mblNo: e.target.value }))} className="h-9" /></div>
                            <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">HBL No</Label><Input value={editShipmentForm.hblNo} onChange={e => setEditShipmentForm(p => ({ ...p, hblNo: e.target.value }))} className="h-9" /></div>
                        </div>

                        <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">Description</Label><Input value={editShipmentForm.description} onChange={e => setEditShipmentForm(p => ({ ...p, description: e.target.value }))} className="h-9" /></div>

                        <div className="border-t pt-4">
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-3">Shipping & Logistics</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">Vessel / Voyage</Label><Input value={editShipmentForm.vesselNameVoyage} onChange={e => setEditShipmentForm(p => ({ ...p, vesselNameVoyage: e.target.value }))} placeholder="Vessel name & voyage" className="h-9" /></div>
                                <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">CFS Name</Label><Input value={editShipmentForm.cfsName} onChange={e => setEditShipmentForm(p => ({ ...p, cfsName: e.target.value }))} placeholder="CFS name" className="h-9" /></div>
                                <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">Liner</Label><Input value={editShipmentForm.linerName} onChange={e => setEditShipmentForm(p => ({ ...p, linerName: e.target.value }))} placeholder="Shipping line" className="h-9" /></div>
                                <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">Forwarder</Label><Input value={editShipmentForm.forwarderName} onChange={e => setEditShipmentForm(p => ({ ...p, forwarderName: e.target.value }))} placeholder="Forwarder name" className="h-9" /></div>
                                <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">Port of Loading</Label><Input value={editShipmentForm.portOfLoading} onChange={e => setEditShipmentForm(p => ({ ...p, portOfLoading: e.target.value }))} placeholder="Port of loading" className="h-9" /></div>
                                <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">ETA</Label><Input type="date" value={editShipmentForm.eta} onChange={e => setEditShipmentForm(p => ({ ...p, eta: e.target.value }))} className="h-9" /></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">Free Days (Shipping Line)</Label><Input type="number" value={editShipmentForm.freeDaysShippingLine} onChange={e => setEditShipmentForm(p => ({ ...p, freeDaysShippingLine: e.target.value }))} placeholder="0" className="h-9" /></div>
                            <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">Free Days (CFS)</Label><Input type="number" value={editShipmentForm.freeDaysCfs} onChange={e => setEditShipmentForm(p => ({ ...p, freeDaysCfs: e.target.value }))} placeholder="0" className="h-9" /></div>
                            <div className="space-y-1"><Label className="text-[11px] font-semibold uppercase">Inward Date</Label><Input type="date" value={editShipmentForm.inwardDate} onChange={e => setEditShipmentForm(p => ({ ...p, inwardDate: e.target.value }))} className="h-9" /></div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditShipmentDialog(false)}>Cancel</Button>
                            <Button type="submit" disabled={editShipmentSaving} className="gap-2 bg-blue-600 hover:bg-blue-700">
                                {editShipmentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ShipmentDocumentRow({ doc, typeInfo, canEdit, onUpload, onDelete, onStatusChange, statusOptions, onEditDetails }) {
    const [expanded, setExpanded] = useState(false);
    const [uploading, setUploading] = useState(false);
    const hasFile = !!doc.fileUrl;

    async function handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        onUpload(doc.documentType, file);
    }

    return (
        <div className="border-b last:border-0">
            <div className={`p-2.5 flex items-center justify-between transition-colors ${hasFile ? 'hover:bg-gray-50 cursor-pointer' : ''}`} onClick={() => hasFile && setExpanded(!expanded)}>
                <div className="flex items-center gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasFile ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : hasFile ? <CheckCircle className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2"><p className="text-sm font-bold">{doc.documentType === 'OTHER' ? (doc.customType || 'Other Document') : (typeInfo?.label || doc.documentType.replace(/_/g, ' '))}</p>{doc.isMandatory && !hasFile && <Badge variant="destructive" className="text-[8px] h-4">REQUIRED</Badge>}</div>
                        <Badge variant="outline" className="text-[9px] mt-0.5">{doc.status?.replace(/_/g, ' ') || 'PENDING'}</Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {onEditDetails && canEdit && (
                        <Button variant="outline" size="sm" onClick={onEditDetails} className="h-7 text-[10px] px-2 gap-1 font-bold border-blue-100 bg-blue-50/30 text-blue-700 hover:bg-blue-50"><Receipt className="h-3 w-3" /> Details</Button>
                    )}
                    {onStatusChange && hasFile && canEdit && (
                        <Select value={doc.status} onValueChange={v => onStatusChange(doc.documentType, v)}>
                            <SelectTrigger className="h-7 text-[10px] w-32 font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                        </Select>
                    )}
                    {hasFile ? (
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="text-blue-600 font-bold h-7 px-3 hover:bg-blue-50" onClick={() => setExpanded(!expanded)}>{expanded ? 'Hide' : 'View'}</Button>
                            {canEdit && (
                                <>
                                    <label className="cursor-pointer text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors" title="Update / Re-upload">
                                        <input type="file" className="hidden" onChange={handleFileChange} />
                                        <Upload className="h-4 w-4" />
                                    </label>
                                    {onDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>}
                                </>
                            )}
                        </div>
                    ) : canEdit && <label className="cursor-pointer bg-blue-600 text-white px-4 py-1.5 rounded-md text-[10px] font-black uppercase shadow-sm hover:bg-blue-700 transition-all"><input type="file" className="hidden" onChange={handleFileChange} />Upload</label>}
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
