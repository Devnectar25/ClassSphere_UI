'use client';
import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import { MapPin, ArrowLeft, X, Filter, Calendar as CalendarIcon, Plus, Trash2, Pencil, Search, Clock, BookOpen, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, useApi, initials } from '@/lib/api';
import { can, useSession, selectBranch } from '@/lib/session';
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
    const branchScoped = !!session?.session.branchId;
    const { workspace } = useWorkspace();
    const searchParams = useSearchParams();
    const courseIdParam = searchParams.get('courseId');
    const courseTitleParam = searchParams.get('courseTitle') || searchParams.get('course');
    const branchParam = searchParams.get('branchId');

    const [activeTab, setActiveTab] = useState('batches');
    const { data: batches, error, reload } = useApi<Batch[]>('/batches?branchId=all');
    const { data: courses } = useApi<Array<{ courseId: string; title: string; code: string; branchId?: string | null; branchName?: string }>>('/courses?branchId=all');
    const { data: staffList } = useApi<Array<{ userId: string; fullName: string; role: string }>>('/staff');
    const [selectedCourse, setSelectedCourse] = useState<string>('all');
    const [branchFilter, setBranchFilter] = useState<string>(() => {
        if (branchParam && branchParam !== 'all') return branchParam;
        return session?.session.branchId || 'all';
    });
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        setCurrentPage(1);
    }, [branchFilter, selectedCourse, search]);

    useEffect(() => {
        if (branchParam && branchParam !== 'all') {
            setBranchFilter(branchParam);
        } else if (!branchParam) {
            setBranchFilter(session?.session.branchId || 'all');
        }
    }, [branchParam, session?.session.branchId]);

    // Add Batch modal state
    const [showAddBatch, setShowAddBatch] = useState(false);
    const [batchForm, setBatchForm] = useState(emptyBatchForm);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const canManage = can(session, 'courses.write') || can(session, 'academics.read');

    // Batches belonging to the selected branch filter (or all batches)
    const branchBatches = useMemo(() => {
        if (!batches) return [];
        if (branchFilter === 'all') return batches;
        return batches.filter(b =>
            (b.branchId && b.branchId === branchFilter) ||
            (b.branchName && workspace?.branches?.find(br => br.branchId === branchFilter)?.name.toLowerCase() === b.branchName.toLowerCase())
        );
    }, [batches, branchFilter, workspace?.branches]);

    // Unique courses filtered according to the selected branch
    const courseOptions = useMemo(() => {
        const map = new Map<string, { id: string; title: string }>();

        if (branchFilter === 'all') {
            // Include all courses from batches
            (batches ?? []).forEach(b => {
                const id = b.courseId || b.courseTitle;
                if (!map.has(id)) {
                    map.set(id, { id, title: b.courseTitle });
                }
            });
            // Also include courses from catalogue
            (courses ?? []).forEach(c => {
                if (!map.has(c.courseId)) {
                    map.set(c.courseId, { id: c.courseId, title: c.title });
                }
            });
        } else {
            // For a specific branch:
            // 1. Add courses that have batches in this branch
            branchBatches.forEach(b => {
                const id = b.courseId || b.courseTitle;
                if (!map.has(id)) {
                    map.set(id, { id, title: b.courseTitle });
                }
            });

            // 2. Add courses specifically catalogued for this branch
            const currentBranch = workspace?.branches?.find(br => br.branchId === branchFilter);
            (courses ?? []).forEach(c => {
                const matchesBranch = (c.branchId && c.branchId === branchFilter) ||
                    (currentBranch && c.branchName && c.branchName.toLowerCase() === currentBranch.name.toLowerCase());
                if (matchesBranch && !map.has(c.courseId)) {
                    map.set(c.courseId, { id: c.courseId, title: c.title });
                }
            });
        }

        return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
    }, [batches, courses, branchFilter, branchBatches, workspace?.branches]);

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

    // Automatically reset selected course if it doesn't belong to the active branch filter
    useEffect(() => {
        if (selectedCourse === 'all') return;
        if (!batches && !courses) return;
        if (courseOptions.length === 0) return;

        const isMatch = courseOptions.some(
            c => c.id === selectedCourse || c.title.toLowerCase() === selectedCourse.toLowerCase()
        );
        if (!isMatch) {
            setSelectedCourse('all');
            const params = new URLSearchParams();
            if (branchFilter !== 'all') params.set('branchId', branchFilter);
            const qs = params.toString();
            router.replace(qs ? `/dashboard/batches?${qs}` : '/dashboard/batches');
        }
    }, [selectedCourse, courseOptions, branchFilter, batches, courses, router]);

    const handleBranchChange = (newBranch: string) => {
        setBranchFilter(newBranch);

        // Check if current course is valid for new branch
        let validCourse = selectedCourse;
        if (newBranch !== 'all' && selectedCourse !== 'all') {
            const currentBranchObj = workspace?.branches?.find(br => br.branchId === newBranch);
            const isValidInBatches = batches?.some(b => {
                const matchesBranch = (b.branchId && b.branchId === newBranch) ||
                    (currentBranchObj && b.branchName && b.branchName.toLowerCase() === currentBranchObj.name.toLowerCase());
                return matchesBranch && ((b.courseId && b.courseId === selectedCourse) || b.courseTitle.toLowerCase() === selectedCourse.toLowerCase());
            });
            const isValidInCourses = courses?.some(c => {
                const matchesBranch = (c.branchId && c.branchId === newBranch) ||
                    (currentBranchObj && c.branchName && c.branchName.toLowerCase() === currentBranchObj.name.toLowerCase());
                return matchesBranch && (c.courseId === selectedCourse || c.title.toLowerCase() === selectedCourse.toLowerCase());
            });

            if (!isValidInBatches && !isValidInCourses) {
                validCourse = 'all';
                setSelectedCourse('all');
            }
        }

        const params = new URLSearchParams();
        if (newBranch !== 'all') params.set('branchId', newBranch);
        if (validCourse !== 'all') params.set('courseId', validCourse);
        const qs = params.toString();
        router.push(qs ? `/dashboard/batches?${qs}` : '/dashboard/batches');
    };

    const handleCourseChange = (newCourse: string) => {
        setSelectedCourse(newCourse);
        const params = new URLSearchParams();
        if (branchFilter !== 'all') params.set('branchId', branchFilter);
        if (newCourse !== 'all') params.set('courseId', newCourse);
        const qs = params.toString();
        router.push(qs ? `/dashboard/batches?${qs}` : '/dashboard/batches');
    };

    // Branch the page is limited to: the account's own, or the branch view selected at the top
    const viewBranchId = session?.session.branchId ?? session?.selectedBranchId ?? null;
    const viewBranch = viewBranchId ? workspace?.branches.find(b => b.branchId === viewBranchId) : undefined;
    const branchOf = (courseId: string) => courses?.find(c => c.courseId === courseId)?.branchId ?? null;
    const courseChoices = (courses ?? []).filter(c => !viewBranchId || !c.branchId || c.branchId === viewBranchId || c.courseId === batchForm.courseId);
    // A course of one branch has its batches there; the stored branch of an older batch stays visible
    const courseBranchId = branchOf(batchForm.courseId);
    const editedBatch = batchForm.batchId ? batches?.find(b => b.batchId === batchForm.batchId) : undefined;
    const branchChoices = (workspace?.branches ?? []).filter(b => !courseBranchId || b.branchId === courseBranchId
        || (editedBatch?.branchId === b.branchId && editedBatch?.courseId === batchForm.courseId));
    const branchMismatch = Boolean(courseBranchId && batchForm.branchId && batchForm.branchId !== courseBranchId);

    const openAddBatch = () => {
        const effectiveBranchId = (branchFilter !== 'all' ? branchFilter : null) || viewBranchId;
        const inView = (courses ?? []).filter(c => !effectiveBranchId || !c.branchId || c.branchId === effectiveBranchId);
        const defaultCourse = selectedCourse !== 'all' ? selectedCourse : (inView[0]?.courseId ?? '');
        const defaultBranch = branchOf(defaultCourse) || effectiveBranchId || workspace?.branches?.[0]?.branchId || '';
        setBatchForm({
            ...emptyBatchForm,
            batchId: undefined,
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
        if (branchFilter !== 'all') {
            const matchesBranch = (b.branchId && b.branchId === branchFilter) ||
                (b.branchName && workspace?.branches.find(br => br.branchId === branchFilter)?.name.toLowerCase() === b.branchName.toLowerCase());
            if (!matchesBranch) return false;
        }
        if (selectedCourse !== 'all') {
            const matchesCourse = (b.courseId && b.courseId === selectedCourse) ||
                b.courseTitle.toLowerCase() === selectedCourse.toLowerCase();
            if (!matchesCourse) return false;
        }
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            b.name.toLowerCase().includes(q) ||
            b.courseTitle.toLowerCase().includes(q) ||
            b.branchName.toLowerCase().includes(q) ||
            (b.instructorName && b.instructorName.toLowerCase().includes(q)) ||
            (b.room && b.room.toLowerCase().includes(q))
        );
    }) ?? [];

    const totalBatches = filteredBatches.length;
    const totalPages = Math.max(1, Math.ceil(totalBatches / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(safePage * pageSize, totalBatches);
    const paginatedBatches = filteredBatches.slice(startIndex, startIndex + pageSize);

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

    const activeCourseObj = courseOptions.find(c => c.id === selectedCourse || c.title.toLowerCase() === selectedCourse.toLowerCase());
    const activeCourseTitle = activeCourseObj?.title || courseTitleParam || (selectedCourse !== 'all' ? selectedCourse : null);

    // Filter staff for instructors
    const instructors = staffList?.filter(s => s.role === 'Instructor' || s.role === 'TenantAdmin') || staffList || [];

    return (
        <div className="page-body" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            {viewBranch && batches?.length === 0 && (
                <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', padding: '12px 18px', background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>
                    <span><strong>{viewBranch.name}</strong> has no batches yet, so its timetable is empty. {session?.session.branchId ? '' : 'You are viewing this branch only.'}</span>
                    {!session?.session.branchId && <button type="button" className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => selectBranch(null)}>Show all branches</button>}
                </div>
            )}
            {/* Filter banner if filtered by branch */}
            {branchFilter !== 'all' && selectedCourse === 'all' && (
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
                        <Building2 size={15} color="var(--cs-primary)" />
                        <span style={{ color: 'var(--cs-text-secondary)' }}>Showing batches for branch:</span>
                        <span style={{ fontWeight: 700, color: 'var(--cs-primary)', fontSize: '14px' }}>
                            {workspace?.branches.find(b => b.branchId === branchFilter)?.name || 'Selected'} Branch
                        </span>
                        <span className="badge badge-primary">{filteredBatches.length} {filteredBatches.length === 1 ? 'batch' : 'batches'}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            handleBranchChange('all');
                        }}
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
                        <X size={12} /> Show All Branches
                    </button>
                </div>
            )}

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
                        {branchFilter !== 'all' && (
                            <span style={{ color: 'var(--cs-text-muted)', fontSize: '12.5px', fontWeight: 500 }}>
                                • {workspace?.branches.find(b => b.branchId === branchFilter)?.name} Branch
                            </span>
                        )}
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
                width: '100%',
                marginBottom: '16px'
            }}>
                {/* Left: Segmented Tabs */}
                <div style={{
                    display: 'inline-flex',
                    background: 'var(--cs-surface-2)',
                    padding: '3px',
                    borderRadius: '10px',
                    border: '1px solid var(--cs-border)'
                }}>
                    {[
                        { id: 'batches', label: 'Batches', count: filteredBatches.length },
                        { id: 'schedule', label: 'Weekly Schedule' }
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    border: 'none',
                                    background: isActive ? '#ffffff' : 'transparent',
                                    color: isActive ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '12.5px',
                                    padding: '7px 16px',
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
                                {tab.count !== undefined && (
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
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Right Controls: Search, Course Filter, Add Batch Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                    {/* Search Input */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--cs-surface-2)',
                        border: '1px solid var(--cs-border)',
                        borderRadius: '10px',
                        padding: '0 12px',
                        height: '38px',
                        minWidth: '220px',
                        boxSizing: 'border-box'
                    }}>
                        <Search size={14} color="var(--cs-text-muted)" style={{ flexShrink: 0 }} />
                        <input
                            placeholder="Search batches..."
                            style={{
                                background: 'none',
                                border: 'none',
                                outline: 'none',
                                padding: 0,
                                height: '100%',
                                fontSize: '13px',
                                width: '100%',
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

                    {/* Branch Filter Dropdown */}
                    {!branchScoped && (workspace?.branches?.length ?? 0) > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'var(--cs-surface-2)',
                            border: `1px solid ${branchFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-border)'}`,
                            borderRadius: '10px',
                            padding: '0 12px',
                            height: '38px',
                            boxShadow: branchFilter !== 'all' ? '0 0 0 2px rgba(108, 99, 255, 0.12)' : 'none'
                        }}>
                            <Building2 size={13} color={branchFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-muted)'} style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)', fontWeight: 600 }}>Branch:</span>
                            <select
                                value={branchFilter}
                                onChange={e => handleBranchChange(e.target.value)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    color: branchFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-primary)',
                                    cursor: 'pointer'
                                }}
                                aria-label="Filter batches by branch"
                            >
                                <option value="all">All Branches</option>
                                {workspace?.branches.map(b => (
                                    <option key={b.branchId} value={b.branchId}>{b.name} Branch</option>
                                ))}
                            </select>
                            {branchFilter !== 'all' && (
                                <button
                                    type="button"
                                    onClick={() => handleBranchChange('all')}
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
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    )}

                    {/* Course Filter Dropdown */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--cs-surface-2)',
                        border: '1px solid var(--cs-border)',
                        borderRadius: '10px',
                        padding: '0 12px',
                        height: '38px'
                    }}>
                        <Filter size={13} color="var(--cs-primary)" />
                        <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)', fontWeight: 600 }}>Course:</span>
                        <select
                            value={selectedCourse}
                            onChange={e => handleCourseChange(e.target.value)}
                            style={{
                                background: 'none',
                                border: 'none',
                                outline: 'none',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                color: 'var(--cs-text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">All Courses ({branchBatches.length} {branchBatches.length === 1 ? 'batch' : 'batches'})</option>
                            {courseOptions.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Add Batch Button */}
                    {canManage && (
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={openAddBatch}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                padding: '0 18px',
                                fontSize: '13px',
                                fontWeight: 700,
                                borderRadius: '10px',
                                cursor: 'pointer',
                                height: '38px',
                                boxShadow: '0 2px 8px rgba(108, 99, 255, 0.28)'
                            }}
                        >
                            <Plus size={16} /> Add Batch
                        </button>
                    )}
                </div>
            </div>

            {!batches ? <PageState error={error} /> : activeTab === 'batches' ? (
                <div className="cs-card" style={{ width: '100%', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--cs-border)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table className="cs-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--cs-surface-2)', borderBottom: '1px solid var(--cs-border)' }}>
                                    <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Batch</th>
                                    <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Course</th>
                                    <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Instructor</th>
                                    <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Schedule</th>
                                    <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Venue</th>
                                    <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Capacity</th>
                                    <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'center' }}>Status</th>
                                    {canManage && <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'right' }}>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBatches.length === 0 ? (
                                    <tr>
                                        <td colSpan={canManage ? 8 : 7} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--cs-text-muted)' }}>
                                            <div style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                                                {batches.length === 0 ? 'No batches created yet.' : 'No batches match your search or filter.'}
                                            </div>
                                            {selectedCourse !== 'all' || search ? (
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button type="button" className="btn-secondary" onClick={() => { handleCourseChange('all'); setSearch(''); }}>
                                                        Show All Batches
                                                    </button>
                                                    {canManage && (
                                                        <button type="button" className="btn-primary" onClick={openAddBatch} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                            <Plus size={14} /> Create Batch
                                                        </button>
                                                    )}
                                                </div>
                                            ) : canManage ? (
                                                <button type="button" className="btn-primary" onClick={openAddBatch} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <Plus size={14} /> Create First Batch
                                                </button>
                                            ) : null}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedBatches.map(b => {
                                        const fillPct = b.capacity > 0 ? Math.round((b.enrolledCount / b.capacity) * 100) : 0;
                                        const isHigh = fillPct >= 90;
                                        const isMed = fillPct >= 75;
                                        const badgeBg = isHigh ? '#FEF2F2' : isMed ? '#FFFBEB' : '#ECFDF5';
                                        const badgeColor = isHigh ? '#DC2626' : isMed ? '#D97706' : '#059669';
                                        const badgeBorder = isHigh ? '#FECACA' : isMed ? '#FDE68A' : '#A7F3D0';
                                        const progressFill = isHigh ? '#EF4444' : isMed ? '#F59E0B' : '#10B981';
                                        const first = b.schedules[0];

                                        return (
                                            <tr key={b.batchId} style={{ borderBottom: '1px solid var(--cs-border)', transition: 'background 0.15s ease' }}>
                                                {/* Batch + Branch */}
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
                                                            <CalendarIcon size={18} color="var(--cs-primary)" />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--cs-text-primary)', letterSpacing: '-0.01em' }}>
                                                                {b.name}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                                                                <span style={{
                                                                    fontSize: '11px',
                                                                    color: 'var(--cs-text-secondary)',
                                                                    background: 'var(--cs-surface-2)',
                                                                    padding: '1px 6px',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid var(--cs-border)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '3px',
                                                                    fontWeight: 500
                                                                }}>
                                                                    <MapPin size={9} color="var(--cs-primary)" /> {b.branchName}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Course */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                    <span style={{
                                                        fontSize: '13px',
                                                        fontWeight: 700,
                                                        color: 'var(--cs-text-primary)'
                                                    }}>
                                                        {b.courseTitle}
                                                    </span>
                                                </td>

                                                {/* Instructor */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                    {b.instructorName ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                                                            <div style={{
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: '50%',
                                                                background: 'linear-gradient(135deg, #6C63FF 0%, #8B5CF6 100%)',
                                                                color: '#ffffff',
                                                                fontSize: '10.5px',
                                                                fontWeight: 700,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0,
                                                                boxShadow: '0 2px 4px rgba(108, 99, 255, 0.25)'
                                                            }}>
                                                                {initials(b.instructorName)}
                                                            </div>
                                                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                                                {b.instructorName}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--cs-text-muted)', fontSize: '12px' }}>—</span>
                                                    )}
                                                </td>

                                                {/* Schedule */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                    {first ? (
                                                        <div>
                                                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--cs-text-primary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                                <Clock size={12} color="var(--cs-primary)" /> {first.startTime} – {first.endTime}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
                                                                {b.schedules.map((s, idx) => (
                                                                    <span key={idx} style={{
                                                                        fontSize: '10.5px',
                                                                        fontWeight: 600,
                                                                        color: 'var(--cs-text-secondary)',
                                                                        background: 'var(--cs-surface-2)',
                                                                        border: '1px solid var(--cs-border)',
                                                                        padding: '1px 5px',
                                                                        borderRadius: '4px'
                                                                    }}>
                                                                        {s.day}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--cs-text-muted)', fontSize: '12px' }}>—</span>
                                                    )}
                                                </td>

                                                {/* Venue / Room */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                    {b.room ? (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            background: 'var(--cs-surface-2)',
                                                            border: '1px solid var(--cs-border)',
                                                            color: 'var(--cs-text-primary)'
                                                        }}>
                                                            <MapPin size={11} color="var(--cs-primary)" /> {b.room}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--cs-text-muted)', fontSize: '12px' }}>—</span>
                                                    )}
                                                </td>

                                                {/* Capacity Meter */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--cs-text-primary)' }}>
                                                            {b.enrolledCount}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)', fontWeight: 500 }}>
                                                            /{b.capacity}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '10.5px',
                                                            fontWeight: 700,
                                                            padding: '1px 6px',
                                                            borderRadius: '10px',
                                                            background: badgeBg,
                                                            color: badgeColor,
                                                            border: `1px solid ${badgeBorder}`
                                                        }}>
                                                            {fillPct}%
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        width: '90px',
                                                        height: '6px',
                                                        borderRadius: '99px',
                                                        background: 'var(--cs-surface-2)',
                                                        border: '1px solid var(--cs-border)',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            width: `${Math.min(fillPct, 100)}%`,
                                                            height: '100%',
                                                            borderRadius: '99px',
                                                            background: progressFill,
                                                            transition: 'width 0.3s ease'
                                                        }} />
                                                    </div>
                                                </td>

                                                {/* Status Badge */}
                                                <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        padding: '3px 10px',
                                                        borderRadius: '20px',
                                                        background: b.status === 'active' ? '#ECFDF5' : 'var(--cs-surface-2)',
                                                        color: b.status === 'active' ? '#059669' : 'var(--cs-text-muted)',
                                                        border: b.status === 'active' ? '1px solid #A7F3D0' : '1px solid var(--cs-border)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px'
                                                    }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.status === 'active' ? '#10B981' : '#9CA3AF' }} />
                                                        {b.status === 'active' ? 'Active' : b.status || 'Draft'}
                                                    </span>
                                                </td>

                                                {/* Action Edit Button */}
                                                {canManage && (
                                                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditBatch(b)}
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
                                                            title={`Edit ${b.name}`}
                                                            aria-label={`Edit ${b.name}`}
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalBatches > 0 && (
                        <div style={{
                            padding: '12px 20px',
                            borderTop: '1px solid var(--cs-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            background: 'var(--cs-surface-1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12.5px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                                    Showing <strong style={{ color: 'var(--cs-text-primary)' }}>{totalBatches === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of{' '}
                                    <strong style={{ color: 'var(--cs-text-primary)' }}>{totalBatches}</strong> {totalBatches === 1 ? 'batch' : 'batches'}
                                </span>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                    <span>Rows per page:</span>
                                    <select
                                        className="cs-input"
                                        style={{ padding: '3px 8px', fontSize: '12px', width: 'auto', height: '30px', cursor: 'pointer' }}
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        aria-label="Batches per page"
                                    >
                                        {[5, 10, 20, 50].map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid var(--cs-border)',
                                        borderRadius: '8px',
                                        cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                                        opacity: safePage <= 1 ? 0.4 : 1,
                                        background: 'var(--cs-surface-2)',
                                        color: 'var(--cs-text-primary)',
                                        transition: 'all 0.15s ease'
                                    }}
                                    disabled={safePage <= 1}
                                    onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                                >
                                    <ChevronLeft size={14} /> Prev
                                </button>

                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    {getVisiblePages(safePage, totalPages).map((p, idx) => {
                                        if (p === '...') {
                                            return <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--cs-text-muted)', fontSize: '12px' }}>...</span>;
                                        }
                                        const pageNum = Number(p);
                                        const isCurrent = pageNum === safePage;
                                        return (
                                            <button
                                                key={pageNum}
                                                type="button"
                                                onClick={() => setCurrentPage(pageNum)}
                                                style={{
                                                    minWidth: '32px',
                                                    height: '32px',
                                                    padding: '0 8px',
                                                    fontSize: '12.5px',
                                                    fontWeight: isCurrent ? 700 : 500,
                                                    borderRadius: '8px',
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
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid var(--cs-border)',
                                        borderRadius: '8px',
                                        cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                                        opacity: safePage >= totalPages ? 0.4 : 1,
                                        background: 'var(--cs-surface-2)',
                                        color: 'var(--cs-text-primary)',
                                        transition: 'all 0.15s ease'
                                    }}
                                    disabled={safePage >= totalPages}
                                    onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', width: '100%' }}>
                    {WEEKDAYS.map((day, i) => {
                        const sessions = filteredBatches
                            .flatMap(b => b.schedules.filter(s => s.weekday === day.num).map(s => ({ ...s, batch: b })))
                            .sort((a, b) => a.startKey.localeCompare(b.startKey));
                        return (
                            <div key={day.name} className="cs-card" style={{ padding: '18px', borderRadius: '16px', border: '1px solid var(--cs-border)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--cs-text-primary)' }}>{day.name}</span>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        padding: '2px 7px',
                                        borderRadius: '10px',
                                        background: sessions.length > 0 ? 'rgba(108, 99, 255, 0.1)' : 'var(--cs-surface-2)',
                                        color: sessions.length > 0 ? 'var(--cs-primary)' : 'var(--cs-text-muted)'
                                    }}>
                                        {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                                    </span>
                                </div>
                                {sessions.length === 0 && <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', textAlign: 'center', padding: '16px 0' }}>No scheduled sessions</div>}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {sessions.map(s => (
                                        <div
                                            key={`${s.batch.batchId}-${s.startKey}-${s.weekday}`}
                                            onClick={() => openEditBatch(s.batch)}
                                            style={{
                                                background: 'var(--cs-surface-2)',
                                                border: '1px solid var(--cs-border)',
                                                borderRadius: '10px',
                                                padding: '12px',
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
                                            title={`Click to edit ${s.batch.courseTitle} – ${s.batch.name} schedule`}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--cs-text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={11} color="var(--cs-primary)" /> {s.startTime} – {s.endTime}
                                                </span>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '22px',
                                                    height: '22px',
                                                    borderRadius: '6px',
                                                    background: 'rgba(108,99,255,0.12)',
                                                    color: 'var(--cs-primary)'
                                                }}>
                                                    <Pencil size={11} />
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--cs-text-secondary)', marginTop: '4px' }}>
                                                {s.batch.name}
                                            </div>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cs-primary)', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '4px', overflowWrap: 'anywhere' }}>
                                                <BookOpen size={11} style={{ flexShrink: 0, marginTop: '2px' }} />
                                                <span>{s.batch.courseTitle}</span>
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={10} color="var(--cs-primary)" />
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
                <Modal title={batchForm.batchId ? `Edit Batch: ${batchForm.name}` : "Add New Batch"} onClose={() => setShowAddBatch(false)} maxWidth="700px">
                    <form onSubmit={submitBatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label className="cs-label">Batch Name <span style={{ color: '#EF4444' }}>*</span></label>
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
                                <label className="cs-label">Course <span style={{ color: '#EF4444' }}>*</span></label>
                                <select
                                    className="cs-input"
                                    required
                                    value={batchForm.courseId}
                                    onChange={e => setBatchForm({ ...batchForm, courseId: e.target.value, branchId: branchOf(e.target.value) ?? (batchForm.branchId || viewBranchId || '') })}
                                >
                                    <option value="">— Select Course —</option>
                                    {courseChoices.map(c => (
                                        <option key={c.courseId} value={c.courseId}>{c.title} ({c.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">Branch <span style={{ color: '#EF4444' }}>*</span></label>
                                <select
                                    className="cs-input"
                                    required
                                    disabled={branchScoped}
                                    style={branchScoped ? { background: 'var(--cs-surface-2)', cursor: 'not-allowed' } : {}}
                                    value={batchForm.branchId}
                                    onChange={e => setBatchForm({ ...batchForm, branchId: e.target.value })}
                                >
                                    {branchChoices.map(b => (
                                        <option key={b.branchId} value={b.branchId}>{b.name}</option>
                                    ))}
                                </select>
                                {courseBranchId && (
                                    <div style={{ fontSize: '11px', marginTop: '3px', color: branchMismatch ? '#B45309' : 'var(--cs-text-muted)' }}>
                                        {branchMismatch ? `This course belongs to ${courses?.find(c => c.courseId === batchForm.courseId)?.branchName}. Select that branch to move the batch there.` : 'Branch of the selected course.'}
                                    </div>
                                )}
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
                                <label className="cs-label">Start Date <span style={{ color: '#EF4444' }}>*</span></label>
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
                                {saving ? (batchForm.batchId ? 'Saving…' : 'Creating…') : (batchForm.batchId ? 'Save Changes' : 'Create Batch')}
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
