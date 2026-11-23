'use client';

import { useState, useEffect, useTransition } from 'react';
import {
    RotateCcw, Search, RefreshCw, CheckCircle2, XCircle, Clock,
    AlertCircle, FileText, Building2, User, DollarSign, Eye, ArrowRight
} from 'lucide-react';
import { api, formatMoney } from '@/lib/api';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';
import Pagination from '@/components/Pagination';

interface RefundRecord {
    refundId: string;
    tenantId: string;
    academyName: string;
    paymentId: string | null;
    registrationId: string | null;
    learnerName: string;
    courseName: string | null;
    amount: string | number;
    reason: string;
    status: string;
    rejectionReason: string | null;
    gatewayRefundId: string | null;
    requestDate: string;
    processedAt: string | null;
}

interface StatusCounts {
    all: number;
    requested: number;
    under_review: number;
    refunded: number;
    rejected: number;
}

interface RefundsResponse {
    total: number;
    limit: number;
    offset: number;
    counts?: StatusCounts;
    refunds: RefundRecord[];
}

const PAGE_SIZE = 8;

export default function PlatformAdminRefundsPage() {
    const [refunds, setRefunds] = useState<RefundRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [counts, setCounts] = useState<StatusCounts>({ all: 0, requested: 0, under_review: 0, refunded: 0, rejected: 0 });
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isPending, startTransition] = useTransition();

    // Modals
    const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
    const [actionRefund, setActionRefund] = useState<RefundRecord | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const refundForm = useFormValidation(
        { reason: rejectionReason },
        {
            reason: [
                rules.when(actionType === 'reject', rules.required('Rejection reason'), rules.minLength('Rejection reason', 10)),
                rules.maxLength('Rejection reason', 500),
            ],
        },
    );

    const closeActionModal = () => {
        setActionRefund(null);
        setActionType(null);
        setRejectionReason('');
        refundForm.reset();
    };

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchRefunds = async () => {
        try {
            setLoading(true);
            const offset = (page - 1) * PAGE_SIZE;
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String(offset),
            });
            if (statusFilter) params.set('status', statusFilter);

            const res = await api<RefundsResponse>(`/platform/refunds?${params.toString()}`);
            setRefunds(res.refunds || []);
            setTotal(res.total || 0);
            if (res.counts) setCounts(res.counts);
        } catch (err: any) {
            showToast(err?.message || 'Failed to load refund requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRefunds();
    }, [page, statusFilter, refreshKey]);

    const handleProcessRefund = async () => {
        if (!actionRefund || !actionType) return;
        if (!refundForm.validate()) return;

        try {
            setActionLoading(true);
            await api('/platform/refunds', {
                method: 'POST',
                body: JSON.stringify({
                    refundId: actionRefund.refundId,
                    action: actionType,
                    reason: actionType === 'reject' ? rejectionReason.trim() : '',
                }),
            });

            showToast(
                actionType === 'approve'
                    ? 'Refund approved and marked for gateway disbursement.'
                    : 'Refund request successfully rejected.'
            );
            closeActionModal();
            setRefreshKey(k => k + 1);
        } catch (err: any) {
            showToast(err?.message || 'Operation failed', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredRefunds = refunds.filter(r => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            r.learnerName.toLowerCase().includes(q) ||
            r.academyName.toLowerCase().includes(q) ||
            (r.courseName && r.courseName.toLowerCase().includes(q)) ||
            (r.reason && r.reason.toLowerCase().includes(q)) ||
            (r.paymentId && r.paymentId.toLowerCase().includes(q)) ||
            r.refundId.toLowerCase().includes(q)
        );
    });

    const getStatusBadge = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'refunded' || s === 'approved') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                    Refunded
                </span>
            );
        }
        if (s === 'rejected') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200">
                    <XCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                    Rejected
                </span>
            );
        }
        if (s === 'under_review') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Clock className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                    Under Review
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                Requested
            </span>
        );
    };

    return (
        <div className="space-y-2.5 animate-fade-in font-sans">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[10000] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium transition-all ${
                    toast.type === 'success' ? 'bg-white border-emerald-200 text-emerald-800' : 'bg-white border-rose-200 text-rose-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-200">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">Refunds Management</h1>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Review, investigate, approve, or reject learner cancellation and course refund claims with audit tracking.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setRefreshKey(k => k + 1)}
                        disabled={loading}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                        title="Refresh refund claims"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Status Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                    { key: '', label: 'ALL CLAIMS', count: counts.all, color: 'text-indigo-600', activeBg: 'bg-indigo-50 border-indigo-400 text-indigo-950 shadow-2xs' },
                    { key: 'requested', label: 'REQUESTED', count: counts.requested, color: 'text-amber-600', activeBg: 'bg-amber-50 border-amber-400 text-amber-950 shadow-2xs', alert: counts.requested > 0 },
                    { key: 'under_review', label: 'UNDER REVIEW', count: counts.under_review, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-400 text-blue-950 shadow-2xs' },
                    { key: 'refunded', label: 'REFUNDED', count: counts.refunded, color: 'text-emerald-600', activeBg: 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs' },
                    { key: 'rejected', label: 'REJECTED', count: counts.rejected, color: 'text-rose-600', activeBg: 'bg-rose-50 border-rose-400 text-rose-950 shadow-2xs' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => {
                            setStatusFilter(tab.key);
                            setPage(1);
                        }}
                        className={`relative p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                            statusFilter === tab.key
                                ? tab.activeBg
                                : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs text-slate-700'
                        }`}
                    >
                        {tab.alert && (
                            <span className="absolute top-2 right-2 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                            </span>
                        )}
                        <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                            {tab.label}
                        </span>
                        <span className={`text-lg font-bold block mt-0.5 ${tab.color}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="relative w-full sm:w-96">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by student, academy, course, refund ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    />
                </div>
                <div className="text-xs text-slate-400 font-medium whitespace-nowrap self-end sm:self-auto">
                    Showing <strong className="text-slate-700">{filteredRefunds.length}</strong> of <strong className="text-slate-700">{total}</strong> claims
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <table className="w-full table-fixed text-left text-xs text-slate-600">
                    <colgroup>
                        <col className="w-[10%]" />
                        <col className="w-[16%]" />
                        <col className="w-[14%]" />
                        <col className="w-[16%]" />
                        <col className="w-[8%]" />
                        <col className="w-[12%]" />
                        <col className="w-[12%]" />
                        <col className="w-[12%]" />
                    </colgroup>
                    <thead className="bg-slate-50 text-slate-700 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="py-2.5 pl-3.5 pr-2">Refund ID</th>
                            <th className="py-2.5 px-2">Learner & Course</th>
                            <th className="py-2.5 px-2">Academy</th>
                            <th className="py-2.5 px-2">Reason</th>
                            <th className="py-2.5 px-2 text-right">Amount</th>
                            <th className="py-2.5 px-2 text-center">Status</th>
                            <th className="py-2.5 px-2 text-center">Requested</th>
                            <th className="py-2.5 pr-3.5 pl-2 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-normal">
                        {loading && refunds.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                                    Loading refund records...
                                </td>
                            </tr>
                        ) : filteredRefunds.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400">
                                    <RotateCcw className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                                    No refund claims matching selected filters.
                                </td>
                            </tr>
                        ) : (
                            filteredRefunds.map((r) => (
                                <tr key={r.refundId} className="hover:bg-slate-50/80 transition-colors [&>td]:align-middle">
                                    <td className="py-2 pl-3.5 pr-2">
                                        <div className="font-mono text-xs font-semibold text-slate-900 truncate" title={r.refundId}>
                                            REF-{r.refundId.slice(0, 8).toUpperCase()}
                                        </div>
                                        {r.paymentId && (
                                            <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5" title={r.paymentId}>
                                                {r.paymentId}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-2 px-2">
                                        <div className="font-semibold text-slate-900 text-xs truncate" title={r.learnerName}>
                                            {r.learnerName}
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate mt-0.5" title={r.courseName || 'Enrolled Course'}>
                                            {r.courseName || 'Enrolled Course'}
                                        </div>
                                    </td>
                                    <td className="py-2 px-2">
                                        <div className="font-medium text-slate-800 text-xs truncate" title={r.academyName}>
                                            {r.academyName}
                                        </div>
                                    </td>
                                    <td className="py-2 px-2">
                                        <div className="text-xs text-slate-600 truncate leading-relaxed" title={r.reason}>
                                            {r.reason}
                                        </div>
                                    </td>
                                    <td className="py-2 px-2 text-right font-bold text-slate-900 whitespace-nowrap text-xs tabular-nums">
                                        {formatMoney(Number(r.amount))}
                                    </td>
                                    <td className="py-2 px-2 text-center whitespace-nowrap">
                                        {getStatusBadge(r.status)}
                                    </td>
                                    <td className="py-2 px-2 text-center text-xs text-slate-600 whitespace-nowrap">
                                        <div className="font-medium text-slate-800 leading-tight">
                                            {new Date(r.requestDate).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </div>
                                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                            {new Date(r.requestDate).toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </td>
                                    <td className="py-2 pr-3.5 pl-2 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center">
                                            <button
                                                onClick={() => setSelectedRefund(r)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100/60 shadow-2xs cursor-pointer"
                                                title="View Claim Details"
                                            >
                                                <Eye className="w-3.5 h-3.5 shrink-0" />
                                                <span>Details</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <div className="px-3 py-2 border-t border-slate-200 bg-white">
                    <Pagination
                        currentPage={page}
                        totalItems={total}
                        pageSize={PAGE_SIZE}
                        onPageChange={(p) => setPage(p)}
                    />
                </div>
            </div>

            {/* View Claim Modal */}
            {selectedRefund && (
                <Modal
                    isOpen={!!selectedRefund}
                    onClose={() => setSelectedRefund(null)}
                    title="Refund Claim Information"
                    maxWidth="600px"
                >
                    <div className="space-y-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Refund Claim Amount</span>
                                    <span className="font-mono text-xs font-semibold text-slate-400">
                                        ({selectedRefund.refundId.startsWith('REF-') ? selectedRefund.refundId : `REF-${selectedRefund.refundId.slice(0, 8).toUpperCase()}`})
                                    </span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900 mt-0.5">
                                    {formatMoney(Number(selectedRefund.amount))}
                                </div>
                            </div>
                            <div>{getStatusBadge(selectedRefund.status)}</div>
                        </div>

                        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
                            <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 text-xs">
                                <div>
                                    <span className="text-slate-400 font-medium text-[11px] block">Learner Name</span>
                                    <div className="font-semibold text-slate-900 mt-0.5">{selectedRefund.learnerName}</div>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-medium text-[11px] block">Academy</span>
                                    <div className="font-semibold text-slate-900 mt-0.5">{selectedRefund.academyName}</div>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-medium text-[11px] block">Course</span>
                                    <div className="font-semibold text-slate-900 mt-0.5">{selectedRefund.courseName || 'Enrolled Course'}</div>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-medium text-[11px] block">Gateway Payment ID</span>
                                    <div className="font-mono font-medium text-slate-800 mt-0.5">{selectedRefund.paymentId || '—'}</div>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-medium text-[11px] block">Registration ID</span>
                                    <div className="font-mono font-medium text-slate-800 mt-0.5">{selectedRefund.registrationId || '—'}</div>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-medium text-[11px] block">Requested On</span>
                                    <div className="font-medium text-slate-800 mt-0.5">
                                        {new Date(selectedRefund.requestDate).toLocaleString('en-IN', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short'
                                        })}
                                    </div>
                                </div>
                                {selectedRefund.processedAt && (
                                    <div>
                                        <span className="text-slate-400 font-medium text-[11px] block">Processed On</span>
                                        <div className="font-medium text-slate-800 mt-0.5">
                                            {new Date(selectedRefund.processedAt).toLocaleString('en-IN', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short'
                                            })}
                                        </div>
                                    </div>
                                )}
                                {selectedRefund.gatewayRefundId && (
                                    <div>
                                        <span className="text-emerald-700 font-medium text-[11px] block">Gateway Refund Reference</span>
                                        <div className="font-mono font-medium text-emerald-900 mt-0.5">{selectedRefund.gatewayRefundId}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-2.5 px-3 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs space-y-0.5">
                            <span className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider block">Learner's Stated Reason</span>
                            <p className="text-slate-800 font-medium leading-relaxed">{selectedRefund.reason}</p>
                        </div>

                        {selectedRefund.rejectionReason && (
                            <div className="p-2.5 px-3 bg-rose-50/90 border border-rose-200 rounded-xl text-xs space-y-0.5">
                                <span className="text-rose-700 font-semibold text-[10px] uppercase tracking-wider block">Admin Rejection Explanation</span>
                                <p className="text-rose-900 leading-relaxed font-medium">{selectedRefund.rejectionReason}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                            <div>
                                {(selectedRefund.status === 'requested' || selectedRefund.status === 'under_review') && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const r = selectedRefund;
                                                setSelectedRefund(null);
                                                setActionRefund(r);
                                                setActionType('approve');
                                            }}
                                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs"
                                        >
                                            Approve Refund
                                        </button>
                                        <button
                                            onClick={() => {
                                                const r = selectedRefund;
                                                setSelectedRefund(null);
                                                setActionRefund(r);
                                                setActionType('reject');
                                                setRejectionReason('');
                                            }}
                                            className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                                        >
                                            Reject Claim
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedRefund(null)}
                                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer ml-auto"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Approve / Reject Modal */}
            {actionRefund && actionType && (
                <Modal
                    isOpen={!!actionRefund}
                    onClose={closeActionModal}
                    title={actionType === 'approve' ? 'Approve & Disburse Refund' : 'Reject Refund Claim'}
                >
                    <form
                        noValidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleProcessRefund();
                        }}
                        className="space-y-4"
                    >
                        <p className="text-sm text-slate-600">
                            {actionType === 'approve'
                                ? `You are approving a refund of ${formatMoney(Number(actionRefund.amount))} for learner ${actionRefund.learnerName}. This will trigger gateway reimbursement and debit the academy's upcoming settlement.`
                                : `You are rejecting the refund request for learner ${actionRefund.learnerName}. Please provide a clear and compliant explanation.`}
                        </p>

                        {actionType === 'reject' && (
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Rejection Reason <span className="text-rose-500">*</span>
                                    </label>
                                    <span className={`text-[10px] ${rejectionReason.trim().length > 500 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                        {rejectionReason.trim().length}/500
                                    </span>
                                </div>
                                <textarea
                                    rows={3}
                                    placeholder="Explain why this refund claim does not meet the refund policy..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    onBlur={refundForm.touch('reason')}
                                    aria-invalid={!!refundForm.error('reason')}
                                    style={invalidStyle(refundForm.error('reason'))}
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-slate-800"
                                />
                                <FieldError message={refundForm.error('reason')} />
                            </div>
                        )}

                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={closeActionModal}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-xs transition-colors flex items-center gap-2 ${
                                    actionType === 'approve'
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-rose-600 hover:bg-rose-700'
                                }`}
                            >
                                {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                                {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
