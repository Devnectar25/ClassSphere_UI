'use client';
import Link from 'next/link';
import { useState } from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import BadgeList from '@/components/BadgeList';
import { Phone, Mail, Eye, KeyRound, Copy, Send } from 'lucide-react';
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

const emptyParent = { firstName: '', lastName: '', relationship: 'Mother', phone: '', email: '', studentIds: [] as string[], createLogin: true };

export default function GuardiansPage() {
    const session = useSession();
    const canManage = can(session, 'guardians.write');
    const { data: guardians, error, reload } = useApi<Guardian[]>('/guardians');
    const [adding, setAdding] = useState(false);
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

    return (
        <>
            <Topbar title="Parents & Guardians" subtitle="Parent contacts, linked children and parent-portal logins"
                action={canManage ? { label: 'Add Parent', onClick: () => setAdding(true) } : undefined} />
            <div className="page-body">
                {message && <div className="cs-card" style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--cs-danger)' }}>{message}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                    {stats.map(s => (
                        <div key={s.label} className="cs-card" style={{ padding: '16px' }}>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
                {!guardians ? <PageState error={error} /> : (
                    <div className="cs-card">
                        <table className="cs-table">
                            <thead>
                                <tr>
                                    <th>Parent</th>
                                    <th>Contact</th>
                                    <th>Children</th>
                                    <th>Payer</th>
                                    <th>Portal Login</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {guardians.map(g => {
                                    const name = `${g.firstName} ${g.lastName}`;
                                    return (
                                        <tr key={g.guardianId}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: '11px' }}>{initials(name)}</div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{g.relationship}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}><Phone size={10} style={{ marginRight: 4 }} />{g.phone}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', wordBreak: 'break-all' }}><Mail size={10} style={{ marginRight: 4 }} />{g.email}</div>
                                            </td>
                                            <td><BadgeList value={g.students.map(s => s.name).join(', ') || null} /></td>
                                            <td>
                                                <span className={`badge ${g.payerStatus === 'Active payer' ? 'badge-success' : g.payerStatus === 'Overdue' ? 'badge-danger' : 'badge-warning'}`}>{g.payerStatus}</span>
                                            </td>
                                            <td>
                                                {g.hasPortalAccess ? (
                                                    <>
                                                        <div style={{ fontSize: '12px', wordBreak: 'break-all' }}>{g.portalEmail}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>
                                                            {g.portalLastLogin ? `Last sign-in ${formatDate(g.portalLastLogin)}` : 'Not signed in yet'}
                                                        </div>
                                                    </>
                                                ) : <span className="badge badge-secondary">No login</span>}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                    {canManage && (
                                                        <button className="btn-secondary cell-nowrap" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => issueLogin(g)}>
                                                            <KeyRound size={12} /> {g.hasPortalAccess ? 'Reset password' : 'Create login'}
                                                        </button>
                                                    )}
                                                    {can(session, 'portal.read') && (
                                                        <Link href={`/portal?guardianId=${g.guardianId}`} className="btn-ghost" title="Preview parent portal" style={{ padding: '4px 8px' }}>
                                                            <Eye size={13} />
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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
                <button className="btn-primary" type="submit" disabled={form.studentIds.length === 0} style={{ alignSelf: 'flex-end' }}>Add Parent</button>
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
