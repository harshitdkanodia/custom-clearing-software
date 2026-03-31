import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { setAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Ship, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Forgot password state
    const [showForgot, setShowForgot] = useState(false);
    const [forgotStep, setForgotStep] = useState(1); // 1=email, 2=otp, 3=newPassword
    const [forgotEmail, setForgotEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [forgotError, setForgotError] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSuccess, setForgotSuccess] = useState('');

    async function handleLogin(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/auth/login', { email, password });
            const { token, user } = res.data.data;
            setAuth(token, user);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            const msg = err.response?.data?.error?.message || 'Login failed. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    async function handleForgotEmail(e) {
        e.preventDefault();
        setForgotError('');
        setForgotLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: forgotEmail });
            setForgotStep(2);
            setForgotSuccess('OTP sent to your email. Please check your Inbox.');
        } catch (err) {
            setForgotError(err.response?.data?.error?.message || 'Failed to send OTP');
        } finally {
            setForgotLoading(false);
        }
    }

    async function handleVerifyOtp(e) {
        e.preventDefault();
        setForgotError('');
        setForgotLoading(true);
        try {
            const res = await api.post('/auth/verify-otp', { email: forgotEmail, otp });
            setResetToken(res.data.data.resetToken);
            setForgotStep(3);
            setForgotSuccess('');
        } catch (err) {
            setForgotError(err.response?.data?.error?.message || 'Invalid OTP');
        } finally {
            setForgotLoading(false);
        }
    }

    async function handleResetPassword(e) {
        e.preventDefault();
        setForgotError('');
        setForgotLoading(true);
        try {
            await api.post('/auth/reset-password', { resetToken, newPassword });
            setForgotSuccess('Password reset successfully! You can now login.');
            setTimeout(() => {
                setShowForgot(false);
                resetForgotState();
            }, 2000);
        } catch (err) {
            setForgotError(err.response?.data?.error?.message || 'Failed to reset password');
        } finally {
            setForgotLoading(false);
        }
    }

    function resetForgotState() {
        setForgotStep(1);
        setForgotEmail('');
        setOtp('');
        setResetToken('');
        setNewPassword('');
        setForgotError('');
        setForgotSuccess('');
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg mb-4">
                        <Ship className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">CHA System</h1>
                    <p className="text-gray-500 mt-1">Shipment Management Platform</p>
                </div>

                {/* Login Card */}
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-xl text-center">Welcome back</CardTitle>
                        <CardDescription className="text-center">
                            Enter your credentials to access the system
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@cha.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <button
                                        type="button"
                                        onClick={() => { setShowForgot(true); if (email) setForgotEmail(email); }}
                                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        className="h-11 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign in'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-gray-400 mt-6">
                    © 2026 CHA Shipment Management System
                </p>
            </div>

            {/* Forgot Password Dialog */}
            <Dialog open={showForgot} onOpenChange={(open) => { setShowForgot(open); if (!open) resetForgotState(); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {forgotStep === 1 && 'Reset Password'}
                            {forgotStep === 2 && 'Enter OTP'}
                            {forgotStep === 3 && 'New Password'}
                        </DialogTitle>
                        <DialogDescription>
                            {forgotStep === 1 && 'Enter your email to receive a verification code.'}
                            {forgotStep === 2 && 'Enter the 6-digit code sent to your email.'}
                            {forgotStep === 3 && 'Enter your new password.'}
                        </DialogDescription>
                    </DialogHeader>

                    {forgotError && (
                        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
                            {forgotError}
                        </div>
                    )}
                    {forgotSuccess && (
                        <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-lg border border-green-200">
                            {forgotSuccess}
                        </div>
                    )}

                    {forgotStep === 1 && (
                        <form onSubmit={handleForgotEmail} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="forgotEmail">Email</Label>
                                <Input
                                    id="forgotEmail"
                                    type="email"
                                    placeholder="you@cha.com"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={forgotLoading}>
                                {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
                            </Button>
                        </form>
                    )}

                    {forgotStep === 2 && (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="otp">Verification Code</Label>
                                <Input
                                    id="otp"
                                    type="text"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    required
                                    className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={forgotLoading}>
                                {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify OTP'}
                            </Button>
                            <button
                                type="button"
                                onClick={() => { setForgotStep(1); setForgotError(''); }}
                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mx-auto"
                            >
                                <ArrowLeft className="h-3 w-3" /> Back
                            </button>
                        </form>
                    )}

                    {forgotStep === 3 && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Min 6 characters"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={forgotLoading}>
                                {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
                            </Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
