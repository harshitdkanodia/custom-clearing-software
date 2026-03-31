const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// POST /api/auth/login
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' }
            });
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                error: { code: 'ACCOUNT_DISABLED', message: 'Your account has been deactivated' }
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            data: {
                token,
                user: { id: user.id, name: user.name, email: user.email, role: user.role }
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' }
        });
    }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Email is required' }
            });
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'No account found with this email' }
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.user.update({
            where: { id: user.id },
            data: { otp, otpExpiry }
        });

        const { sendOtpEmail } = require('../services/emailService');
        await sendOtpEmail(user.email, otp);

        res.json({ success: true, message: 'OTP sent to your email. Please check your Inbox.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' }
        });
    }
}

// POST /api/auth/verify-otp
async function verifyOtp(req, res) {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Email and OTP are required' }
            });
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

        if (!user || user.otp !== otp) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_OTP', message: 'Invalid OTP' }
            });
        }

        if (new Date() > user.otpExpiry) {
            return res.status(400).json({
                success: false,
                error: { code: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new one.' }
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');

        await prisma.user.update({
            where: { id: user.id },
            data: { resetToken, otp: null, otpExpiry: null }
        });

        res.json({ success: true, data: { resetToken } });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' }
        });
    }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Reset token and new password are required' }
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters' }
            });
        }

        const user = await prisma.user.findFirst({ where: { resetToken } });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' }
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword, resetToken: null }
        });

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' }
        });
    }
}

// GET /api/auth/me
async function getMe(req, res) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true, isActive: true }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'User not found' }
            });
        }

        res.json({ success: true, data: { user } });
    } catch (err) {
        console.error('Get me error:', err);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' }
        });
    }
}

module.exports = { login, forgotPassword, verifyOtp, resetPassword, getMe };
