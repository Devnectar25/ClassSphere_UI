'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, RefreshCw, Sparkles, LogIn, CheckCircle, XCircle,
    ShieldAlert, Percent, Eye, Building2, FileText, Download,
    Copy, CheckCircle2, User, BookOpen, Layers, Users, CreditCard,
    DollarSign, Activity, AlertTriangle, ExternalLink, Calendar,
    MapPin, Mail, Phone, Clock
} from 'lucide-react';
import { api, formatMoney } from '@/lib/api';
import { homePath, saveSession, type SessionState } from '@/lib/session';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected' | 'suspended';

interface AcademyRecord {
    tenantId: string;
    name: string;
    slug: string;
    category: string;
    ownerName: string;
    email: string | null;
    phone: string | null;
    ownerUserId?: string | null;
    location: string;
    address?: string | null;
    registrationDate: string;
    createdAt: string;
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'suspended';
    status: 'active' | 'suspended';
    commissionRate: number;
    rejectionReason: string | null;
    description: string | null;
    currency: string;
    timezone: string;
    planTier: string;
    mrr: number;
    activeStudents: number;
    courseCount: number;
    batchCount: number;
    branchCount: number;
    documentsCount: number;
}

interface AcademiesApiResponse {
    total: number;
    limit: number;
    offset: number;
    counts: Record<StatusFilter, number>;
    academies: AcademyRecord[];
}

interface AcademyDetail {
    overview: {
        tenantId: string;
        name: string;
        slug: string;
        category: string;
        status: string;
        verificationStatus: string;
        rejectionReason: string | null;
        commissionRate: number;
        planTier: string;
        mrr: number;
        currency: string;
        timezone: string;
        totalStudents: number;
        activeStudents: number;
        totalCourses: number;
        publishedCourses: number;
        totalBatches: number;
        activeBatches: number;
        totalRegistrations: number;
        totalRevenue: number;
        branchCount: number;
        createdAt: string;
        updatedAt: string;
    };
    owner: {
        userId: string;
        fullName: string;
        email: string | null;
        phone: string | null;
        emailVerified: boolean;
        phoneVerified: boolean;
        accountStatus: string;
        roleTitle: string;
        joinedAt: string;
    };
    academy: {
        name: string;
        slug: string;
        category: string;
        description: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        phone: string;
        email: string;
        currency: string;
        timezone: string;
        logoUrl: string | null;
        coverImage: string | null;
        tagline: string;
        primaryColor: string;
    };
    documents: Array<{
        id?: string;
        title: string;
        url: string;
        type?: string;
        size?: string;
        status?: string;
        uploadedAt?: string;
    }>;
    courses: Array<{
        courseId: string;
        title: string;
        code: string;
        category: string;
        level: string;
        durationMonths: number;
        tuitionAmount: number;
        billingPeriod: string;
        description: string | null;
        isPublished: boolean;
        isHidden: boolean;
        batchCount: number;
        studentCount: number;
        createdAt: string;
    }>;
    batches: Array<{
        batchId: string;
        batchName: string;
        courseTitle: string;
        branchName: string | null;
        startDate: string;
        endDate: string | null;
        capacity: number;
        activeStudents: number;
        status: string;
    }>;
    registrations: Array<{
        registrationId: string;
        learnerName: string;
        courseTitle: string;
        batchName: string;
        amount: number;
        status: string;
        createdAt: string;
    }>;
    payments: Array<{
        paymentId: string;
        transactionId: string;
        learnerName: string;
        courseName: string;
        grossAmount: number;
        platformCommission: number;
        academyShare: number;
        status: string;
        method: string;
        paidAt: string;
    }>;
    payoutHistory: Array<{
        payoutId: string;
        cyclePeriod: string;
        grossAmount: number;
        commissionAmount: number;
        netDisbursed: number;
        status: string;
        bankReference: string;
        processedAt: string | null;
        createdAt: string;
    }>;
    activityHistory: Array<{
        logId: string;
        action: string;
        correlationId: string;
        details: Record<string, unknown> | null;
        actorName: string;
        createdAt: string;
    }>;
}

type DossierTab =
    | 'overview'
    | 'owner'
    | 'academy'
    | 'documents'
    | 'courses'
    | 'batches'
    | 'registrations'
    | 'payments'
    | 'payouts'
    | 'activity';

const formatDate = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatTime = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

const formatDateTime = (value: string | null | undefined) =>
    value ? `${formatDate(value)}, ${formatTime(value)}` : '—';

function csvCell(value: unknown) {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function PlatformAdminTenantsPage() {
    const router = useRouter();

    // Listing states
    const [academies, setAcademies] = useState<AcademyRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [counts, setCounts] = useState<Record<StatusFilter, number>>({
        all: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
        suspended: 0,
    });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Search and filters
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedQuery, setAppliedQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // 10-Tab Detail Dossier
    const [detailTenantId, setDetailTenantId] = useState<string | null>(null);
    const [detail, setDetail] = useState<AcademyDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailTab, setDetailTab] = useState<DossierTab>('overview');

    // Action dialog: approve, reject, suspend, reactivate, commission
    const [actionDialog, setActionDialog] = useState<{
        academy: AcademyRecord;
        type: 'approve' | 'reject' | 'suspend' | 'reactivate' | 'commission';
    } | null>(null);
    const [reasonText, setReasonText] = useState('');
    const [commissionInput, setCommissionInput] = useState('10');
    const [actionBusy, setActionBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const actionForm = useFormValidation(
        { reason: reasonText, commission: commissionInput },
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

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4500);
    };

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast(`Copied ${label} to clipboard.`);
        } catch {
            showToast(`Failed to copy ${label}.`);
        }
    };

    // Load academies listing
    const loadAcademies = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const params = new URLSearchParams({
                status: statusFilter,
                page: String(currentPage),
                pageSize: String(PAGE_SIZE),
            });
            if (appliedQuery) params.set('q', appliedQuery);

            const res = await api<AcademiesApiResponse>(`/platform/tenants?${params.toString()}`);
            setAcademies(res.academies || []);
            setTotal(res.total || 0);
            if (res.counts) setCounts(res.counts);
        } catch (err) {
            setLoadError((err as Error).message || 'Failed to fetch academies.');
        } finally {
            setLoading(false);
        }
    }, [appliedQuery, statusFilter, currentPage]);

    useEffect(() => {
        loadAcademies();
    }, [loadAcademies]);

    // Fetch full 10-Tab Detail Dossier
    const openDossier = async (tenantId: string) => {
        setDetailTenantId(tenantId);
        setDetailTab('overview');
        setDetail(null);
        setDetailLoading(true);
        setDetailError(null);

        try {
            const res = await api<AcademyDetail>(`/platform/academies/detail?tenantId=${tenantId}`);
            setDetail(res);
        } catch (err) {
            setDetailError((err as Error).message || 'Failed to fetch academy profile details.');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDossier = () => {
        setDetailTenantId(null);
        setDetail(null);
        setDetailError(null);
    };

    // Handle search submission
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setAppliedQuery(searchQuery.trim());
        setCurrentPage(1);
    };

    // Handle CSV Export
    const handleExport = async () => {
        try {
            setExporting(true);
            const params = new URLSearchParams({ status: statusFilter });
            if (appliedQuery) params.set('q', appliedQuery);

            const res = await api<{ academies: AcademyRecord[] }>(`/platform/academies/export?${params.toString()}`);
            const rows = res.academies || [];
            if (rows.length === 0) {
                showToast('No academy records match the current filters.');
                return;
            }

            const headers = [
                'Academy ID', 'Name', 'Slug', 'Category', 'Owner Name', 'Email',
                'Phone', 'Location', 'Registration Date', 'Verification Status',
                'Commission Rate (%)', 'Subscription Plan', 'Active Students', 'Courses', 'Batches'
            ];

            const csvRows = [
                headers.join(','),
                ...rows.map(r => [
                    csvCell(r.tenantId),
                    csvCell(r.name),
                    csvCell(r.slug),
                    csvCell(r.category),
                    csvCell(r.ownerName),
                    csvCell(r.email),
                    csvCell(r.phone),
                    csvCell(r.location),
                    csvCell(formatDate(r.registrationDate || r.createdAt)),
                    csvCell(r.verificationStatus),
                    csvCell(r.commissionRate),
                    csvCell(r.planTier),
                    csvCell(r.activeStudents),
                    csvCell(r.courseCount),
                    csvCell(r.batchCount),
                ].join(','))
            ];

            const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `classsphere-academies-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            showToast(`Exported ${rows.length} academy record${rows.length === 1 ? '' : 's'}.`);
        } catch (err) {
            showToast((err as Error).message || 'Export failed.');
        } finally {
            setExporting(false);
        }
    };

    // Fast tenant session switch
    const openAcademy = async (academy: AcademyRecord) => {
        try {
            const session = await api<SessionState>('/auth/switch', {
                method: 'POST',
                body: JSON.stringify({ tenantId: academy.tenantId }),
            });
            saveSession({ ...session, selectedBranchId: null });
            router.push(homePath(session));
        } catch (err) {
            showToast((err as Error).message || 'Unable to switch tenant.');
        }
    };

    // Close action dialog
    const closeActionDialog = () => {
        setActionDialog(null);
        setReasonText('');
        setActionError(null);
        actionForm.reset();
    };

    // Execute lifecycle mutation: approve, reject, suspend, reactivate, commission
    const handleExecuteAction = async () => {
        if (!actionDialog) return;
        const { academy, type } = actionDialog;
        if (!actionForm.validate()) return;

        try {
            setActionBusy(true);
            setActionError(null);

            await api('/platform/academies/verification', {
                method: 'PATCH',
                body: JSON.stringify({
                    tenantId: academy.tenantId,
                    action: type,
                    reason: reasonText.trim() || null,
                    commissionRate: type === 'commission' ? Number(commissionInput) : null,
                }),
            });

            const actionLabels: Record<string, string> = {
                approve: `Academy "${academy.name}" verified and approved for publishing!`,
                reactivate: `Academy "${academy.name}" reactivated! Courses restored to marketplace.`,
                reject: `Academy "${academy.name}" rejected. Reason recorded in audit log.`,
                suspend: `Academy "${academy.name}" suspended. Courses hidden from public discovery.`,
                commission: `Commission rate of ${commissionInput}% configured for "${academy.name}".`,
            };

            showToast(actionLabels[type] || 'Action completed successfully.');
            closeActionDialog();

            // Refresh listing and active dossier if open
            loadAcademies();
            if (detailTenantId === academy.tenantId) {
                openDossier(academy.tenantId);
            }
        } catch (err) {
            setActionError((err as Error).message || 'Action failed.');
        } finally {
            setActionBusy(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="space-y-6 animate-fade-in font-sans">
            {/* Toast notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[10000] bg-slate-900 border border-slate-700 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-slide-up">
                    <Sparkles size={16} className="text-amber-400 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academies Management</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        SaaS multi-tenant registry, document verification, branch quotas, and custom commission rates.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                        title="Export current academies to CSV"
                    >
                        {exporting ? <RefreshCw size={14} className="animate-spin text-indigo-600" /> : <Download size={14} />}
                        <span>Export</span>
                    </button>
                    <button
                        onClick={loadAcademies}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                        title="Reload registry"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Subsections Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {[
                    { key: 'all', label: 'All Academies', count: counts.all, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
                    { key: 'pending', label: 'Pending Verification', count: counts.pending, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', alert: counts.pending > 0 },
                    { key: 'verified', label: 'Verified Active', count: counts.verified, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                    { key: 'rejected', label: 'Rejected', count: counts.rejected, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
                    { key: 'suspended', label: 'Suspended', count: counts.suspended, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
                ].map((sec) => (
                    <button
                        key={sec.key}
                        type="button"
                        onClick={() => {
                            setStatusFilter(sec.key as StatusFilter);
                            setCurrentPage(1);
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                            statusFilter === sec.key
                                ? `${sec.bg} ring-2 ring-indigo-500 shadow-xs`
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                        }`}
                    >
                        {sec.alert && (
                            <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                            </span>
                        )}
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                            {sec.label}
                        </span>
                        <div className={`text-2xl font-black mt-1 ${sec.color}`}>
                            {sec.count}
                        </div>
                    </button>
                ))}
            </div>

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by academy name, slug, owner, email, phone, location..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                        Search
                    </button>
                    {appliedQuery && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setAppliedQuery('');
                                setCurrentPage(1);
                            }}
                            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Clear
                        </button>
                    )}
                </form>

                {/* Status Toggle Pills */}
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs text-xs font-semibold overflow-x-auto">
                    {[
                        { label: `All (${counts.all})`, val: 'all' },
                        { label: `Pending (${counts.pending})`, val: 'pending' },
                        { label: `Verified (${counts.verified})`, val: 'verified' },
                        { label: `Rejected (${counts.rejected})`, val: 'rejected' },
                        { label: `Suspended (${counts.suspended})`, val: 'suspended' },
                    ].map((tab) => (
                        <button
                            key={tab.val}
                            type="button"
                            onClick={() => {
                                setStatusFilter(tab.val as StatusFilter);
                                setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap text-xs ${
                                statusFilter === tab.val
                                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error banner */}
            {loadError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span>{loadError}</span>
                    </div>
                    <button onClick={loadAcademies} className="font-bold underline cursor-pointer">
                        Try Again
                    </button>
                </div>
            )}

            {/* Academy Listing Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1280px]">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                                <th className="py-3 px-4 w-[110px]">Academy ID</th>
                                <th className="py-3 px-4 w-[220px]">Academy Name</th>
                                <th className="py-3 px-4 w-[170px]">Owner Name</th>
                                <th className="py-3 px-4 w-[190px]">Email</th>
                                <th className="py-3 px-4 w-[130px]">Phone</th>
                                <th className="py-3 px-4 w-[120px]">Location</th>
                                <th className="py-3 px-4 w-[120px]">Category</th>
                                <th className="py-3 px-4 w-[110px]">Reg. Date</th>
                                <th className="py-3 px-4 w-[130px]">Verification</th>
                                <th className="py-3 px-4 w-[120px]">Commission</th>
                                <th className="py-3 px-4 text-right min-w-[180px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={11} className="py-12 text-center text-slate-400">
                                        <RefreshCw size={20} className="animate-spin mx-auto text-indigo-500 mb-2" />
                                        <span>Loading academy registry...</span>
                                    </td>
                                </tr>
                            ) : academies.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="py-12 text-center text-slate-500">
                                        No academies match the selected filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                academies.map((academy) => (
                                    <tr key={academy.tenantId} className="hover:bg-slate-50/70 transition-colors">
                                        {/* Academy ID with copy */}
                                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <span>{academy.tenantId.slice(0, 8)}</span>
                                                <button
                                                    onClick={() => copyToClipboard(academy.tenantId, 'Academy ID')}
                                                    className="p-1 hover:text-indigo-600 text-slate-400 rounded transition-colors cursor-pointer"
                                                    title={`Full UUID: ${academy.tenantId}`}
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                        </td>

                                        {/* Academy Name */}
                                        <td className="py-3.5 px-4 font-bold text-slate-900">
                                            <div className="font-bold text-slate-900 leading-snug">{academy.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono font-normal">/{academy.slug}</div>
                                        </td>

                                        {/* Owner Name */}
                                        <td className="py-3.5 px-4 text-slate-800 font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                    {academy.ownerName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="truncate">{academy.ownerName}</span>
                                            </div>
                                        </td>

                                        {/* Email */}
                                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] truncate max-w-[190px]">
                                            {academy.email ?? '—'}
                                        </td>

                                        {/* Phone */}
                                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                                            {academy.phone ?? '—'}
                                        </td>

                                        {/* Location */}
                                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                                            <div className="flex items-center gap-1 text-[11px]">
                                                <MapPin size={12} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{academy.location}</span>
                                            </div>
                                        </td>

                                        {/* Category */}
                                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                                {academy.category}
                                            </span>
                                        </td>

                                        {/* Registration Date */}
                                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap text-[11px]">
                                            {formatDate(academy.registrationDate || academy.createdAt)}
                                        </td>

                                        {/* Verification Status */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            {academy.status === 'suspended' || academy.verificationStatus === 'suspended' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                    Suspended
                                                </span>
                                            ) : academy.verificationStatus === 'pending' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                    Pending Review
                                                </span>
                                            ) : academy.verificationStatus === 'rejected' ? (
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

                                        {/* Commission Rate */}
                                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                                            <div className="font-bold text-slate-800">
                                                {academy.commissionRate ? `${academy.commissionRate}%` : '10.0%'}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                {academy.commissionRate && academy.commissionRate !== 10 ? 'Custom Rate' : 'Default Rate'}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5 justify-end">
                                                {/* Dossier button */}
                                                <button
                                                    onClick={() => openDossier(academy.tenantId)}
                                                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                    title="View 10-tab dossier"
                                                >
                                                    <Eye size={13} />
                                                    <span>Details</span>
                                                </button>

                                                {/* Verification workflow buttons */}
                                                {academy.verificationStatus === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => setActionDialog({ academy, type: 'approve' })}
                                                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                                                            title="Approve academy"
                                                        >
                                                            <CheckCircle size={13} />
                                                            <span>Approve</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setActionDialog({ academy, type: 'reject' })}
                                                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                            title="Reject verification"
                                                        >
                                                            <XCircle size={13} />
                                                            <span>Reject</span>
                                                        </button>
                                                    </>
                                                )}

                                                {/* Suspension workflow buttons */}
                                                {academy.verificationStatus === 'verified' && academy.status !== 'suspended' && (
                                                    <button
                                                        onClick={() => setActionDialog({ academy, type: 'suspend' })}
                                                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                        title="Suspend academy"
                                                    >
                                                        <ShieldAlert size={13} />
                                                        <span>Suspend</span>
                                                    </button>
                                                )}

                                                {(academy.status === 'suspended' || academy.verificationStatus === 'suspended') && (
                                                    <button
                                                        onClick={() => setActionDialog({ academy, type: 'reactivate' })}
                                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                        title="Reactivate academy"
                                                    >
                                                        <CheckCircle size={13} />
                                                        <span>Reactivate</span>
                                                    </button>
                                                )}

                                                {/* Special Commission button */}
                                                <button
                                                    onClick={() => {
                                                        setCommissionInput(String(academy.commissionRate || 10));
                                                        setActionDialog({ academy, type: 'commission' });
                                                    }}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer"
                                                    title="Configure Commission"
                                                >
                                                    <Percent size={13} />
                                                </button>

                                                {/* Switch session button */}
                                                <button
                                                    onClick={() => openAcademy(academy)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-2xs transition-all"
                                                    title="Open in academy portal"
                                                >
                                                    <LogIn size={13} />
                                                    <span>Open</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={total}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => setCurrentPage(page)}
                    recordLabel="academies"
                    loading={loading}
                />
            </div>

            {/* 10-Tab Detailed Academy Profile Dossier Modal */}
            {detailTenantId && (
                <Modal
                    title="Academy Comprehensive Dossier"
                    onClose={closeDossier}
                    maxWidth="960px"
                >
                    {detailLoading ? (
                        <div className="py-20 text-center text-slate-500 space-y-3 font-sans">
                            <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto" />
                            <p className="text-xs font-semibold">Loading complete 10-tab academy dossier...</p>
                        </div>
                    ) : detailError ? (
                        <div className="p-6 text-center space-y-3 font-sans">
                            <AlertTriangle size={32} className="text-rose-500 mx-auto" />
                            <p className="text-xs text-rose-700 font-semibold">{detailError}</p>
                            <button
                                onClick={() => openDossier(detailTenantId)}
                                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    ) : detail ? (
                        <div className="space-y-5 text-xs font-sans text-slate-800">
                            {/* Profile Header Card */}
                            <div className="p-4 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                                        {detail.overview.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-black text-slate-900">{detail.overview.name}</h2>
                                            <span className="font-mono text-[10px] text-slate-400">/{detail.overview.slug}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-0.5">
                                            <span>{detail.overview.category}</span>
                                            <span>•</span>
                                            <span className="font-mono text-[10px]">{detail.overview.tenantId}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {detail.overview.verificationStatus === 'verified' ? (
                                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                                            <CheckCircle2 size={13} className="text-emerald-500" /> Verified Active
                                        </span>
                                    ) : detail.overview.verificationStatus === 'pending' ? (
                                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Pending Verification
                                        </span>
                                    ) : detail.overview.verificationStatus === 'suspended' ? (
                                        <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5">
                                            <ShieldAlert size={13} className="text-rose-500" /> Suspended
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5">
                                            <XCircle size={13} className="text-rose-500" /> Rejected
                                        </span>
                                    )}

                                    {/* Quick verify button if pending */}
                                    {detail.overview.verificationStatus === 'pending' && (
                                        <button
                                            onClick={() => {
                                                const acad = academies.find(a => a.tenantId === detail.overview.tenantId);
                                                if (acad) setActionDialog({ academy: acad, type: 'approve' });
                                            }}
                                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                                        >
                                            Verify Now
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 10 Navigation Tabs */}
                            <div className="flex items-center border-b border-slate-200 overflow-x-auto gap-1">
                                {[
                                    { key: 'overview', label: '1. Overview', icon: Building2 },
                                    { key: 'owner', label: '2. Owner Information', icon: User },
                                    { key: 'academy', label: '3. Academy Information', icon: MapPin },
                                    { key: 'documents', label: `4. Documents (${detail.documents?.length || 0})`, icon: FileText },
                                    { key: 'courses', label: `5. Courses (${detail.courses?.length || 0})`, icon: BookOpen },
                                    { key: 'batches', label: `6. Batches (${detail.batches?.length || 0})`, icon: Layers },
                                    { key: 'registrations', label: `7. Registrations (${detail.registrations?.length || 0})`, icon: Users },
                                    { key: 'payments', label: `8. Payments (${detail.payments?.length || 0})`, icon: CreditCard },
                                    { key: 'payouts', label: `9. Payouts (${detail.payoutHistory?.length || 0})`, icon: DollarSign },
                                    { key: 'activity', label: `10. Activity (${detail.activityHistory?.length || 0})`, icon: Activity },
                                ].map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => setDetailTab(tab.key as DossierTab)}
                                            className={`px-3 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                                                detailTab === tab.key
                                                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            <Icon size={13} />
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Tab Content Display */}
                            <div className="pt-2 min-h-[380px]">
                                {/* TAB 1: OVERVIEW */}
                                {detailTab === 'overview' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Students</span>
                                                <div className="text-xl font-black text-slate-900 mt-1">
                                                    {detail.overview.activeStudents}
                                                    <span className="text-xs font-normal text-slate-500"> / {detail.overview.totalStudents}</span>
                                                </div>
                                            </div>
                                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Published Courses</span>
                                                <div className="text-xl font-black text-slate-900 mt-1">
                                                    {detail.overview.publishedCourses}
                                                    <span className="text-xs font-normal text-slate-500"> / {detail.overview.totalCourses}</span>
                                                </div>
                                            </div>
                                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Batches</span>
                                                <div className="text-xl font-black text-slate-900 mt-1">
                                                    {detail.overview.activeBatches}
                                                    <span className="text-xs font-normal text-slate-500"> / {detail.overview.totalBatches}</span>
                                                </div>
                                            </div>
                                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Revenue</span>
                                                <div className="text-xl font-black text-indigo-600 mt-1">
                                                    {formatMoney(detail.overview.totalRevenue)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                                                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                                    <Building2 size={14} className="text-indigo-600" />
                                                    SaaS Platform Terms
                                                </h3>
                                                <div className="grid grid-cols-2 gap-2 text-slate-600 text-xs">
                                                    <div><strong>Plan Tier:</strong> {detail.overview.planTier}</div>
                                                    <div><strong>MRR:</strong> {formatMoney(detail.overview.mrr)}/mo</div>
                                                    <div><strong>Campuses / Branches:</strong> {detail.overview.branchCount}</div>
                                                    <div><strong>Commission Rate:</strong> {detail.overview.commissionRate}%</div>
                                                    <div><strong>Currency:</strong> {detail.overview.currency}</div>
                                                    <div><strong>Timezone:</strong> {detail.overview.timezone}</div>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                                                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                                    <Activity size={14} className="text-indigo-600" />
                                                    Lifecycle &amp; Compliance Status
                                                </h3>
                                                <div className="space-y-1.5 text-slate-600 text-xs">
                                                    <div><strong>Created At:</strong> {formatDateTime(detail.overview.createdAt)}</div>
                                                    <div><strong>Last Modified:</strong> {formatDateTime(detail.overview.updatedAt)}</div>
                                                    <div><strong>Verification:</strong> <span className="capitalize font-bold">{detail.overview.verificationStatus}</span></div>
                                                    {detail.overview.rejectionReason && (
                                                        <div className="p-2.5 rounded bg-rose-50 text-rose-700 border border-rose-200 mt-1">
                                                            <strong>Compliance Note / Reason:</strong> {detail.overview.rejectionReason}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 2: OWNER INFORMATION */}
                                {detailTab === 'owner' && (
                                    <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                                {detail.owner.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{detail.owner.fullName}</div>
                                                <div className="text-[11px] text-slate-500">{detail.owner.roleTitle}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">User ID</span>
                                                <div className="flex items-center justify-between font-mono text-xs text-slate-700">
                                                    <span>{detail.owner.userId}</span>
                                                    <button
                                                        onClick={() => copyToClipboard(detail.owner.userId, 'Owner User ID')}
                                                        className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Status</span>
                                                <span className="capitalize font-bold text-slate-800 text-xs">
                                                    {detail.owner.accountStatus}
                                                </span>
                                            </div>

                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-mono text-slate-700">{detail.owner.email ?? '—'}</span>
                                                    {detail.owner.emailVerified ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                                            <CheckCircle2 size={12} /> Verified
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-bold">
                                                            <XCircle size={12} /> Unverified
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Mobile Phone</span>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-mono text-slate-700">{detail.owner.phone ?? '—'}</span>
                                                    {detail.owner.phoneVerified ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                                            <CheckCircle2 size={12} /> Verified
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-bold">
                                                            <XCircle size={12} /> Unverified
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-slate-400 text-[11px] pt-1">
                                            Registered as academy administrator on: {formatDateTime(detail.owner.joinedAt)}
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: ACADEMY INFORMATION */}
                                {detailTab === 'academy' && (
                                    <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-slate-900 text-sm">{detail.academy.name}</h3>
                                            <p className="text-slate-600 text-xs italic">
                                                &ldquo;{detail.academy.tagline}&rdquo;
                                            </p>
                                            <p className="text-slate-600 text-xs pt-1">
                                                {detail.academy.description}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Campus Address</span>
                                                <div className="text-xs text-slate-700">
                                                    <div>{detail.academy.address}</div>
                                                    <div>{detail.academy.city}, {detail.academy.state} - {detail.academy.pincode}</div>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Official Contact</span>
                                                <div className="text-xs text-slate-700 space-y-0.5">
                                                    <div><strong>Email:</strong> {detail.academy.email}</div>
                                                    <div><strong>Phone:</strong> {detail.academy.phone}</div>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Category &amp; System</span>
                                                <div className="text-xs text-slate-700 space-y-0.5">
                                                    <div><strong>Discipline:</strong> {detail.academy.category}</div>
                                                    <div><strong>Slug:</strong> /{detail.academy.slug}</div>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Regional Localization</span>
                                                <div className="text-xs text-slate-700 space-y-0.5">
                                                    <div><strong>Currency:</strong> {detail.academy.currency}</div>
                                                    <div><strong>Timezone:</strong> {detail.academy.timezone}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 4: VERIFICATION DOCUMENTS */}
                                {detailTab === 'documents' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                            <p className="text-xs text-slate-500">
                                                Legally required registration certificates, tax records, and operator credentials.
                                            </p>
                                            {detail.overview.verificationStatus === 'pending' && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const acad = academies.find(a => a.tenantId === detail.overview.tenantId);
                                                            if (acad) setActionDialog({ academy: acad, type: 'approve' });
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <CheckCircle size={13} /> Approve
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const acad = academies.find(a => a.tenantId === detail.overview.tenantId);
                                                            if (acad) setActionDialog({ academy: acad, type: 'reject' });
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <XCircle size={13} /> Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {detail.documents && detail.documents.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2.5">
                                                {detail.documents.map((doc, idx) => (
                                                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                                <FileText size={18} />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-900 text-xs">{doc.title}</div>
                                                                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                                                    <span>{doc.type ? doc.type.replace(/_/g, ' ') : 'Verification Proof'}</span>
                                                                    {doc.size && <span>• {doc.size}</span>}
                                                                    {doc.uploadedAt && <span>• Uploaded {formatDate(doc.uploadedAt)}</span>}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <a
                                                                href={`/api/v1/platform/academies/documents/download?tenantId=${detail.overview.tenantId}&docId=${doc.id || idx}&type=${doc.type || 'proof'}&download=false`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors"
                                                            >
                                                                <Eye size={12} /> Preview
                                                            </a>
                                                            <a
                                                                href={`/api/v1/platform/academies/documents/download?tenantId=${detail.overview.tenantId}&docId=${doc.id || idx}&type=${doc.type || 'proof'}&download=true`}
                                                                download
                                                                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 transition-colors"
                                                            >
                                                                <Download size={12} /> Download
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                                                <FileText size={24} className="mx-auto mb-2 text-slate-300" />
                                                <span>No external verification documents uploaded for this academy.</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 5: COURSES */}
                                {detailTab === 'courses' && (
                                    <div className="space-y-3">
                                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                                                        <th className="py-2.5 px-3">Course Code &amp; Title</th>
                                                        <th className="py-2.5 px-3">Category</th>
                                                        <th className="py-2.5 px-3">Level</th>
                                                        <th className="py-2.5 px-3">Tuition / Period</th>
                                                        <th className="py-2.5 px-3">Batches</th>
                                                        <th className="py-2.5 px-3">Students</th>
                                                        <th className="py-2.5 px-3">Marketplace Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {detail.courses && detail.courses.length > 0 ? (
                                                        detail.courses.map((c) => (
                                                            <tr key={c.courseId} className="hover:bg-slate-50/60">
                                                                <td className="py-2.5 px-3">
                                                                    <div className="font-bold text-slate-900">{c.title}</div>
                                                                    <div className="text-[10px] font-mono text-slate-400">{c.code}</div>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-slate-600">{c.category}</td>
                                                                <td className="py-2.5 px-3 text-slate-600">{c.level ?? 'All Levels'}</td>
                                                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                                                    {formatMoney(c.tuitionAmount)} / {c.billingPeriod}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-slate-700">{c.batchCount}</td>
                                                                <td className="py-2.5 px-3 text-slate-700">{c.studentCount}</td>
                                                                <td className="py-2.5 px-3">
                                                                    {c.isPublished && !c.isHidden ? (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Published
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                                                            Hidden / Suspended
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={7} className="py-8 text-center text-slate-400">
                                                                No courses registered yet.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 6: BATCHES */}
                                {detailTab === 'batches' && (
                                    <div className="space-y-3">
                                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                                                        <th className="py-2.5 px-3">Batch Name</th>
                                                        <th className="py-2.5 px-3">Course</th>
                                                        <th className="py-2.5 px-3">Campus Branch</th>
                                                        <th className="py-2.5 px-3">Capacity</th>
                                                        <th className="py-2.5 px-3">Active Students</th>
                                                        <th className="py-2.5 px-3">Start Date</th>
                                                        <th className="py-2.5 px-3">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {detail.batches && detail.batches.length > 0 ? (
                                                        detail.batches.map((b) => (
                                                            <tr key={b.batchId} className="hover:bg-slate-50/60">
                                                                <td className="py-2.5 px-3 font-bold text-slate-900">{b.batchName}</td>
                                                                <td className="py-2.5 px-3 text-slate-600">{b.courseTitle}</td>
                                                                <td className="py-2.5 px-3 text-slate-600">{b.branchName ?? 'Main Campus'}</td>
                                                                <td className="py-2.5 px-3 font-mono">{b.capacity} seats</td>
                                                                <td className="py-2.5 px-3 font-semibold text-indigo-600">{b.activeStudents}</td>
                                                                <td className="py-2.5 px-3 text-slate-600">{formatDate(b.startDate)}</td>
                                                                <td className="py-2.5 px-3">
                                                                    <span className="capitalize font-bold text-slate-700 text-[10px]">
                                                                        {b.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={7} className="py-8 text-center text-slate-400">
                                                                No active batches found.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 7: REGISTRATIONS */}
                                {detailTab === 'registrations' && (
                                    <div className="space-y-3">
                                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                                                        <th className="py-2.5 px-3">Registration ID</th>
                                                        <th className="py-2.5 px-3">Learner Name</th>
                                                        <th className="py-2.5 px-3">Course</th>
                                                        <th className="py-2.5 px-3">Batch</th>
                                                        <th className="py-2.5 px-3">Tuition Fee</th>
                                                        <th className="py-2.5 px-3">Status</th>
                                                        <th className="py-2.5 px-3">Enrolled At</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {detail.registrations && detail.registrations.length > 0 ? (
                                                        detail.registrations.map((r) => (
                                                            <tr key={r.registrationId} className="hover:bg-slate-50/60">
                                                                <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                                                                    {r.registrationId.slice(0, 8)}
                                                                </td>
                                                                <td className="py-2.5 px-3 font-bold text-slate-900">{r.learnerName}</td>
                                                                <td className="py-2.5 px-3 text-slate-600">{r.courseTitle}</td>
                                                                <td className="py-2.5 px-3 text-slate-600">{r.batchName}</td>
                                                                <td className="py-2.5 px-3 font-semibold text-slate-800">{formatMoney(r.amount)}</td>
                                                                <td className="py-2.5 px-3 capitalize font-bold text-emerald-700">{r.status}</td>
                                                                <td className="py-2.5 px-3 text-slate-500">{formatDate(r.createdAt)}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={7} className="py-8 text-center text-slate-400">
                                                                No student registrations on record.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 8: PAYMENTS */}
                                {detailTab === 'payments' && (
                                    <div className="space-y-3">
                                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                                                        <th className="py-2.5 px-3">Transaction Ref</th>
                                                        <th className="py-2.5 px-3">Learner</th>
                                                        <th className="py-2.5 px-3">Course</th>
                                                        <th className="py-2.5 px-3">Gross</th>
                                                        <th className="py-2.5 px-3">Platform Share</th>
                                                        <th className="py-2.5 px-3">Academy Net</th>
                                                        <th className="py-2.5 px-3">Method</th>
                                                        <th className="py-2.5 px-3">Paid Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {detail.payments && detail.payments.length > 0 ? (
                                                        detail.payments.map((p) => (
                                                            <tr key={p.paymentId} className="hover:bg-slate-50/60">
                                                                <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{p.transactionId}</td>
                                                                <td className="py-2.5 px-3 font-bold text-slate-900">{p.learnerName}</td>
                                                                <td className="py-2.5 px-3 text-slate-600">{p.courseName ?? '—'}</td>
                                                                <td className="py-2.5 px-3 font-semibold text-slate-800">{formatMoney(p.grossAmount)}</td>
                                                                <td className="py-2.5 px-3 text-indigo-600 font-bold">{formatMoney(p.platformCommission)}</td>
                                                                <td className="py-2.5 px-3 text-emerald-600 font-bold">{formatMoney(p.academyShare)}</td>
                                                                <td className="py-2.5 px-3 text-slate-600 capitalize">{p.method}</td>
                                                                <td className="py-2.5 px-3 text-slate-500">{formatDate(p.paidAt)}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={8} className="py-8 text-center text-slate-400">
                                                                No financial payments recorded for this academy.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 9: PAYOUT HISTORY */}
                                {detailTab === 'payouts' && (
                                    <div className="space-y-3">
                                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                                                        <th className="py-2.5 px-3">Payout ID</th>
                                                        <th className="py-2.5 px-3">Settlement Cycle</th>
                                                        <th className="py-2.5 px-3">Gross Collected</th>
                                                        <th className="py-2.5 px-3">Commission</th>
                                                        <th className="py-2.5 px-3">Net Disbursed</th>
                                                        <th className="py-2.5 px-3">Bank Ref</th>
                                                        <th className="py-2.5 px-3">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {detail.payoutHistory && detail.payoutHistory.length > 0 ? (
                                                        detail.payoutHistory.map((po) => (
                                                            <tr key={po.payoutId} className="hover:bg-slate-50/60">
                                                                <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{po.payoutId.slice(0, 8)}</td>
                                                                <td className="py-2.5 px-3 font-bold text-slate-800">{po.cyclePeriod}</td>
                                                                <td className="py-2.5 px-3 font-semibold text-slate-700">{formatMoney(po.grossAmount)}</td>
                                                                <td className="py-2.5 px-3 text-indigo-600">{formatMoney(po.commissionAmount)}</td>
                                                                <td className="py-2.5 px-3 font-bold text-emerald-700">{formatMoney(po.netDisbursed)}</td>
                                                                <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{po.bankReference}</td>
                                                                <td className="py-2.5 px-3 capitalize font-bold text-slate-700">{po.status}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={7} className="py-8 text-center text-slate-400">
                                                                No settlement payout disbursements recorded yet.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 10: ACTIVITY HISTORY */}
                                {detailTab === 'activity' && (
                                    <div className="space-y-3">
                                        {detail.activityHistory && detail.activityHistory.length > 0 ? (
                                            <div className="space-y-2">
                                                {detail.activityHistory.map((log) => (
                                                    <div key={log.logId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-900 text-xs">{log.action}</span>
                                                                <span className="text-[10px] text-slate-400 font-mono">by {log.actorName}</span>
                                                            </div>
                                                            {log.details && (
                                                                <pre className="text-[10px] text-slate-600 font-mono bg-white p-2 rounded border border-slate-200 overflow-x-auto max-w-xl">
                                                                    {JSON.stringify(log.details, null, 2)}
                                                                </pre>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap pl-3">
                                                            {formatDateTime(log.createdAt)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                <span>No compliance audit logs for this academy yet.</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                                <span className="text-[10px] text-slate-400 font-mono">
                                    ClassShare Control Plane • ID: {detail.overview.tenantId}
                                </span>
                                <button
                                    onClick={closeDossier}
                                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors cursor-pointer text-xs"
                                >
                                    Close Profile
                                </button>
                            </div>
                        </div>
                    ) : null}
                </Modal>
            )}

            {/* Action Dialog: Approve, Reject, Suspend, Reactivate, Commission */}
            {actionDialog && (
                <Modal
                    title={
                        actionDialog.type === 'approve'
                            ? `Verify Academy: ${actionDialog.academy.name}`
                            : actionDialog.type === 'reject'
                            ? `Reject Academy Submission: ${actionDialog.academy.name}`
                            : actionDialog.type === 'suspend'
                            ? `Suspend Academy: ${actionDialog.academy.name}`
                            : actionDialog.type === 'reactivate'
                            ? `Reactivate Academy: ${actionDialog.academy.name}`
                            : `Configure Commission: ${actionDialog.academy.name}`
                    }
                    onClose={closeActionDialog}
                    maxWidth="480px"
                >
                    <form
                        noValidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleExecuteAction();
                        }}
                        className="space-y-4 text-xs font-sans"
                    >
                        {actionError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                                {actionError}
                            </div>
                        )}

                        {actionDialog.type === 'approve' && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-slate-700 leading-relaxed">
                                <div className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                                    <CheckCircle size={16} className="text-emerald-600" />
                                    Confirm Academy Approval
                                </div>
                                <p>
                                    Approving <strong>{actionDialog.academy.name}</strong> will update verification status to <strong>Verified</strong>, auto-verify the academy owner&apos;s contact credentials, and enable course publishing to the public marketplace.
                                </p>
                            </div>
                        )}

                        {actionDialog.type === 'reactivate' && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-slate-700 leading-relaxed">
                                <div className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                                    <CheckCircle size={16} className="text-emerald-600" />
                                    Reactivate Suspended Academy
                                </div>
                                <p>
                                    Reactivating <strong>{actionDialog.academy.name}</strong> will restore full operating status, unhide courses from the catalog, and permit active student registrations.
                                </p>
                            </div>
                        )}

                        {actionDialog.type === 'reject' && (
                            <div className="space-y-3">
                                <p className="text-slate-600 leading-relaxed">
                                    Please provide a mandatory reason for rejecting this academy application. The reason will be sent to the academy owner and recorded in compliance audit logs.
                                </p>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Rejection Reason <span className="text-rose-500">*</span>
                                        </label>
                                        <span className={`text-[10px] ${reasonText.trim().length > 500 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                            {reasonText.trim().length}/500 (min 10)
                                        </span>
                                    </div>
                                    <textarea
                                        rows={4}
                                        required
                                        placeholder="Explain what was missing or non-compliant (e.g. invalid tax document, missing registration certificate)..."
                                        value={reasonText}
                                        onChange={(e) => setReasonText(e.target.value)}
                                        onBlur={actionForm.touch('reason')}
                                        aria-invalid={!!actionForm.error('reason')}
                                        style={invalidStyle(actionForm.error('reason'))}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 resize-none shadow-2xs"
                                    />
                                    <FieldError message={actionForm.error('reason')} />
                                </div>
                            </div>
                        )}

                        {actionDialog.type === 'suspend' && (
                            <div className="space-y-3">
                                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <ShieldAlert size={15} /> Suspension Safeguards
                                    </div>
                                    <p className="text-[11px] leading-relaxed">
                                        Suspending immediately hides all courses from public discovery, pauses pending registrations, and notifies the owner. Confirmed learner and payment history remain safely intact.
                                    </p>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Suspension Reason <span className="text-rose-500">*</span>
                                        </label>
                                        <span className={`text-[10px] ${reasonText.trim().length > 500 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                            {reasonText.trim().length}/500 (min 10)
                                        </span>
                                    </div>
                                    <textarea
                                        rows={4}
                                        required
                                        placeholder="Explain why this academy is being suspended (e.g. serious policy breach, unresolved dispute, regulatory concern)..."
                                        value={reasonText}
                                        onChange={(e) => setReasonText(e.target.value)}
                                        onBlur={actionForm.touch('reason')}
                                        aria-invalid={!!actionForm.error('reason')}
                                        style={invalidStyle(actionForm.error('reason'))}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 resize-none shadow-2xs"
                                    />
                                    <FieldError message={actionForm.error('reason')} />
                                </div>
                            </div>
                        )}

                        {actionDialog.type === 'commission' && (
                            <div className="space-y-3">
                                <p className="text-slate-600 leading-relaxed">
                                    Configure special negotiated commission rate for <strong>{actionDialog.academy.name}</strong>. Default platform commission is 10.0%.
                                </p>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Commission Rate (%) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        step="0.5"
                                        value={commissionInput}
                                        onChange={(e) => setCommissionInput(e.target.value)}
                                        onBlur={actionForm.touch('commission')}
                                        aria-invalid={!!actionForm.error('commission')}
                                        style={invalidStyle(actionForm.error('commission'))}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
                                    />
                                    <FieldError message={actionForm.error('commission')} />
                                    <span className="text-[11px] text-slate-400 mt-1 block">
                                        Valid range 0.0% to 50.0%. Automatically applies to future billing payouts.
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={closeActionDialog}
                                disabled={actionBusy}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={actionBusy}
                                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                                    actionDialog.type === 'reject' || actionDialog.type === 'suspend'
                                        ? 'bg-rose-600 hover:bg-rose-700'
                                        : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                {actionBusy ? (
                                    <>
                                        Saving… <RefreshCw size={13} className="animate-spin" />
                                    </>
                                ) : (
                                    'Confirm Decision'
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
