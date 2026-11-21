'use client';

import { useState, useEffect } from 'react';
import {
    Landmark, Search, RefreshCw, CheckCircle2, Clock, PauseCircle,
    AlertCircle, ShieldAlert, ArrowUpRight, ArrowDownRight, Eye, Calendar
} from 'lucide-react';
import { api, formatMoney } from '@/lib/api';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';
import Pagination from '@/components/Pagination';

interface PayoutRecord {
    payoutId: string;
    tenantId: string;
    academyName: string;
    totalCollected: string | number;
    platformCommission: string | number;
    taxOnCommission: string | number;
    gatewayCharges: string | number;
    netAcademyAmount: string | number;
    expectedReleaseDate: string;
    status: string;
    holdReason: string | null;
    releasedAt: string | null;
    createdAt: string;
}

interface PayoutsResponse {
    total: number;
    limit: number;
    offset: number;
    payouts: PayoutRecord[];
}

const PAGE_SIZE = 10;

export default function PlatformAdminPayoutsPage() {
    const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    // Modal State
    const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);
    const [holdPayout, setHoldPayout] = useState<PayoutRecord | null>(null);
    const [holdReason, setHoldReason] = useState('');
    const [releasePayout, setReleasePayout] = useState<PayoutRecord | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const holdForm = useFormValidation(
        { reason: holdReason },
        { reason: [rules.required('Hold justification'), rules.minLength('Hold justification', 10), rules.maxLength('Hold justification', 500)] },
    );

    const closeHoldModal = () => {
        setHoldPayout(null);
        setHoldReason('');
        holdForm.reset();
    };

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchPayouts = async () => {
        try {
            setLoading(true);
            const offset = (page - 1) * PAGE_SIZE;
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String(offset),
            });
            if (statusFilter) params.set('status', statusFilter);

            const res = await api<PayoutsResponse>(`/platform/payouts?${params.toString()}`);
            setPayouts(res.payouts || []);
            setTotal(res.total || 0);
        } catch (err: any) {
            showToast(err?.message || 'Failed to load payouts data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayouts();
    }, [page, statusFilter, refreshKey]);

    const handleRelease = async () => {
        if (!releasePayout) return;
        try {
            setActionLoading(true);
            await api('/platform/payouts', {
                method: 'POST',
                body: JSON.stringify({
                    payoutId: releasePayout.payoutId,
                    action: 'release',
                }),
            });
            showToast(`Settlement of ${formatMoney(Number(releasePayout.netAcademyAmount))} released successfully to ${releasePayout.academyName}`);
            setReleasePayout(null);
            setRefreshKey(k => k + 1);
        } catch (err: any) {
            showToast(err?.message || 'Failed to release payout', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleHold = async () => {
        if (!holdPayout) return;
        if (!holdForm.validate()) return;
        try {
            setActionLoading(true);
            await api('/platform/payouts', {
                method: 'POST',
                body: JSON.stringify({
                    payoutId: holdPayout.payoutId,
                    action: 'hold',
                    holdReason: holdReason.trim(),
                }),
            });
            showToast(`Payout placed on hold for ${holdPayout.academyName}`);
            closeHoldModal();
            setRefreshKey(k => k + 1);
        } catch (err: any) {
            showToast(err?.message || 'Failed to place payout on hold', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredPayouts = payouts.filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            p.academyName.toLowerCase().includes(q) ||
            p.payoutId.toLowerCase().includes(q)
        );
    });

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'completed' || s === 'released') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Completed
                </span>
            );
        }
        if (s === 'held') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200">
                    <PauseCircle className="w-3 h-3 text-rose-600" />
                    On Hold
                </span>
            );
        }
        if (s === 'upcoming') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Clock className="w-3 h-3 text-indigo-600" />
                    Upcoming
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3 text-amber-600" />
                Pending Cycle
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
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payouts & Settlements</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage academy settlement cycles, net disbursements, compliance holds, and bank release schedules.
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

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto flex-wrap">
                    {[
                        { key: '', label: 'All Payouts' },
                        { key: 'pending', label: 'Pending Cycle' },
                        { key: 'upcoming', label: 'Upcoming' },
                        { key: 'completed', label: 'Completed' },
                        { key: 'held', label: 'Held' },
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
                        placeholder="Search academy or payout ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div>
                    <table className="w-full table-fixed text-left text-sm text-slate-600">
                        <colgroup>
                            <col className="w-[18%]" />
                            <col className="w-[11%]" />
                            <col className="w-[10%]" />
                            <col className="w-[9%]" />
                            <col className="w-[12%]" />
                            <col className="w-[11%]" />
                            <col className="w-[14%]" />
                            <col className="w-[15%]" />
                        </colgroup>
                        <thead className="bg-slate-50 text-slate-700 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
                            <tr className="[&>th]:align-middle">
                                <th className="py-3 px-3">Academy</th>
                                <th className="py-3 px-3 text-right">Collected</th>
                                <th className="py-3 px-3 text-right">Commission</th>
                                <th className="py-3 px-3 text-right">Charges</th>
                                <th className="py-3 px-3 text-right font-bold text-slate-900">Net Payout</th>
                                <th className="py-3 px-3">Release Date</th>
                                <th className="py-3 px-3 text-center">Status</th>
                                <th className="py-3 px-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-normal">
                            {loading && payouts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-400">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                                        Loading payout schedules...
                                    </td>
                                </tr>
                            ) : filteredPayouts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-400">
                                        <Landmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        No settlement records matching selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayouts.map((p) => (
                                    <tr key={p.payoutId} className="hover:bg-slate-50/80 transition-colors [&>td]:align-middle">
                                        <td className="py-3 px-3">
                                            <div className="font-semibold text-slate-900 break-words line-clamp-2" title={p.academyName}>
                                                {p.academyName}
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-right font-medium text-slate-800 whitespace-nowrap">
                                            {formatMoney(Number(p.totalCollected))}
                                        </td>
                                        <td className="py-3 px-3 text-right text-indigo-700 font-medium whitespace-nowrap">
                                            {formatMoney(Number(p.platformCommission))}
                                        </td>
                                        <td className="py-3 px-3 text-right text-slate-500 text-xs whitespace-nowrap">
                                            {formatMoney(Number(p.taxOnCommission) + Number(p.gatewayCharges))}
                                        </td>
                                        <td className="py-3 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                                            {formatMoney(Number(p.netAcademyAmount))}
                                        </td>
                                        <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                                            {new Date(p.expectedReleaseDate).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {getStatusBadge(p.status)}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedPayout(p)}
                                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors shrink-0"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <div className="flex flex-col gap-1 w-[72px] shrink-0">
                                                    {p.status !== 'completed' && (
                                                        <button
                                                            onClick={() => setReleasePayout(p)}
                                                            className="w-full py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors text-center"
                                                        >
                                                            Release
                                                        </button>
                                                    )}
                                                    {p.status !== 'held' && p.status !== 'completed' && (
                                                        <button
                                                            onClick={() => {
                                                                setHoldPayout(p);
                                                                setHoldReason('');
                                                            }}
                                                            className="w-full py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors text-center"
                                                        >
                                                            Hold
                                                        </button>
                                                    )}
                                                </div>
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

            {/* Payout Details Modal */}
            {selectedPayout && (
                <Modal
                    isOpen={!!selectedPayout}
                    onClose={() => setSelectedPayout(null)}
                    title="Settlement Dossier"
                >
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Net Academy Payout</span>
                                <div className="text-2xl font-bold text-emerald-700 mt-0.5">
                                    {formatMoney(Number(selectedPayout.netAcademyAmount))}
                                </div>
                            </div>
                            <div>{getStatusBadge(selectedPayout.status)}</div>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-600">Total Collected via Online Portal</span>
                                <span className="font-semibold text-slate-900">{formatMoney(Number(selectedPayout.totalCollected))}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-600">Platform Commission (10%)</span>
                                <span className="font-medium text-rose-600">-{formatMoney(Number(selectedPayout.platformCommission))}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-600">GST on Commission (18%)</span>
                                <span className="font-medium text-rose-600">-{formatMoney(Number(selectedPayout.taxOnCommission))}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-600">Gateway Facilitation (2%)</span>
                                <span className="font-medium text-rose-600">-{formatMoney(Number(selectedPayout.gatewayCharges))}</span>
                            </div>
                            <div className="flex justify-between pt-2 font-bold text-emerald-800 text-base">
                                <span>Net Bank Transfer</span>
                                <span>{formatMoney(Number(selectedPayout.netAcademyAmount))}</span>
                            </div>
                        </div>

                        {selectedPayout.holdReason && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                                <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                                    Active Settlement Hold Notice
                                </span>
                                <p className="text-amber-900">{selectedPayout.holdReason}</p>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setSelectedPayout(null)}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Release Modal */}
            {releasePayout && (
                <Modal
                    isOpen={!!releasePayout}
                    onClose={() => setReleasePayout(null)}
                    title="Confirm Settlement Release"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Are you sure you want to release net disbursement of{' '}
                            <span className="font-bold text-slate-900">{formatMoney(Number(releasePayout.netAcademyAmount))}</span> to{' '}
                            <span className="font-bold text-slate-900">{releasePayout.academyName}</span>?
                        </p>
                        <p className="text-xs text-slate-500">
                            This will initiate the automated NEFT/IMPS payout transfer via Razorpay Route and update settlement records.
                        </p>
                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                onClick={() => setReleasePayout(null)}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRelease}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-2"
                            >
                                {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                                Confirm & Release
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Hold Modal */}
            {holdPayout && (
                <Modal
                    isOpen={!!holdPayout}
                    onClose={closeHoldModal}
                    title="Place Settlement on Compliance Hold"
                >
                    <form
                        noValidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleHold();
                        }}
                        className="space-y-4"
                    >
                        <p className="text-sm text-slate-600">
                            Placing this payout on hold will pause bank transfers for{' '}
                            <span className="font-bold text-slate-900">{holdPayout.academyName}</span> pending verification.
                        </p>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Hold Justification <span className="text-rose-500">*</span>
                                </label>
                                <span className={`text-[10px] ${holdReason.trim().length > 500 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                    {holdReason.trim().length}/500
                                </span>
                            </div>
                            <textarea
                                rows={3}
                                placeholder="Explain why this settlement is being paused (e.g. unverified PAN, customer disputes, compliance audit)..."
                                value={holdReason}
                                onChange={(e) => setHoldReason(e.target.value)}
                                onBlur={holdForm.touch('reason')}
                                aria-invalid={!!holdForm.error('reason')}
                                style={invalidStyle(holdForm.error('reason'))}
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800"
                            />
                            <FieldError message={holdForm.error('reason')} />
                        </div>
                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={closeHoldModal}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors flex items-center gap-2"
                            >
                                {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                                Confirm Hold
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
