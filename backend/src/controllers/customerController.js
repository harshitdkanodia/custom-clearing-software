const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/customers
async function getCustomers(req, res) {
    try {
        const { search } = req.query;
        const where = {};

        if (search) {
            where.OR = [
                { customerName: { contains: search } },
                { iecCode: { contains: search } },
                { gstNumber: { contains: search } },
            ];
        }

        const customers = await prisma.customer.findMany({
            where,
            include: {
                _count: { select: { shipments: true } },
                shipments: { where: { status: 'ACTIVE' }, select: { id: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const result = customers.map(c => ({
            ...c,
            totalShipments: c._count.shipments,
            activeShipments: c.shipments.length,
            _count: undefined,
            shipments: undefined,
        }));

        res.json({ success: true, data: result });
    } catch (err) {
        console.error('Get customers error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch customers' } });
    }
}

// GET /api/customers/search?q=
async function searchCustomers(req, res) {
    try {
        const { q } = req.query;
        if (!q || q.length < 1) {
            return res.json({ success: true, data: [] });
        }

        const customers = await prisma.customer.findMany({
            where: {
                status: 'ACTIVE',
                OR: [
                    { customerName: { contains: q } },
                    { iecCode: { contains: q } },
                    { gstNumber: { contains: q } },
                ],
            },
            take: 10,
            select: { id: true, customerName: true, iecCode: true, gstNumber: true, address: true, email: true, dpd: true },
        });

        res.json({ success: true, data: customers });
    } catch (err) {
        console.error('Search customers error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Search failed' } });
    }
}

// GET /api/customers/:id
async function getCustomer(req, res) {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                shipments: { orderBy: { createdAt: 'desc' } },
                kycDocuments: true,
            },
        });

        if (!customer) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
        }

        res.json({ success: true, data: customer });
    } catch (err) {
        console.error('Get customer error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch customer' } });
    }
}

// POST /api/customers
async function createCustomer(req, res) {
    try {
        const { customerName, iecCode, gstNumber, address, email, dpd } = req.body;
        const errors = {};

        if (!customerName || !customerName.trim()) errors.customerName = 'Customer name is required';
        if (!iecCode || !iecCode.trim()) errors.iecCode = 'IEC Code is required';
        else if (!/^[A-Za-z0-9]{10}$/.test(iecCode)) errors.iecCode = 'IEC Code must be exactly 10 alphanumeric characters';
        if (!gstNumber || !gstNumber.trim()) errors.gstNumber = 'GST Number is required';
        else if (!/^[A-Za-z0-9]{1,20}$/.test(gstNumber)) errors.gstNumber = 'GST Number must be up to 20 alphanumeric characters';

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors } });
        }

        // Check for duplicate IEC or GST
        const existing = await prisma.customer.findFirst({
            where: { OR: [{ iecCode: iecCode.toUpperCase() }, { gstNumber: gstNumber.toUpperCase() }] },
        });

        if (existing) {
            const dupFields = {};
            if (existing.iecCode === iecCode.toUpperCase()) dupFields.iecCode = 'IEC Code already exists';
            if (existing.gstNumber === gstNumber.toUpperCase()) dupFields.gstNumber = 'GST Number already exists';
            return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Duplicate entry found', fields: dupFields } });
        }

        const customer = await prisma.customer.create({
            data: {
                customerName: customerName.trim(),
                iecCode: iecCode.toUpperCase(),
                gstNumber: gstNumber.toUpperCase(),
                address: address?.trim() || null,
                email: email?.trim() || null,
                dpd: dpd || false,
            },
        });

        res.status(201).json({ success: true, data: customer });
    } catch (err) {
        console.error('Create customer error:', err);
        if (err.code === 'P2002') {
            return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'IEC Code or GST Number already exists' } });
        }
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create customer' } });
    }
}

// PUT /api/customers/:id
async function updateCustomer(req, res) {
    try {
        const { customerName, iecCode, gstNumber, address, email, dpd } = req.body;
        const id = parseInt(req.params.id);
        const errors = {};

        if (!customerName || !customerName.trim()) errors.customerName = 'Customer name is required';
        if (!iecCode || !iecCode.trim()) errors.iecCode = 'IEC Code is required';
        else if (!/^[A-Za-z0-9]{10}$/.test(iecCode)) errors.iecCode = 'IEC Code must be exactly 10 alphanumeric characters';
        if (!gstNumber || !gstNumber.trim()) errors.gstNumber = 'GST Number is required';
        else if (!/^[A-Za-z0-9]{1,20}$/.test(gstNumber)) errors.gstNumber = 'GST Number must be up to 20 alphanumeric characters';

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors } });
        }

        // Check duplicate on other customers
        const existing = await prisma.customer.findFirst({
            where: {
                NOT: { id },
                OR: [{ iecCode: iecCode.toUpperCase() }, { gstNumber: gstNumber.toUpperCase() }],
            },
        });

        if (existing) {
            const dupFields = {};
            if (existing.iecCode === iecCode.toUpperCase()) dupFields.iecCode = 'IEC Code already in use';
            if (existing.gstNumber === gstNumber.toUpperCase()) dupFields.gstNumber = 'GST Number already in use';
            return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Duplicate entry found', fields: dupFields } });
        }

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                customerName: customerName.trim(),
                iecCode: iecCode.toUpperCase(),
                gstNumber: gstNumber.toUpperCase(),
                address: address?.trim() || null,
                email: email?.trim() || null,
                dpd: dpd ?? false,
            },
        });

        res.json({ success: true, data: customer });
    } catch (err) {
        console.error('Update customer error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update customer' } });
    }
}

// DELETE /api/customers/:id
async function deleteCustomer(req, res) {
    try {
        const id = parseInt(req.params.id);

        const activeShipments = await prisma.shipment.count({
            where: { customerId: id, status: { not: 'CLOSED' } },
        });

        if (activeShipments > 0) {
            return res.status(409).json({
                success: false,
                error: { code: 'HAS_ACTIVE_SHIPMENTS', message: `Cannot delete: ${activeShipments} active shipment(s) linked to this customer` },
            });
        }

        await prisma.customer.delete({ where: { id } });
        res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (err) {
        console.error('Delete customer error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete customer' } });
    }
}

// PATCH /api/customers/:id/status
async function toggleCustomerStatus(req, res) {
    try {
        const id = parseInt(req.params.id);
        const customer = await prisma.customer.findUnique({ where: { id } });

        if (!customer) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
        }

        const updated = await prisma.customer.update({
            where: { id },
            data: { status: customer.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' },
        });

        res.json({ success: true, data: updated });
    } catch (err) {
        console.error('Toggle status error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update status' } });
    }
}

module.exports = { getCustomers, searchCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, toggleCustomerStatus };
