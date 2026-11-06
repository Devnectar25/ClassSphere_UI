'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check, Users } from 'lucide-react';
import { api, useApi, initials } from '@/lib/api';
import { can, useSession } from '@/lib/session';

interface Register {
    sessions: string[];
    students: Array<{ studentId: string; name: string; records: Record<string, string> }>;
}

const statusConfig = {
    P: { value: 'present', label: 'Present', color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
    A: { value: 'absent', label: 'Absent', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
    L: { value: 'late', label: 'Late', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
    E: { value: 'excused', label: 'Excused', color: '#06B6D4', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.3)' },
};
type StatusKey = keyof typeof statusConfig;
const KEYS = Object.keys(statusConfig) as StatusKey[];
const keyOf = (value: string | undefined) => KEYS.find(k => statusConfig[k].value === value);

const iso = (d: Date) => d.toISOString().split('T')[0];

function windowStart(offsetWeeks: number) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) - 7 + offsetWeeks * 7); // Monday of previous week
    return d;
}

export default function AttendancePage() {
    const session = useSession();
    const canMark = can(session, 'attendance.write');
    const { data: batches, error: batchError } = useApi<Array<{ batchId: string; name: string }>>('/batches');
    const [selected, setSelected] = useState<string | null>(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const [edits, setEdits] = useState<Record<string, Record<string, StatusKey>>>({}); // date -> studentId -> status
    const [message, setMessage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const today = iso(new Date());
    const batchId = selected ?? batches?.[0]?.batchId ?? null;
    const batchName = batches?.find(b => b.batchId === batchId)?.name ?? '';
    const start = windowStart(weekOffset);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 13);
    const { data: register, error, reload } = useApi<Register>(
        batchId ? `/attendance?batchId=${batchId}&from=${iso(start)}&to=${iso(end)}` : null);

    const statusAt = (studentId: string, date: string, records: Record<string, string>) =>
        edits[date]?.[studentId] ?? keyOf(records[date]);

    const setStatus = (date: string, studentId: string, key: StatusKey) =>
        setEdits(prev => ({ ...prev, [date]: { ...prev[date], [studentId]: key } }));

    const cycle = (date: string, studentId: string, current: StatusKey | undefined) =>
        setStatus(date, studentId, KEYS[(current ? KEYS.indexOf(current) + 1 : 0) % KEYS.length]);

    // Attendance is only taken on the batch's scheduled days; say so on the button instead of failing on click
    const hasSessionToday = register?.sessions.includes(today) ?? false;
    const nextSession = register?.sessions.find(d => d > today);
    const markHint = hasSessionToday ? undefined
        : start > new Date() || end < new Date() ? 'Go to the current week to mark today'
        : `${batchName} has no class today${nextSession ? ` — next session ${new Date(`${nextSession}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}`;

    const markToday = () => {
        if (!register || !hasSessionToday) return;
        register.students.forEach(s => { if (!statusAt(s.studentId, today, s.records)) setStatus(today, s.studentId, 'P'); });
        setMessage('Unmarked students set to Present for today. Save to record the register.');
    };

    const save = async () => {
        setSaving(true);
        try {
            for (const [sessionDate, byStudent] of Object.entries(edits)) {
                const records = Object.entries(byStudent).map(([studentId, key]) => ({ studentId, status: statusConfig[key].value }));
                await api('/attendance', { method: 'POST', body: JSON.stringify({ batchId, sessionDate, records }) });
            }
            setEdits({});
            setMessage('Attendance saved.');
            reload();
        } catch (err) {
            setMessage((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const counts: Record<string, number> = {};
    register?.students.forEach(s => register.sessions.forEach(d => {
        const k = statusAt(s.studentId, d, s.records);
        if (k) counts[k] = (counts[k] || 0) + 1;
    }));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const pendingChanges = Object.values(edits).reduce((n, d) => n + Object.keys(d).length, 0);
    const label = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    const rangeLabel = `${new Date(`${iso(start)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(`${iso(end)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return (
        <>
            <Topbar title="Attendance Register" subtitle="Track session-by-session attendance across all batches" action={canMark ? {
                label: hasSessionToday || !register ? 'Mark Today' : 'No Class Today', onClick: markToday, disabled: !hasSessionToday, hint: markHint,
            } : undefined} />
            <div className="page-body">

                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {KEYS.map(key => {
                        const cfg = statusConfig[key];
                        return (
                            <div key={key} className="cs-card" style={{ padding: '20px', borderColor: cfg.border }}>
                                <div style={{ fontSize: '28px', fontWeight: 800, color: cfg.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    {counts[key] || 0}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', marginTop: '2px' }}>{cfg.label}</div>
                                <div style={{ marginTop: '10px' }}>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${total > 0 ? ((counts[key] || 0) / total) * 100 : 0}%`, background: cfg.color }} />
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>
                                        {total > 0 ? Math.round(((counts[key] || 0) / total) * 100) : 0}% of marks
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Batch selector + register */}
                <div className="cs-card">
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={18} color="var(--cs-primary)" />
                            <span style={{ fontSize: '15px', fontWeight: 700 }}>Batch:</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {batches?.map(b => (
                                <button
                                    key={b.batchId}
                                    onClick={() => { setSelected(b.batchId); setEdits({}); setMessage(null); }}
                                    style={{
                                        padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                        cursor: 'pointer', border: '1px solid',
                                        borderColor: batchId === b.batchId ? 'rgba(108,99,255,0.4)' : 'var(--cs-border)',
                                        background: batchId === b.batchId ? 'rgba(108,99,255,0.15)' : 'transparent',
                                        color: batchId === b.batchId ? '#8B85FF' : 'var(--cs-text-muted)',
                                        transition: 'all 0.2s'
                                    }}
                                >{b.name}</button>
                            ))}
                        </div>

                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button className="btn-ghost" style={{ padding: '6px' }} onClick={() => { setWeekOffset(w => w - 2); setEdits({}); }}><ChevronLeft size={16} /></button>
                            <span style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', fontWeight: 600 }}>{rangeLabel}</span>
                            <button className="btn-ghost" style={{ padding: '6px' }} onClick={() => { setWeekOffset(w => w + 2); setEdits({}); }}><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    {/* Legend */}
                    <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', gap: '16px', alignItems: 'center' }}>
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

                    {/* Grid */}
                    {!register ? <PageState error={batchError ?? error} /> : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="cs-table">
                                <thead>
                                    <tr>
                                        <th style={{ minWidth: '160px' }}>Student</th>
                                        {register.sessions.map(d => <th key={d} style={{ textAlign: 'center', minWidth: '56px' }}>{label(d)}</th>)}
                                        <th style={{ textAlign: 'center' }}>Present%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {register.students.map(s => {
                                        const marks = register.sessions.map(d => statusAt(s.studentId, d, s.records)).filter(Boolean);
                                        const attended = marks.filter(k => k === 'P' || k === 'L').length;
                                        const pct = marks.length > 0 ? Math.round((attended / marks.length) * 100) : null;
                                        return (
                                            <tr key={s.studentId}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div className="avatar-placeholder" style={{ width: 30, height: 30, fontSize: '10px' }}>{initials(s.name)}</div>
                                                        <span style={{ fontWeight: 500, fontSize: '13px' }}>{s.name}</span>
                                                    </div>
                                                </td>
                                                {register.sessions.map(d => {
                                                    const key = statusAt(s.studentId, d, s.records);
                                                    const cfg = key ? statusConfig[key] : null;
                                                    return (
                                                        <td key={d} style={{ textAlign: 'center' }}>
                                                            <button disabled={!canMark} onClick={() => cycle(d, s.studentId, key)} style={{
                                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                width: 28, height: 28, borderRadius: '6px',
                                                                background: cfg?.bg ?? 'transparent', border: `1px ${cfg ? 'solid' : 'dashed'} ${cfg?.border ?? 'var(--cs-border)'}`,
                                                                fontSize: '11px', fontWeight: 700, color: cfg?.color ?? 'var(--cs-text-muted)',
                                                                cursor: 'pointer'
                                                            }}>
                                                                {key ?? '–'}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: pct === null ? 'var(--cs-text-muted)' : pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444' }}>
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
                                {message ?? `Batch: ${batchName} • ${register?.students.length ?? 0} students • ${register?.sessions.length ?? 0} sessions shown`}
                            </span>
                        </div>
                        <button className="btn-primary" style={{ fontSize: '13px' }} disabled={!canMark || saving || pendingChanges === 0} onClick={save}>
                            <Check size={14} /> {saving ? 'Saving…' : `Save Changes${pendingChanges ? ` (${pendingChanges})` : ''}`}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
