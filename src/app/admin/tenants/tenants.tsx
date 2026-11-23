'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, RefreshCw, Sparkles, LogIn, CheckCircle, XCircle,
    ShieldAlert, Percent, Eye, Building2, FileText, Download,
    CheckCircle2, User, BookOpen, Layers, Users, CreditCard,
    DollarSign, Activity, AlertTriangle, ExternalLink, Calendar,
    MapPin, Mail, Phone, Clock
} from 'lucide-react';
import { api, formatMoney } from '@/lib/api';
import { homePath, saveSession, type SessionState } from '@/lib/session';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 8;

type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected' | 'suspended';

interface AcademyRecord {
    tenantId: string;
    academyCode?: string;
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
        academyCode?: string;
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
        userCode?: string;
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
    | 'documents'
    | 'courses'
    | 'registrations'
    | 'finances'
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

    // Detail Dossier Modal State
    const [detailTenantId, setDetailTenantId] = useState<string | null>(null);
    const [detail, setDetail] = useState<AcademyDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailTab, setDetailTab] = useState<DossierTab>('overview');
    const [coursesSubTab, setCoursesSubTab] = useState<'courses' | 'batches'>('courses');
    const [financesSubTab, setFinancesSubTab] = useState<'payments' | 'payouts'>('payments');

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
                    csvCell(r.academyCode || r.tenantId),
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
        <div className="space-y-3 animate-fade-in font-sans">
            {/* Toast notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[10000] bg-slate-900 border border-slate-700 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-slide-up">
                    <Sparkles size={16} className="text-amber-400 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">Academies Management</h1>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        SaaS multi-tenant registry, document verification, branch quotas, and operational control.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                        title="Export current academies to CSV"
                    >
                        {exporting ? <RefreshCw size={13} className="animate-spin text-indigo-600" /> : <Download size={13} />}
                        <span>Export</span>
                    </button>
                    <button
                        onClick={loadAcademies}
                        disabled={loading}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                        title="Reload registry"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Subsections Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                    {
                        key: 'all',
                        label: 'All Academies',
                        icon: Building2,
                        count: counts.all,
                        activeCard: 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs',
                        activeBadge: 'bg-indigo-600 text-white shadow-xs',
                        activeCount: 'text-indigo-950',
                        activeLabel: 'text-indigo-700',
                        inactiveBadge: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
                    },
                    {
                        key: 'pending',
                        label: 'Pending Review',
                        icon: Clock,
                        count: counts.pending,
                        activeCard: 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-xs',
                        activeBadge: 'bg-amber-600 text-white shadow-xs',
                        activeCount: 'text-amber-950',
                        activeLabel: 'text-amber-700',
                        inactiveBadge: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
                        alert: counts.pending > 0,
                    },
                    {
                        key: 'verified',
                        label: 'Verified Active',
                        icon: CheckCircle2,
                        count: counts.verified,
                        activeCard: 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs',
                        activeBadge: 'bg-emerald-600 text-white shadow-xs',
                        activeCount: 'text-emerald-950',
                        activeLabel: 'text-emerald-700',
                        inactiveBadge: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
                    },
                    {
                        key: 'rejected',
                        label: 'Rejected',
                        icon: XCircle,
                        count: counts.rejected,
                        activeCard: 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20 shadow-xs',
                        activeBadge: 'bg-rose-600 text-white shadow-xs',
                        activeCount: 'text-rose-950',
                        activeLabel: 'text-rose-700',
                        inactiveBadge: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100',
                    },
                    {
                        key: 'suspended',
                        label: 'Suspended',
                        icon: ShieldAlert,
                        count: counts.suspended,
                        activeCard: 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20 shadow-xs',
                        activeBadge: 'bg-purple-600 text-white shadow-xs',
                        activeCount: 'text-purple-950',
                        activeLabel: 'text-purple-700',
                        inactiveBadge: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
                    },
                ].map((sec) => {
                    const active = statusFilter === sec.key;
                    const Icon = sec.icon;
                    return (
                        <button
                            key={sec.key}
                            type="button"
                            onClick={() => {
                                setStatusFilter(sec.key as StatusFilter);
                                setCurrentPage(1);
                            }}
                            className={`group relative flex flex-col items-center justify-center text-center py-3.5 px-3 rounded-2xl border transition-all cursor-pointer ${
                                active
                                    ? sec.activeCard
                                    : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:shadow-2xs'
                            }`}
                        >
                            {sec.alert && (
                                <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                                </span>
                            )}
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors mb-1.5 ${
                                active ? sec.activeBadge : sec.inactiveBadge
                            }`}>
                                <Icon size={16} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                active ? sec.activeLabel : 'text-slate-500 group-hover:text-slate-700'
                            }`}>
                                {sec.label}
                            </span>
                            <div className={`text-xl sm:text-2xl font-black mt-0.5 tracking-tight transition-colors ${
                                active ? sec.activeCount : 'text-slate-900'
                            }`}>
                                {sec.count}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by academy name, slug, owner, email, phone, location..."
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
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
                            className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Clear
                        </button>
                    )}
                </form>

                <div className="text-[11px] text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-800">{academies.length}</span> of <span className="font-bold text-slate-800">{total}</span> academies
                </div>
            </div>

            {/* Error banner */}
            {loadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className="shrink-0" />
                        <span>{loadError}</span>
                    </div>
                    <button onClick={loadAcademies} className="font-bold underline cursor-pointer">
                        Try Again
                    </button>
                </div>
            )}

            {/* Academy Listing Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full table-fixed text-left text-xs">
                    <colgroup>
                        <col className="w-[10%]" />
                        <col className="w-[19%]" />
                        <col className="w-[20%]" />
                        <col className="w-[9%]" />
                        <col className="w-[12%]" />
                        <col className="w-[13%]" />
                        <col className="w-[17%]" />
                    </colgroup>
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 whitespace-nowrap">
                            <th className="py-2.5 pl-5 pr-3 text-left">Academy ID</th>
                            <th className="py-2.5 px-3 text-left">Academy</th>
                            <th className="py-2.5 px-3 text-left">Owner &amp; Contact</th>
                            <th className="py-2.5 px-3 text-left">Location</th>
                            <th className="py-2.5 px-3 text-left">Reg. Date</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="py-10 text-center text-slate-400">
                                    <RefreshCw size={20} className="animate-spin mx-auto text-indigo-500 mb-2" />
                                    <span>Loading academy registry...</span>
                                </td>
                            </tr>
                        ) : academies.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-10 text-center text-slate-500">
                                    No academies match the selected filter criteria.
                                </td>
                            </tr>
                        ) : (
                            academies.map((academy) => (
                                <tr key={academy.tenantId} className="hover:bg-slate-50/70 transition-colors">
                                    {/* Academy ID */}
                                    <td className="py-2.5 pl-5 pr-3 font-mono text-[11px] whitespace-nowrap align-middle">
                                        <span className="font-semibold text-indigo-700 bg-indigo-50/70 border border-indigo-100/60 px-1.5 py-0.5 rounded text-[10.5px]">
                                            {academy.academyCode || `AC-${academy.tenantId.slice(0, 8)}`}
                                        </span>
                                    </td>

                                    {/* Academy Name */}
                                    <td className="py-2.5 px-3 min-w-0 align-middle">
                                        <div className="font-semibold text-slate-900 leading-tight truncate" title={academy.name}>
                                            {academy.name}
                                        </div>
                                    </td>

                                    {/* Owner & Contact */}
                                    <td className="py-2.5 px-3 min-w-0 align-middle">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className="w-4.5 h-4.5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[9px] shrink-0">
                                                {academy.ownerName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-semibold text-slate-800 text-[11.5px] truncate" title={academy.ownerName}>
                                                {academy.ownerName}
                                            </span>
                                        </div>
                                        <div className="text-[10.5px] text-slate-500 mt-0.5 min-w-0 truncate" title={academy.email || academy.phone || ''}>
                                            {academy.email || academy.phone || '—'}
                                        </div>
                                    </td>

                                    {/* Location */}
                                    <td className="py-2.5 px-3 text-slate-700 min-w-0 align-middle">
                                        <div className="flex items-center gap-1 text-[11px] truncate" title={academy.location}>
                                            <MapPin size={11} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{academy.location}</span>
                                        </div>
                                    </td>

                                    {/* Registration Date */}
                                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap text-[11px] align-middle">
                                        {formatDate(academy.registrationDate || academy.createdAt)}
                                    </td>

                                    {/* Verification Status */}
                                    <td className="py-2.5 px-3 whitespace-nowrap text-center align-middle">
                                        {academy.status === 'suspended' || academy.verificationStatus === 'suspended' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                Suspended
                                            </span>
                                        ) : academy.verificationStatus === 'pending' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                Pending
                                            </span>
                                        ) : academy.verificationStatus === 'rejected' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                Rejected
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                Active
                                            </span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="py-2.5 px-3 whitespace-nowrap align-middle">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                onClick={() => openDossier(academy.tenantId)}
                                                className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 transition-colors inline-flex items-center justify-center cursor-pointer shrink-0"
                                                title="View academy dossier"
                                            >
                                                <Eye size={13} />
                                            </button>

                                            {academy.verificationStatus === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => setActionDialog({ academy, type: 'approve' })}
                                                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-2xs inline-flex items-center gap-0.5 cursor-pointer shrink-0"
                                                        title="Approve academy"
                                                    >
                                                        <CheckCircle size={11} />
                                                        <span>Approve</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setActionDialog({ academy, type: 'reject' })}
                                                        className="px-1.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors inline-flex items-center gap-0.5 cursor-pointer shrink-0"
                                                        title="Reject verification"
                                                    >
                                                        <XCircle size={11} />
                                                        <span>Reject</span>
                                                    </button>
                                                </>
                                            )}

                                            {academy.verificationStatus === 'verified' && academy.status !== 'suspended' && (
                                                <button
                                                    onClick={() => setActionDialog({ academy, type: 'suspend' })}
                                                    className="w-[84px] py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors inline-flex items-center justify-center gap-1 cursor-pointer shrink-0"
                                                    title="Suspend academy"
                                                >
                                                    <ShieldAlert size={11} />
                                                    <span>Suspend</span>
                                                </button>
                                            )}

                                            {(academy.status === 'suspended' || academy.verificationStatus === 'suspended') && (
                                                <button
                                                    onClick={() => setActionDialog({ academy, type: 'reactivate' })}
                                                    className="w-[84px] py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-colors inline-flex items-center justify-center gap-1 cursor-pointer shrink-0"
                                                    title="Reactivate academy"
                                                >
                                                    <CheckCircle size={11} />
                                                    <span>Reactivate</span>
                                                </button>
                                            )}

                                            <button
                                                onClick={() => openAcademy(academy)}
                                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                                                title="Open in academy portal"
                                            >
                                                <LogIn size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

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

            {/* Detailed Academy Profile Modal */}
            {detailTenantId && (
                <Modal
                    title="Academy Details"
                    onClose={closeDossier}
                    maxWidth="960px"
                >
                    {detailLoading ? (
                        <div className="py-20 text-center text-slate-500 space-y-3 font-sans">
                            <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto" />
                            <p className="text-xs font-semibold">Loading academy profile &amp; telemetry...</p>
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
                                        </div>
                                        <div className="flex items-center gap-2.5 text-slate-500 text-[11px] mt-0.5">
                                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">{detail.overview.category}</span>
                                            <span>•</span>
                                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10.5px]">
                                                {detail.overview.academyCode || `AC-${detail.overview.tenantId.slice(0, 8)}`}
                                            </span>
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
                                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Pending Review
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

                                    {/* Quick action buttons in header */}
                                    {detail.overview.verificationStatus === 'pending' && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => {
                                                    const acad = academies.find(a => a.tenantId === detail.overview.tenantId);
                                                    if (acad) setActionDialog({ academy: acad, type: 'approve' });
                                                }}
                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const acad = academies.find(a => a.tenantId === detail.overview.tenantId);
                                                    if (acad) setActionDialog({ academy: acad, type: 'reject' });
                                                }}
                                                className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs cursor-pointer"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}

                                    {detail.overview.verificationStatus === 'verified' && detail.overview.status !== 'suspended' && (
                                        <button
                                            onClick={() => {
                                                const acad = academies.find(a => a.tenantId === detail.overview.tenantId);
                                                if (acad) setActionDialog({ academy: acad, type: 'suspend' });
                                            }}
                                            className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1"
                                        >
                                            <ShieldAlert size={12} /> Suspend
                                        </button>
                                    )}

                                    {(detail.overview.status === 'suspended' || detail.overview.verificationStatus === 'suspended') && (
                                        <button
                                            onClick={() => {
                                                const acad = academies.find(a => a.tenantId === detail.overview.tenantId);
                                                if (acad) setActionDialog({ academy: acad, type: 'reactivate' });
                                            }}
                                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1"
                                        >
                                            <CheckCircle size={12} /> Reactivate
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            const acad = academies.find(a => a.tenantId === detail.overview.tenantId);
                                            if (acad) openAcademy(acad);
                                        }}
                                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs flex items-center gap-1"
                                    >
                                        <LogIn size={12} /> Open Portal
                                    </button>
                                </div>
                            </div>

                            {/* Streamlined Navigation Tabs */}
                            <div className="flex items-center border-b border-slate-200 overflow-x-auto gap-1">
                                {[
                                    { key: 'overview', label: 'Overview', icon: Building2 },
                                    { key: 'documents', label: `Documents (${detail.documents?.length || 0})`, icon: FileText },
                                    { key: 'courses', label: `Courses & Batches (${(detail.courses?.length || 0) + (detail.batches?.length || 0)})`, icon: BookOpen },
                                    { key: 'registrations', label: `Registrations (${detail.registrations?.length || 0})`, icon: Users },
                                    { key: 'finances', label: `Finances (${(detail.payments?.length || 0) + (detail.payoutHistory?.length || 0)})`, icon: CreditCard },
                                    { key: 'activity', label: `Activity (${detail.activityHistory?.length || 0})`, icon: Activity },
                                ].map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => setDetailTab(tab.key as DossierTab)}
                                            className={`px-3.5 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                                                detailTab === tab.key
                                                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            <Icon size={14} />
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
                                        {/* Key Stats Cards */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Students</span>
                                                <div className="text-xl font-black text-slate-900 mt-0.5">
                                                    {detail.overview.activeStudents}
                                                    <span className="text-xs font-normal text-slate-500"> / {detail.overview.totalStudents}</span>
                                                </div>
                                                <span className="text-[9.5px] text-slate-400 block mt-0.5">Active / Total</span>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Courses</span>
                                                <div className="text-xl font-black text-slate-900 mt-0.5">
                                                    {detail.overview.publishedCourses}
                                                    <span className="text-xs font-normal text-slate-500"> / {detail.overview.totalCourses}</span>
                                                </div>
                                                <span className="text-[9.5px] text-slate-400 block mt-0.5">Published / Total</span>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Batches</span>
                                                <div className="text-xl font-black text-slate-900 mt-0.5">
                                                    {detail.overview.activeBatches}
                                                    <span className="text-xs font-normal text-slate-500"> / {detail.overview.totalBatches}</span>
                                                </div>
                                                <span className="text-[9.5px] text-slate-400 block mt-0.5">Active / Total</span>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Revenue</span>
                                                <div className="text-xl font-black text-indigo-600 mt-0.5">
                                                    {formatMoney(detail.overview.totalRevenue)}
                                                </div>
                                                <span className="text-[9.5px] text-slate-400 block mt-0.5">Gross Tuition Payments</span>
                                            </div>
                                        </div>

                                        {/* Two-Column Clean Real-Data Profiles */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Academy Details */}
                                            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                                    <Building2 size={14} className="text-indigo-600" />
                                                    Academy Information
                                                </h3>

                                                <div className="grid grid-cols-2 gap-3 text-xs">
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Academy ID</span>
                                                        <span className="font-mono font-semibold text-indigo-700">{detail.overview.academyCode || `AC-${detail.overview.tenantId.slice(0, 8)}`}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                                                        <span className="font-semibold text-slate-800">{detail.overview.category || 'General'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Registration Date</span>
                                                        <span className="font-medium text-slate-700">{formatDate(detail.overview.createdAt)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Campus Branches</span>
                                                        <span className="font-medium text-slate-700">{detail.overview.branchCount || 1} Primary</span>
                                                    </div>
                                                    <div className="col-span-2 pt-2 border-t border-slate-100">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Campus Address</span>
                                                        <div className="text-slate-700 font-medium mt-0.5">
                                                            {detail.academy.address && <div>{detail.academy.address}</div>}
                                                            {(detail.academy.city || detail.academy.state) ? (
                                                                <div>{detail.academy.city}{detail.academy.state ? `, ${detail.academy.state}` : ''} {detail.academy.pincode ? `- ${detail.academy.pincode}` : ''}</div>
                                                            ) : !detail.academy.address ? (
                                                                <span className="text-slate-400 italic">No address provided</span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Official Email</span>
                                                        <span className="font-mono text-slate-800 truncate block">{detail.academy.email || '—'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Official Phone</span>
                                                        <span className="font-mono text-slate-800 truncate block">{detail.academy.phone || '—'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Owner & Administrator Profile */}
                                            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                                    <User size={14} className="text-indigo-600" />
                                                    Owner &amp; Administrator
                                                </h3>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                        {detail.owner.fullName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-xs">{detail.owner.fullName}</div>
                                                        <div className="text-[10px] text-slate-500">{detail.owner.roleTitle || 'Academy Owner'}</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">User ID</span>
                                                        <span className="font-mono text-indigo-700 font-semibold">{detail.owner.userCode || `USR-${detail.owner.userId.slice(0, 8)}`}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Status</span>
                                                        <span className="capitalize font-semibold text-slate-800">{detail.owner.accountStatus}</span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                                                        <div className="flex items-center justify-between mt-0.5">
                                                            <span className="font-mono text-slate-800 truncate">{detail.owner.email ?? '—'}</span>
                                                            {detail.owner.emailVerified ? (
                                                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 shrink-0">
                                                                    <CheckCircle2 size={11} /> Verified
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 shrink-0">
                                                                    <XCircle size={11} /> Unverified
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Mobile Phone</span>
                                                        <div className="flex items-center justify-between mt-0.5">
                                                            <span className="font-mono text-slate-800 truncate">{detail.owner.phone ?? '—'}</span>
                                                            {detail.owner.phoneVerified ? (
                                                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 shrink-0">
                                                                    <CheckCircle2 size={11} /> Verified
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 shrink-0">
                                                                    <XCircle size={11} /> Unverified
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rejection / Suspension Notice */}
                                        {detail.overview.rejectionReason && (
                                            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
                                                <strong className="block text-xs font-bold text-rose-900">Reason / Note:</strong>
                                                <p className="text-xs mt-0.5">{detail.overview.rejectionReason}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 2: DOCUMENTS */}
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

                                {/* TAB 3: COURSES & BATCHES */}
                                {detailTab === 'courses' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setCoursesSubTab('courses')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                                    coursesSubTab === 'courses'
                                                        ? 'bg-indigo-600 text-white shadow-2xs'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                Published Courses ({detail.courses?.length || 0})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCoursesSubTab('batches')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                                    coursesSubTab === 'batches'
                                                        ? 'bg-indigo-600 text-white shadow-2xs'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                Active Batches ({detail.batches?.length || 0})
                                            </button>
                                        </div>

                                        {coursesSubTab === 'courses' ? (
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
                                                            <th className="py-2.5 px-3">Status</th>
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
                                        ) : (
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
                                        )}
                                    </div>
                                )}

                                {/* TAB 4: REGISTRATIONS */}
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

                                {/* TAB 5: FINANCES */}
                                {detailTab === 'finances' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setFinancesSubTab('payments')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                                    financesSubTab === 'payments'
                                                        ? 'bg-indigo-600 text-white shadow-2xs'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                Tuition Payments ({detail.payments?.length || 0})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFinancesSubTab('payouts')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                                    financesSubTab === 'payouts'
                                                        ? 'bg-indigo-600 text-white shadow-2xs'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                Settlement Payouts ({detail.payoutHistory?.length || 0})
                                            </button>
                                        </div>

                                        {financesSubTab === 'payments' ? (
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
                                        ) : (
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
                                        )}
                                    </div>
                                )}

                                {/* TAB 6: ACTIVITY HISTORY */}
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
                            <div className="pt-3 flex justify-end items-center border-t border-slate-100">
                                <button
                                    onClick={closeDossier}
                                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors cursor-pointer text-xs"
                                >
                                    Close
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
