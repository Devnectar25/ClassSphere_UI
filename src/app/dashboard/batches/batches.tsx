'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import { MapPin, ArrowLeft, X, Filter, Calendar as CalendarIcon, Plus, Trash2, Pencil } from 'lucide-react';
import { api, useApi, initials } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';

interface Schedule {
    weekday: number;
    day: string;
    startKey: string;
    endKey?: string;
    startTime: string;
    endTime: string;
    sessionType: string;
}

interface Batch {
    batchId: string;
    courseId?: string;
    branchId?: string;
    instructorUserId?: string;
    name: string;
    courseTitle: string;
    instructorName: string | null;
    room: string | null;
    branchName: string;
    capacity: number;
    enrolledCount: number;
    status: string;
    startDate?: string;
    endDate?: string;
    schedules: Schedule[];
}

const WEEKDAYS = [
    { num: 1, name: 'Monday' },
    { num: 2, name: 'Tuesday' },
    { num: 3, name: 'Wednesday' },
    { num: 4, name: 'Thursday' },
    { num: 5, name: 'Friday' },
    { num: 6, name: 'Saturday' },
    { num: 7, name: 'Sunday' },
];

function to24h(timeStr: string | undefined): string {
    if (!timeStr) return '10:00';
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return '10:00';
    const [ , h, m, ampm ] = match;
    let hour = parseInt(h, 10);
    if (ampm) {
        const p = ampm.toUpperCase();
        if (p === 'PM' && hour < 12) hour += 12;
        if (p === 'AM' && hour === 12) hour = 0;
    }
    return `${hour.toString().padStart(2, '0')}:${m}`;
}

const emptyBatchForm: {
    batchId?: string;
    name: string;
    courseId: string;
    branchId: string;
    instructorUserId: string;
    room: string;
    capacity: string;
    status: string;
    startDate: string;
    endDate: string;
    schedules: Array<{ weekday: number; startTime: string; endTime: string; sessionType: string }>;
} = {
    name: '',
    courseId: '',
    branchId: '',
    instructorUserId: '',
    room: '',
    capacity: '25',
    status: 'active',
    startDate: '',
    endDate: '',
    schedules: [
        { weekday: 1, startTime: '10:00', endTime: '11:30', sessionType: 'Class' }
    ]
};

function BatchesContent() {
    const router = useRouter();
    const session = useSession();
    const { workspace } = useWorkspace();
    const searchParams = useSearchParams();
    const courseIdParam = searchParams.get('courseId');
    const courseTitleParam = searchParams.get('courseTitle') || searchParams.get('course');

    const [activeTab, setActiveTab] = useState('batches');
    const { data: batches, error, reload } = useApi<Batch[]>('/batches');
    const { data: courses } = useApi<Array<{ courseId: string; title: string; code: string }>>('/courses');
    const { data: staffList } = useApi<Array<{ userId: string; fullName: string; role: string }>>('/staff');
    const [selectedCourse, setSelectedCourse] = useState<string>('all');

    // Add Batch modal state
    const [showAddBatch, setShowAddBatch] = useState(false);
    const [batchForm, setBatchForm] = useState(emptyBatchForm);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const canManage = can(session, 'courses.write') || can(session, 'academics.read');

    // Unique courses from batches
    const courseOptions = Array.from(
        new Map(
            batches?.map(b => [b.courseId || b.courseTitle, { id: b.courseId || b.courseTitle, title: b.courseTitle }]) || []
        ).values()
    );

    useEffect(() => {
        if (courseIdParam) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedCourse(courseIdParam);
        } else if (courseTitleParam) {
            const match = batches?.find(b => b.courseTitle.toLowerCase() === courseTitleParam.toLowerCase());
            if (match?.courseId) setSelectedCourse(match.courseId);
            else setSelectedCourse(courseTitleParam);
        } else {
            setSelectedCourse('all');
        }
    }, [courseIdParam, courseTitleParam, batches]);

    const handleCourseChange = (newCourse: string) => {
        setSelectedCourse(newCourse);
        if (newCourse === 'all') {
            router.push('/dashboard/batches');
        } else {
            router.push(`/dashboard/batches?courseId=${encodeURIComponent(newCourse)}`);
        }
    };

    const openAddBatch = () => {
        const defaultCourse = selectedCourse !== 'all' ? selectedCourse : (courses?.[0]?.courseId ?? '');
        const defaultBranch = session?.selectedBranchId || workspace?.branches?.[0]?.branchId || '';
        setBatchForm({
            ...emptyBatchForm,
            courseId: defaultCourse,
            branchId: defaultBranch,
            startDate: new Date().toISOString().split('T')[0]
        });
        setFormError(null);
        setShowAddBatch(true);
    };

    const openEditBatch = (b: Batch) => {
        const cId = b.courseId || courses?.find(c => c.title.toLowerCase() === b.courseTitle.toLowerCase())?.courseId || '';
        const bId = b.branchId || workspace?.branches?.find(br => br.name.toLowerCase() === b.branchName.toLowerCase())?.branchId || workspace?.branches?.[0]?.branchId || '';
        const instId = b.instructorUserId || staffList?.find(st => st.fullName.toLowerCase() === (b.instructorName || '').toLowerCase())?.userId || '';

        setBatchForm({
            batchId: b.batchId,
            name: b.name,
            courseId: cId,
            branchId: bId,
            instructorUserId: instId,
            room: b.room || '',
            capacity: String(b.capacity || 25),
            status: b.status || 'active',
            startDate: b.startDate ? b.startDate.split('T')[0] : '',
            endDate: b.endDate ? b.endDate.split('T')[0] : '',
            schedules: b.schedules && b.schedules.length > 0
                ? b.schedules.map(s => ({
                    weekday: s.weekday,
                    startTime: s.startKey || to24h(s.startTime),
                    endTime: s.endKey || to24h(s.endTime),
                    sessionType: s.sessionType || 'Class'
                }))
                : [{ weekday: 1, startTime: '10:00', endTime: '11:30', sessionType: 'Class' }]
        });
        setFormError(null);
        setShowAddBatch(true);
    };

    const addScheduleRow = () => {
        setBatchForm(f => ({
            ...f,
            schedules: [...f.schedules, { weekday: 1, startTime: '14:00', endTime: '15:30', sessionType: 'Class' }]
        }));
    };

    const removeScheduleRow = (idx: number) => {
        setBatchForm(f => ({
            ...f,
            schedules: f.schedules.filter((_, i) => i !== idx)
        }));
    };

    const updateScheduleRow = (idx: number, field: string, val: string | number) => {
        setBatchForm(f => ({
            ...f,
            schedules: f.schedules.map((s, i) => i === idx ? { ...s, [field]: val } : s)
        }));
    };

    const submitBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            const isEditing = Boolean(batchForm.batchId);
            await api('/batches', {
                method: isEditing ? 'PUT' : 'POST',
                body: JSON.stringify({
                    ...batchForm,
                    capacity: Number(batchForm.capacity || 25),
                    branchId: batchForm.branchId || workspace?.branches?.[0]?.branchId,
                    schedules: batchForm.schedules.filter(s => s.startTime && s.endTime)
                })
            });
            setShowAddBatch(false);
            reload();
        } catch (err) {
            setFormError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const filteredBatches = batches?.filter(b => {
        if (selectedCourse === 'all') return true;
        return (
            (b.courseId && b.courseId === selectedCourse) ||
            b.courseTitle.toLowerCase() === selectedCourse.toLowerCase()
        );
    }) ?? [];

    const activeCourseObj = courseOptions.find(c => c.id === selectedCourse || c.title.toLowerCase() === selectedCourse.toLowerCase());
    const activeCourseTitle = activeCourseObj?.title || courseTitleParam || (selectedCourse !== 'all' ? selectedCourse : null);

    // Filter staff for instructors
    const instructors = staffList?.filter(s => s.role === 'Instructor' || s.role === 'TenantAdmin') || staffList || [];

    return (
        <div className="page-body" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            {/* Filter banner if filtered by course */}
            {selectedCourse !== 'all' && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    background: 'rgba(108, 99, 255, 0.08)',
                    border: '1px solid rgba(108, 99, 255, 0.25)',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--cs-text-secondary)' }}>Showing batches for course:</span>
                        <span style={{ fontWeight: 700, color: 'var(--cs-primary)', fontSize: '14px' }}>
                            {activeCourseTitle}
                        </span>
                        <span className="badge badge-primary">{filteredBatches.length} {filteredBatches.length === 1 ? 'batch' : 'batches'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Link
                            href="/dashboard/courses"
                            style={{
                                fontSize: '12px',
                                color: 'var(--cs-primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                textDecoration: 'none',
                                fontWeight: 600
                            }}
                        >
                            <ArrowLeft size={13} /> Back to Courses
                        </Link>
                        <button
                            type="button"
                            onClick={() => handleCourseChange('all')}
                            className="btn-secondary"
                            style={{
                                fontSize: '12px',
                                padding: '4px 10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={12} /> View All Batches
                        </button>
                    </div>
                </div>
            )}

            {/* Controls Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '16px'
            }}>
                <div className="tab-list">
                    {[['batches', 'Batches'], ['schedule', 'Weekly Schedule']].map(([id, label]) => (
                        <button key={id} className={`tab-trigger${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Course Filter + Add Batch button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                        <Filter size={13} color="var(--cs-text-muted)" />
                        <span>Course:</span>
                    </div>
                    <select
                        className="cs-input"
                        value={selectedCourse}
                        onChange={e => handleCourseChange(e.target.value)}
                        style={{ width: 'auto', minWidth: '200px', height: '36px', padding: '0 10px', fontSize: '13px' }}
                    >
                        <option value="all">All Courses ({batches?.length ?? 0} batches)</option>
                        {courseOptions.map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                    </select>

                    {canManage && (
                        <button
                            className="btn-primary"
                            onClick={openAddBatch}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: 600,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                height: '36px'
                            }}
                        >
                            <Plus size={16} /> Add Batch
                        </button>
                    )}
                </div>
            </div>

            {!batches ? <PageState error={error} /> : activeTab === 'batches' ? (
                <div className="cs-card" style={{ width: '100%', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table className="cs-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Batch</th>
                                    <th>Course</th>
                                    <th>Instructor</th>
                                    <th>Schedule</th>
                                    <th>Venue</th>
                                    <th>Capacity</th>
                                    <th>Status</th>
                                    <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBatches.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--cs-text-muted)' }}>
                                            No batches found for this course.
                                            {selectedCourse !== 'all' ? (
                                                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button type="button" className="btn-secondary" onClick={() => handleCourseChange('all')}>
                                                        Show All Batches
                                                    </button>
                                                    {canManage && (
                                                        <button type="button" className="btn-primary" onClick={openAddBatch}>
                                                            <Plus size={14} /> Create Batch for this Course
                                                        </button>
                                                    )}
                                                </div>
                                            ) : canManage ? (
                                                <div style={{ marginTop: '10px' }}>
                                                    <button type="button" className="btn-primary" onClick={openAddBatch}>
                                                        <Plus size={14} /> Create First Batch
                                                    </button>
                                                </div>
                                            ) : null}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBatches.map(b => {
                                        const fillPct = b.capacity > 0 ? Math.round((b.enrolledCount / b.capacity) * 100) : 0;
                                        const fillColor = fillPct >= 90 ? '#EF4444' : fillPct >= 75 ? '#F59E0B' : '#10B981';
                                        const first = b.schedules[0];
                                        return (
                                            <tr key={b.batchId}>
                                                <td>
                                                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--cs-text-primary)' }}>{b.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{b.branchName}</div>
                                                </td>
                                                <td style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>{b.courseTitle}</td>
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
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        className="btn-ghost"
                                                        onClick={() => openEditBatch(b)}
                                                        title={`Edit ${b.name}`}
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
                                                        aria-label={`Edit ${b.name}`}
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', width: '100%' }}>
                    {WEEKDAYS.map((day, i) => {
                        const sessions = filteredBatches
                            .flatMap(b => b.schedules.filter(s => s.weekday === day.num).map(s => ({ ...s, batch: b })))
                            .sort((a, b) => a.startKey.localeCompare(b.startKey));
                        return (
                            <div key={day.name} className="cs-card" style={{ padding: '16px' }}>
                                <div className="section-title" style={{ fontSize: '14px', marginBottom: '12px' }}>{day.name}</div>
                                {sessions.length === 0 && <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>No sessions</div>}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {sessions.map(s => (
                                        <div
                                            key={`${s.batch.batchId}-${s.startKey}-${s.weekday}`}
                                            onClick={() => openEditBatch(s.batch)}
                                            style={{
                                                background: 'var(--cs-surface-2)',
                                                border: '1px solid var(--cs-border)',
                                                borderRadius: '8px',
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                position: 'relative'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.borderColor = 'rgba(108, 99, 255, 0.45)';
                                                e.currentTarget.style.background = 'rgba(108, 99, 255, 0.05)';
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.borderColor = 'var(--cs-border)';
                                                e.currentTarget.style.background = 'var(--cs-surface-2)';
                                                e.currentTarget.style.transform = 'none';
                                            }}
                                            title={`Click to edit ${s.batch.name} schedule`}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>
                                                    {s.startTime} – {s.endTime}
                                                </span>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '4px',
                                                    background: 'rgba(108,99,255,0.12)',
                                                    color: '#6C63FF'
                                                }}>
                                                    <Pencil size={11} />
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cs-text-secondary)', marginTop: '4px' }}>
                                                {s.batch.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={10} />
                                                <span>{s.batch.room ?? s.batch.branchName} • {s.sessionType}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Batch Modal */}
            {showAddBatch && (
                <Modal title={batchForm.batchId ? `Edit Batch: ${batchForm.name}` : "Add New Batch"} onClose={() => setShowAddBatch(false)}>
                    <form onSubmit={submitBatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label className="cs-label">Batch Name *</label>
                            <input
                                className="cs-input"
                                required
                                placeholder="e.g. Piano Solo Intensive — Studio 4B"
                                value={batchForm.name}
                                onChange={e => setBatchForm({ ...batchForm, name: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Course *</label>
                                <select
                                    className="cs-input"
                                    required
                                    value={batchForm.courseId}
                                    onChange={e => setBatchForm({ ...batchForm, courseId: e.target.value })}
                                >
                                    <option value="">— Select Course —</option>
                                    {courses?.map(c => (
                                        <option key={c.courseId} value={c.courseId}>{c.title} ({c.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">Branch *</label>
                                <select
                                    className="cs-input"
                                    required
                                    value={batchForm.branchId}
                                    onChange={e => setBatchForm({ ...batchForm, branchId: e.target.value })}
                                >
                                    {workspace?.branches.map(b => (
                                        <option key={b.branchId} value={b.branchId}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Instructor</label>
                                <select
                                    className="cs-input"
                                    value={batchForm.instructorUserId}
                                    onChange={e => setBatchForm({ ...batchForm, instructorUserId: e.target.value })}
                                >
                                    <option value="">— Assign Instructor —</option>
                                    {instructors.map(inst => (
                                        <option key={inst.userId} value={inst.userId}>{inst.fullName} ({inst.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">Room / Venue</label>
                                <input
                                    className="cs-input"
                                    placeholder="e.g. Studio 4B (Steinway Grand)"
                                    value={batchForm.room}
                                    onChange={e => setBatchForm({ ...batchForm, room: e.target.value })}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Student Capacity</label>
                                <input
                                    className="cs-input"
                                    type="number"
                                    min="1"
                                    required
                                    value={batchForm.capacity}
                                    onChange={e => setBatchForm({ ...batchForm, capacity: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="cs-label">Start Date *</label>
                                <input
                                    className="cs-input"
                                    type="date"
                                    required
                                    value={batchForm.startDate}
                                    onChange={e => setBatchForm({ ...batchForm, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="cs-label">Status</label>
                                <select
                                    className="cs-input"
                                    value={batchForm.status}
                                    onChange={e => setBatchForm({ ...batchForm, status: e.target.value })}
                                >
                                    <option value="active">Active</option>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>

                        {/* Weekly Schedule Section */}
                        <div style={{ borderTop: '1px solid var(--cs-border)', paddingTop: '12px', marginTop: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label className="cs-label" style={{ margin: 0, fontWeight: 700 }}>Weekly Schedule</label>
                                <button
                                    type="button"
                                    onClick={addScheduleRow}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--cs-primary)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Plus size={13} /> Add Session Day
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {batchForm.schedules.map((sch, idx) => (
                                    <div key={idx} style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1.4fr 1fr 1fr 1fr auto',
                                        gap: '8px',
                                        alignItems: 'center',
                                        background: 'var(--cs-surface-2)',
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--cs-border)'
                                    }}>
                                        <div>
                                            <select
                                                className="cs-input"
                                                style={{ height: '32px', fontSize: '12px', padding: '0 6px' }}
                                                value={sch.weekday}
                                                onChange={e => updateScheduleRow(idx, 'weekday', Number(e.target.value))}
                                            >
                                                {WEEKDAYS.map(w => (
                                                    <option key={w.num} value={w.num}>{w.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <input
                                                className="cs-input"
                                                type="time"
                                                style={{ height: '32px', fontSize: '12px', padding: '0 6px' }}
                                                value={sch.startTime}
                                                onChange={e => updateScheduleRow(idx, 'startTime', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <input
                                                className="cs-input"
                                                type="time"
                                                style={{ height: '32px', fontSize: '12px', padding: '0 6px' }}
                                                value={sch.endTime}
                                                onChange={e => updateScheduleRow(idx, 'endTime', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <select
                                                className="cs-input"
                                                style={{ height: '32px', fontSize: '12px', padding: '0 6px' }}
                                                value={sch.sessionType}
                                                onChange={e => updateScheduleRow(idx, 'sessionType', e.target.value)}
                                            >
                                                <option value="Class">Class</option>
                                                <option value="Intensive">Intensive</option>
                                                <option value="Seminar">Seminar</option>
                                                <option value="Ensemble">Ensemble</option>
                                                <option value="Rehearsal">Rehearsal</option>
                                            </select>
                                        </div>
                                        <div>
                                            {batchForm.schedules.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeScheduleRow(idx)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--cs-danger)',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}
                                                    title="Remove Session"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {formError && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{formError}</div>}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                            <button className="btn-secondary" type="button" onClick={() => setShowAddBatch(false)}>Cancel</button>
                            <button className="btn-primary" type="submit" disabled={saving || !batchForm.name || !batchForm.courseId}>
                                {saving ? 'Creating…' : 'Create Batch'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

export default function BatchesPage() {
    return (
        <>
            <Topbar title="Batches & Schedule" subtitle="Batch rosters, instructors, capacity and the weekly timetable" />
            <Suspense fallback={<PageState error={null} />}>
                <BatchesContent />
            </Suspense>
        </>
    );
}
