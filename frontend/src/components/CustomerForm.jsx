import { useState, useEffect } from 'react';
import api from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const defaultForm = {
    customerName: '',
    iecCode: '',
    gstNumber: '',
    address: '',
    email: '',
    dpd: false,
};

export default function CustomerForm({ open, onOpenChange, customer, onSuccess }) {
    const isEdit = !!customer;
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [form, setForm] = useState(defaultForm);

    // KEY FIX: Re-initialise form whenever the customer prop changes (different row clicked)
    useEffect(() => {
        if (open) {
            setErrors({});
            setForm({
                customerName: customer?.customerName || '',
                iecCode: customer?.iecCode || '',
                gstNumber: customer?.gstNumber || '',
                address: customer?.address || '',
                email: customer?.email || '',
                dpd: customer?.dpd ?? false,
            });
        }
    }, [open, customer]);

    function handleChange(field, value) {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    function validate() {
        const errs = {};
        if (!form.customerName.trim()) errs.customerName = 'Customer name is required';
        if (!form.iecCode.trim()) errs.iecCode = 'IEC Code is required';
        else if (!/^[A-Za-z0-9]{10}$/.test(form.iecCode)) errs.iecCode = 'Must be exactly 10 alphanumeric characters';
        if (!form.gstNumber.trim()) errs.gstNumber = 'GST Number is required';
        else if (!/^[A-Za-z0-9]{1,20}$/.test(form.gstNumber)) errs.gstNumber = 'Must be up to 20 alphanumeric characters';
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        setLoading(true);
        setErrors({});
        try {
            if (isEdit) {
                await api.put(`/customers/${customer.id}`, form);
                toast.success('Customer updated successfully');
            } else {
                await api.post('/customers', form);
                toast.success('Customer created successfully');
            }
            onSuccess?.();
            onOpenChange(false);
        } catch (err) {
            const errData = err.response?.data?.error;
            if (errData?.fields) {
                setErrors(errData.fields);
            } else {
                toast.error(errData?.message || 'Operation failed');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'Update customer information.' : 'Fill in the details to create a new customer.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="customerName">Customer Name <span className="text-red-500">*</span></Label>
                        <Input
                            id="customerName"
                            value={form.customerName}
                            onChange={e => handleChange('customerName', e.target.value)}
                            placeholder="Enter customer name"
                            className={errors.customerName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        />
                        {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="iecCode">IEC Code <span className="text-red-500">*</span></Label>
                            <Input
                                id="iecCode"
                                value={form.iecCode}
                                onChange={e => handleChange('iecCode', e.target.value.toUpperCase())}
                                placeholder="10 alphanumeric"
                                maxLength={10}
                                className={errors.iecCode ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {errors.iecCode && <p className="text-red-500 text-xs mt-1">{errors.iecCode}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="gstNumber">GST Number <span className="text-red-500">*</span></Label>
                            <Input
                                id="gstNumber"
                                value={form.gstNumber}
                                onChange={e => handleChange('gstNumber', e.target.value.toUpperCase())}
                                placeholder="Up to 20 alphanumeric"
                                maxLength={20}
                                className={errors.gstNumber ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {errors.gstNumber && <p className="text-red-500 text-xs mt-1">{errors.gstNumber}</p>}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="address">Address</Label>
                        <Input
                            id="address"
                            value={form.address}
                            onChange={e => handleChange('address', e.target.value)}
                            placeholder="Enter full address"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={e => handleChange('email', e.target.value)}
                                placeholder="customer@domain.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>DPD Status</Label>
                            <Select value={form.dpd ? 'true' : 'false'} onValueChange={v => handleChange('dpd', v === 'true')}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="false">Non-DPD</SelectItem>
                                    <SelectItem value="true">DPD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="min-w-[100px]">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? 'Update Customer' : 'Create Customer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
