'use client';
import { useState } from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import BadgeList from '@/components/BadgeList';
import { Phone, Mail, KeyRound, Copy, Send, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, useApi, formatDate, initials } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';

interface Guardian {
    guardianId: string;
    firstName: string;
    lastName: string;
    relationship: string;
    phone: string;
    email: string;
    isPrimary: boolean;
    hasPortalAccess: boolean;
    portalEmail: string | null;
    portalLastLogin: string | null;
    payerStatus: string;
    students: Array<{ studentId: string; name: string }>;
}

interface Credentials { name: string; email: string; password: string }

const PAGE_SIZE = 7;

const emptyParent = { firstName: '', lastName: '', relationship: 'Mother', phone: '', email: '', studentIds: [] as string[], createLogin: true };

export default function GuardiansPage() {
    const session = useSession();
    const canManage = can(session, 'guardians.write');
    const { data: guardians, error, reload } = useApi<Guardian[]>('/guardians');
    const [adding, setAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const [credentials, setCredentials] = useState<Credentials | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const stats = [
        { label: 'Parents / Guardians', value: guardians?.length ?? 0, color: '#6C63FF' },
        { label: 'Portal logins', value: guardians?.filter(g => g.hasPortalAccess).length ?? 0, color: '#10B981' },
        { label: 'With 2+ children', value: guardians?.filter(g => g.students.length > 1).length ?? 0, color: '#F59E0B' },
    ];

    const issueLogin = async (g: Guardian) => {
        const verb = g.hasPortalAccess ? 'Reset the password' : 'Create a portal login';
        if (!confirm(`${verb} for ${g.firstName} ${g.lastName}?`)) return;
        try {
            const res = await api<{ credentials: { email: string; password: string } }>('/guardians/portal-access', {
                method: 'POST', body: JSON.stringify({ guardianId: g.guardianId }),
            });
            setCredentials({ name: `${g.firstName} ${g.lastName}`, ...res.credentials });
            reload();
        } catch (err) {
            setMessage((err as Error).message);
        }
    };

    const filteredGuardians = guardians?.filter(g => {
        if (!search) return true;
        const q = search.toLowerCase();
        const name = `${g.firstName} ${g.lastName}`.toLowerCase();
        const email = (g.email || '').toLowerCase();
        const phone = (g.phone || '').toLowerCase();
        const children = g.students.map(s => s.name).join(' ').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || children.includes(q);
    }) ?? [];

    const total = filteredGuardians.length;
    const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
    const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
    const paginatedGuardians = filteredGuardians.slice(offset, offset + PAGE_SIZE);

    const getVisiblePages = (curr: number, totalPagesCount: number): (number | string)[] => {
        if (totalPagesCount <= 7) return Array.from({ length: totalPagesCount }, (_, i) => i + 1);
        const pages: (number | string)[] = [1];
        if (curr > 3) pages.push('...');
        const start = Math.max(2, curr - 1);
        const end = Math.min(totalPagesCount - 1, curr + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (curr < totalPagesCount - 2) pages.push('...');
        pages.push(totalPagesCount);
        return pages;
    };

    return (
        <>
            <Topbar title="Parents & Guardians" subtitle="Parent contacts, linked children and parent-portal logins" />
            <div className="page-body" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                {message && <div className="cs-card" style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--cs-danger)' }}>{message}</div>}

                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', width: '100%' }}>
                    {stats.map(s => (
                        <div key={s.label} className="cs-card" style={{ padding: '16px' }}>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {!guardians ? <PageState error={error} /> : (
                    <div className="cs-card" style={{ width: '100%', overflow: 'hidden' }}>
                        {/* Toolbar below the cards */}
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid var(--cs-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                            flexWrap: 'wrap'
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)',
                                borderRadius: '10px', padding: '0 12px', height: '34px', boxSizing: 'border-box',
                                width: '300px'
                            }}>
                                <Search size={14} color="var(--cs-text-muted)" style={{ flexShrink: 0 }} />
                                <input
                                    placeholder="Search by parent, child, or email..."
                                    style={{
                                        background: 'none', border: 'none', outline: 'none',
                                        padding: 0, height: '100%', fontSize: '13px', width: '100%',
                                        color: 'var(--cs-text-primary)'
                                    }}
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setOffset(0); }}
                                />
                            </div>

                            {canManage && (
                                <button
                                    className="btn-primary"
                                    onClick={() => setAdding(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        whiteSpace: 'nowrap',
                                        padding: '7px 16px',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        marginLeft: 'auto'
                                    }}
                                >
                                    <Plus size={15} />
                                    Add Parent
                                </button>
                            )}
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto', width: '100%' }}>
                            <table className="cs-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '22%', paddingLeft: '24px' }}>Parent</th>
                                        <th style={{ width: '22%' }}>Contact</th>
                                        <th style={{ width: '20%' }}>Children</th>
                                        <th style={{ width: '12%' }}>Payer</th>
                                        <th style={{ width: '12%' }}>Portal Login</th>
                                        <th style={{ width: '12%', textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGuardians.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--cs-text-muted)' }}>
                                                {search ? 'No parents match your search.' : 'No parents registered yet.'}
                                            </td>
                                        </tr>
                                    ) : paginatedGuardians.map(g => {
                                        const name = `${g.firstName} ${g.lastName}`;
                                        return (
                                            <tr key={g.guardianId}>
                                                <td style={{ paddingLeft: '24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: '11px', flexShrink: 0 }}>{initials(name)}</div>
                                                        <div style={{ overflow: 'hidden' }}>
                                                            <div style={{ fontWeight: 600, fontSize: '13px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{name}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{g.relationship}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        <Phone size={10} style={{ marginRight: 4, display: 'inline' }} />{g.phone}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        <Mail size={10} style={{ marginRight: 4, display: 'inline' }} />{g.email}
                                                    </div>
                                                </td>
                                                <td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <BadgeList value={g.students.map(s => s.name).join(', ') || null} />
                                                </td>
                                                <td>
                                                    <span className={`badge ${g.payerStatus === 'Active payer' ? 'badge-success' : g.payerStatus === 'Overdue' ? 'badge-danger' : 'badge-warning'}`}>
                                                        {g.payerStatus}
                                                    </span>
                                                </td>
                                                <td>
                                                    {g.hasPortalAccess ? (
                                                        <div style={{ overflow: 'hidden' }}>
                                                            <div style={{ fontSize: '12px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{g.portalEmail}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', whiteSpace: 'nowrap' }}>
                                                                {g.portalLastLogin ? `Last sign-in ${formatDate(g.portalLastLogin)}` : 'Not signed in yet'}
                                                            </div>
                                                        </div>
                                                    ) : <span className="badge badge-secondary">No login</span>}
                                                </td>
                                                <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                        {canManage && (
                                                            <button className="btn-secondary cell-nowrap" style={{ padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }} onClick={() => issueLogin(g)}>
                                                                <KeyRound size={12} /> {g.hasPortalAccess ? 'Reset' : 'Login'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>
                                Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + paginatedGuardians.length, total)} of {total} parents (7 per page)
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    className="btn-ghost"
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid var(--cs-border)',
                                        borderRadius: '8px',
                                        cursor: offset === 0 ? 'not-allowed' : 'pointer',
                                        opacity: offset === 0 ? 0.4 : 1
                                    }}
                                    disabled={offset === 0}
                                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                                >
                                    <ChevronLeft size={16} /> Previous
                                </button>

                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    {getVisiblePages(currentPage, totalPages).map((p, idx) => {
                                        if (p === '...') {
                                            return <span key={`ellipsis-${idx}`} style={{ padding: '0 6px', color: 'var(--cs-text-muted)', fontSize: '13px' }}>...</span>;
                                        }
                                        const pageNum = Number(p);
                                        const isCurrent = pageNum === currentPage;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setOffset((pageNum - 1) * PAGE_SIZE)}
                                                style={{
                                                    minWidth: '32px',
                                                    height: '32px',
                                                    padding: '0 8px',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    fontWeight: isCurrent ? 700 : 500,
                                                    cursor: 'pointer',
                                                    border: '1px solid',
                                                    background: isCurrent ? 'var(--cs-primary, #6C63FF)' : 'transparent',
                                                    borderColor: isCurrent ? 'var(--cs-primary, #6C63FF)' : 'var(--cs-border)',
                                                    color: isCurrent ? '#ffffff' : 'var(--cs-text-secondary)',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    className="btn-ghost"
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid var(--cs-border)',
                                        borderRadius: '8px',
                                        cursor: offset + PAGE_SIZE >= total ? 'not-allowed' : 'pointer',
                                        opacity: offset + PAGE_SIZE >= total ? 0.4 : 1
                                    }}
                                    disabled={offset + PAGE_SIZE >= total}
                                    onClick={() => setOffset(offset + PAGE_SIZE)}
                                >
                                    Next <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {adding && (
                <AddParent onClose={() => setAdding(false)} onCreated={(creds) => { setAdding(false); reload(); if (creds) setCredentials(creds); }} />
            )}
            {credentials && <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />}
        </>
    );
}

function AddParent({ onClose, onCreated }: { onClose: () => void; onCreated: (credentials: Credentials | null) => void }) {
    const { data: students } = useApi<{ students: Array<{ studentId: string; firstName: string; lastName: string; enrollmentNumber: string }> }>('/students?limit=200');
    const [form, setForm] = useState(emptyParent);
    const [filter, setFilter] = useState('');
    const [error, setError] = useState<string | null>(null);

    const toggleStudent = (id: string) =>
        setForm(f => ({ ...f, studentIds: f.studentIds.includes(id) ? f.studentIds.filter(x => x !== id) : [...f.studentIds, id] }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await api<{ credentials?: { email: string; password: string } }>('/guardians', { method: 'POST', body: JSON.stringify(form) });
            onCreated(res.credentials ? { name: `${form.firstName} ${form.lastName}`, ...res.credentials } : null);
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const visible = students?.students.filter(s => `${s.firstName} ${s.lastName} ${s.enrollmentNumber}`.toLowerCase().includes(filter.toLowerCase())) ?? [];

    return (
        <Modal title="Add Parent / Guardian" onClose={onClose}>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><label className="cs-label">First Name</label><input className="cs-input" required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
                    <div><label className="cs-label">Last Name</label><input className="cs-input" required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
                    <div>
                        <label className="cs-label">Relationship</label>
                        <select className="cs-input" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })}>
                            {['Mother', 'Father', 'Guardian', 'Grandparent', 'Other'].map(r => <option key={r}>{r}</option>)}
                        </select>
                    </div>
                    <div><label className="cs-label">Phone</label><input className="cs-input" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div><label className="cs-label">Email (portal login)</label><input className="cs-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div>
                    <label className="cs-label">Children ({form.studentIds.length} selected)</label>
                    <input className="cs-input" placeholder="Search students…" value={filter} onChange={e => setFilter(e.target.value)} style={{ marginBottom: '6px' }} />
                    <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--cs-border)', borderRadius: '8px', padding: '6px' }}>
                        {visible.map(s => (
                            <label key={s.studentId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '4px 6px' }}>
                                <input type="checkbox" checked={form.studentIds.includes(s.studentId)} onChange={() => toggleStudent(s.studentId)} />
                                <span style={{ flex: 1 }}>{s.firstName} {s.lastName}</span>
                                <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{s.enrollmentNumber}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <input type="checkbox" checked={form.createLogin} onChange={e => setForm({ ...form, createLogin: e.target.checked })} />
                    Create parent-portal login now
                </label>
                {error && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{error}</div>}
                <button className="btn-primary" type="submit" disabled={form.studentIds.length === 0} style={{ alignSelf: 'flex-end', cursor: 'pointer' }}>Add Parent</button>
            </form>
        </Modal>
    );
}

function CredentialsDialog({ credentials, onClose }: { credentials: Credentials; onClose: () => void }) {
    const { workspace } = useWorkspace();
    const [copied, setCopied] = useState(false);
    const academy = workspace?.organization.name ?? 'our academy';
    const portalUrl = `${window.location.origin}/login`;
    const text = `Dear ${credentials.name},\n\nYour parent portal for ${academy} is ready. Sign in to see your children's attendance, fees, payment slips, test results and notices.\n\nPortal: ${portalUrl}\nEmail: ${credentials.email}\nTemporary password: ${credentials.password}\n\nRegards,\n${academy}`;

    const copy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
    };

    return (
        <Modal title="Parent portal login" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>
                    Share these details with {credentials.name}. The password is shown only now — use <b>Reset password</b> to issue a new one later.
                </div>
                <div style={{ background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', borderRadius: '10px', padding: '12px', fontSize: '13px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px' }}>
                    <span style={{ color: 'var(--cs-text-muted)' }}>Portal</span><span>{portalUrl}</span>
                    <span style={{ color: 'var(--cs-text-muted)' }}>Email</span><span style={{ fontWeight: 600 }}>{credentials.email}</span>
                    <span style={{ color: 'var(--cs-text-muted)' }}>Password</span><code style={{ fontWeight: 700, fontSize: '14px' }}>{credentials.password}</code>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={copy}><Copy size={14} /> {copied ? 'Copied' : 'Copy message'}</button>
                    <a className="btn-primary" href={`mailto:${credentials.email}?subject=${encodeURIComponent(`Your ${academy} parent portal login`)}&body=${encodeURIComponent(text)}`}>
                        <Send size={14} /> Email to parent
                    </a>
                </div>
            </div>
        </Modal>
    );
}
