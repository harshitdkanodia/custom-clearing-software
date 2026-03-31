const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function getUsers(req, res) {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, error: { message: 'Failed to fetch users' } });
    }
}

async function createUser(req, res) {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, error: { message: 'All fields are required' } });
        }
        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email: email.toLowerCase(), password: hashed, role },
            select: { id: true, name: true, email: true, role: true, isActive: true },
        });
        res.status(201).json({ success: true, data: user });
    } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ success: false, error: { message: 'Email already exists' } });
        res.status(500).json({ success: false, error: { message: 'Failed to create user' } });
    }
}

async function updateUser(req, res) {
    try {
        const { name, email, role, password } = req.body;
        const id = parseInt(req.params.id);

        const data = { name, role };

        if (email) {
            data.email = email.toLowerCase();
            // Check for duplicate email
            const existing = await prisma.user.findFirst({
                where: { email: data.email, NOT: { id } }
            });
            if (existing) return res.status(409).json({ success: false, error: { message: 'Email already in use by another user' } });
        }

        if (password && password.trim().length > 0) {
            data.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, email: true, role: true, isActive: true },
        });
        res.json({ success: true, data: user });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ success: false, error: { message: 'Failed to update user' } });
    }
}

async function toggleUserStatus(req, res) {
    try {
        const id = parseInt(req.params.id);
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } });

        const updated = await prisma.user.update({
            where: { id },
            data: { isActive: !user.isActive },
            select: { id: true, name: true, email: true, role: true, isActive: true },
        });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: { message: 'Failed to toggle status' } });
    }
}

async function deleteUser(req, res) {
    try {
        const userId = parseInt(req.params.id);
        if (userId === req.user.id) {
            return res.status(400).json({ success: false, error: { message: 'Cannot delete yourself' } });
        }

        const userToDelete = await prisma.user.findUnique({ where: { id: userId } });
        if (userToDelete?.role === 'ADMIN') {
            const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
            if (adminCount <= 1) {
                return res.status(400).json({ success: false, error: { message: 'Cannot delete the last admin' } });
            }
        }

        const logs = await prisma.activityLog.count({ where: { userId } });
        if (logs > 0) {
            return res.status(409).json({ success: false, error: { message: 'Cannot delete: user has activity logs. Deactivate instead.' } });
        }

        await prisma.user.delete({ where: { id: userId } });
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ success: false, error: { message: 'Failed to delete user' } });
    }
}

module.exports = { getUsers, createUser, updateUser, toggleUserStatus, deleteUser };
