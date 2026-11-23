'use client';

import { useState, useEffect, useTransition } from 'react';
import {
    CreditCard, Search, RefreshCw, Download, Eye, CheckCircle2,
    Clock, AlertCircle, RotateCcw, ArrowUpRight, DollarSign, Percent
} from 'lucide-react';
import { api, formatMoney } from '@/lib/api';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';

interface PaymentRecord {
    transactionId: string;
    paymentId: string | null;
    orderId: string | null;
    grossAmount: string | number;
    platformCommission?: string | number;
    taxOnCommission?: string | number;
    gatewayCharges?: string | number;
    academyShare?: string | number;
    status: string;
    paymentMethod: string | null;
    transactionDate: string | null;
    academyName: string | null;
    transactionType?: string;
    planName?: string | null;
    receiptNumber?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    errorMessage?: string | null;
}

interface PaymentsResponse {
    total: number;
    limit: number;
    offset: number;
    payments: PaymentRecord[];
}

const PAGE_SIZE = 8;

export default function PlatformAdminPaymentsPage() {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isPending, startTransition] = useTransition();

    // Inspect Modal State
    const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const offset = (page - 1) * PAGE_SIZE;
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String(offset),
            });
            if (searchQuery.trim()) params.set('q', searchQuery.trim());
            if (statusFilter) params.set('status', statusFilter);

            const res = await api<PaymentsResponse>(`/platform/payments?${params.toString()}`);
            setPayments(res.payments || []);
            setTotal(res.total || 0);
        } catch (err: any) {
            showToast(err?.message || 'Failed to fetch transaction ledger', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, [page, statusFilter, refreshKey]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchPayments();
    };

    const handleExportCSV = () => {
        if (!payments.length) {
            showToast('No payment records to export', 'error');
            return;
        }
        const headers = ['Transaction ID', 'Payment ID', 'Order ID', 'Academy', 'Gross Amount', 'Platform Commission (10%)', 'Tax (18%)', 'Gateway Charges (2%)', 'Academy Share', 'Status', 'Method', 'Date'];
        const rows = payments.map(p => [
            `"${p.transactionId}"`,
            `"${p.paymentId || 'N/A'}"`,
            `"${p.orderId || 'N/A'}"`,
            `"${p.academyName || 'ClassSphere Platform'}"`,
            Number(p.grossAmount || 0).toFixed(2),
            Number(p.platformCommission || 0).toFixed(2),
            Number(p.taxOnCommission || 0).toFixed(2),
            Number(p.gatewayCharges || 0).toFixed(2),
            Number(p.academyShare || 0).toFixed(2),
            `"${p.status}"`,
            `"${p.paymentMethod || 'Razorpay'}"`,
            `"${p.transactionDate ? new Date(p.transactionDate).toISOString() : 'N/A'}"`,
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `classsphere_payments_ledger_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Ledger CSV exported successfully');
    };

    const getStatusBadge = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'posted' || s === 'reconciled' || s === 'successful' || s === 'completed') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                    Success
                </span>
            );
        }
        if (s === 'pending' || s === 'initiated') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                    Pending
                </span>
            );
        }
        if (s === 'refunded') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200">
                    <RotateCcw className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                    Refunded
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                <span className="capitalize">{status}</span>
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
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">Payments & Financial Ledger</h1>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Unified transaction ledger tracking gross receipts, commissions, taxes, gateway charges, and academy payouts.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        title="Export current payments ledger to CSV"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Export</span>
                    </button>
                    <button
                        onClick={() => setRefreshKey(k => k + 1)}
                        disabled={loading}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                        title="Refresh ledger records"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-2.5">
                <div className="flex flex-1 items-center gap-2 w-full">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Payment ID, Order ID, Academy..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-800"
                        />
                    </form>
                    <button
                        onClick={handleSearchSubmit}
                        type="button"
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
                    >
                        Search
                    </button>

                    <div className="flex items-center gap-1.5 ml-1">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-700 cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="posted">Posted</option>
                            <option value="reconciled">Reconciled</option>
                            <option value="successful">Successful</option>
                            <option value="pending">Pending</option>
                            <option value="refunded">Refunded</option>
                        </select>
                    </div>
                </div>

                <div className="text-xs text-slate-400 font-medium whitespace-nowrap self-end md:self-auto">
                    Showing <strong className="text-slate-700">{payments.length}</strong> of <strong className="text-slate-700">{total}</strong> transactions
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-left text-xs text-slate-600">
                        <colgroup>
                            <col className="w-[14%]" />
                            <col className="w-[15%]" />
                            <col className="w-[11%]" />
                            <col className="w-[11%]" />
                            <col className="w-[10%]" />
                            <col className="w-[12%]" />
                            <col className="w-[11%]" />
                            <col className="w-[10%]" />
                            <col className="w-[6%]" />
                        </colgroup>
                        <thead className="bg-slate-50 text-slate-700 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="py-2.5 px-2.5">Transaction</th>
                                <th className="py-2.5 px-2.5">Academy</th>
                                <th className="py-2.5 px-2.5 text-right">Gross</th>
                                <th className="py-2.5 px-2.5 text-right">Commission</th>
                                <th className="py-2.5 px-2.5 text-right">Charges</th>
                                <th className="py-2.5 px-2.5 text-right font-bold text-slate-900">Net Academy</th>
                                <th className="py-2.5 px-2.5 text-center">Status</th>
                                <th className="py-2.5 px-2.5">Date</th>
                                <th className="py-2.5 px-2.5 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-normal">
                            {loading && payments.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-400">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                                        Loading platform transaction records...
                                    </td>
                                </tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-400">
                                        <CreditCard className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                                        No transaction records matching filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                payments.map((p) => {
                                    const gross = Number(p.grossAmount || 0);
                                    const comm = Number(p.platformCommission || 0);
                                    const taxAndCharges = Number(p.taxOnCommission || 0) + Number(p.gatewayCharges || 0);
                                    const net = Number(p.academyShare || 0);

                                    return (
                                        <tr key={p.transactionId} className="hover:bg-slate-50/80 transition-colors [&>td]:align-middle">
                                            <td className="py-2 px-2.5">
                                                <div
                                                    className="font-mono text-xs font-semibold text-slate-900 truncate"
                                                    title={p.paymentId || p.transactionId}
                                                >
                                                    {p.paymentId || (p.transactionId ? p.transactionId.slice(0, 14) : 'N/A')}
                                                </div>
                                                <div className="text-[10px] text-slate-400 capitalize truncate mt-0.5">
                                                    {p.paymentMethod || 'Razorpay'}
                                                </div>
                                            </td>
                                            <td className="py-2 px-2.5">
                                                <div
                                                    className="font-medium text-slate-900 truncate text-xs"
                                                    title={p.academyName || 'ClassSphere Platform'}
                                                >
                                                    {p.academyName || 'ClassSphere Platform'}
                                                </div>
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-semibold text-slate-900 whitespace-nowrap text-xs">
                                                {formatMoney(gross)}
                                            </td>
                                            <td className="py-2 px-2.5 text-right text-indigo-700 font-medium whitespace-nowrap text-xs">
                                                {formatMoney(comm)}
                                            </td>
                                            <td className="py-2 px-2.5 text-right text-slate-500 whitespace-nowrap text-xs">
                                                {formatMoney(taxAndCharges)}
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-bold text-emerald-700 whitespace-nowrap text-xs">
                                                {formatMoney(net)}
                                            </td>
                                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                                                {getStatusBadge(p.status)}
                                            </td>
                                            <td className="py-2 px-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                {p.transactionDate ? (
                                                    <>
                                                        <div className="font-medium text-slate-800 leading-tight">
                                                            {new Date(p.transactionDate).toLocaleDateString('en-IN', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                                            {new Date(p.transactionDate).toLocaleTimeString('en-IN', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[11px]">-</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                                                <button
                                                    onClick={() => setSelectedPayment(p)}
                                                    title="View transaction breakdown"
                                                    className="inline-flex items-center justify-center w-7 h-7 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100/60 shadow-2xs cursor-pointer"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-3 py-2 border-t border-slate-200 bg-white">
                    <Pagination
                        currentPage={page}
                        totalItems={total}
                        pageSize={PAGE_SIZE}
                        onPageChange={(p) => setPage(p)}
                    />
                </div>
            </div>

            {/* Payment Details Modal */}
            {selectedPayment && (() => {
                const gross = Number(selectedPayment.grossAmount || 0);
                const comm = Number(selectedPayment.platformCommission) > 0 
                    ? Number(selectedPayment.platformCommission) 
                    : gross * 0.10;
                const tax = Number(selectedPayment.taxOnCommission) > 0 
                    ? Number(selectedPayment.taxOnCommission) 
                    : comm * 0.18;
                const charges = Number(selectedPayment.gatewayCharges) > 0 
                    ? Number(selectedPayment.gatewayCharges) 
                    : gross * 0.02;
                const net = Number(selectedPayment.academyShare) > 0 && Number(selectedPayment.academyShare) !== gross
                    ? Number(selectedPayment.academyShare)
                    : gross - comm - charges;

                return (
                    <Modal
                        isOpen={!!selectedPayment}
                        onClose={() => setSelectedPayment(null)}
                        title="Transaction Financial Breakdown"
                    >
                        <div className="space-y-4">
                            {/* Gross Transaction Amount */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div>
                                    <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                                        Gross Transaction Amount
                                    </span>
                                    <div className="text-2xl font-bold text-slate-900 mt-0.5">
                                        {formatMoney(gross)}
                                    </div>
                                    {selectedPayment.transactionType && (
                                        <div className="text-xs text-indigo-600 font-medium mt-0.5">
                                            {selectedPayment.transactionType}
                                            {selectedPayment.planName ? ` • ${selectedPayment.planName}` : ''}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    {getStatusBadge(selectedPayment.status)}
                                </div>
                            </div>

                            {/* Automated Commission & Payout Splits */}
                            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Automated Commission & Payout Splits
                                </h4>

                                <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                                    <span className="text-slate-600">Platform Commission (10%)</span>
                                    <span className="font-semibold text-indigo-700">
                                        +{formatMoney(comm)}
                                    </span>
                                </div>

                                <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                                    <span className="text-slate-600">GST Tax on Platform Commission (18%)</span>
                                    <span className="font-medium text-slate-700">
                                        +{formatMoney(tax)}
                                    </span>
                                </div>

                                <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                                    <span className="text-slate-600">Payment Gateway Charges (2%)</span>
                                    <span className="font-medium text-slate-700">
                                        +{formatMoney(charges)}
                                    </span>
                                </div>

                                <div className="flex justify-between text-sm pt-2 font-bold text-slate-900">
                                    <span className="text-emerald-800">Net Academy Entitlement</span>
                                    <span className="text-emerald-700 text-base">
                                        {formatMoney(net)}
                                    </span>
                                </div>
                            </div>

                            {/* Error/Cancellation Reason if present */}
                            {selectedPayment.errorMessage && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold text-rose-900 uppercase text-[10px] tracking-wider block">Status Reason</span>
                                        <span className="text-rose-700">{selectedPayment.errorMessage}</span>
                                    </div>
                                </div>
                            )}

                            {/* Metadata Details Grid */}
                            <div className="grid grid-cols-2 gap-2.5 text-xs">
                                <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl">
                                    <span className="text-slate-400 font-medium text-[11px] block">Gateway Payment ID</span>
                                    <div className="font-mono font-semibold text-slate-800 mt-1 break-all select-all">
                                        {selectedPayment.paymentId || <span className="text-slate-400 font-normal italic">None (Not Generated)</span>}
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl">
                                    <span className="text-slate-400 font-medium text-[11px] block">Order ID</span>
                                    <div className="font-mono font-semibold text-slate-800 mt-1 break-all select-all">
                                        {selectedPayment.orderId || '-'}
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl">
                                    <span className="text-slate-400 font-medium text-[11px] block">Beneficiary Academy</span>
                                    <div className="font-semibold text-slate-800 mt-1 truncate" title={selectedPayment.academyName || 'ClassSphere Platform'}>
                                        {selectedPayment.academyName || 'ClassSphere Platform'}
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl">
                                    <span className="text-slate-400 font-medium text-[11px] block">Payment Timestamp</span>
                                    <div className="font-semibold text-slate-800 mt-1">
                                        {selectedPayment.transactionDate
                                            ? new Date(selectedPayment.transactionDate).toLocaleString('en-IN', {
                                                  day: '2-digit',
                                                  month: 'short',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                  hour12: true,
                                              })
                                            : '-'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setSelectedPayment(null)}
                                    className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </Modal>
                );
            })()}
        </div>
    );
}
