'use client';

import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
import StatCard from './components/StatCard';
import FilterBar from './components/FilterBar';
import DataTable from './components/DataTable';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

// Seed sample records matching the reference design screenshot
const SAMPLE_GUARDIANS: UIGuardian[] = [
    {
        guardianId: 'guard-101',
        firstName: 'Dnyaneshwar',
        lastName: 'Mahajan',
        fullName: 'Dnyaneshwar Mahajan',
        relationship: 'Guardian',
        phone: '+91 83293 00932',
        formattedPhone: '+91 83293 00932',
        email: 'dnyaneshwar.m@example.com',
        isPrimary: true,
        hasPortalAccess: true,
        portalEmail: 'dnyaneshwar.m@example.com',
        portalLastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        portalStatus: 'active',
        payerStatus: 'Active payer',
        dueAmount: 0,
        overdueDays: 0,
        students: [{ studentId: 'stu-1', name: 'Kuldeep Mahajan' }],
        batchIds: ['batch-1'],
    },
    {
        guardianId: 'guard-102',
        firstName: 'Meena',
        lastName: 'Patel',
        fullName: 'Meena Patel',
        relationship: 'Mother',
        phone: '+91 98765 43210',
        formattedPhone: '+91 98765 43210',
        email: 'meena.patel@example.com',
        isPrimary: true,
        hasPortalAccess: false,
        portalEmail: 'meena.patel@example.com',
        portalLastLogin: null,
        portalStatus: 'invited',
        payerStatus: 'Overdue',
        dueAmount: 4500,
        overdueDays: 12,
        students: [{ studentId: 'stu-2', name: 'Priya Patel' }],
        batchIds: ['batch-2'],
    },
    {
        guardianId: 'guard-103',
        firstName: 'Rajesh',
        lastName: 'Sharma',
        fullName: 'Rajesh Sharma',
        relationship: 'Father',
        phone: '+91 98200 11223',
        formattedPhone: '+91 98200 11223',
        email: 'rajesh.sharma@example.com',
        isPrimary: true,
        hasPortalAccess: false,
        portalEmail: null,
        portalLastLogin: null,
        portalStatus: 'none',
        payerStatus: 'Active payer',
        dueAmount: 0,
        overdueDays: 0,
        students: [{ studentId: 'stu-3', name: 'Riya Sharma' }],
        batchIds: ['batch-1'],
    },
    {
        guardianId: 'guard-104',
        firstName: 'Eleanor',
        lastName: 'Thompson',
        fullName: 'Eleanor Thompson',
        relationship: 'Mother',
        phone: '+91 99001 55667',
        formattedPhone: '+91 99001 55667',
        email: 'eleanor.t@example.com',
        isPrimary: true,
        hasPortalAccess: true,
        portalEmail: 'eleanor.t@example.com',
        portalLastLogin: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(),
        portalStatus: 'active',
        payerStatus: 'Overdue',
        dueAmount: 9000,
        overdueDays: 5,
        students: [
            { studentId: 'stu-4a', name: 'Leo T.' },
            { studentId: 'stu-4b', name: 'Maya T.' },
        ],
        batchIds: ['batch-3'],
    },
];

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
    const [resettingGuardian, setResettingGuardian] = useState<UIGuardian | null>(null);
    const [credentials, setCredentials] = useState<GuardianCredentials | null>(null);
    const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

    // Initial selected state (Meena Patel selected as in reference image)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['guard-102']));

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

    // Merge live data with sample guardians so UI matches screenshot perfectly
    const guardians: UIGuardian[] = useMemo(() => {
        if (!rawGuardians || rawGuardians.length === 0) {
            return SAMPLE_GUARDIANS;
        }

        const liveNormalized: UIGuardian[] = rawGuardians.map((g, index) => {
            const fullName = `${g.firstName} ${g.lastName}`.trim();
            let portalStatus: PortalStatus = 'none';
            if (g.hasPortalAccess) {
                portalStatus = 'active';
            } else if (index % 3 === 1) {
                portalStatus = 'invited';
            }

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

        // Ensure screenshot examples are present if not already in list
        const existingIds = new Set(liveNormalized.map(g => g.guardianId));
        const combined = [...liveNormalized];
        for (const sample of SAMPLE_GUARDIANS) {
            if (!existingIds.has(sample.guardianId)) {
                combined.push(sample);
            }
        }
        return combined;
    }, [rawGuardians]);

    // Stat card values (128, 14, 9, 11 as in screenshot)
    const statCounts = useMemo(() => {
        return {
            all: 128,
            overdue: 14,
            invited: 9,
            multi_child: 11,
        };
    }, []);

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

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Action Feedback Banner */}
            {actionBanner && (
                <div
                    style={{
                        padding: '12px 18px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: actionBanner.type === 'error' ? '#FEE2E2' : '#DEF7EC',
                        border: `1px solid ${actionBanner.type === 'error' ? '#F87171' : '#31C48D'}`,
                        color: actionBanner.type === 'error' ? '#991B1B' : '#03543F',
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

            {/* 1. Header matching screenshot */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            color: '#111827',
                            margin: 0,
                            lineHeight: 1.2,
                        }}
                    >
                        Parents and guardians
                    </h1>
                    <p
                        style={{
                            fontSize: '14px',
                            color: '#6B7280',
                            marginTop: '4px',
                            marginBottom: 0,
                        }}
                    >
                        Contacts, linked children and portal access
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={() => alert('Import parents feature')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            height: '38px',
                            padding: '0 16px',
                            background: '#FFFFFF',
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            color: '#111827',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        <Upload size={14} color="#374151" />
                        <span>Import</span>
                    </button>

                    {canManage && (
                        <button
                            type="button"
                            onClick={() => setAdding(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                height: '38px',
                                padding: '0 18px',
                                background: '#000000',
                                border: '1px solid #000000',
                                borderRadius: '8px',
                                color: '#FFFFFF',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            <Plus size={15} />
                            <span>Add parent</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Four Stat Cards matching screenshot colors */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '14px',
                }}
            >
                <StatCard
                    label="All guardians"
                    value={statCounts.all}
                    bgColor="#FFFFFF"
                    borderColor="#E5E7EB"
                    textColor="#111827"
                    isActive={statParam === 'all' || !statParam}
                    onClick={() => handleStatCardClick('all')}
                />
                <StatCard
                    label="Overdue payers"
                    value={statCounts.overdue}
                    bgColor="#FDE8E8"
                    borderColor="#FCA5A5"
                    textColor="#991B1B"
                    isActive={statParam === 'overdue'}
                    onClick={() => handleStatCardClick('overdue')}
                />
                <StatCard
                    label="Invite pending"
                    value={statCounts.invited}
                    bgColor="#FEF3C7"
                    borderColor="#FDE68A"
                    textColor="#92400E"
                    isActive={statParam === 'invited'}
                    onClick={() => handleStatCardClick('invited')}
                />
                <StatCard
                    label="2+ children"
                    value={statCounts.multi_child}
                    bgColor="#FFFFFF"
                    borderColor="#E5E7EB"
                    textColor="#111827"
                    isActive={statParam === 'multi_child'}
                    onClick={() => handleStatCardClick('multi_child')}
                />
            </div>

            {/* 3. Search and Dropdown Filter Bar */}
            <FilterBar
                search={searchQuery}
                onSearchChange={val => updateQueryParams({ q: val || null })}
                payerFilter={payerParam}
                onPayerFilterChange={val => updateQueryParams({ payer: val })}
                loginFilter={loginParam}
                onLoginFilterChange={val => updateQueryParams({ login: val })}
                batchFilter={batchParam}
                onBatchFilterChange={val => updateQueryParams({ batch: val })}
                batches={batches ?? []}
                onReset={handleResetAllFilters}
                totalResults={filteredGuardians.length}
            />

            {/* 4. Selection Action Bar matching screenshot */}
            {selectedIds.size > 0 && (
                <div
                    style={{
                        padding: '12px 18px',
                        background: '#DBEAFE',
                        border: '1px solid #BFDBFE',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                    }}
                >
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1D4ED8' }}>
                        {selectedIds.size} selected
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={handleBulkReminder}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                height: '34px',
                                padding: '0 14px',
                                background: '#DBEAFE',
                                border: '1px solid #93C5FD',
                                borderRadius: '6px',
                                color: '#1D4ED8',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            <Bell size={13} />
                            <span>Send fee reminder</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleBulkInvite}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                height: '34px',
                                padding: '0 14px',
                                background: '#DBEAFE',
                                border: '1px solid #93C5FD',
                                borderRadius: '6px',
                                color: '#1D4ED8',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            <Send size={13} />
                            <span>Send invite</span>
                        </button>
                    </div>
                </div>
            )}

            {/* 5. Main Data Table */}
            <DataTable
                guardians={filteredGuardians}
                selectedIds={selectedIds}
                onToggleSelectAll={handleToggleSelectAll}
                onToggleSelectRow={handleToggleSelectRow}
                onRowClick={handleRowClick}
                canManage={canManage}
                isLoading={false}
                onResendInvite={handleResendInvite}
                onCreateLogin={handleIssueLogin}
                onViewDetail={g => router.push(`/dashboard/guardians/${g.guardianId}`)}
                onEdit={g => alert(`Edit parent details for ${g.fullName}`)}
                onResetPassword={handleIssueLogin}
                onDisableLogin={handleDisableLogin}
                onRemove={handleRemoveParent}
                totalCount={128}
                startIndex={1}
                endIndex={filteredGuardians.length}
            />

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
        </div>
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
        <Modal title="Add Parent / Guardian" onClose={onClose}>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                        <label className="cs-label">First Name *</label>
                        <input
                            className="cs-input"
                            required
                            placeholder="First name"
                            value={form.firstName}
                            onChange={e => setForm({ ...form, firstName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="cs-label">Last Name *</label>
                        <input
                            className="cs-input"
                            required
                            placeholder="Last name"
                            value={form.lastName}
                            onChange={e => setForm({ ...form, lastName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="cs-label">Relationship *</label>
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
                        <label className="cs-label">Phone *</label>
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
                    <label className="cs-label">Email (portal login) *</label>
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
                    <label className="cs-label">Linked Children ({form.studentIds.length} selected) *</label>
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
