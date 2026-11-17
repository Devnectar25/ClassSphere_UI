'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import { useState } from 'react';
import { Search, Phone, Users, UserCheck, UserX, Clock, ChevronLeft, ChevronRight, Plus, Pencil } from 'lucide-react';
import { api, useApi, formatDate, initials } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';

interface Student {
    studentId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string | null;
    enrollmentNumber: string;
    status: string;
    batches: string | null;
    branchId?: string | null;
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

const PAGE_SIZE = 7;

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

    // Edit student state
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', status: 'active', batchId: '', branchId: '' });
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (search) query.set('q', search);
    if (statusFilter !== 'all') query.set('status', statusFilter);
    const { data, error, reload } = useApi<StudentSearch>(`/students?${query}`);
    const { data: batches } = useApi<Array<{ batchId: string; name: string }>>(showAdd || !!editingStudent ? '/batches' : null);

    const counts = data?.statusCounts ?? {};
    const totalStudents = Object.values(counts).reduce((a, b) => a + b, 0);
    const stats = [
        { label: 'Total', value: totalStudents, icon: Users, color: '#6C63FF' },
        { label: 'Active', value: counts.active ?? 0, icon: UserCheck, color: '#10B981' },
        { label: 'On Hold', value: counts['on-hold'] ?? 0, icon: Clock, color: '#F59E0B' },
        { label: 'Withdrawn', value: counts.withdrawn ?? 0, icon: UserX, color: '#EF4444' },
    ];

    const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE) || 1;
    const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

    const getVisiblePages = (curr: number, total: number): (number | string)[] => {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const pages: (number | string)[] = [1];
        if (curr > 3) pages.push('...');
        const start = Math.max(2, curr - 1);
        const end = Math.min(total - 1, curr + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (curr < total - 2) pages.push('...');
        pages.push(total);
        return pages;
    };

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

    const startEdit = (s: Student) => {
        setEditingStudent(s);
        setEditForm({
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email || '',
            phone: s.phone || '',
            status: s.status,
            batchId: '',
            branchId: s.branchId || '',
        });
        setEditError(null);
    };

    const submitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;
        setEditSaving(true);
        setEditError(null);
        try {
            await api('/students', {
                method: 'PUT',
                body: JSON.stringify({
                    studentId: editingStudent.studentId,
                    ...editForm,
                    batchId: editForm.batchId || undefined,
                    branchId: editForm.branchId || undefined,
                }),
            });
            setEditingStudent(null);
            reload();
        } catch (err) {
            setEditError((err as Error).message);
        } finally {
            setEditSaving(false);
        }
    };

    return (
        <>
            <Topbar title="Students" subtitle="Manage student profiles, enrollments, and status" />
            <div className="page-body" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>

                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', width: '100%' }}>
                    {stats.map(s => (
                        <div key={s.label} className="cs-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: 38, height: 38, borderRadius: '10px', background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <s.icon size={18} color={s.color} />
                            </div>
                            <div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--cs-text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.1 }}>{s.value}</div>
                                <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', marginTop: '2px' }}>{s.label} Students</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table card */}
                <div className="cs-card" style={{ width: '100%', overflow: 'hidden' }}>
                    {/* Toolbar */}
                    <div style={{
                        padding: '12px 20px',
                        borderBottom: '1px solid var(--cs-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: '1', minWidth: '280px' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)',
                                borderRadius: '8px', padding: '0 10px', height: '32px', boxSizing: 'border-box',
                                width: '280px', flexShrink: 0
                            }}>
                                <Search size={14} color="var(--cs-text-muted)" style={{ flexShrink: 0 }} />
                                <input
                                    placeholder="Search by name, ID or email..."
                                    style={{
                                        background: 'none', border: 'none', outline: 'none',
                                        padding: 0, height: '100%', fontSize: '12px', width: '100%',
                                        color: 'var(--cs-text-primary)'
                                    }}
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setOffset(0); }}
                                />
                            </div>

                            {/* Status filter pills */}
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {['all', 'active', 'on-hold', 'inquiry', 'completed', 'withdrawn'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { setStatusFilter(s); setOffset(0); }}
                                        style={{
                                            padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 600,
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

                        {/* Add Student button */}
                        {can(session, 'students.write') && (
                            <button
                                className="btn-primary"
                                onClick={() => setShowAdd(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    height: '32px',
                                    borderRadius: '8px'
                                }}
                            >
                                <Plus size={14} />
                                Add Student
                            </button>
                        )}
                    </div>

                    {!data ? <PageState error={error} /> : (
                        <div style={{ width: '100%', overflow: 'hidden' }}>
                            <table className="cs-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr style={{ background: 'var(--cs-surface-2)' }}>
                                        <th style={{ width: '20%', padding: '9px 8px 9px 18px' }}>Student</th>
                                        <th style={{ width: '14%', padding: '9px 8px' }}>Branch</th>
                                        <th style={{ width: '22%', padding: '9px 8px' }}>Batch</th>
                                        <th style={{ width: '13%', padding: '9px 8px' }}>Guardian</th>
                                        <th style={{ width: '9%', padding: '9px 8px' }}>Joined</th>
                                        <th style={{ width: '8%', padding: '9px 6px', textAlign: 'center' }}>Status</th>
                                        <th style={{ width: '8%', padding: '9px 6px', textAlign: 'center' }}>Fees</th>
                                        <th style={{ width: '6%', padding: '9px 12px 9px 6px', textAlign: 'center' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.students.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: '28px 14px', color: 'var(--cs-text-muted)', fontSize: '13px' }}>
                                                No students found.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.students.map(s => {
                                            const name = `${s.firstName} ${s.lastName}`;
                                            return (
                                                <tr key={s.studentId} style={{ transition: 'background 0.15s' }}>
                                                    <td style={{ padding: '9px 8px 9px 18px', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: '11px', flexShrink: 0 }}>
                                                                {initials(name)}
                                                            </div>
                                                            <div style={{ minWidth: 0 }}>
                                                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cs-text-primary)', lineHeight: 1.3 }}>
                                                                    {name}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', lineHeight: 1.25, marginTop: '2px' }}>
                                                                    <code>{s.enrollmentNumber}</code>
                                                                </div>
                                                                {s.phone && (
                                                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px', lineHeight: 1.25 }}>
                                                                        <Phone size={10} />
                                                                        <span>{s.phone}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '9px 8px', fontSize: '12px', color: 'var(--cs-text-secondary)', verticalAlign: 'middle', lineHeight: 1.35, whiteSpace: 'normal', wordBreak: 'normal' }}>
                                                        {s.branchName ?? '—'}
                                                    </td>
                                                    <td style={{ padding: '9px 8px', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                            {!s.batches ? (
                                                                <span style={{ color: 'var(--cs-text-muted)', fontSize: '12px' }}>—</span>
                                                            ) : (
                                                                s.batches.split(', ').map(b => (
                                                                    <span
                                                                        key={b}
                                                                        className="badge badge-primary"
                                                                        style={{
                                                                            display: 'inline-block',
                                                                            whiteSpace: 'normal',
                                                                            wordBreak: 'normal',
                                                                            lineHeight: 1.3,
                                                                            fontSize: '11px',
                                                                            padding: '3px 8px',
                                                                            height: 'auto',
                                                                            borderRadius: '6px',
                                                                            maxWidth: '100%'
                                                                        }}
                                                                    >
                                                                        {b}
                                                                    </span>
                                                                ))
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '9px 8px', color: 'var(--cs-text-secondary)', fontSize: '12px', verticalAlign: 'middle', lineHeight: 1.35, whiteSpace: 'normal', wordBreak: 'normal' }}>
                                                        {s.guardianName ?? '—'}
                                                    </td>
                                                    <td style={{ padding: '9px 8px', color: 'var(--cs-text-muted)', fontSize: '11px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                        {formatDate(s.createdAt)}
                                                    </td>
                                                    <td style={{ padding: '9px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                        <span className={`badge ${statusConfig[s.status]?.cls ?? 'badge-secondary'}`} style={{ fontSize: '11px', padding: '2px 8px', height: '22px', lineHeight: '22px' }}>
                                                            {statusConfig[s.status]?.label ?? s.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '9px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                        <span className={`badge ${feesConfig[s.feeStatus]?.cls}`} style={{ fontSize: '11px', padding: '2px 8px', height: '22px', lineHeight: '22px' }}>
                                                            {feesConfig[s.feeStatus]?.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '9px 12px 9px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                        {can(session, 'students.write') && (
                                                            <button
                                                                className="btn-ghost"
                                                                onClick={() => startEdit(s)}
                                                                title={`Edit ${name}`}
                                                                style={{
                                                                    width: '28px',
                                                                    height: '28px',
                                                                    padding: 0,
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    color: '#6C63FF',
                                                                    background: 'rgba(108, 99, 255, 0.08)',
                                                                    border: '1px solid rgba(108, 99, 255, 0.25)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108, 99, 255, 0.2)')}
                                                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(108, 99, 255, 0.08)')}
                                                                aria-label={`Edit ${name}`}
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {data && (
                        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                Showing {data.total === 0 ? 0 : offset + 1}–{Math.min(offset + data.students.length, data.total)} of {data.total} students (7 per page)
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    className="btn-ghost"
                                    style={{
                                        padding: '5px 10px',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid var(--cs-border)',
                                        borderRadius: '6px',
                                        cursor: offset === 0 ? 'not-allowed' : 'pointer',
                                        opacity: offset === 0 ? 0.4 : 1
                                    }}
                                    disabled={offset === 0}
                                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                                >
                                    <ChevronLeft size={14} /> Previous
                                </button>

                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    {getVisiblePages(currentPage, totalPages).map((p, idx) => {
                                        if (p === '...') {
                                            return <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--cs-text-muted)', fontSize: '12px' }}>...</span>;
                                        }
                                        const pageNum = Number(p);
                                        const isCurrent = pageNum === currentPage;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setOffset((pageNum - 1) * PAGE_SIZE)}
                                                style={{
                                                    minWidth: '28px',
                                                    height: '28px',
                                                    padding: '0 6px',
                                                    fontSize: '12px',
                                                    fontWeight: isCurrent ? 700 : 500,
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    border: '1px solid',
                                                    background: isCurrent ? 'var(--cs-primary)' : 'transparent',
                                                    borderColor: isCurrent ? 'var(--cs-primary)' : 'var(--cs-border)',
                                                    color: isCurrent ? '#FFFFFF' : 'var(--cs-text-secondary)',
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
                                        padding: '5px 10px',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid var(--cs-border)',
                                        borderRadius: '6px',
                                        cursor: offset + PAGE_SIZE >= data.total ? 'not-allowed' : 'pointer',
                                        opacity: offset + PAGE_SIZE >= data.total ? 0.4 : 1
                                    }}
                                    disabled={offset + PAGE_SIZE >= data.total}
                                    onClick={() => setOffset(offset + PAGE_SIZE)}
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Student Modal */}
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
                        <button className="btn-primary" type="submit" disabled={saving} style={{ alignSelf: 'flex-end', cursor: 'pointer' }}>
                            {saving ? 'Saving…' : 'Add Student'}
                        </button>
                    </form>
                </Modal>
            )}

            {/* Edit Student Modal */}
            {editingStudent && (
                <Modal title={`Edit Student: ${editingStudent.firstName} ${editingStudent.lastName}`} onClose={() => setEditingStudent(null)}>
                    <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">First Name</label>
                                <input className="cs-input" required value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Last Name</label>
                                <input className="cs-input" required value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Email</label>
                                <input className="cs-input" type="email" required value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Phone</label>
                                <input className="cs-input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="cs-label">Status</label>
                            <select className="cs-input" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                <option value="active">Active</option>
                                <option value="on-hold">On-Hold</option>
                                <option value="inquiry">Inquiry</option>
                                <option value="completed">Completed</option>
                                <option value="withdrawn">Withdrawn</option>
                            </select>
                        </div>
                        {!branchScoped && (workspace?.branches.length ?? 0) > 1 && (
                            <div>
                                <label className="cs-label">Branch</label>
                                <select className="cs-input" value={editForm.branchId} onChange={e => setEditForm({ ...editForm, branchId: e.target.value })}>
                                    <option value="">Primary branch</option>
                                    {workspace?.branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="cs-label">Change / Assign Batch</label>
                            <select className="cs-input" value={editForm.batchId} onChange={e => setEditForm({ ...editForm, batchId: e.target.value })}>
                                <option value="">— Keep existing batch —</option>
                                {batches?.map(b => <option key={b.batchId} value={b.batchId}>{b.name}</option>)}
                            </select>
                        </div>
                        {editError && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{editError}</div>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                            <button className="btn-ghost" type="button" onClick={() => setEditingStudent(null)}>Cancel</button>
                            <button className="btn-primary" type="submit" disabled={editSaving} style={{ cursor: 'pointer' }}>
                                {editSaving ? 'Updating…' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
