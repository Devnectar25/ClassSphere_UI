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
    platformCommission: string | number;
    taxOnCommission: string | number;
    gatewayCharges: string | number;
    academyShare: string | number;
    status: string;
    paymentMethod: string | null;
    transactionDate: string;
    academyName: string | null;
}

interface PaymentsResponse {
    total: number;
    limit: number;
    offset: number;
    payments: PaymentRecord[];
}

const PAGE_SIZE = 10;

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
            `"${p.academyName || 'ClassSphere Direct'}"`,
            Number(p.grossAmount || 0).toFixed(2),
            Number(p.platformCommission || 0).toFixed(2),
            Number(p.taxOnCommission || 0).toFixed(2),
            Number(p.gatewayCharges || 0).toFixed(2),
            Number(p.academyShare || 0).toFixed(2),
            `"${p.status}"`,
            `"${p.paymentMethod || 'Razorpay'}"`,
            `"${new Date(p.transactionDate).toISOString()}"`,
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
        const s = status.toLowerCase();
        if (s === 'posted' || s === 'reconciled' || s === 'successful' || s === 'completed') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Success
                </span>
            );
        }
        if (s === 'pending' || s === 'initiated') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Pending
                </span>
            );
        }
        if (s === 'refunded') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200">
                    <RotateCcw className="w-3 h-3 text-blue-600" />
                    Refunded
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                {status}
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
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments & Financial Ledger</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Unified transaction ledger tracking gross receipts, commissions, taxes, gateway charges, and academy payouts.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
                    >
                        <Download className="w-4 h-4 text-slate-500" />
                        Export Ledger
                    </button>
                    <button
                        onClick={() => setRefreshKey(k => k + 1)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by Payment ID, Order ID, Academy..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    />
                </form>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className="px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700"
                    >
                        <option value="">All Transactions</option>
                        <option value="posted">Posted</option>
                        <option value="reconciled">Reconciled</option>
                        <option value="successful">Successful</option>
                        <option value="pending">Pending</option>
                        <option value="refunded">Refunded</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div>
                    <table className="w-full table-fixed text-left text-sm text-slate-600">
                        <colgroup>
                            <col className="w-[15%]" />
                            <col className="w-[16%]" />
                            <col className="w-[11%]" />
                            <col className="w-[11%]" />
                            <col className="w-[10%]" />
                            <col className="w-[11%]" />
                            <col className="w-[10%]" />
                            <col className="w-[9%]" />
                            <col className="w-[7%]" />
                        </colgroup>
                        <thead className="bg-slate-50 text-slate-700 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-3">Transaction</th>
                                <th className="py-3 px-3">Academy</th>
                                <th className="py-3 px-3 text-right">Gross</th>
                                <th className="py-3 px-3 text-right">Commission</th>
                                <th className="py-3 px-3 text-right">Charges</th>
                                <th className="py-3 px-3 text-right font-bold text-slate-900">Net Academy</th>
                                <th className="py-3 px-3 text-center">Status</th>
                                <th className="py-3 px-3">Date</th>
                                <th className="py-3 px-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-normal">
                            {loading && payments.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-400">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                                        Loading platform transaction records...
                                    </td>
                                </tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-400">
                                        <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
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
                                            <td className="py-3 px-3">
                                                <div
                                                    className="font-mono text-xs font-semibold text-slate-900 break-all line-clamp-2"
                                                    title={p.paymentId || p.transactionId}
                                                >
                                                    {p.paymentId || p.transactionId.slice(0, 16)}
                                                </div>
                                                <div className="text-[11px] text-slate-400 capitalize truncate mt-0.5">
                                                    {p.paymentMethod || 'Razorpay'}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <div
                                                    className="font-medium text-slate-900 break-words line-clamp-2"
                                                    title={p.academyName || 'ClassSphere Platform'}
                                                >
                                                    {p.academyName || 'ClassSphere Platform'}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                                                {formatMoney(gross)}
                                            </td>
                                            <td className="py-3 px-3 text-right text-indigo-700 font-medium whitespace-nowrap">
                                                {formatMoney(comm)}
                                            </td>
                                            <td className="py-3 px-3 text-right text-slate-500 text-xs whitespace-nowrap">
                                                {formatMoney(taxAndCharges)}
                                            </td>
                                            <td className="py-3 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                                                {formatMoney(net)}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                {getStatusBadge(p.status)}
                                            </td>
                                            <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                                                <div>
                                                    {new Date(p.transactionDate).toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {new Date(p.transactionDate).toLocaleTimeString('en-IN', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <button
                                                    onClick={() => setSelectedPayment(p)}
                                                    title="View details"
                                                    className="inline-flex items-center justify-center p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
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
                <div className="p-4 border-t border-slate-200">
                    <Pagination
                        currentPage={page}
                        totalItems={total}
                        pageSize={PAGE_SIZE}
                        onPageChange={(p) => setPage(p)}
                    />
                </div>
            </div>

            {/* Payment Details Modal */}
            {selectedPayment && (
                <Modal
                    isOpen={!!selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                    title="Transaction Financial Breakdown"
                >
                    <div className="space-y-5">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Gross Transaction Amount</span>
                                <div className="text-2xl font-bold text-slate-900 mt-0.5">
                                    {formatMoney(Number(selectedPayment.grossAmount || 0))}
                                </div>
                            </div>
                            <div>{getStatusBadge(selectedPayment.status)}</div>
                        </div>

                        {/* Financial Ledger Calculation Breakdown */}
                        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Automated Commission & Payout Splits</h4>
                            
                            <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                                <span className="text-slate-600">Platform Commission (10%)</span>
                                <span className="font-semibold text-indigo-700">
                                    +{formatMoney(Number(selectedPayment.platformCommission || 0))}
                                </span>
                            </div>

                            <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                                <span className="text-slate-600">GST Tax on Platform Commission (18%)</span>
                                <span className="font-medium text-slate-700">
                                    +{formatMoney(Number(selectedPayment.taxOnCommission || 0))}
                                </span>
                            </div>

                            <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                                <span className="text-slate-600">Payment Gateway Charges (2%)</span>
                                <span className="font-medium text-slate-700">
                                    +{formatMoney(Number(selectedPayment.gatewayCharges || 0))}
                                </span>
                            </div>

                            <div className="flex justify-between text-sm pt-2 font-bold text-slate-900">
                                <span className="text-emerald-800">Net Academy Entitlement</span>
                                <span className="text-emerald-700 text-base">
                                    {formatMoney(Number(selectedPayment.academyShare || 0))}
                                </span>
                            </div>
                        </div>

                        {/* Metadata Details */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-400 font-medium">Gateway Payment ID</span>
                                <div className="font-mono font-semibold text-slate-800 mt-1 break-all">
                                    {selectedPayment.paymentId || 'Direct Internal Receipt'}
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-400 font-medium">Order ID</span>
                                <div className="font-mono font-semibold text-slate-800 mt-1 break-all">
                                    {selectedPayment.orderId || 'N/A'}
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-400 font-medium">Beneficiary Academy</span>
                                <div className="font-semibold text-slate-800 mt-1">
                                    {selectedPayment.academyName || 'ClassSphere Direct'}
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-400 font-medium">Payment Timestamp</span>
                                <div className="font-semibold text-slate-800 mt-1">
                                    {new Date(selectedPayment.transactionDate).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setSelectedPayment(null)}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
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
