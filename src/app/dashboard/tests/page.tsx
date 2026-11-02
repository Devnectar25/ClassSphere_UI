'use client';
import { useState } from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import { ArrowLeft, Printer, Send, Save, ClipboardCheck } from 'lucide-react';
import { api, useApi, formatDate } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';
import { TEST_TYPES, gradeClass } from '@/lib/academy';

interface TestSummary {
    testId: string;
    title: string;
    testType: string;
    testDate: string;
    status: 'scheduled' | 'completed' | 'published';
    batchName: string;
    courseTitle: string;
    subjects: Array<{ name: string; maxMarks: number }>;
    classSize: number;
    graded: number;
}

interface Mark { marks: number | null; absent: boolean; remarks: string | null; grade: string | null }

interface Report {
    test: { testId: string; title: string; testType: string; testDate: string; status: string; batchName: string; courseTitle: string };
    subjects: Array<{ subjectId: string; name: string; maxMarks: number }>;
    maxTotal: number;
    students: Array<{
        studentId: string; name: string; enrollmentNumber: string; marks: Record<string, Mark>;
        total: number | null; percentage: number | null; grade: string | null; rank: number | null;
    }>;
    summary: { classSize: number; graded: number; averagePercentage: number | null; highestPercentage: number | null; passed: number };
}

const STATUS: Record<string, string> = { scheduled: 'badge-warning', completed: 'badge-info', published: 'badge-success' };

export default function TestsPage() {
    const session = useSession();
    const canEdit = can(session, 'tests.write');
    const { data: tests, error, reload } = useApi<TestSummary[]>('/tests');
    const [openTest, setOpenTest] = useState<string | null>(null);
    const [scheduling, setScheduling] = useState(false);

    if (openTest) return <MarksSheet testId={openTest} canEdit={canEdit} onBack={() => { setOpenTest(null); reload(); }} />;

    return (
        <>
            <Topbar title="Tests & Results" subtitle="Schedule tests by subject, record marks and publish report cards to parents"
                action={canEdit ? { label: 'Schedule Test', onClick: () => setScheduling(true) } : undefined} />
            <div className="page-body">
                {!tests ? <PageState error={error} /> : (
                    <div className="cs-card">
                        <table className="cs-table">
                            <thead>
                                <tr>
                                    <th>Test</th>
                                    <th>Batch</th>
                                    <th>Subjects</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Graded</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tests.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--cs-text-muted)' }}>No tests scheduled yet.</td></tr>}
                                {tests.map(t => (
                                    <tr key={t.testId}>
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{t.title}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{t.testType}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px' }}>{t.batchName}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{t.courseTitle}</div>
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--cs-text-secondary)' }}>
                                            {t.subjects.map(s => `${s.name} (${s.maxMarks})`).join(', ')}
                                        </td>
                                        <td className="cell-nowrap" style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>{formatDate(t.testDate)}</td>
                                        <td><span className={`badge ${STATUS[t.status]}`}>{t.status}</span></td>
                                        <td className="cell-nowrap" style={{ fontSize: '13px' }}>{t.graded}/{t.classSize}</td>
                                        <td>
                                            <button className="btn-secondary cell-nowrap" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => setOpenTest(t.testId)}>
                                                <ClipboardCheck size={13} /> {canEdit && t.status !== 'published' ? 'Enter marks' : 'Results'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {scheduling && <ScheduleTest onClose={() => setScheduling(false)} onScheduled={() => { setScheduling(false); reload(); }} />}
        </>
    );
}

function ScheduleTest({ onClose, onScheduled }: { onClose: () => void; onScheduled: () => void }) {
    const { data: batches } = useApi<Array<{ batchId: string; name: string; courseId: string; courseTitle: string }>>('/batches');
    const { data: courses } = useApi<Array<{ courseId: string; subjects: Array<{ subjectId: string; name: string }> }>>('/courses');
    const [form, setForm] = useState({ batchId: '', title: '', testType: TEST_TYPES[0], testDate: new Date().toISOString().split('T')[0] });
    const [maxMarks, setMaxMarks] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    const batch = batches?.find(b => b.batchId === form.batchId);
    const subjects = courses?.find(c => c.courseId === batch?.courseId)?.subjects ?? [];

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const chosen = Object.entries(maxMarks).filter(([, v]) => Number(v) > 0).map(([subjectId, v]) => ({ subjectId, maxMarks: Number(v) }));
        try {
            await api('/tests', { method: 'POST', body: JSON.stringify({ ...form, subjects: chosen }) });
            onScheduled();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    return (
        <Modal title="Schedule Test" onClose={onClose}>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <label className="cs-label">Batch</label>
                    <select className="cs-input" required value={form.batchId} onChange={e => { setForm({ ...form, batchId: e.target.value }); setMaxMarks({}); }}>
                        <option value="">Select a batch…</option>
                        {batches?.map(b => <option key={b.batchId} value={b.batchId}>{b.name} — {b.courseTitle}</option>)}
                    </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                    <div>
                        <label className="cs-label">Test Name</label>
                        <input className="cs-input" required placeholder="e.g. Unit Test 2" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div>
                        <label className="cs-label">Type</label>
                        <select className="cs-input" value={form.testType} onChange={e => setForm({ ...form, testType: e.target.value })}>
                            {TEST_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="cs-label">Date</label>
                        <input className="cs-input" type="date" required value={form.testDate} onChange={e => setForm({ ...form, testDate: e.target.value })} />
                    </div>
                </div>
                {batch && (
                    <div>
                        <label className="cs-label">Subjects & maximum marks</label>
                        {subjects.length === 0 && <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>This course has no subjects yet — add them on the Courses page.</div>}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                            {subjects.map(s => (
                                <label key={s.subjectId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                    <input type="checkbox" checked={s.subjectId in maxMarks}
                                        onChange={e => setMaxMarks(m => {
                                            const next = { ...m };
                                            if (e.target.checked) next[s.subjectId] = '100'; else delete next[s.subjectId];
                                            return next;
                                        })} />
                                    <span style={{ flex: 1 }}>{s.name}</span>
                                    {s.subjectId in maxMarks && (
                                        <input className="cs-input" type="number" min="1" style={{ width: '72px', padding: '4px 8px' }} aria-label={`Max marks for ${s.name}`}
                                            value={maxMarks[s.subjectId]} onChange={e => setMaxMarks(m => ({ ...m, [s.subjectId]: e.target.value }))} />
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                {error && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{error}</div>}
                <button className="btn-primary" type="submit" disabled={Object.keys(maxMarks).length === 0} style={{ alignSelf: 'flex-end' }}>Schedule</button>
            </form>
        </Modal>
    );
}

function MarksSheet({ testId, canEdit, onBack }: { testId: string; canEdit: boolean; onBack: () => void }) {
    const { workspace } = useWorkspace();
    const { data: report, error, reload } = useApi<Report>(`/tests/report?testId=${testId}`);
    const [edits, setEdits] = useState<Record<string, { marks: string; absent: boolean }>>({});
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    if (!report) return <><Topbar title="Tests & Results" /><div className="page-body"><PageState error={error} /></div></>;

    const editable = canEdit && report.test.status !== 'published';
    const key = (studentId: string, subjectId: string) => `${studentId}:${subjectId}`;
    const cell = (studentId: string, subjectId: string) => {
        const saved = report.students.find(s => s.studentId === studentId)?.marks[subjectId];
        return edits[key(studentId, subjectId)] ?? { marks: saved?.marks?.toString() ?? '', absent: saved?.absent ?? false };
    };
    const setCell = (studentId: string, subjectId: string, value: { marks: string; absent: boolean }) =>
        setEdits(e => ({ ...e, [key(studentId, subjectId)]: value }));

    const save = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const results = Object.entries(edits).map(([k, v]) => {
                const [studentId, subjectId] = k.split(':');
                return { studentId, subjectId, marks: v.absent || v.marks === '' ? null : Number(v.marks), absent: v.absent };
            });
            await api('/tests/report', { method: 'PUT', body: JSON.stringify({ testId, results }) });
            setEdits({});
            setMessage('Marks saved. Totals, grades and ranks are updated.');
            reload();
        } catch (err) {
            setMessage((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const publish = async () => {
        if (!confirm('Publish these results to the parent portal?')) return;
        try {
            await api('/tests/publish', { method: 'POST', body: JSON.stringify({ testId }) });
            setMessage('Results published — parents can now see them in the portal.');
            reload();
        } catch (err) {
            setMessage((err as Error).message);
        }
    };

    const printReportCard = (student: Report['students'][0]) => {
        const w = window.open('', '_blank', 'width=760,height=900');
        if (!w) return;
        const esc = (v: unknown) => String(v ?? '—').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
        const rows = report.subjects.map(s => {
            const m = student.marks[s.subjectId];
            return `<tr><td>${esc(s.name)}</td><td>${m?.absent ? 'Absent' : esc(m?.marks)}</td><td>${esc(s.maxMarks)}</td><td>${esc(m?.grade)}</td><td>${esc(m?.remarks ?? '')}</td></tr>`;
        }).join('');
        const logo = workspace?.organization.branding.logoUrl ? `<img src="${esc(workspace.organization.branding.logoUrl)}" alt="">` : '';
        w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Report Card — ${esc(student.name)}</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;margin:36px;color:#0f172a}header{display:flex;gap:14px;align-items:center;border-bottom:2px solid #1e3a8a;padding-bottom:12px}
header img{height:52px;max-width:130px;object-fit:contain}h1{font-size:19px;margin:0}h2{font-size:13px;color:#475569;font-weight:500;margin:4px 0 0}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:18px 0;font-size:13px}table{width:100%;border-collapse:collapse;font-size:13px}
th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#f1f5f9}.total{margin-top:16px;font-size:14px;display:flex;gap:24px}</style></head><body>
<header>${logo}<div><h1>${esc(workspace?.organization.name)}</h1><h2>Report Card — ${esc(report.test.title)} (${esc(report.test.testType)})</h2></div></header>
<div class="meta"><div><b>Student:</b> ${esc(student.name)}</div><div><b>Enrollment No.:</b> ${esc(student.enrollmentNumber)}</div>
<div><b>Batch:</b> ${esc(report.test.batchName)}</div><div><b>Date:</b> ${esc(formatDate(report.test.testDate))}</div></div>
<table><tr><th>Subject</th><th>Marks</th><th>Max</th><th>Grade</th><th>Remarks</th></tr>${rows}</table>
<div class="total"><span><b>Total:</b> ${esc(student.total)} / ${esc(report.maxTotal)}</span><span><b>Percentage:</b> ${esc(student.percentage)}%</span>
<span><b>Grade:</b> ${esc(student.grade)}</span><span><b>Rank:</b> ${esc(student.rank)} of ${esc(report.summary.classSize)}</span></div>
<script>window.onload=function(){window.print()}<\/script></body></html>`);
        w.document.close();
    };

    return (
        <>
            <Topbar title={report.test.title} subtitle={`${report.test.testType} • ${report.test.batchName} • ${formatDate(report.test.testDate)}`} />
            <div className="page-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn-ghost" onClick={onBack}><ArrowLeft size={14} /> All tests</button>
                    <span className={`badge ${STATUS[report.test.status]}`}>{report.test.status}</span>
                    <span style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>
                        Graded {report.summary.graded}/{report.summary.classSize} • Class average {report.summary.averagePercentage ?? '—'}% • Highest {report.summary.highestPercentage ?? '—'}% • Passed {report.summary.passed}
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        {editable && <button className="btn-secondary" disabled={busy || Object.keys(edits).length === 0} onClick={save}><Save size={14} /> Save marks</button>}
                        {canEdit && report.test.status === 'completed' && <button className="btn-primary" onClick={publish}><Send size={14} /> Publish to parents</button>}
                    </div>
                </div>
                {message && <div className="cs-card" style={{ padding: '10px 14px', fontSize: '13px' }}>{message}</div>}
                <div className="cs-card" style={{ overflowX: 'auto' }}>
                    <table className="cs-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                {report.subjects.map(s => <th key={s.subjectId} style={{ textAlign: 'center' }}>{s.name}<div style={{ fontWeight: 400 }}>/ {s.maxMarks}</div></th>)}
                                <th style={{ textAlign: 'center' }}>Total<div style={{ fontWeight: 400 }}>/ {report.maxTotal}</div></th>
                                <th style={{ textAlign: 'center' }}>%</th>
                                <th style={{ textAlign: 'center' }}>Grade</th>
                                <th style={{ textAlign: 'center' }}>Rank</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.students.map(st => (
                                <tr key={st.studentId}>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: '13px' }} className="cell-nowrap">{st.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{st.enrollmentNumber}</div>
                                    </td>
                                    {report.subjects.map(s => {
                                        const c = cell(st.studentId, s.subjectId);
                                        const saved = st.marks[s.subjectId];
                                        return (
                                            <td key={s.subjectId} style={{ textAlign: 'center' }}>
                                                {editable ? (
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                                                        <input className="cs-input" type="number" min="0" max={s.maxMarks} step="0.5" disabled={c.absent}
                                                            aria-label={`${st.name} ${s.name} marks`} style={{ width: '64px', padding: '4px 6px', textAlign: 'center' }}
                                                            value={c.absent ? '' : c.marks} onChange={e => setCell(st.studentId, s.subjectId, { marks: e.target.value, absent: false })} />
                                                        <button type="button" title="Mark absent" className={`badge ${c.absent ? 'badge-danger' : 'badge-secondary'}`} style={{ cursor: 'pointer' }}
                                                            onClick={() => setCell(st.studentId, s.subjectId, { marks: '', absent: !c.absent })}>AB</button>
                                                    </div>
                                                ) : saved?.absent ? <span className="badge badge-danger">AB</span> : (
                                                    <span style={{ fontSize: '13px' }}>{saved?.marks ?? '—'}{saved?.grade && <span className={`badge ${gradeClass(saved.grade)}`} style={{ marginLeft: 6 }}>{saved.grade}</span>}</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{st.total ?? '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{st.percentage ?? '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{st.grade ? <span className={`badge ${gradeClass(st.grade)}`}>{st.grade}</span> : '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{st.rank ?? '—'}</td>
                                    <td>
                                        {st.total !== null && (
                                            <button className="btn-ghost cell-nowrap" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => printReportCard(st)}>
                                                <Printer size={12} /> Report card
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>Grading scale: A+ ≥ 90% • A ≥ 80% • B+ ≥ 70% • B ≥ 60% • C ≥ 50% • D ≥ 40% • F below 40%</div>
            </div>
        </>
    );
}
