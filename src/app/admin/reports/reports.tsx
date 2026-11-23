'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    BarChart3, Download, RefreshCw, Calendar, TrendingUp,
    Users, Building2, BookOpen, ClipboardCheck, CreditCard,
    RotateCcw, Landmark, Percent, CheckCircle2, AlertCircle,
    FileSpreadsheet, Filter, X, ArrowUpRight, ArrowDownRight,
    Eye, Shield, Check, Clock, ChevronRight, Layers, FileText
} from 'lucide-react';
import { api, formatMoney } from '@/lib/api';
import Modal from '@/components/Modal';

// --- Data Interfaces ---

interface FilterOptions {
    academies: Array<{ id: string; name: string }>;
    courses: Array<{ id: string; title: string; tenantId: string }>;
}

interface MetaData {
    timeframe: 'today' | 'week' | 'month' | 'year' | 'custom';
    startDate: string;
    endDate: string;
    adminRole: 'SuperAdmin' | 'FinanceAdmin' | 'SupportAdmin';
    allowedReports: string[];
}

interface AcademyRecord {
    tenant_id: string;
    academy_name: string;
    academy_type: string;
    status: string;
    verification_status: string;
    created_at: string;
    total_courses: number;
    total_students: number;
    contact_email: string | null;
}

interface RegistrationRecord {
    registration_id: string;
    registration_code: string;
    learner_name: string;
    learner_email: string;
    learner_phone: string;
    course_name: string;
    academy_name: string;
    status: string;
    enrolled_at: string;
    amount: number;
}

interface PaymentRecord {
    transaction_id: string;
    payment_id: string;
    order_id: string;
    amount: number;
    status: string;
    payment_method: string;
    created_at: string;
    academy_name: string;
    description: string;
}

interface RevenueRecord {
    academy_name: string;
    transaction_count: number;
    gross_sales: number;
    platform_commission: number;
    gst_tax: number;
    gateway_charges: number;
    academy_share: number;
}

interface TaxRecord {
    reference_id: string;
    tax_invoice_no: string;
    academy_name: string;
    gross_transaction_amount: number;
    taxable_commission: number;
    cgst_amount: number;
    sgst_amount: number;
    total_gst_tax: number;
    tax_rate: string;
    filing_status: string;
    created_at: string;
}

interface TrendPoint {
    label: string;
    date: string;
    count?: number;
    confirmed_count?: number;
    volume?: number;
    gross?: number;
    commission?: number;
    academy_share?: number;
    new_count?: number;
    verified_count?: number;
}

interface ReportsResponse {
    meta: MetaData;
    filterOptions: FilterOptions;
    academyReport: {
        total: number;
        verified: number;
        pending: number;
        rejected: number;
        suspended: number;
        records: AcademyRecord[];
        growthTrends: TrendPoint[];
    };
    registrationReport: {
        total: number;
        pending: number;
        approved: number;
        confirmed: number;
        waitlisted: number;
        rejected: number;
        expired: number;
        cancelled: number;
        completed: number;
        conversionRate: number;
        records: RegistrationRecord[];
        trends: TrendPoint[];
    };
    paymentReport: {
        totalCount: number;
        successfulCount: number;
        pendingCount: number;
        failedCount: number;
        totalGrossVolume: number;
        totalRefundedAmount: number;
        records: PaymentRecord[];
        trends: TrendPoint[];
    };
    revenueReport: {
        grossSales: number;
        platformCommission: number;
        gstTaxOnCommission: number;
        gatewayCharges: number;
        academyShare: number;
        records: RevenueRecord[];
        trends: TrendPoint[];
    };
    taxReport: {
        taxableCommission: number;
        totalGst: number;
        cgst: number;
        sgst: number;
        records: TaxRecord[];
    };
}

export default function PlatformAdminReportsPage() {
    const [reports, setReports] = useState<ReportsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    // Filters
    const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [selectedAcademy, setSelectedAcademy] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedRegStatus, setSelectedRegStatus] = useState('');
    const [selectedPayStatus, setSelectedPayStatus] = useState('');

    // Active drill-down modal report view
    const [activeDrilldown, setActiveDrilldown] = useState<
        'academies' | 'registrations' | 'payments' | 'revenue' | 'tax' | null
    >(null);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Filter courses based on selected academy
    const filteredCourses = useMemo(() => {
        if (!reports?.filterOptions?.courses) return [];
        if (!selectedAcademy) return reports.filterOptions.courses;
        return reports.filterOptions.courses.filter(c => c.tenantId === selectedAcademy);
    }, [reports, selectedAcademy]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.set('timeframe', timeframe);
            if (timeframe === 'custom') {
                if (customFrom) params.set('from', customFrom);
                if (customTo) params.set('to', customTo);
            }
            if (selectedAcademy) params.set('academy', selectedAcademy);
            if (selectedCourse) params.set('course', selectedCourse);
            if (selectedRegStatus) params.set('regStatus', selectedRegStatus);
            if (selectedPayStatus) params.set('payStatus', selectedPayStatus);

            const res = await api<ReportsResponse>(`/platform/reports?${params.toString()}`);
            setReports(res);
        } catch (err: any) {
            showToast(err?.message || 'Failed to aggregate reports & analytics', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [timeframe, refreshKey, selectedAcademy, selectedCourse, selectedRegStatus, selectedPayStatus]);

    const handleApplyCustomDate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customFrom || !customTo) {
            showToast('Please select both Start and End dates for custom range.', 'error');
            return;
        }
        if (new Date(customFrom) > new Date(customTo)) {
            showToast('Start date cannot be after End date.', 'error');
            return;
        }
        setTimeframe('custom');
        fetchReports();
    };

    const handleResetFilters = () => {
        setTimeframe('month');
        setCustomFrom('');
        setCustomTo('');
        setSelectedAcademy('');
        setSelectedCourse('');
        setSelectedRegStatus('');
        setSelectedPayStatus('');
        setRefreshKey(k => k + 1);
    };

    // Role-based permission checks
    const adminRole = reports?.meta?.adminRole || 'SuperAdmin';
    const allowedReports = reports?.meta?.allowedReports || ['all'];

    const canView = (category: string) => {
        if (adminRole === 'SuperAdmin') return true;
        if (allowedReports.includes('all')) return true;
        return allowedReports.includes(category);
    };

    // Helper to safely escape CSV cells
    const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const s = String(val).replace(/"/g, '""');
        return `"${s}"`;
    };

    const safeDateStr = (dateVal: any) => {
        if (!dateVal) return '—';
        try {
            const d = new Date(dateVal);
            return isNaN(d.getTime()) ? String(dateVal) : d.toLocaleString('en-IN');
        } catch {
            return String(dateVal);
        }
    };

    // CSV Exporter using real data with standard Blob (no URI length/encoding limitations)
    const exportReportCSV = (category: 'academies' | 'registrations' | 'payments' | 'revenue' | 'tax' | 'all') => {
        if (!reports) {
            showToast('Report data is still loading, please wait...', 'error');
            return;
        }

        try {
            let headers: string[] = [];
            let rows: string[][] = [];
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `classsphere_${category}_report_${timestamp}.csv`;

            if (category === 'academies') {
                headers = ['Academy ID', 'Academy Name', 'Type', 'Status', 'Verification', 'Total Courses', 'Total Students', 'Contact Email', 'Onboarded Date'];
                rows = (reports.academyReport?.records || []).map(a => [
                    escapeCsv(a.tenant_id),
                    escapeCsv(a.academy_name),
                    escapeCsv(a.academy_type),
                    escapeCsv(a.status),
                    escapeCsv(a.verification_status),
                    String(a.total_courses ?? 0),
                    String(a.total_students ?? 0),
                    escapeCsv(a.contact_email || '—'),
                    escapeCsv(safeDateStr(a.created_at))
                ]);
            } else if (category === 'registrations') {
                headers = ['Registration Code', 'Student Name', 'Email', 'Phone', 'Course Name', 'Academy Name', 'Status', 'Course Fee (INR)', 'Enrolled Date'];
                rows = (reports.registrationReport?.records || []).map(r => [
                    escapeCsv(r.registration_code),
                    escapeCsv(r.learner_name),
                    escapeCsv(r.learner_email),
                    escapeCsv(r.learner_phone),
                    escapeCsv(r.course_name),
                    escapeCsv(r.academy_name),
                    escapeCsv(r.status),
                    Number(r.amount || 0).toFixed(2),
                    escapeCsv(safeDateStr(r.enrolled_at))
                ]);
            } else if (category === 'payments') {
                headers = ['Transaction ID', 'Gateway Payment ID', 'Gateway Order ID', 'Academy Name', 'Description', 'Gross Amount (INR)', 'Method', 'Status', 'Transaction Date'];
                rows = (reports.paymentReport?.records || []).map(p => [
                    escapeCsv(p.transaction_id),
                    escapeCsv(p.payment_id),
                    escapeCsv(p.order_id),
                    escapeCsv(p.academy_name),
                    escapeCsv(p.description),
                    Number(p.amount || 0).toFixed(2),
                    escapeCsv(p.payment_method),
                    escapeCsv(p.status),
                    escapeCsv(safeDateStr(p.created_at))
                ]);
            } else if (category === 'revenue') {
                headers = ['Academy Name', 'Transactions Count', 'Gross Sales (INR)', 'Platform Facilitation (10%)', 'GST Tax (18% on Comm)', 'Gateway Charges (2%)', 'Net Academy Share (INR)'];
                rows = (reports.revenueReport?.records || []).map(rv => [
                    escapeCsv(rv.academy_name),
                    String(rv.transaction_count ?? 0),
                    Number(rv.gross_sales || 0).toFixed(2),
                    Number(rv.platform_commission || 0).toFixed(2),
                    Number(rv.gst_tax || 0).toFixed(2),
                    Number(rv.gateway_charges || 0).toFixed(2),
                    Number(rv.academy_share || 0).toFixed(2)
                ]);
            } else if (category === 'tax') {
                headers = ['Tax Invoice No', 'Reference Transaction ID', 'Academy Partner', 'Gross Transaction (INR)', 'Taxable Commission (INR)', 'CGST (9%)', 'SGST (9%)', 'Total GST Tax (18%)', 'Tax Rate', 'Filing Status', 'Date'];
                rows = (reports.taxReport?.records || []).map(t => [
                    escapeCsv(t.tax_invoice_no),
                    escapeCsv(t.reference_id),
                    escapeCsv(t.academy_name),
                    Number(t.gross_transaction_amount || 0).toFixed(2),
                    Number(t.taxable_commission || 0).toFixed(2),
                    Number(t.cgst_amount || 0).toFixed(2),
                    Number(t.sgst_amount || 0).toFixed(2),
                    Number(t.total_gst_tax || 0).toFixed(2),
                    escapeCsv(t.tax_rate),
                    escapeCsv(t.filing_status),
                    escapeCsv(safeDateStr(t.created_at))
                ]);
            } else {
                headers = ['Metric Category', 'Metric Indicator', 'Report Value', 'Time Scope'];
                rows = [
                    [escapeCsv('Academy Overview'), escapeCsv('Total Academies'), String(reports.academyReport?.total ?? 0), escapeCsv(reports.meta?.timeframe || 'period')],
                    [escapeCsv('Academy Overview'), escapeCsv('Verified Academies'), String(reports.academyReport?.verified ?? 0), escapeCsv(reports.meta?.timeframe || 'period')],
                    [escapeCsv('Academy Overview'), escapeCsv('Suspended Academies'), String(reports.academyReport?.suspended ?? 0), escapeCsv(reports.meta?.timeframe || 'period')],
                    [escapeCsv('Registrations'), escapeCsv('Total Registrations'), String(reports.registrationReport?.total ?? 0), escapeCsv(reports.meta?.timeframe || 'period')],
                    [escapeCsv('Registrations'), escapeCsv('Confirmed Bookings'), String(reports.registrationReport?.confirmed ?? 0), escapeCsv(reports.meta?.timeframe || 'period')],
                    [escapeCsv('Registrations'), escapeCsv('Conversion Rate'), escapeCsv(`${reports.registrationReport?.conversionRate ?? 0}%`), escapeCsv(reports.meta?.timeframe || 'period')],
                    [escapeCsv('Payments'), escapeCsv('Total Successful Volume'), escapeCsv(formatMoney(reports.paymentReport?.totalGrossVolume ?? 0)), escapeCsv(reports.meta?.timeframe || 'period')],
                    [escapeCsv('Payments'), escapeCsv('Total Refunded Amount'), escapeCsv(formatMoney(reports.paymentReport?.totalRefundedAmount ?? 0)), escapeCsv(reports.meta?.timeframe || 'period')],
                    [escapeCsv('Revenue'), escapeCsv('Platform Facilitation Commission'), escapeCsv(formatMoney(reports.revenueReport?.platformCommission ?? 0)), escapeCsv(reports.meta?.timeframe || 'period')],
                    [escapeCsv('Revenue'), escapeCsv('Net Academy Share'), escapeCsv(formatMoney(reports.revenueReport?.academyShare ?? 0)), escapeCsv(reports.meta?.timeframe || 'period')],
                    [escapeCsv('Tax Audit'), escapeCsv('18% GST Collected'), escapeCsv(formatMoney(reports.taxReport?.totalGst ?? 0)), escapeCsv(reports.meta?.timeframe || 'period')],
                ];
            }

            const csvString = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast(`${category.toUpperCase()} audit report exported to CSV successfully`);
        } catch (err: any) {
            console.error('CSV Export Error:', err);
            showToast(err?.message || 'Failed to export CSV report', 'error');
        }
    };

    const formatDateRangeDisplay = () => {
        if (!reports?.meta) return 'Loading date range...';
        const start = new Date(reports.meta.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const end = new Date(reports.meta.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        return `Showing records from ${start} to ${end}`;
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-[10000] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
                        toast.type === 'success'
                            ? 'bg-white border-emerald-200 text-emerald-800'
                            : 'bg-white border-rose-200 text-rose-800'
                    }`}
                >
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
                        {adminRole !== 'SuperAdmin' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {adminRole} View
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Evaluate multi-tenant performance, financial ledger settlements, course conversion rates, and audit compliance data.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Timeframe selector */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                        {[
                            { key: 'today', label: 'Today' },
                            { key: 'week', label: 'This Week' },
                            { key: 'month', label: 'This Month' },
                            { key: 'year', label: 'This Year' },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTimeframe(t.key as any)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                    timeframe === t.key ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => exportReportCSV('all')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
                        title="Export Consolidated Master Summary"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Export Master CSV
                    </button>

                    <button
                        onClick={() => setRefreshKey(k => k + 1)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter Bar with Date Display */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-indigo-700 font-semibold bg-indigo-50/70 px-3 py-1.5 rounded-lg border border-indigo-100">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{formatDateRangeDisplay()}</span>
                    </div>

                    {/* Reset Filters button */}
                    {(selectedAcademy || selectedCourse || selectedRegStatus || selectedPayStatus || timeframe === 'custom') && (
                        <button
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors self-start md:self-auto"
                        >
                            <X className="w-3.5 h-3.5" />
                            Reset Filters
                        </button>
                    )}
                </div>

                {/* Filter Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    {/* Academy Selector */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Academy
                        </label>
                        <select
                            value={selectedAcademy}
                            onChange={(e) => {
                                setSelectedAcademy(e.target.value);
                                setSelectedCourse('');
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Academies</option>
                            {(reports?.filterOptions?.academies || []).map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Course Selector */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Course
                        </label>
                        <select
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            disabled={filteredCourses.length === 0}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            <option value="">All Courses</option>
                            {filteredCourses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Registration Status */}
                    {canView('registrations') && (
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                Registration Status
                            </label>
                            <select
                                value={selectedRegStatus}
                                onChange={(e) => setSelectedRegStatus(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">All Registrations</option>
                                <option value="confirmed">Confirmed / Enrolled</option>
                                <option value="pending">Pending Review</option>
                                <option value="approved">Approved</option>
                                <option value="waitlisted">Waitlisted</option>
                                <option value="rejected">Rejected</option>
                                <option value="expired">Expired</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    )}

                    {/* Payment Status */}
                    {canView('payments') && (
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                Payment Status
                            </label>
                            <select
                                value={selectedPayStatus}
                                onChange={(e) => setSelectedPayStatus(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">All Payments</option>
                                <option value="success">Successful</option>
                                <option value="posted">Posted Fee</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed / Cancelled</option>
                            </select>
                        </div>
                    )}

                    {/* Custom Date Form */}
                    <div className="flex items-end gap-1.5">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                Custom Range
                            </label>
                            <div className="flex items-center gap-1">
                                <input
                                    type="date"
                                    value={customFrom}
                                    onChange={(e) => setCustomFrom(e.target.value)}
                                    className="w-full px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-md text-slate-700"
                                    title="Start Date"
                                />
                                <span className="text-slate-400 text-xs">to</span>
                                <input
                                    type="date"
                                    value={customTo}
                                    onChange={(e) => setCustomTo(e.target.value)}
                                    className="w-full px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-md text-slate-700"
                                    title="End Date"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleApplyCustomDate}
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition-colors"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>

            {/* Top 5 Real Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Gross Volume */}
                {canView('payments') && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Gross Processed Sales
                        </span>
                        <div className="text-xl font-bold text-slate-900 mt-1">
                            {loading ? '...' : formatMoney(reports?.paymentReport?.totalGrossVolume ?? 0)}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>{reports?.paymentReport?.successfulCount ?? 0} successful payments</span>
                        </div>
                    </div>
                )}

                {/* 2. Platform Commission */}
                {canView('revenue') && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Platform Commission
                        </span>
                        <div className="text-xl font-bold text-indigo-700 mt-1">
                            {loading ? '...' : formatMoney(reports?.revenueReport?.platformCommission ?? 0)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 block">
                            10% standard facilitation yield
                        </div>
                    </div>
                )}

                {/* 3. Conversion Rate */}
                {canView('registrations') && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Registration Conversion
                        </span>
                        <div className="text-xl font-bold text-emerald-700 mt-1">
                            {loading ? '...' : `${reports?.registrationReport?.conversionRate ?? 0}%`}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 block">
                            {reports?.registrationReport?.confirmed ?? 0} of {reports?.registrationReport?.total ?? 0} confirmed
                        </div>
                    </div>
                )}

                {/* 4. Active Academies */}
                {canView('academies') && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Partner Academies
                        </span>
                        <div className="text-xl font-bold text-slate-900 mt-1">
                            {loading ? '...' : reports?.academyReport?.total ?? 0}
                        </div>
                        <div className="text-[11px] text-emerald-600 mt-1 block">
                            {reports?.academyReport?.verified ?? 0} verified partners
                        </div>
                    </div>
                )}

                {/* 5. Net Academy Share */}
                {canView('revenue') && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Net Academy Share
                        </span>
                        <div className="text-xl font-bold text-teal-700 mt-1">
                            {loading ? '...' : formatMoney(reports?.revenueReport?.academyShare ?? 0)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 block">
                            88% net academy entitlement
                        </div>
                    </div>
                )}
            </div>

            {/* Interactive Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Chart 1: Registration Trends */}
                {canView('registrations') && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Registration & Enrollment Trends</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Total student bookings vs confirmed course enrollments</p>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                                Total: {reports?.registrationReport?.total ?? 0}
                            </span>
                        </div>

                        {/* Visual SVG Chart */}
                        <div className="py-4">
                            {(reports?.registrationReport?.trends || []).length === 0 ? (
                                <div className="py-12 text-center text-xs text-slate-400">
                                    No registration timeline activity recorded for this period.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="h-40 flex items-end gap-2 pt-6">
                                        {(reports?.registrationReport?.trends || []).map((t, i) => {
                                            const max = Math.max(...(reports?.registrationReport?.trends || []).map(x => x.count || 1), 5);
                                            const heightPct = Math.min(Math.max(((t.count || 0) / max) * 100, 10), 100);
                                            const confirmedPct = Math.min(Math.max(((t.confirmed_count || 0) / max) * 100, 5), 100);
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                                                    {/* Tooltip */}
                                                    <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                                        <div className="bg-slate-900 text-white text-[10px] rounded px-2 py-1 shadow-md whitespace-nowrap">
                                                            {t.label}: {t.count} total ({t.confirmed_count} confirmed)
                                                        </div>
                                                    </div>
                                                    <div className="w-full max-w-[28px] bg-indigo-100 rounded-t-sm flex flex-col justify-end overflow-hidden" style={{ height: `${heightPct}%` }}>
                                                        <div className="w-full bg-indigo-600 rounded-t-sm transition-all" style={{ height: `${(confirmedPct / heightPct) * 100}%` }}></div>
                                                    </div>
                                                    <span className="text-[9px] font-medium text-slate-400 truncate w-full text-center">
                                                        {t.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center justify-center gap-5 text-xs text-slate-500 pt-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-xs bg-indigo-100 border border-indigo-200"></span>
                                            <span>All Bookings</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-xs bg-indigo-600"></span>
                                            <span>Confirmed & Paid</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Chart 2: Revenue & Platform Yield Trends */}
                {canView('revenue') && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Platform Revenue & Academy Disbursements</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Gross collection volume vs 10% platform facilitation earnings</p>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                                {formatMoney(reports?.revenueReport?.grossSales ?? 0)}
                            </span>
                        </div>

                        {/* Visual SVG Chart */}
                        <div className="py-4">
                            {(reports?.revenueReport?.trends || []).length === 0 ? (
                                <div className="py-12 text-center text-xs text-slate-400">
                                    No financial transaction activity recorded for this period.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="h-40 flex items-end gap-2 pt-6">
                                        {(reports?.revenueReport?.trends || []).map((t, i) => {
                                            const max = Math.max(...(reports?.revenueReport?.trends || []).map(x => x.gross || 1), 1000);
                                            const heightPct = Math.min(Math.max(((t.gross || 0) / max) * 100, 10), 100);
                                            const commPct = Math.min(Math.max(((t.commission || 0) / max) * 100, 5), 100);
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                                                    {/* Tooltip */}
                                                    <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                                        <div className="bg-slate-900 text-white text-[10px] rounded px-2 py-1 shadow-md whitespace-nowrap">
                                                            {t.label}: Gross ₹{t.gross} | Comm ₹{t.commission}
                                                        </div>
                                                    </div>
                                                    <div className="w-full max-w-[28px] bg-slate-100 rounded-t-sm flex flex-col justify-end overflow-hidden" style={{ height: `${heightPct}%` }}>
                                                        <div className="w-full bg-emerald-500 rounded-t-sm transition-all" style={{ height: `${(commPct / heightPct) * 100}%` }}></div>
                                                    </div>
                                                    <span className="text-[9px] font-medium text-slate-400 truncate w-full text-center">
                                                        {t.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center justify-center gap-5 text-xs text-slate-500 pt-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-xs bg-slate-200"></span>
                                            <span>Gross Sales</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-xs bg-emerald-500"></span>
                                            <span>Platform Facilitation Yield (10%)</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 5 Core Reports Grid with Drill-Down & CSV Export */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Standard Audit & Compliance Data Reports</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Explore individual records, investigate breakdown ledgers, and download compliant CSV audits.</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">Database Sync Active</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* 1. Academy Report Card */}
                    {canView('academies') && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setActiveDrilldown('academies')}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => exportReportCSV('academies')}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                            title="Export CSV"
                                        >
                                            <Download className="w-3.5 h-3.5 text-slate-500" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-slate-900 text-sm">Academy Onboarding & Verification</h3>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Multi-tenant onboarding status, verified credentials, pending applications, and suspended compliance holds.
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
                                        <span className="text-sm font-bold text-slate-800">{reports?.academyReport?.total ?? 0}</span>
                                    </div>
                                    <div className="p-2 bg-emerald-50 rounded-lg">
                                        <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Verified</span>
                                        <span className="text-sm font-bold text-emerald-700">{reports?.academyReport?.verified ?? 0}</span>
                                    </div>
                                    <div className="p-2 bg-rose-50 rounded-lg">
                                        <span className="text-[10px] text-rose-600 uppercase font-semibold block">Suspended</span>
                                        <span className="text-sm font-bold text-rose-700">{reports?.academyReport?.suspended ?? 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. Registration Report Card */}
                    {canView('registrations') && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <ClipboardCheck className="w-5 h-5" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setActiveDrilldown('registrations')}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => exportReportCSV('registrations')}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                            title="Export CSV"
                                        >
                                            <Download className="w-3.5 h-3.5 text-slate-500" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-slate-900 text-sm">Course Registrations & Funnel</h3>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Enrollment funnels, waitlist buffers, confirmed student seats, and registration expirations.
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
                                        <span className="text-sm font-bold text-slate-800">{reports?.registrationReport?.total ?? 0}</span>
                                    </div>
                                    <div className="p-2 bg-emerald-50 rounded-lg">
                                        <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Confirmed</span>
                                        <span className="text-sm font-bold text-emerald-700">{reports?.registrationReport?.confirmed ?? 0}</span>
                                    </div>
                                    <div className="p-2 bg-amber-50 rounded-lg">
                                        <span className="text-[10px] text-amber-600 uppercase font-semibold block">Pending</span>
                                        <span className="text-sm font-bold text-amber-700">{reports?.registrationReport?.pending ?? 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. Payment Report Card */}
                    {canView('payments') && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setActiveDrilldown('payments')}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => exportReportCSV('payments')}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                            title="Export CSV"
                                        >
                                            <Download className="w-3.5 h-3.5 text-slate-500" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-slate-900 text-sm">Payment & Transaction Audit</h3>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        All gateway transactions, invoice payments, successful settlements, and refunded claim volume.
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Volume</span>
                                        <span className="text-sm font-bold text-slate-800">{formatMoney(reports?.paymentReport?.totalGrossVolume ?? 0)}</span>
                                    </div>
                                    <div className="p-2 bg-emerald-50 rounded-lg">
                                        <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Success</span>
                                        <span className="text-sm font-bold text-emerald-700">{reports?.paymentReport?.successfulCount ?? 0}</span>
                                    </div>
                                    <div className="p-2 bg-rose-50 rounded-lg">
                                        <span className="text-[10px] text-rose-600 uppercase font-semibold block">Refunded</span>
                                        <span className="text-sm font-bold text-rose-700">{formatMoney(reports?.paymentReport?.totalRefundedAmount ?? 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Revenue & Commission Report Card */}
                    {canView('revenue') && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Percent className="w-5 h-5" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setActiveDrilldown('revenue')}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => exportReportCSV('revenue')}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                            title="Export CSV"
                                        >
                                            <Download className="w-3.5 h-3.5 text-slate-500" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-slate-900 text-sm">Revenue & Platform Commission</h3>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        10% platform facilitation take-rate, 2% payment gateway split, and net 88% academy disbursement ledger.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                        <span className="text-[10px] text-indigo-600 uppercase font-semibold block">Platform Commission</span>
                                        <span className="text-sm font-bold text-indigo-700">{formatMoney(reports?.revenueReport?.platformCommission ?? 0)}</span>
                                    </div>
                                    <div className="p-2 bg-teal-50 rounded-lg">
                                        <span className="text-[10px] text-teal-600 uppercase font-semibold block">Academy Share</span>
                                        <span className="text-sm font-bold text-teal-700">{formatMoney(reports?.revenueReport?.academyShare ?? 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5. Tax Report Card */}
                    {canView('tax') && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Landmark className="w-5 h-5" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setActiveDrilldown('tax')}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => exportReportCSV('tax')}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                            title="Export CSV"
                                        >
                                            <Download className="w-3.5 h-3.5 text-slate-500" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-slate-900 text-sm">GST Tax & Compliance Ledger</h3>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Statutory 18% GST tax audit records on platform commission (9% CGST + 9% SGST breakdown).
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Taxable Base</span>
                                        <span className="text-sm font-bold text-slate-800">{formatMoney(reports?.taxReport?.taxableCommission ?? 0)}</span>
                                    </div>
                                    <div className="p-2 bg-purple-50 rounded-lg">
                                        <span className="text-[10px] text-purple-600 uppercase font-semibold block">18% GST Tax</span>
                                        <span className="text-sm font-bold text-purple-700">{formatMoney(reports?.taxReport?.totalGst ?? 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* DRILL-DOWN REPORT MODAL                                                   */}
            {/* ========================================================================= */}
            {activeDrilldown && (
                <Modal
                    isOpen={!!activeDrilldown}
                    onClose={() => setActiveDrilldown(null)}
                    title={
                        activeDrilldown === 'academies'
                            ? 'Academy Onboarding & Verification Audit'
                            : activeDrilldown === 'registrations'
                            ? 'Course Registrations & Enrollments Ledger'
                            : activeDrilldown === 'payments'
                            ? 'Payment Transactions & Settlements'
                            : activeDrilldown === 'revenue'
                            ? 'Platform Revenue & Commission Breakdown'
                            : 'GST Tax Audit & Statutory Filings'
                    }
                    maxWidth="960px"
                >
                    <div className="space-y-4">
                        {/* Top bar with Export */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <span className="text-xs text-slate-500">
                                {formatDateRangeDisplay()}
                            </span>
                            <button
                                onClick={() => exportReportCSV(activeDrilldown)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Export This Table to CSV
                            </button>
                        </div>

                        {/* 1. Academies Table */}
                        {activeDrilldown === 'academies' && (
                            <div className="overflow-x-auto max-h-[500px]">
                                <table className="w-full text-left text-xs text-slate-700">
                                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
                                        <tr>
                                            <th className="py-2.5 px-3">Academy Name</th>
                                            <th className="py-2.5 px-3">Type</th>
                                            <th className="py-2.5 px-3">Verification</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3">Courses</th>
                                            <th className="py-2.5 px-3">Learners</th>
                                            <th className="py-2.5 px-3">Onboarded</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(reports?.academyReport?.records || []).map((a) => (
                                            <tr key={a.tenant_id} className="hover:bg-slate-50">
                                                <td className="py-2.5 px-3 font-semibold text-slate-900">{a.academy_name}</td>
                                                <td className="py-2.5 px-3 capitalize">{a.academy_type}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        a.verification_status === 'verified'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : a.verification_status === 'pending'
                                                            ? 'bg-amber-50 text-amber-700'
                                                            : 'bg-rose-50 text-rose-700'
                                                    }`}>
                                                        {a.verification_status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 capitalize">{a.status}</td>
                                                <td className="py-2.5 px-3">{a.total_courses}</td>
                                                <td className="py-2.5 px-3">{a.total_students}</td>
                                                <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">{formatDate(a.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 2. Registrations Table */}
                        {activeDrilldown === 'registrations' && (
                            <div className="overflow-x-auto max-h-[500px]">
                                <table className="w-full text-left text-xs text-slate-700">
                                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
                                        <tr>
                                            <th className="py-2.5 px-3">Reg ID</th>
                                            <th className="py-2.5 px-3">Student Name</th>
                                            <th className="py-2.5 px-3">Course</th>
                                            <th className="py-2.5 px-3">Academy</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3">Fee Amount</th>
                                            <th className="py-2.5 px-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(reports?.registrationReport?.records || []).map((r) => (
                                            <tr key={r.registration_id} className="hover:bg-slate-50">
                                                <td className="py-2.5 px-3 font-mono font-medium text-slate-800">{r.registration_code}</td>
                                                <td className="py-2.5 px-3 font-semibold text-slate-900">{r.learner_name}</td>
                                                <td className="py-2.5 px-3">{r.course_name}</td>
                                                <td className="py-2.5 px-3">{r.academy_name}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                                                        r.status === 'confirmed' || r.status === 'enrolled'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : r.status === 'pending'
                                                            ? 'bg-amber-50 text-amber-700'
                                                            : r.status === 'approved'
                                                            ? 'bg-indigo-50 text-indigo-700'
                                                            : 'bg-rose-50 text-rose-700'
                                                    }`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 font-bold text-slate-900">{formatMoney(r.amount)}</td>
                                                <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">{formatDate(r.enrolled_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 3. Payments Table */}
                        {activeDrilldown === 'payments' && (
                            <div className="overflow-x-auto max-h-[500px]">
                                <table className="w-full text-left text-xs text-slate-700">
                                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
                                        <tr>
                                            <th className="py-2.5 px-3">Payment Ref</th>
                                            <th className="py-2.5 px-3">Academy / Scope</th>
                                            <th className="py-2.5 px-3">Description</th>
                                            <th className="py-2.5 px-3">Gross Amount</th>
                                            <th className="py-2.5 px-3">Method</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(reports?.paymentReport?.records || []).map((p) => (
                                            <tr key={p.transaction_id} className="hover:bg-slate-50">
                                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800">{p.payment_id}</td>
                                                <td className="py-2.5 px-3 font-semibold text-slate-900">{p.academy_name}</td>
                                                <td className="py-2.5 px-3">{p.description}</td>
                                                <td className="py-2.5 px-3 font-bold text-slate-900">{formatMoney(p.amount)}</td>
                                                <td className="py-2.5 px-3 uppercase text-[10px] font-medium text-slate-500">{p.payment_method}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                                                        p.status === 'success' || p.status === 'posted' || p.status === 'reconciled'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : p.status === 'pending'
                                                            ? 'bg-amber-50 text-amber-700'
                                                            : 'bg-rose-50 text-rose-700'
                                                    }`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">{formatDate(p.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 4. Revenue Table */}
                        {activeDrilldown === 'revenue' && (
                            <div className="overflow-x-auto max-h-[500px]">
                                <table className="w-full text-left text-xs text-slate-700">
                                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
                                        <tr>
                                            <th className="py-2.5 px-3">Academy Partner</th>
                                            <th className="py-2.5 px-3">Transactions</th>
                                            <th className="py-2.5 px-3">Gross Sales</th>
                                            <th className="py-2.5 px-3">Platform Comm (10%)</th>
                                            <th className="py-2.5 px-3">GST Tax (18%)</th>
                                            <th className="py-2.5 px-3">Gateway (2%)</th>
                                            <th className="py-2.5 px-3">Net Academy Share</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(reports?.revenueReport?.records || []).map((rv, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="py-2.5 px-3 font-semibold text-slate-900">{rv.academy_name}</td>
                                                <td className="py-2.5 px-3">{rv.transaction_count}</td>
                                                <td className="py-2.5 px-3 font-bold text-slate-900">{formatMoney(rv.gross_sales)}</td>
                                                <td className="py-2.5 px-3 font-semibold text-indigo-700">{formatMoney(rv.platform_commission)}</td>
                                                <td className="py-2.5 px-3 text-slate-600">{formatMoney(rv.gst_tax)}</td>
                                                <td className="py-2.5 px-3 text-slate-600">{formatMoney(rv.gateway_charges)}</td>
                                                <td className="py-2.5 px-3 font-bold text-emerald-700">{formatMoney(rv.academy_share)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 5. Tax Table */}
                        {activeDrilldown === 'tax' && (
                            <div className="overflow-x-auto max-h-[500px]">
                                <table className="w-full text-left text-xs text-slate-700">
                                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
                                        <tr>
                                            <th className="py-2.5 px-3">Invoice No</th>
                                            <th className="py-2.5 px-3">Academy Partner</th>
                                            <th className="py-2.5 px-3">Gross Tx Amount</th>
                                            <th className="py-2.5 px-3">Taxable Commission</th>
                                            <th className="py-2.5 px-3">CGST (9%)</th>
                                            <th className="py-2.5 px-3">SGST (9%)</th>
                                            <th className="py-2.5 px-3">Total GST (18%)</th>
                                            <th className="py-2.5 px-3">Filing Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(reports?.taxReport?.records || []).map((t) => (
                                            <tr key={t.reference_id} className="hover:bg-slate-50">
                                                <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{t.tax_invoice_no}</td>
                                                <td className="py-2.5 px-3 font-semibold text-slate-900">{t.academy_name}</td>
                                                <td className="py-2.5 px-3">{formatMoney(t.gross_transaction_amount)}</td>
                                                <td className="py-2.5 px-3 font-semibold text-indigo-700">{formatMoney(t.taxable_commission)}</td>
                                                <td className="py-2.5 px-3 text-slate-600">{formatMoney(t.cgst_amount)}</td>
                                                <td className="py-2.5 px-3 text-slate-600">{formatMoney(t.sgst_amount)}</td>
                                                <td className="py-2.5 px-3 font-bold text-purple-700">{formatMoney(t.total_gst_tax)}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                                                        {t.filing_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setActiveDrilldown(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
