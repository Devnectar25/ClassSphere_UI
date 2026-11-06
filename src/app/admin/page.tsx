'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api, formatMoney, useApi, type Plan } from '@/lib/api';
import {
    Building, CreditCard, Users, ShieldCheck, Activity,
    Plus, RefreshCw, CheckCircle, Server,
    Sparkles
} from 'lucide-react';

interface PlatformMetrics {
    totalTenants: number;
    activeTenants: number;
    totalMrr: number;
    totalStudents: number;
    totalRevenue: number;
    totalInvoices: number;
    pendingOutboxMessages: number;
    auditEvents24h: number;
}

const ACADEMY_TYPES = ['Tuition', 'Music', 'Sports', 'Dance', 'Arts', 'Test Prep', 'Language', 'Other'];
const emptyAcademy = { name: '', slug: '', academyType: 'Tuition', planTier: 'Professional', adminName: '', adminEmail: '', adminPassword: '' };
const inputClass = 'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500';

export default function PlatformAdminOverview() {
    const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [showOnboardModal, setShowOnboardModal] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Academy provisioning form
    const [academy, setAcademy] = useState(emptyAcademy);
    const [submitting, setSubmitting] = useState(false);
    const { data: plans } = useApi<Plan[]>('/plans');

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const fetchMetrics = useCallback(async () => {
        try {
            setLoading(true);
            setMetrics(await api<PlatformMetrics>('/reports?type=platform'));
        } catch {
            showToast('Unable to fetch platform telemetry.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        api<PlatformMetrics>('/reports?type=platform')
            .then((data) => {
                if (isMounted) {
                    setMetrics(data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    showToast('Unable to fetch platform telemetry.');
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const handleOnboardTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api('/tenants', {
                method: 'POST',
                body: JSON.stringify({ ...academy, currency: 'INR', timezone: 'Asia/Kolkata' }),
            });
            showToast(`Academy "${academy.name}" created. Its admin can sign in as ${academy.adminEmail}.`);
            setShowOnboardModal(false);
            setAcademy(emptyAcademy);
            fetchMetrics();
        } catch (err) {
            showToast((err as Error).message || 'Tenant provisioning failed.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-indigo-900 border border-indigo-700 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold">
                    <Sparkles size={16} className="text-amber-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20">
                            SaaS Operator Command Center
                        </span>
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-bold font-serif text-white mt-1">
                        Platform Operations &amp; Telemetry
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Real-time status across multi-tenant workspaces, gateway routing, and recurring subscription billing.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchMetrics}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={() => setShowOnboardModal(true)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                        <Plus size={15} />
                        <span>Create Academy</span>
                    </button>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subscription MRR</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <CreditCard size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-3xl font-bold text-white font-mono">
                            {formatMoney(metrics?.totalMrr ?? 0)}
                        </span>
                        <span className="text-[11px] text-emerald-400 font-semibold block mt-1">
                            {formatMoney(metrics?.totalRevenue ?? 0)} collected by tenants
                        </span>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Tenants</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <Building size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-3xl font-bold text-white font-mono">
                            {metrics?.activeTenants ?? 0}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-1">
                            {metrics?.totalTenants ?? 0} total organizations provisioned
                        </span>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Enrolled Students</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-3xl font-bold text-white font-mono">
                            {metrics?.totalStudents ?? 0}
                        </span>
                        <span className="text-[11px] text-blue-400 font-semibold block mt-1">
                            Active roster across all branches
                        </span>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audit Events (24h)</span>
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                            <Activity size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-3xl font-bold text-white font-mono">
                            {metrics?.auditEvents24h ?? 0}
                        </span>
                        <span className="text-[11px] text-emerald-400 font-semibold block mt-1">
                            Immutable compliance log entries
                        </span>
                    </div>
                </div>
            </div>

            {/* Provider Integrations Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <CheckCircle size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Payment Gateway</h3>
                            <p className="text-[11px] text-slate-400">Razorpay / UPI / Webhook Verifier</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        Gateway checkout and webhook verification are not yet integrated. Payments are posted through the idempotent ledger.
                    </p>
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Provider: none</span>
                        <span className="text-amber-400 font-semibold">Not configured</span>
                    </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                            <Server size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Database &amp; Functions</h3>
                            <p className="text-[11px] text-slate-400">Supabase PostgreSQL Partitioning</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        9 logical schemas with function-only data contract. Zero ad-hoc table CRUD permitted.
                    </p>
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="text-slate-400">{metrics?.totalInvoices ?? 0} invoices on ledger</span>
                        <span className={`font-semibold ${metrics ? 'text-emerald-400' : 'text-red-400'}`}>{metrics ? 'Operational' : 'Unavailable'}</span>
                    </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                            <Activity size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Event Outbox &amp; Messaging</h3>
                            <p className="text-[11px] text-slate-400">PostgreSQL Transactional Outbox</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        Domain events are staged atomically in the transactional outbox. The RabbitMQ dispatcher is not yet deployed.
                    </p>
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Queue depth: {metrics?.pendingOutboxMessages ?? 0}</span>
                        <span className="text-amber-400 font-semibold">Dispatcher pending</span>
                    </div>
                </div>
            </div>

            {/* Quick Links & Submodules */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                    href="/admin/tenants"
                    className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-indigo-500/60 hover:bg-slate-800/80 transition-all flex items-center justify-between group"
                >
                    <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                            Manage Tenant Workspaces →
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">Inspect workspaces, branches, and seat quotas</p>
                    </div>
                    <Building size={20} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </Link>

                <Link
                    href="/admin/subscriptions"
                    className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-indigo-500/60 hover:bg-slate-800/80 transition-all flex items-center justify-between group"
                >
                    <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                            Subscription Tiers &amp; Pricing →
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">Configure plan entitlements, MRR, and trial cycles</p>
                    </div>
                    <CreditCard size={20} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </Link>

                <Link
                    href="/admin/audit"
                    className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-indigo-500/60 hover:bg-slate-800/80 transition-all flex items-center justify-between group"
                >
                    <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                            Compliance Audit Trail →
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">Search immutable security, finance, and role logs</p>
                    </div>
                    <ShieldCheck size={20} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </Link>
            </div>

            {/* Modal: Create Academy */}
            {showOnboardModal && (
                <div className="scroll-lock fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div>
                                <h3 className="font-serif text-lg font-bold text-white">Create Academy</h3>
                                <p className="text-xs text-slate-400">Isolated workspace with its own branches, users and data</p>
                            </div>
                            <button onClick={() => setShowOnboardModal(false)} className="text-slate-400 hover:text-white" aria-label="Close">✕</button>
                        </div>

                        <form onSubmit={handleOnboardTenant} className="mt-4 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-slate-300 font-semibold mb-1">Academy Name</label>
                                    <input type="text" required className={inputClass} placeholder="e.g., Champions Cricket Academy" value={academy.name}
                                        onChange={(e) => setAcademy({ ...academy, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">Workspace Slug</label>
                                    <input type="text" required className={`${inputClass} font-mono`} value={academy.slug} onChange={(e) => setAcademy({ ...academy, slug: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">Academy Type</label>
                                    <select className={inputClass} value={academy.academyType} onChange={(e) => setAcademy({ ...academy, academyType: e.target.value })}>
                                        {ACADEMY_TYPES.map(t => <option key={t} value={t}>{t} classes</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-slate-300 font-semibold mb-1">Subscription Plan</label>
                                    <select className={inputClass} value={academy.planTier} onChange={(e) => setAcademy({ ...academy, planTier: e.target.value })}>
                                        {plans?.map(p => (
                                            <option key={p.planTier} value={p.planTier}>
                                                {p.planTier} ({formatMoney(p.priceMonthly, p.currency)}/mo • {p.maxSeats} students • {p.maxBranches} branches)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-3">
                                <p className="col-span-2 text-slate-400">Academy administrator sign-in</p>
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">Admin Name</label>
                                    <input type="text" required className={inputClass} value={academy.adminName} onChange={(e) => setAcademy({ ...academy, adminName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">Admin Email</label>
                                    <input type="email" required className={inputClass} value={academy.adminEmail} onChange={(e) => setAcademy({ ...academy, adminEmail: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-slate-300 font-semibold mb-1">Temporary Password (min. 8 characters)</label>
                                    <input type="text" required minLength={8} className={`${inputClass} font-mono`} value={academy.adminPassword} onChange={(e) => setAcademy({ ...academy, adminPassword: e.target.value })} />
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                                <button type="button" onClick={() => setShowOnboardModal(false)}
                                    className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5">
                                    {submitting && <RefreshCw size={14} className="animate-spin" />}
                                    <span>Create Academy</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
