'use client';
import Topbar from '@/components/Topbar';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Check,
    Users,
    Plus,
    AlertCircle,
    Inbox,
    User,
    UserCheck,
    Search,
    Trash2,
    Clock,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Table as TableIcon,
    Filter,
    Building2,
    Briefcase,
    GraduationCap,
    X
} from 'lucide-react';
import { api, useApi, initials } from '@/lib/api';
import { can, useSession, selectBranch } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';
import { VerificationQueue } from '@/components/ConsumptionReview';

interface Register {
    sessions: string[];
    students: Array<{ studentId: string; name: string; records: Record<string, string> }>;
}

interface BatchItem {
    batchId: string;
    name: string;
    courseId?: string;
    courseTitle?: string;
    branchId?: string;
    branchName?: string;
    instructorName?: string | null;
}

interface DailyAttendanceResponse {
    batchId: string;
    sessionDate: string;
    students: Array<{
        studentId: string;
        name: string;
        email: string;
        status: string | null;
        remarks: string | null;
        sessionsMarked: number;
        sessionsAttended: number;
    }>;
}

interface StaffAttendanceMember {
    userId: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    title: string;
    branchId: string;
    branchName: string;
    batches: string;
    status: 'present' | 'absent' | 'late' | 'excused' | null;
    remarks: string | null;
    sessionsMarked: number;
        sessionsAttended: number;
}

interface StaffAttendanceResponse {
    sessionDate: string;
    branchId: string | null;
    staff: StaffAttendanceMember[];
}

interface StudentAttendanceRecord {
    attendanceId: string;
    sessionDate: string;
    batchId: string;
    batchName: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    remarks: string | null;
    createdAt: string;
}

interface StudentAttendanceResponse {
    student: {
        studentId: string;
        name: string;
        email: string;
        phone: string;
        enrolledBatches?: Array<{ batchId: string; name: string }>;
    };
    summary: {
        total: number;
        present: number;
        absent: number;
        late: number;
        excused: number;
        rate: number;
    };
    records: StudentAttendanceRecord[];
}

const rateColor = (rate: number) => (rate >= 80 ? '#10B981' : rate >= 60 ? '#F59E0B' : '#EF4444');

/** Share of marked sessions attended (present or late), including the mark selected on screen but not saved yet. */
function OverallRate({ marked, attended, saved, selected }: { marked: number; attended: number; saved: string | null; selected?: StatusKey }) {
    const current = selected ? statusConfig[selected].value : null;
    const counts = (status: string | null) => status === 'present' || status === 'late';
    const total = marked - (saved ? 1 : 0) + (current ? 1 : 0);
    const present = attended - (counts(saved) ? 1 : 0) + (counts(current) ? 1 : 0);
    const changed = current !== saved;
    if (total <= 0) return <span title="No attendance recorded yet" style={{ color: 'var(--cs-text-muted)' }}>—</span>;
    const rate = Math.round((present / total) * 100);
    return (
        <span title={changed ? 'Includes marks that are not saved yet' : undefined}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: rateColor(rate) }}>{rate}%</span>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--cs-text-muted)' }}>{present} of {total}{changed ? ' · unsaved' : ''}</span>
        </span>
    );
}

const statusConfig = {
    P: { value: 'present', label: 'Present', color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', icon: CheckCircle2 },
    A: { value: 'absent', label: 'Absent', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', icon: XCircle },
    L: { value: 'late', label: 'Late', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', icon: Clock },
    E: { value: 'excused', label: 'Excused', color: '#06B6D4', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.3)', icon: AlertCircle },
};
type StatusKey = keyof typeof statusConfig;
const KEYS = Object.keys(statusConfig) as StatusKey[];
const keyOf = (value: string | undefined): StatusKey | undefined =>
    KEYS.find(k => statusConfig[k].value === value);

const getTodayIso = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const iso = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatFriendlyDate = (dateStr: string) => {
    try {
        const d = new Date(`${dateStr}T00:00:00`);
        return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

const formatShortDate = (dateStr: string) => {
    try {
        const d = new Date(`${dateStr}T00:00:00`);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

type StudentTimeframeType = 'daily' | 'weekly' | 'monthly' | 'custom' | 'all';

const addDaysToIso = (dateStr: string, days: number): string => {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + days);
    return iso(d);
};

function windowStart(offsetWeeks: number) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) - 7 + offsetWeeks * 7); // Monday of previous week
    return d;
}

export default function AttendancePage() {
    const session = useSession();
    const { workspace, currency } = useWorkspace();
    const canMark = can(session, 'attendance.write');
    const today = getTodayIso();

    // Hierarchical Filter States: Branch -> Course -> Batch
    const [selectedBranchId, setSelectedBranchId] = useState<string>(() => session?.selectedBranchId || session?.session?.branchId || 'all');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

    // Navigation & View Mode
    const [viewMode, setViewMode] = useState<'daily' | 'staff' | 'student' | 'matrix'>('daily');

    // Mode 1: Daily Roll Call state (Students)
    const [dailyDate, setDailyDate] = useState<string>(today);
    const [dailyEdits, setDailyEdits] = useState<Record<string, { status: StatusKey; remarks: string }>>({});
    const [dailySearch, setDailySearch] = useState<string>('');

    // Mode 2: Staff Attendance state
    const [staffDate, setStaffDate] = useState<string>(today);
    const [staffEdits, setStaffEdits] = useState<Record<string, { status: StatusKey; remarks: string; branchId?: string }>>({});
    const [staffSearch, setStaffSearch] = useState<string>('');

    // Mode 3: Student Attendance state & timeframe filters
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [studentTimeframe, setStudentTimeframe] = useState<StudentTimeframeType>('monthly');
    const [studentDailyDate, setStudentDailyDate] = useState<string>(today);
    const [studentWeekOffset, setStudentWeekOffset] = useState<number>(0);
    const [studentMonthOffset, setStudentMonthOffset] = useState<number>(0);
    const [customFrom, setCustomFrom] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return iso(d);
    });
    const [customTo, setCustomTo] = useState<string>(today);
    const [studentRecordDate, setStudentRecordDate] = useState<string>(today);
    const [studentRecordBatchId, setStudentRecordBatchId] = useState<string>('');
    const [studentRecordStatus, setStudentRecordStatus] = useState<StatusKey>('P');
    const [studentRecordRemarks, setStudentRecordRemarks] = useState<string>('');

    // Dynamic Timeframe Range Calculations for Student Attendance
    const getWeekRange = (offset: number) => {
        const d = new Date();
        const day = d.getDay();
        const diffToMonday = (day === 0 ? -6 : 1) - day + (offset * 7);
        const monday = new Date(d);
        monday.setDate(d.getDate() + diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const from = iso(monday);
        const to = iso(sunday);
        const label = offset === 0
            ? `This Week (${formatShortDate(from)} – ${formatShortDate(to)})`
            : `${formatShortDate(from)} – ${formatShortDate(to)}`;
        return { from, to, label };
    };

    const getMonthRange = (offset: number) => {
        const d = new Date();
        const target = new Date(d.getFullYear(), d.getMonth() + offset, 1);
        const year = target.getFullYear();
        const month = target.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const from = iso(firstDay);
        const to = iso(lastDay);
        const monthName = firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        const label = offset === 0 ? `This Month (${monthName})` : monthName;
        return { from, to, label };
    };

    const currentWeekRange = getWeekRange(studentWeekOffset);
    const currentMonthRange = getMonthRange(studentMonthOffset);

    let studentFrom: string | null = null;
    let studentTo: string | null = null;
    let studentTimeframeLabel = '';

    if (studentTimeframe === 'daily') {
        studentFrom = studentDailyDate;
        studentTo = studentDailyDate;
        studentTimeframeLabel = studentDailyDate === today
            ? `Today (${formatFriendlyDate(studentDailyDate)})`
            : formatFriendlyDate(studentDailyDate);
    } else if (studentTimeframe === 'weekly') {
        studentFrom = currentWeekRange.from;
        studentTo = currentWeekRange.to;
        studentTimeframeLabel = currentWeekRange.label;
    } else if (studentTimeframe === 'monthly') {
        studentFrom = currentMonthRange.from;
        studentTo = currentMonthRange.to;
        studentTimeframeLabel = currentMonthRange.label;
    } else if (studentTimeframe === 'custom') {
        studentFrom = customFrom || null;
        studentTo = customTo || null;
        studentTimeframeLabel = customFrom && customTo
            ? `${formatShortDate(customFrom)} to ${formatShortDate(customTo)}`
            : 'Custom Range';
    } else {
        studentFrom = null;
        studentTo = null;
        studentTimeframeLabel = 'All Historical Records';
    }

    // Mode 4: Matrix Register state
    const [weekOffset, setWeekOffset] = useState(0);
    const [matrixEdits, setMatrixEdits] = useState<Record<string, Record<string, StatusKey>>>({});

    // Shared feedback & loading states
    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');
    const [saving, setSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const [popupToast, setPopupToast] = useState<{
        message: string;
        type: 'success' | 'error';
        studentName?: string;
        date?: string;
        statusLabel?: string;
    } | null>(null);

    const showPopup = (msg: string, type: 'success' | 'error' = 'success', extra?: { studentName?: string; date?: string; statusLabel?: string }) => {
        setMessage(msg);
        setMessageType(type);
        setPopupToast({ message: msg, type, ...extra });
        if (type === 'success') {
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 3000);
        }
        setTimeout(() => {
            setPopupToast(current => current?.message === msg ? null : current);
        }, 4500);
    };

    // Queries
    const { data: courses } = useApi<Array<{ courseId: string; title: string; code: string; branchId?: string | null; isActive?: boolean }>>('/courses');
    const { data: batches, error: batchError, loading: batchesLoading } = useApi<Array<BatchItem>>('/batches?branchId=all');
    const { data: studentsList } = useApi<{ students: Array<{ studentId: string; firstName: string; lastName: string; email: string; batches?: string; branchId?: string; branchName?: string }> }>(
        `/students?limit=200${selectedBranchId !== 'all' ? `&branchId=${selectedBranchId}` : ''}`
    );

    // 1. Dynamic Courses: Filter courses according to selected branch
    const dynamicCourses = useMemo(() => {
        if (!courses) return [];
        if (selectedBranchId === 'all') return courses;
        const targetBranch = workspace?.branches?.find(br => br.branchId === selectedBranchId);
        return courses.filter(c => {
            if (c.branchId && c.branchId === selectedBranchId) return true;
            if (batches?.some(b => b.courseId === c.courseId && (
                (b.branchId && b.branchId === selectedBranchId) ||
                (targetBranch && b.branchName && b.branchName.toLowerCase() === targetBranch.name.toLowerCase())
            ))) {
                return true;
            }
            if (!c.branchId) return true;
            return false;
        });
    }, [courses, selectedBranchId, batches, workspace?.branches]);

    // 2. Dynamic Batches: Filter batches according to selected branch AND selected course
    const filteredBatches = useMemo(() => {
        if (!batches) return [];
        const targetBranch = workspace?.branches?.find(br => br.branchId === selectedBranchId);
        return batches.filter(b => {
            // Branch filter
            if (selectedBranchId !== 'all') {
                const matchBranch = (b.branchId && b.branchId === selectedBranchId) ||
                    (targetBranch && b.branchName && b.branchName.toLowerCase() === targetBranch.name.toLowerCase());
                if (!matchBranch) return false;
            }
            // Course filter
            if (selectedCourseId !== 'all') {
                if (b.courseId && b.courseId !== selectedCourseId) return false;
            }
            return true;
        });
    }, [batches, selectedBranchId, selectedCourseId, workspace?.branches]);

    // 3. Effective batch
    const activeBatchId = selectedBatchId ?? filteredBatches[0]?.batchId ?? null;
    const activeBatchObj = batches?.find(b => b.batchId === activeBatchId);
    const activeBatchName = filteredBatches.find(b => b.batchId === activeBatchId)?.name ?? activeBatchObj?.name ?? '';

    // Automatically ensure activeBatchId belongs to the filtered batch list
    useEffect(() => {
        if (filteredBatches.length > 0) {
            const exists = filteredBatches.some(b => b.batchId === selectedBatchId);
            if (!exists) {
                setSelectedBatchId(filteredBatches[0].batchId);
            }
        } else {
            setSelectedBatchId(null);
        }
    }, [filteredBatches, selectedBatchId]);

    // Dynamic Cascading Handlers
    const handleBranchFilterChange = (newBranchId: string) => {
        setSelectedBranchId(newBranchId);
        selectBranch(newBranchId === 'all' ? null : newBranchId);
        setMessage(null);

        // Cascading reset: if active course is not in the new branch, reset course to 'all'
        if (selectedCourseId !== 'all') {
            const targetBranch = workspace?.branches?.find(br => br.branchId === newBranchId);
            const courseStillValid = courses?.some(c => {
                if (c.courseId !== selectedCourseId) return false;
                if (newBranchId === 'all') return true;
                if (c.branchId && c.branchId === newBranchId) return true;
                if (batches?.some(b => b.courseId === c.courseId && (
                    (b.branchId && b.branchId === newBranchId) ||
                    (targetBranch && b.branchName && b.branchName.toLowerCase() === targetBranch.name.toLowerCase())
                ))) return true;
                if (!c.branchId) return true;
                return false;
            });
            if (!courseStillValid) {
                setSelectedCourseId('all');
            }
        }
    };

    const handleCourseFilterChange = (newCourseId: string) => {
        setSelectedCourseId(newCourseId);
        setMessage(null);

        // Auto-select first batch belonging to the selected course if current batch is not in it
        if (newCourseId !== 'all') {
            const currentMatch = filteredBatches.some(b => b.batchId === selectedBatchId && b.courseId === newCourseId);
            if (!currentMatch) {
                const targetBranch = workspace?.branches?.find(br => br.branchId === selectedBranchId);
                const firstBatch = batches?.find(b => {
                    if (b.courseId !== newCourseId) return false;
                    if (selectedBranchId !== 'all') {
                        const matchBranch = (b.branchId && b.branchId === selectedBranchId) ||
                            (targetBranch && b.branchName && b.branchName.toLowerCase() === targetBranch.name.toLowerCase());
                        if (!matchBranch) return false;
                    }
                    return true;
                });
                if (firstBatch) {
                    setSelectedBatchId(firstBatch.batchId);
                }
            }
        }
    };

    const handleBatchFilterChange = (newBatchId: string) => {
        if (newBatchId === 'all') {
            setSelectedBatchId(filteredBatches[0]?.batchId ?? null);
        } else {
            setSelectedBatchId(newBatchId);
            const batchObj = batches?.find(b => b.batchId === newBatchId);
            if (batchObj?.courseId && selectedCourseId === 'all') {
                setSelectedCourseId(batchObj.courseId);
            }
        }
        setMatrixEdits({});
        setMessage(null);
    };

    const clearAllAttendanceFilters = () => {
        setSelectedBranchId('all');
        selectBranch(null);
        setSelectedCourseId('all');
        if (batches && batches.length > 0) {
            setSelectedBatchId(batches[0].batchId);
        }
        setMessage(null);
    };

    // Filter students for Student View based on selected branch and batch
    const dynamicStudents = useMemo(() => {
        if (!studentsList?.students) return [];
        return studentsList.students.filter(st => {
            // 1. Branch filter
            if (selectedBranchId !== 'all') {
                const targetBranch = workspace?.branches?.find(br => br.branchId === selectedBranchId);
                const matchBranch = (st.branchId && st.branchId === selectedBranchId) ||
                    (targetBranch && st.branchName && st.branchName.toLowerCase() === targetBranch.name.toLowerCase());
                if (!matchBranch) return false;
            }
            // 2. Batch filter (if student has enrolled batches)
            if (activeBatchId && st.batches) {
                const activeBatchObj = batches?.find(b => b.batchId === activeBatchId);
                if (activeBatchObj && !st.batches.toLowerCase().includes(activeBatchObj.name.toLowerCase())) {
                    return false;
                }
            }
            return true;
        });
    }, [studentsList?.students, selectedBranchId, activeBatchId, batches, workspace?.branches]);

    // Register query for matrix
    const start = windowStart(weekOffset);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 13);
    const { data: register, error: registerError, reload: reloadRegister, loading: registerLoading } = useApi<Register>(
        activeBatchId ? `/attendance?batchId=${activeBatchId}&from=${iso(start)}&to=${iso(end)}` : null
    );

    // Daily roll call query (students)
    const { data: dailyData, error: dailyError, reload: reloadDaily, loading: dailyLoading } = useApi<DailyAttendanceResponse>(
        activeBatchId && dailyDate ? `/attendance?batchId=${activeBatchId}&date=${dailyDate}` : null
    );

    // Staff Attendance query
    const staffQueryUrl = viewMode === 'staff'
        ? `/attendance?type=staff&date=${staffDate}${selectedBranchId !== 'all' ? `&branchId=${selectedBranchId}` : ''}`
        : null;
    const { data: staffData, error: staffError, reload: reloadStaff, loading: staffLoading } = useApi<StaffAttendanceResponse>(staffQueryUrl);

    // Student attendance query with dynamic timeframe filtering
    const studentQueryUrl = selectedStudentId
        ? `/attendance?studentId=${selectedStudentId}${studentFrom ? `&from=${studentFrom}` : ''}${studentTo ? `&to=${studentTo}` : ''}`
        : null;

    const { data: studentData, error: studentError, reload: reloadStudent, loading: studentLoading } = useApi<StudentAttendanceResponse>(
        studentQueryUrl
    );

    // Sync daily edits when dailyData arrives
    useEffect(() => {
        if (dailyData?.students) {
            const initial: Record<string, { status: StatusKey; remarks: string }> = {};
            dailyData.students.forEach(s => {
                const k = keyOf(s.status ?? undefined);
                if (k) {
                    initial[s.studentId] = { status: k, remarks: s.remarks || '' };
                }
            });
            setDailyEdits(initial);
        }
    }, [dailyData]);

    // Sync staff edits when staffData arrives
    useEffect(() => {
        if (staffData?.staff) {
            const initial: Record<string, { status: StatusKey; remarks: string; branchId?: string }> = {};
            staffData.staff.forEach(s => {
                const k = keyOf(s.status ?? undefined);
                if (k) {
                    initial[s.userId] = { status: k, remarks: s.remarks || '', branchId: s.branchId };
                }
            });
            setStaffEdits(initial);
        }
    }, [staffData]);

    // Ensure student record batch id has default or matches student's enrolled batch
    useEffect(() => {
        if (studentData?.student?.enrolledBatches && studentData.student.enrolledBatches.length > 0) {
            const firstEnrolled = studentData.student.enrolledBatches[0].batchId;
            if (!studentRecordBatchId || !batches?.some(b => b.batchId === studentRecordBatchId)) {
                setStudentRecordBatchId(firstEnrolled);
            }
        } else if ((activeBatchId || batches?.[0]?.batchId) && !studentRecordBatchId) {
            setStudentRecordBatchId(activeBatchId || batches![0].batchId);
        }
    }, [studentData, activeBatchId, studentRecordBatchId, batches]);

    // Ensure student picker defaults to first matching student
    useEffect(() => {
        if (!selectedStudentId || (dynamicStudents.length > 0 && !dynamicStudents.some(s => s.studentId === selectedStudentId))) {
            if (dynamicStudents.length > 0) {
                setSelectedStudentId(dynamicStudents[0].studentId);
            } else if (dailyData?.students && dailyData.students.length > 0) {
                setSelectedStudentId(dailyData.students[0].studentId);
            } else if (studentsList?.students && studentsList.students.length > 0) {
                setSelectedStudentId(studentsList.students[0].studentId);
            }
        }
    }, [selectedStudentId, dynamicStudents, dailyData, studentsList]);

    // Handlers for Daily Roll Call (Students)
    const setDailyStudentStatus = (studentId: string, status: StatusKey) => {
        setDailyEdits(prev => ({
            ...prev,
            [studentId]: {
                status,
                remarks: prev[studentId]?.remarks || ''
            }
        }));
    };

    const setDailyStudentRemarks = (studentId: string, remarks: string) => {
        setDailyEdits(prev => ({
            ...prev,
            [studentId]: {
                status: prev[studentId]?.status || 'P',
                remarks
            }
        }));
    };

    const markAllDaily = (status: StatusKey) => {
        if (!dailyData?.students) return;
        const next: Record<string, { status: StatusKey; remarks: string }> = {};
        dailyData.students.forEach(s => {
            next[s.studentId] = {
                status,
                remarks: dailyEdits[s.studentId]?.remarks || ''
            };
        });
        setDailyEdits(next);
        setMessage(`All students marked as ${statusConfig[status].label} for ${formatFriendlyDate(dailyDate)}.`);
        setMessageType('success');
    };

    const clearDailyMarks = () => {
        setDailyEdits({});
        setMessage('Student attendance cleared for this date.');
        setMessageType('success');
    };

    const saveDailyAttendance = async () => {
        if (!activeBatchId) return;
        setSaving(true);
        try {
            const records = Object.entries(dailyEdits).map(([studentId, data]) => ({
                studentId,
                status: statusConfig[data.status].value,
                remarks: data.remarks || null
            }));

            await api('/attendance', {
                method: 'POST',
                body: JSON.stringify({
                    batchId: activeBatchId,
                    sessionDate: dailyDate,
                    records
                })
            });

            setMessage(`Attendance saved for ${formatFriendlyDate(dailyDate)} (${records.length} students recorded).`);
            setMessageType('success');
            reloadDaily();
            reloadRegister();
            if (selectedStudentId) reloadStudent();
        } catch (err) {
            setMessage((err as Error).message);
            setMessageType('error');
        } finally {
            setSaving(false);
        }
    };

    // Handlers for Staff Attendance
    const setStaffMemberStatus = (userId: string, status: StatusKey, branchId?: string) => {
        setStaffEdits(prev => ({
            ...prev,
            [userId]: {
                status,
                remarks: prev[userId]?.remarks || '',
                branchId: branchId || prev[userId]?.branchId
            }
        }));
    };

    const setStaffMemberRemarks = (userId: string, remarks: string, branchId?: string) => {
        setStaffEdits(prev => ({
            ...prev,
            [userId]: {
                status: prev[userId]?.status || 'P',
                remarks,
                branchId: branchId || prev[userId]?.branchId
            }
        }));
    };

    const markAllStaff = (status: StatusKey) => {
        if (!staffData?.staff) return;
        const next: Record<string, { status: StatusKey; remarks: string; branchId?: string }> = {};
        staffData.staff.forEach(s => {
            next[s.userId] = {
                status,
                remarks: staffEdits[s.userId]?.remarks || '',
                branchId: s.branchId
            };
        });
        setStaffEdits(next);
        setMessage(`All staff marked as ${statusConfig[status].label} for ${formatFriendlyDate(staffDate)}.`);
        setMessageType('success');
    };

    const clearStaffMarks = () => {
        setStaffEdits({});
        setMessage('Staff attendance marks reset for this date.');
        setMessageType('success');
    };

    const saveStaffAttendance = async () => {
        setSaving(true);
        try {
            const records = Object.entries(staffEdits).map(([userId, data]) => ({
                userId,
                status: statusConfig[data.status].value,
                remarks: data.remarks || null,
                branchId: data.branchId || null
            }));

            await api('/attendance', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'staff',
                    sessionDate: staffDate,
                    records
                })
            });

            setMessage(`Staff attendance saved for ${formatFriendlyDate(staffDate)} (${records.length} staff recorded).`);
            setMessageType('success');
            reloadStaff();
        } catch (err) {
            setMessage((err as Error).message);
            setMessageType('error');
        } finally {
            setSaving(false);
        }
    };

    // Handlers for Particular Student Attendance Management
    const saveStudentRecord = async () => {
        if (!selectedStudentId) {
            showPopup('Please select a student first.', 'error');
            return;
        }

        // Determine effective batch: selected record batch, or student's enrolled batch, or active batch, or first available batch
        const studentEnrolledBatch = studentData?.student?.enrolledBatches?.[0]?.batchId;
        const targetBatchId = studentRecordBatchId || studentEnrolledBatch || activeBatchId || batches?.[0]?.batchId;

        if (!targetBatchId) {
            showPopup('No batches found. Please create a batch before recording attendance.', 'error');
            return;
        }

        if (studentRecordBatchId !== targetBatchId) {
            setStudentRecordBatchId(targetBatchId);
        }

        setSaving(true);
        try {
            await api('/attendance', {
                method: 'POST',
                body: JSON.stringify({
                    batchId: targetBatchId,
                    sessionDate: studentRecordDate,
                    studentId: selectedStudentId,
                    status: statusConfig[studentRecordStatus].value,
                    remarks: studentRecordRemarks || null
                })
            });

            const statusLabel = statusConfig[studentRecordStatus].label;
            const studentName = studentData?.student.name || 'Student';
            const friendlyDate = formatFriendlyDate(studentRecordDate);

            showPopup(
                `Attendance recorded successfully for ${studentName} on ${friendlyDate}.`,
                'success',
                { studentName, date: friendlyDate, statusLabel }
            );

            setStudentRecordRemarks('');
            reloadStudent();
            reloadDaily();
            reloadRegister();
        } catch (err) {
            showPopup((err as Error).message || 'Failed to save attendance record.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const cycleStudentStatus = async (record: StudentAttendanceRecord) => {
        if (!canMark) return;
        const currentKey = keyOf(record.status) || 'P';
        const nextKey = KEYS[(KEYS.indexOf(currentKey) + 1) % KEYS.length];
        try {
            await api('/attendance', {
                method: 'POST',
                body: JSON.stringify({
                    batchId: record.batchId,
                    sessionDate: record.sessionDate,
                    studentId: selectedStudentId,
                    status: statusConfig[nextKey].value,
                    remarks: record.remarks
                })
            });
            reloadStudent();
            reloadDaily();
            reloadRegister();
        } catch (err) {
            setMessage((err as Error).message);
            setMessageType('error');
        }
    };

    const deleteStudentRecord = async (sessionDate: string) => {
        if (!canMark) return;
        if (!window.confirm(`Delete attendance record for ${formatFriendlyDate(sessionDate)}?`)) return;
        try {
            await api(`/attendance?studentId=${selectedStudentId}&sessionDate=${sessionDate}`, {
                method: 'DELETE'
            });
            setMessage(`Attendance record deleted for ${formatFriendlyDate(sessionDate)}.`);
            setMessageType('success');
            reloadStudent();
            reloadDaily();
            reloadRegister();
        } catch (err) {
            setMessage((err as Error).message);
            setMessageType('error');
        }
    };

    // Handlers for Matrix Register
    const statusAtMatrix = (studentId: string, date: string, records: Record<string, string>) =>
        matrixEdits[date]?.[studentId] ?? keyOf(records[date]);

    const cycleMatrix = (date: string, studentId: string, current: StatusKey | undefined) => {
        const nextKey = KEYS[(current ? KEYS.indexOf(current) + 1 : 0) % KEYS.length];
        setMatrixEdits(prev => ({
            ...prev,
            [date]: { ...prev[date], [studentId]: nextKey }
        }));
    };

    const saveMatrix = async () => {
        if (!activeBatchId) return;
        setSaving(true);
        try {
            for (const [sessionDate, byStudent] of Object.entries(matrixEdits)) {
                const records = Object.entries(byStudent).map(([studentId, key]) => ({
                    studentId,
                    status: statusConfig[key].value
                }));
                await api('/attendance', {
                    method: 'POST',
                    body: JSON.stringify({ batchId: activeBatchId, sessionDate, records })
                });
            }
            setMatrixEdits({});
            setMessage('Attendance changes saved.');
            setMessageType('success');
            reloadRegister();
            reloadDaily();
            if (selectedStudentId) reloadStudent();
        } catch (err) {
            setMessage((err as Error).message);
            setMessageType('error');
        } finally {
            setSaving(false);
        }
    };

    // Calculate Summary Counts depending on view mode
    const summaryCounts: Record<StatusKey, number> = { P: 0, A: 0, L: 0, E: 0 };
    if (viewMode === 'staff') {
        Object.values(staffEdits).forEach(item => {
            if (item.status) summaryCounts[item.status]++;
        });
    } else if (viewMode === 'daily') {
        Object.values(dailyEdits).forEach(item => {
            if (item.status) summaryCounts[item.status]++;
        });
    } else if (viewMode === 'student' && studentData?.summary) {
        summaryCounts.P = studentData.summary.present;
        summaryCounts.A = studentData.summary.absent;
        summaryCounts.L = studentData.summary.late;
        summaryCounts.E = studentData.summary.excused;
    } else if (register) {
        register.students.forEach(s => register.sessions.forEach(d => {
            const k = statusAtMatrix(s.studentId, d, s.records);
            if (k) summaryCounts[k]++;
        }));
    }

    const totalSummaryCount = Object.values(summaryCounts).reduce((a, b) => a + b, 0);

    const pendingMatrixChanges = Object.values(matrixEdits).reduce((n, d) => n + Object.keys(d).length, 0);
    const rangeLabel = `${new Date(`${iso(start)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(`${iso(end)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Quick open student profile handler
    const openStudentAttendance = (studentId: string) => {
        setSelectedStudentId(studentId);
        setViewMode('student');
        if (!studentRecordBatchId) {
            const fallback = activeBatchId || batches?.[0]?.batchId;
            if (fallback) setStudentRecordBatchId(fallback);
        }
    };

    // Branch → Course → Batch, shown in front of the date selection of each view (staff has no course or batch)
    const attendanceFilters = (branchOnly = false) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* 1. Branch Selector */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 10px',
                    height: '36px',
                    borderRadius: '8px',
                    border: `1px solid ${selectedBranchId !== 'all' ? 'var(--cs-primary)' : 'var(--cs-border)'}`,
                    background: selectedBranchId !== 'all' ? 'rgba(108, 99, 255, 0.05)' : 'var(--cs-surface-2)',
                    transition: 'all 0.15s ease'
                }}>
                    <Building2 size={14} color={selectedBranchId !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-muted)'} />
                    <select
                        value={selectedBranchId}
                        onChange={e => { setMatrixEdits({}); handleBranchFilterChange(e.target.value); }}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            fontSize: '12.5px',
                            fontWeight: selectedBranchId !== 'all' ? 600 : 500,
                            color: selectedBranchId !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-primary)',
                            cursor: 'pointer'
                        }}
                        aria-label="Filter attendance by branch"
                    >
                        <option value="all">All Branches ({workspace?.branches?.length ?? 0})</option>
                        {(workspace?.branches ?? []).map(b => (
                            <option key={b.branchId} value={b.branchId}>
                                {b.name} {b.code ? `(${b.code})` : ''}
                            </option>
                        ))}
                    </select>
                </div>

            {!branchOnly && (
                <>
                    {/* 2. Course Selector (Dynamically Filtered by selected Branch) */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0 10px',
                        height: '36px',
                        borderRadius: '8px',
                        border: `1px solid ${selectedCourseId !== 'all' ? 'var(--cs-primary)' : 'var(--cs-border)'}`,
                        background: selectedCourseId !== 'all' ? 'rgba(108, 99, 255, 0.05)' : 'var(--cs-surface-2)',
                        transition: 'all 0.15s ease'
                    }}>
                        <GraduationCap size={14} color={selectedCourseId !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-muted)'} />
                        <select
                            value={selectedCourseId}
                            onChange={e => { setMatrixEdits({}); handleCourseFilterChange(e.target.value); }}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                fontSize: '12.5px',
                                fontWeight: selectedCourseId !== 'all' ? 600 : 500,
                                color: selectedCourseId !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-primary)',
                                cursor: 'pointer'
                            }}
                            aria-label="Filter attendance by course"
                        >
                            <option value="all">
                                {selectedBranchId !== 'all'
                                    ? `All Courses (${dynamicCourses.length} in Branch)`
                                    : `All Courses (${dynamicCourses.length})`}
                            </option>
                            {dynamicCourses.map(c => (
                                <option key={c.courseId} value={c.courseId}>
                                    {c.title} ({c.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Batch Selector (Dynamically Filtered by Course & Branch) */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0 10px',
                        height: '36px',
                        borderRadius: '8px',
                        border: `1px solid ${selectedBatchId ? 'var(--cs-primary)' : 'var(--cs-border)'}`,
                        background: selectedBatchId ? 'rgba(108, 99, 255, 0.05)' : 'var(--cs-surface-2)',
                        transition: 'all 0.15s ease'
                    }}>
                        <Calendar size={14} color={selectedBatchId ? 'var(--cs-primary)' : 'var(--cs-text-muted)'} />
                        <select
                            value={activeBatchId ?? ''}
                            onChange={e => { setMatrixEdits({}); handleBatchFilterChange(e.target.value); }}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                fontSize: '12.5px',
                                fontWeight: selectedBatchId ? 600 : 500,
                                color: selectedBatchId ? 'var(--cs-primary)' : 'var(--cs-text-primary)',
                                cursor: 'pointer'
                            }}
                            aria-label="Select active batch for attendance"
                        >
                            {filteredBatches.length === 0 ? (
                                <option value="" disabled>No batches matching filters</option>
                            ) : (
                                filteredBatches.map(b => (
                                    <option key={b.batchId} value={b.batchId}>
                                        {b.name} {b.courseTitle ? `• ${b.courseTitle}` : ''} {selectedBranchId === 'all' && b.branchName ? `(${b.branchName})` : ''}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                </>
            )}

            {(selectedBranchId !== 'all' || (!branchOnly && selectedCourseId !== 'all')) && (
                <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: '6px', display: 'inline-flex' }}
                    onClick={() => { setMatrixEdits({}); clearAllAttendanceFilters(); }}
                    title="Reset filters"
                    aria-label="Reset filters"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );

    return (
        <>

            <Topbar
                title="Attendance & Register"
                subtitle="Daily roll call, student & staff attendance tracking, and batch schedules"
                action={canMark ? {
                    label: viewMode === 'staff' ? 'Mark Staff Today' : 'Mark Today',
                    onClick: () => {
                        if (viewMode === 'staff') {
                            setStaffDate(today);
                            markAllStaff('P');
                        } else {
                            setViewMode('daily');
                            setDailyDate(today);
                            markAllDaily('P');
                        }
                    },
                    hint: viewMode === 'staff' ? 'Quick mark all staff present for today' : 'Quick mark all students present for today'
                } : undefined}
            />

            <div className="page-body">
                {/* Feedback Toast / Banner */}
                {message && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: messageType === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${messageType === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        color: messageType === 'success' ? '#065F46' : '#991B1B',
                        fontSize: '13px',
                        fontWeight: 600
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {messageType === 'success' ? <CheckCircle2 size={16} color="#10B981" /> : <AlertCircle size={16} color="#EF4444" />}
                            <span>{message}</span>
                        </div>
                        <button
                            onClick={() => setMessage(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '13px', fontWeight: 700 }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {canMark && <VerificationQueue currency={currency} />}

                {/* View Mode Switcher Pills */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '6px', background: 'var(--cs-border-subtle)', padding: '4px', borderRadius: '12px' }}>
                        <button
                            onClick={() => setViewMode('daily')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                border: 'none', cursor: 'pointer',
                                background: viewMode === 'daily' ? 'var(--cs-surface)' : 'transparent',
                                color: viewMode === 'daily' ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                boxShadow: viewMode === 'daily' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Calendar size={15} />
                            Daily Attendance
                        </button>
                        <button
                            onClick={() => setViewMode('staff')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                border: 'none', cursor: 'pointer',
                                background: viewMode === 'staff' ? 'var(--cs-surface)' : 'transparent',
                                color: viewMode === 'staff' ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                boxShadow: viewMode === 'staff' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Briefcase size={15} />
                            Staff Attendance
                        </button>
                        <button
                            onClick={() => setViewMode('student')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                border: 'none', cursor: 'pointer',
                                background: viewMode === 'student' ? 'var(--cs-surface)' : 'transparent',
                                color: viewMode === 'student' ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                boxShadow: viewMode === 'student' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            <UserCheck size={15} />
                            Student Attendance
                        </button>
                        <button
                            onClick={() => setViewMode('matrix')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                border: 'none', cursor: 'pointer',
                                background: viewMode === 'matrix' ? 'var(--cs-surface)' : 'transparent',
                                color: viewMode === 'matrix' ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                boxShadow: viewMode === 'matrix' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            <TableIcon size={15} />
                            Batch Matrix Register
                        </button>
                    </div>

                    {/* Quick Mode Indicator / Context */}
                    <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                        {viewMode === 'daily' && `Student roll call for: ${formatFriendlyDate(dailyDate)}`}
                        {viewMode === 'staff' && `Staff roll call for: ${formatFriendlyDate(staffDate)}`}
                        {viewMode === 'student' && `Individual student attendance (${studentTimeframeLabel})`}
                        {viewMode === 'matrix' && `2-week session overview: ${rangeLabel}`}
                    </div>
                </div>

                {/* 4 Summary Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                    {KEYS.map(key => {
                        const cfg = statusConfig[key];
                        const count = summaryCounts[key] || 0;
                        const pct = totalSummaryCount > 0 ? Math.round((count / totalSummaryCount) * 100) : 0;
                        return (
                            <div key={key} className="cs-card" style={{ padding: '20px', borderRadius: '16px', borderColor: cfg.border }}>
                                <div style={{ fontSize: '28px', fontWeight: 800, color: cfg.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    {count}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', marginTop: '2px', fontWeight: 600 }}>
                                    {cfg.label}
                                </div>
                                <div style={{ marginTop: '10px' }}>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${pct}%`, background: cfg.color }} />
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>
                                        {pct}% of {viewMode === 'staff' ? "today's staff" : viewMode === 'daily' ? "today's roll call" : viewMode === 'student' ? 'student sessions' : 'marks'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* MAIN CONTENT AREA */}

                {/* ═══════════════════════════════════════════════════════════════
                    VIEW 1: DAILY ATTENDANCE (STUDENT ROLL CALL)
                    ═══════════════════════════════════════════════════════════════ */}
                {viewMode === 'daily' && (
                    <div className="cs-card">
                        {/* Daily Toolbar: Date Picker & Batch Pills */}
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            {attendanceFilters()}

                            {/* Date Picker Controls */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    className="btn-ghost"
                                    style={{ padding: '6px' }}
                                    onClick={() => setDailyDate(d => addDaysToIso(d, -1))}
                                    title="Previous Day"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <input
                                    type="date"
                                    value={dailyDate}
                                    max={today}
                                    onChange={e => setDailyDate(e.target.value)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--cs-border)',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: 'var(--cs-text-primary)',
                                        background: 'var(--cs-surface)'
                                    }}
                                />
                                <button
                                    className="btn-ghost"
                                    style={{ padding: '6px' }}
                                    onClick={() => setDailyDate(d => addDaysToIso(d, 1))}
                                    disabled={dailyDate >= today}
                                    title="Next Day"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                {dailyDate !== today && (
                                    <button
                                        onClick={() => setDailyDate(today)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            border: '1px solid var(--cs-border)',
                                            background: 'var(--cs-surface-dim)',
                                            color: 'var(--cs-primary)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Today
                                    </button>
                                )}
                            </div>

                            {/* Quick Batch Marking Actions */}
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {canMark && (
                                    <>
                                        <button
                                            onClick={() => markAllDaily('P')}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                color: '#065F46',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Mark All Present
                                        </button>
                                        <button
                                            onClick={() => markAllDaily('A')}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                color: '#991B1B',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Mark All Absent
                                        </button>
                                        <button
                                            onClick={clearDailyMarks}
                                            style={{
                                                padding: '6px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                border: '1px solid var(--cs-border)',
                                                background: 'transparent',
                                                color: 'var(--cs-text-muted)',
                                                cursor: 'pointer'
                                            }}
                                            title="Reset marks"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Search and Table */}
                        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ position: 'relative', width: '280px' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--cs-text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Search student in batch..."
                                    value={dailySearch}
                                    onChange={e => setDailySearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '6px 12px 6px 32px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--cs-border)',
                                        fontSize: '12px'
                                    }}
                                />
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                Click a student&apos;s name to manage their full daily attendance history.
                            </span>
                        </div>

                        {/* Students Table */}
                        {dailyLoading ? (
                            <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--cs-text-muted)', fontSize: '14px' }}>
                                Loading daily attendance…
                            </div>
                        ) : dailyError ? (
                            <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--cs-danger)', fontSize: '14px' }}>
                                <AlertCircle size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.8 }} />
                                Unable to load daily attendance: {dailyError}
                            </div>
                        ) : !dailyData || dailyData.students.length === 0 ? (
                            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                                <Users size={32} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--cs-text-muted)' }} />
                                <div style={{ fontSize: '15px', fontWeight: 600 }}>No students enrolled in {activeBatchName || 'this batch'}</div>
                                <div style={{ fontSize: '13px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>
                                    Enroll students in this batch from the Students page to record daily attendance.
                                </div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="cs-table">
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: '220px' }}>Student</th>
                                            <th style={{ minWidth: '280px' }}>Status ({formatFriendlyDate(dailyDate)})</th>
                                            <th style={{ minWidth: '260px' }}>Remarks / Reason</th>
                                            <th style={{ textAlign: 'center', width: '120px' }}>Overall Rate</th>
                                            <th style={{ textAlign: 'center', width: '100px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dailyData.students
                                            .filter(s => !dailySearch || s.name.toLowerCase().includes(dailySearch.toLowerCase()) || s.email.toLowerCase().includes(dailySearch.toLowerCase()))
                                            .map(s => {
                                                const currentStatus = dailyEdits[s.studentId]?.status;
                                                const remarks = dailyEdits[s.studentId]?.remarks ?? '';

                                                return (
                                                    <tr key={s.studentId}>
                                                        {/* Student Name & Avatar */}
                                                        <td>
                                                            <div
                                                                onClick={() => openStudentAttendance(s.studentId)}
                                                                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                                                                title="Manage attendance for this student"
                                                            >
                                                                <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: '11px' }}>
                                                                    {initials(s.name)}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cs-primary)' }}>
                                                                        {s.name}
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>
                                                                        {s.email}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Status Selector Buttons */}
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                {KEYS.map(k => {
                                                                    const cfg = statusConfig[k];
                                                                    const isSelected = currentStatus === k;
                                                                    return (
                                                                        <button
                                                                            key={k}
                                                                            disabled={!canMark}
                                                                            onClick={() => setDailyStudentStatus(s.studentId, k)}
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '4px',
                                                                                padding: '5px 10px',
                                                                                borderRadius: '6px',
                                                                                fontSize: '11px',
                                                                                fontWeight: 700,
                                                                                cursor: 'pointer',
                                                                                border: `1px solid ${isSelected ? cfg.color : 'var(--cs-border)'}`,
                                                                                background: isSelected ? cfg.bg : 'var(--cs-surface)',
                                                                                color: isSelected ? cfg.color : 'var(--cs-text-muted)',
                                                                                transition: 'all 0.15s ease'
                                                                            }}
                                                                        >
                                                                            <span style={{
                                                                                width: 14,
                                                                                height: 14,
                                                                                borderRadius: '50%',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                fontSize: '9px',
                                                                                background: isSelected ? cfg.color : 'transparent',
                                                                                color: isSelected ? '#FFFFFF' : 'inherit'
                                                                            }}>
                                                                                {k}
                                                                            </span>
                                                                            {cfg.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>

                                                        {/* Remarks */}
                                                        <td>
                                                            <input
                                                                type="text"
                                                                placeholder="Add notes / remarks..."
                                                                disabled={!canMark}
                                                                value={remarks}
                                                                onChange={e => setDailyStudentRemarks(s.studentId, e.target.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '5px 8px',
                                                                    fontSize: '12px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid var(--cs-border)',
                                                                    background: 'var(--cs-surface)'
                                                                }}
                                                            />
                                                        </td>

                                                        {/* Overall Rate */}
                                                        <td style={{ textAlign: 'center' }}>
                                                            <OverallRate marked={s.sessionsMarked} attended={s.sessionsAttended} saved={s.status} selected={dailyEdits[s.studentId]?.status} />
                                                        </td>

                                                        {/* Actions */}
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button
                                                                onClick={() => openStudentAttendance(s.studentId)}
                                                                className="btn-ghost"
                                                                style={{ padding: '6px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                title="Manage this student's attendance"
                                                            >
                                                                <User size={13} />
                                                                History
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Footer / Save Bar */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--cs-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>
                                {activeBatchName} • {dailyData?.students.length ?? 0} students enrolled • {Object.keys(dailyEdits).length} marked for {formatFriendlyDate(dailyDate)}
                            </div>
                            <button
                                className="btn-primary"
                                style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                disabled={!canMark || saving || Object.keys(dailyEdits).length === 0}
                                onClick={saveDailyAttendance}
                            >
                                <Check size={14} />
                                {saving ? 'Saving…' : `Save Attendance (${Object.keys(dailyEdits).length})`}
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    VIEW 2: STAFF ATTENDANCE (ROLL CALL BY BRANCH)
                    ═══════════════════════════════════════════════════════════════ */}
                {viewMode === 'staff' && (
                    <div className="cs-card">
                        {/* Staff Toolbar: Date Picker & Actions */}
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            {attendanceFilters(true)}

                            {/* Date Controls */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    className="btn-ghost"
                                    style={{ padding: '6px' }}
                                    onClick={() => setStaffDate(d => addDaysToIso(d, -1))}
                                    title="Previous Day"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <input
                                    type="date"
                                    value={staffDate}
                                    max={today}
                                    onChange={e => setStaffDate(e.target.value)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--cs-border)',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: 'var(--cs-text-primary)',
                                        background: 'var(--cs-surface)'
                                    }}
                                />
                                <button
                                    className="btn-ghost"
                                    style={{ padding: '6px' }}
                                    onClick={() => setStaffDate(d => addDaysToIso(d, 1))}
                                    disabled={staffDate >= today}
                                    title="Next Day"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                {staffDate !== today && (
                                    <button
                                        onClick={() => setStaffDate(today)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            border: '1px solid var(--cs-border)',
                                            background: 'var(--cs-surface-dim)',
                                            color: 'var(--cs-primary)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Today
                                    </button>
                                )}
                            </div>

                            {/* Quick Staff Marking Actions */}
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {canMark && (
                                    <>
                                        <button
                                            onClick={() => markAllStaff('P')}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                color: '#065F46',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Mark All Present
                                        </button>
                                        <button
                                            onClick={() => markAllStaff('A')}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                color: '#991B1B',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Mark All Absent
                                        </button>
                                        <button
                                            onClick={clearStaffMarks}
                                            style={{
                                                padding: '6px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                border: '1px solid var(--cs-border)',
                                                background: 'transparent',
                                                color: 'var(--cs-text-muted)',
                                                cursor: 'pointer'
                                            }}
                                            title="Reset marks"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Search bar */}
                        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ position: 'relative', width: '320px' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--cs-text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Search staff by name, email, or role..."
                                    value={staffSearch}
                                    onChange={e => setStaffSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '6px 12px 6px 32px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--cs-border)',
                                        fontSize: '12px'
                                    }}
                                />
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                Mark roll call for instructors and staff members filtered by branch.
                            </span>
                        </div>

                        {/* Staff Table */}
                        {staffLoading ? (
                            <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--cs-text-muted)', fontSize: '14px' }}>
                                Loading staff attendance…
                            </div>
                        ) : staffError ? (
                            <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--cs-danger)', fontSize: '14px' }}>
                                <AlertCircle size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.8 }} />
                                Unable to load staff attendance: {staffError}
                            </div>
                        ) : !staffData || staffData.staff.length === 0 ? (
                            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                                <Briefcase size={32} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--cs-text-muted)' }} />
                                <div style={{ fontSize: '15px', fontWeight: 600 }}>No staff members found</div>
                                <div style={{ fontSize: '13px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>
                                    {selectedBranchId === 'all'
                                        ? 'Add staff members from Users & Roles to manage staff attendance.'
                                        : 'No staff members assigned to this branch.'}
                                </div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="cs-table">
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: '220px' }}>Staff Member</th>
                                            <th style={{ minWidth: '150px' }}>Role & Branch</th>
                                            <th style={{ minWidth: '160px' }}>Assigned Batches</th>
                                            <th style={{ minWidth: '280px' }}>Status ({formatFriendlyDate(staffDate)})</th>
                                            <th style={{ minWidth: '240px' }}>Remarks / Reason</th>
                                            <th style={{ textAlign: 'center', width: '120px' }}>Overall Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staffData.staff
                                            .filter(s => {
                                                if (!staffSearch) return true;
                                                const q = staffSearch.toLowerCase();
                                                return s.name.toLowerCase().includes(q) ||
                                                    s.email.toLowerCase().includes(q) ||
                                                    s.role.toLowerCase().includes(q) ||
                                                    (s.branchName && s.branchName.toLowerCase().includes(q));
                                            })
                                            .map(s => {
                                                const currentStatus = staffEdits[s.userId]?.status;
                                                const remarks = staffEdits[s.userId]?.remarks ?? '';

                                                return (
                                                    <tr key={s.userId}>
                                                        {/* Staff Avatar & Name */}
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div className="avatar-placeholder" style={{ width: 34, height: 34, fontSize: '12px' }}>
                                                                    {initials(s.name)}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cs-text-primary)' }}>
                                                                        {s.name}
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>
                                                                        {s.email} {s.phone ? `• ${s.phone}` : ''}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Role & Branch */}
                                                        <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                                <span style={{
                                                                    padding: '2px 8px',
                                                                    borderRadius: '10px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                    background: 'rgba(79, 70, 229, 0.1)',
                                                                    color: 'var(--cs-primary)'
                                                                }}>
                                                                    {s.role || s.title || 'Staff'}
                                                                </span>
                                                                {s.branchName && (
                                                                    <span style={{
                                                                        padding: '2px 6px',
                                                                        borderRadius: '6px',
                                                                        fontSize: '10px',
                                                                        fontWeight: 500,
                                                                        background: 'var(--cs-border-subtle)',
                                                                        color: 'var(--cs-text-secondary)'
                                                                    }}>
                                                                        {s.branchName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Batches */}
                                                        <td>
                                                            <div style={{ fontSize: '12px', color: s.batches ? 'var(--cs-text-primary)' : 'var(--cs-text-muted)' }}>
                                                                {s.batches ? Array.from(new Set(s.batches.split(/,\s*/).map(b => b.trim()).filter(Boolean))).join(', ') : '—'}
                                                            </div>
                                                        </td>

                                                        {/* Status Roll Call */}
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                {KEYS.map(k => {
                                                                    const cfg = statusConfig[k];
                                                                    const isSelected = currentStatus === k;
                                                                    return (
                                                                        <button
                                                                            key={k}
                                                                            disabled={!canMark}
                                                                            onClick={() => setStaffMemberStatus(s.userId, k, s.branchId)}
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '4px',
                                                                                padding: '5px 10px',
                                                                                borderRadius: '6px',
                                                                                fontSize: '11px',
                                                                                fontWeight: 700,
                                                                                cursor: 'pointer',
                                                                                border: `1px solid ${isSelected ? cfg.color : 'var(--cs-border)'}`,
                                                                                background: isSelected ? cfg.bg : 'var(--cs-surface)',
                                                                                color: isSelected ? cfg.color : 'var(--cs-text-muted)',
                                                                                transition: 'all 0.15s ease'
                                                                            }}
                                                                        >
                                                                            <span style={{
                                                                                width: 14,
                                                                                height: 14,
                                                                                borderRadius: '50%',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                fontSize: '9px',
                                                                                background: isSelected ? cfg.color : 'transparent',
                                                                                color: isSelected ? '#FFFFFF' : 'inherit'
                                                                            }}>
                                                                                {k}
                                                                            </span>
                                                                            {cfg.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>

                                                        {/* Remarks */}
                                                        <td>
                                                            <input
                                                                type="text"
                                                                placeholder="Add notes / remarks..."
                                                                disabled={!canMark}
                                                                value={remarks}
                                                                onChange={e => setStaffMemberRemarks(s.userId, e.target.value, s.branchId)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '5px 8px',
                                                                    fontSize: '12px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid var(--cs-border)',
                                                                    background: 'var(--cs-surface)'
                                                                }}
                                                            />
                                                        </td>

                                                        {/* Overall Rate */}
                                                        <td style={{ textAlign: 'center' }}>
                                                            <OverallRate marked={s.sessionsMarked} attended={s.sessionsAttended} saved={s.status} selected={staffEdits[s.userId]?.status} />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Footer / Save Bar */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--cs-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>
                                {staffData?.staff.length ?? 0} staff members • {Object.keys(staffEdits).length} marked for {formatFriendlyDate(staffDate)}
                            </div>
                            <button
                                className="btn-primary"
                                style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                disabled={!canMark || saving || Object.keys(staffEdits).length === 0}
                                onClick={saveStaffAttendance}
                            >
                                <Check size={14} />
                                {saving ? 'Saving…' : `Save Staff Attendance (${Object.keys(staffEdits).length})`}
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    VIEW 3: STUDENT ATTENDANCE (PARTICULAR STUDENT DAILY BASES)
                    ═══════════════════════════════════════════════════════════════ */}
                {viewMode === 'student' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Student Picker & Timeframe Filter Bar */}
                        <div className="cs-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {attendanceFilters()}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                {/* Student Selector */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <User size={16} color="var(--cs-primary)" />
                                        <span style={{ fontSize: '13px', fontWeight: 700 }}>Select Student:</span>
                                    </div>
                                    <select
                                        value={selectedStudentId ?? ''}
                                        onChange={e => setSelectedStudentId(e.target.value)}
                                        style={{
                                            minWidth: '280px',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--cs-border)',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: 'var(--cs-text-primary)',
                                            background: 'var(--cs-surface)'
                                        }}
                                    >
                                        <option value="" disabled>Choose a student to manage…</option>
                                        {dynamicStudents.length === 0 ? (
                                            <option value="" disabled>No students found for selected Branch/Batch filters</option>
                                        ) : (
                                            dynamicStudents.map(st => (
                                                <option key={st.studentId} value={st.studentId}>
                                                    {st.firstName} {st.lastName} {st.branchName ? `[${st.branchName}]` : ''} {st.batches ? `(${Array.from(new Set(st.batches.split(/,\s*/).map(b => b.trim()).filter(Boolean))).join(', ')})` : ''}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                {/* Back to daily roll call button */}
                                <button
                                    onClick={() => setViewMode('daily')}
                                    className="btn-ghost"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                                >
                                    <ChevronLeft size={14} /> Back to Daily Roll Call
                                </button>
                            </div>

                            {/* Attendance Filter Controls */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                paddingTop: '12px',
                                borderTop: '1px solid var(--cs-border)',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Filter size={15} color="var(--cs-primary)" />
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>
                                        Attendance Filter:
                                    </span>
                                    <select
                                        value={studentTimeframe}
                                        onChange={e => setStudentTimeframe(e.target.value as StudentTimeframeType)}
                                        style={{
                                            padding: '7px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--cs-border)',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: 'var(--cs-primary)',
                                            background: 'var(--cs-surface)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="daily">Daily basis</option>
                                        <option value="weekly">Weekly basis</option>
                                        <option value="monthly">Monthly basis</option>
                                        <option value="custom">Custom Date Range</option>
                                        <option value="all">All Records (All Time)</option>
                                    </select>
                                </div>

                                {/* Dynamic Controls based on timeframe */}
                                {studentTimeframe === 'daily' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <button
                                                className="btn-ghost"
                                                style={{ padding: '6px' }}
                                                onClick={() => setStudentDailyDate(d => addDaysToIso(d, -1))}
                                                title="Previous Day"
                                            >
                                                <ChevronLeft size={15} />
                                            </button>
                                            <input
                                                type="date"
                                                value={studentDailyDate}
                                                max={today}
                                                onChange={e => setStudentDailyDate(e.target.value)}
                                                style={{
                                                    padding: '6px 10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--cs-border)',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    background: 'var(--cs-surface)'
                                                }}
                                            />
                                            <button
                                                className="btn-ghost"
                                                style={{ padding: '6px' }}
                                                onClick={() => setStudentDailyDate(d => addDaysToIso(d, 1))}
                                                disabled={studentDailyDate >= today}
                                                title="Next Day"
                                            >
                                                <ChevronRight size={15} />
                                            </button>
                                        </div>
                                        {studentDailyDate !== today ? (
                                            <button
                                                onClick={() => setStudentDailyDate(today)}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    background: 'rgba(79, 70, 229, 0.1)',
                                                    color: 'var(--cs-primary)',
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Today
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#10B981' }}>
                                                Today
                                            </span>
                                        )}
                                    </div>
                                )}

                                {studentTimeframe === 'weekly' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <button
                                            className="btn-ghost"
                                            style={{ padding: '6px' }}
                                            onClick={() => setStudentWeekOffset(w => w - 1)}
                                            title="Previous Week"
                                        >
                                            <ChevronLeft size={15} />
                                        </button>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                            {currentWeekRange.label}
                                        </span>
                                        <button
                                            className="btn-ghost"
                                            style={{ padding: '6px' }}
                                            onClick={() => setStudentWeekOffset(w => w + 1)}
                                            disabled={studentWeekOffset >= 0}
                                            title="Next Week"
                                        >
                                            <ChevronRight size={15} />
                                        </button>
                                        {studentWeekOffset !== 0 && (
                                            <button
                                                onClick={() => setStudentWeekOffset(0)}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    background: 'rgba(79, 70, 229, 0.1)',
                                                    color: 'var(--cs-primary)',
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Current Week
                                            </button>
                                        )}
                                    </div>
                                )}

                                {studentTimeframe === 'monthly' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <button
                                            className="btn-ghost"
                                            style={{ padding: '6px' }}
                                            onClick={() => setStudentMonthOffset(m => m - 1)}
                                            title="Previous Month"
                                        >
                                            <ChevronLeft size={15} />
                                        </button>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                            {currentMonthRange.label}
                                        </span>
                                        <button
                                            className="btn-ghost"
                                            style={{ padding: '6px' }}
                                            onClick={() => setStudentMonthOffset(m => m + 1)}
                                            disabled={studentMonthOffset >= 0}
                                            title="Next Month"
                                        >
                                            <ChevronRight size={15} />
                                        </button>
                                        {studentMonthOffset !== 0 && (
                                            <button
                                                onClick={() => setStudentMonthOffset(0)}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    background: 'rgba(79, 70, 229, 0.1)',
                                                    color: 'var(--cs-primary)',
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Current Month
                                            </button>
                                        )}
                                    </div>
                                )}

                                {studentTimeframe === 'custom' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cs-text-muted)' }}>
                                                Starting Date:
                                            </label>
                                            <input
                                                type="date"
                                                value={customFrom}
                                                max={customTo || today}
                                                onChange={e => setCustomFrom(e.target.value)}
                                                style={{
                                                    padding: '6px 10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--cs-border)',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    background: 'var(--cs-surface)'
                                                }}
                                            />
                                        </div>
                                        <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)', fontWeight: 600 }}>to</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cs-text-muted)' }}>
                                                Ending Date:
                                            </label>
                                            <input
                                                type="date"
                                                value={customTo}
                                                min={customFrom}
                                                max={today}
                                                onChange={e => setCustomTo(e.target.value)}
                                                style={{
                                                    padding: '6px 10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--cs-border)',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    background: 'var(--cs-surface)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {studentTimeframe === 'all' && (
                                    <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                        Showing all recorded sessions since enrollment.
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Selected Student Details & Record Management */}
                        {studentLoading ? (
                            <div className="cs-card" style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--cs-text-muted)' }}>
                                Loading student attendance data…
                            </div>
                        ) : studentError ? (
                            <div className="cs-card" style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--cs-danger)' }}>
                                <AlertCircle size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.8 }} />
                                Unable to load student attendance: {studentError}
                            </div>
                        ) : !studentData ? (
                            <div className="cs-card" style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--cs-text-muted)' }}>
                                Please select a student from the dropdown above to view and manage their daily attendance.
                            </div>
                        ) : (
                            <>
                                {/* Student Profile & Attendance Overview Card */}
                                <div className="cs-card" style={{ padding: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div className="avatar-placeholder" style={{ width: 56, height: 56, fontSize: '20px', borderRadius: '14px' }}>
                                                {initials(studentData.student.name)}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--cs-text-primary)' }}>
                                                    {studentData.student.name}
                                                </div>
                                                <div style={{ fontSize: '13px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>
                                                    {studentData.student.email} • {studentData.student.phone || 'No phone'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Attendance Stats Badges */}
                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                            <div style={{ padding: '10px 16px', borderRadius: '10px', background: 'var(--cs-surface-dim)', textAlign: 'center' }}>
                                                <div style={{
                                                    fontSize: '22px', fontWeight: 800,
                                                    color: studentData.summary.total === 0 ? 'var(--cs-text-muted)' : rateColor(studentData.summary.rate)
                                                }}>
                                                    {studentData.summary.total > 0 ? `${studentData.summary.rate}%` : '—'}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontWeight: 600 }}>Attendance Rate</div>
                                            </div>
                                            <div style={{ padding: '10px 16px', borderRadius: '10px', background: 'var(--cs-surface-dim)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--cs-text-primary)' }}>
                                                    {studentData.summary.total}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontWeight: 600 }}>Total Days</div>
                                            </div>
                                            <div style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981' }}>
                                                    {studentData.summary.present}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#065F46', fontWeight: 600 }}>Present</div>
                                            </div>
                                            <div style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#EF4444' }}>
                                                    {studentData.summary.absent}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 600 }}>Absent</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--cs-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                        <span>Attendance metrics for:</span>
                                        <strong style={{ color: 'var(--cs-text-primary)' }}>{studentTimeframeLabel}</strong>
                                    </div>

                                    {/* Quick Record Attendance Form for this Particular Student */}
                                    {canMark && (
                                        <div style={{
                                            marginTop: '24px',
                                            padding: '18px 20px',
                                            borderRadius: '12px',
                                            background: 'var(--cs-border-subtle)',
                                            border: '1px solid var(--cs-border)'
                                        }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--cs-text-primary)' }}>
                                                Record or Update Attendance for {studentData.student.name}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                {/* Date */}
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--cs-text-muted)', marginBottom: '4px' }}>
                                                        Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={studentRecordDate}
                                                        max={today}
                                                        onChange={e => setStudentRecordDate(e.target.value)}
                                                        style={{
                                                            padding: '6px 10px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--cs-border)',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            background: 'var(--cs-surface)'
                                                        }}
                                                    />
                                                </div>

                                                {/* Batch */}
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--cs-text-muted)', marginBottom: '4px' }}>
                                                        Batch
                                                    </label>
                                                    <select
                                                        value={studentRecordBatchId || studentData?.student?.enrolledBatches?.[0]?.batchId || activeBatchId || batches?.[0]?.batchId || ''}
                                                        onChange={e => setStudentRecordBatchId(e.target.value)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--cs-border)',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            background: 'var(--cs-surface)',
                                                            minWidth: '150px'
                                                        }}
                                                    >
                                                        {batches && batches.length > 0 ? (
                                                            <>
                                                                {studentData?.student?.enrolledBatches?.filter(eb => !batches.some(b => b.batchId === eb.batchId)).map(eb => (
                                                                    <option key={eb.batchId} value={eb.batchId}>{eb.name} (Enrolled)</option>
                                                                ))}
                                                                {batches.map(b => (
                                                                    <option key={b.batchId} value={b.batchId}>{b.name} {b.branchName ? `(${b.branchName})` : ''}</option>
                                                                ))}
                                                            </>
                                                        ) : studentData?.student?.enrolledBatches && studentData.student.enrolledBatches.length > 0 ? (
                                                            studentData.student.enrolledBatches.map(eb => (
                                                                <option key={eb.batchId} value={eb.batchId}>{eb.name}</option>
                                                            ))
                                                        ) : (
                                                            <option value="">No Batches Available</option>
                                                        )}
                                                    </select>
                                                </div>

                                                {/* Status Selector */}
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--cs-text-muted)', marginBottom: '4px' }}>
                                                        Status
                                                    </label>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        {KEYS.map(k => {
                                                            const cfg = statusConfig[k];
                                                            const isSelected = studentRecordStatus === k;
                                                            return (
                                                                <button
                                                                    key={k}
                                                                    type="button"
                                                                    onClick={() => setStudentRecordStatus(k)}
                                                                    style={{
                                                                        padding: '5px 10px',
                                                                        borderRadius: '6px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                        border: `1px solid ${isSelected ? cfg.color : 'var(--cs-border)'}`,
                                                                        background: isSelected ? cfg.bg : 'var(--cs-surface)',
                                                                        color: isSelected ? cfg.color : 'var(--cs-text-muted)'
                                                                    }}
                                                                >
                                                                    {cfg.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Remarks */}
                                                <div style={{ flex: 1, minWidth: '180px' }}>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--cs-text-muted)', marginBottom: '4px' }}>
                                                        Remarks (Optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Doctor note, approved leave, traffic delay"
                                                        value={studentRecordRemarks}
                                                        onChange={e => setStudentRecordRemarks(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '6px 10px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--cs-border)',
                                                            fontSize: '12px',
                                                            background: 'var(--cs-surface)'
                                                        }}
                                                    />
                                                </div>

                                                {/* Save Button */}
                                                <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <button
                                                        type="button"
                                                        className="btn-primary"
                                                        style={{ padding: '7px 18px', fontSize: '12px' }}
                                                        disabled={saving}
                                                        onClick={saveStudentRecord}
                                                    >
                                                        {saving ? 'Saving…' : 'Save Record'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Confirmation Alert / Pop-up Displayed Below Save Button (Theme-Matched) */}
                                            {popupToast && (
                                                <div
                                                    style={{
                                                        marginTop: '14px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '12px',
                                                        padding: '10px 16px',
                                                        borderRadius: '10px',
                                                        background: popupToast.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                                                        border: `1px solid ${popupToast.type === 'success' ? '#86EFAC' : '#FECACA'}`,
                                                        color: popupToast.type === 'success' ? '#166534' : '#991B1B',
                                                        boxShadow: '0 2px 8px -2px rgba(16, 185, 129, 0.12)',
                                                        animation: 'modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '50%',
                                                            background: popupToast.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0
                                                        }}>
                                                            {popupToast.type === 'success' ? (
                                                                <CheckCircle2 size={16} color="#16A34A" />
                                                            ) : (
                                                                <AlertCircle size={16} color="#DC2626" />
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            <span>{popupToast.message}</span>
                                                            {popupToast.statusLabel && (
                                                                <span style={{
                                                                    background: popupToast.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                                                                    color: popupToast.type === 'success' ? '#166534' : '#991B1B',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 700
                                                                }}>
                                                                    {popupToast.statusLabel}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPopupToast(null)}
                                                        style={{
                                                            border: 'none',
                                                            background: 'transparent',
                                                            color: popupToast.type === 'success' ? '#16A34A' : '#DC2626',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            borderRadius: '6px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '14px',
                                                            fontWeight: 700,
                                                            lineHeight: 1
                                                        }}
                                                        title="Dismiss"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Daily Attendance History Log for this Student */}
                                <div className="cs-card">
                                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span>Attendance History ({studentData.records.length} records)</span>
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cs-primary)', background: 'rgba(79, 70, 229, 0.08)', padding: '2px 8px', borderRadius: '12px' }}>
                                                {studentTimeframeLabel}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                            Click status badge to toggle status.
                                        </div>
                                    </div>

                                    {studentData.records.length === 0 ? (
                                        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cs-text-muted)' }}>
                                            <Calendar size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.5 }} />
                                            <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                                No attendance records found for {studentTimeframeLabel}
                                            </div>
                                            <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                                Use the form above to record attendance for {studentData.student.name} or adjust the timeframe filter.
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="cs-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ minWidth: '160px' }}>Date</th>
                                                        <th style={{ minWidth: '140px' }}>Batch</th>
                                                        <th style={{ minWidth: '120px', textAlign: 'center' }}>Status</th>
                                                        <th style={{ minWidth: '240px' }}>Remarks</th>
                                                        <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {studentData.records.map(rec => {
                                                        const k = keyOf(rec.status) || 'P';
                                                        const cfg = statusConfig[k];

                                                        return (
                                                            <tr key={rec.attendanceId}>
                                                                <td style={{ fontWeight: 600, fontSize: '13px' }}>
                                                                    {formatFriendlyDate(rec.sessionDate)}
                                                                </td>
                                                                <td>
                                                                    <span style={{
                                                                        padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                                                                        background: 'rgba(79, 70, 229, 0.08)', color: 'var(--cs-primary)'
                                                                    }}>
                                                                        {rec.batchName}
                                                                    </span>
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <button
                                                                        disabled={!canMark}
                                                                        onClick={() => cycleStudentStatus(rec)}
                                                                        title="Click to cycle status"
                                                                        style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '6px',
                                                                            padding: '4px 10px',
                                                                            borderRadius: '6px',
                                                                            fontSize: '11px',
                                                                            fontWeight: 700,
                                                                            cursor: canMark ? 'pointer' : 'default',
                                                                            border: `1px solid ${cfg.border}`,
                                                                            background: cfg.bg,
                                                                            color: cfg.color
                                                                        }}
                                                                    >
                                                                        <cfg.icon size={13} />
                                                                        {cfg.label}
                                                                    </button>
                                                                </td>
                                                                <td style={{ fontSize: '12px', color: rec.remarks ? 'var(--cs-text-secondary)' : 'var(--cs-text-muted)' }}>
                                                                    {rec.remarks || '—'}
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    {canMark && (
                                                                        <button
                                                                            onClick={() => deleteStudentRecord(rec.sessionDate)}
                                                                            style={{
                                                                                background: 'none',
                                                                                border: 'none',
                                                                                cursor: 'pointer',
                                                                                color: 'var(--cs-danger)',
                                                                                padding: '4px',
                                                                                opacity: 0.8
                                                                            }}
                                                                            title="Delete record"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    VIEW 4: BATCH MATRIX REGISTER (COMPATIBLE MULTI-WEEK VIEW)
                    ═══════════════════════════════════════════════════════════════ */}
                {viewMode === 'matrix' && (
                    <div className="cs-card">
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            {attendanceFilters()}

                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button className="btn-ghost" style={{ padding: '6px' }} onClick={() => { setWeekOffset(w => w - 2); setMatrixEdits({}); }}><ChevronLeft size={16} /></button>
                                <span style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', fontWeight: 600 }}>{rangeLabel}</span>
                                <button className="btn-ghost" style={{ padding: '6px' }} onClick={() => { setWeekOffset(w => w + 2); setMatrixEdits({}); }}><ChevronRight size={16} /></button>
                            </div>
                        </div>

                        {/* Legend */}
                        {filteredBatches.length > 0 && register && register.students.length > 0 && (
                            <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>Legend (click a cell to change):</span>
                                {KEYS.map(k => {
                                    const cfg = statusConfig[k];
                                    return (
                                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: 24, height: 24, borderRadius: '6px', background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: cfg.color }}>{k}</span>
                                            <span style={{ fontSize: '12px', color: 'var(--cs-text-secondary)' }}>{cfg.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Matrix Content State */}
                        {batchError ? (
                            <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--cs-danger)', fontSize: '14px' }}>
                                <AlertCircle size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.8 }} />
                                Unable to load batches: {batchError}
                            </div>
                        ) : batchesLoading ? (
                            <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--cs-text-muted)', fontSize: '14px' }}>
                                Loading batches…
                            </div>
                        ) : !batches || batches.length === 0 ? (
                            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                                <Inbox size={32} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--cs-text-muted)' }} />
                                <div style={{ fontSize: '16px', fontWeight: 700 }}>No Batches Available</div>
                                <div style={{ fontSize: '13px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>
                                    Create a batch first to start recording attendance.
                                </div>
                            </div>
                        ) : registerError ? (
                            <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--cs-danger)', fontSize: '14px' }}>
                                <AlertCircle size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.8 }} />
                                Unable to load attendance register: {registerError}
                            </div>
                        ) : registerLoading || !register ? (
                            <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--cs-text-muted)', fontSize: '14px' }}>
                                Loading attendance register…
                            </div>
                        ) : register.students.length === 0 ? (
                            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                                <Users size={32} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--cs-text-muted)' }} />
                                <div style={{ fontSize: '16px', fontWeight: 700 }}>No Students Enrolled</div>
                                <div style={{ fontSize: '13px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>
                                    There are no students enrolled in <strong>{activeBatchName}</strong> yet. Enroll students to track attendance.
                                </div>
                            </div>
                        ) : register.sessions.length === 0 ? (
                            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                                <Calendar size={32} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--cs-text-muted)' }} />
                                <div style={{ fontSize: '16px', fontWeight: 700 }}>No Sessions Scheduled</div>
                                <div style={{ fontSize: '13px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>
                                    No class sessions are scheduled for <strong>{activeBatchName}</strong> between {rangeLabel}. Use the date arrows above to navigate to scheduled weeks or switch to Daily Attendance to record attendance for any day.
                                </div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="cs-table">
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: '180px' }}>Student</th>
                                            {register.sessions.map(d => {
                                                const label = new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
                                                return <th key={d} style={{ textAlign: 'center', minWidth: '56px' }}>{label}</th>;
                                            })}
                                            <th style={{ textAlign: 'center' }}>Present%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {register.students.map(s => {
                                            const marks = register.sessions.map(d => statusAtMatrix(s.studentId, d, s.records)).filter(Boolean);
                                            const attended = marks.filter(k => k === 'P' || k === 'L').length;
                                            const pct = marks.length > 0 ? Math.round((attended / marks.length) * 100) : null;

                                            return (
                                                <tr key={s.studentId}>
                                                    <td>
                                                        <div
                                                            onClick={() => openStudentAttendance(s.studentId)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                                            title="Click to manage attendance for this student"
                                                        >
                                                            <div className="avatar-placeholder" style={{ width: 30, height: 30, fontSize: '10px' }}>
                                                                {initials(s.name)}
                                                            </div>
                                                            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cs-primary)' }}>
                                                                {s.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {register.sessions.map(d => {
                                                        const key = statusAtMatrix(s.studentId, d, s.records);
                                                        const cfg = key ? statusConfig[key] : null;
                                                        return (
                                                            <td key={d} style={{ textAlign: 'center' }}>
                                                                <button
                                                                    disabled={!canMark}
                                                                    onClick={() => cycleMatrix(d, s.studentId, key)}
                                                                    style={{
                                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                        width: 28, height: 28, borderRadius: '6px',
                                                                        background: cfg?.bg ?? 'transparent',
                                                                        border: `1px ${cfg ? 'solid' : 'dashed'} ${cfg?.border ?? 'var(--cs-border)'}`,
                                                                        fontSize: '11px', fontWeight: 700, color: cfg?.color ?? 'var(--cs-text-muted)',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {key ?? '–'}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{
                                                            fontSize: '14px',
                                                            fontWeight: 700,
                                                            color: pct === null ? 'var(--cs-text-muted)' : pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444'
                                                        }}>
                                                            {pct === null ? '—' : `${pct}%`}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--cs-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={14} color="var(--cs-text-muted)" />
                                <span style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>
                                    Batch: {activeBatchName} • {register?.students.length ?? 0} students • {register?.sessions.length ?? 0} sessions shown
                                </span>
                            </div>
                            <button
                                className="btn-primary"
                                style={{ fontSize: '13px' }}
                                disabled={!canMark || saving || pendingMatrixChanges === 0}
                                onClick={saveMatrix}
                            >
                                <Check size={14} /> {saving ? 'Saving…' : `Save Changes${pendingMatrixChanges ? ` (${pendingMatrixChanges})` : ''}`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
