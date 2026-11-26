'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import {
    Award, CheckCircle2, Clock, AlertTriangle, Search, Filter,
    RefreshCw, User, BookOpen, GraduationCap, ChevronRight, Check
} from 'lucide-react';
import { api, formatDate } from '@/lib/api';
import CourseCompletionReviewModal, { ProgressData } from './CourseCompletionReviewModal';

interface Props {
    onClose: () => void;
    canManage?: boolean;
}

export default function CourseCompletionQueueModal({ onClose, canManage = true }: Props) {
    const [candidates, setCandidates] = useState<ProgressData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'eligible' | 'completed' | 'returned'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);

    const loadCandidates = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api<ProgressData[]>(`/courses/completion?status=${statusFilter}`);
            setCandidates(data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load completion candidates.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCandidates();
    }, [statusFilter]);

    const filtered = candidates.filter(c => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
            c.studentName.toLowerCase().includes(q) ||
            c.enrollmentNumber.toLowerCase().includes(q) ||
            c.courseTitle.toLowerCase().includes(q) ||
            c.batchName.toLowerCase().includes(q) ||
            (c.branchName && c.branchName.toLowerCase().includes(q))
        );
    });

    return (
        <>
            <Modal
                title="Course Completion & Graduation Queue"
                onClose={onClose}
                maxWidth="900px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                    {/* Top Filters & Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        {/* Status Filter Tabs */}
                        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                            {[
                                { key: 'all', label: 'All Candidates' },
                                { key: 'eligible', label: 'Eligible for Review' },
                                { key: 'completed', label: 'Completed' },
                                { key: 'returned', label: 'Returned for Review' },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setStatusFilter(tab.key as any)}
                                    style={{
                                        border: 'none',
                                        background: statusFilter === tab.key ? '#ffffff' : 'transparent',
                                        color: statusFilter === tab.key ? '#0f172a' : '#64748b',
                                        fontWeight: statusFilter === tab.key ? 700 : 500,
                                        fontSize: '12px',
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        boxShadow: statusFilter === tab.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Input & Refresh */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    className="cs-input"
                                    placeholder="Search student, course, batch..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    style={{ paddingLeft: '30px', height: '32px', fontSize: '12px', width: '220px' }}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={loadCandidates}
                                style={{ height: '32px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                title="Refresh"
                            >
                                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Content Table */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                            <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px auto' }} />
                            <p>Loading course completion records...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b' }}>
                            {error}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
                            <Award size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                            <div style={{ fontWeight: 600, color: '#334155' }}>No completion candidates found</div>
                            <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>
                                {statusFilter === 'eligible' ? 'No students are currently eligible and waiting for review.' : 'No student course records match the selected filter.'}
                            </p>
                        </div>
                    ) : (
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                                        <th style={{ padding: '10px 14px' }}>Student</th>
                                        <th style={{ padding: '10px 14px' }}>Course & Batch</th>
                                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>Attendance</th>
                                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>Assessments</th>
                                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(c => {
                                        const isComp = c.enrollmentStatus === 'completed';
                                        return (
                                            <tr key={c.enrollmentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.studentName}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                                        {c.enrollmentNumber} • {c.branchName || 'Main Campus'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.courseTitle}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>Batch: {c.batchName}</div>
                                                </td>
                                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                    <div style={{ fontWeight: 700, color: c.attendanceSatisfied ? '#16a34a' : '#d97706' }}>
                                                        {c.attendanceRate}%
                                                    </div>
                                                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                                                        {c.sessionsAttended}/{c.sessionsTotal} sessions
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                    <div style={{ fontWeight: 700, color: c.assessmentsSatisfied ? '#16a34a' : '#d97706' }}>
                                                        {c.assessmentsCompleted} / {c.completionPolicy.requiredAssessments || 1}
                                                    </div>
                                                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                                                        Avg: {c.averageScore > 0 ? `${c.averageScore}%` : '—'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                    {isComp ? (
                                                        <span style={{
                                                            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                                                            background: '#dcfce7', color: '#166534', border: '1px solid #86efac'
                                                        }}>
                                                            Completed ({c.completionRecord?.finalResult || 'Passed'})
                                                        </span>
                                                    ) : c.completionRecord?.status === 'returned' ? (
                                                        <span style={{
                                                            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                                                            background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa'
                                                        }}>
                                                            Returned for Review
                                                        </span>
                                                    ) : c.isEligible ? (
                                                        <span style={{
                                                            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                                                            background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd'
                                                        }}>
                                                            Eligible ({c.overallProgressPct}%)
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
                                                            background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0'
                                                        }}>
                                                            In Progress ({c.overallProgressPct}%)
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedEnrollmentId(c.enrollmentId)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '11.5px',
                                                            fontWeight: 600,
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #c7d2fe',
                                                            background: '#eef2ff',
                                                            color: '#4f46e5',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Award size={12} />
                                                        {isComp ? 'View Record' : 'Review'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Individual Review Modal */}
            {selectedEnrollmentId && (
                <CourseCompletionReviewModal
                    enrollmentId={selectedEnrollmentId}
                    canManage={canManage}
                    onClose={() => setSelectedEnrollmentId(null)}
                    onCompleted={() => {
                        setSelectedEnrollmentId(null);
                        loadCandidates();
                    }}
                />
            )}
        </>
    );
}
