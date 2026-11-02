'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useApi, initials } from '@/lib/api';

interface Schedule {
    weekday: number;
    day: string;
    startKey: string;
    startTime: string;
    endTime: string;
    sessionType: string;
}

interface Batch {
    batchId: string;
    name: string;
    courseTitle: string;
    instructorName: string | null;
    room: string | null;
    branchName: string;
    capacity: number;
    enrolledCount: number;
    status: string;
    schedules: Schedule[];
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function BatchesPage() {
    const [activeTab, setActiveTab] = useState('batches');
    const { data: batches, error } = useApi<Batch[]>('/batches');

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
                                            <div key={`${s.batch.batchId}-${s.startKey}`} style={{ background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', borderRadius: '8px', padding: '10px' }}>
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
        </>
    );
}
