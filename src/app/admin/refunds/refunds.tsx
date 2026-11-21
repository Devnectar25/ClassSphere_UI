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

interface RefundsResponse {
    total: number;
    limit: number;
    offset: number;
    refunds: RefundRecord[];
}

const PAGE_SIZE = 10;

export default function PlatformAdminRefundsPage() {
    const [refunds, setRefunds] = useState<RefundRecord[]>([]);
    const [total, setTotal] = useState(0);
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
            (r.paymentId && r.paymentId.toLowerCase().includes(q)) ||
            r.refundId.toLowerCase().includes(q)
        );
    });

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'refunded' || s === 'approved') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Refunded
                </span>
            );
        }
        if (s === 'rejected') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200">
                    <XCircle className="w-3 h-3 text-rose-600" />
                    Rejected
                </span>
            );
        }
        if (s === 'under_review') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Clock className="w-3 h-3 text-indigo-600" />
                    Under Review
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3 text-amber-600" />
                Requested
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[10000] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
                    toast.type === 'success' ? 'bg-white border-emerald-200 text-emerald-800' : 'bg-white border-rose-200 text-rose-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Refunds Management</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Review, investigate, approve, or reject learner cancellation and course refund claims with audit tracking.
                    </p>
                </div>
                <button
                    onClick={() => setRefreshKey(k => k + 1)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto flex-wrap">
                    {[
                        { key: '', label: 'All Requests' },
                        { key: 'requested', label: 'Requested' },
                        { key: 'under_review', label: 'Under Review' },
                        { key: 'refunded', label: 'Refunded' },
                        { key: 'rejected', label: 'Rejected' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setStatusFilter(tab.key);
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                                statusFilter === tab.key ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search student, academy, ref..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1020px] table-fixed text-left text-sm text-slate-600">
                        <colgroup>
                            <col className="w-[12%]" />
                            <col className="w-[16%]" />
                            <col className="w-[13%]" />
                            <col className="w-[8%]" />
                            <col className="w-[16%]" />
                            <col className="w-[12%]" />
                            <col className="w-[10%]" />
                            <col className="w-[13%]" />
                        </colgroup>
                        <thead className="bg-slate-50 text-slate-700 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-3">Refund ID</th>
                                <th className="py-3 px-3">Learner & Course</th>
                                <th className="py-3 px-3">Academy</th>
                                <th className="py-3 px-3 text-right">Amount</th>
                                <th className="py-3 px-3">Reason</th>
                                <th className="py-3 px-3 text-center">Status</th>
                                <th className="py-3 px-3">Requested</th>
                                <th className="py-3 px-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-normal">
                            {loading && refunds.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-400">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                                        Loading refund records...
                                    </td>
                                </tr>
                            ) : filteredRefunds.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-400">
                                        <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        No refund claims matching selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredRefunds.map((r) => (
                                    <tr key={r.refundId} className="hover:bg-slate-50/80 transition-colors [&>td]:align-middle">
                                        <td className="py-3 px-3">
                                            <div className="font-mono text-xs font-semibold text-slate-900 break-all line-clamp-2" title={r.refundId}>
                                                {r.refundId}
                                            </div>
                                            {r.paymentId && (
                                                <div className="text-[11px] text-slate-400 font-mono mt-0.5 break-all line-clamp-2" title={r.paymentId}>
                                                    Pay: {r.paymentId}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="font-semibold text-slate-900 break-words line-clamp-2" title={r.learnerName}>{r.learnerName}</div>
                                            <div className="text-xs text-slate-500 mt-0.5 break-words line-clamp-2" title={r.courseName || undefined}>{r.courseName || 'Standard Enrollment'}</div>
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="font-medium text-slate-800 break-words line-clamp-2" title={r.academyName}>{r.academyName}</div>
                                        </td>
                                        <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                            {formatMoney(Number(r.amount))}
                                        </td>
                                        <td className="py-3 px-3 text-xs text-slate-600" title={r.reason}>
                                            <div className="break-words line-clamp-2 leading-relaxed">{r.reason}</div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {getStatusBadge(r.status)}
                                        </td>
                                        <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                                            {new Date(r.requestDate).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedRefund(r)}
                                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors shrink-0"
                                                    title="View Full Claim"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {r.status !== 'requested' && r.status !== 'under_review' && (
                                                    <div className="w-[72px] shrink-0" aria-hidden="true" />
                                                )}
                                                {(r.status === 'requested' || r.status === 'under_review') && (
                                                    <div className="flex flex-col gap-1 w-[72px] shrink-0">
                                                        <button
                                                            onClick={() => {
                                                                setActionRefund(r);
                                                                setActionType('approve');
                                                            }}
                                                            className="w-full py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors text-center"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setActionRefund(r);
                                                                setActionType('reject');
                                                                setRejectionReason('');
                                                            }}
                                                            className="w-full py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors text-center"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-200">
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
                >
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Refund Claim Amount</span>
                                <div className="text-2xl font-bold text-slate-900 mt-0.5">
                                    {formatMoney(Number(selectedRefund.amount))}
                                </div>
                            </div>
                            <div>{getStatusBadge(selectedRefund.status)}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-400 font-medium">Learner Name</span>
                                <div className="font-semibold text-slate-800 mt-1">{selectedRefund.learnerName}</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-400 font-medium">Academy</span>
                                <div className="font-semibold text-slate-800 mt-1">{selectedRefund.academyName}</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-400 font-medium">Course</span>
                                <div className="font-semibold text-slate-800 mt-1">{selectedRefund.courseName || 'Enrolled Course'}</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-400 font-medium">Gateway Payment ID</span>
                                <div className="font-mono font-semibold text-slate-800 mt-1">{selectedRefund.paymentId || 'Direct'}</div>
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                            <span className="text-slate-400 font-medium">Learner's Stated Reason</span>
                            <p className="text-slate-800 font-medium leading-relaxed">{selectedRefund.reason}</p>
                        </div>

                        {selectedRefund.rejectionReason && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
                                <span className="text-rose-700 font-semibold">Admin Rejection Explanation</span>
                                <p className="text-rose-900">{selectedRefund.rejectionReason}</p>
                            </div>
                        )}

                        {selectedRefund.gatewayRefundId && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                                <span className="text-emerald-700 font-semibold">Gateway Refund Reference</span>
                                <div className="font-mono text-emerald-900 font-bold mt-0.5">{selectedRefund.gatewayRefundId}</div>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setSelectedRefund(null)}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
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
