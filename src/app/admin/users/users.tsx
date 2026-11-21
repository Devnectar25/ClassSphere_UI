'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search, RefreshCw, Sparkles, Eye, ShieldAlert, Download, CheckCircle2, XCircle,
    User as UserIcon, ClipboardList, CreditCard, BookOpen, Activity, Ban,
} from 'lucide-react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';
import Pagination from '@/components/Pagination';

type AccountStatus = 'active' | 'suspended' | 'inactive';
type StatusFilter = 'all' | 'active' | 'suspended';

interface UserRecord {
    userId: string;
    userCode?: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    academyName?: string | null;
    emailVerified: boolean;
    emailVerifiedAt: string | null;
    phoneVerified: boolean;
    phoneVerifiedAt: string | null;
    isActive: boolean;
    isSuspended: boolean;
    isPlatformAdmin: boolean;
    suspensionReason: string | null;
    suspendedAt: string | null;
    accountStatus: AccountStatus;
    createdAt: string;
    lastLoginAt: string | null;
    lastActivityAt: string | null;
    enrollmentCount: number;
    academyMembershipCount: number;
}

interface UsersApiResponse {
    users: UserRecord[];
    total: number;
    limit: number;
    offset: number;
    counts: Record<StatusFilter, number>;
}

interface UserDetail {
    user: UserRecord & { suspendedByName: string | null; updatedAt: string };
    verification: { emailVerified: boolean; emailVerifiedAt: string | null; phoneVerified: boolean; phoneVerifiedAt: string | null; mfaEnabled: boolean };
    registrationHistory: Array<{ type: string; title: string; detail: string | null; status: string; occurredAt: string }>;
    payments: Array<{ paymentId: string; type: string; reference: string; description: string | null; academyName: string | null; amount: number; method: string | null; status: string; paidAt: string }>;
    enrollments: Array<{ enrollmentId: string; learnerName: string; academyName: string; courseName: string; batchName: string; tuitionAmount: number; billingPeriod: string; status: string; enrolledAt: string }>;
    memberships: Array<{ tenantId: string; academyName: string; role: string; title: string | null; isActive: boolean; joinedAt: string }>;
    activity: Array<{ logId: string; action: string; entityType: string; actorName: string | null; isSelf: boolean; details: Record<string, unknown> | null; createdAt: string }>;
    suspensionHistory: Array<{ historyId: string; action: 'suspended' | 'reactivated'; reason: string | null; actorName: string | null; createdAt: string }>;
}

type DetailTab = 'overview' | 'registrations' | 'payments' | 'courses' | 'activity' | 'suspensions';

const PAGE_SIZE = 10;

const formatDate = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatTime = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
const formatDateTime = (value: string | null | undefined) => (value ? `${formatDate(value)}, ${formatTime(value)}` : '—');
const formatMoney = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount || 0));
const humanize = (value: string) => value.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const formatPhone = (value: string | null | undefined) => {
    if (!value) return '—';
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) {
        return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
        return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    return value;
};

function StatusBadge({ status }: { status: AccountStatus }) {
    const styles: Record<AccountStatus, string> = {
        active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        suspended: 'bg-rose-50 text-rose-700 border-rose-200',
        inactive: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    const dots: Record<AccountStatus, string> = { active: 'bg-emerald-500', suspended: 'bg-rose-500', inactive: 'bg-slate-400' };
    return (
        <span className={`inline-flex items-center justify-center gap-1.5 w-[86px] py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap capitalize ${styles[status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dots[status]}`} />
            <span>{status}</span>
        </span>
    );
}

function VerificationBadge({ hasValue, verified, at }: { hasValue: boolean; verified: boolean; at: string | null }) {
    if (!hasValue) return <span className="text-slate-300">—</span>;
    return verified ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 whitespace-nowrap" title={at ? `Verified ${formatDateTime(at)}` : 'Verified'}>
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> Verified
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 whitespace-nowrap">
            <XCircle size={13} className="shrink-0" /> Unverified
        </span>
    );
}

function csvCell(value: unknown) {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function PlatformAdminUsersPage() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [counts, setCounts] = useState<Record<StatusFilter, number>>({ all: 0, active: 0, suspended: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedQuery, setAppliedQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [exporting, setExporting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // User details
    const [detailUserId, setDetailUserId] = useState<string | null>(null);
    const [detail, setDetail] = useState<UserDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailTab, setDetailTab] = useState<DetailTab>('overview');

    // Suspend / reactivate
    const [actionUser, setActionUser] = useState<{ user: Pick<UserRecord, 'userId' | 'fullName'>; action: 'suspend' | 'reactivate' } | null>(null);
    const [suspendReason, setSuspendReason] = useState('');
    const [actionBusy, setActionBusy] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const suspendForm = useFormValidation(
        { reason: suspendReason },
        {
            reason: [
                rules.when(
                    actionUser?.action === 'suspend',
                    rules.required('Suspension reason'),
                    rules.minLength('Suspension reason', 10),
                    rules.maxLength('Suspension reason', 500),
                ),
            ],
        },
    );

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const fetchUsers = useCallback(async (page: number, query: string, status: StatusFilter) => {
        try {
            setLoading(true);
            setLoadError(null);
            const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE), status });
            if (query.trim()) params.set('q', query.trim());
            const res = await api<UsersApiResponse>(`/platform/users?${params.toString()}`);
            setUsers(res.users || []);
            setTotal(res.total || 0);
            if (res.counts) setCounts(res.counts);
            setCurrentPage(page);
        } catch (err) {
            setLoadError((err as Error).message || 'Unable to fetch registered users.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers(1, appliedQuery, statusFilter);
    }, [fetchUsers, appliedQuery, statusFilter]);

    const reload = () => fetchUsers(currentPage, appliedQuery, statusFilter);

    const loadDetail = useCallback(async (userId: string) => {
        try {
            setDetailLoading(true);
            setDetailError(null);
            setDetail(await api<UserDetail>(`/platform/users/detail?userId=${encodeURIComponent(userId)}`));
        } catch (err) {
            setDetailError((err as Error).message || 'Unable to load user details.');
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const openDetail = (userId: string) => {
        setDetailUserId(userId);
        setDetail(null);
        setDetailTab('overview');
        loadDetail(userId);
    };

    const closeDetail = () => {
        setDetailUserId(null);
        setDetail(null);
        setDetailError(null);
    };

    const closeActionModal = () => {
        setActionUser(null);
        setSuspendReason('');
        setActionError(null);
        suspendForm.reset();
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const next = searchQuery.trim();
        if (next === appliedQuery) fetchUsers(1, next, statusFilter);
        else setAppliedQuery(next);
    };

    const handleConfirmAction = async () => {
        if (!actionUser) return;
        const isSuspending = actionUser.action === 'suspend';
        if (!suspendForm.validate()) return;

        try {
            setActionBusy(true);
            setActionError(null);
            const result = await api<{ notified: boolean }>('/platform/users', {
                method: 'PATCH',
                body: JSON.stringify({
                    userId: actionUser.user.userId,
                    isSuspended: isSuspending,
                    reason: isSuspending ? suspendReason.trim() : null,
                }),
            });
            const notice = result?.notified ? ' The user has been notified.' : '';
            showToast(`${actionUser.user.fullName} has been ${isSuspending ? 'suspended' : 'reactivated'}.${notice}`);
            const changedId = actionUser.user.userId;
            closeActionModal();
            reload();
            if (detailUserId === changedId) loadDetail(changedId);
        } catch (err) {
            setActionError((err as Error).message || 'Action failed.');
        } finally {
            setActionBusy(false);
        }
    };

    const handleVerify = async (userId: string, type: 'email' | 'phone') => {
        try {
            setVerifying(true);
            await api('/platform/users', {
                method: 'PATCH',
                body: JSON.stringify({
                    userId,
                    verifyEmail: type === 'email',
                    verifyPhone: type === 'phone',
                }),
            });
            showToast(`${type === 'email' ? 'Email' : 'Mobile number'} marked as verified.`);
            if (detailUserId === userId) await loadDetail(userId);
            reload();
        } catch (err) {
            showToast((err as Error).message || 'Failed to verify credential.');
        } finally {
            setVerifying(false);
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const params = new URLSearchParams({ status: statusFilter });
            if (appliedQuery) params.set('q', appliedQuery);
            const res = await api<{ users: UserRecord[] }>(`/platform/users/export?${params.toString()}`);
            const rows = res.users || [];
            if (rows.length === 0) {
                showToast('No user records match the current filters.');
                return;
            }
            const header = ['User ID', 'Full Name', 'Academy', 'Email', 'Mobile Number', 'Email Verified', 'Phone Verified',
                'Registration Date', 'Last Login', 'Account Status', 'Suspension Reason', 'Enrollments', 'Academies'];
            const lines = rows.map(u => [
                u.userCode || u.userId, u.fullName, u.academyName || '', u.email, u.phone,
                u.email ? (u.emailVerified ? 'Yes' : 'No') : '', u.phone ? (u.phoneVerified ? 'Yes' : 'No') : '',
                u.createdAt ? new Date(u.createdAt).toISOString() : '', u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : '',
                u.accountStatus, u.suspensionReason, u.enrollmentCount, u.academyMembershipCount,
            ].map(csvCell).join(','));
            const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `classsphere-users-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            showToast(`Exported ${rows.length} user record${rows.length === 1 ? '' : 's'}.`);
        } catch (err) {
            showToast((err as Error).message || 'Export failed.');
        } finally {
            setExporting(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const renderActionButton = (u: Pick<UserRecord, 'userId' | 'fullName' | 'isSuspended' | 'isPlatformAdmin'>, size: 'sm' | 'md' = 'sm') => {
        const base = size === 'sm' ? 'w-[82px] py-1 text-[11px] justify-center inline-flex items-center text-center' : 'px-3.5 py-2 text-xs';
        if (u.isPlatformAdmin) {
            return (
                <span className={`${base} rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold whitespace-nowrap`} title="Platform administrators are managed from Admin Roles">
                    Admin
                </span>
            );
        }
        return u.isSuspended ? (
            <button
                onClick={(e) => { e.stopPropagation(); setActionUser({ user: u, action: 'reactivate' }); }}
                className={`${base} rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold transition-colors cursor-pointer whitespace-nowrap`}
            >
                Reactivate
            </button>
        ) : (
            <button
                onClick={(e) => { e.stopPropagation(); setActionUser({ user: u, action: 'suspend' }); }}
                className={`${base} rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition-colors cursor-pointer whitespace-nowrap`}
            >
                Suspend
            </button>
        );
    };

    const tabs: Array<{ label: string; val: StatusFilter }> = [
        { label: 'All Users', val: 'all' },
        { label: 'Active Users', val: 'active' },
        { label: 'Suspended Users', val: 'suspended' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[10000] bg-white border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold max-w-sm">
                    <Sparkles size={16} className="text-amber-500 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users Management</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Registered academy administrators across ClassSphere. Staff, instructors, and guardians are managed in each academy's panel.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                    >
                        {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                        <span>Export</span>
                    </button>
                    <button
                        onClick={reload}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Subsections */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {tabs.map(tab => {
                    const active = statusFilter === tab.val;
                    return (
                        <button
                            key={tab.val}
                            type="button"
                            onClick={() => setStatusFilter(tab.val)}
                            className={`text-left px-4 py-3.5 rounded-2xl border transition-all cursor-pointer ${
                                active ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-200'
                            }`}
                        >
                            <div className={`text-[11px] font-semibold uppercase tracking-wider ${active ? 'text-indigo-100' : 'text-slate-500'}`}>{tab.label}</div>
                            <div className="text-2xl font-bold mt-0.5">{counts[tab.val] ?? 0}</div>
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-xl">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        maxLength={100}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, email, mobile, academy or user ID..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
                    />
                </div>
                <button type="submit" className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs">
                    Search
                </button>
                {appliedQuery && (
                    <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setAppliedQuery(''); }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                        Clear
                    </button>
                )}
            </form>

            {/* Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-left text-xs min-w-[860px]">
                        <colgroup>
                            <col className="w-[10%]" />
                            <col className="w-[22%]" />
                            <col className="w-[24%]" />
                            <col className="w-[15%]" />
                            <col className="w-[12%]" />
                            <col className="w-[17%]" />
                        </colgroup>
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 [&>th]:align-middle whitespace-nowrap">
                                <th className="py-3.5 pl-6 pr-3">User ID</th>
                                <th className="py-3.5 px-3">Full Name</th>
                                <th className="py-3.5 px-3">Email</th>
                                <th className="py-3.5 px-3">Mobile</th>
                                <th className="py-3.5 px-3 text-center">Status</th>
                                <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-slate-400">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                                        Loading user accounts...
                                    </td>
                                </tr>
                            ) : loadError ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-rose-600 font-semibold">{loadError}</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-slate-500">
                                        No user accounts match the current filters.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => {
                                    const displayId = u.userCode || `USR-${u.userId.slice(0, 8)}`;
                                    return (
                                    <tr
                                        key={u.userId}
                                        onClick={() => openDetail(u.userId)}
                                        className="hover:bg-indigo-50/30 transition-colors [&>td]:align-middle cursor-pointer"
                                        title="Click to view full user details"
                                    >
                                        <td className="py-3.5 pl-6 pr-3 whitespace-nowrap">
                                            <span className="inline-flex font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50/70 border border-indigo-100/60 px-2 py-0.5 rounded">
                                                {displayId}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <div className="font-semibold text-slate-900 truncate" title={u.fullName}>{u.fullName || 'Unnamed User'}</div>
                                            {u.academyName && (
                                                <div className="text-[11px] text-indigo-600 font-medium truncate mt-0.5" title={u.academyName}>{u.academyName}</div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-3 text-slate-600">
                                            <div className="truncate font-normal" title={u.email || undefined}>{u.email || '—'}</div>
                                        </td>
                                        <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap text-xs font-medium">{formatPhone(u.phone)}</td>
                                        <td className="py-3.5 px-3 whitespace-nowrap text-center">
                                            <StatusBadge status={u.accountStatus} />
                                        </td>
                                        <td className="py-3.5 pl-3 pr-6 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openDetail(u.userId);
                                                    }}
                                                    className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors inline-flex items-center justify-center cursor-pointer shrink-0"
                                                    title="View full details"
                                                >
                                                    <Eye size={13} />
                                                </button>
                                                {renderActionButton(u)}
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={total}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => fetchUsers(page, appliedQuery, statusFilter)}
                    recordLabel="users"
                    loading={loading}
                />
            </div>

            {/* User Details */}
            {detailUserId && (
                <Modal title="User Details" onClose={closeDetail} maxWidth="860px">
                    {detailLoading && !detail ? (
                        <div className="py-16 text-center text-slate-400 text-xs">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                            Loading user details...
                        </div>
                    ) : detailError && !detail ? (
                        <div className="py-12 text-center space-y-3">
                            <p className="text-rose-600 text-xs font-semibold">{detailError}</p>
                            <button onClick={() => loadDetail(detailUserId)} className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer">Retry</button>
                        </div>
                    ) : detail ? (
                        <UserDetailView
                            detail={detail}
                            tab={detailTab}
                            onTabChange={setDetailTab}
                            actionButton={renderActionButton(detail.user, 'md')}
                            onVerify={handleVerify}
                            verifying={verifying}
                        />
                    ) : null}
                </Modal>
            )}

            {/* Suspend / Reactivate Confirmation */}
            {actionUser && (
                <Modal
                    title={actionUser.action === 'suspend' ? 'Confirm User Suspension' : 'Confirm User Reactivation'}
                    onClose={closeActionModal}
                    maxWidth="440px"
                >
                    <form
                        noValidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleConfirmAction();
                        }}
                        className="space-y-4 text-xs"
                    >
                        <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                actionUser.action === 'suspend' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                                <ShieldAlert size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-900">
                                    {actionUser.action === 'suspend' ? `Suspend ${actionUser.user.fullName}?` : `Reactivate ${actionUser.user.fullName}?`}
                                </h3>
                                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                                    {actionUser.action === 'suspend'
                                        ? 'The user is signed out of all signed-in features and cannot sign in until reactivated. Their account, registrations, payments and enrollments are kept. The user will be notified.'
                                        : 'The user can sign in again and regains access to their academies and courses. The user will be notified.'}
                                </p>
                            </div>
                        </div>

                        {actionError && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                                <ShieldAlert size={15} className="shrink-0 text-rose-600" />
                                <span>{actionError}</span>
                            </div>
                        )}

                        {actionUser.action === 'suspend' && (
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label htmlFor="suspend-reason" className="block text-xs font-bold text-slate-700">
                                        Suspension Reason <span className="text-rose-500">*</span>
                                    </label>
                                    <span className={`text-[10px] ${suspendReason.trim().length > 500 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                        {suspendReason.trim().length}/500
                                    </span>
                                </div>
                                <textarea
                                    id="suspend-reason"
                                    rows={3}
                                    placeholder="Describe the policy violation, compliance or security reason..."
                                    value={suspendReason}
                                    onChange={(e) => {
                                        setSuspendReason(e.target.value);
                                        if (actionError) setActionError(null);
                                    }}
                                    onBlur={suspendForm.touch('reason')}
                                    aria-invalid={!!suspendForm.error('reason')}
                                    style={invalidStyle(suspendForm.error('reason'))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 resize-none"
                                />
                                <FieldError message={suspendForm.error('reason')} />
                                <p className="text-[10px] text-slate-400 mt-1">The reason is shared with the user and stored in the audit log.</p>
                            </div>
                        )}

                        <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={closeActionModal}
                                disabled={actionBusy}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={actionBusy}
                                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-70 ${
                                    actionUser.action === 'suspend' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {actionBusy
                                    ? <>Processing… <RefreshCw size={13} className="animate-spin" /></>
                                    : actionUser.action === 'suspend' ? 'Confirm Suspension' : 'Confirm Reactivation'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return <div className="py-10 text-center text-slate-400 text-xs">{text}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="text-xs font-medium text-slate-800 mt-0.5 break-words">{children}</div>
        </div>
    );
}

function UserDetailView({
    detail, tab, onTabChange, actionButton, onVerify, verifying,
}: {
    detail: UserDetail;
    tab: DetailTab;
    onTabChange: (tab: DetailTab) => void;
    actionButton: React.ReactNode;
    onVerify?: (userId: string, type: 'email' | 'phone') => Promise<void>;
    verifying?: boolean;
}) {
    const u = detail.user;
    const tabs: Array<{ key: DetailTab; label: string; icon: React.ReactNode; count?: number }> = [
        { key: 'overview', label: 'Overview', icon: <UserIcon size={13} /> },
        { key: 'registrations', label: 'Registrations', icon: <ClipboardList size={13} />, count: detail.registrationHistory.length },
        { key: 'payments', label: 'Payments', icon: <CreditCard size={13} />, count: detail.payments.length },
        { key: 'courses', label: 'Courses & Batches', icon: <BookOpen size={13} />, count: detail.enrollments.length },
        { key: 'activity', label: 'Activity', icon: <Activity size={13} />, count: detail.activity.length },
        { key: 'suspensions', label: 'Suspensions', icon: <Ban size={13} />, count: detail.suspensionHistory.length },
    ];

    return (
        <div className="space-y-4 text-xs text-slate-800">
            {/* Profile header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-white font-bold text-base flex items-center justify-center shrink-0 uppercase">
                    {u.fullName?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-slate-900 break-words">{u.fullName}</h3>
                        <StatusBadge status={u.accountStatus} />
                        {u.isPlatformAdmin && <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">Platform Admin</span>}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{u.userCode || `USR-${u.userId.slice(0, 8)}`}</span>
                        <span className="text-slate-400 text-[10px]">({u.userId})</span>
                    </div>
                </div>
                <div className="shrink-0">{actionButton}</div>
            </div>

            {u.isSuspended && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                    <div className="font-bold">Suspended {formatDateTime(u.suspendedAt)}{u.suspendedByName ? ` by ${u.suspendedByName}` : ''}</div>
                    {u.suspensionReason && <div className="mt-0.5">{u.suspensionReason}</div>}
                </div>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-200">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => onTabChange(t.key)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 -mb-px border-b-2 text-xs font-semibold transition-colors cursor-pointer ${
                            tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        {t.icon}
                        {t.label}
                        {t.count !== undefined && (
                            <span className={`px-1.5 rounded-full text-[10px] ${tab === t.key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="max-h-[50vh] overflow-y-auto no-scrollbar">
                {tab === 'overview' && (
                    <div className="space-y-4">
                        <section>
                            <h4 className="text-xs font-bold text-slate-900 mb-2.5">Personal Information</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 border border-slate-200 rounded-xl">
                                <Field label="Full Name">{u.fullName}</Field>
                                <Field label="Email">{u.email || '—'}</Field>
                                <Field label="Mobile Number">{u.phone || '—'}</Field>
                                <Field label="Registration Date">{formatDateTime(u.createdAt)}</Field>
                                <Field label="Last Login">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</Field>
                                <Field label="Last Activity">{formatDateTime(u.lastActivityAt)}</Field>
                                <Field label="Academies">{u.academyMembershipCount}</Field>
                                <Field label="Enrollments">{u.enrollmentCount}</Field>
                                <Field label="Profile Updated">{formatDateTime(u.updatedAt)}</Field>
                            </div>
                        </section>
                        <section>
                            <h4 className="text-xs font-bold text-slate-900 mb-2.5">Account Verification</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { label: 'Email Address', type: 'email' as const, has: !!u.email, ok: detail.verification.emailVerified, at: detail.verification.emailVerifiedAt },
                                    { label: 'Mobile Number', type: 'phone' as const, has: !!u.phone, ok: detail.verification.phoneVerified, at: detail.verification.phoneVerifiedAt },
                                ].map(v => (
                                    <div key={v.label} className="p-3.5 border border-slate-200 rounded-xl flex flex-col justify-between">
                                        <div>
                                            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{v.label}</div>
                                            <div className="mt-1"><VerificationBadge hasValue={v.has} verified={v.ok} at={v.at} /></div>
                                            {v.ok && v.at && <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(v.at)}</div>}
                                            {!v.has && <div className="text-[10px] text-slate-400 mt-0.5">Not provided</div>}
                                        </div>
                                        {!v.ok && v.has && onVerify && (
                                            <button
                                                type="button"
                                                onClick={() => onVerify(u.userId, v.type)}
                                                disabled={verifying}
                                                className="mt-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 self-start cursor-pointer hover:underline disabled:opacity-50"
                                            >
                                                {verifying ? 'Verifying...' : 'Mark as Verified'}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                        <section>
                            <h4 className="text-xs font-bold text-slate-900 mb-2.5">Academy Memberships</h4>
                            {detail.memberships.length === 0 ? <Empty text="Not a member of any academy." /> : (
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                                    {detail.memberships.map(m => (
                                        <div key={`${m.tenantId}-${m.role}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                            <div className="min-w-0">
                                                <div className="font-semibold text-slate-900 truncate">{m.academyName}</div>
                                                <div className="text-[11px] text-slate-500">{m.title || m.role} · joined {formatDate(m.joinedAt)}</div>
                                            </div>
                                            <StatusBadge status={m.isActive ? 'active' : 'inactive'} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {tab === 'registrations' && (detail.registrationHistory.length === 0 ? <Empty text="No registration history." /> : (
                    <ol className="relative border-l border-slate-200 ml-2 space-y-4 py-1">
                        {detail.registrationHistory.map((r, i) => (
                            <li key={i} className="ml-4">
                                <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                                <div className="flex items-center justify-between gap-3">
                                    <div className="font-semibold text-slate-900">{r.title}</div>
                                    <span className="text-[10px] font-semibold uppercase text-slate-500 whitespace-nowrap">{humanize(r.status)}</span>
                                </div>
                                {r.detail && <div className="text-[11px] text-slate-500">{r.detail}</div>}
                                <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(r.occurredAt)}</div>
                            </li>
                        ))}
                    </ol>
                ))}

                {tab === 'payments' && (detail.payments.length === 0 ? <Empty text="No payments recorded for this user." /> : (
                    <table className="w-full table-fixed text-left text-xs">
                        <colgroup><col className="w-[30%]" /><col className="w-[22%]" /><col className="w-[14%]" /><col className="w-[14%]" /><col className="w-[20%]" /></colgroup>
                        <thead>
                            <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                                <th className="py-2 pr-2">Description</th><th className="py-2 px-2">Academy</th><th className="py-2 px-2 text-right">Amount</th><th className="py-2 px-2">Status</th><th className="py-2 pl-2">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {detail.payments.map(p => (
                                <tr key={p.paymentId} className="[&>td]:align-middle">
                                    <td className="py-2.5 pr-2">
                                        <div className="font-semibold text-slate-900 break-words line-clamp-2">{p.description || humanize(p.type)}</div>
                                        <div className="text-[10px] text-slate-400 font-mono truncate" title={p.reference}>{p.reference}{p.method ? ` · ${p.method}` : ''}</div>
                                    </td>
                                    <td className="py-2.5 px-2 text-slate-600"><div className="break-words line-clamp-2">{p.academyName || '—'}</div></td>
                                    <td className="py-2.5 px-2 text-right font-semibold text-slate-900 whitespace-nowrap">{formatMoney(p.amount)}</td>
                                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold whitespace-nowrap capitalize">{humanize(p.status)}</span></td>
                                    <td className="py-2.5 pl-2 text-slate-500 whitespace-nowrap">{formatDate(p.paidAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ))}

                {tab === 'courses' && (detail.enrollments.length === 0 ? <Empty text="Not enrolled in any course." /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {detail.enrollments.map(e => (
                            <div key={e.enrollmentId} className="p-3.5 border border-slate-200 rounded-xl">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="font-bold text-slate-900 break-words">{e.courseName}</div>
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold whitespace-nowrap capitalize">{e.status}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">{e.academyName} · {e.batchName}</div>
                                <div className="flex items-center justify-between mt-2 text-[11px]">
                                    <span className="text-slate-500">Learner: <span className="font-semibold text-slate-700">{e.learnerName}</span></span>
                                    <span className="font-semibold text-slate-800">{formatMoney(e.tuitionAmount)}<span className="text-slate-400 font-normal">/{e.billingPeriod}</span></span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">Enrolled {formatDate(e.enrolledAt)}</div>
                            </div>
                        ))}
                    </div>
                ))}

                {tab === 'activity' && (detail.activity.length === 0 ? <Empty text="No recorded account activity." /> : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                        {detail.activity.map(a => (
                            <div key={a.logId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <div className="min-w-0">
                                    <div className="font-semibold text-slate-900">{humanize(a.action)}</div>
                                    <div className="text-[11px] text-slate-500 truncate">
                                        {a.isSelf ? 'By this user' : a.actorName ? `By ${a.actorName}` : 'System'}
                                        {typeof a.details?.reason === 'string' && a.details.reason ? ` · ${a.details.reason}` : ''}
                                    </div>
                                </div>
                                <div className="text-[11px] text-slate-400 whitespace-nowrap text-right">
                                    <div>{formatDate(a.createdAt)}</div>
                                    <div>{formatTime(a.createdAt)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}

                {tab === 'suspensions' && (detail.suspensionHistory.length === 0 ? <Empty text="This account has never been suspended." /> : (
                    <ol className="relative border-l border-slate-200 ml-2 space-y-4 py-1">
                        {detail.suspensionHistory.map(h => (
                            <li key={h.historyId} className="ml-4">
                                <span className={`absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 border-white ${h.action === 'suspended' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                <div className="font-semibold text-slate-900 capitalize">{h.action}{h.actorName ? <span className="font-normal text-slate-500 normal-case"> by {h.actorName}</span> : null}</div>
                                {h.reason && <div className="text-[11px] text-slate-600 mt-0.5">{h.reason}</div>}
                                <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(h.createdAt)}</div>
                            </li>
                        ))}
                    </ol>
                ))}
            </div>
        </div>
    );
}
