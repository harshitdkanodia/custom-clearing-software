import { useState, useEffect } from 'react';
import api, { hasRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Loader2, Package, CheckCircle2, ExternalLink, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';

export default function Courier() {
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [sending, setSending] = useState(false);
    const [form, setForm] = useState({ courierName: '', dispatchDate: '' });
    const [file, setFile] = useState(null);
    const canEdit = hasRole('ADMIN', 'OPERATION_STAFF');

    useEffect(() => { fetchList(); }, []);

    async function fetchList() {
        try {
            const res = await api.get('/courier');
            setShipments(res.data.data);
        } catch (err) {
            toast.error('Failed to load courier list');
        } finally {
            setLoading(false);
        }
    }

    function openDispatch(s) {
        setSelected(s);
        setForm({ courierName: '', dispatchDate: new Date().toISOString().split('T')[0] });
        setFile(null);
    }

    async function handleDispatch(e) {
        e.preventDefault();
        if (!form.courierName.trim()) return toast.error('Courier name is required');
        if (!form.dispatchDate) return toast.error('Dispatch date is required');
        if (!file) return toast.error('Receipt file is required');
        setSending(true);
        const formData = new FormData();
        formData.append('courierName', form.courierName);
        formData.append('dispatchDate', form.dispatchDate);
        formData.append('receipt', file);
        try {
            await api.post(`/courier/${selected.id}/dispatch`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Courier dispatched! Shipment is now Closed.');
            setSelected(null);
            fetchList();
        } catch (err) {
            const msg = err.response?.data?.error?.fields
                ? Object.values(err.response.data.error.fields).join(', ')
                : err.response?.data?.error?.message || 'Dispatch failed';
            toast.error(msg);
        } finally {
            setSending(false);
        }
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Courier Dispatch</h1>
                <p className="text-gray-500 text-sm mt-0.5">{shipments.length} shipments ready for courier</p>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
            ) : shipments.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                        <Package className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium text-gray-500">No shipments ready for courier</p>
                        <p className="text-sm text-gray-400 mt-1">Shipments appear here after billing is marked complete</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {shipments.map(s => {
                        const isDispatched = s.courier?.status === 'DISPATCHED';
                        return (
                            <Card key={s.id} className="border-gray-100 hover:shadow-md transition-all">
                                <CardContent className="py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-0.5">
                                                <p className="font-mono font-bold text-blue-600">{s.onsJobNumber}</p>
                                                {isDispatched
                                                    ? <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Dispatched</span>
                                                    : <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Awaiting Dispatch</span>
                                                }
                                            </div>
                                            <p className="text-sm font-medium text-gray-700">{s.customer?.customerName}</p>
                                            {isDispatched && s.courier ? (
                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" /> {s.courier.courierName}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(s.courier.dispatchDate).toLocaleDateString('en-IN')}
                                                    </span>
                                                    {s.courier.receiptUrl && (
                                                        <a
                                                            href={s.courier.receiptUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                                                        >
                                                            <ExternalLink className="h-3 w-3" /> View Receipt
                                                        </a>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {s.billing?.billAmount ? `Bill: ₹${parseFloat(s.billing.billAmount).toLocaleString('en-IN')}` : 'Billing complete'}
                                                </p>
                                            )}
                                        </div>
                                        {canEdit && !isDispatched && (
                                            <Button onClick={() => openDispatch(s)} className="gap-1.5 shrink-0">
                                                <Truck className="h-4 w-4" /> Dispatch
                                            </Button>
                                        )}
                                        {isDispatched && (
                                            <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Dispatch Dialog */}
            <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Dispatch Courier — <span className="text-blue-600">{selected?.onsJobNumber}</span>
                        </DialogTitle>
                        {selected && (
                            <p className="text-sm text-gray-500">{selected.customer?.customerName}</p>
                        )}
                    </DialogHeader>
                    <form onSubmit={handleDispatch} className="space-y-3 py-1">
                        <div className="space-y-1">
                            <Label>Courier Company Name <span className="text-red-500">*</span></Label>
                            <Input
                                value={form.courierName}
                                onChange={e => setForm(p => ({ ...p, courierName: e.target.value }))}
                                placeholder="e.g. Blue Dart, DTDC, FedEx"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Date of Dispatch <span className="text-red-500">*</span></Label>
                            <Input
                                type="date"
                                value={form.dispatchDate}
                                onChange={e => setForm(p => ({ ...p, dispatchDate: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Courier Receipt (PDF/Image) <span className="text-red-500">*</span></Label>
                            <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={e => setFile(e.target.files[0])}
                            />
                            <p className="text-xs text-gray-400">Upload the courier receipt. Shipment will be automatically closed on dispatch.</p>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                            <Button type="submit" disabled={sending} className="gap-1.5">
                                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                                {sending ? 'Dispatching...' : 'Confirm Dispatch'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
