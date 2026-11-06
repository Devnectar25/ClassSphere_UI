'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import { useState } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, useApi, initials } from '@/lib/api';
import { can, useSession } from '@/lib/session';

interface Schedule {
    weekday: number;
    day: string;
    startKey: string;
    endKey: string;
    startTime: string;
    endTime: string;
    sessionType: string;
}

interface Batch {
    batchId: string;
    name: string;
    courseId: string;
    courseTitle: string;
    instructorUserId: string | null;
    instructorName: string | null;
    room: string | null;
    branchName: string;
    capacity: number;
    enrolledCount: number;
    status: string;
    startDate: string;
    endDate: string | null;
    schedules: Schedule[];
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function BatchesPage() {
    const session = useSession();
    const canManage = can(session, 'courses.write');
    const [activeTab, setActiveTab] = useState('batches');
    const [editing, setEditing] = useState<Batch | null>(null);
    const { data: batches, error, reload } = useApi<Batch[]>('/batches');

    return (
        <>
            <Topbar title="Batches & Schedule" subtitle="Batch rosters, instructors, capacity and the weekly timetable" />
            <div className="page-body">

                <div className="tab-list" style={{ alignSelf: 'flex-start' }}>
                    {[['batches', 'Batches'], ['schedule', 'Weekly Schedule']].map(([id, label]) => (
                        <button key={id} className={`tab-trigger${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>
                            {label}
                        </button>
                    ))}
                </div>

                {!batches ? <PageState error={error} /> : activeTab === 'batches' ? (
                    <div className="cs-card">
                        <div style={{ overflowX: 'auto' }}>
                            <table className="cs-table">
                                <thead>
                                    <tr>
                                        <th>Batch</th>
                                        <th>Course</th>
                                        <th>Instructor</th>
                                        <th>Schedule</th>
                                        <th>Venue</th>
                                        <th>Capacity</th>
                                        <th>Status</th>
                                        {canManage && <th />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {batches.map(b => {
                                        const fillPct = b.capacity > 0 ? Math.round((b.enrolledCount / b.capacity) * 100) : 0;
                                        const fillColor = fillPct >= 90 ? '#EF4444' : fillPct >= 75 ? '#F59E0B' : '#10B981';
                                        const first = b.schedules[0];
                                        return (
                                            <tr key={b.batchId}>
                                                <td>
                                                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--cs-text-primary)' }}>{b.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{b.branchName}</div>
                                                </td>
                                                <td style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{b.courseTitle}</td>
                                                <td>
                                                    {b.instructorName ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <div className="avatar-placeholder" style={{ width: 26, height: 26, fontSize: '10px' }}>{initials(b.instructorName)}</div>
                                                            <span className="cell-nowrap" style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{b.instructorName}</span>
                                                        </div>
                                                    ) : '—'}
                                                </td>
                                                <td>
                                                    {first ? (
                                                        <>
                                                            <div className="cell-nowrap" style={{ fontSize: '12px', color: 'var(--cs-text-primary)', fontWeight: 600 }}>{first.startTime} – {first.endTime}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{b.schedules.map(s => s.day).join(' ')}</div>
                                                        </>
                                                    ) : '—'}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                                        <MapPin size={11} /> {b.room ?? '—'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)', marginBottom: '4px' }}>
                                                        {b.enrolledCount}/{b.capacity}
                                                        <span style={{ fontSize: '11px', marginLeft: '4px', color: fillColor }}>({fillPct}%)</span>
                                                    </div>
                                                    <div className="progress-bar" style={{ width: '80px' }}>
                                                        <div className="progress-fill" style={{ width: `${fillPct}%`, background: fillColor }} />
                                                    </div>
                                                </td>
                                                <td><span className={`badge ${b.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>{b.status}</span></td>
                                                {canManage && (
                                                    <td>
                                                        <button className="btn-secondary cell-nowrap" style={{ padding: '6px 12px', fontSize: '12px', height: 'auto' }} onClick={() => setEditing(b)}>
                                                            <Pencil size={12} /> Edit
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                        {WEEKDAYS.map((dayName, i) => {
                            const sessions = batches
                                .flatMap(b => b.schedules.filter(s => s.weekday === i + 1).map(s => ({ ...s, batch: b })))
                                .sort((a, b) => a.startKey.localeCompare(b.startKey));
                            return (
                                <div key={dayName} className="cs-card" style={{ padding: '16px' }}>
                                    <div className="section-title" style={{ fontSize: '14px', marginBottom: '12px' }}>{dayName}</div>
                                    {sessions.length === 0 && <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>No sessions</div>}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {sessions.map(s => (
                                            <div key={`${s.batch.batchId}-${s.startKey}`} title={canManage ? 'Click to edit this batch\'s schedule' : undefined}
                                                onClick={canManage ? () => setEditing(s.batch) : undefined}
                                                style={{ background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', borderRadius: '8px', padding: '10px', cursor: canManage ? 'pointer' : undefined }}>
                                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>{s.startTime} – {s.endTime}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', marginTop: '2px' }}>{s.batch.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>{s.batch.room ?? s.batch.branchName} • {s.sessionType}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {editing && <EditBatchModal batch={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
        </>
    );
}

interface ScheduleRow { weekday: number; startTime: string; endTime: string; sessionType: string }

/** Edits a batch's details and its weekly schedule (the schedule is saved as a whole, replacing the old one). */
function EditBatchModal({ batch, onClose, onSaved }: { batch: Batch; onClose: () => void; onSaved: () => void }) {
    const { data: courses } = useApi<Array<{ courseId: string; title: string }>>('/courses');
    const { data: staff } = useApi<Array<{ userId: string; fullName: string; role: string; isActive: boolean }>>('/staff');
    const [form, setForm] = useState({
        name: batch.name,
        courseId: batch.courseId,
        instructorUserId: batch.instructorUserId ?? '',
        room: batch.room ?? '',
        capacity: String(batch.capacity),
        status: batch.status,
        startDate: batch.startDate?.slice(0, 10) ?? '',
        endDate: batch.endDate?.slice(0, 10) ?? '',
    });
    const [schedules, setSchedules] = useState<ScheduleRow[]>(batch.schedules.map(s => ({
        weekday: s.weekday, startTime: s.startKey, endTime: s.endKey, sessionType: s.sessionType,
    })));
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // One entry per person, even when they hold several roles
    const instructors = [...new Map((staff ?? []).filter(s => s.isActive).map(s => [s.userId, s])).values()];

    const updateRow = (i: number, patch: Partial<ScheduleRow>) =>
        setSchedules(rows => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    const addRow = () =>
        setSchedules(rows => [...rows, rows.length ? { ...rows[rows.length - 1], weekday: rows[rows.length - 1].weekday % 7 + 1 } : { weekday: 1, startTime: '16:00', endTime: '17:00', sessionType: 'Class' }]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (schedules.some(s => s.endTime <= s.startTime)) {
            setError('Each session must end after it starts.');
            return;
        }
        setSaving(true);
        try {
            await api('/batches', {
                method: 'PUT',
                body: JSON.stringify({ batchId: batch.batchId, ...form, capacity: Number(form.capacity), schedules }),
            });
            onSaved();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={`Edit Batch — ${batch.name}`} onClose={onClose}>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                    <label className="cs-label">Batch Name</label>
                    <input className="cs-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label className="cs-label">Course</label>
                        <select className="cs-input" required value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}>
                            {!courses && <option value={form.courseId}>{batch.courseTitle}</option>}
                            {courses?.map(c => <option key={c.courseId} value={c.courseId}>{c.title}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="cs-label">Instructor</label>
                        <select className="cs-input" value={form.instructorUserId} onChange={e => setForm({ ...form, instructorUserId: e.target.value })}>
                            <option value="">— Not assigned —</option>
                            {!staff && batch.instructorUserId && <option value={batch.instructorUserId}>{batch.instructorName}</option>}
                            {instructors.map(s => <option key={s.userId} value={s.userId}>{s.fullName} ({s.role})</option>)}
                        </select>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                    <div>
                        <label className="cs-label">Room / Venue</label>
                        <input className="cs-input" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} />
                    </div>
                    <div>
                        <label className="cs-label">Capacity</label>
                        <input className="cs-input" type="number" min={Math.max(1, batch.enrolledCount)} required value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
                    </div>
                    <div>
                        <label className="cs-label">Status</label>
                        <select className="cs-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                            <option value="upcoming">Upcoming</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label className="cs-label">Start Date</label>
                        <input className="cs-input" type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                    </div>
                    <div>
                        <label className="cs-label">End Date (optional)</label>
                        <input className="cs-input" type="date" min={form.startDate} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                    </div>
                </div>

                <div style={{ borderTop: '1px solid var(--cs-border)', paddingTop: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div className="section-title" style={{ fontSize: '14px' }}>Weekly Schedule</div>
                        <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', height: 'auto' }} onClick={addRow}>
                            <Plus size={12} /> Add Session
                        </button>
                    </div>
                    {schedules.length === 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>No weekly sessions — attendance can&apos;t be taken until you add one.</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {schedules.map((s, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.1fr auto', gap: '6px', alignItems: 'center' }}>
                                <select className="cs-input" aria-label="Day" value={s.weekday} onChange={e => updateRow(i, { weekday: Number(e.target.value) })}>
                                    {WEEKDAYS.map((d, j) => <option key={d} value={j + 1}>{d}</option>)}
                                </select>
                                <input className="cs-input" type="time" aria-label="Start time" required value={s.startTime} onChange={e => updateRow(i, { startTime: e.target.value })} />
                                <input className="cs-input" type="time" aria-label="End time" required value={s.endTime} onChange={e => updateRow(i, { endTime: e.target.value })} />
                                <input className="cs-input" aria-label="Session type" placeholder="Class" value={s.sessionType} onChange={e => updateRow(i, { sessionType: e.target.value })} />
                                <button type="button" className="btn-ghost" style={{ padding: '6px' }} aria-label="Remove session" onClick={() => setSchedules(rows => rows.filter((_, j) => j !== i))}>
                                    <Trash2 size={14} color="var(--cs-danger)" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {error && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{error}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                </div>
            </form>
        </Modal>
    );
}
