'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import { BookOpen, Clock, Users, Tag, Calendar, Plus, X, Search, Pencil, LayoutGrid, List, Trash2, AlertTriangle, Building2, ChevronLeft, ChevronRight, Award, CheckCircle2 } from 'lucide-react';
import { api, useApi, formatMoney } from '@/lib/api';
import { can, selectBranch, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';
import CategorySelect from '@/components/CategorySelect';
import { COURSE_CATALOGUE, getDomainKey, getRecommendedCategories } from '@/lib/academy';

export interface CourseCompletionPolicy {
    enabled: boolean;
    minAttendancePct: number;
    requiredSessions: number;
    requiredAssessments: number;
    minPassingMarks: number;
    requireApproval: boolean;
    checkAttendance: boolean;
    checkAssessments: boolean;
    checkMarks: boolean;
    checkSessions: boolean;
    checkDuration: boolean;
}

export const defaultCompletionPolicy: CourseCompletionPolicy = {
    enabled: true,
    minAttendancePct: 75,
    requiredSessions: 0,
    requiredAssessments: 1,
    minPassingMarks: 40,
    requireApproval: true,
    checkAttendance: true,
    checkAssessments: true,
    checkMarks: true,
    checkSessions: false,
    checkDuration: false,
};

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
    branchId?: string | null;
    branchName?: string;
    startDate?: string | null;
    batchCount: number;
    studentCount: number;
    subjects: Array<{ subjectId: string; name: string }>;
    completionPolicy?: CourseCompletionPolicy;
    completion_policy?: CourseCompletionPolicy;
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

const emptyCourse = {
    title: '',
    code: '',
    category: '',
    level: '',
    branchId: '',
    startDate: '',
    durationMonths: '12',
    tuitionAmount: '',
    billingPeriod: 'monthly',
    isActive: true,
    subjects: [] as string[],
    completionPolicy: { ...defaultCompletionPolicy }
};

export default function CoursesPage() {
    const session = useSession();
    const branchScoped = !!session?.session.branchId;
    const userBranchId = session?.session.branchId;
    const searchParams = useSearchParams();
    const branchParam = searchParams.get('branchId');
    const { workspace, currency } = useWorkspace();
    const { data: courses, error, reload } = useApi<Course[]>('/courses?branchId=all');
    const { data: allBatches } = useApi<BatchItem[]>('/batches?branchId=all');
    const { data: branchesData } = useApi<Array<{ branchId: string; name: string; code?: string }>>('/branches');
    const branches = branchesData ?? workspace?.branches ?? [];
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState(emptyCourse);
    const [subjectInput, setSubjectInput] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
    const [branchFilter, setBranchFilter] = useState<string>(() => {
        if (branchParam && branchParam !== 'all') return branchParam;
        return userBranchId || 'all';
    });
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const PAGE_SIZE = 7;
    const [offset, setOffset] = useState(0);
    const canManage = can(session, 'courses.write');

    useEffect(() => {
        if (branchParam && branchParam !== 'all') {
            setBranchFilter(branchParam);
            setOffset(0);
        } else if (!branchParam) {
            setBranchFilter(userBranchId || 'all');
            setOffset(0);
        }
    }, [branchParam, userBranchId]);

    const openCreateCourse = () => {
        setMessage(null);
        setForm({
            ...emptyCourse,
            category: Object.keys(catalogue)[0] ?? '',
            branchId: branchScoped ? (userBranchId || '') : (branchFilter !== 'all' ? branchFilter : ''),
            isActive: statusFilter === 'draft' ? false : true
        });
        setCreating(true);
    };

    // Edit course state
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [editForm, setEditForm] = useState({
        courseId: '',
        title: '',
        code: '',
        category: '',
        level: '',
        branchId: '',
        startDate: '',
        durationMonths: '12',
        tuitionAmount: '',
        billingPeriod: 'monthly',
        isActive: true,
        subjects: [] as string[],
        completionPolicy: { ...defaultCompletionPolicy }
    });
    const [editSubjectInput, setEditSubjectInput] = useState('');

    // Quick-view batches state
    const [viewingBatchesCourse, setViewingBatchesCourse] = useState<Course | null>(null);

    // Delete course state
    const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const openDeleteConfirm = (course: Course) => {
        setDeleteError(null);
        setDeletingCourse(course);
    };

    const confirmDelete = async () => {
        if (!deletingCourse) return;
        setDeleteLoading(true);
        setDeleteError(null);
        try {
            await api(`/courses?courseId=${deletingCourse.courseId}`, {
                method: 'DELETE'
            });
            setDeletingCourse(null);
            reload();
        } catch (err) {
            setDeleteError((err as Error).message);
        } finally {
            setDeleteLoading(false);
        }
    };

    const catalogue = COURSE_CATALOGUE[getDomainKey(workspace?.organization.academyType ?? 'Other')] ?? COURSE_CATALOGUE.Other;
    // Categories of this type of academy, then those its courses already use
    const categories = [...new Set([
        ...getRecommendedCategories(workspace?.organization.academyType ?? 'Other'),
        ...(courses ?? []).map(c => c.category?.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    ])];
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

        const cleanCode = form.code.trim().toUpperCase();
        if (!cleanCode) {
            setMessage('Course Code is required.');
            return;
        }
        if (cleanCode.length > 30) {
            setMessage('Course Code cannot exceed 30 characters.');
            return;
        }
        if (!/^[A-Z0-9_\-\.\/]+$/.test(cleanCode)) {
            setMessage('Course Code can only contain letters, numbers, hyphens (-), underscores (_), dots (.), and slashes (/).');
            return;
        }
        if (form.level && form.level.trim().length > 50) {
            setMessage('Level cannot exceed 50 characters.');
            return;
        }

        try {
            await api('/courses', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    code: cleanCode,
                    level: form.level ? form.level.trim() : null,
                    branchId: form.branchId || null,
                    startDate: form.startDate ? form.startDate : null,
                    isActive: form.isActive,
                    completionPolicy: form.completionPolicy
                })
            });
            if (form.isActive === false && statusFilter === 'active') {
                setStatusFilter('draft');
            } else if (form.isActive === true && statusFilter === 'draft') {
                setStatusFilter('active');
            }
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
            branchId: course.branchId || '',
            startDate: course.startDate ? course.startDate.split('T')[0] : '',
            durationMonths: course.durationMonths ? String(course.durationMonths) : '12',
            tuitionAmount: String(course.tuitionAmount),
            billingPeriod: course.billingPeriod || 'monthly',
            isActive: course.isActive,
            subjects: course.subjects.map(s => s.name),
            completionPolicy: course.completionPolicy || course.completion_policy || { ...defaultCompletionPolicy }
        });
        setEditingCourse(course);
    };

    const submitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        const cleanCode = editForm.code.trim().toUpperCase();
        if (!cleanCode) {
            setMessage('Course Code is required.');
            return;
        }
        if (cleanCode.length > 30) {
            setMessage('Course Code cannot exceed 30 characters.');
            return;
        }
        if (!/^[A-Z0-9_\-\.\/]+$/.test(cleanCode)) {
            setMessage('Course Code can only contain letters, numbers, hyphens (-), underscores (_), dots (.), and slashes (/).');
            return;
        }
        if (editForm.level && editForm.level.trim().length > 50) {
            setMessage('Level cannot exceed 50 characters.');
            return;
        }

        try {
            await api('/courses', {
                method: 'PUT',
                body: JSON.stringify({
                    ...editForm,
                    code: cleanCode,
                    level: editForm.level ? editForm.level.trim() : null,
                    branchId: editForm.branchId || null,
                    startDate: editForm.startDate ? editForm.startDate : null,
                    durationMonths: editForm.durationMonths ? Number(editForm.durationMonths) : null,
                    tuitionAmount: Number(editForm.tuitionAmount),
                    completionPolicy: editForm.completionPolicy
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
        if (branchScoped && userBranchId) {
            if (c.branchId !== userBranchId) return false;
        } else if (branchFilter !== 'all') {
            if (c.branchId !== branchFilter) return false;
        }
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            c.title.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q) ||
            (c.branchName && c.branchName.toLowerCase().includes(q)) ||
            c.subjects.some(s => s.name.toLowerCase().includes(q))
        );
    }) ?? [];

    const totalPages = Math.ceil(filteredCourses.length / PAGE_SIZE) || 1;
    const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
    const paginatedCourses = filteredCourses.slice(offset, offset + PAGE_SIZE);

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

    return (
        <>
            <Topbar title="Courses" subtitle="Course catalogue with subjects, tuition and enrollment" />
            <div className="page-body" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Courses Toolbar */}
                <div className="cs-card" style={{
                    padding: '10px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)',
                            borderRadius: '10px', padding: '0 12px', height: '34px', boxSizing: 'border-box',
                            width: '260px'
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
                                onChange={e => {
                                    setSearch(e.target.value);
                                    setOffset(0);
                                }}
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        setOffset(0);
                                    }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--cs-text-muted)' }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '34px' }}>
                            {(['all', 'active', 'draft'] as const).map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter(s);
                                        setOffset(0);
                                    }}
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

                        {/* Branch filter - only visible to multi-branch users who are not restricted to a single branch */}
                        {!branchScoped && branches.length > 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cs-text-secondary)', whiteSpace: 'nowrap' }}>
                                    To view courses by branch, please select a branch:
                                </span>
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'var(--cs-surface-2)',
                                        border: `1px solid ${branchFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-border)'}`,
                                        borderRadius: '10px',
                                        padding: '0 10px',
                                        height: '34px',
                                        boxSizing: 'border-box',
                                        transition: 'all 0.15s ease',
                                        boxShadow: branchFilter !== 'all' ? '0 0 0 2px rgba(108, 99, 255, 0.12)' : 'none'
                                    }}
                                    title="Filter by Branch"
                                >
                                    <Building2 size={13} color={branchFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-muted)'} style={{ flexShrink: 0 }} />
                                    <select
                                        value={branchFilter}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setBranchFilter(val);
                                            setOffset(0);
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            outline: 'none',
                                            fontSize: '12px',
                                            fontWeight: branchFilter !== 'all' ? 600 : 500,
                                            color: branchFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-primary)',
                                            cursor: 'pointer',
                                            padding: '0 4px 0 0'
                                        }}
                                        aria-label="Filter courses by branch"
                                    >
                                        <option value="all">All Branches</option>
                                        {branches.map(b => (
                                            <option key={b.branchId} value={b.branchId}>
                                                {b.name} Branch
                                            </option>
                                        ))}
                                    </select>
                                    {branchFilter !== 'all' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBranchFilter('all');
                                                setOffset(0);
                                            }}
                                            style={{
                                                background: 'rgba(108, 99, 255, 0.12)',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '16px',
                                                height: '16px',
                                                cursor: 'pointer',
                                                padding: 0,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--cs-primary)',
                                                marginLeft: '2px',
                                                flexShrink: 0
                                            }}
                                            title="Reset filter to All Branches"
                                            aria-label="Reset filter to All Branches"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
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
                                onClick={openCreateCourse}
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
                                        <th style={{ padding: '8px 12px' }}>Course</th>
                                        <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Code</th>
                                        <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Category</th>
                                        <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Level</th>
                                        <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Branch</th>
                                        <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Fee</th>
                                        <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Billing</th>
                                        <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Duration</th>
                                        <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Batches</th>
                                        <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Status</th>
                                        <th style={{ width: '76px', textAlign: 'center', padding: '8px 10px', whiteSpace: 'nowrap' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCourses.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--cs-text-muted)' }}>
                                                <div style={{ fontSize: '13.5px', marginBottom: '12px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                                                    {courses.length === 0
                                                        ? 'No courses created yet.'
                                                        : branchFilter !== 'all'
                                                            ? `No courses found for ${branches.find(b => b.branchId === branchFilter)?.name || 'the selected branch'}.`
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
                                        paginatedCourses.map(c => (
                                            <tr key={c.courseId}>
                                                <td style={{ padding: '8px 12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: '7px', background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <BookOpen size={14} color="#6C63FF" />
                                                        </div>
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--cs-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }} title={c.title}>{c.title}</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '1px' }}>
                                                                {c.startDate && (
                                                                    <span style={{ fontSize: '10.5px', color: 'var(--cs-primary)', display: 'inline-flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
                                                                        <Calendar size={10} /> Starts: {new Date(c.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                    </span>
                                                                )}
                                                                {c.subjects.slice(0, 2).map(s => (
                                                                    <span key={s.subjectId} style={{ fontSize: '10px', background: 'var(--cs-surface-2)', padding: '1px 5px', borderRadius: '4px', color: 'var(--cs-text-muted)', whiteSpace: 'nowrap' }}>{s.name}</span>
                                                                ))}
                                                                {c.subjects.length > 2 && <span style={{ fontSize: '10px', color: 'var(--cs-text-muted)' }}>+{c.subjects.length - 2}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                                    <code style={{ fontSize: '11px', color: 'var(--cs-text-muted)', background: 'var(--cs-surface-2)', padding: '2px 5px', borderRadius: '4px' }}>{c.code}</code>
                                                </td>
                                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                                    <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                                                        <Tag size={10} style={{ marginRight: '4px' }} />{c.category}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', fontSize: '12.5px', color: 'var(--cs-text-secondary)' }}>
                                                    {c.level || '—'}
                                                </td>
                                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                                    <span className="badge badge-secondary" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <Building2 size={10} /> {c.branchName || 'All Branches'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', fontSize: '12.5px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>
                                                    {formatMoney(c.tuitionAmount, currency)}
                                                </td>
                                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', fontSize: '12.5px', color: 'var(--cs-text-secondary)', textTransform: 'capitalize' }}>
                                                    {c.billingPeriod}
                                                </td>
                                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', fontSize: '12.5px', color: 'var(--cs-text-muted)' }}>
                                                    {c.durationMonths ? `${c.durationMonths} mo` : '—'}
                                                </td>
                                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingBatchesCourse(c)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--cs-primary)',
                                                            fontSize: '11.5px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '3px',
                                                            padding: 0
                                                        }}
                                                        title="Click to view batches for this course"
                                                    >
                                                        <Calendar size={11} /> {c.batchCount} {c.batchCount === 1 ? 'batch' : 'batches'}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                                    <span className={`badge ${c.isActive ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '11px' }}>
                                                        {c.isActive ? 'active' : 'draft'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    {canManage && (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => startEdit(c)}
                                                                style={{
                                                                    width: '26px',
                                                                    height: '26px',
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
                                                                <Pencil size={12} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openDeleteConfirm(c)}
                                                                style={{
                                                                    width: '26px',
                                                                    height: '26px',
                                                                    padding: 0,
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    color: '#EF4444',
                                                                    background: 'rgba(239, 68, 68, 0.08)',
                                                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                                                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')}
                                                                title={`Delete ${c.title}`}
                                                                aria-label={`Delete ${c.title}`}
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 18px',
                            borderTop: '1px solid var(--cs-border-subtle)',
                            background: 'var(--cs-surface)',
                            flexWrap: 'wrap',
                            gap: '10px'
                        }}>
                            <span style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                                Showing {filteredCourses.length === 0 ? 0 : offset + 1}–{Math.min(offset + PAGE_SIZE, filteredCourses.length)} of {filteredCourses.length} courses
                            </span>
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        style={{
                                            padding: '5px 10px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            border: '1px solid var(--cs-border)',
                                            borderRadius: '8px',
                                            cursor: offset === 0 ? 'not-allowed' : 'pointer',
                                            opacity: offset === 0 ? 0.4 : 1,
                                            background: 'var(--cs-surface-2)',
                                            color: 'var(--cs-text-primary)',
                                            transition: 'all 0.15s ease'
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
                                                    type="button"
                                                    onClick={() => setOffset((pageNum - 1) * PAGE_SIZE)}
                                                    style={{
                                                        minWidth: '30px',
                                                        height: '30px',
                                                        padding: '0 6px',
                                                        fontSize: '12px',
                                                        fontWeight: isCurrent ? 700 : 500,
                                                        borderRadius: '6px',
                                                        border: isCurrent ? '1px solid var(--cs-primary)' : '1px solid var(--cs-border)',
                                                        background: isCurrent ? 'var(--cs-primary)' : 'var(--cs-surface-2)',
                                                        color: isCurrent ? '#ffffff' : 'var(--cs-text-primary)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease',
                                                        boxShadow: isCurrent ? '0 2px 6px rgba(108, 99, 255, 0.25)' : 'none'
                                                    }}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        style={{
                                            padding: '5px 10px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            border: '1px solid var(--cs-border)',
                                            borderRadius: '8px',
                                            cursor: offset + PAGE_SIZE >= filteredCourses.length ? 'not-allowed' : 'pointer',
                                            opacity: offset + PAGE_SIZE >= filteredCourses.length ? 0.4 : 1,
                                            background: 'var(--cs-surface-2)',
                                            color: 'var(--cs-text-primary)',
                                            transition: 'all 0.15s ease'
                                        }}
                                        disabled={offset + PAGE_SIZE >= filteredCourses.length}
                                        onClick={() => setOffset(offset + PAGE_SIZE)}
                                    >
                                        Next <ChevronRight size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px', width: '100%' }}>
                            {filteredCourses.length === 0 ? (
                                <div className="cs-card" style={{ padding: '40px 20px', textAlign: 'center', width: '100%', gridColumn: '1 / -1' }}>
                                    <div style={{ fontSize: '13.5px', marginBottom: '12px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                                        {courses.length === 0
                                            ? 'No courses created yet.'
                                            : branchFilter !== 'all'
                                                ? `No courses found for ${branches.find(b => b.branchId === branchFilter)?.name || 'the selected branch'}.`
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
                                paginatedCourses.map(c => (
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
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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
                                                        <button
                                                            type="button"
                                                            onClick={() => openDeleteConfirm(c)}
                                                            style={{
                                                                width: '28px',
                                                                height: '28px',
                                                                padding: 0,
                                                                borderRadius: '7px',
                                                                cursor: 'pointer',
                                                                color: '#EF4444',
                                                                background: 'rgba(239, 68, 68, 0.08)',
                                                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')}
                                                            title={`Delete ${c.title}`}
                                                            aria-label={`Delete ${c.title}`}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            <span className="badge badge-secondary"><Tag size={10} /> {c.category}</span>
                                            <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <Building2 size={10} /> {c.branchName || 'All Branches'}
                                            </span>
                                            {c.startDate && (
                                                <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Calendar size={10} /> Starts {new Date(c.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            )}
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
                                                    href={`/dashboard/batches?courseId=${c.courseId}&courseTitle=${encodeURIComponent(c.title)}${c.branchId ? `&branchId=${c.branchId}` : ''}`}
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

                        {/* Grid Pagination Bar */}
                        {filteredCourses.length > 0 && (
                            <div className="cs-card" style={{
                                width: '100%',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 18px',
                                background: 'var(--cs-surface)',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <span style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                                    Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, filteredCourses.length)} of {filteredCourses.length} courses
                                </span>
                                {totalPages > 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                            type="button"
                                            className="btn-ghost"
                                            style={{
                                                padding: '5px 10px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                border: '1px solid var(--cs-border)',
                                                borderRadius: '8px',
                                                cursor: offset === 0 ? 'not-allowed' : 'pointer',
                                                opacity: offset === 0 ? 0.4 : 1,
                                                background: 'var(--cs-surface-2)',
                                                color: 'var(--cs-text-primary)',
                                                transition: 'all 0.15s ease'
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
                                                        type="button"
                                                        onClick={() => setOffset((pageNum - 1) * PAGE_SIZE)}
                                                        style={{
                                                            minWidth: '30px',
                                                            height: '30px',
                                                            padding: '0 6px',
                                                            fontSize: '12px',
                                                            fontWeight: isCurrent ? 700 : 500,
                                                            borderRadius: '6px',
                                                            border: isCurrent ? '1px solid var(--cs-primary)' : '1px solid var(--cs-border)',
                                                            background: isCurrent ? 'var(--cs-primary)' : 'var(--cs-surface-2)',
                                                            color: isCurrent ? '#ffffff' : 'var(--cs-text-primary)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease',
                                                            boxShadow: isCurrent ? '0 2px 6px rgba(108, 99, 255, 0.25)' : 'none'
                                                        }}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            type="button"
                                            className="btn-ghost"
                                            style={{
                                                padding: '5px 10px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                border: '1px solid var(--cs-border)',
                                                borderRadius: '8px',
                                                cursor: offset + PAGE_SIZE >= filteredCourses.length ? 'not-allowed' : 'pointer',
                                                opacity: offset + PAGE_SIZE >= filteredCourses.length ? 0.4 : 1,
                                                background: 'var(--cs-surface-2)',
                                                color: 'var(--cs-text-primary)',
                                                transition: 'all 0.15s ease'
                                            }}
                                            disabled={offset + PAGE_SIZE >= filteredCourses.length}
                                            onClick={() => setOffset(offset + PAGE_SIZE)}
                                        >
                                            Next <ChevronRight size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
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
                                        href={`/dashboard/batches?courseId=${viewingBatchesCourse.courseId}&courseTitle=${encodeURIComponent(viewingBatchesCourse.title)}${viewingBatchesCourse.branchId ? `&branchId=${viewingBatchesCourse.branchId}` : ''}`}
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
                <Modal title={form.isActive ? 'Create Course' : 'Create Course (Draft)'} onClose={() => setCreating(false)} maxWidth="660px">
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                            <div>
                                <label className="cs-label">Course Title</label>
                                <input className="cs-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className="cs-label">Code *</label>
                                    <span style={{ fontSize: '11px', color: form.code.length >= 28 ? 'var(--cs-warning)' : 'var(--cs-text-muted)' }}>
                                        {form.code.length}/30
                                    </span>
                                </div>
                                <input
                                    className="cs-input"
                                    required
                                    maxLength={30}
                                    placeholder="e.g. SCI-10 or 101"
                                    value={form.code}
                                    onChange={e => {
                                        const clean = e.target.value.toUpperCase().replace(/[^A-Z0-9_\-\.\/]/g, '').slice(0, 30);
                                        setForm({ ...form, code: clean });
                                    }}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '3px' }}>
                                    Up to 30 characters (letters & numbers)
                                </div>
                            </div>
                            <div>
                                <label className="cs-label" htmlFor="course-categories">Category</label>
                                <CategorySelect id="course-categories" value={form.category} options={categories} onChange={category => setForm(f => ({ ...f, category }))} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className="cs-label">Level</label>
                                    <span style={{ fontSize: '11px', color: form.level.length >= 45 ? 'var(--cs-warning)' : 'var(--cs-text-muted)' }}>
                                        {form.level.length}/50
                                    </span>
                                </div>
                                <input
                                    className="cs-input"
                                    maxLength={50}
                                    placeholder="e.g. Class 10, Beginner"
                                    value={form.level}
                                    onChange={e => {
                                        const clean = e.target.value.slice(0, 50);
                                        setForm({ ...form, level: clean });
                                    }}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '3px' }}>
                                    Max 50 characters
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label className="cs-label">Branch</label>
                                {branchScoped ? (
                                    <input
                                        className="cs-input"
                                        disabled
                                        value={`${branches.find(b => b.branchId === userBranchId)?.name || 'Your'} Branch`}
                                        style={{ background: 'var(--cs-surface-2)', cursor: 'not-allowed' }}
                                    />
                                ) : (
                                    <select
                                        className="cs-input"
                                        value={form.branchId || 'all'}
                                        onChange={e => setForm({ ...form, branchId: e.target.value === 'all' ? '' : e.target.value })}
                                    >
                                        <option value="all">— All Branches —</option>
                                        {branches.map(b => (
                                            <option key={b.branchId} value={b.branchId}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '3px' }}>
                                    {branchScoped ? 'Course will be created for your assigned branch' : 'Select the branch offering this course, or leave as All Branches'}
                                </div>
                            </div>
                            <div>
                                <label className="cs-label">Start Date</label>
                                <input
                                    type="date"
                                    className="cs-input"
                                    value={form.startDate}
                                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '3px' }}>
                                    Select the date when this course starts
                                </div>
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
                            <label className="cs-label">Status</label>
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '6px' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: form.isActive ? 600 : 400 }}>
                                    <input
                                        type="radio"
                                        name="createCourseStatus"
                                        checked={form.isActive === true}
                                        onChange={() => setForm({ ...form, isActive: true })}
                                    />
                                    Active
                                </label>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: !form.isActive ? 600 : 400 }}>
                                    <input
                                        type="radio"
                                        name="createCourseStatus"
                                        checked={form.isActive === false}
                                        onChange={() => setForm({ ...form, isActive: false })}
                                    />
                                    Draft
                                </label>
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

                        {/* Course Completion Settings */}
                        <div style={{
                            border: '1px solid var(--cs-border, #e2e8f0)',
                            borderRadius: '10px',
                            padding: '14px',
                            background: 'var(--cs-card-bg, #ffffff)',
                            marginTop: '4px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Award size={18} style={{ color: '#4f46e5' }} />
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary, #0f172a)' }}>
                                            Course Completion Criteria
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted, #64748b)' }}>
                                            Configure automatic eligibility requirements for students to graduate
                                        </div>
                                    </div>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                                    <input
                                        type="checkbox"
                                        checked={form.completionPolicy?.enabled ?? true}
                                        onChange={e => setForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, enabled: e.target.checked } }))}
                                        style={{ width: '16px', height: '16px', accentColor: '#4f46e5', cursor: 'pointer' }}
                                    />
                                    <span>Enable Policy</span>
                                </label>
                            </div>

                            {(form.completionPolicy?.enabled ?? true) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                                        {/* Attendance */}
                                        <div style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={form.completionPolicy?.checkAttendance ?? true}
                                                    onChange={e => setForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, checkAttendance: e.target.checked } }))}
                                                    style={{ accentColor: '#4f46e5' }}
                                                />
                                                Min Attendance
                                            </label>
                                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    disabled={!(form.completionPolicy?.checkAttendance ?? true)}
                                                    value={form.completionPolicy?.minAttendancePct ?? 75}
                                                    onChange={e => setForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, minAttendancePct: Math.max(1, Math.min(100, Number(e.target.value))) } }))}
                                                    className="cs-input"
                                                    style={{ height: '30px', fontSize: '12px' }}
                                                />
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>%</span>
                                            </div>
                                        </div>

                                        {/* Assessments */}
                                        <div style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={form.completionPolicy?.checkAssessments ?? true}
                                                    onChange={e => setForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, checkAssessments: e.target.checked } }))}
                                                    style={{ accentColor: '#4f46e5' }}
                                                />
                                                Required Tests
                                            </label>
                                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="50"
                                                    disabled={!(form.completionPolicy?.checkAssessments ?? true)}
                                                    value={form.completionPolicy?.requiredAssessments ?? 1}
                                                    onChange={e => setForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, requiredAssessments: Math.max(0, Number(e.target.value)) } }))}
                                                    className="cs-input"
                                                    style={{ height: '30px', fontSize: '12px' }}
                                                />
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>tests</span>
                                            </div>
                                        </div>

                                        {/* Passing Marks */}
                                        <div style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={form.completionPolicy?.checkMarks ?? true}
                                                    onChange={e => setForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, checkMarks: e.target.checked } }))}
                                                    style={{ accentColor: '#4f46e5' }}
                                                />
                                                Passing Marks
                                            </label>
                                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    disabled={!(form.completionPolicy?.checkMarks ?? true)}
                                                    value={form.completionPolicy?.minPassingMarks ?? 40}
                                                    onChange={e => setForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, minPassingMarks: Math.max(1, Math.min(100, Number(e.target.value))) } }))}
                                                    className="cs-input"
                                                    style={{ height: '30px', fontSize: '12px' }}
                                                />
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>%</span>
                                            </div>
                                        </div>

                                        {/* Required Sessions */}
                                        <div style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={form.completionPolicy?.checkSessions ?? false}
                                                    onChange={e => setForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, checkSessions: e.target.checked } }))}
                                                    style={{ accentColor: '#4f46e5' }}
                                                />
                                                Min Sessions
                                            </label>
                                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="500"
                                                    disabled={!(form.completionPolicy?.checkSessions ?? false)}
                                                    value={form.completionPolicy?.requiredSessions ?? 0}
                                                    onChange={e => setForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, requiredSessions: Math.max(0, Number(e.target.value)) } }))}
                                                    className="cs-input"
                                                    style={{ height: '30px', fontSize: '12px' }}
                                                />
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>classes</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Duration & Approval */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '2px', fontSize: '12px', color: '#334155' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={form.completionPolicy?.checkDuration ?? false}
                                                onChange={e => setForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, checkDuration: e.target.checked } }))}
                                                style={{ accentColor: '#4f46e5' }}
                                            />
                                            <span>Require course duration ({form.durationMonths || '12'} mo) to elapse</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={form.completionPolicy?.requireApproval ?? true}
                                                onChange={e => setForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, requireApproval: e.target.checked } }))}
                                                style={{ accentColor: '#4f46e5' }}
                                            />
                                            <span>Require teacher / branch manager approval</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {message && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{message}</div>}
                        <button className="btn-primary" type="submit" disabled={form.subjects.length === 0} style={{ alignSelf: 'flex-end' }}>
                            {form.isActive ? 'Create Course' : 'Save Draft Course'}
                        </button>
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className="cs-label">Code *</label>
                                    <span style={{ fontSize: '11px', color: editForm.code.length >= 28 ? 'var(--cs-warning)' : 'var(--cs-text-muted)' }}>
                                        {editForm.code.length}/30
                                    </span>
                                </div>
                                <input
                                    className="cs-input"
                                    required
                                    maxLength={30}
                                    placeholder="e.g. SCI-10 or 101"
                                    value={editForm.code}
                                    onChange={e => {
                                        const clean = e.target.value.toUpperCase().replace(/[^A-Z0-9_\-\.\/]/g, '').slice(0, 30);
                                        setEditForm({ ...editForm, code: clean });
                                    }}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '3px' }}>
                                    Up to 30 characters (letters & numbers)
                                </div>
                            </div>
                            <div>
                                <label className="cs-label" htmlFor="edit-course-categories">Category</label>
                                <CategorySelect id="edit-course-categories" value={editForm.category} options={categories} onChange={category => setEditForm(f => ({ ...f, category }))} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className="cs-label">Level</label>
                                    <span style={{ fontSize: '11px', color: editForm.level.length >= 45 ? 'var(--cs-warning)' : 'var(--cs-text-muted)' }}>
                                        {editForm.level.length}/50
                                    </span>
                                </div>
                                <input
                                    className="cs-input"
                                    maxLength={50}
                                    placeholder="e.g. Class 10, Beginner"
                                    value={editForm.level}
                                    onChange={e => {
                                        const clean = e.target.value.slice(0, 50);
                                        setEditForm({ ...editForm, level: clean });
                                    }}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '3px' }}>
                                    Max 50 characters
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label className="cs-label">Branch</label>
                                {branchScoped ? (
                                    <input
                                        className="cs-input"
                                        disabled
                                        value={`${branches.find(b => b.branchId === userBranchId)?.name || 'Your'} Branch`}
                                        style={{ background: 'var(--cs-surface-2)', cursor: 'not-allowed' }}
                                    />
                                ) : (
                                    <select
                                        className="cs-input"
                                        value={editForm.branchId || 'all'}
                                        onChange={e => setEditForm({ ...editForm, branchId: e.target.value === 'all' ? '' : e.target.value })}
                                    >
                                        <option value="all">— All Branches —</option>
                                        {branches.map(b => (
                                            <option key={b.branchId} value={b.branchId}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '3px' }}>
                                    {branchScoped ? 'Course belongs to your assigned branch' : 'Select the branch offering this course, or leave as All Branches'}
                                </div>
                            </div>
                            <div>
                                <label className="cs-label">Start Date</label>
                                <input
                                    type="date"
                                    className="cs-input"
                                    value={editForm.startDate}
                                    onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '3px' }}>
                                    Date when this course is scheduled to start
                                </div>
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

                        {/* Course Completion Settings */}
                        <div style={{
                            border: '1px solid var(--cs-border, #e2e8f0)',
                            borderRadius: '10px',
                            padding: '14px',
                            background: 'var(--cs-card-bg, #ffffff)',
                            marginTop: '4px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Award size={18} style={{ color: '#4f46e5' }} />
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary, #0f172a)' }}>
                                            Course Completion Criteria
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted, #64748b)' }}>
                                            Configure automatic eligibility requirements for students to graduate
                                        </div>
                                    </div>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                                    <input
                                        type="checkbox"
                                        checked={editForm.completionPolicy?.enabled ?? true}
                                        onChange={e => setEditForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, enabled: e.target.checked } }))}
                                        style={{ width: '16px', height: '16px', accentColor: '#4f46e5', cursor: 'pointer' }}
                                    />
                                    <span>Enable Policy</span>
                                </label>
                            </div>

                            {(editForm.completionPolicy?.enabled ?? true) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                                        {/* Attendance */}
                                        <div style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.completionPolicy?.checkAttendance ?? true}
                                                    onChange={e => setEditForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, checkAttendance: e.target.checked } }))}
                                                    style={{ accentColor: '#4f46e5' }}
                                                />
                                                Min Attendance
                                            </label>
                                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    disabled={!(editForm.completionPolicy?.checkAttendance ?? true)}
                                                    value={editForm.completionPolicy?.minAttendancePct ?? 75}
                                                    onChange={e => setEditForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, minAttendancePct: Math.max(1, Math.min(100, Number(e.target.value))) } }))}
                                                    className="cs-input"
                                                    style={{ height: '30px', fontSize: '12px' }}
                                                />
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>%</span>
                                            </div>
                                        </div>

                                        {/* Assessments */}
                                        <div style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.completionPolicy?.checkAssessments ?? true}
                                                    onChange={e => setEditForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, checkAssessments: e.target.checked } }))}
                                                    style={{ accentColor: '#4f46e5' }}
                                                />
                                                Required Tests
                                            </label>
                                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="50"
                                                    disabled={!(editForm.completionPolicy?.checkAssessments ?? true)}
                                                    value={editForm.completionPolicy?.requiredAssessments ?? 1}
                                                    onChange={e => setEditForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, requiredAssessments: Math.max(0, Number(e.target.value)) } }))}
                                                    className="cs-input"
                                                    style={{ height: '30px', fontSize: '12px' }}
                                                />
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>tests</span>
                                            </div>
                                        </div>

                                        {/* Passing Marks */}
                                        <div style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.completionPolicy?.checkMarks ?? true}
                                                    onChange={e => setEditForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, checkMarks: e.target.checked } }))}
                                                    style={{ accentColor: '#4f46e5' }}
                                                />
                                                Passing Marks
                                            </label>
                                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    disabled={!(editForm.completionPolicy?.checkMarks ?? true)}
                                                    value={editForm.completionPolicy?.minPassingMarks ?? 40}
                                                    onChange={e => setEditForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, minPassingMarks: Math.max(1, Math.min(100, Number(e.target.value))) } }))}
                                                    className="cs-input"
                                                    style={{ height: '30px', fontSize: '12px' }}
                                                />
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>%</span>
                                            </div>
                                        </div>

                                        {/* Required Sessions */}
                                        <div style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.completionPolicy?.checkSessions ?? false}
                                                    onChange={e => setEditForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, checkSessions: e.target.checked } }))}
                                                    style={{ accentColor: '#4f46e5' }}
                                                />
                                                Min Sessions
                                            </label>
                                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="500"
                                                    disabled={!(editForm.completionPolicy?.checkSessions ?? false)}
                                                    value={editForm.completionPolicy?.requiredSessions ?? 0}
                                                    onChange={e => setEditForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, requiredSessions: Math.max(0, Number(e.target.value)) } }))}
                                                    className="cs-input"
                                                    style={{ height: '30px', fontSize: '12px' }}
                                                />
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>classes</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Duration & Approval */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '2px', fontSize: '12px', color: '#334155' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={editForm.completionPolicy?.checkDuration ?? false}
                                                onChange={e => setEditForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, checkDuration: e.target.checked } }))}
                                                style={{ accentColor: '#4f46e5' }}
                                            />
                                            <span>Require course duration ({editForm.durationMonths || '12'} mo) to elapse</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={editForm.completionPolicy?.requireApproval ?? true}
                                                onChange={e => setEditForm(f => ({ ...f, completionPolicy: { ...f.completionPolicy, requireApproval: e.target.checked } }))}
                                                style={{ accentColor: '#4f46e5' }}
                                            />
                                            <span>Require teacher / branch manager approval</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {message && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{message}</div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    const toDelete = editingCourse;
                                    setEditingCourse(null);
                                    openDeleteConfirm(toDelete);
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#EF4444',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    padding: '7px 12px',
                                    borderRadius: '8px',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')}
                            >
                                <Trash2 size={14} /> Delete Course
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-secondary" type="button" onClick={() => setEditingCourse(null)}>Cancel</button>
                                <button className="btn-primary" type="submit" disabled={editForm.subjects.length === 0}>Save Changes</button>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Course Confirmation Modal */}
            {deletingCourse && (
                <Modal title="Delete Course" onClose={() => { if (!deleteLoading) setDeletingCourse(null); }} maxWidth="480px">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#EF4444',
                                flexShrink: 0
                            }}>
                                <Trash2 size={22} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>
                                    Delete {deletingCourse.title}?
                                </h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--cs-text-muted)', lineHeight: 1.5 }}>
                                    Are you sure you want to permanently delete this {deletingCourse.isActive ? 'active' : 'draft'} course (<code>{deletingCourse.code}</code>)? This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        {/* Course summary pill */}
                        <div style={{
                            padding: '12px 14px',
                            background: 'var(--cs-surface-2)',
                            borderRadius: '10px',
                            border: '1px solid var(--cs-border)',
                            fontSize: '13px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--cs-text-muted)' }}>Status:</span>
                                <span className={`badge ${deletingCourse.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                    {deletingCourse.isActive ? 'Active' : 'Draft'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--cs-text-muted)' }}>Category:</span>
                                <strong style={{ color: 'var(--cs-text-primary)' }}>{deletingCourse.category}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--cs-text-muted)' }}>Associated Batches:</span>
                                <strong style={{ color: deletingCourse.batchCount > 0 ? '#EF4444' : 'var(--cs-text-primary)' }}>
                                    {deletingCourse.batchCount} batch(es)
                                </strong>
                            </div>
                        </div>

                        {/* Warning if batches exist */}
                        {deletingCourse.batchCount > 0 && (
                            <div style={{
                                padding: '10px 12px',
                                background: '#FFFBEB',
                                border: '1px solid #FCD34D',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: '#92400E',
                                fontSize: '12px',
                                lineHeight: 1.4
                            }}>
                                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                                <span>
                                    This course currently has <strong>{deletingCourse.batchCount} active batch(es)</strong> assigned. Please reassign or delete those batches first, or set this course status to <strong>Draft</strong>.
                                </span>
                            </div>
                        )}

                        {deleteError && (
                            <div style={{
                                padding: '10px 12px',
                                background: '#FEF2F2',
                                border: '1px solid #FCA5A5',
                                borderRadius: '8px',
                                color: '#991B1B',
                                fontSize: '12px',
                                lineHeight: 1.4
                            }}>
                                {deleteError}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--cs-border)' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setDeletingCourse(null)}
                                disabled={deleteLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deleteLoading || deletingCourse.batchCount > 0}
                                style={{
                                    background: deletingCourse.batchCount > 0 ? '#9CA3AF' : '#EF4444',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: deletingCourse.batchCount > 0 || deleteLoading ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Trash2 size={14} />
                                {deleteLoading ? 'Deleting...' : 'Delete Course'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
