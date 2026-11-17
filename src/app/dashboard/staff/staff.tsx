'use client';
import { useState } from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import BadgeList from '@/components/BadgeList';
import Modal from '@/components/Modal';
import { Mail, Phone, Shield } from 'lucide-react';
import { api, useApi, formatDate, initials } from '@/lib/api';
import { can, ROLE_LABELS, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';

interface StaffMember {
    membershipId: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: string;
    title: string | null;
    branchName: string | null;
    batches: string | null;
    isActive: boolean;
    lastLoginAt: string | null;
}

const roleColors: Record<string, string> = {
    TenantAdmin: 'badge-danger',
    BranchManager: 'badge-success',
    Finance: 'badge-warning',
    Instructor: 'badge-primary',
    Staff: 'badge-info',
};

const ROLE_HELP: Record<string, string> = {
    TenantAdmin: 'Full access to every branch, users, settings and finance',
    BranchManager: 'Runs one branch: students, attendance, billing and notices of that branch',
    Finance: 'Fees, invoices, payments and financial reports',
    Instructor: 'Batches, attendance and notices for their classes',
    Staff: 'Front office: students, guardians, attendance and notices',
};

const emptyUser = { fullName: '', email: '', phone: '', title: '', role: 'Instructor', branchId: '', password: '' };

export default function StaffPage() {
    const session = useSession();
    const { workspace } = useWorkspace();
    const { data: staff, error, reload } = useApi<StaffMember[]>('/staff');
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState(emptyUser);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const canManage = can(session, 'staff.write');

    const stats = [
        { label: 'Total Users', value: staff?.length ?? 0, color: '#6C63FF' },
        { label: 'Instructors', value: staff?.filter(s => s.role === 'Instructor').length ?? 0, color: '#10B981' },
        { label: 'Admin / Managers / Finance', value: staff?.filter(s => ['TenantAdmin', 'BranchManager', 'Finance', 'Staff'].includes(s.role)).length ?? 0, color: '#F59E0B' },
        { label: 'Inactive', value: staff?.filter(s => !s.isActive).length ?? 0, color: '#EF4444' },
    ];

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setMessage(null);
        try {
            await api('/staff', { method: 'POST', body: JSON.stringify({ ...form, branchId: form.branchId || null }) });
            setMessage(`${form.fullName} can now sign in as ${form.email} with the temporary password.`);
            setAdding(false);
            setForm(emptyUser);
            reload();
        } catch (err) {
            setMessage((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const toggleActive = async (member: StaffMember) => {
        try {
            await api('/staff', { method: 'PUT', body: JSON.stringify({ membershipId: member.membershipId, isActive: !member.isActive }) });
            reload();
        } catch (err) {
            setMessage((err as Error).message);
        }
    };

    return (
        <>
            <Topbar title="Users & Roles" subtitle="Role-based sign-ins for academy staff, per branch"
                action={canManage ? { label: 'Add User', onClick: () => setAdding(true) } : undefined} />
            <div className="page-body">
                {message && (
                    <div className="cs-card" style={{ padding: '12px 16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{message}</span>
                        <button className="btn-ghost" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => setMessage(null)}>Dismiss</button>
                    </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {stats.map(s => (
                        <div key={s.label} className="cs-card" style={{ padding: '20px' }}>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</div>
                            <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', marginTop: '2px' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
                {!staff ? <PageState error={error} /> : (
                    <div className="cs-card">
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--cs-border)' }}>
                            <div className="section-title">Academy Users</div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="cs-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Branch</th>
                                        <th>Batches</th>
                                        <th>Status</th>
                                        {canManage && <th>Access</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {staff.map(s => (
                                        <tr key={s.membershipId}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div className="avatar-placeholder" style={{ width: 34, height: 34, fontSize: '12px' }}>{initials(s.fullName)}</div>
                                                    <div>
                                                        <div className="cell-nowrap" style={{ fontWeight: 600, fontSize: '13px' }}>{s.fullName}</div>
                                                        {s.title && <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{s.title}</div>}
                                                        <div className="cell-nowrap" style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}><Mail size={10} style={{ marginRight: 4 }} />{s.email}</div>
                                                        {s.phone && <div className="cell-nowrap" style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}><Phone size={10} style={{ marginRight: 4 }} />{s.phone}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className={`badge ${roleColors[s.role] ?? 'badge-secondary'}`}><Shield size={10} /> {ROLE_LABELS[s.role] ?? s.role}</span></td>
                                            <td style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{s.branchName ?? 'All Branches'}</td>
                                            <td><BadgeList value={s.batches} className="badge-secondary" /></td>
                                            <td>
                                                <span className={`badge ${s.isActive ? 'badge-success' : 'badge-secondary'}`}>{s.isActive ? 'active' : 'inactive'}</span>
                                                <div className="cell-nowrap" style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>Last login {formatDate(s.lastLoginAt)}</div>
                                            </td>
                                            {canManage && (
                                                <td>
                                                    {s.email !== session?.user.email && (
                                                        <button className="btn-ghost cell-nowrap" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => toggleActive(s)}>
                                                            {s.isActive ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {adding && (
                <Modal title="Add Academy User" onClose={() => setAdding(false)}>
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Full Name</label>
                                <input className="cs-input" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Job Title</label>
                                <input className="cs-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Email (sign-in)</label>
                                <input className="cs-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Phone</label>
                                <input className="cs-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Role</label>
                                <select className="cs-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    {Object.keys(ROLE_HELP).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">Branch</label>
                                <select className="cs-input" value={form.branchId} required={form.role === 'BranchManager'}
                                    onChange={e => setForm({ ...form, branchId: e.target.value })}>
                                    <option value="">All branches</option>
                                    {workspace?.branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>{ROLE_HELP[form.role]}</div>
                        <div>
                            <label className="cs-label">Temporary Password (min. 8 characters)</label>
                            <input className="cs-input" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                        </div>
                        <button className="btn-primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-end' }}>
                            {busy ? 'Creating…' : 'Create User'}
                        </button>
                    </form>
                </Modal>
            )}
        </>
    );
}
