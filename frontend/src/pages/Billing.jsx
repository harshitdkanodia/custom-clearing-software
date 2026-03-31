import { useState, useEffect } from 'react';
import api, { hasRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Receipt, Upload, CheckCircle2, Mail, Loader2, ExternalLink, IndianRupee, FileText } from 'lucide-react';
import { toast } from 'sonner';

const BILL_DOC_TYPES = [
    { key: 'FINAL_BILL', label: 'Final Bill', field: 'finalBillUrl', mandatory: true },
    { key: 'STAMP_DUTY', label: 'Stamp Duty', field: 'stampDutyUrl', mandatory: true },
    { key: 'CFS_CHARGES', label: 'CFS Charges', field: 'cfsChargesUrl', mandatory: true },
    { key: 'TRANSPORT_CHARGES', label: 'Transport / Empty Charges', field: 'transportChargesUrl', mandatory: false },
    { key: 'FIRST_TIME_IMPORT', label: '1st Time Import Charges', field: 'firstTimeImportUrl', mandatory: false },
    { key: 'DELIVERY_CHARGES', label: 'Delivery Charges', field: 'deliveryChargesUrl', mandatory: false },
    { key: 'OOC_DOC', label: 'OOC Document', field: 'oocDocUrl', mandatory: true },
    { key: 'BOE_DOC', label: 'BOE Document', field: 'boeDocUrl', mandatory: true },
    { key: 'INSURANCE', label: 'Insurance', field: 'insuranceUrl', mandatory: false },
    { key: 'UNION_CHARGES', label: 'Union Charges', field: 'unionChargesUrl', mandatory: false },
];

export default function Billing() {
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [billingData, setBillingData] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [billAmount, setBillAmount] = useState('');
    const [saving, setSaving] = useState(false);
    const [completing, setCompleting] = useState(false);
    const canEdit = hasRole('ADMIN', 'OPERATION_STAFF');

    useEffect(() => { fetchBillingList(); }, []);

    async function fetchBillingList() {
        try {
            const res = await api.get('/billing');
            setShipments(res.data.data);
        } catch (err) {
            toast.error('Failed to load billing list');
        } finally {
            setLoading(false);
        }
    }

    async function openDetail(shipment) {
        setSelectedShipment(shipment);
        setDetailLoading(true);
        setBillingData(null);
        try {
            const res = await api.get(`/billing/${shipment.id}`);
            setBillingData(res.data.data);
            setBillAmount(res.data.data.billing?.billAmount?.toString() || '');
        } catch (err) {
            toast.error('Failed to load billing details');
        } finally {
            setDetailLoading(false);
        }
    }

    async function handleUpload(docType, file) {
        if (!selectedShipment) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post(`/billing/${selectedShipment.id}/upload/${docType}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Document uploaded successfully');
            openDetail(selectedShipment);
        } catch (err) {
            toast.error('Upload failed');
        }
    }

    async function handleSaveAmount() {
        if (!billAmount) return toast.warning('Please enter a bill amount');
        setSaving(true);
        try {
            await api.patch(`/billing/${selectedShipment.id}/bill-amount`, { billAmount });
            toast.success('Bill amount saved');
            openDetail(selectedShipment);
        } catch (err) {
            toast.error('Failed to save amount');
        } finally {
            setSaving(false);
        }
    }

    async function handleComplete() {
        setCompleting(true);
        try {
            await api.patch(`/billing/${selectedShipment.id}/complete`);
            toast.success('Billing complete — shipment moved to Ready for Courier');
            setSelectedShipment(null);
            fetchBillingList();
        } catch (err) {
            toast.error('Failed to complete billing');
        } finally {
            setCompleting(false);
        }
    }

    async function handleSendEmail() {
        try {
            await api.post(`/billing/${selectedShipment.id}/send-email`);
            toast.success('Bill email sent to customer');
        } catch (err) {
            toast.error('Failed to send email');
        }
    }

    const billing = billingData?.billing;
    const uploadedCount = billing ? BILL_DOC_TYPES.filter(dt => billing[dt.field]).length : 0;

    return (
        <div>
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
                <p className="text-gray-500 text-sm mt-0.5">{shipments.length} shipments ready for billing</p>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                </div>
            ) : shipments.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                        <Receipt className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium text-gray-500">No shipments ready for billing</p>
                        <p className="text-sm text-gray-400 mt-1">Shipments appear here automatically once cargo is delivered</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {shipments.map(s => {
                        const docCount = BILL_DOC_TYPES.filter(dt => s.billing?.[dt.field]).length;
                        const isComplete = s.billing?.isComplete;
                        return (
                            <Card key={s.id} className="hover:shadow-md transition-all border-gray-100">
                                <CardContent className="py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="font-mono font-bold text-blue-600">{s.onsJobNumber}</p>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {isComplete ? '✓ Billing Complete' : 'Billing Pending'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 truncate">{s.customer?.customerName}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {docCount}/{BILL_DOC_TYPES.length} documents uploaded
                                                {s.billing?.billAmount ? ` · ₹${parseFloat(s.billing.billAmount).toLocaleString('en-IN')}` : ''}
                                            </p>
                                        </div>
                                        <Button onClick={() => openDetail(s)} size="sm" variant={isComplete ? 'ghost' : 'default'} className="shrink-0">
                                            {isComplete ? 'View' : 'Open Billing'}
                                        </Button>
                                    </div>
                                    {/* Mini progress bar */}
                                    <div className="mt-2.5 w-full bg-gray-100 rounded-full h-1">
                                        <div
                                            className="bg-blue-500 h-1 rounded-full transition-all"
                                            style={{ width: `${(docCount / BILL_DOC_TYPES.length) * 100}%` }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Billing Detail Dialog */}
            <Dialog open={!!selectedShipment} onOpenChange={() => { setSelectedShipment(null); setBillingData(null); }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg">
                            Billing — <span className="text-blue-600">{selectedShipment?.onsJobNumber}</span>
                        </DialogTitle>
                        {billingData?.shipment && (
                            <p className="text-sm text-gray-500">{billingData.shipment.customer?.customerName}</p>
                        )}
                    </DialogHeader>

                    {detailLoading ? (
                        <div className="space-y-3 py-4">
                            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                        </div>
                    ) : billingData ? (
                        <div className="space-y-4 py-1">
                            {/* Bill Amount */}
                            <div className="bg-blue-50 rounded-xl p-3">
                                <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Bill Amount (₹)</Label>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="relative flex-1">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            type="number"
                                            value={billAmount}
                                            onChange={e => setBillAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="pl-9 bg-white"
                                            disabled={!canEdit}
                                        />
                                    </div>
                                    {canEdit && (
                                        <Button variant="outline" size="sm" onClick={handleSaveAmount} disabled={saving} className="bg-white">
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                        </Button>
                                    )}
                                </div>
                                {billing?.billDate && (
                                    <p className="text-xs text-blue-600 mt-1.5">
                                        Bill dated: {new Date(billing.billDate).toLocaleDateString('en-IN')}
                                    </p>
                                )}
                            </div>

                            {/* Document Uploads */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold text-gray-800">Billing Documents</p>
                                    <span className="text-xs text-gray-500">{uploadedCount}/{BILL_DOC_TYPES.length} uploaded</span>
                                </div>
                                <div className="space-y-1">
                                    {BILL_DOC_TYPES.map(dt => {
                                        const hasFile = billing?.[dt.field];
                                        return (
                                            <div key={dt.key} className={`flex items-center justify-between p-2.5 rounded-lg border ${hasFile ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {hasFile ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                                    ) : (
                                                        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                                                    )}
                                                    <span className="text-sm truncate">{dt.label}</span>
                                                    {dt.mandatory && !hasFile && (
                                                        <span className="text-[10px] text-red-500 font-semibold shrink-0">Required</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    {hasFile && (
                                                        <a
                                                            href={billing[dt.field]}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                        >
                                                            <ExternalLink className="h-3 w-3" /> View
                                                        </a>
                                                    )}
                                                    {canEdit && (
                                                        <label className="cursor-pointer">
                                                            <input
                                                                type="file"
                                                                accept=".pdf,.jpg,.jpeg,.png"
                                                                className="hidden"
                                                                onChange={e => { if (e.target.files[0]) handleUpload(dt.key, e.target.files[0]); }}
                                                            />
                                                            <span className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                                                                <Upload className="h-3 w-3" />
                                                                {hasFile ? 'Replace' : 'Upload'}
                                                            </span>
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {billing?.billEmailSentDate && (
                                <p className="text-xs text-gray-500 text-center">
                                    Bill email sent on {new Date(billing.billEmailSentDate).toLocaleDateString('en-IN')}
                                </p>
                            )}
                        </div>
                    ) : null}

                    {canEdit && selectedShipment && (
                        <DialogFooter className="gap-2 flex-wrap">
                            <Button variant="outline" onClick={handleSendEmail} className="gap-1.5">
                                <Mail className="h-4 w-4" /> Send Bill Email
                            </Button>
                            <Button
                                onClick={handleComplete}
                                disabled={completing || billing?.isComplete}
                                className="gap-1.5 bg-green-600 hover:bg-green-700"
                            >
                                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                {billing?.isComplete ? 'Already Complete' : 'Mark Billing Complete'}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
