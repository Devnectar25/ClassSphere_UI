'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Sparkles, Eye, ShieldAlert, ClipboardCheck } from 'lucide-react';
import { api, formatMoney } from '@/lib/api';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';
import Pagination from '@/components/Pagination';

interface RegistrationRecord {
    registrationId: string;
    tenantId: string;
    academyName: string;
    studentId: string;
    learnerName: string;
    learnerEmail: string;
    learnerPhone: string;
    courseId: string;
    courseName: string;
    registrationAmount: number;
    batchId: string;
    batchName: string;
    status: string;
    registrationDate: string;
}

interface RegistrationsApiResponse {
    registrations: RegistrationRecord[];
    total: number;
    limit: number;
    offset: number;
}

const PAGE_SIZE = 10;
const STATUS_OPTIONS = ['all', 'waitlisted', 'pending', 'approved', 'confirmed', 'rejected', 'expired', 'cancelled', 'completed'];

const STATUS_EXPLANATIONS: Record<string, string> = {
    waitlisted: 'Learner is placed in waitlist queue. Seat is not held.',
    pending: 'Initial application submitted. Awaiting academy review.',
    approved: 'Academy approved. Seat is held and learner must pay before the payment deadline.',
    confirmed: 'Payment captured. Seat is officially confirmed and guaranteed.',
    completed: 'Course batch has finished. Registration concluded.',
    rejected: 'Request rejected. Held seat is released back to batch capacity.',
    expired: 'Payment deadline lapsed without payment. Seat is released.',
    cancelled: 'Registration cancelled. Seat is released and refund handled per policy.',
};

export default function PlatformAdminRegistrationsPage() {
    const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Inspector
    const [inspectReg, setInspectReg] = useState<RegistrationRecord | null>(null);

    // Status Override Dialog
    const [overrideReg, setOverrideReg] = useState<RegistrationRecord | null>(null);
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
                        ? `Registration is already ${value}. Choose a different status.`
                        : undefined,
            ],
            reason: [rules.required('Justification reason'), rules.minLength('Justification reason', 10), rules.maxLength('Justification reason', 500)],
        },
    );

    const closeOverrideModal = () => {
        setOverrideReg(null);
        setOverrideReason('');
        overrideForm.reset();
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const fetchRegistrations = useCallback(async (page = 1, query = searchQuery, status = statusFilter) => {
        try {
            setLoading(true);
            const offset = (page - 1) * PAGE_SIZE;
            const params = new URLSearchParams({
                limit: PAGE_SIZE.toString(),
                offset: offset.toString(),
            });
            if (query.trim()) params.set('q', query.trim());
            if (status !== 'all') params.set('status', status);
            params.set('_t', Date.now().toString());

            const res = await api<RegistrationsApiResponse>(`/platform/registrations?${params.toString()}`);
            setRegistrations(res.registrations || []);
            setTotal(res.total || 0);
            setCurrentPage(page);
            if (page > 0 && total > 0) showToast('Registrations updated.');
        } catch {
            showToast('Unable to fetch registrations.');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        fetchRegistrations(1);
    }, [fetchRegistrations]);

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

            showToast(`Registration status overridden to ${newStatus}. Audited.`);
            closeOverrideModal();
            fetchRegistrations(currentPage, searchQuery, statusFilter);
        } catch (err) {
            showToast((err as Error).message || 'Override failed.');
        } finally {
            setOverrideBusy(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="space-y-6 animate-fade-in">
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[10000] bg-white border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold">
                    <Sparkles size={16} className="text-amber-500" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Registrations Management</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Global learner course enrollments, batch assignments, and exceptional administrative status overrides.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchRegistrations(currentPage, searchQuery, statusFilter)}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs hover:border-slate-300 cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <form onSubmit={(e) => { e.preventDefault(); fetchRegistrations(1, searchQuery, statusFilter); }} className="relative flex-1 max-w-md flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search learner, academy, or course..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs transition-all"
                        />
                    </div>
                    <button type="submit" className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs">
                        Search
                    </button>
                </form>

                {/* Status select dropdown */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Status:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            fetchRegistrations(1, searchQuery, e.target.value);
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-indigo-500 shadow-2xs capitalize"
                    >
                        {STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>{st === 'all' ? 'All Statuses' : st}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                <div>
                    <table className="w-full table-fixed text-left text-xs">
                        <colgroup>
                            <col className="w-[16%]" />
                            <col className="w-[21%]" />
                            <col className="w-[12%]" />
                            <col className="w-[11%]" />
                            <col className="w-[11%]" />
                            <col className="w-[11%]" />
                            <col className="w-[18%]" />
                        </colgroup>
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                                <th className="py-3 px-3">Learner</th>
                                <th className="py-3 px-3">Course / Academy</th>
                                <th className="py-3 px-3">Batch</th>
                                <th className="py-3 px-3">Amount</th>
                                <th className="py-3 px-3">Status</th>
                                <th className="py-3 px-3">Date</th>
                                <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {registrations.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-500">
                                        No learner course registrations match the current filter.
                                    </td>
                                </tr>
                            ) : (
                                registrations.map((r) => (
                                    <tr key={r.registrationId} className="hover:bg-slate-50/70 transition-colors [&>td]:align-middle">
                                        <td className="py-3.5 px-3 font-bold text-slate-900">
                                            <div className="break-words line-clamp-2" title={r.learnerName}>{r.learnerName}</div>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <div className="font-bold text-slate-800 break-words line-clamp-2" title={r.courseName}>{r.courseName}</div>
                                            <div className="text-[11px] text-slate-500 truncate" title={r.academyName}>{r.academyName}</div>
                                        </td>
                                        <td className="py-3.5 px-3 text-slate-600 font-medium">
                                            <div className="break-words line-clamp-2" title={r.batchName}>{r.batchName}</div>
                                        </td>
                                        <td className="py-3.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                                            {formatMoney(r.registrationAmount)}
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize whitespace-nowrap ${
                                                r.status === 'confirmed' || r.status === 'completed'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : r.status === 'rejected' || r.status === 'cancelled'
                                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                            }`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                                            {new Date(r.registrationDate).toLocaleDateString()}
                                        </td>
                                        <td className="py-3.5 pl-3 pr-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => setInspectReg(r)}
                                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors inline-flex items-center cursor-pointer"
                                                    title="View complete details"
                                                >
                                                    <Eye size={13} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setOverrideReg(r);
                                                        setNewStatus(r.status);
                                                        setOverrideReason('');
                                                    }}
                                                    className="shrink-0 px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                    title="Exceptional status override"
                                                >
                                                    <ShieldAlert size={13} />
                                                    <span>Override</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={total}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => fetchRegistrations(page, searchQuery, statusFilter)}
                    recordLabel="registrations"
                    loading={loading}
                />
            </div>

            {/* Inspect Modal */}
            {inspectReg && (
                <Modal title="Registration Lifecycle Record" onClose={() => setInspectReg(null)} maxWidth="520px">
                    <div className="space-y-4 text-xs font-sans text-slate-800">
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                            <span className="font-mono text-[10px] text-slate-400">REGISTRATION ID: {inspectReg.registrationId}</span>
                            <div className="text-base font-bold text-slate-900">{inspectReg.learnerName}</div>
                            <div className="text-slate-600">{inspectReg.learnerEmail} &bull; {inspectReg.learnerPhone}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                            <div><strong>Course:</strong> {inspectReg.courseName}</div>
                            <div><strong>Academy:</strong> {inspectReg.academyName}</div>
                            <div><strong>Batch:</strong> {inspectReg.batchName}</div>
                            <div><strong>Tuition Amount:</strong> {formatMoney(inspectReg.registrationAmount)}</div>
                            <div><strong>Lifecycle Status:</strong> <span className="font-bold capitalize">{inspectReg.status}</span></div>
                            <div><strong>Enrolled Date:</strong> {new Date(inspectReg.registrationDate).toLocaleString()}</div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setInspectReg(null)}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors cursor-pointer text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Override Modal */}
            {overrideReg && (
                <Modal title="Exceptional Administrative Status Override" onClose={closeOverrideModal} maxWidth="460px">
                    <form
                        noValidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleExecuteOverride();
                        }}
                        className="space-y-4 text-xs font-sans"
                    >
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                            <strong>Audit Notice:</strong> Status overrides bypass standard gateway and academy lifecycle checks. This action will be cryptographically logged to the compliance audit trail.
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
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-indigo-500 capitalize"
                            >
                                {['waitlisted', 'pending', 'approved', 'confirmed', 'rejected', 'expired', 'cancelled', 'completed'].map((st) => (
                                    <option key={st} value={st}>{st}</option>
                                ))}
                            </select>
                            <p className="text-[11px] text-slate-400 mt-1">
                                Current status: <span className="font-semibold capitalize text-slate-600">{overrideReg.status}</span>
                            </p>
                            {STATUS_EXPLANATIONS[newStatus] && (
                                <div className="mt-2 p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-800 leading-relaxed">
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
                                placeholder="State exact operational, legal, or customer support reason for overriding this registration..."
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                                onBlur={overrideForm.touch('reason')}
                                aria-invalid={!!overrideForm.error('reason')}
                                style={invalidStyle(overrideForm.error('reason'))}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
                            />
                            <FieldError message={overrideForm.error('reason')} />
                        </div>

                        <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={closeOverrideModal}
                                disabled={overrideBusy}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={overrideBusy}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
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
