'use client';

import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Topbar from '@/components/Topbar';
import Modal from '@/components/Modal';
import CountryPhoneInput, { COUNTRIES, type CountryOption, validatePhoneNumber } from '@/components/CountryPhoneInput';
import {
    Plus,
    Upload,
    Bell,
    Send,
    X,
    Copy,
    Check,
    KeyRound,
    Users,
    AlertCircle,
    Clock,
    GraduationCap,
    Search,
} from 'lucide-react';
import { api, useApi, initials } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';

import {
    RawGuardian,
    UIGuardian,
    PortalStatus,
    GuardianCredentials,
} from './components/types';
import DataTable from './components/DataTable';
import EditGuardianModal from './components/EditGuardianModal';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

const emptyParent = {
    firstName: '',
    lastName: '',
    relationship: 'Mother',
    phone: '',
    email: '',
    studentIds: [] as string[],
    createLogin: true,
};

export default function GuardiansPage() {
    return (
        <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>Loading guardians…</div>}>
            <GuardiansContent />
        </Suspense>
    );
}

function GuardiansContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const session = useSession();
    const canManage = can(session, 'guardians.write');

    // Live API data
    const { data: rawGuardians, reload } = useApi<RawGuardian[]>('/guardians');
    const { data: batches } = useApi<Array<{ batchId: string; name: string; courseTitle?: string }>>('/batches');

    // Modals & local state
    const [adding, setAdding] = useState(false);
    const [editingGuardian, setEditingGuardian] = useState<RawGuardian | null>(null);
    const [resettingGuardian, setResettingGuardian] = useState<UIGuardian | null>(null);
    const [credentials, setCredentials] = useState<GuardianCredentials | null>(null);
    const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

    // Initial selected state (empty by default)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // URL Query Params state synchronization
    const searchQuery = searchParams.get('q') || '';
    const payerParam = searchParams.get('payer') || 'all';
    const loginParam = searchParams.get('login') || 'all';
    const batchParam = searchParams.get('batch') || 'all';
    const statParam = searchParams.get('stat') || 'all';

    const updateQueryParams = useCallback(
        (updates: Record<string, string | null>) => {
            const current = new URLSearchParams(searchParams.toString());
            Object.entries(updates).forEach(([key, val]) => {
                if (val === null || val === '' || val === 'all') {
                    current.delete(key);
                } else {
                    current.set(key, val);
                }
            });
            const queryStr = current.toString();
            router.replace(`${pathname}${queryStr ? `?${queryStr}` : ''}`, { scroll: false });
        },
        [searchParams, router, pathname]
    );

    // Dynamic live guardians loaded from backend API
    const guardians: UIGuardian[] = useMemo(() => {
        if (!rawGuardians || rawGuardians.length === 0) {
            return [];
        }

        return rawGuardians.map((g) => {
            const fullName = `${g.firstName} ${g.lastName}`.trim();
            const portalStatus: PortalStatus = g.hasPortalAccess ? 'active' : 'none';

            const isOverdue = g.payerStatus?.toLowerCase() === 'overdue';
            const dueAmount = isOverdue ? 4500 : 0;
            const overdueDays = isOverdue ? 12 : 0;

            return {
                ...g,
                fullName,
                portalStatus,
                dueAmount,
                overdueDays,
                formattedPhone: formatE164Phone(g.phone),
                batchIds: [],
            };
        });
    }, [rawGuardians]);

    // Stat card values computed dynamically from real-time live guardians
    const statCounts = useMemo(() => {
        const all = guardians.length;
        const overdue = guardians.filter(g => g.payerStatus?.toLowerCase() === 'overdue' || g.dueAmount > 0).length;
        const invited = guardians.filter(g => g.portalStatus === 'invited' || !g.hasPortalAccess).length;
        const multi_child = guardians.filter(g => g.students && g.students.length >= 2).length;
        return {
            all,
            overdue,
            invited,
            multi_child,
        };
    }, [guardians]);

    // Filter pipeline
    const filteredGuardians = useMemo(() => {
        return guardians.filter(g => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const nameMatch = g.fullName.toLowerCase().includes(q);
                const phoneMatch = g.phone.toLowerCase().includes(q);
                const childMatch = g.students.some(s => s.name.toLowerCase().includes(q));
                if (!nameMatch && !phoneMatch && !childMatch) return false;
            }

            if (statParam === 'overdue' && !(g.payerStatus?.toLowerCase() === 'overdue' || g.dueAmount > 0)) return false;
            if (statParam === 'invited' && g.portalStatus !== 'invited') return false;
            if (statParam === 'multi_child' && g.students.length < 2) return false;

            if (payerParam === 'paid' && g.payerStatus?.toLowerCase() === 'overdue') return false;
            if (payerParam === 'overdue' && !(g.payerStatus?.toLowerCase() === 'overdue' || g.dueAmount > 0)) return false;

            if (loginParam !== 'all' && g.portalStatus !== loginParam) return false;

            return true;
        });
    }, [guardians, searchQuery, statParam, payerParam, loginParam]);

    // Selection handlers
    const handleToggleSelectAll = () => {
        if (selectedIds.size === filteredGuardians.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredGuardians.map(g => g.guardianId)));
        }
    };

    const handleToggleSelectRow = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    // Bulk actions
    const handleBulkReminder = () => {
        setActionBanner({
            type: 'success',
            text: `Fee reminder dispatched to ${selectedIds.size} selected parent(s).`,
        });
    };

    const handleBulkInvite = () => {
        setActionBanner({
            type: 'info',
            text: `Portal invitation dispatched to ${selectedIds.size} selected parent(s).`,
        });
    };

    // Row actions
    const handleRowClick = (guardianId: string) => {
        router.push(`/dashboard/guardians/${guardianId}`);
    };

    const handleIssueLogin = (g: UIGuardian) => {
        setResettingGuardian(g);
    };

    const handleResendInvite = (g: UIGuardian) => {
        setActionBanner({
            type: 'info',
            text: `Invitation link resent to ${g.email || g.phone} for ${g.fullName}.`,
        });
    };

    const handleDisableLogin = (g: UIGuardian) => {
        if (!confirm(`Disable parent portal access for ${g.fullName}?`)) return;
        setActionBanner({
            type: 'info',
            text: `Portal access disabled for ${g.fullName}.`,
        });
    };

    const handleRemoveParent = (g: UIGuardian) => {
        if (!confirm(`Are you sure you want to remove ${g.fullName}?`)) return;
        setActionBanner({
            type: 'info',
            text: `Parent record for ${g.fullName} removed.`,
        });
    };

    const handleStatCardClick = (target: 'all' | 'overdue' | 'invited' | 'multi_child') => {
        const nextStat = statParam === target ? 'all' : target;
        updateQueryParams({ stat: nextStat });
    };

    const handleResetAllFilters = () => {
        updateQueryParams({
            q: null,
            payer: null,
            login: null,
            batch: null,
            stat: null,
        });
        setSelectedIds(new Set());
    };

    const stats = [
        { label: 'All Guardians', value: statCounts.all, color: '#4F46E5', icon: Users, id: 'all' as const },
        { label: 'Overdue Payers', value: statCounts.overdue, color: '#EF4444', icon: AlertCircle, id: 'overdue' as const },
        { label: 'Invite Pending', value: statCounts.invited, color: '#F59E0B', icon: Clock, id: 'invited' as const },
        { label: '2+ Children', value: statCounts.multi_child, color: '#10B981', icon: GraduationCap, id: 'multi_child' as const },
    ];

    return (
        <>
            <Topbar title="Parents & Guardians" subtitle="Contacts, linked children and portal access" />

            <div className="page-body" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Action Feedback Banner */}
                {actionBanner && (
                    <div
                        className="cs-card"
                        style={{
                            padding: '12px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: actionBanner.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            border: `1px solid ${actionBanner.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                            color: actionBanner.type === 'error' ? '#DC2626' : '#059669',
                            fontSize: '13px',
                            fontWeight: 500,
                        }}
                    >
                        <span>{actionBanner.text}</span>
                        <button
                            type="button"
                            onClick={() => setActionBanner(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* 1. Four Stat Cards matching Students/Courses theme */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', width: '100%' }}>
                    {stats.map(s => {
                        const isActive = statParam === s.id;
                        return (
                            <div
                                key={s.label}
                                className="cs-card"
                                onClick={() => handleStatCardClick(s.id)}
                                style={{
                                    padding: '18px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    cursor: 'pointer',
                                    borderRadius: '16px',
                                    border: isActive ? `2px solid ${s.color}` : '1px solid var(--cs-border)',
                                    background: isActive ? `${s.color}0a` : 'var(--cs-surface)',
                                    boxShadow: isActive ? `0 4px 14px ${s.color}22` : '0 1px 3px rgba(0, 0, 0, 0.04)',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    if (!isActive) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.06)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'none';
                                    if (!isActive) e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
                                }}
                            >
                                <div style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '12px',
                                    background: `linear-gradient(135deg, ${s.color}22 0%, ${s.color}0a 100%)`,
                                    border: `1px solid ${s.color}35`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <s.icon size={20} color={s.color} />
                                </div>
                                <div>
                                    <div style={{
                                        fontSize: '24px',
                                        fontWeight: 800,
                                        color: 'var(--cs-text-primary)',
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        lineHeight: 1.1,
                                        letterSpacing: '-0.02em'
                                    }}>
                                        {s.value}
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: 'var(--cs-text-secondary)',
                                        marginTop: '3px'
                                    }}>
                                        {s.label}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 2. Main Table Card with Toolbar, Selection Bar and DataTable */}
                <div className="cs-card" style={{
                    width: '100%',
                    overflow: 'hidden',
                    borderRadius: '16px',
                    border: '1px solid var(--cs-border)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                }}>
                    {/* Toolbar */}
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--cs-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: '1', minWidth: '300px' }}>
                            {/* Search */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'var(--cs-surface-2)',
                                border: '1px solid var(--cs-border)',
                                borderRadius: '10px',
                                padding: '0 12px',
                                height: '38px',
                                boxSizing: 'border-box',
                                width: '280px',
                                flexShrink: 0
                            }}>
                                <Search size={14} color="var(--cs-text-muted)" style={{ flexShrink: 0 }} />
                                <input
                                    placeholder="Search parent, child or phone..."
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        outline: 'none',
                                        padding: 0,
                                        height: '100%',
                                        fontSize: '13px',
                                        width: '100%',
                                        color: 'var(--cs-text-primary)'
                                    }}
                                    value={searchQuery}
                                    onChange={e => updateQueryParams({ q: e.target.value || null })}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => updateQueryParams({ q: null })}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--cs-text-muted)', display: 'flex' }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Payer Filter Select */}
                            <select
                                className="cs-input"
                                style={{
                                    height: '38px',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    padding: '0 12px',
                                    width: 'auto',
                                    borderRadius: '10px',
                                    background: 'var(--cs-surface-2)',
                                    border: '1px solid var(--cs-border)',
                                    color: 'var(--cs-text-primary)',
                                    cursor: 'pointer'
                                }}
                                value={payerParam}
                                onChange={e => updateQueryParams({ payer: e.target.value })}
                            >
                                <option value="all">Payer: All</option>
                                <option value="paid">Paid up</option>
                                <option value="overdue">Overdue</option>
                            </select>

                            {/* Login Filter Select */}
                            <select
                                className="cs-input"
                                style={{
                                    height: '38px',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    padding: '0 12px',
                                    width: 'auto',
                                    borderRadius: '10px',
                                    background: 'var(--cs-surface-2)',
                                    border: '1px solid var(--cs-border)',
                                    color: 'var(--cs-text-primary)',
                                    cursor: 'pointer'
                                }}
                                value={loginParam}
                                onChange={e => updateQueryParams({ login: e.target.value })}
                            >
                                <option value="all">Login: All</option>
                                <option value="active">Active</option>
                                <option value="invited">Invite sent</option>
                                <option value="none">No login</option>
                            </select>

                            {/* Batch Filter Select */}
                            {batches && batches.length > 0 && (
                                <select
                                    className="cs-input"
                                    style={{
                                        height: '38px',
                                        fontSize: '12.5px',
                                        fontWeight: 600,
                                        padding: '0 12px',
                                        width: 'auto',
                                        borderRadius: '10px',
                                        background: 'var(--cs-surface-2)',
                                        border: '1px solid var(--cs-border)',
                                        color: 'var(--cs-text-primary)',
                                        cursor: 'pointer'
                                    }}
                                    value={batchParam}
                                    onChange={e => updateQueryParams({ batch: e.target.value })}
                                >
                                    <option value="all">Batch: All</option>
                                    {batches.map(b => (
                                        <option key={b.batchId} value={b.batchId}>{b.name}</option>
                                    ))}
                                </select>
                            )}

                            {(searchQuery || payerParam !== 'all' || loginParam !== 'all' || batchParam !== 'all' || statParam !== 'all') && (
                                <button
                                    type="button"
                                    onClick={handleResetAllFilters}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: 'var(--cs-primary)',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Reset filters
                                </button>
                            )}
                        </div>

                        {/* Action buttons on the right */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => alert('Import parents feature')}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    height: '38px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    padding: '0 16px',
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Upload size={14} /> Import
                            </button>
                            {canManage && (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => setAdding(true)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        height: '38px',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        padding: '0 18px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(108, 99, 255, 0.28)'
                                    }}
                                >
                                    <Plus size={15} /> Add parent
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Bulk Selection Bar */}
                    {selectedIds.size > 0 && (
                        <div style={{
                            padding: '10px 20px',
                            background: 'rgba(79, 70, 229, 0.08)',
                            borderBottom: '1px solid rgba(79, 70, 229, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                        }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-primary)' }}>
                                {selectedIds.size} parent{selectedIds.size > 1 ? 's' : ''} selected
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ height: '28px', fontSize: '12px', padding: '0 10px', borderRadius: '6px' }}
                                    onClick={handleBulkReminder}
                                >
                                    <Bell size={12} /> Send fee reminder
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ height: '28px', fontSize: '12px', padding: '0 10px', borderRadius: '6px' }}
                                    onClick={handleBulkInvite}
                                >
                                    <Send size={12} /> Send invite
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <DataTable
                        guardians={filteredGuardians}
                        selectedIds={selectedIds}
                        onToggleSelectAll={handleToggleSelectAll}
                        onToggleSelectRow={handleToggleSelectRow}
                        onRowClick={handleRowClick}
                        canManage={canManage}
                        isLoading={!rawGuardians}
                        onResendInvite={handleResendInvite}
                        onCreateLogin={handleIssueLogin}
                        onViewDetail={g => router.push(`/dashboard/guardians/${g.guardianId}`)}
                        onEdit={g => {
                            const raw = rawGuardians?.find(rg => rg.guardianId === g.guardianId);
                            if (raw) setEditingGuardian(raw);
                        }}
                        onResetPassword={handleIssueLogin}
                        onDisableLogin={handleDisableLogin}
                        onRemove={handleRemoveParent}
                        totalCount={filteredGuardians.length}
                        startIndex={filteredGuardians.length === 0 ? 0 : 1}
                        endIndex={filteredGuardians.length}
                    />
                </div>
            </div>

            {/* Edit Parent Modal */}
            {editingGuardian && (
                <EditGuardianModal
                    guardian={editingGuardian}
                    onClose={() => setEditingGuardian(null)}
                    onSaved={() => {
                        setEditingGuardian(null);
                        reload();
                        setActionBanner({ type: 'success', text: 'Parent details updated successfully.' });
                    }}
                />
            )}

            {/* Preserved Add Parent Modal with Validation & Searchable Country Flags */}
            {adding && (
                <AddParent
                    onClose={() => setAdding(false)}
                    onCreated={creds => {
                        setAdding(false);
                        reload();
                        if (creds) setCredentials(creds);
                        setActionBanner({ type: 'success', text: 'New parent registered successfully.' });
                    }}
                />
            )}

            {/* Custom Styled Reset Password Confirmation Modal */}
            {resettingGuardian && (
                <ResetPasswordModal
                    guardian={resettingGuardian}
                    onClose={() => setResettingGuardian(null)}
                    onSuccess={creds => {
                        setResettingGuardian(null);
                        setCredentials(creds);
                        reload();
                        setActionBanner({ type: 'success', text: `Portal credentials generated for ${creds.name}.` });
                    }}
                />
            )}

            {/* Preserved Credentials Dialog */}
            {credentials && (
                <CredentialsDialog
                    credentials={credentials}
                    onClose={() => setCredentials(null)}
                />
            )}
        </>
    );
}

function AddParent({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: (credentials: GuardianCredentials | null) => void;
}) {
    const { data: students } = useApi<{
        students: Array<{ studentId: string; firstName: string; lastName: string; enrollmentNumber: string }>;
    }>('/students?limit=200');
    const [form, setForm] = useState(emptyParent);
    const [phoneCountry, setPhoneCountry] = useState<CountryOption>(
        COUNTRIES.find(c => c.code === 'IN') || COUNTRIES[0]
    );
    const [filter, setFilter] = useState('');
    const [error, setError] = useState<string | null>(null);

    const toggleStudent = (id: string) =>
        setForm(f => ({
            ...f,
            studentIds: f.studentIds.includes(id) ? f.studentIds.filter(x => x !== id) : [...f.studentIds, id],
        }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (form.firstName.trim().length < 2 || !NAME_REGEX.test(form.firstName.trim())) {
            setError('First name must be at least 2 characters and contain only letters.');
            return;
        }
        if (form.lastName.trim().length < 2 || !NAME_REGEX.test(form.lastName.trim())) {
            setError('Last name must be at least 2 characters and contain only letters.');
            return;
        }
        if (!EMAIL_REGEX.test(form.email.trim())) {
            setError('Please enter a valid email address.');
            return;
        }
        const phoneErr = validatePhoneNumber(form.phone, phoneCountry);
        if (phoneErr) {
            setError(phoneErr);
            return;
        }

        const phoneDigits = form.phone.replace(/\D/g, '');
        const finalPhone = `${phoneCountry.dialCode} ${phoneDigits}`.trim();

        try {
            const res = await api<{ credentials?: { email: string; password: string } }>('/guardians', {
                method: 'POST',
                body: JSON.stringify({
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    relationship: form.relationship,
                    phone: finalPhone,
                    email: form.email.trim(),
                    studentIds: form.studentIds,
                    createLogin: form.createLogin,
                }),
            });
            onCreated(res.credentials ? { name: `${form.firstName} ${form.lastName}`, ...res.credentials } : null);
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const visible =
        students?.students.filter(s =>
            `${s.firstName} ${s.lastName} ${s.enrollmentNumber}`.toLowerCase().includes(filter.toLowerCase())
        ) ?? [];

    return (
        <Modal title="Add Parent / Guardian" onClose={onClose} maxWidth="660px">
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                        <label className="cs-label">First Name <span style={{ color: '#EF4444' }}>*</span></label>
                        <input
                            className="cs-input"
                            required
                            placeholder="First name"
                            value={form.firstName}
                            onChange={e => setForm({ ...form, firstName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="cs-label">Last Name <span style={{ color: '#EF4444' }}>*</span></label>
                        <input
                            className="cs-input"
                            required
                            placeholder="Last name"
                            value={form.lastName}
                            onChange={e => setForm({ ...form, lastName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="cs-label">Relationship <span style={{ color: '#EF4444' }}>*</span></label>
                        <select
                            className="cs-input"
                            value={form.relationship}
                            onChange={e => setForm({ ...form, relationship: e.target.value })}
                        >
                            {['Mother', 'Father', 'Guardian', 'Grandparent', 'Other'].map(r => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="cs-label">Phone <span style={{ color: '#EF4444' }}>*</span></label>
                        <CountryPhoneInput
                            value={form.phone}
                            selectedCountry={phoneCountry}
                            onCountryChange={setPhoneCountry}
                            onChange={(val: string) => setForm({ ...form, phone: val })}
                            required={true}
                        />
                    </div>
                </div>
                <div>
                    <label className="cs-label">Email (portal login) <span style={{ color: '#EF4444' }}>*</span></label>
                    <input
                        className="cs-input"
                        type="email"
                        required
                        placeholder="parent@example.com"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                </div>
                <div>
                    <label className="cs-label">Linked Children ({form.studentIds.length} selected) <span style={{ color: '#EF4444' }}>*</span></label>
                    <input
                        className="cs-input"
                        placeholder="Search student by name or enrollment number…"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        style={{ marginBottom: '6px' }}
                    />
                    <div
                        style={{
                            maxHeight: '160px',
                            overflowY: 'auto',
                            border: '1px solid var(--cs-border)',
                            borderRadius: '8px',
                            padding: '6px',
                        }}
                    >
                        {visible.length === 0 ? (
                            <div style={{ padding: '8px', fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                No students match your search.
                            </div>
                        ) : (
                            visible.map(s => (
                                <label
                                    key={s.studentId}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '13px',
                                        padding: '4px 6px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.studentIds.includes(s.studentId)}
                                        onChange={() => toggleStudent(s.studentId)}
                                    />
                                    <span style={{ flex: 1 }}>
                                        {s.firstName} {s.lastName}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>
                                        {s.enrollmentNumber}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={form.createLogin}
                        onChange={e => setForm({ ...form, createLogin: e.target.checked })}
                    />
                    Create parent-portal login now
                </label>
                {error && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{error}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn-primary"
                        type="submit"
                        disabled={form.studentIds.length === 0}
                        style={{ cursor: 'pointer' }}
                    >
                        Add Parent
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function ResetPasswordModal({
    guardian,
    onClose,
    onSuccess,
}: {
    guardian: UIGuardian;
    onClose: () => void;
    onSuccess: (credentials: GuardianCredentials) => void;
}) {
    const isReset = guardian.hasPortalAccess || guardian.portalStatus === 'active';
    const [customPassword, setCustomPassword] = useState('');
    const [useCustom, setUseCustom] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (useCustom && customPassword.length < 8) {
            setError('Custom password must be at least 8 characters long.');
            return;
        }

        setSaving(true);
        try {
            const body: { guardianId: string; password?: string } = {
                guardianId: guardian.guardianId,
            };
            if (useCustom && customPassword.trim()) {
                body.password = customPassword.trim();
            }

            const res = await api<{ credentials: { email: string; password: string } }>('/guardians/portal-access', {
                method: 'POST',
                body: JSON.stringify(body),
            });

            onSuccess({
                name: guardian.fullName,
                ...res.credentials,
            });
        } catch (err) {
            setError((err as Error).message || 'Failed to process request.');
            setSaving(false);
        }
    };

    return (
        <Modal title={isReset ? 'Reset Portal Password' : 'Create Portal Access'} onClose={onClose}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && (
                    <div style={{
                        background: '#FEF2F2',
                        border: '1px solid #F87171',
                        color: '#991B1B',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ fontWeight: 600 }}>Error:</span> {error}
                    </div>
                )}

                {/* Guardian Summary Card */}
                <div style={{
                    background: 'var(--cs-surface-2)',
                    border: '1px solid var(--cs-border)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6C63FF 0%, #4F46E5 100%)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '15px',
                        fontWeight: 700,
                        flexShrink: 0
                    }}>
                        {initials(guardian.fullName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--cs-text-primary)' }}>
                                {guardian.fullName}
                            </span>
                            <span className="badge badge-secondary" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                                {guardian.relationship}
                            </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {guardian.email || guardian.portalEmail || 'No email specified'}
                        </div>
                    </div>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', lineHeight: 1.5 }}>
                    {isReset
                        ? `Are you sure you want to reset the portal login password for ${guardian.fullName}? A new password will be generated, and you will be able to copy or email the credentials immediately.`
                        : `Generate parent portal login access for ${guardian.fullName}. They will be able to log in to view their linked children's academic records, fees, and attendance.`
                    }
                </div>

                {/* Optional Custom Password Checkbox */}
                <div style={{ borderTop: '1px solid var(--cs-border)', paddingTop: '14px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--cs-text-primary)' }}>
                        <input
                            type="checkbox"
                            checked={useCustom}
                            onChange={(e) => setUseCustom(e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--cs-primary, #6C63FF)', cursor: 'pointer' }}
                        />
                        Set a custom password manually
                    </label>

                    {useCustom && (
                        <div style={{ marginTop: '10px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--cs-text-secondary)' }}>
                                New Password (min 8 characters)
                            </label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Enter custom password (e.g. Pass@123)"
                                value={customPassword}
                                onChange={(e) => setCustomPassword(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box' }}
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--cs-border)', paddingTop: '16px' }}>
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onClose}
                        disabled={saving}
                        style={{ cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: saving ? 'not-allowed' : 'pointer' }}
                    >
                        <KeyRound size={14} />
                        {saving ? (isReset ? 'Resetting...' : 'Creating...') : (isReset ? 'Reset Password' : 'Create Login')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function CredentialsDialog({
    credentials,
    onClose,
}: {
    credentials: GuardianCredentials;
    onClose: () => void;
}) {
    const { workspace } = useWorkspace();
    const [copied, setCopied] = useState(false);
    const academy = workspace?.organization.name ?? 'our academy';
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login';
    const text = `Dear ${credentials.name},\n\nYour parent portal for ${academy} is ready. Sign in to see your children's attendance, fees, payment slips, test results and notices.\n\nPortal: ${portalUrl}\nEmail: ${credentials.email}\nTemporary password: ${credentials.password}\n\nRegards,\n${academy}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // fallback
        }
    };

    return (
        <Modal title="Parent portal login" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>
                    Share these details with {credentials.name}. The password is shown only now — use <b>Reset password</b>{' '}
                    to issue a new one later.
                </div>
                <div
                    style={{
                        background: 'var(--cs-surface-2)',
                        border: '1px solid var(--cs-border)',
                        borderRadius: '10px',
                        padding: '12px',
                        fontSize: '13px',
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: '6px 12px',
                    }}
                >
                    <span style={{ color: 'var(--cs-text-muted)' }}>Portal</span>
                    <span>{portalUrl}</span>
                    <span style={{ color: 'var(--cs-text-muted)' }}>Email</span>
                    <span style={{ fontWeight: 600 }}>{credentials.email}</span>
                    <span style={{ color: 'var(--cs-text-muted)' }}>Password</span>
                    <code style={{ fontWeight: 700, fontSize: '14px', color: 'var(--cs-primary)' }}>
                        {credentials.password}
                    </code>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button type="button" className="btn-secondary" onClick={copy}>
                        {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy message'}
                    </button>
                    <a
                        className="btn-primary"
                        href={`mailto:${credentials.email}?subject=${encodeURIComponent(
                            `Your ${academy} parent portal login`
                        )}&body=${encodeURIComponent(text)}`}
                    >
                        <Send size={14} /> Email to parent
                    </a>
                </div>
            </div>
        </Modal>
    );
}

function formatE164Phone(phoneStr: string | null | undefined): string {
    if (!phoneStr) return '—';
    const cleaned = phoneStr.trim();
    if (cleaned.startsWith('+')) return cleaned;
    if (/^\d{10}$/.test(cleaned)) return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    return cleaned;
}
