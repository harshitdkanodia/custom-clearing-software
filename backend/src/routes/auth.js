const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
    login,
    forgotPassword,
    verifyOtp,
    resetPassword,
    getMe
} = require('../controllers/authController');

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.get('/me', verifyToken, getMe);

module.exports = router;
