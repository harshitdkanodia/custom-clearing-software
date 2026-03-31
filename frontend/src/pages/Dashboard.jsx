import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getUser } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
    Ship, Package, Receipt, Truck, CheckCircle2,
    AlertTriangle, Bell, FileText, FileCheck, ClipboardList,
    ArrowRight, TrendingUp, X
} from 'lucide-react';

const STATUS_CARDS = [
    {
        key: 'totalShipments', label: 'Total Shipments', icon: Ship,
        bg: 'bg-gradient-to-br from-blue-500 to-blue-700', path: '/shipments'
    },
    {
        key: 'activeShipments', label: 'Active Jobs', icon: Package,
        bg: 'bg-gradient-to-br from-emerald-500 to-emerald-700', path: '/shipments?status=ACTIVE'
    },
    {
        key: 'readyForBilling', label: 'Ready for Billing', icon: Receipt,
        bg: 'bg-gradient-to-br from-amber-500 to-orange-600', path: '/billing'
    },
    {
        key: 'readyForCourier', label: 'Ready for Courier', icon: Truck,
        bg: 'bg-gradient-to-br from-violet-500 to-purple-700', path: '/courier'
    },
    {
        key: 'closedJobs', label: 'Closed Jobs', icon: CheckCircle2,
        bg: 'bg-gradient-to-br from-slate-500 to-slate-700', path: '/closed-jobs'
    },
];

const PENDING_TASKS = [
    { key: 'pendingDo', label: 'Pending DO Docs', icon: FileText, color: 'blue', path: '/do-documents' },
    { key: 'pendingFiling', label: 'Pending Filing', icon: FileCheck, color: 'indigo', path: '/filing-documents' },
    { key: 'pendingKyc', label: 'KYC Incomplete', icon: ClipboardList, color: 'rose', path: '/kyc-documents' },
];

const TASK_COLORS = {
    blue: { badge: 'bg-blue-100 text-blue-700 ring-blue-200', dot: 'bg-blue-500', icon: 'text-blue-500 bg-blue-50' },
    indigo: { badge: 'bg-indigo-100 text-indigo-700 ring-indigo-200', dot: 'bg-indigo-500', icon: 'text-indigo-500 bg-indigo-50' },
    rose: { badge: 'bg-rose-100 text-rose-700 ring-rose-200', dot: 'bg-rose-500', icon: 'text-rose-500 bg-rose-50' },
};

export default function Dashboard() {
    const navigate = useNavigate();
    const user = getUser();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

    async function load() {
        try {
            const res = await api.get('/dashboard/counts');
            setData(res.data.data);
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        const interval = setInterval(load, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, []);

    async function dismissAlert(alertId) {
        setDismissedAlerts(prev => new Set([...prev, alertId]));
        try {
            await api.post(`/dashboard/alerts/${alertId}/read`);
        } catch (err) { /* silent */ }
    }

    const visibleAlerts = data?.alerts?.filter(a => !dismissedAlerts.has(a.id)) || [];

    return (
        <div className="space-y-3">
            {/* Welcome Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                {!loading && data && (
                    <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 bg-white border rounded-lg px-3 py-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span>{data.activeShipments} active jobs in progress</span>
                    </div>
                )}
            </div>

            {/* Main Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {STATUS_CARDS.map(card => {
                    const Icon = card.icon;
                    const count = data?.[card.key] ?? 0;
                    return (
                        <button
                            key={card.key}
                            onClick={() => navigate(card.path)}
                            className={`relative overflow-hidden group rounded-xl p-3 text-white transition-all hover:scale-[1.01] hover:shadow-lg active:scale-95 flex flex-col justify-between min-h-[100px] shadow-sm ${card.bg}`}
                        >
                            <div className="flex items-start justify-between w-full">
                                <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/10">
                                    <Icon className="h-4 w-4 text-white" />
                                </div>
                                <div className="p-1 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </div>

                            <div className="mt-2">
                                {loading ? (
                                    <Skeleton className="h-9 w-16 bg-white/20 rounded animate-pulse" />
                                ) : (
                                    <h3 className="text-2xl font-bold tracking-tight">{count}</h3>
                                )}
                                <p className="text-[10px] font-semibold text-white/80 uppercase tracking-wider mt-0.5">{card.label}</p>
                            </div>

                            {/* Subtle background decoration */}
                            <Icon className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5 rotate-12 group-hover:scale-110 transition-transform" />
                        </button>
                    );
                })}
            </div>

            {/* Pending Tasks Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PENDING_TASKS.map(task => {
                    const Icon = task.icon;
                    const colors = TASK_COLORS[task.color];
                    const count = data?.[task.key] ?? 0;
                    return (
                        <button
                            key={task.key}
                            onClick={() => navigate(task.path)}
                            className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg p-2 hover:shadow-md hover:border-gray-200 transition-all text-left group"
                        >
                            <div className={`p-2 rounded-xl ${colors.icon}`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{task.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">Click to review</p>
                            </div>
                            {loading ? (
                                <Skeleton className="h-7 w-10" />
                            ) : (
                                <span className={`text-base font-bold px-3 py-1 rounded-full ring-1 ring-inset ${colors.badge} ${count > 0 ? '' : 'opacity-50'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Alerts Panel */}
            <Card className="border-gray-100">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-amber-500" />
                        <h2 className="text-sm font-semibold text-gray-900">Live Alerts</h2>
                        {visibleAlerts.length > 0 && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                {visibleAlerts.length}
                            </span>
                        )}
                    </div>
                    {visibleAlerts.length > 0 && (
                        <button
                            onClick={async () => {
                                await api.post('/dashboard/alerts/mark-all-read');
                                setDismissedAlerts(new Set(data?.alerts?.map(a => a.id) || []));
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Dismiss all
                        </button>
                    )}
                </div>
                <CardContent className="p-2">
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                        </div>
                    ) : visibleAlerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <CheckCircle2 className="h-8 w-8 mb-2 text-green-400" />
                            <p className="text-sm font-medium text-gray-500">All clear — no active alerts</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {visibleAlerts.map(alert => (
                                <div key={alert.id} className="flex items-start gap-3 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {alert.shipment?.onsJobNumber} · {new Date(alert.createdAt).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-blue-600 hover:text-blue-800 px-2"
                                            onClick={() => navigate(`/shipments/${alert.shipmentId}`)}
                                        >
                                            View
                                        </Button>
                                        <button
                                            onClick={() => dismissAlert(alert.id)}
                                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
