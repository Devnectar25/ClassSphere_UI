'use client';
import Link from 'next/link';
import { useState } from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import { BookOpen, Clock, Users, Tag, Calendar, Plus, X, Search, Pencil, LayoutGrid, List, Check } from 'lucide-react';
import { api, useApi, formatMoney } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';
import {
    ACADEMY_DOMAINS,
    COURSE_CATALOGUE,
    getDomainKey,
    getDomainLabel,
    getRecommendedCategories,
    getCategorySubjects,
} from '@/lib/academy';

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
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
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

    // Academy Domain connection & categories
    const domainKey = getDomainKey(workspace?.organization.academyType);
    const domainLabel = getDomainLabel(workspace?.organization.academyType);
    const recommendedCategories = getRecommendedCategories(workspace?.organization.academyType);
    const catalogue = COURSE_CATALOGUE[domainKey] ?? COURSE_CATALOGUE.Other;

    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [isEditCustomCategory, setIsEditCustomCategory] = useState(false);

    const suggestions = getCategorySubjects(form.category, workspace?.organization.academyType).filter(s => !form.subjects.includes(s));
    const editSuggestions = getCategorySubjects(editForm.category, workspace?.organization.academyType).filter(s => !editForm.subjects.includes(s));

    const openCreateCourse = () => {
        setMessage(null);
        const initialCategory = recommendedCategories[0] || 'General';
        setForm({
            ...emptyCourse,
            category: initialCategory,
        });
        setIsCustomCategory(false);
        setSubjectInput('');
        setCreating(true);
    };

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
            setIsCustomCategory(false);
            reload();
        } catch (err) {
            setMessage((err as Error).message);
        }
    };

    const startEdit = (course: Course) => {
        setMessage(null);
        const isCustom = !recommendedCategories.some(c => c.toLowerCase() === course.category.toLowerCase()) && Boolean(course.category);
        setIsEditCustomCategory(isCustom);
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
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                    borderRadius: '16px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    boxSizing: 'border-box',
                    width: '100%'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: 1 }}>
                        {/* Search Input */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)',
                            borderRadius: '10px', padding: '0 14px', height: '38px', boxSizing: 'border-box',
                            minWidth: '280px', maxWidth: '360px', flex: 1,
                            transition: 'border-color 0.15s ease'
                        }}>
                            <Search size={15} color="var(--cs-text-muted)" style={{ flexShrink: 0 }} />
                            <input
                                placeholder="Search by title, code, subject..."
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

                        {/* Filter Pills Segmented Control */}
                        <div style={{
                            display: 'inline-flex',
                            background: 'var(--cs-surface-2)',
                            padding: '3px',
                            borderRadius: '10px',
                            border: '1px solid var(--cs-border)'
                        }}>
                            {[
                                { id: 'all', label: 'All', count: courses?.length ?? 0 },
                                { id: 'active', label: 'Active', count: courses?.filter(c => c.isActive).length ?? 0 },
                                { id: 'draft', label: 'Draft', count: courses?.filter(c => !c.isActive).length ?? 0 },
                            ].map(tab => {
                                const isActive = statusFilter === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setStatusFilter(tab.id as any)}
                                        style={{
                                            border: 'none',
                                            background: isActive ? '#ffffff' : 'transparent',
                                            color: isActive ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                            fontWeight: isActive ? 700 : 500,
                                            fontSize: '12.5px',
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span>{tab.label}</span>
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '1px 6px',
                                            borderRadius: '10px',
                                            background: isActive ? 'rgba(108, 99, 255, 0.12)' : 'rgba(0,0,0,0.05)',
                                            color: isActive ? 'var(--cs-primary)' : 'var(--cs-text-muted)',
                                            fontWeight: 600
                                        }}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Controls: View Toggle + Create Course Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                        <div style={{
                            display: 'inline-flex',
                            background: 'var(--cs-surface-2)',
                            border: '1px solid var(--cs-border)',
                            borderRadius: '10px',
                            padding: '3px',
                            alignItems: 'center'
                        }}>
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                style={{
                                    border: 'none',
                                    background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                                    color: viewMode === 'grid' ? 'var(--cs-primary)' : 'var(--cs-text-muted)',
                                    padding: '6px 10px',
                                    borderRadius: '7px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Grid Cards View"
                                aria-label="Grid Cards View"
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                style={{
                                    border: 'none',
                                    background: viewMode === 'table' ? '#ffffff' : 'transparent',
                                    color: viewMode === 'table' ? 'var(--cs-primary)' : 'var(--cs-text-muted)',
                                    padding: '6px 10px',
                                    borderRadius: '7px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Table View"
                                aria-label="Table View"
                            >
                                <List size={16} />
                            </button>
                        </div>

                        {canManage && (
                            <button
                                className="btn-primary"
                                onClick={openCreateCourse}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                    height: '38px',
                                    padding: '0 18px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Plus size={16} /> Create Course
                            </button>
                        )}
                    </div>
                </div>

                {!courses ? <PageState error={error} /> : viewMode === 'table' ? (
                    <div className="cs-card" style={{ width: '100%', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--cs-border)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                        <div style={{ overflowX: 'auto', width: '100%' }}>
                            <table className="cs-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--cs-surface-2)', borderBottom: '1px solid var(--cs-border)' }}>
                                        <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Course</th>
                                        <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Code</th>
                                        <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Category</th>
                                        <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Level</th>
                                        <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Tuition & Billing</th>
                                        <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Duration</th>
                                        <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Batches</th>
                                        <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'center' }}>Status</th>
                                        {canManage && <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'right' }}>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCourses.length === 0 ? (
                                        <tr>
                                            <td colSpan={canManage ? 9 : 8} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--cs-text-muted)' }}>
                                                <div style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                                                    {courses.length === 0
                                                        ? 'No courses created yet.'
                                                        : 'No courses match your search or filter.'}
                                                </div>
                                                {canManage && (
                                                    <button
                                                        type="button"
                                                        className="btn-primary"
                                                        onClick={openCreateCourse}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                    >
                                                        <Plus size={14} /> {courses.length === 0 ? 'Create First Course' : 'Create Course'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCourses.map(c => (
                                            <tr key={c.courseId} style={{ borderBottom: '1px solid var(--cs-border)', transition: 'background 0.15s ease' }}>
                                                {/* Course + Subjects */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            width: 38,
                                                            height: 38,
                                                            borderRadius: '10px',
                                                            background: 'linear-gradient(135deg, rgba(108,99,255,0.18) 0%, rgba(108,99,255,0.06) 100%)',
                                                            border: '1px solid rgba(108,99,255,0.25)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0
                                                        }}>
                                                            <BookOpen size={18} color="var(--cs-primary)" />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--cs-text-primary)', letterSpacing: '-0.01em' }}>
                                                                {c.title}
                                                            </div>
                                                            {c.subjects.length > 0 && (
                                                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                                    {c.subjects.slice(0, 3).map(s => (
                                                                        <span key={s.subjectId} style={{
                                                                            background: 'var(--cs-surface-2)',
                                                                            border: '1px solid var(--cs-border)',
                                                                            padding: '1px 6px',
                                                                            borderRadius: '5px',
                                                                            fontSize: '10.5px',
                                                                            color: 'var(--cs-text-secondary)',
                                                                            fontWeight: 500
                                                                        }}>
                                                                            {s.name}
                                                                        </span>
                                                                    ))}
                                                                    {c.subjects.length > 3 && (
                                                                        <span style={{ fontSize: '10.5px', color: 'var(--cs-text-muted)', alignSelf: 'center', fontWeight: 600 }}>
                                                                            +{c.subjects.length - 3}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Code */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                    <code style={{
                                                        fontSize: '11.5px',
                                                        fontWeight: 700,
                                                        fontFamily: 'monospace',
                                                        color: 'var(--cs-text-primary)',
                                                        background: 'var(--cs-surface-2)',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--cs-border)'
                                                    }}>
                                                        {c.code}
                                                    </code>
                                                </td>

                                                {/* Category */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        fontSize: '11.5px',
                                                        fontWeight: 600,
                                                        padding: '3px 9px',
                                                        borderRadius: '7px',
                                                        background: 'var(--cs-surface-2)',
                                                        border: '1px solid var(--cs-border)',
                                                        color: 'var(--cs-text-primary)'
                                                    }}>
                                                        <Tag size={11} color="var(--cs-primary)" /> {c.category}
                                                    </span>
                                                </td>

                                                {/* Level */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                    {c.level ? (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            color: 'var(--cs-text-secondary)',
                                                            background: 'var(--cs-surface-2)',
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--cs-border)'
                                                        }}>
                                                            Level {c.level}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--cs-text-muted)', fontSize: '12px' }}>—</span>
                                                    )}
                                                </td>

                                                {/* Tuition Fee & Billing */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--cs-text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                        {formatMoney(c.tuitionAmount, currency)}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', textTransform: 'capitalize', marginTop: '1px' }}>
                                                        per {c.billingPeriod || 'month'}
                                                    </div>
                                                </td>

                                                {/* Duration */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                    <span style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                        <Clock size={12} color="var(--cs-text-muted)" />
                                                        {c.durationMonths ? `${c.durationMonths} mo` : 'Ongoing'}
                                                    </span>
                                                </td>

                                                {/* Batches */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingBatchesCourse(c)}
                                                        style={{
                                                            background: 'rgba(108, 99, 255, 0.08)',
                                                            border: '1px solid rgba(108, 99, 255, 0.22)',
                                                            borderRadius: '8px',
                                                            padding: '4px 10px',
                                                            color: 'var(--cs-primary)',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        title="Click to view batches for this course"
                                                    >
                                                        <Calendar size={13} /> {c.batchCount} {c.batchCount === 1 ? 'batch' : 'batches'}
                                                    </button>
                                                </td>

                                                {/* Status */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        padding: '3px 10px',
                                                        borderRadius: '20px',
                                                        background: c.isActive ? '#ECFDF5' : 'var(--cs-surface-2)',
                                                        color: c.isActive ? '#059669' : 'var(--cs-text-muted)',
                                                        border: c.isActive ? '1px solid #A7F3D0' : '1px solid var(--cs-border)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px'
                                                    }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.isActive ? '#10B981' : '#9CA3AF' }} />
                                                        {c.isActive ? 'Active' : 'Draft'}
                                                    </span>
                                                </td>

                                                {/* Action */}
                                                {canManage && (
                                                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(c)}
                                                            style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                padding: 0,
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                color: 'var(--cs-primary)',
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
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px', width: '100%' }}>
                        {filteredCourses.length === 0 ? (
                            <div className="cs-card" style={{ padding: '48px 24px', textAlign: 'center', width: '100%', gridColumn: '1 / -1', borderRadius: '16px' }}>
                                <div style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                                    {courses.length === 0
                                        ? 'No courses created yet.'
                                        : 'No courses match your search or filter.'}
                                </div>
                                {canManage && (
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={openCreateCourse}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Plus size={14} /> {courses.length === 0 ? 'Create First Course' : 'Create Course'}
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredCourses.map(c => (
                                <div key={c.courseId} className="cs-card" style={{
                                    padding: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px',
                                    borderRadius: '16px',
                                    border: '1px solid var(--cs-border)',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                                    transition: 'all 0.2s ease'
                                }}>
                                    {/* Card Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0 }}>
                                            <div style={{
                                                width: 42,
                                                height: 42,
                                                borderRadius: '12px',
                                                background: 'linear-gradient(135deg, rgba(108,99,255,0.2) 0%, rgba(108,99,255,0.06) 100%)',
                                                border: '1px solid rgba(108,99,255,0.25)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <BookOpen size={20} color="var(--cs-primary)" />
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--cs-text-primary)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {c.title}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                    <code style={{ fontSize: '11px', background: 'var(--cs-surface-2)', padding: '1px 5px', borderRadius: '4px', color: 'var(--cs-text-secondary)', fontWeight: 600 }}>
                                                        {c.code}
                                                    </code>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                padding: '2px 8px',
                                                borderRadius: '20px',
                                                background: c.isActive ? '#ECFDF5' : 'var(--cs-surface-2)',
                                                color: c.isActive ? '#059669' : 'var(--cs-text-muted)',
                                                border: c.isActive ? '1px solid #A7F3D0' : '1px solid var(--cs-border)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.isActive ? '#10B981' : '#9CA3AF' }} />
                                                {c.isActive ? 'Active' : 'Draft'}
                                            </span>
                                            {canManage && (
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(c)}
                                                    style={{
                                                        width: '30px',
                                                        height: '30px',
                                                        padding: 0,
                                                        borderRadius: '7px',
                                                        cursor: 'pointer',
                                                        color: 'var(--cs-primary)',
                                                        background: 'rgba(108, 99, 255, 0.08)',
                                                        border: '1px solid rgba(108, 99, 255, 0.25)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    title={`Edit ${c.title}`}
                                                    aria-label={`Edit ${c.title}`}
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Badges Ribbon */}
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '11.5px', background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', padding: '2px 8px', borderRadius: '6px', color: 'var(--cs-text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <Tag size={10} color="var(--cs-primary)" /> {c.category}
                                        </span>
                                        {c.level && (
                                            <span style={{ fontSize: '11.5px', background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', padding: '2px 8px', borderRadius: '6px', color: 'var(--cs-text-secondary)' }}>
                                                Level {c.level}
                                            </span>
                                        )}
                                        {c.durationMonths && (
                                            <span style={{ fontSize: '11.5px', background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', padding: '2px 8px', borderRadius: '6px', color: 'var(--cs-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={10} color="var(--cs-text-muted)" /> {c.durationMonths} mo
                                            </span>
                                        )}
                                    </div>

                                    {/* Tuition & Billing Box */}
                                    <div style={{
                                        background: 'var(--cs-surface-2)',
                                        border: '1px solid var(--cs-border)',
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '10.5px', color: 'var(--cs-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Tuition Fee</div>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--cs-text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                {formatMoney(c.tuitionAmount, currency)}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '10.5px', color: 'var(--cs-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Billing</div>
                                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--cs-text-secondary)', textTransform: 'capitalize' }}>
                                                {c.billingPeriod || 'Monthly'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subjects */}
                                    <div>
                                        <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                            Subjects
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {c.subjects.length === 0 && <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>No subjects added</span>}
                                            {c.subjects.map(s => (
                                                <span key={s.subjectId} style={{ background: 'rgba(108, 99, 255, 0.08)', color: 'var(--cs-primary)', border: '1px solid rgba(108, 99, 255, 0.2)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                                                    {s.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Card Footer: Batches Button */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--cs-border)', paddingTop: '12px', marginTop: 'auto' }}>
                                        <button
                                            type="button"
                                            onClick={() => setViewingBatchesCourse(c)}
                                            style={{
                                                background: 'rgba(108, 99, 255, 0.08)',
                                                border: '1px solid rgba(108, 99, 255, 0.22)',
                                                padding: '4px 12px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                color: 'var(--cs-primary)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                            title="View batches"
                                        >
                                            <Calendar size={13} /> {c.batchCount} {c.batchCount === 1 ? 'batch' : 'batches'} • {c.studentCount} students
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
                                                    fontSize: '12px',
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
                <Modal title="Create Course" onClose={() => setCreating(false)} maxWidth="680px">
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Course Title *</label>
                                <input
                                    className="cs-input"
                                    required
                                    placeholder="e.g. Advanced Classical Dance"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="cs-label">Code *</label>
                                <input
                                    className="cs-input"
                                    required
                                    placeholder="e.g. CLS-01"
                                    value={form.code}
                                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>

                        {/* Category Section Connected to Academy Domain */}
                        <div style={{
                            background: 'var(--cs-surface-2)',
                            border: '1px solid var(--cs-border)',
                            borderRadius: '12px',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Tag size={14} color="var(--cs-primary)" />
                                    <label className="cs-label" style={{ marginBottom: 0, fontWeight: 700, fontSize: '13px' }}>
                                        Course Category <span style={{ color: 'var(--cs-danger)' }}>*</span>
                                    </label>
                                </div>
                                <div style={{
                                    fontSize: '11.5px',
                                    color: 'var(--cs-primary)',
                                    fontWeight: 600,
                                    background: 'rgba(79, 70, 229, 0.08)',
                                    border: '1px solid rgba(79, 70, 229, 0.2)',
                                    padding: '2px 9px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}>
                                    <span style={{ color: 'var(--cs-text-secondary)', fontWeight: 500 }}>Academy Domain:</span>
                                    <strong>{domainLabel}</strong>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: isCustomCategory ? '1fr 1fr' : '1fr', gap: '10px' }}>
                                <select
                                    className="cs-input"
                                    required
                                    value={isCustomCategory ? '__custom__' : form.category}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === '__custom__') {
                                            setIsCustomCategory(true);
                                            setForm({ ...form, category: '' });
                                        } else {
                                            setIsCustomCategory(false);
                                            setForm({ ...form, category: val });
                                        }
                                    }}
                                >
                                    <option value="" disabled>Select course category...</option>
                                    <optgroup label={`Recommended for ${domainLabel}`}>
                                        {recommendedCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </optgroup>
                                    <option value="__custom__">+ Enter Custom Category...</option>
                                </select>

                                {isCustomCategory && (
                                    <input
                                        className="cs-input"
                                        placeholder="Type custom category name..."
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                )}
                            </div>

                            {/* Recommended Categories Quick Selection Chips */}
                            {recommendedCategories.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontWeight: 600 }}>
                                        Recommended Categories for {domainLabel}:
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {recommendedCategories.map(cat => {
                                            const isSelected = !isCustomCategory && form.category.toLowerCase() === cat.toLowerCase();
                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => {
                                                        setIsCustomCategory(false);
                                                        setForm({ ...form, category: cat });
                                                    }}
                                                    style={{
                                                        fontSize: '11.5px',
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        border: isSelected ? '1.5px solid var(--cs-primary)' : '1px solid var(--cs-border)',
                                                        background: isSelected ? 'rgba(79, 70, 229, 0.12)' : '#ffffff',
                                                        color: isSelected ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                                        fontWeight: isSelected ? 700 : 500,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        boxShadow: isSelected ? '0 1px 2px rgba(79, 70, 229, 0.15)' : 'none',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    {isSelected ? <Check size={12} strokeWidth={2.5} /> : <Tag size={11} />}
                                                    {cat}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="cs-label">Subjects *</label>
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
                                    <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontWeight: 600 }}>Suggested for {form.category || 'Course'}:</span>
                                    {suggestions.map(s => (
                                        <button type="button" key={s} className="badge badge-secondary" style={{ cursor: 'pointer', border: '1px dashed var(--cs-border)' }} onClick={() => addSubject(s)}>
                                            <Plus size={10} /> {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr 90px 1fr', gap: '10px' }}>
                            <div>
                                <label className="cs-label">Fee ({currency}) *</label>
                                <input className="cs-input" type="number" min="0" required placeholder="e.g. 2500" value={form.tuitionAmount} onChange={e => setForm({ ...form, tuitionAmount: e.target.value })} />
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
                            <div>
                                <label className="cs-label">Level</label>
                                <input className="cs-input" placeholder="e.g. Level 10, Beginner" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} />
                            </div>
                        </div>

                        {message && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{message}</div>}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                            <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
                            <button className="btn-primary" type="submit" disabled={form.subjects.length === 0 || !form.category.trim()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Check size={14} /> Create Course
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Edit Course Modal */}
            {editingCourse && (
                <Modal title={`Edit Course: ${editingCourse.title}`} onClose={() => setEditingCourse(null)} maxWidth="680px">
                    <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Course Title *</label>
                                <input className="cs-input" required value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Code *</label>
                                <input className="cs-input" required placeholder="e.g. SCI-10" value={editForm.code} onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })} />
                            </div>
                        </div>

                        {/* Category Section Connected to Academy Domain */}
                        <div style={{
                            background: 'var(--cs-surface-2)',
                            border: '1px solid var(--cs-border)',
                            borderRadius: '12px',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Tag size={14} color="var(--cs-primary)" />
                                    <label className="cs-label" style={{ marginBottom: 0, fontWeight: 700, fontSize: '13px' }}>
                                        Course Category <span style={{ color: 'var(--cs-danger)' }}>*</span>
                                    </label>
                                </div>
                                <div style={{
                                    fontSize: '11.5px',
                                    color: 'var(--cs-primary)',
                                    fontWeight: 600,
                                    background: 'rgba(79, 70, 229, 0.08)',
                                    border: '1px solid rgba(79, 70, 229, 0.2)',
                                    padding: '2px 9px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}>
                                    <span style={{ color: 'var(--cs-text-secondary)', fontWeight: 500 }}>Academy Domain:</span>
                                    <strong>{domainLabel}</strong>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: isEditCustomCategory ? '1fr 1fr' : '1fr', gap: '10px' }}>
                                <select
                                    className="cs-input"
                                    required
                                    value={isEditCustomCategory ? '__custom__' : editForm.category}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === '__custom__') {
                                            setIsEditCustomCategory(true);
                                            setEditForm({ ...editForm, category: '' });
                                        } else {
                                            setIsEditCustomCategory(false);
                                            setEditForm({ ...editForm, category: val });
                                        }
                                    }}
                                >
                                    <option value="" disabled>Select course category...</option>
                                    <optgroup label={`Recommended for ${domainLabel}`}>
                                        {recommendedCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </optgroup>
                                    {!recommendedCategories.includes(editForm.category) && editForm.category && !isEditCustomCategory && (
                                        <option value={editForm.category}>{editForm.category}</option>
                                    )}
                                    <option value="__custom__">+ Enter Custom Category...</option>
                                </select>

                                {isEditCustomCategory && (
                                    <input
                                        className="cs-input"
                                        placeholder="Type custom category name..."
                                        value={editForm.category}
                                        onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                )}
                            </div>

                            {/* Recommended Categories Quick Selection Chips */}
                            {recommendedCategories.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontWeight: 600 }}>
                                        Recommended Categories for {domainLabel}:
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {recommendedCategories.map(cat => {
                                            const isSelected = !isEditCustomCategory && editForm.category.toLowerCase() === cat.toLowerCase();
                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => {
                                                        setIsEditCustomCategory(false);
                                                        setEditForm({ ...editForm, category: cat });
                                                    }}
                                                    style={{
                                                        fontSize: '11.5px',
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        border: isSelected ? '1.5px solid var(--cs-primary)' : '1px solid var(--cs-border)',
                                                        background: isSelected ? 'rgba(79, 70, 229, 0.12)' : '#ffffff',
                                                        color: isSelected ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                                        fontWeight: isSelected ? 700 : 500,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        boxShadow: isSelected ? '0 1px 2px rgba(79, 70, 229, 0.15)' : 'none',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    {isSelected ? <Check size={12} strokeWidth={2.5} /> : <Tag size={11} />}
                                                    {cat}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="cs-label">Subjects *</label>
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
                                    <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontWeight: 600 }}>Suggested for {editForm.category || 'Course'}:</span>
                                    {editSuggestions.map(s => (
                                        <button type="button" key={s} className="badge badge-secondary" style={{ cursor: 'pointer', border: '1px dashed var(--cs-border)' }} onClick={() => addEditSubject(s)}>
                                            <Plus size={10} /> {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr 90px 1fr', gap: '10px' }}>
                            <div>
                                <label className="cs-label">Fee ({currency}) *</label>
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
                            <div>
                                <label className="cs-label">Level</label>
                                <input className="cs-input" placeholder="e.g. Class 10" value={editForm.level} onChange={e => setEditForm({ ...editForm, level: e.target.value })} />
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

                        {message && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{message}</div>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                            <button className="btn-secondary" type="button" onClick={() => setEditingCourse(null)}>Cancel</button>
                            <button className="btn-primary" type="submit" disabled={editForm.subjects.length === 0 || !editForm.category.trim()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Check size={14} /> Save Changes
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
