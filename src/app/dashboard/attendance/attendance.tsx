'use client';
import Topbar from '@/components/Topbar';
import { useState, useEffect } from 'react';
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
    Filter
} from 'lucide-react';
import { api, useApi, initials } from '@/lib/api';
import { can, useSession } from '@/lib/session';

interface Register {
    sessions: string[];
    students: Array<{ studentId: string; name: string; records: Record<string, string> }>;
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
        overallRate: number;
    }>;
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
    const canMark = can(session, 'attendance.write');
    const today = getTodayIso();

    // Navigation & View Mode
    const [viewMode, setViewMode] = useState<'daily' | 'student' | 'matrix'>('daily');
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

    // Mode 1: Daily Roll Call state
    const [dailyDate, setDailyDate] = useState<string>(today);
    const [dailyEdits, setDailyEdits] = useState<Record<string, { status: StatusKey; remarks: string }>>({});
    const [dailySearch, setDailySearch] = useState<string>('');

    // Mode 2: Student Attendance state & timeframe filters
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [studentSearch, setStudentSearch] = useState<string>('');
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

    // Mode 3: Matrix Register state
    const [weekOffset, setWeekOffset] = useState(0);
    const [matrixEdits, setMatrixEdits] = useState<Record<string, Record<string, StatusKey>>>({});

    // Shared feedback & loading states
    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');
    const [saving, setSaving] = useState(false);

    // Queries
    const { data: batches, error: batchError, loading: batchesLoading } = useApi<Array<{ batchId: string; name: string }>>('/batches');
    const { data: studentsList } = useApi<{ students: Array<{ studentId: string; firstName: string; lastName: string; email: string; batches?: string }> }>('/students?limit=200');

    // Effective batch
    const activeBatchId = selectedBatchId ?? batches?.[0]?.batchId ?? null;
    const activeBatchName = batches?.find(b => b.batchId === activeBatchId)?.name ?? '';

    // Register query for matrix
    const start = windowStart(weekOffset);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 13);
    const { data: register, error: registerError, reload: reloadRegister, loading: registerLoading } = useApi<Register>(
        activeBatchId ? `/attendance?batchId=${activeBatchId}&from=${iso(start)}&to=${iso(end)}` : null
    );

    // Daily roll call query
    const { data: dailyData, error: dailyError, reload: reloadDaily, loading: dailyLoading } = useApi<DailyAttendanceResponse>(
        activeBatchId && dailyDate ? `/attendance?batchId=${activeBatchId}&date=${dailyDate}` : null
    );

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

    // Ensure student record batch id has default
    useEffect(() => {
        if (activeBatchId && !studentRecordBatchId) {
            setStudentRecordBatchId(activeBatchId);
        }
    }, [activeBatchId, studentRecordBatchId]);

    // Ensure student picker defaults to first student if none selected
    useEffect(() => {
        if (!selectedStudentId) {
            if (dailyData?.students && dailyData.students.length > 0) {
                setSelectedStudentId(dailyData.students[0].studentId);
            } else if (studentsList?.students && studentsList.students.length > 0) {
                setSelectedStudentId(studentsList.students[0].studentId);
            }
        }
    }, [selectedStudentId, dailyData, studentsList]);

    // Handlers for Daily Roll Call
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
        setMessage('Attendance cleared for this date.');
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

    // Handlers for Particular Student Attendance Management
    const saveStudentRecord = async () => {
        if (!selectedStudentId || !studentRecordBatchId) return;
        setSaving(true);
        try {
            await api('/attendance', {
                method: 'POST',
                body: JSON.stringify({
                    batchId: studentRecordBatchId,
                    sessionDate: studentRecordDate,
                    studentId: selectedStudentId,
                    status: statusConfig[studentRecordStatus].value,
                    remarks: studentRecordRemarks || null
                })
            });

            setMessage(`Attendance recorded on ${formatFriendlyDate(studentRecordDate)}.`);
            setMessageType('success');
            setStudentRecordRemarks('');
            reloadStudent();
            reloadDaily();
            reloadRegister();
        } catch (err) {
            setMessage((err as Error).message);
            setMessageType('error');
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
    if (viewMode === 'daily') {
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
    };

    return (
        <>
            <Topbar
                title="Attendance & Register"
                subtitle="Daily roll call, student attendance tracking, and batch schedules"
                action={canMark ? {
                    label: 'Mark Today',
                    onClick: () => {
                        setViewMode('daily');
                        setDailyDate(today);
                        markAllDaily('P');
                    },
                    hint: 'Quick mark all students present for today'
                } : undefined}
            />

            <div className="page-body">
                {/* Feedback Toast / Banner */}
                {message && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: messageType === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${messageType === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        color: messageType === 'success' ? '#065F46' : '#991B1B',
                        fontSize: '13px',
                        fontWeight: 500
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {messageType === 'success' ? <CheckCircle2 size={16} color="#10B981" /> : <AlertCircle size={16} color="#EF4444" />}
                            <span>{message}</span>
                        </div>
                        <button
                            onClick={() => setMessage(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '13px', fontWeight: 600 }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* View Mode Switcher Pills */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '6px', background: 'var(--cs-border-subtle)', padding: '4px', borderRadius: '10px' }}>
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
                        {viewMode === 'daily' && `Marking roll call for: ${formatFriendlyDate(dailyDate)}`}
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
                            <div key={key} className="cs-card" style={{ padding: '20px', borderColor: cfg.border }}>
                                <div style={{ fontSize: '28px', fontWeight: 800, color: cfg.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    {count}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', marginTop: '2px', fontWeight: 500 }}>
                                    {cfg.label}
                                </div>
                                <div style={{ marginTop: '10px' }}>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${pct}%`, background: cfg.color }} />
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>
                                        {pct}% of {viewMode === 'daily' ? 'today\'s roll call' : viewMode === 'student' ? 'student sessions' : 'marks'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* MAIN CONTENT AREA */}

                {/* ═══════════════════════════════════════════════════════════════
                    VIEW 1: DAILY ATTENDANCE (ROLL CALL)
                    ═══════════════════════════════════════════════════════════════ */}
                {viewMode === 'daily' && (
                    <div className="cs-card">
                        {/* Daily Toolbar: Date Picker & Batch Pills */}
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
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

                            {/* Batch Pills */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-muted)' }}>Batch:</span>
                                {batches?.map(b => (
                                    <button
                                        key={b.batchId}
                                        onClick={() => { setSelectedBatchId(b.batchId); setMessage(null); }}
                                        style={{
                                            padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600,
                                            cursor: 'pointer', border: '1px solid',
                                            borderColor: activeBatchId === b.batchId ? 'rgba(79, 70, 229, 0.4)' : 'var(--cs-border)',
                                            background: activeBatchId === b.batchId ? 'rgba(79, 70, 229, 0.12)' : 'transparent',
                                            color: activeBatchId === b.batchId ? 'var(--cs-primary)' : 'var(--cs-text-muted)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {b.name}
                                    </button>
                                ))}
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
                                        borderRadius: '6px',
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
                                <div style={{ fontSize: '15px', fontWeight: 600 }}>No students enrolled in {activeBatchName}</div>
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
                                                            <span style={{
                                                                fontSize: '13px',
                                                                fontWeight: 700,
                                                                color: s.overallRate >= 80 ? '#10B981' : s.overallRate >= 60 ? '#F59E0B' : '#EF4444'
                                                            }}>
                                                                {s.overallRate}%
                                                            </span>
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
                    VIEW 2: STUDENT ATTENDANCE (PARTICULAR STUDENT DAILY BASES)
                    ═══════════════════════════════════════════════════════════════ */}
                {viewMode === 'student' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Student Picker & Timeframe Filter Bar */}
                        <div className="cs-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                                            minWidth: '260px',
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
                                        {(studentsList?.students ?? []).map(st => (
                                            <option key={st.studentId} value={st.studentId}>
                                                {st.firstName} {st.lastName} {st.batches ? `(${st.batches})` : ''}
                                            </option>
                                        ))}
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
                                                    color: studentData.summary.rate >= 80 ? '#10B981' : studentData.summary.rate >= 60 ? '#F59E0B' : '#EF4444'
                                                }}>
                                                    {studentData.summary.rate}%
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
                                                        value={studentRecordBatchId}
                                                        onChange={e => setStudentRecordBatchId(e.target.value)}
                                                        style={{
                                                            padding: '6px 10px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--cs-border)',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            background: 'var(--cs-surface)'
                                                        }}
                                                    >
                                                        {batches?.map(b => (
                                                            <option key={b.batchId} value={b.batchId}>{b.name}</option>
                                                        ))}
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
                                                <div style={{ alignSelf: 'flex-end' }}>
                                                    <button
                                                        className="btn-primary"
                                                        style={{ padding: '7px 16px', fontSize: '12px' }}
                                                        disabled={saving}
                                                        onClick={saveStudentRecord}
                                                    >
                                                        {saving ? 'Saving…' : 'Save Record'}
                                                    </button>
                                                </div>
                                            </div>
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
                    VIEW 3: BATCH MATRIX REGISTER (COMPATIBLE MULTI-WEEK VIEW)
                    ═══════════════════════════════════════════════════════════════ */}
                {viewMode === 'matrix' && (
                    <div className="cs-card">
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} color="var(--cs-primary)" />
                                <span style={{ fontSize: '15px', fontWeight: 700 }}>Batch:</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {batches?.map(b => (
                                    <button
                                        key={b.batchId}
                                        onClick={() => { setSelectedBatchId(b.batchId); setMatrixEdits({}); setMessage(null); }}
                                        style={{
                                            padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                            cursor: 'pointer', border: '1px solid',
                                            borderColor: activeBatchId === b.batchId ? 'rgba(79, 70, 229, 0.4)' : 'var(--cs-border)',
                                            background: activeBatchId === b.batchId ? 'rgba(79, 70, 229, 0.12)' : 'transparent',
                                            color: activeBatchId === b.batchId ? 'var(--cs-primary)' : 'var(--cs-text-muted)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {b.name}
                                    </button>
                                ))}
                            </div>

                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button className="btn-ghost" style={{ padding: '6px' }} onClick={() => { setWeekOffset(w => w - 2); setMatrixEdits({}); }}><ChevronLeft size={16} /></button>
                                <span style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', fontWeight: 600 }}>{rangeLabel}</span>
                                <button className="btn-ghost" style={{ padding: '6px' }} onClick={() => { setWeekOffset(w => w + 2); setMatrixEdits({}); }}><ChevronRight size={16} /></button>
                            </div>
                        </div>

                        {/* Legend */}
                        {batches && batches.length > 0 && register && register.students.length > 0 && (
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
