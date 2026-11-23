'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search, RefreshCw, Eye, ShieldAlert, Download, Building2, BookOpen,
    GraduationCap, Clock, CheckCircle2, XCircle, AlertTriangle,
    CreditCard, User, Layers, ShieldCheck, HelpCircle,
    Sparkles, X
} from 'lucide-react';
import { api, formatMoney } from '@/lib/api';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 8;

interface RegistrationRecord {
    registrationId: string;
    registrationCode: string;
    tenantId: string;
    academyName: string;
    studentId: string;
    learnerName: string;
    learnerEmail: string;
    learnerPhone: string;
    courseId: string;
    courseName: string;
    batchId: string;
    batchName: string;
    registrationAmount: number;
    status: string;
    registrationDate: string;
    paymentStatus: string;
    paymentDeadline: string | null;
}

interface RegistrationTimelineEvent {
    step: number;
    title: string;
    timestamp: string;
    actor: string;
    status: string;
    details: string;
}

interface RegistrationDetail {
    registrationId: string;
    registrationCode: string;
    status: string;
    registrationDate: string;
    registrationAmount: number;
    paymentStatus: string;
    paymentDeadline: string | null;
    invoiceNumber: string | null;
    paidAmount: number;
    balanceAmount: number;
    student: {
        studentId: string;
        name: string;
        email: string;
        phone: string;
        enrollmentNumber: string | null;
        academicStanding: string | null;
        matriculationYear: string | null;
        guardianName: string | null;
        guardianPhone: string | null;
        guardianEmail: string | null;
    };
    academy: {
        tenantId: string;
        name: string;
        slug: string;
        location: string;
        email: string;
        phone: string;
    };
    course: {
        courseId: string;
        title: string;
        category: string;
        tuitionAmount: number;
        billingPeriod: string;
    };
    batch: {
        batchId: string;
        name: string;
        startDate: string | null;
        endDate: string | null;
        capacity: number | null;
        branchName: string | null;
    };
    history: RegistrationTimelineEvent[];
}

interface StatusCounts {
    all: number;
    pending: number;
    approved: number;
    confirmed: number;
    waitlisted: number;
    rejected: number;
    expired: number;
    cancelled: number;
    completed: number;
}

interface FilterOptionItem {
    id: string;
    name?: string;
    title?: string;
    tenantId?: string;
}

interface RegistrationsApiResponse {
    registrations: RegistrationRecord[];
    total: number;
    limit: number;
    offset: number;
    counts?: StatusCounts;
    filterOptions?: {
        academies: FilterOptionItem[];
        courses: FilterOptionItem[];
    };
}

const STATUS_FILTERS = [
    {
        key: 'all',
        label: 'All',
        icon: Layers,
        activeCard: 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs',
        activeBadge: 'bg-indigo-600 text-white shadow-xs',
        activeCount: 'text-indigo-950',
        activeLabel: 'text-indigo-700',
        inactiveBadge: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
    },
    {
        key: 'pending',
        label: 'Pending',
        icon: Clock,
        activeCard: 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-xs',
        activeBadge: 'bg-amber-600 text-white shadow-xs',
        activeCount: 'text-amber-950',
        activeLabel: 'text-amber-700',
        inactiveBadge: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
        alert: true,
    },
    {
        key: 'approved',
        label: 'Approved',
        icon: ShieldCheck,
        activeCard: 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs',
        activeBadge: 'bg-blue-600 text-white shadow-xs',
        activeCount: 'text-blue-950',
        activeLabel: 'text-blue-700',
        inactiveBadge: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    },
    {
        key: 'confirmed',
        label: 'Confirmed',
        icon: CheckCircle2,
        activeCard: 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs',
        activeBadge: 'bg-emerald-600 text-white shadow-xs',
        activeCount: 'text-emerald-950',
        activeLabel: 'text-emerald-700',
        inactiveBadge: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
    },
    {
        key: 'waitlisted',
        label: 'Waitlist',
        icon: HelpCircle,
        activeCard: 'bg-slate-100 border-slate-400 ring-2 ring-slate-500/20 shadow-xs',
        activeBadge: 'bg-slate-700 text-white shadow-xs',
        activeCount: 'text-slate-950',
        activeLabel: 'text-slate-700',
        inactiveBadge: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200',
    },
    {
        key: 'completed',
        label: 'Completed',
        icon: GraduationCap,
        activeCard: 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20 shadow-xs',
        activeBadge: 'bg-purple-600 text-white shadow-xs',
        activeCount: 'text-purple-950',
        activeLabel: 'text-purple-700',
        inactiveBadge: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    },
    {
        key: 'rejected',
        label: 'Rejected',
        icon: XCircle,
        activeCard: 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20 shadow-xs',
        activeBadge: 'bg-rose-600 text-white shadow-xs',
        activeCount: 'text-rose-950',
        activeLabel: 'text-rose-700',
        inactiveBadge: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100',
    },
    {
        key: 'expired',
        label: 'Expired',
        icon: AlertTriangle,
        activeCard: 'bg-orange-50/80 border-orange-400 ring-2 ring-orange-500/20 shadow-xs',
        activeBadge: 'bg-orange-600 text-white shadow-xs',
        activeCount: 'text-orange-950',
        activeLabel: 'text-orange-700',
        inactiveBadge: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
    },
    {
        key: 'cancelled',
        label: 'Cancelled',
        icon: X,
        activeCard: 'bg-zinc-100 border-zinc-400 ring-2 ring-zinc-500/20 shadow-xs',
        activeBadge: 'bg-zinc-700 text-white shadow-xs',
        activeCount: 'text-zinc-950',
        activeLabel: 'text-zinc-700',
        inactiveBadge: 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200',
    },
];

const STATUS_EXPLANATIONS: Record<string, string> = {
    pending: 'Initial application submitted. Awaiting academy review.',
    approved: 'Academy approved. Seat temporarily reserved. Awaiting tuition payment.',
    confirmed: 'Tuition payment verified. Official enrollment confirmed and seat locked.',
    waitlisted: 'Learner is placed on the waitlist. Seat is not held.',
    completed: 'Course batch finished. Registration concluded.',
    rejected: 'Request declined by academy. Held seat released.',
    expired: 'Payment deadline lapsed without payment. Seat released back to batch.',
    cancelled: 'Registration cancelled. Seat released and refund processed per policy.',
};

function formatDisplayDate(val: string | null | undefined) {
    if (!val) return '—';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return '—';
    }
}

function formatDisplayDateTime(val: string | null | undefined) {
    if (!val) return '—';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
            d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '—';
    }
}

export default function PlatformAdminRegistrationsPage() {
    const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedQuery, setAppliedQuery] = useState('');
    const [selectedAcademy, setSelectedAcademy] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');

    // Dynamic counts & filter options from DB
    const [counts, setCounts] = useState<StatusCounts>({
        all: 0, pending: 0, approved: 0, confirmed: 0,
        waitlisted: 0, rejected: 0, expired: 0, cancelled: 0, completed: 0,
    });
    const [academiesList, setAcademiesList] = useState<FilterOptionItem[]>([]);
    const [coursesList, setCoursesList] = useState<FilterOptionItem[]>([]);

    // Detail Modal State
    const [detailId, setDetailId] = useState<string | null>(null);
    const [detailData, setDetailData] = useState<RegistrationDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    // Exceptional Status Override Dialog
    const [overrideReg, setOverrideReg] = useState<RegistrationRecord | RegistrationDetail | null>(null);
    const [newStatus, setNewStatus] = useState('confirmed');
    const [overrideReason, setOverrideReason] = useState('');
    const [overrideBusy, setOverrideBusy] = useState(false);

    const overrideForm = useFormValidation(
        { status: newStatus, reason: overrideReason },
        {
            status: [
                rules.required('Target status'),
                (value) =>
                    overrideReg && String(value).toLowerCase() === String(overrideReg.status ?? '').toLowerCase()
                        ? `Registration is already ${value}. Select a different status.`
                        : undefined,
            ],
            reason: [
                rules.required('Justification reason'),
                rules.minLength('Justification reason', 10),
                rules.maxLength('Justification reason', 500)
            ],
        },
    );

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    // Load registrations
    const loadRegistrations = useCallback(async () => {
        try {
            setLoading(true);
            const offset = (currentPage - 1) * PAGE_SIZE;
            const params = new URLSearchParams({
                limit: PAGE_SIZE.toString(),
                offset: offset.toString(),
            });

            if (appliedQuery) params.set('q', appliedQuery);
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (selectedAcademy) params.set('tenantId', selectedAcademy);
            if (selectedCourse) params.set('courseId', selectedCourse);
            params.set('_t', Date.now().toString());

            const res = await api<RegistrationsApiResponse>(`/platform/registrations?${params.toString()}`);
            setRegistrations(res.registrations || []);
            setTotal(res.total || 0);
            if (res.counts) setCounts(res.counts);
            if (res.filterOptions) {
                if (res.filterOptions.academies) setAcademiesList(res.filterOptions.academies);
                if (res.filterOptions.courses) setCoursesList(res.filterOptions.courses);
            }
        } catch {
            showToast('Unable to fetch registration registry.');
        } finally {
            setLoading(false);
        }
    }, [currentPage, statusFilter, appliedQuery, selectedAcademy, selectedCourse]);

    useEffect(() => {
        loadRegistrations();
    }, [loadRegistrations]);

    // Open Details Modal
    const handleOpenDetail = async (id: string) => {
        setDetailId(id);
        setDetailData(null);
        setDetailLoading(true);
        setDetailError(null);

        try {
            const res = await api<{ registration: RegistrationDetail }>(`/platform/registrations?id=${id}`);
            setDetailData(res.registration);
        } catch (err) {
            setDetailError((err as Error).message || 'Failed to fetch registration details.');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCloseDetail = () => {
        setDetailId(null);
        setDetailData(null);
        setDetailError(null);
    };

    // Handle Search
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setAppliedQuery(searchQuery.trim());
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setAppliedQuery('');
        setSelectedAcademy('');
        setSelectedCourse('');
        setStatusFilter('all');
        setCurrentPage(1);
    };

    // CSV Export
    const handleExport = async () => {
        try {
            setExporting(true);
            const params = new URLSearchParams({ export: 'true' });
            if (appliedQuery) params.set('q', appliedQuery);
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (selectedAcademy) params.set('tenantId', selectedAcademy);
            if (selectedCourse) params.set('courseId', selectedCourse);

            const res = await api<RegistrationsApiResponse>(`/platform/registrations?${params.toString()}`);
            const rows = res.registrations || [];
            if (rows.length === 0) {
                showToast('No registrations match the selected criteria for export.');
                return;
            }

            const headers = [
                'Registration ID', 'Student Name', 'Student Email', 'Student Phone',
                'Academy Name', 'Course Name', 'Batch Name', 'Registration Date',
                'Amount (INR)', 'Registration Status', 'Payment Status', 'Payment Deadline'
            ];

            const csvRows = [
                headers.join(','),
                ...rows.map(r => [
                    JSON.stringify(r.registrationCode || ('REG-' + r.registrationId.slice(0, 8).toUpperCase())),
                    JSON.stringify(r.learnerName || ''),
                    JSON.stringify(r.learnerEmail || ''),
                    JSON.stringify(r.learnerPhone || ''),
                    JSON.stringify(r.academyName || ''),
                    JSON.stringify(r.courseName || ''),
                    JSON.stringify(r.batchName || ''),
                    JSON.stringify(formatDisplayDate(r.registrationDate)),
                    r.registrationAmount || 0,
                    JSON.stringify(r.status || ''),
                    JSON.stringify(r.paymentStatus || ''),
                    JSON.stringify(formatDisplayDate(r.paymentDeadline))
                ].join(','))
            ];

            const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `classsphere-registrations-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            showToast(`Exported ${rows.length} registration record${rows.length === 1 ? '' : 's'}.`);
        } catch (err) {
            showToast((err as Error).message || 'Export failed.');
        } finally {
            setExporting(false);
        }
    };

    // Status Override
    const handleOpenOverride = (reg: RegistrationRecord | RegistrationDetail) => {
        setOverrideReg(reg);
        setNewStatus(reg.status === 'confirmed' ? 'completed' : 'confirmed');
        setOverrideReason('');
        overrideForm.reset();
    };

    const handleExecuteOverride = async () => {
        if (!overrideReg) return;
        if (!overrideForm.validate()) return;

        try {
            setOverrideBusy(true);
            await api('/platform/registrations', {
                method: 'PATCH',
                body: JSON.stringify({
                    registrationId: overrideReg.registrationId,
                    newStatus,
                    reason: overrideReason.trim(),
                }),
            });

            showToast(`Registration status overridden to "${newStatus}". Cryptographically logged to audit trail.`);
            setOverrideReg(null);
            setOverrideReason('');
            loadRegistrations();

            if (detailId === overrideReg.registrationId) {
                handleOpenDetail(detailId);
            }
        } catch (err) {
            showToast((err as Error).message || 'Status override failed.');
        } finally {
            setOverrideBusy(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="space-y-2.5 animate-fade-in font-sans">
            {/* Toast notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[10000] bg-slate-900 border border-slate-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-slide-up">
                    <Sparkles size={15} className="text-amber-400 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-200">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">Registrations Management</h1>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Cross-academy learner course enrollments, batch allocations, payment verification, and lifecycle auditing.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                        title="Export current registrations to CSV"
                    >
                        {exporting ? <RefreshCw size={13} className="animate-spin text-indigo-600" /> : <Download size={13} />}
                        <span>Export</span>
                    </button>
                    <button
                        onClick={loadRegistrations}
                        disabled={loading}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                        title="Reload registration registry"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Status Filter Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                {STATUS_FILTERS.map((sec) => {
                    const active = statusFilter === sec.key;
                    const Icon = sec.icon;
                    const countVal = counts[sec.key as keyof StatusCounts] ?? 0;
                    const showAlert = 'alert' in sec && Boolean(sec.alert) && countVal > 0;
                    return (
                        <button
                            key={sec.key}
                            type="button"
                            onClick={() => {
                                setStatusFilter(sec.key);
                                setCurrentPage(1);
                            }}
                            className={`group relative flex flex-col items-center justify-center text-center py-2.5 px-1.5 rounded-2xl border transition-all cursor-pointer ${
                                active
                                    ? sec.activeCard
                                    : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:shadow-xs'
                            }`}
                        >
                            {showAlert && (
                                <span className="absolute top-2 right-2 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                                </span>
                            )}
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all mb-1 ${
                                active ? sec.activeBadge : sec.inactiveBadge
                            } group-hover:scale-105`}>
                                <Icon size={16} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider truncate max-w-full px-0.5 transition-colors ${
                                active ? sec.activeLabel : 'text-slate-500 group-hover:text-slate-700'
                            }`}>
                                {sec.label}
                            </span>
                            <div className={`text-base sm:text-lg font-black mt-0.5 tracking-tight transition-colors ${
                                active ? sec.activeCount : 'text-slate-900'
                            }`}>
                                {countVal}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Filter Toolbar (Single Compact Row) */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-2 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 max-w-xl">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search student, registration ID, email..."
                            className="w-full pl-7 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs transition-all"
                        />
                    </form>

                    <select
                        value={selectedAcademy}
                        onChange={(e) => {
                            setSelectedAcademy(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-medium focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer max-w-[140px] truncate"
                    >
                        <option value="">All Academies</option>
                        {academiesList.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>

                    <select
                        value={selectedCourse}
                        onChange={(e) => {
                            setSelectedCourse(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-medium focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer max-w-[130px] truncate"
                    >
                        <option value="">All Courses</option>
                        {coursesList.map((c) => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                    </select>

                    {(appliedQuery || selectedAcademy || selectedCourse || statusFilter !== 'all') && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                            title="Reset filters"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                    Showing <strong className="text-slate-800">{registrations.length}</strong> of <strong className="text-slate-800">{total}</strong> registrations
                </div>
            </div>

            {/* Registrations Listing Table (Exact 100% Width, Zero Horizontal Scroll) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full table-fixed text-left text-xs">
                    <colgroup>
                        <col className="w-[11%]" />
                        <col className="w-[18%]" />
                        <col className="w-[14%]" />
                        <col className="w-[14%]" />
                        <col className="w-[9%]" />
                        <col className="w-[8%]" />
                        <col className="w-[12%]" />
                        <col className="w-[14%]" />
                    </colgroup>
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 whitespace-nowrap">
                            <th className="py-2.5 pl-4 pr-2 text-left">Registration ID</th>
                            <th className="py-2.5 px-2.5 text-left">Student Name</th>
                            <th className="py-2.5 px-2.5 text-left">Academy</th>
                            <th className="py-2.5 px-2.5 text-left">Course</th>
                            <th className="py-2.5 px-2 text-left">Reg. Date</th>
                            <th className="py-2.5 px-2 text-right">Amount</th>
                            <th className="py-2.5 px-1 text-center">Status</th>
                            <th className="py-2.5 px-2 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="py-10 text-center text-slate-400">
                                    <RefreshCw size={18} className="animate-spin mx-auto text-indigo-600 mb-1.5" />
                                    <span>Loading learner course registrations...</span>
                                </td>
                            </tr>
                        ) : registrations.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-10 text-center text-slate-400">
                                    No learner course registrations match the current filter criteria.
                                </td>
                            </tr>
                        ) : (
                            registrations.map((r) => (
                                <tr key={r.registrationId} className="hover:bg-slate-50/70 transition-colors [&>td]:align-middle">
                                    {/* 1. Registration ID */}
                                    <td className="py-2 pl-4 pr-2 font-mono text-[11px] whitespace-nowrap">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenDetail(r.registrationId)}
                                            className="font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-100/70 px-1.5 py-0.5 rounded text-[10.5px] cursor-pointer transition-colors"
                                            title="Click to view full dossier"
                                        >
                                            {r.registrationCode || ('REG-' + r.registrationId.slice(0, 8).toUpperCase())}
                                        </button>
                                    </td>

                                    {/* 2. Student Name */}
                                    <td className="py-2 px-2.5 min-w-0">
                                        <div className="font-semibold text-slate-900 leading-tight truncate" title={r.learnerName}>
                                            {r.learnerName}
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate" title={r.learnerEmail}>
                                            {r.learnerEmail}
                                        </div>
                                    </td>

                                    {/* 3. Academy Name */}
                                    <td className="py-2 px-2.5 min-w-0">
                                        <div className="font-medium text-slate-800 leading-tight truncate" title={r.academyName}>
                                            {r.academyName}
                                        </div>
                                    </td>

                                    {/* 4. Course Name */}
                                    <td className="py-2 px-2.5 min-w-0">
                                        <div className="font-medium text-slate-800 leading-tight truncate" title={r.courseName}>
                                            {r.courseName}
                                        </div>
                                    </td>

                                    {/* 5. Registration Date */}
                                    <td className="py-2 px-2 text-slate-600 whitespace-nowrap text-[11px]">
                                        {formatDisplayDate(r.registrationDate)}
                                    </td>

                                    {/* 6. Registration Amount */}
                                    <td className="py-2 px-2 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                                        {formatMoney(r.registrationAmount)}
                                    </td>

                                    {/* 7. Registration Status */}
                                    <td className="py-2 px-1 text-center whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold capitalize ${
                                            r.status === 'confirmed' || r.status === 'completed'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : r.status === 'approved'
                                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                : r.status === 'pending'
                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                : r.status === 'waitlisted'
                                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                                : r.status === 'expired'
                                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                r.status === 'confirmed' || r.status === 'completed'
                                                    ? 'bg-emerald-500'
                                                    : r.status === 'approved'
                                                    ? 'bg-blue-500'
                                                    : r.status === 'pending'
                                                    ? 'bg-amber-500'
                                                    : r.status === 'waitlisted'
                                                    ? 'bg-slate-400'
                                                    : r.status === 'expired'
                                                    ? 'bg-orange-500'
                                                    : 'bg-rose-500'
                                            }`} />
                                            {r.status}
                                        </span>
                                    </td>

                                    {/* 8. Actions (View Details & Override) */}
                                    <td className="py-2 px-2 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                onClick={() => handleOpenDetail(r.registrationId)}
                                                className="h-6.5 px-2.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 text-[10.5px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs shrink-0"
                                                title="View complete details in dossier popup"
                                            >
                                                <Eye size={11} />
                                                <span>Details</span>
                                            </button>
                                            <button
                                                onClick={() => handleOpenOverride(r)}
                                                className="w-6.5 h-6.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
                                                title="Super Admin Status Override"
                                            >
                                                <ShieldAlert size={11} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={total}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => setCurrentPage(page)}
                    recordLabel="registrations"
                    loading={loading}
                />
            </div>

            {/* View Details Modal (Comprehensive Dossier Popup) */}
            {detailId && (
                <Modal
                    title="Registration Dossier & Lifecycle Record"
                    onClose={handleCloseDetail}
                    maxWidth="740px"
                >
                    {detailLoading ? (
                        <div className="py-16 text-center text-slate-400 font-sans text-xs">
                            <RefreshCw size={24} className="animate-spin mx-auto text-indigo-600 mb-3" />
                            <span>Loading comprehensive registration record...</span>
                        </div>
                    ) : detailError ? (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                            {detailError}
                        </div>
                    ) : detailData ? (
                        <div className="space-y-3 font-sans text-xs">
                            {/* Header Banner */}
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md border border-indigo-200">
                                            {detailData.registrationCode || ('REG-' + detailData.registrationId.slice(0, 8).toUpperCase())}
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            Submitted {formatDisplayDateTime(detailData.registrationDate)}
                                        </span>
                                    </div>
                                    <h2 className="text-sm font-bold text-slate-900">{detailData.student.name}</h2>
                                    <p className="text-[11px] text-slate-500">
                                        Applying to <strong className="text-slate-800">{detailData.academy.name}</strong> • {detailData.course.title}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {/* Reg status */}
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${
                                        detailData.status === 'confirmed' || detailData.status === 'completed'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : detailData.status === 'approved'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : detailData.status === 'pending'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : detailData.status === 'expired'
                                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                        Status: {detailData.status}
                                    </span>
                                    {/* Payment status */}
                                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                                        detailData.paymentStatus === 'Paid'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}>
                                        Payment: {detailData.paymentStatus}
                                    </span>
                                </div>
                            </div>

                            {/* 2-Column Dossier Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {/* 1. Student Information */}
                                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 text-slate-700 font-bold text-[11px]">
                                        <User size={13} className="text-indigo-600" />
                                        <span>Student Information</span>
                                    </div>
                                    <div className="space-y-1 text-slate-600">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Full Name:</span>
                                            <span className="font-semibold text-slate-900">{detailData.student.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Email:</span>
                                            <span className="text-slate-700 font-mono text-[11px]">{detailData.student.email}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Phone:</span>
                                            <span className="text-slate-700">{detailData.student.phone || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Enrollment No:</span>
                                            <span className="font-mono text-slate-800">{detailData.student.enrollmentNumber || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Academic Standing:</span>
                                            <span className="text-slate-700">{detailData.student.academicStanding || 'Good Standing'}</span>
                                        </div>
                                        {detailData.student.guardianName && (
                                            <div className="pt-1 border-t border-slate-100 flex justify-between">
                                                <span className="text-slate-400">Guardian:</span>
                                                <span className="text-slate-800">{detailData.student.guardianName} ({detailData.student.guardianPhone || '—'})</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Academy Information */}
                                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 text-slate-700 font-bold text-[11px]">
                                        <Building2 size={13} className="text-indigo-600" />
                                        <span>Academy Information</span>
                                    </div>
                                    <div className="space-y-1 text-slate-600">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Academy Name:</span>
                                            <span className="font-semibold text-slate-900">{detailData.academy.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Slug:</span>
                                            <span className="font-mono text-slate-600">/{detailData.academy.slug}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Location:</span>
                                            <span className="text-slate-800">{detailData.academy.location}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Official Contact:</span>
                                            <span className="text-slate-700">{detailData.academy.phone}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Email:</span>
                                            <span className="text-slate-700 text-[11px]">{detailData.academy.email}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Course and Batch Details (Moved from Table to Popup!) */}
                                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 text-slate-700 font-bold text-[11px]">
                                        <BookOpen size={13} className="text-indigo-600" />
                                        <span>Course &amp; Batch Details</span>
                                    </div>
                                    <div className="space-y-1 text-slate-600">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Course Title:</span>
                                            <span className="font-semibold text-slate-900">{detailData.course.title}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Category:</span>
                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10.5px] font-semibold">{detailData.course.category}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Batch Name:</span>
                                            <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{detailData.batch.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Campus Branch:</span>
                                            <span className="text-slate-700">{detailData.batch.branchName || 'Main Campus'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Batch Start:</span>
                                            <span className="text-slate-700">{formatDisplayDate(detailData.batch.startDate)}</span>
                                        </div>
                                        {detailData.batch.capacity && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Seat Capacity:</span>
                                                <span className="text-slate-700">{detailData.batch.capacity} seats</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 4. Financial & Payment Overview (Moved Detailed Payment Data to Popup!) */}
                                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 text-slate-700 font-bold text-[11px]">
                                        <CreditCard size={13} className="text-indigo-600" />
                                        <span>Tuition &amp; Payment Breakdown</span>
                                    </div>
                                    <div className="space-y-1 text-slate-600">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Registration Amount:</span>
                                            <span className="font-mono font-bold text-slate-900">{formatMoney(detailData.registrationAmount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Billing Period:</span>
                                            <span className="capitalize text-slate-700">{detailData.course.billingPeriod || 'Monthly'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Payment Status:</span>
                                            <span className="font-bold text-slate-800">{detailData.paymentStatus}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Payment Deadline:</span>
                                            <span className="font-semibold text-amber-800">{formatDisplayDate(detailData.paymentDeadline)}</span>
                                        </div>
                                        {detailData.invoiceNumber && (
                                            <div className="flex justify-between pt-1 border-t border-slate-100">
                                                <span className="text-slate-400">Invoice Number:</span>
                                                <span className="font-mono text-slate-700">{detailData.invoiceNumber}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 5. Registration Lifecycle Workflow Progress Indicator */}
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                    Registration Lifecycle Progress
                                </div>
                                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                                    <div className={`p-1.5 rounded-lg border ${
                                        detailData.status !== 'cancelled' && detailData.status !== 'rejected'
                                            ? 'bg-white border-emerald-300 text-emerald-800 font-bold'
                                            : 'bg-white border-slate-200 text-slate-400'
                                    }`}>
                                        <div>1. Submitted</div>
                                        <div className="text-[9px] text-slate-400">Request entered</div>
                                    </div>
                                    <div className={`p-1.5 rounded-lg border ${
                                        detailData.status === 'approved' || detailData.status === 'confirmed' || detailData.status === 'completed'
                                            ? 'bg-white border-emerald-300 text-emerald-800 font-bold'
                                            : detailData.status === 'expired'
                                            ? 'bg-white border-orange-300 text-orange-800 font-bold'
                                            : 'bg-white border-slate-200 text-slate-400'
                                    }`}>
                                        <div>2. Reviewed</div>
                                        <div className="text-[9px] text-slate-400">Seat held</div>
                                    </div>
                                    <div className={`p-1.5 rounded-lg border ${
                                        detailData.status === 'confirmed' || detailData.status === 'completed'
                                            ? 'bg-white border-emerald-300 text-emerald-800 font-bold'
                                            : 'bg-white border-slate-200 text-slate-400'
                                    }`}>
                                        <div>3. Payment</div>
                                        <div className="text-[9px] text-slate-400">Verified &amp; confirmed</div>
                                    </div>
                                    <div className={`p-1.5 rounded-lg border ${
                                        detailData.status === 'completed'
                                            ? 'bg-white border-purple-300 text-purple-800 font-bold'
                                            : 'bg-white border-slate-200 text-slate-400'
                                    }`}>
                                        <div>4. Concluded</div>
                                        <div className="text-[9px] text-slate-400">Course completed</div>
                                    </div>
                                </div>
                            </div>

                            {/* 6. Registration History & Audit Trail */}
                            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
                                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs pb-1 border-b border-slate-100">
                                    <Clock size={13} className="text-indigo-600" />
                                    <span>Registration History &amp; Audit Trail</span>
                                </div>

                                <div className="relative pl-5 space-y-2.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                    {detailData.history && detailData.history.length > 0 ? (
                                        detailData.history.map((ev, idx) => (
                                            <div key={idx} className="relative text-xs">
                                                <div className={`absolute -left-5 top-1 w-2 h-2 rounded-full ring-4 ring-white ${
                                                    ev.status === 'confirmed'
                                                        ? 'bg-emerald-500'
                                                        : ev.status === 'approved'
                                                        ? 'bg-blue-500'
                                                        : ev.status === 'expired'
                                                        ? 'bg-orange-500'
                                                        : ev.status === 'rejected' || ev.status === 'cancelled'
                                                        ? 'bg-rose-500'
                                                        : ev.status === 'override'
                                                        ? 'bg-amber-500'
                                                        : 'bg-indigo-500'
                                                }`} />
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                    <span className="font-bold text-slate-900">{ev.title}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {formatDisplayDateTime(ev.timestamp)}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-600 mt-0.5">{ev.details}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                    Actor: <strong className="text-slate-600">{ev.actor}</strong>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-slate-400 italic">No timeline events recorded yet.</div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => handleOpenOverride(detailData)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                    <ShieldAlert size={13} />
                                    <span>Override Status</span>
                                </button>
                                <button
                                    onClick={handleCloseDetail}
                                    className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors cursor-pointer text-xs"
                                >
                                    Close Dossier
                                </button>
                            </div>
                        </div>
                    ) : null}
                </Modal>
            )}

            {/* Exceptional Status Override Modal */}
            {overrideReg && (
                <Modal
                    title="Exceptional Administrative Status Override"
                    onClose={() => setOverrideReg(null)}
                    maxWidth="480px"
                >
                    <form
                        noValidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleExecuteOverride();
                        }}
                        className="space-y-3 font-sans text-xs"
                    >
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed text-[11px]">
                            <strong>Platform Security &amp; Audit Notice:</strong> Status overrides bypass standard academy panel review and gateway confirmation. This action will be cryptographically logged to the compliance audit trail with your actor signature.
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Target Lifecycle Status <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                onBlur={overrideForm.touch('status')}
                                aria-invalid={!!overrideForm.error('status')}
                                style={invalidStyle(overrideForm.error('status'))}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-indigo-500 capitalize shadow-2xs"
                            >
                                {['pending', 'approved', 'confirmed', 'waitlisted', 'completed', 'rejected', 'expired', 'cancelled'].map((st) => (
                                    <option key={st} value={st}>{st}</option>
                                ))}
                            </select>
                            <p className="text-[11px] text-slate-400 mt-1">
                                Current status: <span className="font-semibold capitalize text-slate-700">{overrideReg.status}</span>
                            </p>
                            {STATUS_EXPLANATIONS[newStatus] && (
                                <div className="mt-1.5 p-2 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-800 leading-relaxed">
                                    <strong className="capitalize">{newStatus}:</strong> {STATUS_EXPLANATIONS[newStatus]}
                                </div>
                            )}
                            <FieldError message={overrideForm.error('status')} />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-slate-700">
                                    Mandatory Justification Reason <span className="text-rose-500">*</span>
                                </label>
                                <span className={`text-[10px] ${overrideReason.trim().length > 500 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                    {overrideReason.trim().length}/500
                                </span>
                            </div>
                            <textarea
                                rows={3}
                                required
                                placeholder="Explain the specific support, legal, operational, or financial reason for this status override..."
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                                onBlur={overrideForm.touch('reason')}
                                aria-invalid={!!overrideForm.error('reason')}
                                style={invalidStyle(overrideForm.error('reason'))}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none shadow-2xs"
                            />
                            <FieldError message={overrideForm.error('reason')} />
                        </div>

                        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setOverrideReg(null)}
                                disabled={overrideBusy}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={overrideBusy}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                {overrideBusy ? <>Applying… <RefreshCw size={13} className="animate-spin" /></> : 'Apply Status Override'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
