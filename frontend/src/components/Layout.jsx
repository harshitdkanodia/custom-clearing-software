import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { getUser, logout, hasRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard, Users, Ship, FileText, FolderOpen, Receipt,
    Truck, BarChart2, Settings, LogOut, ChevronLeft, ChevronRight,
    Package, ClipboardList, Archive, Bell, Menu, X
} from 'lucide-react';

const NAV_SECTIONS = [
    {
        title: 'Main',
        items: [
            { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
        ]
    },
    {
        title: 'Operations',
        items: [
            { to: '/customers', icon: Users, label: 'Customers' },
            { to: '/shipments', icon: Ship, label: 'Shipments' },
        ]
    },
    {
        title: 'Documents',
        items: [
            { to: '/do-documents', icon: FolderOpen, label: 'DO Documents' },
            { to: '/filing-documents', icon: FileText, label: 'Filing Documents' },
            { to: '/kyc-documents', icon: ClipboardList, label: 'KYC Documents' },
        ]
    },
    {
        title: 'Finance',
        items: [
            { to: '/billing', icon: Receipt, label: 'Billing' },
            { to: '/courier', icon: Truck, label: 'Courier' },
            { to: '/closed-jobs', icon: Archive, label: 'Closed Jobs' },
        ]
    },
    {
        title: 'Insights',
        items: [
            { to: '/reports', icon: BarChart2, label: 'Reports' },
        ]
    },
];

const ADMIN_NAV = {
    title: 'Admin',
    items: [
        { to: '/settings', icon: Settings, label: 'Settings' },
    ]
};

export default function Layout() {
    const navigate = useNavigate();
    const user = getUser();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const allSections = hasRole('ADMIN') ? [...NAV_SECTIONS, ADMIN_NAV] : NAV_SECTIONS;

    function handleLogout() {
        logout();
        navigate('/login');
    }

    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo & Toggle */}
            <div className={`flex items-center justify-between px-4 py-5 border-b border-white/10 ${collapsed ? 'flex-col gap-4 px-2' : ''}`}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                        <Ship className="h-4 w-4 text-white" />
                    </div>
                    {!collapsed && (
                        <div className="truncate">
                            <p className="text-white font-bold text-sm leading-none">CHA System</p>
                            <p className="text-blue-200 text-[10px] mt-1 leading-none">Shipment Management</p>
                        </div>
                    )}
                </div>

                {/* Desktop Toggle Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-blue-100 transition-colors shrink-0"
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
                {allSections.map(section => (
                    <div key={section.title}>
                        {!collapsed && (
                            <p className="text-blue-300/60 text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5">
                                {section.title}
                            </p>
                        )}
                        <ul className="space-y-0.5">
                            {section.items.map(item => {
                                const Icon = item.icon;
                                return (
                                    <li key={item.to}>
                                        <NavLink
                                            to={item.to}
                                            end={item.exact}
                                            onClick={() => setMobileOpen(false)}
                                            className={({ isActive }) =>
                                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive
                                                    ? 'bg-white/15 text-white font-semibold shadow-sm'
                                                    : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                                                } ${collapsed ? 'justify-center px-2' : ''}`
                                            }
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            {!collapsed && <span>{item.label}</span>}
                                        </NavLink>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* User Footer */}
            <div className={`border-t border-white/10 p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
                {collapsed ? (
                    <>
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1">
                            {initials}
                        </div>
                        <button onClick={handleLogout} title="Logout" className="text-blue-200 hover:text-white transition-colors">
                            <LogOut className="h-4 w-4" />
                        </button>
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                            <p className="text-blue-200 text-[10px] truncate">{user?.role?.replace('_', ' ')}</p>
                        </div>
                        <button onClick={handleLogout} title="Logout" className="text-blue-200 hover:text-red-300 transition-colors p-1 rounded">
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            )}

            {/* Sidebar — Desktop */}
            <aside
                className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 ${collapsed ? 'w-[64px]' : 'w-[240px]'}`}
                style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%)' }}
            >
                <SidebarContent />
            </aside>

            {/* Sidebar — Mobile */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-[220px] flex flex-col lg:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
                style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%)' }}
            >
                <SidebarContent />
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Bar */}
                <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 px-3 sm:px-4 shrink-0">
                    <button
                        className="lg:hidden text-gray-500 hover:text-gray-700"
                        onClick={() => setMobileOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                            <span className="font-medium text-gray-900">{user?.name}</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                {user?.role?.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-3 sm:p-4">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
