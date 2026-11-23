'use client';

import { useState, useEffect } from 'react';
import {
    Landmark, Search, RefreshCw, CheckCircle2, Clock, PauseCircle,
    AlertCircle, ShieldAlert, Eye
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

interface StatusCounts {
    all: number;
    pending: number;
    upcoming: number;
    completed: number;
    held: number;
}

interface PayoutsResponse {
    total: number;
    limit: number;
    offset: number;
    counts?: StatusCounts;
    payouts: PayoutRecord[];
}

const PAGE_SIZE = 8;

export default function PlatformAdminPayoutsPage() {
    const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [counts, setCounts] = useState<StatusCounts>({ all: 0, pending: 0, upcoming: 0, completed: 0, held: 0 });
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
            if (res.counts) setCounts(res.counts);
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                    Completed
                </span>
            );
        }
        if (s === 'held') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200">
                    <PauseCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                    On Hold
                </span>
            );
        }
        if (s === 'upcoming') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Clock className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                    Upcoming
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                Pending Cycle
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
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">Payouts & Settlements</h1>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Manage academy settlement cycles, net disbursements, compliance holds, and bank release schedules.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setRefreshKey(k => k + 1)}
                        disabled={loading}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                        title="Refresh settlement records"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Status Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                    { key: '', label: 'ALL PAYOUTS', count: counts.all, color: 'text-indigo-600', activeBg: 'bg-indigo-50 border-indigo-400 text-indigo-950 shadow-2xs' },
                    { key: 'pending', label: 'PENDING CYCLE', count: counts.pending, color: 'text-amber-600', activeBg: 'bg-amber-50 border-amber-400 text-amber-950 shadow-2xs', alert: counts.pending > 0 },
                    { key: 'upcoming', label: 'UPCOMING', count: counts.upcoming, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-400 text-blue-950 shadow-2xs' },
                    { key: 'completed', label: 'COMPLETED', count: counts.completed, color: 'text-emerald-600', activeBg: 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs' },
                    { key: 'held', label: 'ON HOLD', count: counts.held, color: 'text-rose-600', activeBg: 'bg-rose-50 border-rose-400 text-rose-950 shadow-2xs', alert: counts.held > 0, alertColor: 'bg-rose-500' },
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
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${tab.alertColor ? 'bg-rose-400' : 'bg-amber-400'} opacity-75`} />
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${tab.alertColor ? 'bg-rose-500' : 'bg-amber-500'}`} />
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
                        placeholder="Search academy name or payout ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    />
                </div>
                <div className="text-xs text-slate-400 font-medium whitespace-nowrap self-end sm:self-auto">
                    Showing <strong className="text-slate-700">{filteredPayouts.length}</strong> of <strong className="text-slate-700">{total}</strong> settlements
                </div>
            </div>

            {/* Table (Exact 100% Width, Zero Horizontal Scroll, Zero Overlap) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <table className="w-full table-fixed text-left text-xs text-slate-600">
                    <colgroup>
                        <col className="w-[24%]" />
                        <col className="w-[11%]" />
                        <col className="w-[11%]" />
                        <col className="w-[12%]" />
                        <col className="w-[13%]" />
                        <col className="w-[12%]" />
                        <col className="w-[17%]" />
                    </colgroup>
                    <thead className="bg-slate-50 text-slate-700 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="py-2.5 pl-4 pr-2">Academy</th>
                            <th className="py-2.5 px-3 text-right">Collected</th>
                            <th className="py-2.5 px-3 text-right">Deductions</th>
                            <th className="py-2.5 px-3 text-right">Net Payout</th>
                            <th className="py-2.5 px-2 text-center">Release Date</th>
                            <th className="py-2.5 px-2 text-center">Status</th>
                            <th className="py-2.5 px-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-normal">
                        {loading && payouts.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-400">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                                    Loading payout schedules...
                                </td>
                            </tr>
                        ) : filteredPayouts.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-400">
                                    <Landmark className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                                    No settlement records matching selected filters.
                                </td>
                            </tr>
                        ) : (
                            filteredPayouts.map((p) => {
                                const gross = Number(p.totalCollected || 0);
                                const comm = Number(p.platformCommission || 0);
                                const tax = Number(p.taxOnCommission || 0);
                                const charges = Number(p.gatewayCharges || 0);
                                const totalDeductions = comm + tax + charges;
                                const net = Number(p.netAcademyAmount || (gross - totalDeductions));

                                return (
                                    <tr key={p.payoutId} className="hover:bg-slate-50/80 transition-colors [&>td]:align-middle">
                                        <td className="py-2.5 pl-4 pr-2">
                                            <div className="font-semibold text-slate-900 text-xs truncate" title={p.academyName}>
                                                {p.academyName}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5" title={p.payoutId}>
                                                PAY-{p.payoutId.slice(0, 8).toUpperCase()}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-medium text-slate-800 whitespace-nowrap text-xs tabular-nums">
                                            {formatMoney(gross)}
                                        </td>
                                        <td
                                            className="py-2.5 px-3 text-right whitespace-nowrap text-xs tabular-nums"
                                            title={`Platform Commission (10%): ${formatMoney(comm)} | GST (18%): ${formatMoney(tax)} | Gateway Charges (2%): ${formatMoney(charges)}`}
                                        >
                                            <span className="font-semibold text-rose-600">
                                                -{formatMoney(totalDeductions)}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap text-xs tabular-nums">
                                            {formatMoney(net)}
                                        </td>
                                        <td className="py-2.5 px-2 text-center text-xs text-slate-700 whitespace-nowrap font-medium">
                                            {new Date(p.expectedReleaseDate).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                            {getStatusBadge(p.status)}
                                        </td>
                                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => setSelectedPayout(p)}
                                                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100/60 shadow-2xs cursor-pointer min-w-[68px]"
                                                    title="View Full Settlement Dossier"
                                                >
                                                    <Eye className="w-3.5 h-3.5 shrink-0" />
                                                    <span>Details</span>
                                                </button>
                                                {p.status !== 'completed' ? (
                                                    <button
                                                        onClick={() => setReleasePayout(p)}
                                                        className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer shadow-2xs min-w-[74px]"
                                                        title="Confirm & Release Payout"
                                                    >
                                                        Release
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setSelectedPayout(p)}
                                                        className="inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/60 rounded-lg transition-colors cursor-pointer shadow-2xs min-w-[74px]"
                                                        title={`Settlement Released${p.releasedAt ? ' on ' + new Date(p.releasedAt).toLocaleDateString('en-IN') : ''} - Click to view dossier`}
                                                    >
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                                        <span>Released</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
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

            {/* Payout Details Modal */}
            {selectedPayout && (
                <Modal
                    isOpen={!!selectedPayout}
                    onClose={() => setSelectedPayout(null)}
                    title="Settlement Dossier"
                    maxWidth="580px"
                >
                    <div className="space-y-3.5 max-h-[calc(88vh-90px)] overflow-y-auto pr-0.5">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Net Academy Payout</span>
                                <div className="text-2xl font-bold text-emerald-700 mt-0.5">
                                    {formatMoney(Number(selectedPayout.netAcademyAmount))}
                                </div>
                            </div>
                            <div>{getStatusBadge(selectedPayout.status)}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 text-xs">
                            <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl">
                                <span className="text-slate-400 font-medium text-[11px] block">Academy</span>
                                <div className="font-semibold text-slate-800 mt-1">{selectedPayout.academyName}</div>
                            </div>
                            <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl">
                                <span className="text-slate-400 font-medium text-[11px] block">Payout Reference</span>
                                <div className="font-mono font-semibold text-slate-800 mt-1">{selectedPayout.payoutId}</div>
                            </div>
                            <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl">
                                <span className="text-slate-400 font-medium text-[11px] block">Expected Release</span>
                                <div className="font-medium text-slate-800 mt-1">
                                    {new Date(selectedPayout.expectedReleaseDate).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl">
                                <span className="text-slate-400 font-medium text-[11px] block">Disbursement Status</span>
                                <div className="font-medium text-slate-800 mt-1">
                                    {selectedPayout.releasedAt ? (
                                        <span className="text-emerald-700 font-semibold">
                                            Released on {new Date(selectedPayout.releasedAt).toLocaleDateString('en-IN')}
                                        </span>
                                    ) : (
                                        <span className="text-amber-700 font-semibold">Pending Bank Transfer</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Financial Breakdown & Commission Splits
                            </div>
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
                            <div className="flex justify-between pt-2 font-bold text-emerald-800 text-sm">
                                <span>Net Bank Transfer Entitlement</span>
                                <span>{formatMoney(Number(selectedPayout.netAcademyAmount))}</span>
                            </div>
                        </div>

                        {selectedPayout.holdReason && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                                <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                                    Active Settlement Hold Notice
                                </span>
                                <p className="text-amber-900 leading-relaxed">{selectedPayout.holdReason}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                {selectedPayout.status !== 'completed' && (
                                    <button
                                        onClick={() => {
                                            const p = selectedPayout;
                                            setSelectedPayout(null);
                                            setReleasePayout(p);
                                        }}
                                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                                    >
                                        Release Settlement
                                    </button>
                                )}
                                {selectedPayout.status !== 'held' && selectedPayout.status !== 'completed' && (
                                    <button
                                        onClick={() => {
                                            const p = selectedPayout;
                                            setSelectedPayout(null);
                                            setHoldPayout(p);
                                            setHoldReason('');
                                        }}
                                        className="px-3.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                                    >
                                        Place on Hold
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedPayout(null)}
                                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
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
                                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRelease}
                                disabled={actionLoading}
                                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-2"
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
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800"
                            />
                            <FieldError message={holdForm.error('reason')} />
                        </div>
                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={closeHoldModal}
                                disabled={actionLoading}
                                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors flex items-center gap-2"
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
