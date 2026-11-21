'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Sparkles, UserX, UserCheck, Eye, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';
import Pagination from '@/components/Pagination';

interface UserRecord {
    userId: string;
    email: string | null;
    phone: string | null;
    fullName: string;
    isActive: boolean;
    isSuspended: boolean;
    suspensionReason: string | null;
    lastActivityAt: string;
    createdAt: string;
    enrollmentCount: number;
    academyMembershipCount: number;
}

interface UsersApiResponse {
    users: UserRecord[];
    total: number;
    limit: number;
    offset: number;
}

const PAGE_SIZE = 10;

export default function PlatformAdminUsersPage() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Selected user for inspection
    const [inspectUser, setInspectUser] = useState<UserRecord | null>(null);

    // Action dialog for suspend / reactivate
    const [actionUser, setActionUser] = useState<{ user: UserRecord; action: 'suspend' | 'reactivate' } | null>(null);
    const [suspendReason, setSuspendReason] = useState('');
    const [actionBusy, setActionBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const suspendForm = useFormValidation(
        { reason: suspendReason },
        {
            reason: [
                rules.when(
                    actionUser?.action === 'suspend',
                    rules.required('Suspension reason'),
                    rules.minLength('Suspension reason', 10),
                    rules.maxLength('Suspension reason', 500),
                ),
            ],
        },
    );

    const closeActionModal = () => {
        setActionUser(null);
        setSuspendReason('');
        setActionError(null);
        suspendForm.reset();
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const fetchUsers = useCallback(async (page = 1, query = searchQuery, status = statusFilter) => {
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

            const res = await api<UsersApiResponse>(`/platform/users?${params.toString()}`);
            setUsers(res.users || []);
            setTotal(res.total || 0);
            setCurrentPage(page);
            if (page > 0 && total > 0) showToast('User records refreshed.');
        } catch {
            showToast('Unable to fetch registered users.');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        fetchUsers(1);
    }, [fetchUsers]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchUsers(1, searchQuery, statusFilter);
    };

    const handleStatusFilterChange = (status: string) => {
        setStatusFilter(status);
        fetchUsers(1, searchQuery, status);
    };

    const handleConfirmAction = async () => {
        if (!actionUser) return;
        const isSuspending = actionUser.action === 'suspend';
        if (!suspendForm.validate()) return;

        try {
            setActionBusy(true);
            setActionError(null);
            await api('/platform/users', {
                method: 'PATCH',
                body: JSON.stringify({
                    userId: actionUser.user.userId,
                    isSuspended: isSuspending,
                    reason: isSuspending ? suspendReason.trim() : null,
                }),
            });

            showToast(`User ${actionUser.user.fullName} has been ${isSuspending ? 'suspended' : 'reactivated'}.`);
            closeActionModal();
            fetchUsers(currentPage, searchQuery, statusFilter);
        } catch (err) {
            const msg = (err as Error).message || 'Action failed.';
            setActionError(msg);
            showToast(msg);
        } finally {
            setActionBusy(false);
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
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users Management</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Registered learners, guardians, instructors, and academy administrators across ClassShare.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchUsers(currentPage, searchQuery, statusFilter)}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs hover:border-slate-300 cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, email, or mobile..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs transition-all"
                        />
                    </div>
                    <button type="submit" className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs">
                        Search
                    </button>
                </form>

                {/* Status Toggle Tabs */}
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs text-xs font-semibold">
                    {[
                        { label: 'All Users', val: 'all' },
                        { label: 'Active', val: 'active' },
                        { label: 'Suspended', val: 'suspended' },
                    ].map((tab) => (
                        <button
                            key={tab.val}
                            type="button"
                            onClick={() => handleStatusFilterChange(tab.val)}
                            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                statusFilter === tab.val ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                <div>
                    <table className="w-full table-fixed text-left text-xs">
                        <colgroup>
                            <col className="w-[22%]" />
                            <col className="w-[26%]" />
                            <col className="w-[13%]" />
                            <col className="w-[11%]" />
                            <col className="w-[11%]" />
                            <col className="w-[17%]" />
                        </colgroup>
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 [&>th]:whitespace-nowrap [&>th]:align-middle">
                                <th className="py-3 px-4">User</th>
                                <th className="py-3 px-4">Contact</th>
                                <th className="py-3 px-4">Enrollments</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Joined Date</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-500">
                                        No registered user accounts match the current filters.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.userId} className="hover:bg-slate-50/70 transition-colors [&>td]:align-middle">
                                        <td className="py-3.5 px-4 font-bold text-slate-900">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                                                    {u.fullName?.charAt(0) || 'U'}
                                                </div>
                                                <div className="font-bold text-slate-900 min-w-0 break-words line-clamp-2" title={u.fullName || undefined}>{u.fullName || 'Unnamed User'}</div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600">
                                            <div className="font-mono break-all line-clamp-2" title={u.email || undefined}>{u.email || '—'}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">{u.phone || 'No mobile'}</div>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                                            <div>{u.enrollmentCount} {u.enrollmentCount === 1 ? 'course' : 'courses'}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">{u.academyMembershipCount} {u.academyMembershipCount === 1 ? 'academy' : 'academies'}</div>
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            {u.isSuspended ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                    Suspended
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => setInspectUser(u)}
                                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors inline-flex items-center cursor-pointer"
                                                    title="View details"
                                                >
                                                    <Eye size={13} />
                                                </button>
                                                {u.isSuspended ? (
                                                    <button
                                                        onClick={() => setActionUser({ user: u, action: 'reactivate' })}
                                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                        title="Reactivate account"
                                                    >
                                                        <UserCheck size={13} />
                                                        <span>Reactivate</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setActionUser({ user: u, action: 'suspend' })}
                                                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                        title="Suspend account"
                                                    >
                                                        <UserX size={13} />
                                                        <span>Suspend</span>
                                                    </button>
                                                )}
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
                    onPageChange={(page) => fetchUsers(page, searchQuery, statusFilter)}
                    recordLabel="users"
                    loading={loading}
                />
            </div>

            {/* Inspect User Modal */}
            {inspectUser && (
                <Modal title="Learner Profile Details" onClose={() => setInspectUser(null)} maxWidth="480px">
                    <div className="space-y-4 text-xs font-sans text-slate-800">
                        <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-extrabold text-base flex items-center justify-center shrink-0">
                                {inspectUser.fullName?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-sm text-slate-900 truncate">{inspectUser.fullName}</h3>
                                <p className="font-mono text-slate-500">{inspectUser.email ?? 'No email on record'}</p>
                                <p className="text-slate-400">{inspectUser.phone ?? 'No phone'}</p>
                            </div>
                        </div>

                        <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-[11px]">
                            <div><strong className="font-sans text-slate-500">System User ID:</strong> {inspectUser.userId}</div>
                            <div><strong className="font-sans text-slate-500">Account Status:</strong> {inspectUser.isSuspended ? 'Suspended' : 'Active'}</div>
                            {inspectUser.suspensionReason && (
                                <div className="text-rose-600"><strong className="font-sans text-slate-500">Suspension Reason:</strong> {inspectUser.suspensionReason}</div>
                            )}
                            <div><strong className="font-sans text-slate-500">Registration Date:</strong> {new Date(inspectUser.createdAt).toLocaleString()}</div>
                            <div><strong className="font-sans text-slate-500">Last Activity:</strong> {new Date(inspectUser.lastActivityAt).toLocaleString()}</div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setInspectUser(null)}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors cursor-pointer text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Suspend / Reactivate Confirmation Modal */}
            {actionUser && (
                <Modal
                    title={actionUser.action === 'suspend' ? 'Confirm User Suspension' : 'Confirm User Reactivation'}
                    onClose={closeActionModal}
                    maxWidth="440px"
                >
                    <form
                        noValidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleConfirmAction();
                        }}
                        className="space-y-4 text-xs font-sans"
                    >
                        <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                actionUser.action === 'suspend' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                                <ShieldAlert size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-900">
                                    {actionUser.action === 'suspend' ? `Suspend ${actionUser.user.fullName}?` : `Reactivate ${actionUser.user.fullName}?`}
                                </h3>
                                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                                    {actionUser.action === 'suspend'
                                        ? 'The user will be immediately logged out and blocked from course access and registrations. Financial and registration history will remain intact.'
                                        : 'The user will regain sign-in privileges and active access to their registered courses and academies.'}
                                </p>
                            </div>
                        </div>

                        {actionError && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                                <ShieldAlert size={15} className="shrink-0 text-rose-600" />
                                <span>{actionError}</span>
                            </div>
                        )}

                        {actionUser.action === 'suspend' && (
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-bold text-slate-700">
                                        Suspension Reason <span className="text-rose-500">*</span>
                                    </label>
                                    <span className={`text-[10px] ${suspendReason.trim().length > 500 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                        {suspendReason.trim().length}/500
                                    </span>
                                </div>
                                <textarea
                                    rows={3}
                                    required
                                    placeholder="Provide detailed compliance, policy violation, or security reason..."
                                    value={suspendReason}
                                    onChange={(e) => {
                                        setSuspendReason(e.target.value);
                                        if (actionError) setActionError(null);
                                    }}
                                    onBlur={suspendForm.touch('reason')}
                                    aria-invalid={!!suspendForm.error('reason')}
                                    style={invalidStyle(suspendForm.error('reason'))}
                                    onKeyDown={(e) => {
                                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                            e.preventDefault();
                                            handleConfirmAction();
                                        }
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 resize-none"
                                />
                                <FieldError message={suspendForm.error('reason')} />
                                <p className="text-[10px] text-slate-400 mt-1">Press Ctrl+Enter or click below to submit.</p>
                            </div>
                        )}

                        <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={closeActionModal}
                                disabled={actionBusy}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={actionBusy}
                                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                                    actionUser.action === 'suspend'
                                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                                }`}
                            >
                                {actionBusy ? <>Processing… <RefreshCw size={13} className="animate-spin" /></> : actionUser.action === 'suspend' ? 'Confirm Suspension' : 'Confirm Reactivation'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
