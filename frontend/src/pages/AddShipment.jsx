import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import CustomerSearchDropdown from '@/components/CustomerSearchDropdown';
import { Plus, Trash2, Loader2, ArrowLeft, Info, FileText } from 'lucide-react';
import { toast } from 'sonner';

const CONTAINER_SIZES = [
    { value: 'TWENTY_HQ', label: '20" HQ' },
    { value: 'FORTY_HQ', label: '40" HQ' },
    { value: 'TWENTY_OT', label: '20" OT' },
    { value: 'FORTY_OT', label: '40" OT' },
    { value: 'TWENTY_FT', label: '20 Flat Track' },
    { value: 'FORTY_FT', label: '40 Flat Track' },
    { value: 'TWENTY', label: '20\' Standard' },
    { value: 'FORTY', label: '40\' Standard' },
];

const MANDATORY_DOCS = {
    HOME_CONSUMPTION: [
        'Commercial Invoice', 'Packing List', 'House Bill of Lading', 'Master Bill of Lading',
        'COO (Certificate of Origin)', 'Freight Certificate', 'Insurance', 'BIS Certificate (if applicable)',
        'LMPC', 'EPRA Certificate (Plastic)', 'EPRA certificate (E waste)', 'Catalogue of Goods', 'Other Document'
    ],
    IN_BOND: [
        'Commercial Invoice', 'Packing List', 'Master Bill of Lading', 'HBL', 'COO',
        'Freight Certificate', 'Insurance', 'BIS Certificate', 'Authority Letter',
        'Dimension Certificate', 'Space Certificate', 'Bond & License',
        'Transit Insurance Policy', 'OT Container Photographs', 
        'CHA Authorization Documents – Authority letter and Custom Pass', 'Other Document'
    ]
};

export default function AddShipment() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [form, setForm] = useState({
        onsJobNumber: '',
        shipmentType: 'IMPORT',
        shipmentSubType: 'HOME_CONSUMPTION',
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
                    <h1 className="text-xl font-bold text-gray-900">Step 1: New Shipment</h1>
                    <p className="text-gray-500 text-[11px] mt-0.5">Initialize shipment job with type and container details</p>
                </div>
            </div>

            <div className="w-full">
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
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Shipment Details */}
                        <Card>
                            <CardHeader className="py-2 px-3 border-b">
                                <CardTitle className="text-sm font-semibold">Shipment Configuration</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 pt-3 pb-3 px-3 text-sm">
                                <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
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
                                        <Label className="text-[11px] font-semibold text-gray-700 uppercase">Sub-Type *</Label>
                                        <Select value={form.shipmentSubType} onValueChange={v => handleChange('shipmentSubType', v)}>
                                            <SelectTrigger className="h-8 text-sm font-bold"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="HOME_CONSUMPTION">Home Consumption</SelectItem>
                                                <SelectItem value="IN_BOND">IN Bond</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div className="space-y-0.5">
                                        <Label className="text-[11px] font-semibold text-gray-700 uppercase">Job Number</Label>
                                        <Input
                                            value={form.onsJobNumber}
                                            onChange={e => handleChange('onsJobNumber', e.target.value)}
                                            placeholder="Auto"
                                            className={`h-8 text-sm ${errors.onsJobNumber ? 'border-red-500' : ''}`}
                                        />
                                    </div>
                                    <div className="space-y-0.5">
                                        <Label className="text-[11px] font-semibold text-gray-700 uppercase">Cartons</Label>
                                        <Input value={form.noOfCtn} onChange={e => handleChange('noOfCtn', e.target.value)} placeholder="0" className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <Label className="text-[11px] font-semibold text-gray-700 uppercase">Weight (kg)</Label>
                                        <Input type="number" step="0.01" value={form.grossWeight} onChange={e => handleChange('grossWeight', e.target.value)} placeholder="0.00" className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <Label className="text-[11px] font-semibold text-gray-700 uppercase">ETA</Label>
                                        <Input type="date" value={form.eta} onChange={e => handleChange('eta', e.target.value)} className="h-8 text-sm" />
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    <Label className="text-[11px] font-semibold text-gray-700 uppercase">Description</Label>
                                    <Input value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Goods description" className="h-8 text-sm" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-0.5"><Label className="text-[11px]">MBL No</Label><Input value={form.mblNo} onChange={e => handleChange('mblNo', e.target.value)} className="h-8" /></div>
                                    <div className="space-y-0.5"><Label className="text-[11px]">HBL No</Label><Input value={form.hblNo} onChange={e => handleChange('hblNo', e.target.value)} className="h-8" /></div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Containers */}
                        <Card>
                            <CardHeader className="py-2 px-3 border-b flex flex-row items-center justify-between h-10 text-sm">
                                <CardTitle className="text-sm font-semibold">Containers</CardTitle>
                                <Button type="button" variant="outline" size="sm" onClick={addContainer} className="h-7 gap-1 px-2 text-[11px]">
                                    <Plus className="h-3 w-3" /> Add
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-1.5 pt-3 pb-3 px-3">
                                {containers.map((c, i) => (
                                    <div key={i} className="flex items-end gap-2 p-1.5 bg-gray-50 border border-gray-100 rounded-md">
                                        <div className="flex-1 space-y-0.5">
                                            <Label className="text-[10px] uppercase font-bold text-gray-500">Number</Label>
                                            <Input
                                                value={c.containerNumber}
                                                onChange={e => updateContainer(i, 'containerNumber', e.target.value.toUpperCase())}
                                                placeholder="ABCD1234567"
                                                className="h-8 text-sm bg-white"
                                            />
                                        </div>
                                        <div className="w-32 space-y-0.5">
                                            <Label className="text-[10px] uppercase font-bold text-gray-500">Size</Label>
                                            <Select value={c.containerSize} onValueChange={v => updateContainer(i, 'containerSize', v)}>
                                                <SelectTrigger className="h-8 text-sm bg-white"><SelectValue /></SelectTrigger>
                                                <SelectContent>{CONTAINER_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
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
                            <Button type="submit" size="sm" disabled={loading} className="gap-2 bg-blue-600 hover:bg-blue-700">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Create Shipment
                            </Button>
                        </div>
                </form>
            </div>
        </div>
    );
}
