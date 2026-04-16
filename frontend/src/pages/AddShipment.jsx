import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CustomerSearchDropdown from '@/components/CustomerSearchDropdown';
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AddShipment() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [form, setForm] = useState({
        onsJobNumber: '',
        shipmentType: 'IMPORT',
        noOfCtn: '',
        description: '',
        grossWeight: '',
        cfsName: '',
        mblNo: '',
        hblNo: '',
        vesselNameVoyage: '',
        linerName: '',
        forwarderName: '',
        portOfLoading: '',
        eta: '',
        freeDaysShippingLine: '',
        freeDaysCfs: '',
    });
    const [containers, setContainers] = useState([
        { containerNumber: '', containerType: 'FCL', containerSize: 'TWENTY' }
    ]);

    function handleChange(field, value) {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    function addContainer() {
        setContainers(prev => [...prev, { containerNumber: '', containerType: 'FCL', containerSize: 'TWENTY' }]);
    }

    function removeContainer(index) {
        if (containers.length === 1) return;
        setContainers(prev => prev.filter((_, i) => i !== index));
    }

    function updateContainer(index, field, value) {
        setContainers(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = {};
        if (!selectedCustomer) errs.customerId = 'Select a customer';
        if (!selectedCustomer) errs.customerId = 'Select a customer';
        if (!form.shipmentType) errs.shipmentType = 'Select shipment type';
        if (containers.some(c => !c.containerNumber.trim())) errs.containers = 'All containers need a number';

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        setLoading(true);
        try {
            await api.post('/shipments', {
                ...form,
                customerId: selectedCustomer.id,
                containers,
            });
            toast.success('Shipment created successfully');
            navigate('/shipments');
        } catch (err) {
            const errData = err.response?.data?.error;
            if (errData?.fields) setErrors(errData.fields);
            else toast.error(errData?.message || 'Failed to create shipment');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="icon" onClick={() => navigate('/shipments')} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">New Shipment</h1>
                    <p className="text-gray-500 text-[11px] mt-0.5">Create a new shipment with container details</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Customer Selection */}
                <Card>
                    <CardHeader className="py-2 px-3 border-b">
                        <CardTitle className="text-sm font-semibold">Customer Selection</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3 pb-3 px-3">
                        <CustomerSearchDropdown
                            onSelect={(c) => { setSelectedCustomer(c); setErrors(prev => ({ ...prev, customerId: undefined })); }}
                            onAddNew={() => navigate('/customers')}
                        />
                        {errors.customerId && <p className="text-red-500 text-[10px] mt-1">{errors.customerId}</p>}
                        {selectedCustomer && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md text-[12px]">
                                <p className="font-semibold text-blue-900">{selectedCustomer.customerName}</p>
                                <p className="text-blue-700/70">IEC: {selectedCustomer.iecCode} | GST: {selectedCustomer.gstNumber}</p>
                                {selectedCustomer.address && <p className="text-blue-700/70 truncate">{selectedCustomer.address}</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Shipment Details */}
                <Card>
                    <CardHeader className="py-2 px-3 border-b">
                        <CardTitle className="text-sm font-semibold">Shipment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-3 pb-3 px-3 text-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">Job Number (Leave blank for auto)</Label>
                                <Input
                                    value={form.onsJobNumber}
                                    onChange={e => handleChange('onsJobNumber', e.target.value)}
                                    placeholder="Auto-generated if blank"
                                    className={`h-8 text-sm ${errors.onsJobNumber ? 'border-red-500' : ''}`}
                                />
                                {errors.onsJobNumber && <p className="text-red-500 text-[10px]">{errors.onsJobNumber}</p>}
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">Shipment Type *</Label>
                                <Select value={form.shipmentType} onValueChange={v => handleChange('shipmentType', v)}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="IMPORT">Import</SelectItem>
                                        <SelectItem value="EXPORT">Export</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">No. of Cartons</Label>
                                <Input type="text" value={form.noOfCtn} onChange={e => handleChange('noOfCtn', e.target.value)} placeholder="0" className="h-8 text-sm" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">Gross Weight (kg)</Label>
                                <Input type="number" step="0.01" value={form.grossWeight} onChange={e => handleChange('grossWeight', e.target.value)} placeholder="0.00" className="h-8 text-sm" />
                            </div>
                        </div>

                        <div className="space-y-0.5">
                            <Label className="text-[11px] font-semibold text-gray-700 uppercase">Description</Label>
                            <Input value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Shipment description" className="h-8 text-sm" />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">MBL No</Label>
                                <Input value={form.mblNo} onChange={e => handleChange('mblNo', e.target.value)} placeholder="Master Bill of Lading" className="h-8 text-sm" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">HBL No</Label>
                                <Input value={form.hblNo} onChange={e => handleChange('hblNo', e.target.value)} placeholder="House Bill of Lading" className="h-8 text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">Vessel Name / Voyage</Label>
                                <Input value={form.vesselNameVoyage} onChange={e => handleChange('vesselNameVoyage', e.target.value)} placeholder="Vessel & voyage" className="h-8 text-sm" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">CFS Name</Label>
                                <Input value={form.cfsName} onChange={e => handleChange('cfsName', e.target.value)} placeholder="CFS name" className="h-8 text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">Liner Name</Label>
                                <Input value={form.linerName} onChange={e => handleChange('linerName', e.target.value)} placeholder="Liner" className="h-8 text-sm" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">Forwarder Name</Label>
                                <Input value={form.forwarderName} onChange={e => handleChange('forwarderName', e.target.value)} placeholder="Forwarder" className="h-8 text-sm" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">Port of Loading</Label>
                                <Input value={form.portOfLoading} onChange={e => handleChange('portOfLoading', e.target.value)} placeholder="Port" className="h-8 text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">ETA</Label>
                                <Input type="date" value={form.eta} onChange={e => handleChange('eta', e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">Free Days (Shipping Line)</Label>
                                <Input type="number" value={form.freeDaysShippingLine} onChange={e => handleChange('freeDaysShippingLine', e.target.value)} placeholder="0" className="h-8 text-sm" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-semibold text-gray-700 uppercase">Free Days (CFS)</Label>
                                <Input type="number" value={form.freeDaysCfs} onChange={e => handleChange('freeDaysCfs', e.target.value)} placeholder="0" className="h-8 text-sm" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Containers */}
                <Card>
                    <CardHeader className="py-2 px-3 border-b flex flex-row items-center justify-between h-10 text-sm">
                        <CardTitle className="text-sm font-semibold">Containers</CardTitle>
                        <Button type="button" variant="outline" size="sm" onClick={addContainer} className="h-7 gap-1 px-2 text-[11px]">
                            <Plus className="h-3 w-3" /> Add Container
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-1.5 pt-3 pb-3 px-3">
                        {errors.containers && <p className="text-red-500 text-[10px] mb-1">{errors.containers}</p>}
                        {containers.map((c, i) => (
                            <div key={i} className="flex items-end gap-2 p-1.5 bg-gray-50 border border-gray-100 rounded-md">
                                <div className="flex-1 space-y-0.5">
                                    <Label className="text-[10px] font-semibold text-gray-600 uppercase">Container Number *</Label>
                                    <Input
                                        value={c.containerNumber}
                                        onChange={e => updateContainer(i, 'containerNumber', e.target.value.toUpperCase())}
                                        placeholder="ABCD1234567"
                                        className={`h-8 text-sm ${errors[`container_${i}`] ? 'border-red-500' : ''}`}
                                    />
                                </div>
                                <div className="w-28 space-y-0.5">
                                    <Label className="text-[10px] font-semibold text-gray-600 uppercase">Type</Label>
                                    <Select value={c.containerType} onValueChange={v => updateContainer(i, 'containerType', v)}>
                                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="FCL">FCL</SelectItem>
                                            <SelectItem value="LCL">LCL</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-28 space-y-0.5">
                                    <Label className="text-[10px] font-semibold text-gray-600 uppercase">Size</Label>
                                    <Select value={c.containerSize} onValueChange={v => updateContainer(i, 'containerSize', v)}>
                                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TWENTY">20 ft</SelectItem>
                                            <SelectItem value="FORTY">40 ft</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-400 hover:text-red-500 shrink-0"
                                    onClick={() => removeContainer(i)}
                                    disabled={containers.length === 1}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => navigate('/shipments')}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={loading} className="gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Create Shipment
                    </Button>
                </div>
            </form>
        </div>
    );
}
