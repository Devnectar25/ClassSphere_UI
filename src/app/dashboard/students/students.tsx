'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import BadgeList from '@/components/BadgeList';
import { useState } from 'react';
import { Search, Phone, Users, UserCheck, UserX, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, useApi, formatDate, initials } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';

interface Student {
    studentId: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    enrollmentNumber: string;
    status: string;
    batches: string | null;
    branchName: string | null;
    guardianName: string | null;
    feeStatus: string;
    createdAt: string;
}

interface StudentSearch {
    total: number;
    statusCounts: Record<string, number>;
    students: Student[];
}

const PAGE_SIZE = 50;

const statusConfig: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'badge-success' },
    'on-hold': { label: 'On-Hold', cls: 'badge-warning' },
    inquiry: { label: 'Inquiry', cls: 'badge-info' },
    completed: { label: 'Completed', cls: 'badge-secondary' },
    withdrawn: { label: 'Withdrawn', cls: 'badge-danger' },
};
const feesConfig: Record<string, { label: string; cls: string }> = {
    paid: { label: 'Paid', cls: 'badge-success' },
    overdue: { label: 'Overdue', cls: 'badge-danger' },
    pending: { label: 'Pending', cls: 'badge-warning' },
    none: { label: '—', cls: 'badge-secondary' },
};

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', batchId: '', branchId: '' };

export default function StudentsPage() {
    const session = useSession();
    const { workspace } = useWorkspace();
    const branchScoped = !!session?.session.branchId;
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [offset, setOffset] = useState(0);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (search) query.set('q', search);
    if (statusFilter !== 'all') query.set('status', statusFilter);
    const { data, error, reload } = useApi<StudentSearch>(`/students?${query}`);
    const { data: batches } = useApi<Array<{ batchId: string; name: string }>>(showAdd ? '/batches' : null);

    const counts = data?.statusCounts ?? {};
    const totalStudents = Object.values(counts).reduce((a, b) => a + b, 0);
    const stats = [
        { label: 'Total', value: totalStudents, icon: Users, color: '#6C63FF' },
        { label: 'Active', value: counts.active ?? 0, icon: UserCheck, color: '#10B981' },
        { label: 'On Hold', value: counts['on-hold'] ?? 0, icon: Clock, color: '#F59E0B' },
        { label: 'Withdrawn', value: counts.withdrawn ?? 0, icon: UserX, color: '#EF4444' },
    ];

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            await api('/students', { method: 'POST', body: JSON.stringify({ ...form, batchId: form.batchId || undefined, branchId: form.branchId || session?.selectedBranchId || undefined }) });
            setShowAdd(false);
            setForm(emptyForm);
            reload();
        } catch (err) {
            setFormError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Topbar title="Students" subtitle="Manage student profiles, enrollments, and status" action={can(session, 'students.write') ? { label: 'Add Student', onClick: () => setShowAdd(true) } : undefined} />
            <div className="page-body">

                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {stats.map(s => (
                        <div key={s.label} className="cs-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <s.icon size={20} color={s.color} />
                            </div>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--cs-text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</div>
                                <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{s.label} Students</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table card */}
                <div className="cs-card">
                    {/* Toolbar */}
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', borderRadius: '10px', padding: '8px 14px', flex: '1', minWidth: '200px', maxWidth: '340px' }}>
                            <Search size={15} color="var(--cs-text-muted)" />
                            <input className="cs-input" placeholder="Search by name, ID or email..." style={{ background: 'none', border: 'none', padding: 0, boxShadow: 'none' }} value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }} />
                        </div>

                        {/* Status filter pills */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {['all', 'active', 'on-hold', 'inquiry', 'completed', 'withdrawn'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setStatusFilter(s); setOffset(0); }}
                                    style={{
                                        padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                        cursor: 'pointer', border: '1px solid',
                                        background: statusFilter === s ? 'rgba(108,99,255,0.15)' : 'transparent',
                                        borderColor: statusFilter === s ? 'rgba(108,99,255,0.4)' : 'var(--cs-border)',
                                        color: statusFilter === s ? '#8B85FF' : 'var(--cs-text-muted)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {s === 'all' ? 'All' : statusConfig[s].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!data ? <PageState error={error} /> : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="cs-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Branch</th>
                                        <th>Batch</th>
                                        <th>Guardian</th>
                                        <th>Joined</th>
                                        <th>Status</th>
                                        <th>Fees</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.students.map(s => {
                                        const name = `${s.firstName} ${s.lastName}`;
                                        return (
                                            <tr key={s.studentId}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div className="avatar-placeholder" style={{ width: 34, height: 34, fontSize: '12px', flexShrink: 0 }}>
                                                            {initials(name)}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{name}</div>
                                                            <code style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{s.enrollmentNumber}</code>
                                                            {s.phone && (
                                                                <div className="cell-nowrap" style={{ fontSize: '11px', color: 'var(--cs-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Phone size={10} /> {s.phone}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{s.branchName ?? '—'}</td>
                                                <td><BadgeList value={s.batches} /></td>
                                                <td style={{ color: 'var(--cs-text-secondary)', fontSize: '13px' }}>{s.guardianName ?? '—'}</td>
                                                <td className="cell-nowrap" style={{ color: 'var(--cs-text-muted)', fontSize: '12px' }}>{formatDate(s.createdAt)}</td>
                                                <td><span className={`badge ${statusConfig[s.status]?.cls ?? 'badge-secondary'}`}>{statusConfig[s.status]?.label ?? s.status}</span></td>
                                                <td><span className={`badge ${feesConfig[s.feeStatus]?.cls}`}>{feesConfig[s.feeStatus]?.label}</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {data && (
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>
                                Showing {data.total === 0 ? 0 : offset + 1}–{offset + data.students.length} of {data.total} students
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn-ghost" style={{ padding: '6px' }} disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}><ChevronLeft size={16} /></button>
                                <button className="btn-ghost" style={{ padding: '6px' }} disabled={offset + PAGE_SIZE >= data.total} onClick={() => setOffset(offset + PAGE_SIZE)}><ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showAdd && (
                <Modal title="Add Student" onClose={() => setShowAdd(false)}>
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">First Name</label>
                                <input className="cs-input" required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Last Name</label>
                                <input className="cs-input" required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="cs-label">Email</label>
                            <input className="cs-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Phone</label>
                                <input className="cs-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Date of Birth</label>
                                <input className="cs-input" type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
                            </div>
                        </div>
                        {!branchScoped && (workspace?.branches.length ?? 0) > 1 && (
                            <div>
                                <label className="cs-label">Home Branch</label>
                                <select className="cs-input" value={form.branchId || session?.selectedBranchId || ''} onChange={e => setForm({ ...form, branchId: e.target.value })}>
                                    <option value="">Primary branch</option>
                                    {workspace?.branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="cs-label">Enroll in Batch (optional)</label>
                            <select className="cs-input" value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })}>
                                <option value="">— No batch yet —</option>
                                {batches?.map(b => <option key={b.batchId} value={b.batchId}>{b.name}</option>)}
                            </select>
                        </div>
                        {formError && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{formError}</div>}
                        <button className="btn-primary" type="submit" disabled={saving} style={{ alignSelf: 'flex-end' }}>
                            {saving ? 'Saving…' : 'Add Student'}
                        </button>
                    </form>
                </Modal>
            )}
        </>
    );
}
