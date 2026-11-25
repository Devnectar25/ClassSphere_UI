'use client';
import { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import Modal from '@/components/Modal';
import { Metric } from '@/components/TransferFinance';
import { api, formatDate, formatMoney, useApi } from '@/lib/api';

export type VerificationStatus = 'verified' | 'pending_verification' | 'attendance_missing' | 'finance_review_required';
interface SessionEntry { date: string; scheduled: boolean; extra: boolean; state: string; attendance: string | null; note: string | null }

export interface ConsumptionAssessment {
    enrollmentId: string; batchName: string; courseTitle: string; enrollmentDate: string; until: string; hasTimetable: boolean; totalCourseSessions: number;
    counts: { scheduled: number; conducted: number; marked: number; present: number; absent: number; excused: number; cancelled: number; missing: number; unconfirmed: number; conflict: number; unscheduled: number };
    sessions: SessionEntry[]; unresolved: SessionEntry[]; courseFee: number | null; method: 'monthly' | 'session' | 'manual'; calculation: string | null; consumedAmount: number | null;
    status: VerificationStatus; issues: string[]; warnings: string[]; policy: { configured: boolean; requireVerification: boolean };
    manualReview: { amount: number; reason: string; reviewedBy: string | null; reviewedAt: string } | null; verificationRequestedAt: string | null;
}
export interface ConsumptionView {
    assessment: ConsumptionAssessment;
    permissions: { canConfirm: boolean; canCorrect: boolean; canManual: boolean; canRequest: boolean };
    /** A transfer to another course has to wait for verification, unless Finance decides it in the same step */
    transferBlocked: boolean;
    credit: { courseFee: number; outstanding: number; refunded: number; unlinkedPaid: number; creditBalance: number; verifiedPayments: number; creditReceived: number; previousAdjustments: number; pendingVerification: number; unusedCeiling: number; eligibleCredit: number | null; reviewable: boolean } | null;
}

export const VERIFICATION_STATUS: Record<VerificationStatus, { label: string; badge: string }> = {
    verified: { label: 'Verified', badge: 'badge-success' },
    pending_verification: { label: 'Pending Verification', badge: 'badge-warning' },
    attendance_missing: { label: 'Attendance Missing', badge: 'badge-danger' },
    finance_review_required: { label: 'Finance Review Required', badge: 'badge-warning' },
};
const METHOD: Record<string, string> = { monthly: 'Monthly', session: 'Per session', manual: 'Manual Finance review' };
const STATE: Record<string, string> = {
    missing: 'Class held, attendance not marked', unconfirmed: 'Nothing recorded: was the class held?', conflict: 'Cancelled, but attendance exists',
    unscheduled: 'Attendance exists, but no class is scheduled',
};
const SESSION: Record<string, { label: string; color: string }> = {
    present: { label: 'Present', color: '#15803D' }, absent: { label: 'Absent', color: '#DC2626' }, excused: { label: 'Absent (excused)', color: '#B45309' },
    missing: { label: 'Missing', color: '#DC2626' }, cancelled: { label: 'Cancelled', color: '#64748B' }, unconfirmed: { label: 'Not confirmed', color: '#B45309' },
    conflict: { label: 'Conflict', color: '#B45309' }, unscheduled: { label: 'Not counted', color: '#B45309' },
};
const warn: React.CSSProperties = { padding: '9px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid #FDE68A', background: '#FFFBEB', color: '#92400E' };
const small: React.CSSProperties = { padding: '3px 10px', fontSize: '11.5px', height: 'auto' };
const keepForm = (e: React.KeyboardEvent) => { if (e.key === 'Enter') e.preventDefault(); };

/** Attendance & Fee Consumption Review of one enrollment; shows what is unresolved and lets authorized staff resolve it. */
export default function ConsumptionReview({ enrollmentId, until, currency, onView, showManual }: {
    enrollmentId: string; until?: string; currency: string; onView?: (view: ConsumptionView | null) => void; showManual?: boolean;
}) {
    const { data, error, reload } = useApi<ConsumptionView>(`/billing/consumption?enrollmentId=${enrollmentId}${until ? `&until=${until}` : ''}`);
    const [reason, setReason] = useState('');
    const [manual, setManual] = useState({ amount: '', reason: '' });
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);
    const [showSessions, setShowSessions] = useState(false);
    useEffect(() => { onView?.(data); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

    const money = (v: number) => formatMoney(v, currency, 2);
    const run = async (body: Record<string, unknown>, done?: () => void) => {
        setBusy(true);
        setFailure(null);
        try {
            await api('/billing/consumption', { method: 'POST', body: JSON.stringify({ enrollmentId, until, ...body }) });
            done?.();
            reload();
        } catch (err) {
            setFailure((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const a = data?.assessment;
    const p = data?.permissions;
    const credit = data?.credit;
    const resolvable = a && p && a.unresolved.length > 0 && (p.canConfirm || p.canCorrect);
    const ready = reason.trim().length >= 3 && !busy;

    return (
        <div style={{ background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ClipboardCheck size={14} color="var(--cs-primary)" /> Attendance &amp; Fee Consumption Review
                </div>
                {a && <span className={`badge ${VERIFICATION_STATUS[a.status].badge}`}>{VERIFICATION_STATUS[a.status].label}</span>}
            </div>
            {!a || !p ? <div style={{ fontSize: '12.5px', color: error ? '#991B1B' : 'var(--cs-text-muted)' }}>{error ?? 'Checking timetable and attendance…'}</div> : (
                <>
                    <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)' }}>
                        {a.courseTitle} · {a.batchName} · enrolled {formatDate(a.enrollmentDate)} · checked up to {formatDate(a.until)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: '8px' }}>
                        <Metric label="Scheduled" value={String(a.counts.scheduled)} note={a.hasTimetable ? undefined : 'No timetable'} />
                        <Metric label="Conducted" value={String(a.counts.conducted)} note={a.counts.unconfirmed > 0 ? `${a.counts.unconfirmed} not confirmed` : undefined} />
                        <Metric label="Present" value={String(a.counts.present)} tone="#15803D" />
                        <Metric label="Absent" value={String(a.counts.absent)} note={a.counts.excused > 0 ? `${a.counts.excused} excused` : undefined} />
                        <Metric label="Missing" value={String(a.counts.missing)} tone={a.counts.missing > 0 ? '#DC2626' : undefined} note="Held, not marked" />
                        <Metric label="Cancelled" value={String(a.counts.cancelled)} />
                    </div>
                    {credit && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                            <Metric label="Consumption method" value={METHOD[a.method]} note={a.calculation ?? (a.policy.configured ? undefined : 'No policy set')} />
                            <Metric label="Verified payments" value={money(credit.verifiedPayments)} note={credit.creditReceived > 0 ? `+ ${money(credit.creditReceived)} credit used` : undefined} />
                            <Metric label="Consumed fee" value={a.consumedAmount === null ? 'Not verified' : money(a.consumedAmount)} />
                            <Metric label="Previous adjustments" value={money(credit.previousAdjustments)} />
                            <Metric label="Eligible credit" value={credit.eligibleCredit === null ? 'Not verified' : money(credit.eligibleCredit)} tone="#15803D" />
                        </div>
                    )}
                    {a.warnings.length > 0 && (
                        <div role="status" style={warn}><b>Data warning.</b> {a.warnings.join(' ')}</div>
                    )}
                    {a.sessions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button type="button" className="btn-secondary" style={{ ...small, alignSelf: 'flex-start' }} aria-expanded={showSessions} onClick={() => setShowSessions(v => !v)}>
                                {showSessions ? 'Hide' : 'Show'} session dates ({a.sessions.length})
                            </button>
                            {showSessions && (
                                <div style={{ maxHeight: '230px', overflowY: 'auto' }}>
                                    <table className="cs-table" style={{ width: '100%', fontSize: '12px' }}>
                                        <thead><tr><th>Date</th><th>Session</th><th>Attendance</th><th>Note</th></tr></thead>
                                        <tbody>
                                            {a.sessions.map(x => (
                                                <tr key={x.date}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(x.date)}</td>
                                                    <td>{x.extra ? 'Extra class' : x.scheduled ? 'Scheduled' : 'Not scheduled'}</td>
                                                    <td style={{ fontWeight: 600, color: SESSION[x.state]?.color }}>{SESSION[x.state]?.label ?? x.state}{x.attendance && !['present', 'absent', 'excused'].includes(x.state) ? ` (marked ${x.attendance})` : x.attendance === 'late' ? ' (late)' : ''}</td>
                                                    <td style={{ color: 'var(--cs-text-secondary)' }}>{x.note ?? ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                    {a.issues.length > 0 && a.status !== 'verified' && <div style={warn}><b>Finance review required.</b> {a.issues.join(' ')}</div>}
                    {a.status === 'verified' && a.method === 'manual' && a.manualReview && (
                        <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)' }}>
                            Reviewed by {a.manualReview.reviewedBy ?? 'Finance'} on {formatDate(a.manualReview.reviewedAt)}: {a.manualReview.reason}
                        </div>
                    )}

                    {a.unresolved.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600 }}>Unresolved dates of {a.batchName} ({a.unresolved.length})</div>
                            {resolvable && (
                                <input className="cs-input" aria-label="Reason for confirmation or correction" placeholder="Reason for confirmation or correction *" value={reason} onKeyDown={keepForm}
                                    onChange={e => setReason(e.target.value)} />
                            )}
                            <div style={{ maxHeight: '210px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {a.unresolved.map(x => (
                                    <div key={x.date} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: 'var(--cs-surface)', border: '1px solid var(--cs-border)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px' }}>
                                        <b style={{ minWidth: '86px' }}>{formatDate(x.date)}</b>
                                        <span style={{ flex: 1, minWidth: '150px', color: 'var(--cs-text-secondary)' }}>{STATE[x.state] ?? x.state}{x.state === 'unscheduled' && x.note ? ` (${x.note.toLowerCase()})` : ''}</span>
                                        {x.state !== 'missing' && p.canConfirm && (
                                            <button type="button" className="btn-secondary" style={small} disabled={!ready} onClick={() => run({ action: 'confirm_session', date: x.date, status: 'conducted', reason })}>{x.state === 'unscheduled' ? 'Extra class held' : 'Class held'}</button>
                                        )}
                                        {x.state === 'unconfirmed' && p.canConfirm && (
                                            <button type="button" className="btn-secondary" style={small} disabled={!ready} onClick={() => run({ action: 'confirm_session', date: x.date, status: 'cancelled', reason })}>Cancelled</button>
                                        )}
                                        {x.state === 'missing' && p.canCorrect && (['present', 'absent', 'excused'] as const).map(s => (
                                            <button key={s} type="button" className="btn-secondary" style={small} disabled={!ready} onClick={() => run({ action: 'correct_attendance', date: x.date, status: s, reason })}>
                                                {s[0].toUpperCase() + s.slice(1)}
                                            </button>
                                        ))}
                                        {!(x.state === 'missing' ? p.canCorrect : p.canConfirm) && <span style={{ color: 'var(--cs-text-muted)' }}>Waiting for teacher or branch manager</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {a.status !== 'verified' && (p.canRequest || a.verificationRequestedAt) && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', fontSize: '12px', color: 'var(--cs-text-secondary)' }}>
                            {a.verificationRequestedAt ? <span>Sent to the teacher, branch manager and Finance on {formatDate(a.verificationRequestedAt)}.</span> : (
                                <button type="button" className="btn-secondary" style={{ ...small, padding: '5px 12px' }} disabled={busy} onClick={() => run({ action: 'request_verification' })}>
                                    Send to teacher / branch manager / Finance
                                </button>
                            )}
                        </div>
                    )}

                    {showManual && p.canManual && a.status !== 'verified' && (
                        <div style={{ borderTop: '1px solid var(--cs-border)', paddingTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ flex: '1 1 130px' }}>
                                <label className="cs-label" htmlFor="cr-amount">Consumed fee (Finance review) *</label>
                                <input id="cr-amount" className="cs-input" type="number" min="0" step="0.01" value={manual.amount} onKeyDown={keepForm} onChange={e => setManual(m => ({ ...m, amount: e.target.value }))} />
                            </div>
                            <div style={{ flex: '3 1 200px' }}>
                                <label className="cs-label" htmlFor="cr-reason">Reason *</label>
                                <input id="cr-reason" className="cs-input" value={manual.reason} onKeyDown={keepForm} onChange={e => setManual(m => ({ ...m, reason: e.target.value }))} />
                            </div>
                            <button type="button" className="btn-primary" disabled={busy || manual.amount === '' || manual.reason.trim().length < 3}
                                onClick={() => run({ action: 'manual_review', consumedAmount: Number(manual.amount), reason: manual.reason }, () => setManual({ amount: '', reason: '' }))}>
                                Save Finance review
                            </button>
                        </div>
                    )}
                    {failure && <div role="alert" style={{ padding: '9px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '12px' }}>{failure}</div>}
                </>
            )}
        </div>
    );
}

interface QueueItem {
    enrollmentId: string; studentName: string; enrollmentNumber: string; courseTitle: string; batchName: string; status: VerificationStatus; unresolved: number;
    requestedAt: string; requestedBy: string | null;
}

/** Open verification requests of the signed-in teacher, branch manager or Finance user. Takes no space when there are none. */
export function VerificationQueue({ currency, showManual }: { currency: string; showManual?: boolean }) {
    const { data, reload } = useApi<QueueItem[]>('/billing/consumption?view=queue');
    const [open, setOpen] = useState<QueueItem | null>(null);
    if (!data || (data.length === 0 && !open)) return null;
    return (
        <div className="cs-card" style={{ padding: '14px 18px', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Attendance verification requests ({data.length})</div>
            <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', marginBottom: '8px' }}>These students are changing course. Their credit waits until the dates below are resolved.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                {data.map(q => (
                    <div key={q.enrollmentId} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', border: '1px solid var(--cs-border)', borderRadius: '8px', padding: '8px 12px', fontSize: '12.5px' }}>
                        <div style={{ flex: 1, minWidth: '180px' }}>
                            <b>{q.studentName}</b> <span style={{ color: 'var(--cs-text-muted)' }}>{q.enrollmentNumber}</span>
                            <div style={{ fontSize: '11.5px', color: 'var(--cs-text-secondary)' }}>{q.courseTitle} · {q.batchName} · requested {formatDate(q.requestedAt)}{q.requestedBy ? ` by ${q.requestedBy}` : ''}</div>
                        </div>
                        <span className={`badge ${VERIFICATION_STATUS[q.status].badge}`}>{VERIFICATION_STATUS[q.status].label}{q.unresolved > 0 && q.status !== 'verified' ? ` · ${q.unresolved} dates` : ''}</span>
                        <button type="button" className="btn-secondary" style={{ ...small, padding: '4px 12px' }} onClick={() => setOpen(q)}>Review</button>
                    </div>
                ))}
            </div>
            {open && (
                <Modal title={`${open.studentName} — ${open.batchName}`} onClose={() => { setOpen(null); reload(); }} maxWidth="760px">
                    <ConsumptionReview enrollmentId={open.enrollmentId} currency={currency} showManual={showManual} />
                </Modal>
            )}
        </div>
    );
}

interface Policy {
    courseId: string | null; courseTitle: string | null; method: 'monthly' | 'session' | 'manual'; absentCounts: boolean; excusedCounts: boolean; cancelledCounts: boolean;
    partialPeriod: 'not_counted' | 'full'; requireVerification: boolean; updatedAt: string; updatedBy: string | null;
}
type PolicyForm = Omit<Policy, 'courseTitle' | 'updatedAt' | 'updatedBy'>;
const newPolicy: PolicyForm = { courseId: null, method: 'session', absentCounts: true, excusedCounts: true, cancelledCounts: false, partialPeriod: 'not_counted', requireVerification: true };

/** Academy rule for consumed fees, with optional rules per course. */
export function ConsumptionPolicyCard({ canEdit }: { canEdit: boolean }) {
    const { data, error, reload } = useApi<Policy[]>('/billing/consumption?view=policy');
    const { data: courses } = useApi<Array<{ courseId: string; title: string }>>('/courses');
    const [form, setForm] = useState<PolicyForm | null>(null);
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);
    const save = async () => {
        setBusy(true);
        setFailure(null);
        try {
            await api('/billing/consumption', { method: 'POST', body: JSON.stringify({ action: 'save_policy', ...form }) });
            setForm(null);
            reload();
        } catch (err) {
            setFailure((err as Error).message);
        } finally {
            setBusy(false);
        }
    };
    const edit = (courseId: string | null) => {
        const existing = data?.find(x => x.courseId === courseId) ?? data?.find(x => x.courseId === null);
        setForm(existing ? {
            courseId, method: existing.method, absentCounts: existing.absentCounts, excusedCounts: existing.excusedCounts, cancelledCounts: existing.cancelledCounts,
            partialPeriod: existing.partialPeriod, requireVerification: existing.requireVerification,
        } : { ...newPolicy, courseId });
    };
    const describe = (x: Policy) => [
        METHOD[x.method],
        ...(x.method === 'manual' ? [] : [`absent ${x.absentCounts ? 'counts' : 'does not count'}`, `excused ${x.excusedCounts ? 'counts' : 'does not count'}`, `cancelled ${x.cancelledCounts ? 'counts' : 'does not count'}`]),
        ...(x.method === 'monthly' ? [`unfinished month ${x.partialPeriod === 'full' ? 'counts in full' : 'not counted'}`] : []),
        x.requireVerification ? 'verified before transfer' : 'may be verified after transfer',
    ].join(' · ');
    const check = (key: 'absentCounts' | 'excusedCounts' | 'cancelledCounts' | 'requireVerification', label: string) => (
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12.5px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form![key]} onChange={e => setForm(f => f && ({ ...f, [key]: e.target.checked }))} /> {label}
        </label>
    );
    const isDefault = data?.some(x => x.courseId === null);

    return (
        <div className="cs-card" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>Fee consumption policy</div>
                    <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)' }}>How much of the old course fee is used when a student changes course.</div>
                </div>
                {canEdit && <button type="button" className="btn-secondary" style={{ ...small, padding: '5px 12px' }} disabled={!data} onClick={() => edit(null)}>{isDefault ? 'Edit policy' : 'Set policy'}</button>}
            </div>
            {error && <div style={{ fontSize: '12px', color: '#991B1B', marginTop: '8px' }}>{error}</div>}
            {data && !isDefault && <div style={{ ...warn, marginTop: '10px' }}>No academy policy is set. Finance must review every transfer with payments by hand.</div>}
            {(data ?? []).map(x => (
                <div key={x.courseId ?? 'default'} style={{ fontSize: '12.5px', marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <b>{x.courseTitle ?? 'All courses'}:</b> <span style={{ color: 'var(--cs-text-secondary)' }}>{describe(x)}</span>
                    {canEdit && x.courseId && <button type="button" className="btn-ghost" style={{ ...small, color: 'var(--cs-primary)' }} onClick={() => edit(x.courseId)}>Edit</button>}
                </div>
            ))}
            {form && (
                <Modal title="Fee consumption policy" onClose={() => { if (!busy) setForm(null); }} maxWidth="520px">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label className="cs-label" htmlFor="cp-course">Applies to</label>
                            <select id="cp-course" className="cs-input" value={form.courseId ?? ''} onChange={e => edit(e.target.value || null)}>
                                <option value="">All courses (academy default)</option>
                                {(courses ?? []).map(c => <option key={c.courseId} value={c.courseId}>{c.title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="cs-label" htmlFor="cp-method">Method</label>
                            <select id="cp-method" className="cs-input" value={form.method} onChange={e => setForm(f => f && ({ ...f, method: e.target.value as Policy['method'] }))}>
                                <option value="session">Per session: fee ÷ all sessions of the course</option>
                                <option value="monthly">Monthly: fee ÷ course months, completed months only</option>
                                <option value="manual">Manual Finance review</option>
                            </select>
                        </div>
                        {form.method !== 'manual' && (
                            <>
                                {check('absentCounts', 'An absence counts as consumed')}
                                {check('excusedCounts', 'An excused absence counts as consumed')}
                                {check('cancelledCounts', 'A cancelled class counts as consumed')}
                            </>
                        )}
                        {form.method === 'monthly' && (
                            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12.5px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.partialPeriod === 'full'} onChange={e => setForm(f => f && ({ ...f, partialPeriod: e.target.checked ? 'full' : 'not_counted' }))} /> An unfinished month counts in full
                            </label>
                        )}
                        {check('requireVerification', 'Consumed fee must be verified before the transfer')}
                        {failure && <div role="alert" style={{ padding: '9px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '12px' }}>{failure}</div>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setForm(null)}>Cancel</button>
                            <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save policy'}</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
