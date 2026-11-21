'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, RefreshCw, Sparkles, LogIn, CheckCircle, XCircle,
    ShieldAlert, Percent, Eye, Building2, FileText
} from 'lucide-react';
import { api, formatMoney } from '@/lib/api';
import { homePath, saveSession, type SessionState } from '@/lib/session';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 10;

interface TenantSummary {
    tenantId: string;
    name: string;
    slug: string;
    academyType: string;
    adminEmail: string | null;
    branchCount: number;
    status: string;
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'suspended';
    rejectionReason: string | null;
    commissionRate: number | null;
    documents: { title: string; url: string; status: string }[];
    coverImage: string | null;
    description: string | null;
    currency: string;
    timezone: string;
    planTier: string | null;
    mrr: number;
    activeStudents: number;
    createdAt: string;
}

export default function PlatformAdminTenantsPage() {
    const router = useRouter();
    const [tenants, setTenants] = useState<TenantSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Selected tenant for detail view
    const [inspectTenant, setInspectTenant] = useState<TenantSummary | null>(null);

    // Action dialog: approve, reject, suspend, reactivate, commission
    const [actionDialog, setActionDialog] = useState<{
        tenant: TenantSummary;
        type: 'approve' | 'reject' | 'suspend' | 'reactivate' | 'commission';
    } | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [specialCommission, setSpecialCommission] = useState('10');
    const [actionBusy, setActionBusy] = useState(false);
    const actionForm = useFormValidation(
        { reason: rejectReason, commission: specialCommission },
        {
            reason: [
                rules.when(
                    actionDialog?.type === 'reject' || actionDialog?.type === 'suspend',
                    rules.required(actionDialog?.type === 'suspend' ? 'Suspension reason' : 'Rejection reason'),
                    rules.minLength(actionDialog?.type === 'suspend' ? 'Suspension reason' : 'Rejection reason', 10),
                    rules.maxLength(actionDialog?.type === 'suspend' ? 'Suspension reason' : 'Rejection reason', 500),
                ),
            ],
            commission: [
                rules.when(
                    actionDialog?.type === 'commission',
                    rules.required('Commission'),
                    rules.number('Commission', { min: 0, max: 50 }),
                    rules.pattern(/^\d+(\.\d{1,2})?$/, 'Use at most two decimal places.'),
                ),
            ],
        },
    );

    const closeActionDialog = () => {
        setActionDialog(null);
        setRejectReason('');
        actionForm.reset();
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const [refreshCount, setRefreshCount] = useState(0);

    useEffect(() => {
        let isMounted = true;
        api<TenantSummary[]>(`/platform/tenants?_t=${Date.now()}`)
            .then((data) => {
                if (isMounted) {
                    setTenants(data);
                    setLoading(false);
                    if (refreshCount > 0) showToast('Academies list updated.');
                }
            })
            .catch(() => {
                if (isMounted) {
                    showToast('Unable to fetch tenant workspaces.');
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [refreshCount]);

    const refreshTenants = () => {
        setLoading(true);
        setRefreshCount((c) => c + 1);
    };

    const openAcademy = async (tenant: TenantSummary) => {
        try {
            const session = await api<SessionState>('/auth/switch', {
                method: 'POST',
                body: JSON.stringify({ tenantId: tenant.tenantId }),
            });
            saveSession({ ...session, selectedBranchId: null });
            router.push(homePath(session));
        } catch (err) {
            showToast((err as Error).message);
        }
    };

    const handleExecuteAction = async () => {
        if (!actionDialog) return;
        const { tenant, type } = actionDialog;
        if (!actionForm.validate()) return;

        try {
            setActionBusy(true);

            if (type === 'approve' || type === 'reactivate') {
                await api('/platform/academies/verification', {
                    method: 'PATCH',
                    body: JSON.stringify({ tenantId: tenant.tenantId, verificationStatus: 'verified' }),
                });
                showToast(`Academy "${tenant.name}" has been ${type === 'approve' ? 'approved' : 'reactivated'}!`);
            } else if (type === 'reject') {
                await api('/platform/academies/verification', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        tenantId: tenant.tenantId,
                        verificationStatus: 'rejected',
                        reason: rejectReason.trim(),
                    }),
                });
                showToast(`Academy "${tenant.name}" rejected.`);
            } else if (type === 'suspend') {
                await api('/platform/academies/verification', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        tenantId: tenant.tenantId,
                        verificationStatus: 'suspended',
                        reason: rejectReason.trim(),
                    }),
                });
                showToast(`Academy "${tenant.name}" suspended. Courses hidden.`);
            } else if (type === 'commission') {
                await api('/platform/academies/verification', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        tenantId: tenant.tenantId,
                        verificationStatus: tenant.verificationStatus || 'verified',
                        commissionRate: Number(specialCommission),
                    }),
                });
                showToast(`Custom commission of ${specialCommission}% applied to "${tenant.name}".`);
            }

            closeActionDialog();
            refreshTenants();
        } catch (err) {
            showToast((err as Error).message || 'Action failed.');
        } finally {
            setActionBusy(false);
        }
    };

    const filteredTenants = tenants.filter((t) => {
        const matchesQuery =
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.adminEmail && t.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesQuery) return false;

        if (statusFilter === 'all') return true;
        if (statusFilter === 'pending') return t.verificationStatus === 'pending';
        if (statusFilter === 'verified') return t.verificationStatus === 'verified' && t.status !== 'suspended';
        if (statusFilter === 'rejected') return t.verificationStatus === 'rejected';
        if (statusFilter === 'suspended') return t.status === 'suspended' || t.verificationStatus === 'suspended';
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filteredTenants.length / PAGE_SIZE));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    const paginatedTenants = filteredTenants.slice(
        (safeCurrentPage - 1) * PAGE_SIZE,
        safeCurrentPage * PAGE_SIZE
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[10000] bg-white border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold">
                    <Sparkles size={16} className="text-amber-500" />
                    <span>{toastMessage}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academies Management</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        SaaS multi-tenant registry, document verification, branch quotas, and custom commission rates.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={refreshTenants}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs hover:border-slate-300 cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="Search academies by name, slug, or admin email..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs transition-all"
                    />
                </div>

                {/* Status Toggle Pills */}
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs text-xs font-semibold flex-wrap">
                    {[
                        { label: 'All Academies', val: 'all' },
                        { label: 'Pending', val: 'pending' },
                        { label: 'Verified', val: 'verified' },
                        { label: 'Rejected', val: 'rejected' },
                        { label: 'Suspended', val: 'suspended' },
                    ].map((tab) => (
                        <button
                            key={tab.val}
                            type="button"
                            onClick={() => {
                                setStatusFilter(tab.val);
                                setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                                statusFilter === tab.val ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                <div>
                    <table className="w-full table-fixed text-left text-xs">
                        <colgroup>
                            <col className="w-[22%]" />
                            <col className="w-[11%]" />
                            <col className="w-[19%]" />
                            <col className="w-[12%]" />
                            <col className="w-[10%]" />
                            <col className="w-[26%]" />
                        </colgroup>
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                                <th className="py-3 px-3">Academy</th>
                                <th className="py-3 px-3">Type</th>
                                <th className="py-3 px-3">Admin Owner</th>
                                <th className="py-3 px-3">Verification</th>
                                <th className="py-3 px-3">Plan</th>
                                <th className="py-3 px-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTenants.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-500">
                                        No academies match the selected filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedTenants.map((t) => (
                                    <tr key={t.tenantId} className="hover:bg-slate-50/70 transition-colors [&>td]:align-middle">
                                        <td className="py-3.5 px-3 font-bold text-slate-900">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                                    {t.name.charAt(0)}
                                                </div>
                                                <div className="font-bold text-slate-900 min-w-0 break-words line-clamp-2" title={t.name}>{t.name}</div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-3 text-slate-600 font-medium">
                                            <div className="break-words line-clamp-2" title={t.academyType}>{t.academyType}</div>
                                        </td>
                                        <td className="py-3.5 px-3 font-mono text-slate-600">
                                            <div className="break-all line-clamp-2" title={t.adminEmail ?? undefined}>{t.adminEmail ?? '—'}</div>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            {t.status === 'suspended' || t.verificationStatus === 'suspended' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                    Suspended
                                                </span>
                                            ) : t.verificationStatus === 'pending' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                    Pending Review
                                                </span>
                                            ) : t.verificationStatus === 'rejected' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                    Rejected
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Verified Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                                            <div className="font-bold text-slate-800 truncate">{t.planTier ?? 'Starter'}</div>
                                            <div className="text-[10px] text-slate-400">
                                                {t.commissionRate ? `${t.commissionRate}% custom` : '10% default'}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => setInspectTenant(t)}
                                                    className="p-1.5 shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors inline-flex items-center cursor-pointer"
                                                    title="View complete details"
                                                >
                                                    <Eye size={13} />
                                                </button>
                                                <div className="flex flex-col gap-1 w-[84px] shrink-0">
                                                    {t.verificationStatus === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => setActionDialog({ tenant: t, type: 'approve' })}
                                                                className="w-full py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-xs inline-flex items-center justify-center gap-1 cursor-pointer"
                                                                title="Approve academy"
                                                            >
                                                                <CheckCircle size={12} />
                                                                <span>Approve</span>
                                                            </button>
                                                            <button
                                                                onClick={() => setActionDialog({ tenant: t, type: 'reject' })}
                                                                className="w-full py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors inline-flex items-center justify-center gap-1 cursor-pointer"
                                                                title="Reject academy"
                                                            >
                                                                <XCircle size={12} />
                                                                <span>Reject</span>
                                                            </button>
                                                        </>
                                                    )}
                                                    {t.verificationStatus === 'verified' && t.status !== 'suspended' && (
                                                        <button
                                                            onClick={() => setActionDialog({ tenant: t, type: 'suspend' })}
                                                            className="w-full py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors inline-flex items-center justify-center gap-1 cursor-pointer"
                                                            title="Suspend academy"
                                                        >
                                                            <ShieldAlert size={12} />
                                                            <span>Suspend</span>
                                                        </button>
                                                    )}
                                                    {(t.status === 'suspended' || t.verificationStatus === 'suspended') && (
                                                        <button
                                                            onClick={() => setActionDialog({ tenant: t, type: 'reactivate' })}
                                                            className="w-full py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-colors inline-flex items-center justify-center gap-1 cursor-pointer"
                                                            title="Reactivate academy"
                                                        >
                                                            <CheckCircle size={12} />
                                                            <span>Reactivate</span>
                                                        </button>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSpecialCommission(String(t.commissionRate ?? 10));
                                                        setActionDialog({ tenant: t, type: 'commission' });
                                                    }}
                                                    className="p-1.5 shrink-0 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer"
                                                    title="Configure Commission"
                                                >
                                                    <Percent size={13} />
                                                </button>
                                                <button
                                                    onClick={() => openAcademy(t)}
                                                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all"
                                                    title="Open academy"
                                                >
                                                    <LogIn size={13} /> Open
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={safeCurrentPage}
                    totalPages={totalPages}
                    totalRecords={filteredTenants.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => setCurrentPage(page)}
                    recordLabel="academies"
                    loading={loading}
                />
            </div>

            {/* Inspect Tenant Details Modal */}
            {inspectTenant && (
                <Modal title="Academy Comprehensive Dossier" onClose={() => setInspectTenant(null)} maxWidth="640px">
                    <div className="space-y-5 text-xs font-sans text-slate-800">
                        {/* Section A: Basic Info */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-slate-400">A. Basic Information</span>
                                <span className="font-mono text-[10px] text-slate-400">ID: {inspectTenant.tenantId}</span>
                            </div>
                            <div className="text-base font-extrabold text-slate-900">{inspectTenant.name}</div>
                            <div className="grid grid-cols-2 gap-2 text-slate-600">
                                <div><strong>Slug:</strong> {inspectTenant.slug}</div>
                                <div><strong>Category:</strong> {inspectTenant.academyType}</div>
                                <div><strong>Admin Email:</strong> {inspectTenant.adminEmail ?? '—'}</div>
                                <div><strong>Currency / TZ:</strong> {inspectTenant.currency} ({inspectTenant.timezone})</div>
                            </div>
                        </div>

                        {/* Section B: Verification & Documents */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">B. Verification Status &amp; Documents</span>
                            <div className="flex items-center gap-3">
                                <span>Verification Status:</span>
                                <span className="font-bold capitalize">{inspectTenant.verificationStatus}</span>
                            </div>
                            {inspectTenant.rejectionReason && (
                                <div className="p-2.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                    <strong>Rejection Reason:</strong> {inspectTenant.rejectionReason}
                                </div>
                            )}
                            <div className="pt-1">
                                {inspectTenant.documents && inspectTenant.documents.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {inspectTenant.documents.map((doc, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={14} className="text-indigo-600" />
                                                    <span>{doc.title}</span>
                                                </div>
                                                <a href={doc.url} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline">
                                                    Preview Document
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-400">No external registration verification documents uploaded.</p>
                                )}
                            </div>
                        </div>

                        {/* Section C: Courses & Batches */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">C. Courses &amp; Campuses</span>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                                    <div className="text-lg font-bold text-slate-900">{inspectTenant.branchCount}</div>
                                    <div className="text-[10px] text-slate-500">Campuses</div>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                                    <div className="text-lg font-bold text-slate-900">{inspectTenant.activeStudents}</div>
                                    <div className="text-[10px] text-slate-500">Active Students</div>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                                    <div className="text-lg font-bold text-slate-900">{inspectTenant.planTier ?? 'Starter'}</div>
                                    <div className="text-[10px] text-slate-500">Subscription Tier</div>
                                </div>
                            </div>
                        </div>

                        {/* Section D: Financials */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">D. Financial &amp; Commission Terms</span>
                            <div className="grid grid-cols-2 gap-2 text-slate-700">
                                <div><strong>Subscription MRR:</strong> {formatMoney(inspectTenant.mrr ?? 0)}</div>
                                <div><strong>Platform Commission:</strong> {inspectTenant.commissionRate ? `${inspectTenant.commissionRate}% (Special)` : '10% (Default)'}</div>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setInspectTenant(null)}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors cursor-pointer text-xs"
                            >
                                Close Dossier
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Action Dialog (Approve, Reject, Suspend, Reactivate, Commission) */}
            {actionDialog && (
                <Modal
                    title={
                        actionDialog.type === 'approve'
                            ? `Approve Academy: ${actionDialog.tenant.name}`
                            : actionDialog.type === 'reject'
                            ? `Reject Verification: ${actionDialog.tenant.name}`
                            : actionDialog.type === 'suspend'
                            ? `Suspend Academy: ${actionDialog.tenant.name}`
                            : actionDialog.type === 'reactivate'
                            ? `Reactivate Academy: ${actionDialog.tenant.name}`
                            : `Configure Commission: ${actionDialog.tenant.name}`
                    }
                    onClose={closeActionDialog}
                    maxWidth="450px"
                >
                    <form
                        noValidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleExecuteAction();
                        }}
                        className="space-y-4 text-xs font-sans"
                    >
                        {actionDialog.type === 'approve' && (
                            <p className="text-slate-600 leading-relaxed">
                                Approving will mark this academy as <strong>Verified</strong> and activate course publishing rights across ClassShare.
                            </p>
                        )}

                        {actionDialog.type === 'reactivate' && (
                            <p className="text-slate-600 leading-relaxed">
                                Reactivating will restore <strong>Verified &amp; Active</strong> status to &ldquo;{actionDialog.tenant.name}&rdquo;, allowing course publishing and student registrations.
                            </p>
                        )}

                        {actionDialog.type === 'reject' && (
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-bold text-slate-700">
                                        Rejection Reason <span className="text-rose-500">*</span>
                                    </label>
                                    <span className={`text-[10px] ${rejectReason.trim().length > 500 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                        {rejectReason.trim().length}/500
                                    </span>
                                </div>
                                <textarea
                                    rows={3}
                                    required
                                    placeholder="Explain why verification failed (e.g. invalid tax ID, missing license)..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    onBlur={actionForm.touch('reason')}
                                    aria-invalid={!!actionForm.error('reason')}
                                    style={invalidStyle(actionForm.error('reason'))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 resize-none"
                                />
                                <FieldError message={actionForm.error('reason')} />
                            </div>
                        )}

                        {actionDialog.type === 'suspend' && (
                            <div>
                                <p className="text-slate-600 leading-relaxed mb-3">
                                    Suspending will immediately revoke course publishing, hide all courses from the public marketplace, and pause pending registration requests for this academy.
                                </p>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-bold text-slate-700">
                                        Suspension Reason <span className="text-rose-500">*</span>
                                    </label>
                                    <span className={`text-[10px] ${rejectReason.trim().length > 500 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                        {rejectReason.trim().length}/500
                                    </span>
                                </div>
                                <textarea
                                    rows={3}
                                    required
                                    placeholder="Explain why this academy is being suspended (e.g. fraudulent activity, unresolved complaints)..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    onBlur={actionForm.touch('reason')}
                                    aria-invalid={!!actionForm.error('reason')}
                                    style={invalidStyle(actionForm.error('reason'))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 resize-none"
                                />
                                <FieldError message={actionForm.error('reason')} />
                            </div>
                        )}

                        {actionDialog.type === 'commission' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Special Platform Commission (%) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    step="0.5"
                                    value={specialCommission}
                                    onChange={(e) => setSpecialCommission(e.target.value)}
                                    onBlur={actionForm.touch('commission')}
                                    aria-invalid={!!actionForm.error('commission')}
                                    style={invalidStyle(actionForm.error('commission'))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <FieldError message={actionForm.error('commission')} />
                                <span className="text-[11px] text-slate-400 mt-1 block">Allowed range 0–50%. Default platform commission is 10%.</span>
                            </div>
                        )}

                        <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={closeActionDialog}
                                disabled={actionBusy}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={actionBusy}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                {actionBusy ? <>Saving… <RefreshCw size={13} className="animate-spin" /></> : 'Confirm Action'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
