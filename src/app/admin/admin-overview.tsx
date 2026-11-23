'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api, formatMoney, useApi, type Plan } from '@/lib/api';
import {
    Building2, CreditCard, Users, ShieldCheck, Activity,
    Plus, RefreshCw, CheckCircle, Clock, BookOpen, ClipboardCheck,
    ArrowUpRight, Sparkles, AlertCircle
} from 'lucide-react';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';

interface DashboardTelemetry {
    totalUsers: number;
    totalAcademies: number;
    verifiedAcademies: number;
    pendingAcademies: number;
    totalCourses: number;
    totalRegistrations: number;
    periodRegistrations?: number;
    successfulPayments: number;
    periodPayments?: number;
    totalRevenue: number;
    periodRevenue?: number;
    platformCommission: number;
    periodCommission?: number;
    recentTransactions: {
        paymentId: string;
        description: string;
        amount: number;
        paymentMethod: string;
        createdAt: string;
        status: string;
        academyName: string;
    }[];
    recentRegistrations: {
        registrationId: string;
        status: string;
        enrolledAt: string;
        learnerName: string;
        courseName: string;
        academyName: string;
    }[];
    recentActivities: {
        logId: string;
        action: string;
        entityType: string;
        correlationId: string;
        createdAt: string;
        actorName: string;
    }[];
    pendingVerifications: {
        tenantId: string;
        name: string;
        academyType: string;
        createdAt: string;
        adminEmail: string;
    }[];
}

const ACADEMY_TYPES = ['Tuition', 'Music', 'Sports', 'Dance', 'Arts', 'Test Prep', 'Language', 'Other'];
const emptyAcademy = { name: '', slug: '', academyType: 'Tuition', planTier: 'Professional', adminName: '', adminEmail: '', adminPassword: '' };
const inputClass = 'w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all';

export default function PlatformAdminOverview() {
    const [data, setData] = useState<DashboardTelemetry | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'year'>('month');
    const [showOnboardModal, setShowOnboardModal] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Provisioning form
    const [academy, setAcademy] = useState(emptyAcademy);
    const [submitting, setSubmitting] = useState(false);
    const { data: plans } = useApi<Plan[]>('/plans');
    const form = useFormValidation(academy, {
        name: [rules.required('Academy name'), rules.minLength('Academy name', 2), rules.maxLength('Academy name', 100)],
        slug: [rules.required('Domain slug'), rules.minLength('Domain slug', 3), rules.maxLength('Domain slug', 50), rules.slug()],
        academyType: [rules.required('Academy type')],
        planTier: [rules.required('Subscription plan')],
        adminName: [rules.required('Admin full name'), rules.minLength('Admin full name', 2), rules.maxLength('Admin full name', 100)],
        adminEmail: [rules.required('Admin email'), rules.email(), rules.maxLength('Admin email', 254)],
        adminPassword: [rules.required('Initial password'), rules.minLength('Initial password', 8), rules.maxLength('Initial password', 64)],
    });

    const closeOnboardModal = () => {
        setShowOnboardModal(false);
        setAcademy(emptyAcademy);
        form.reset();
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const fetchTelemetry = useCallback(async (tf = timeframe) => {
        try {
            setLoading(true);
            const res = await api<DashboardTelemetry>(`/platform/telemetry?timeframe=${tf}&_t=${Date.now()}`);
            setData(res);
        } catch {
            showToast('Unable to fetch live platform telemetry.');
        } finally {
            setLoading(false);
        }
    }, [timeframe]);

    useEffect(() => {
        fetchTelemetry(timeframe);
    }, [fetchTelemetry, timeframe]);

    const handleRefresh = async () => {
        if (refreshing) return;
        try {
            setRefreshing(true);
            const minSpin = new Promise((resolve) => setTimeout(resolve, 500));
            const res = await api<DashboardTelemetry>(`/platform/telemetry?timeframe=${timeframe}&_t=${Date.now()}`);
            setData(res);
            await minSpin;
            showToast(`Dashboard telemetry refreshed for ${timeframe.toUpperCase()}.`);
        } catch (err: any) {
            showToast(err?.message || 'Unable to fetch live platform telemetry.');
        } finally {
            setRefreshing(false);
        }
    };

    const handleTimeframeChange = async (t: 'today' | 'week' | 'month' | 'year') => {
        if (t === timeframe && !refreshing) {
            handleRefresh();
            return;
        }
        setTimeframe(t);
        try {
            setRefreshing(true);
            const minSpin = new Promise((resolve) => setTimeout(resolve, 400));
            const res = await api<DashboardTelemetry>(`/platform/telemetry?timeframe=${t}&_t=${Date.now()}`);
            setData(res);
            await minSpin;
            showToast(`Filtered dashboard by: ${t.toUpperCase()}`);
        } catch (err: any) {
            showToast(err?.message || 'Failed to filter telemetry.');
        } finally {
            setRefreshing(false);
        }
    };

    const handleOnboardTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.validate()) return;
        setSubmitting(true);
        try {
            const payload = {
                ...academy,
                name: academy.name.trim(),
                slug: academy.slug.trim(),
                adminName: academy.adminName.trim(),
                adminEmail: academy.adminEmail.trim().toLowerCase(),
            };
            await api('/tenants', {
                method: 'POST',
                body: JSON.stringify({ ...payload, currency: 'INR', timezone: 'Asia/Kolkata' }),
            });
            showToast(`Academy "${payload.name}" created. Admin can sign in as ${payload.adminEmail}.`);
            closeOnboardModal();
            fetchTelemetry();
        } catch (err) {
            showToast((err as Error).message || 'Academy onboarding failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const kpiCards = [
        {
            label: 'Total Users',
            value: data?.totalUsers ?? 0,
            icon: Users,
            href: '/admin/users',
            color: 'text-blue-600 bg-blue-50 border-blue-100',
            sub: 'Learners, staff & owners',
        },
        {
            label: 'Total Academies',
            value: data?.totalAcademies ?? 0,
            icon: Building2,
            href: '/admin/tenants',
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            sub: `${data?.verifiedAcademies ?? 0} verified active`,
        },
        {
            label: 'Verified Academies',
            value: data?.verifiedAcademies ?? 0,
            icon: CheckCircle,
            href: '/admin/tenants?status=verified',
            color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            sub: 'Publishing enabled',
        },
        {
            label: 'Pending Academies',
            value: data?.pendingAcademies ?? 0,
            icon: Clock,
            href: '/admin/tenants?status=pending',
            color: 'text-amber-600 bg-amber-50 border-amber-100',
            sub: 'Awaiting doc review',
        },
        {
            label: 'Total Courses',
            value: data?.totalCourses ?? 0,
            icon: BookOpen,
            href: '/admin/courses',
            color: 'text-purple-600 bg-purple-50 border-purple-100',
            sub: 'Published & draft courses',
        },
        {
            label: 'Total Registrations',
            value: data?.totalRegistrations ?? 0,
            icon: ClipboardCheck,
            href: '/admin/registrations',
            color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
            sub: `${data?.periodRegistrations ?? data?.totalRegistrations ?? 0} in ${timeframe}`,
        },
        {
            label: 'Successful Payments',
            value: data?.successfulPayments ?? 0,
            icon: CreditCard,
            href: '/admin/payments',
            color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            sub: `${data?.periodPayments ?? data?.successfulPayments ?? 0} in ${timeframe}`,
        },
        {
            label: 'Platform Commission',
            value: formatMoney(data?.platformCommission ?? 0),
            icon: Activity,
            href: '/admin/payments',
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            sub: `${formatMoney(data?.periodRevenue ?? data?.totalRevenue ?? 0)} gross in ${timeframe}`,
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold">
                    <Sparkles size={16} className="text-amber-400 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-200/70">
                            ClassShare Global Control Plane
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">
                        Platform Executive Dashboard
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Real-time telemetry across multi-tenant academies, courses, registrations, and settlements.
                    </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                    {/* Timeframe selector */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs text-xs font-semibold shrink-0">
                        {(['today', 'week', 'month', 'year'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => handleTimeframeChange(t)}
                                disabled={refreshing}
                                className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                                    timeframe === t ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors shadow-2xs hover:border-slate-300 cursor-pointer disabled:opacity-70 whitespace-nowrap shrink-0"
                        title="Refresh live metrics from database"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
                        <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowOnboardModal(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold tracking-wide shadow-sm shadow-indigo-600/30 hover:shadow-md hover:shadow-indigo-600/40 active:scale-[0.98] transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
                        title="Provision a new academy workspace"
                    >
                        <span className="w-4 h-4 rounded-md bg-white/20 flex items-center justify-center shrink-0">
                            <Plus size={12} strokeWidth={3} className="text-white" />
                        </span>
                        <span>Create Academy</span>
                    </button>
                </div>
            </div>

            {/* 8 Metric KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((c) => {
                    const Icon = c.icon;
                    return (
                        <Link
                            key={c.label}
                            href={c.href}
                            className="group p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{c.label}</span>
                                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${c.color} group-hover:scale-105 transition-transform`}>
                                    <Icon size={18} />
                                </div>
                            </div>
                            <div className="mt-3">
                                <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono tracking-tight group-hover:text-indigo-600 transition-colors">
                                    {c.value}
                                </span>
                                <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-[11px] text-slate-400 font-medium">{c.sub}</span>
                                    <ArrowUpRight size={14} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Pending Academy Verifications Banner */}
            {data?.pendingVerifications && data.pendingVerifications.length > 0 && (
                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-slate-900">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={18} className="text-amber-600" />
                            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                                Academy Verification Requests Awaiting Review ({data.pendingVerifications.length})
                            </h3>
                        </div>
                        <Link href="/admin/tenants?status=pending" className="text-xs font-bold text-amber-700 hover:text-amber-900 underline">
                            View All Requests &rarr;
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {data.pendingVerifications.map((pv) => (
                            <div key={pv.tenantId} className="p-3.5 bg-white rounded-xl border border-amber-100 shadow-2xs flex flex-col justify-between">
                                <div>
                                    <div className="font-bold text-xs text-slate-900 truncate">{pv.name}</div>
                                    <div className="text-[11px] text-slate-500">{pv.academyType} &bull; {pv.adminEmail}</div>
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                                    <span className="text-slate-400">{new Date(pv.createdAt).toLocaleDateString()}</span>
                                    <Link href="/admin/tenants" className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold transition-colors">
                                        Review Academy
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Two Column Grid: Recent Registrations & Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Registrations */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-2">
                            <ClipboardCheck size={16} className="text-indigo-600" />
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Recent Registrations</h3>
                        </div>
                        <Link href="/admin/registrations" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                            View all &rarr;
                        </Link>
                    </div>
                    <div className="space-y-2.5">
                        {!data?.recentRegistrations || data.recentRegistrations.length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">No recent learner registrations recorded.</p>
                        ) : (
                            data.recentRegistrations.map((rg, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 text-xs">
                                    <div>
                                        <div className="font-bold text-slate-900">{rg.learnerName}</div>
                                        <div className="text-[11px] text-slate-500">{rg.courseName} &bull; {rg.academyName}</div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] capitalize border border-emerald-200/70">
                                        {rg.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-2">
                            <CreditCard size={16} className="text-emerald-600" />
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Recent Transactions</h3>
                        </div>
                        <Link href="/admin/payments" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                            View all &rarr;
                        </Link>
                    </div>
                    <div className="space-y-2.5">
                        {!data?.recentTransactions || data.recentTransactions.length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">No financial gateway transactions recorded yet.</p>
                        ) : (
                            data.recentTransactions.map((tx, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 text-xs">
                                    <div>
                                        <div className="font-bold text-slate-900">{formatMoney(tx.amount)}</div>
                                        <div className="text-[11px] text-slate-500">{tx.academyName ?? 'ClassSphere Platform'} &bull; {tx.paymentMethod ?? 'Gateway'}</div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] capitalize border border-indigo-200/70">
                                        {tx.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Platform Activities Audit Feed */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-slate-700" />
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Live Immutable Activity Log</h3>
                    </div>
                    <Link href="/admin/audit" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                        View Audit Trail &rarr;
                    </Link>
                </div>
                <div className="divide-y divide-slate-100">
                    {!data?.recentActivities || data.recentActivities.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">No compliance audit events recorded.</p>
                    ) : (
                        data.recentActivities.map((act) => (
                            <div key={act.logId} className="py-2.5 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700 text-[10px] font-bold">
                                        {act.action}
                                    </span>
                                    <span className="text-slate-600">
                                        by <strong className="text-slate-800">{act.actorName}</strong> on {act.entityType}
                                    </span>
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">
                                    {new Date(act.createdAt).toLocaleTimeString()}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Onboard Academy Modal */}
            {showOnboardModal && (
                <Modal title="Provision New Academy" onClose={closeOnboardModal} maxWidth="520px">
                    <form onSubmit={handleOnboardTenant} noValidate className="space-y-4 text-xs font-sans">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Academy Name <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    maxLength={100}
                                    placeholder="e.g. Skyline Academy"
                                    value={academy.name}
                                    onChange={(e) => setAcademy({ ...academy, name: e.target.value })}
                                    onBlur={form.touch('name')}
                                    aria-invalid={!!form.error('name')}
                                    style={invalidStyle(form.error('name'))}
                                    className={inputClass}
                                />
                                <FieldError message={form.error('name')} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Domain Slug <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    maxLength={50}
                                    placeholder="e.g. skyline"
                                    value={academy.slug}
                                    onChange={(e) => setAcademy({ ...academy, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                    onBlur={form.touch('slug')}
                                    aria-invalid={!!form.error('slug')}
                                    style={invalidStyle(form.error('slug'))}
                                    className={inputClass}
                                />
                                <FieldError message={form.error('slug')} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Academy Type <span className="text-rose-500">*</span></label>
                                <select
                                    value={academy.academyType}
                                    onChange={(e) => setAcademy({ ...academy, academyType: e.target.value })}
                                    onBlur={form.touch('academyType')}
                                    aria-invalid={!!form.error('academyType')}
                                    style={invalidStyle(form.error('academyType'))}
                                    className={inputClass}
                                >
                                    {ACADEMY_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                                <FieldError message={form.error('academyType')} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Subscription Plan <span className="text-rose-500">*</span></label>
                                <select
                                    value={academy.planTier}
                                    onChange={(e) => setAcademy({ ...academy, planTier: e.target.value })}
                                    onBlur={form.touch('planTier')}
                                    aria-invalid={!!form.error('planTier')}
                                    style={invalidStyle(form.error('planTier'))}
                                    className={inputClass}
                                >
                                    {!plans?.some((p) => p.planTier === academy.planTier) && (
                                        <option value="">Select a plan</option>
                                    )}
                                    {plans?.map((p) => (
                                        <option key={p.planTier} value={p.planTier}>{p.planTier} ({formatMoney(p.priceMonthly)})</option>
                                    ))}
                                </select>
                                <FieldError message={form.error('planTier')} />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3 space-y-3">
                            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">Owner / Admin Sign-in</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Admin Full Name <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={100}
                                        placeholder="Jane Doe"
                                        value={academy.adminName}
                                        onChange={(e) => setAcademy({ ...academy, adminName: e.target.value })}
                                        onBlur={form.touch('adminName')}
                                        aria-invalid={!!form.error('adminName')}
                                        style={invalidStyle(form.error('adminName'))}
                                        className={inputClass}
                                    />
                                    <FieldError message={form.error('adminName')} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Admin Email <span className="text-rose-500">*</span></label>
                                    <input
                                        type="email"
                                        required
                                        maxLength={254}
                                        placeholder="admin@academy.com"
                                        value={academy.adminEmail}
                                        onChange={(e) => setAcademy({ ...academy, adminEmail: e.target.value })}
                                        onBlur={form.touch('adminEmail')}
                                        aria-invalid={!!form.error('adminEmail')}
                                        style={invalidStyle(form.error('adminEmail'))}
                                        className={inputClass}
                                    />
                                    <FieldError message={form.error('adminEmail')} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password <span className="text-rose-500">*</span></label>
                                <input
                                    type="password"
                                    required
                                    maxLength={64}
                                    autoComplete="new-password"
                                    placeholder="8 to 64 characters"
                                    value={academy.adminPassword}
                                    onChange={(e) => setAcademy({ ...academy, adminPassword: e.target.value })}
                                    onBlur={form.touch('adminPassword')}
                                    aria-invalid={!!form.error('adminPassword')}
                                    style={invalidStyle(form.error('adminPassword'))}
                                    className={inputClass}
                                />
                                <FieldError message={form.error('adminPassword')} />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={closeOnboardModal}
                                disabled={submitting}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm shadow-indigo-600/25 hover:shadow-md hover:shadow-indigo-600/35 transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
                            >
                                {submitting ? <>Provisioning… <RefreshCw size={13} className="animate-spin" /></> : (
                                    <>
                                        <Plus size={14} strokeWidth={2.5} />
                                        <span>Create Academy</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
