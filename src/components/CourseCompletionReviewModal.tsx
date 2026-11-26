'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import {
    Award, CheckCircle2, XCircle, AlertTriangle, Clock, Calendar, Check,
    FileText, User, BookOpen, GraduationCap, RefreshCw, ShieldCheck,
    Wallet, AlertCircle, ChevronRight, Send, CheckCircle
} from 'lucide-react';
import { api, formatDate, formatMoney } from '@/lib/api';

export interface ProgressData {
    enrollmentId: string;
    enrollmentStatus: string;
    studentId: string;
    studentName: string;
    enrollmentNumber: string;
    courseId: string;
    courseTitle: string;
    courseCode: string;
    batchId: string;
    batchName: string;
    branchId: string | null;
    branchName: string | null;
    startDate: string | null;
    endDate: string | null;
    durationMonths: number | null;
    durationElapsedMonths: number;
    durationSatisfied: boolean;
    sessionsTotal: number;
    sessionsAttended: number;
    sessionsExcused: number;
    sessionsAbsent: number;
    attendanceRate: number;
    attendanceSatisfied: boolean;
    sessionsSatisfied: boolean;
    assessmentsTotal: number;
    assessmentsCompleted: number;
    assessmentsPassed: number;
    assessmentsSatisfied: boolean;
    averageScore: number;
    marksSatisfied: boolean;
    tests: Array<{
        testId: string;
        title: string;
        testType: string;
        testDate: string;
        maxMarks: number;
        marksObtained: number | null;
        percentage: number | null;
        isAbsent: boolean;
        passed: boolean;
    }>;
    isEligible: boolean;
    unmetReasons: string[];
    completionRecord: {
        completionId: string;
        status: string;
        completionDate: string;
        finalResult: string;
        attendanceRate: number;
        sessionsAttended: number;
        sessionsTotal: number;
        assessmentsCompleted: number;
        averageScore: number;
        approvedByActorId: string | null;
        approvedByName?: string | null;
        remarks: string | null;
        returnRemarks: string | null;
        createdAt: string;
    } | null;
    financialSummary: {
        totalTuition: number;
        paidAmount: number;
        balanceAmount: number;
        isFeePaid: boolean;
    };
    completionPolicy: {
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
    };
    overallProgressPct: number;
}

interface Props {
    enrollmentId: string;
    initialProgress?: ProgressData | null;
    canManage?: boolean;
    onClose: () => void;
    onCompleted?: () => void;
}

export default function CourseCompletionReviewModal({
    enrollmentId,
    initialProgress,
    canManage = true,
    onClose,
    onCompleted
}: Props) {
    const [progress, setProgress] = useState<ProgressData | null>(initialProgress || null);
    const [loading, setLoading] = useState(!initialProgress);
    const [error, setError] = useState<string | null>(null);

    // Approval / Return actions state
    const [actionTab, setActionTab] = useState<'overview' | 'approve' | 'return'>('overview');
    const [finalResult, setFinalResult] = useState('Passed');
    const [approvalRemarks, setApprovalRemarks] = useState('');
    const [returnRemarks, setReturnRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const loadProgress = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api<ProgressData>(`/courses/completion?enrollmentId=${enrollmentId}`);
            setProgress(data);
            if (data.averageScore >= 85) setFinalResult('Distinction');
            else if (data.averageScore >= 60) setFinalResult('First Class');
            else if (data.averageScore >= 40) setFinalResult('Passed');
            else setFinalResult('Completed');
        } catch (err: any) {
            setError(err.message || 'Failed to fetch academic progress.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!initialProgress) {
            loadProgress();
        } else {
            if (initialProgress.averageScore >= 85) setFinalResult('Distinction');
            else if (initialProgress.averageScore >= 60) setFinalResult('First Class');
            else if (initialProgress.averageScore >= 40) setFinalResult('Passed');
            else setFinalResult('Completed');
        }
    }, [enrollmentId]);

    const handleApprove = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const res = await api<{ success: boolean; message: string }>('/courses/completion', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'approve',
                    enrollmentId,
                    finalResult,
                    remarks: approvalRemarks
                })
            });
            setActionSuccess(res.message);
            await loadProgress();
            if (onCompleted) onCompleted();
        } catch (err: any) {
            setError(err.message || 'Failed to approve course completion.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReturn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!returnRemarks.trim()) {
            setError('Remarks are required when returning a completion request.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const res = await api<{ success: boolean; message: string }>('/courses/completion', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'return',
                    enrollmentId,
                    remarks: returnRemarks.trim()
                })
            });
            setActionSuccess(res.message);
            await loadProgress();
            if (onCompleted) onCompleted();
        } catch (err: any) {
            setError(err.message || 'Failed to return completion request.');
        } finally {
            setSubmitting(false);
        }
    };

    const isCompleted = progress?.enrollmentStatus === 'completed';
    const isTransferred = progress?.enrollmentStatus === 'transferred';

    return (
        <Modal
            title={
                isCompleted ? "Course Completion Record & Graduation" :
                "Course Academic Progress & Completion Review"
            }
            onClose={onClose}
            maxWidth="760px"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
                {loading && (
                    <div style={{ textAlign: 'center', padding: '36px', color: 'var(--cs-text-muted)' }}>
                        <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px auto' }} />
                        <p>Calculating academic progress and verifying eligibility criteria...</p>
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: '12px 14px',
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                        color: '#991B1B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {actionSuccess && (
                    <div style={{
                        padding: '12px 14px',
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        borderRadius: '8px',
                        color: '#065F46',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <CheckCircle size={16} />
                        <span>{actionSuccess}</span>
                    </div>
                )}

                {progress && (
                    <>
                        {/* Student & Course Header Card */}
                        <div style={{
                            padding: '14px 16px',
                            background: isCompleted ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' : '#f8fafc',
                            border: `1px solid ${isCompleted ? '#bbf7d0' : '#e2e8f0'}`,
                            borderRadius: '10px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px'
                        }}>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Student</div>
                                <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{progress.studentName}</div>
                                <div style={{ fontSize: '11.5px', color: '#475569', fontFamily: 'monospace' }}>
                                    {progress.enrollmentNumber || '—'} • {progress.branchName || 'Main Campus'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Course & Batch</div>
                                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{progress.courseTitle}</div>
                                <div style={{ fontSize: '11.5px', color: '#475569' }}>
                                    Batch: <b>{progress.batchName}</b> ({progress.courseCode})
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Status & Result</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    {isCompleted ? (
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
                                            background: '#dcfce7', color: '#166534', border: '1px solid #86efac'
                                        }}>
                                            <Award size={13} /> Completed ({progress.completionRecord?.finalResult || 'Passed'})
                                        </span>
                                    ) : isTransferred ? (
                                        <span style={{
                                            padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
                                            background: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe'
                                        }}>
                                            Transferred
                                        </span>
                                    ) : progress.isEligible ? (
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
                                            background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd'
                                        }}>
                                            <CheckCircle2 size={13} /> Eligible for Completion
                                        </span>
                                    ) : (
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
                                            background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a'
                                        }}>
                                            <Clock size={13} /> In Progress ({progress.overallProgressPct}%)
                                        </span>
                                    )}
                                </div>
                                {isCompleted && progress.completionRecord?.completionDate && (
                                    <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                                        Completed on: {formatDate(progress.completionRecord.completionDate)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar Header */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cs-text-secondary)' }}>
                                    Overall Academic Completion Progress
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: isCompleted ? '#059669' : '#4f46e5' }}>
                                    {progress.overallProgressPct}%
                                </span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${Math.min(100, progress.overallProgressPct)}%`,
                                    height: '100%',
                                    background: isCompleted ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)',
                                    borderRadius: '999px',
                                    transition: 'width 0.4s ease'
                                }} />
                            </div>
                        </div>

                        {/* Academic Criteria Verification Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                            {/* Attendance */}
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: `1px solid ${progress.attendanceSatisfied ? '#bbf7d0' : '#fed7aa'}`,
                                background: progress.attendanceSatisfied ? '#f0fdf4' : '#fffbeb'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>Class Attendance</span>
                                    {progress.attendanceSatisfied ? <CheckCircle2 size={16} color="#16a34a" /> : <AlertTriangle size={16} color="#ea580c" />}
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0' }}>
                                    {progress.attendanceRate}%
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    {progress.sessionsAttended} attended of {progress.sessionsTotal} conducted
                                    {progress.completionPolicy.checkAttendance && ` (min ${progress.completionPolicy.minAttendancePct}% req)`}
                                </div>
                            </div>

                            {/* Assessments & Tests */}
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: `1px solid ${progress.assessmentsSatisfied ? '#bbf7d0' : '#fed7aa'}`,
                                background: progress.assessmentsSatisfied ? '#f0fdf4' : '#fffbeb'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>Assessments Completed</span>
                                    {progress.assessmentsSatisfied ? <CheckCircle2 size={16} color="#16a34a" /> : <AlertTriangle size={16} color="#ea580c" />}
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0' }}>
                                    {progress.assessmentsCompleted} / {progress.completionPolicy.requiredAssessments || 1}
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    {progress.assessmentsPassed} tests passed • {progress.assessmentsTotal} total scheduled
                                </div>
                            </div>

                            {/* Marks & Average Score */}
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: `1px solid ${progress.marksSatisfied ? '#bbf7d0' : '#fed7aa'}`,
                                background: progress.marksSatisfied ? '#f0fdf4' : '#fffbeb'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>Academic Test Score</span>
                                    {progress.marksSatisfied ? <CheckCircle2 size={16} color="#16a34a" /> : <AlertTriangle size={16} color="#ea580c" />}
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0' }}>
                                    {progress.averageScore > 0 ? `${progress.averageScore}%` : '—'}
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    {progress.completionPolicy.checkMarks ? `Minimum ${progress.completionPolicy.minPassingMarks}% pass mark required` : 'Passing score verified'}
                                </div>
                            </div>

                            {/* Duration */}
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: `1px solid ${progress.durationSatisfied ? '#bbf7d0' : '#fed7aa'}`,
                                background: progress.durationSatisfied ? '#f0fdf4' : '#fffbeb'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>Course Duration</span>
                                    {progress.durationSatisfied ? <CheckCircle2 size={16} color="#16a34a" /> : <Clock size={16} color="#ea580c" />}
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0' }}>
                                    {progress.durationElapsedMonths} / {progress.durationMonths || '—'} mo
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    Started: {progress.startDate ? formatDate(progress.startDate) : '—'}
                                </div>
                            </div>
                        </div>

                        {/* Separate Academic & Fee Status Banner (Step 7 Requirement) */}
                        <div style={{
                            padding: '10px 14px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px',
                            fontSize: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Wallet size={16} color="#64748b" />
                                <div>
                                    <span style={{ fontWeight: 600, color: '#334155' }}>Billing & Fee Status (Separate from Academic Completion): </span>
                                    <span>
                                        Total: <b>{formatMoney(progress.financialSummary.totalTuition)}</b> • Paid: <b style={{ color: '#16a34a' }}>{formatMoney(progress.financialSummary.paidAmount)}</b>
                                        {progress.financialSummary.balanceAmount > 0 && (
                                            <> • Outstanding: <b style={{ color: '#b91c1c' }}>{formatMoney(progress.financialSummary.balanceAmount)}</b></>
                                        )}
                                    </span>
                                </div>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                                {progress.financialSummary.balanceAmount > 0 ? 'Outstanding fee balance does not block course completion.' : 'All course tuition settled.'}
                            </span>
                        </div>

                        {/* Test Results Breakdown */}
                        {progress.tests && progress.tests.length > 0 && (
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: '12px', color: '#334155' }}>
                                    Conducted Assessment Results for this Batch
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9', textAlign: 'left', color: '#64748b' }}>
                                            <th style={{ padding: '6px 12px' }}>Test Title</th>
                                            <th style={{ padding: '6px 12px' }}>Type</th>
                                            <th style={{ padding: '6px 12px' }}>Date</th>
                                            <th style={{ padding: '6px 12px', textAlign: 'right' }}>Max Marks</th>
                                            <th style={{ padding: '6px 12px', textAlign: 'right' }}>Scored</th>
                                            <th style={{ padding: '6px 12px', textAlign: 'center' }}>Percentage</th>
                                            <th style={{ padding: '6px 12px', textAlign: 'center' }}>Result</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {progress.tests.map(t => (
                                            <tr key={t.testId} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                <td style={{ padding: '6px 12px', fontWeight: 600 }}>{t.title}</td>
                                                <td style={{ padding: '6px 12px', color: '#64748b' }}>{t.testType}</td>
                                                <td style={{ padding: '6px 12px', color: '#64748b' }}>{formatDate(t.testDate)}</td>
                                                <td style={{ padding: '6px 12px', textAlign: 'right' }}>{t.maxMarks}</td>
                                                <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>
                                                    {t.isAbsent ? <span style={{ color: '#dc2626' }}>Absent</span> : (t.marksObtained !== null ? t.marksObtained : '—')}
                                                </td>
                                                <td style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 700 }}>
                                                    {t.percentage !== null ? `${t.percentage}%` : '—'}
                                                </td>
                                                <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                                                    {t.isAbsent ? (
                                                        <span style={{ color: '#dc2626', fontWeight: 600 }}>Absent</span>
                                                    ) : t.passed ? (
                                                        <span style={{ color: '#16a34a', fontWeight: 600 }}>Passed</span>
                                                    ) : t.percentage !== null ? (
                                                        <span style={{ color: '#dc2626', fontWeight: 600 }}>Failed</span>
                                                    ) : (
                                                        <span style={{ color: '#64748b' }}>Pending</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Eligibility & Unmet Reasons */}
                        {!isCompleted && !isTransferred && (
                            <div>
                                {progress.isEligible ? (
                                    <div style={{
                                        padding: '12px 14px',
                                        background: '#ecfdf5',
                                        border: '1px solid #a7f3d0',
                                        borderRadius: '8px',
                                        color: '#065f46'
                                    }}>
                                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <CheckCircle2 size={16} /> Eligible for Course Completion
                                        </div>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                                            The student has fulfilled all attendance, session, and assessment requirements configured for this course.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '12px 14px',
                                        background: '#fff7ed',
                                        border: '1px solid #fed7aa',
                                        borderRadius: '8px',
                                        color: '#9a3412'
                                    }}>
                                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <AlertTriangle size={16} /> Completion Requirements Pending
                                        </div>
                                        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '12px', lineHeight: '1.5' }}>
                                            {progress.unmetReasons.map((r, i) => (
                                                <li key={i}>{r}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Existing Completion History / Return History */}
                        {progress.completionRecord && (
                            <div style={{
                                padding: '12px 14px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}>
                                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                                    Completion Audit History
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                                    <div>Status: <b style={{ textTransform: 'capitalize' }}>{progress.completionRecord.status}</b></div>
                                    <div>Date: <b>{formatDate(progress.completionRecord.completionDate)}</b></div>
                                    <div>Final Result: <b>{progress.completionRecord.finalResult}</b></div>
                                    {progress.completionRecord.approvedByName && (
                                        <div>Reviewed By: <b>{progress.completionRecord.approvedByName}</b></div>
                                    )}
                                </div>
                                {progress.completionRecord.remarks && (
                                    <div style={{ marginTop: '6px', color: '#475569' }}>
                                        <b>Approval Remarks:</b> {progress.completionRecord.remarks}
                                    </div>
                                )}
                                {progress.completionRecord.returnRemarks && (
                                    <div style={{ marginTop: '6px', color: '#b45309' }}>
                                        <b>Return for Review Remarks:</b> {progress.completionRecord.returnRemarks}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Panel for Authorized Staff */}
                        {canManage && !isCompleted && !isTransferred && (
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                                {actionTab === 'overview' ? (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={() => setActionTab('return')}
                                            style={{ color: '#b45309', borderColor: '#fde68a', background: '#fffbeb' }}
                                        >
                                            Return for Review...
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={() => setActionTab('approve')}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <Award size={15} /> Finalize & Approve Completion...
                                        </button>
                                    </div>
                                ) : actionTab === 'approve' ? (
                                    <form onSubmit={handleApprove} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Award size={16} /> Finalize Course Completion & Award Result
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                                            <div>
                                                <label className="cs-label">Final Result / Grade *</label>
                                                <select
                                                    className="cs-input"
                                                    value={finalResult}
                                                    onChange={e => setFinalResult(e.target.value)}
                                                    required
                                                >
                                                    <option value="Distinction">Distinction</option>
                                                    <option value="First Class">First Class</option>
                                                    <option value="Passed">Passed</option>
                                                    <option value="Completed">Completed</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="cs-label">Approval Remarks (Optional)</label>
                                                <input
                                                    className="cs-input"
                                                    placeholder="e.g. Excellent practical performance; met all graduation criteria."
                                                    value={approvalRemarks}
                                                    onChange={e => setApprovalRemarks(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                                            <button type="button" className="btn-secondary" onClick={() => setActionTab('overview')}>Cancel</button>
                                            <button
                                                type="submit"
                                                className="btn-primary"
                                                disabled={submitting}
                                                style={{ background: '#16a34a', borderColor: '#15803d' }}
                                            >
                                                {submitting ? 'Confirming...' : 'Confirm Course Completion'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <form onSubmit={handleReturn} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <AlertTriangle size={16} /> Return Completion Request for Academic Review
                                        </div>
                                        <div>
                                            <label className="cs-label">Specific Remarks / Missing Criteria <span style={{ color: '#dc2626' }}>*</span></label>
                                            <textarea
                                                className="cs-input"
                                                rows={2}
                                                required
                                                placeholder="Specify exact missing requirements (e.g. Needs to retake Unit Test 2; attendance short by 2 sessions)..."
                                                value={returnRemarks}
                                                onChange={e => setReturnRemarks(e.target.value)}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                                            <button type="button" className="btn-secondary" onClick={() => setActionTab('overview')}>Cancel</button>
                                            <button
                                                type="submit"
                                                className="btn-primary"
                                                disabled={submitting || !returnRemarks.trim()}
                                                style={{ background: '#d97706', borderColor: '#b45309' }}
                                            >
                                                {submitting ? 'Submitting...' : 'Return Request with Remarks'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
}
