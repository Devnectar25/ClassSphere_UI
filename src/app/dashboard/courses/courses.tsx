'use client';
import Link from 'next/link';
import { useState } from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import { BookOpen, Clock, Users, Tag, Calendar, Plus, X, Search, Pencil, LayoutGrid, List } from 'lucide-react';
import { api, useApi, formatMoney } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';
import { COURSE_CATALOGUE } from '@/lib/academy';

interface Course {
    courseId: string;
    title: string;
    code: string;
    category: string;
    level: string | null;
    durationMonths: number | null;
    tuitionAmount: number;
    billingPeriod: string;
    isActive: boolean;
    batchCount: number;
    studentCount: number;
    subjects: Array<{ subjectId: string; name: string }>;
}

interface BatchItem {
    batchId: string;
    courseId?: string;
    name: string;
    courseTitle: string;
    instructorName: string | null;
    room: string | null;
    branchName: string;
    capacity: number;
    enrolledCount: number;
    status: string;
    schedules: Array<{ day: string; startTime: string; endTime: string }>;
}

const emptyCourse = { title: '', code: '', category: '', level: '', durationMonths: '12', tuitionAmount: '', billingPeriod: 'monthly', subjects: [] as string[] };

export default function CoursesPage() {
    const session = useSession();
    const { workspace, currency } = useWorkspace();
    const { data: courses, error, reload } = useApi<Course[]>('/courses');
    const { data: allBatches } = useApi<BatchItem[]>('/batches');
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState(emptyCourse);
    const [subjectInput, setSubjectInput] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const canManage = can(session, 'courses.write');

    // Edit course state
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [editForm, setEditForm] = useState({
        courseId: '',
        title: '',
        code: '',
        category: '',
        level: '',
        durationMonths: '12',
        tuitionAmount: '',
        billingPeriod: 'monthly',
        isActive: true,
        subjects: [] as string[]
    });
    const [editSubjectInput, setEditSubjectInput] = useState('');

    // Quick-view batches state
    const [viewingBatchesCourse, setViewingBatchesCourse] = useState<Course | null>(null);

    const catalogue = COURSE_CATALOGUE[workspace?.organization.academyType ?? 'Other'] ?? COURSE_CATALOGUE.Other;
    const suggestions = (catalogue[form.category] ?? []).filter(s => !form.subjects.includes(s));
    const editSuggestions = (catalogue[editForm.category] ?? []).filter(s => !editForm.subjects.includes(s));

    const addSubject = (name: string) => {
        const value = name.trim();
        if (value && !form.subjects.includes(value)) setForm(f => ({ ...f, subjects: [...f.subjects, value] }));
        setSubjectInput('');
    };

    const addEditSubject = (name: string) => {
        const value = name.trim();
        if (value && !editForm.subjects.includes(value)) setEditForm(f => ({ ...f, subjects: [...f.subjects, value] }));
        setEditSubjectInput('');
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        try {
            await api('/courses', { method: 'POST', body: JSON.stringify(form) });
            setCreating(false);
            setForm(emptyCourse);
            reload();
        } catch (err) {
            setMessage((err as Error).message);
        }
    };

    const startEdit = (course: Course) => {
        setMessage(null);
        setEditForm({
            courseId: course.courseId,
            title: course.title,
            code: course.code,
            category: course.category,
            level: course.level || '',
            durationMonths: course.durationMonths ? String(course.durationMonths) : '12',
            tuitionAmount: String(course.tuitionAmount),
            billingPeriod: course.billingPeriod || 'monthly',
            isActive: course.isActive,
            subjects: course.subjects.map(s => s.name)
        });
        setEditingCourse(course);
    };

    const submitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        try {
            await api('/courses', {
                method: 'PUT',
                body: JSON.stringify({
                    ...editForm,
                    durationMonths: editForm.durationMonths ? Number(editForm.durationMonths) : null,
                    tuitionAmount: Number(editForm.tuitionAmount)
                })
            });
            setEditingCourse(null);
            reload();
        } catch (err) {
            setMessage((err as Error).message);
        }
    };

    const addSubjectToCourse = async (course: Course) => {
        const subject = prompt(`New subject for ${course.title}`);
        if (!subject?.trim()) return;
        try {
            await api('/courses', { method: 'PUT', body: JSON.stringify({ courseId: course.courseId, subject }) });
            reload();
        } catch (err) {
            alert((err as Error).message);
        }
    };

    const filteredCourses = courses?.filter(c => {
        if (statusFilter !== 'all') {
            if (statusFilter === 'active' && !c.isActive) return false;
            if (statusFilter === 'draft' && c.isActive) return false;
        }
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            c.title.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q) ||
            c.subjects.some(s => s.name.toLowerCase().includes(q))
        );
    }) ?? [];

    return (
        <>
            <Topbar title="Courses" subtitle="Course catalogue with subjects, tuition and enrollment" />
            <div className="page-body" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Courses Toolbar */}
                <div className="cs-card" style={{
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)',
                            borderRadius: '10px', padding: '0 12px', height: '34px', boxSizing: 'border-box',
                            width: '300px'
                        }}>
                            <Search size={14} color="var(--cs-text-muted)" style={{ flexShrink: 0 }} />
                            <input
                                placeholder="Search courses..."
                                style={{
                                    background: 'none', border: 'none', outline: 'none',
                                    padding: 0, height: '100%', fontSize: '13px', width: '100%',
                                    color: 'var(--cs-text-primary)'
                                }}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--cs-text-muted)' }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {(['all', 'active', 'draft'] as const).map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setStatusFilter(s)}
                                    style={{
                                        border: 'none',
                                        background: statusFilter === s ? 'rgba(108, 99, 255, 0.15)' : 'none',
                                        color: statusFilter === s ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                        fontWeight: statusFilter === s ? 700 : 500,
                                        fontSize: '12px',
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        cursor: 'pointer',
                                        textTransform: 'capitalize',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                        <div style={{
                            display: 'inline-flex',
                            background: 'var(--cs-surface-2)',
                            border: '1px solid var(--cs-border)',
                            borderRadius: '8px',
                            padding: '2px',
                            alignItems: 'center'
                        }}>
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                style={{
                                    border: 'none',
                                    background: viewMode === 'table' ? 'var(--cs-surface)' : 'transparent',
                                    color: viewMode === 'table' ? 'var(--cs-primary)' : 'var(--cs-text-muted)',
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Table View"
                                aria-label="Table View"
                            >
                                <List size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                style={{
                                    border: 'none',
                                    background: viewMode === 'grid' ? 'var(--cs-surface)' : 'transparent',
                                    color: viewMode === 'grid' ? 'var(--cs-primary)' : 'var(--cs-text-muted)',
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Grid Cards View"
                                aria-label="Grid Cards View"
                            >
                                <LayoutGrid size={15} />
                            </button>
                        </div>

                        {canManage && (
                            <button
                                className="btn-primary"
                                onClick={() => { setForm({ ...emptyCourse, category: Object.keys(catalogue)[0] ?? '' }); setCreating(true); }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Plus size={16} /> Create Course
                            </button>
                        )}
                    </div>
                </div>

                {!courses ? <PageState error={error} /> : viewMode === 'table' ? (
                    <div className="cs-card" style={{ width: '100%', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto', width: '100%' }}>
                            <table className="cs-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Course</th>
                                        <th>Code</th>
                                        <th>Category</th>
                                        <th>Level</th>
                                        <th>Fee</th>
                                        <th>Billing</th>
                                        <th>Duration</th>
                                        <th>Batches</th>
                                        <th>Status</th>
                                        <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCourses.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--cs-text-muted)' }}>
                                                <div style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                                                    {courses.length === 0
                                                        ? 'No courses found for this course.'
                                                        : 'No courses match your search or filter.'}
                                                </div>
                                                {canManage && (
                                                    <button
                                                        type="button"
                                                        className="btn-primary"
                                                        onClick={() => { setForm({ ...emptyCourse, category: Object.keys(catalogue)[0] ?? '' }); setCreating(true); }}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                    >
                                                        <Plus size={14} /> {courses.length === 0 ? 'Create First Course' : 'Create Course'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCourses.map(c => (
                                            <tr key={c.courseId}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <BookOpen size={16} color="#6C63FF" />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--cs-text-primary)' }}>{c.title}</div>
                                                            {c.subjects.length > 0 && (
                                                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                                                                    {c.subjects.slice(0, 3).map(s => (
                                                                        <span key={s.subjectId} style={{ background: 'var(--cs-surface-2)', padding: '1px 5px', borderRadius: '4px' }}>{s.name}</span>
                                                                    ))}
                                                                    {c.subjects.length > 3 && <span>+{c.subjects.length - 3}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <code style={{ fontSize: '11px', color: 'var(--cs-text-muted)', background: 'var(--cs-surface-2)', padding: '2px 6px', borderRadius: '4px' }}>{c.code}</code>
                                                </td>
                                                <td>
                                                    <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                                                        <Tag size={10} style={{ marginRight: '4px' }} />{c.category}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>
                                                    {c.level || '—'}
                                                </td>
                                                <td style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>
                                                    {formatMoney(c.tuitionAmount, currency)}
                                                </td>
                                                <td style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', textTransform: 'capitalize' }}>
                                                    {c.billingPeriod}
                                                </td>
                                                <td style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>
                                                    {c.durationMonths ? `${c.durationMonths} mo` : '—'}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingBatchesCourse(c)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--cs-primary)',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            padding: 0
                                                        }}
                                                        title="Click to view batches for this course"
                                                    >
                                                        <Calendar size={12} /> {c.batchCount} {c.batchCount === 1 ? 'batch' : 'batches'}
                                                    </button>
                                                </td>
                                                <td>
                                                    <span className={`badge ${c.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                        {c.isActive ? 'active' : 'draft'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {canManage && (
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(c)}
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
                                                            title={`Edit ${c.title}`}
                                                            aria-label={`Edit ${c.title}`}
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', width: '100%' }}>
                        {filteredCourses.length === 0 ? (
                            <div className="cs-card" style={{ padding: '48px 24px', textAlign: 'center', width: '100%', gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                                    {courses.length === 0
                                        ? 'No courses found for this course.'
                                        : 'No courses match your search or filter.'}
                                </div>
                                {canManage && (
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={() => { setForm({ ...emptyCourse, category: Object.keys(catalogue)[0] ?? '' }); setCreating(true); }}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Plus size={14} /> {courses.length === 0 ? 'Create First Course' : 'Create Course'}
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredCourses.map(c => (
                                <div key={c.courseId} className="cs-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <BookOpen size={18} color="#6C63FF" />
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--cs-text-primary)' }}>{c.title}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>{c.code} • {formatMoney(c.tuitionAmount, currency)} / {c.billingPeriod}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            <span className={`badge ${c.isActive ? 'badge-success' : 'badge-secondary'}`}>{c.isActive ? 'active' : 'draft'}</span>
                                            {canManage && (
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(c)}
                                                    style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        padding: 0,
                                                        borderRadius: '7px',
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
                                                    title={`Edit ${c.title}`}
                                                    aria-label={`Edit ${c.title}`}
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        <span className="badge badge-secondary"><Tag size={10} /> {c.category}</span>
                                        {c.level && <span className="badge badge-info"><Users size={10} /> {c.level}</span>}
                                        {c.durationMonths && <span className="badge badge-secondary"><Clock size={10} /> {c.durationMonths} months</span>}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cs-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Subjects</div>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {c.subjects.length === 0 && <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>No subjects yet</span>}
                                            {c.subjects.map(s => <span key={s.subjectId} className="badge badge-primary">{s.name}</span>)}
                                            {canManage && (
                                                <button className="badge badge-secondary" style={{ border: '1px dashed var(--cs-border)', cursor: 'pointer' }} onClick={() => addSubjectToCourse(c)}>
                                                    <Plus size={10} /> Subject
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--cs-text-secondary)', borderTop: '1px solid var(--cs-border)', paddingTop: '10px', marginTop: 'auto' }}>
                                        <button
                                            type="button"
                                            onClick={() => setViewingBatchesCourse(c)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                color: c.batchCount > 0 ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                                fontWeight: c.batchCount > 0 ? 600 : 400,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                            title="Click to view batches for this course"
                                        >
                                            {c.batchCount} {c.batchCount === 1 ? 'batch' : 'batches'} • {c.studentCount} students
                                        </button>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Link
                                                href={`/dashboard/batches?courseId=${c.courseId}&courseTitle=${encodeURIComponent(c.title)}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    color: c.batchCount > 0 ? 'var(--cs-primary)' : 'var(--cs-text-muted)',
                                                    fontWeight: 600,
                                                    textDecoration: 'none'
                                                }}
                                                title={`View ${c.title} batches in Batches & Schedule`}
                                            >
                                                <Calendar size={12} /> Batches
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Quick-view Batches Modal */}
            {viewingBatchesCourse && (
                <Modal title={`Batches: ${viewingBatchesCourse.title}`} onClose={() => setViewingBatchesCourse(null)}>
                    {(() => {
                        const courseBatches = allBatches?.filter(b => (
                            (b.courseId && b.courseId === viewingBatchesCourse.courseId) ||
                            b.courseTitle.toLowerCase() === viewingBatchesCourse.title.toLowerCase()
                        )) || [];
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>
                                    {courseBatches.length} {courseBatches.length === 1 ? 'batch' : 'batches'} scheduled for this course.
                                </div>
                                {courseBatches.length === 0 ? (
                                    <div className="cs-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--cs-text-muted)' }}>
                                        No active batches found for this course.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {courseBatches.map(b => {
                                            const fillPct = b.capacity > 0 ? Math.round((b.enrolledCount / b.capacity) * 100) : 0;
                                            const fillColor = fillPct >= 90 ? '#EF4444' : fillPct >= 75 ? '#F59E0B' : '#10B981';
                                            return (
                                                <div key={b.batchId} style={{
                                                    padding: '12px 14px', borderRadius: '10px',
                                                    border: '1px solid var(--cs-border)', background: 'var(--cs-surface-2)',
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--cs-text-primary)' }}>{b.name}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', marginTop: '2px' }}>
                                                            {b.instructorName ? `Instructor: ${b.instructorName}` : 'No instructor assigned'} • {b.room ?? b.branchName}
                                                        </div>
                                                        {b.schedules.length > 0 && (
                                                            <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>
                                                                {b.schedules[0].startTime} – {b.schedules[0].endTime} ({b.schedules.map(s => s.day).join(', ')})
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                                            {b.enrolledCount} / {b.capacity} enrolled <span style={{ color: fillColor }}>({fillPct}%)</span>
                                                        </div>
                                                        <span className={`badge ${b.status === 'active' ? 'badge-success' : 'badge-secondary'}`} style={{ marginTop: '4px' }}>
                                                            {b.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--cs-border)' }}>
                                    <button type="button" className="btn-secondary" onClick={() => setViewingBatchesCourse(null)}>Close</button>
                                    <Link
                                        href={`/dashboard/batches?courseId=${viewingBatchesCourse.courseId}&courseTitle=${encodeURIComponent(viewingBatchesCourse.title)}`}
                                        className="btn-primary"
                                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        onClick={() => setViewingBatchesCourse(null)}
                                    >
                                        Open in Batches & Schedule →
                                    </Link>
                                </div>
                            </div>
                        );
                    })()}
                </Modal>
            )}

            {/* Create Course Modal */}
            {creating && (
                <Modal title="Create Course" onClose={() => setCreating(false)} maxWidth="660px">
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                            <div>
                                <label className="cs-label">Course Title</label>
                                <input className="cs-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Code</label>
                                <input className="cs-input" required placeholder="e.g. SCI-10" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                            </div>
                            <div>
                                <label className="cs-label">Category</label>
                                <input className="cs-input" required list="course-categories" value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })} />
                                <datalist id="course-categories">
                                    {Object.keys(catalogue).map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="cs-label">Level</label>
                                <input className="cs-input" placeholder="e.g. Class 10" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr 90px', gap: '10px' }}>
                            <div>
                                <label className="cs-label">Fee ({currency})</label>
                                <input className="cs-input" type="number" min="0" required value={form.tuitionAmount} onChange={e => setForm({ ...form, tuitionAmount: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Billing</label>
                                <select className="cs-input" value={form.billingPeriod} onChange={e => setForm({ ...form, billingPeriod: e.target.value })}>
                                    <option value="monthly">Monthly</option>
                                    <option value="term">Per term</option>
                                    <option value="annual">Annual</option>
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">Months</label>
                                <input className="cs-input" type="number" min="1" value={form.durationMonths} onChange={e => setForm({ ...form, durationMonths: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="cs-label">Subjects</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                {form.subjects.map(s => (
                                    <span key={s} className="badge badge-primary">
                                        {s}
                                        <button type="button" aria-label={`Remove ${s}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                                            onClick={() => setForm(f => ({ ...f, subjects: f.subjects.filter(x => x !== s) }))}>
                                            <X size={11} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input className="cs-input" placeholder="Type a subject and press Enter" value={subjectInput}
                                    onChange={e => setSubjectInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubject(subjectInput); } }} />
                                <button type="button" className="btn-secondary" onClick={() => addSubject(subjectInput)}>Add</button>
                            </div>
                            {suggestions.length > 0 && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>Suggested:</span>
                                    {suggestions.map(s => (
                                        <button type="button" key={s} className="badge badge-secondary" style={{ cursor: 'pointer', border: '1px dashed var(--cs-border)' }} onClick={() => addSubject(s)}>
                                            <Plus size={10} /> {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {message && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{message}</div>}
                        <button className="btn-primary" type="submit" disabled={form.subjects.length === 0} style={{ alignSelf: 'flex-end' }}>Create Course</button>
                    </form>
                </Modal>
            )}

            {/* Edit Course Modal */}
            {editingCourse && (
                <Modal title={`Edit Course: ${editingCourse.title}`} onClose={() => setEditingCourse(null)} maxWidth="660px">
                    <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                            <div>
                                <label className="cs-label">Course Title</label>
                                <input className="cs-input" required value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Code</label>
                                <input className="cs-input" required placeholder="e.g. SCI-10" value={editForm.code} onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })} />
                            </div>
                            <div>
                                <label className="cs-label">Category</label>
                                <input className="cs-input" required list="edit-course-categories" value={editForm.category}
                                    onChange={e => setEditForm({ ...editForm, category: e.target.value })} />
                                <datalist id="edit-course-categories">
                                    {Object.keys(catalogue).map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="cs-label">Level</label>
                                <input className="cs-input" placeholder="e.g. Class 10" value={editForm.level} onChange={e => setEditForm({ ...editForm, level: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr 90px', gap: '10px' }}>
                            <div>
                                <label className="cs-label">Fee ({currency})</label>
                                <input className="cs-input" type="number" min="0" required value={editForm.tuitionAmount} onChange={e => setEditForm({ ...editForm, tuitionAmount: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Billing</label>
                                <select className="cs-input" value={editForm.billingPeriod} onChange={e => setEditForm({ ...editForm, billingPeriod: e.target.value })}>
                                    <option value="monthly">Monthly</option>
                                    <option value="term">Per term</option>
                                    <option value="annual">Annual</option>
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">Months</label>
                                <input className="cs-input" type="number" min="1" value={editForm.durationMonths} onChange={e => setEditForm({ ...editForm, durationMonths: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="cs-label">Status</label>
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '6px' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: editForm.isActive ? 600 : 400 }}>
                                    <input
                                        type="radio"
                                        name="courseStatus"
                                        checked={editForm.isActive === true}
                                        onChange={() => setEditForm({ ...editForm, isActive: true })}
                                    />
                                    Active
                                </label>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: !editForm.isActive ? 600 : 400 }}>
                                    <input
                                        type="radio"
                                        name="courseStatus"
                                        checked={editForm.isActive === false}
                                        onChange={() => setEditForm({ ...editForm, isActive: false })}
                                    />
                                    Draft
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="cs-label">Subjects</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                {editForm.subjects.map(s => (
                                    <span key={s} className="badge badge-primary">
                                        {s}
                                        <button type="button" aria-label={`Remove ${s}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                                            onClick={() => setEditForm(f => ({ ...f, subjects: f.subjects.filter(x => x !== s) }))}>
                                            <X size={11} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input className="cs-input" placeholder="Type a subject and press Enter" value={editSubjectInput}
                                    onChange={e => setEditSubjectInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEditSubject(editSubjectInput); } }} />
                                <button type="button" className="btn-secondary" onClick={() => addEditSubject(editSubjectInput)}>Add</button>
                            </div>
                            {editSuggestions.length > 0 && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>Suggested:</span>
                                    {editSuggestions.map(s => (
                                        <button type="button" key={s} className="badge badge-secondary" style={{ cursor: 'pointer', border: '1px dashed var(--cs-border)' }} onClick={() => addEditSubject(s)}>
                                            <Plus size={10} /> {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {message && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{message}</div>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                            <button className="btn-secondary" type="button" onClick={() => setEditingCourse(null)}>Cancel</button>
                            <button className="btn-primary" type="submit" disabled={editForm.subjects.length === 0}>Save Changes</button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
