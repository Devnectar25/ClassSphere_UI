'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Users, Building2, BookOpen, Layers,
    ClipboardCheck, CreditCard, RotateCcw, Landmark, Bell,
    BarChart3, Settings, ShieldCheck, FileText, ChevronLeft, ChevronRight, X
} from 'lucide-react';

export const ADMIN_SIDEBAR_TOGGLE = 'cs:toggle-admin-sidebar';

interface NavItem {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
}

interface NavGroup {
    group: string;
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    {
        group: 'Overview',
        items: [
            { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        ],
    },
    {
        group: 'Ecosystem',
        items: [
            { href: '/admin/users', label: 'Users', icon: Users },
            { href: '/admin/tenants', label: 'Academies', icon: Building2 },
            { href: '/admin/courses', label: 'Courses', icon: BookOpen },
            { href: '/admin/categories', label: 'Categories', icon: Layers },
            { href: '/admin/registrations', label: 'Registrations', icon: ClipboardCheck },
        ],
    },
    {
        group: 'Finance',
        items: [
            { href: '/admin/payments', label: 'Payments', icon: CreditCard },
            { href: '/admin/refunds', label: 'Refunds', icon: RotateCcw },
            { href: '/admin/payouts', label: 'Payouts & Settlements', icon: Landmark },
        ],
    },
    {
        group: 'Operations',
        items: [
            { href: '/admin/notifications', label: 'Notifications', icon: Bell },
            { href: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
        ],
    },
    {
        group: 'Governance',
        items: [
            { href: '/admin/settings', label: 'Platform Settings', icon: Settings },
            { href: '/admin/roles', label: 'Admin Roles & Permissions', icon: ShieldCheck },
            { href: '/admin/audit', label: 'Audit Logs', icon: FileText },
        ],
    },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const toggle = () => setMobileOpen((prev) => !prev);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileOpen(false);
        };
        window.addEventListener(ADMIN_SIDEBAR_TOGGLE, toggle);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener(ADMIN_SIDEBAR_TOGGLE, toggle);
            window.removeEventListener('keydown', onKey);
        };
    }, []);

    // Close mobile drawer on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const isItemActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar Shell — fixed on left side of screen */}
            <aside
                className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200/90 transition-all duration-300 lg:static lg:z-30 h-full shrink-0 ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                } ${collapsed ? 'w-20' : 'w-64'}`}
            >
                {/* Header branding on mobile / drawer close */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:hidden">
                    <span className="font-bold text-sm text-slate-900">Platform Admin Menu</span>
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Navigation items list */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 select-none no-scrollbar">
                    {navGroups.map((group) => (
                        <div key={group.group} className="space-y-1">
                            {!collapsed && (
                                <span className="block px-3 text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                                    {group.group}
                                </span>
                            )}
                            {group.items.map((item) => {
                                const active = isItemActive(item.href);
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        title={item.label}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                            active
                                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-bold'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                                        } ${collapsed ? 'justify-center px-0' : ''}`}
                                    >
                                        <Icon size={17} className={`shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                                        {!collapsed && <span className="truncate">{item.label}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Footer collapse button (desktop only) */}
                <div className="hidden lg:flex items-center justify-end p-3 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>
            </aside>
        </>
    );
}
