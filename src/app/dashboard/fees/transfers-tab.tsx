'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import Modal from '@/components/Modal';
import PageState from '@/components/PageState';
import {
    CREDIT_STATUS, CreditReviewFields, FeePlanFields, Metric, PLAN_STATUS, emptyFinanceForm, planPayload, planProblem, reviewPayload, reviewState,
    type FeePlanTemplate, type FinanceForm,
} from '@/components/TransferFinance';
import ConsumptionReview, { ConsumptionPolicyCard, VerificationQueue, type ConsumptionView } from '@/components/ConsumptionReview';
import { api, formatDate, formatMoney, useApi } from '@/lib/api';
import type { CoursePeriod } from '@/lib/installments';

interface Transfer {
    transferId: string; studentId: string; studentName: string; enrollmentNumber: string; transferDate: string; reason: string;
    creditStatus: string; feePlanStatus: string; oldCourseFee: number; oldPaid: number; oldOutstanding: number; consumedAmount: number | null;
    eligibleCredit: number | null; approvedCredit: number; reviewNotes: string | null; reviewedAt: string | null; reviewedBy: string | null;
    fromCourse: string; fromBatch: string; toCourse: string; toBatch: string; newCourseFee: number;
    plan: { netFee: number; creditApplied: number; payable: number; paymentMode: string; installmentCount: number } | null;
}
interface EnrollmentInfo { enrollmentId: string; courseId: string; courseTitle: string; batchName: string; tuitionAmount: number }
interface Detail {
    period: CoursePeriod;
    transfer: Transfer; from: EnrollmentInfo; to: EnrollmentInfo; creditBalance: number;
    financials: {
        courseFee: number; verifiedPaid: number; refunded: number; pendingVerification: number; lateFeesPaid: number; creditReceived: number;
        creditAlreadyGranted: number; previouslyConsumed: number; outstanding: number; unusedCeiling: number; paymentsMatchInvoices: boolean; unlinkedPaid: number;
    };
}

const note: React.CSSProperties = { padding: '10px 12px', borderRadius: '8px', fontSize: '12.5px', border: '1px solid #FDE68A', background: '#FFFBEB', color: '#92400E' };

/** Finance queue of course transfers: credit review and the new course fee plan. */
export default function TransfersTab({ canEdit, currency, onOpenStudent }: { canEdit: boolean; currency: string; onOpenStudent: (studentId: string) => void }) {
    const { data, error, reload } = useApi<Transfer[]>('/billing/transfers');
    const { data: fees } = useApi<{ feePlans: FeePlanTemplate[] }>('/fees');
    const [filter, setFilter] = useState<'open' | 'all'>('open');
    const [openId, setOpenId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const money = (v: number) => formatMoney(v, currency, 2);
    const isOpen = (t: Transfer) => t.creditStatus === 'pending_review' || t.feePlanStatus === 'pending';
    const rows = (data ?? []).filter(t => filter === 'all' || isOpen(t));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {notice && (
                <div className="cs-card" style={{ padding: '12px 16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534' }}>
                    <span>{notice}</span>
                    <button className="btn-ghost" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => setNotice(null)}>Dismiss</button>
                </div>
            )}
            <VerificationQueue currency={currency} showManual={canEdit} />
            <div className="cs-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 700 }}>Course Transfers & Credit</div>
                        <div style={{ fontSize: '12.5px', color: 'var(--cs-text-secondary)' }}>Review unused fees of the old course and create the new course fee plan.</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select className="cs-input" aria-label="Filter transfers" style={{ width: 'auto', height: '34px', padding: '0 10px' }} value={filter} onChange={e => setFilter(e.target.value as 'open' | 'all')}>
                            <option value="open">Needs action</option>
                            <option value="all">All transfers</option>
                        </select>
                        <button type="button" className="btn-ghost" aria-label="Refresh" onClick={reload}><RefreshCw size={14} /></button>
                    </div>
                </div>
                {!data ? <PageState error={error} /> : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="cs-table" style={{ width: '100%', fontSize: '12.5px' }}>
                            <thead>
                                <tr><th>Student</th><th>Transfer</th><th>Date</th><th>Old paid</th><th>Old dues</th><th>New fee</th><th>Credit</th><th>Fee plan</th><th style={{ textAlign: 'right' }}>Action</th></tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '28px', color: 'var(--cs-text-muted)' }}>{filter === 'open' ? 'No transfers need action.' : 'No course transfers yet.'}</td></tr>}
                                {rows.map(t => (
                                    <tr key={t.transferId}>
                                        <td><div style={{ fontWeight: 600 }}>{t.studentName}</div><div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontFamily: 'monospace' }}>{t.enrollmentNumber}</div></td>
                                        <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{t.fromCourse} <ArrowRight size={12} /> {t.toCourse}</span></td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(t.transferDate)}</td>
                                        <td>{money(t.oldPaid)}</td>
                                        <td style={{ color: t.oldOutstanding > 0 ? '#DC2626' : undefined }}>{money(t.oldOutstanding)}</td>
                                        <td>{money(t.plan?.netFee ?? t.newCourseFee)}</td>
                                        <td><span className={`badge ${CREDIT_STATUS[t.creditStatus]?.badge ?? 'badge-secondary'}`}>{CREDIT_STATUS[t.creditStatus]?.label ?? t.creditStatus}{t.approvedCredit > 0 ? ` · ${money(t.approvedCredit)}` : ''}</span></td>
                                        <td><span className={`badge ${PLAN_STATUS[t.feePlanStatus]?.badge ?? 'badge-secondary'}`}>{PLAN_STATUS[t.feePlanStatus]?.label ?? t.feePlanStatus}</span></td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <button type="button" className={isOpen(t) && canEdit ? 'btn-primary' : 'btn-secondary'} style={{ padding: '4px 12px', fontSize: '12px', height: 'auto' }} onClick={() => setOpenId(t.transferId)}>
                                                {isOpen(t) && canEdit ? 'Review' : 'View'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <ConsumptionPolicyCard canEdit={canEdit} />
            {openId && (
                <TransferModal transferId={openId} canEdit={canEdit} currency={currency} templates={fees?.feePlans ?? []}
                    onClose={() => { setOpenId(null); reload(); }}
                    onDone={message => { setNotice(message); reload(); }}
                    onOpenStudent={id => { setOpenId(null); onOpenStudent(id); }} />
            )}
        </div>
    );
}

function TransferModal({ transferId, canEdit, currency, templates, onClose, onDone, onOpenStudent }: {
    transferId: string; canEdit: boolean; currency: string; templates: FeePlanTemplate[];
    onClose: () => void; onDone: (message: string) => void; onOpenStudent: (studentId: string) => void;
}) {
    const [detail, setDetail] = useState<Detail | null>(null);
    const [form, setForm] = useState<FinanceForm>(emptyFinanceForm);
    const [consumption, setConsumption] = useState<ConsumptionView | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const money = (v: number) => formatMoney(v, currency, 2);

    const load = useCallback(async () => {
        try {
            setDetail(await api<Detail>(`/billing/transfers?transferId=${transferId}`));
        } catch (err) {
            setError((err as Error).message);
        }
    }, [transferId]);
    useEffect(() => {
        let active = true;
        api<Detail>(`/billing/transfers?transferId=${transferId}`)
            .then(d => { if (active) setDetail(d); })
            .catch((err: Error) => { if (active) setError(err.message); });
        return () => { active = false; };
    }, [transferId]);

    const run = async (body: Record<string, unknown>, done: string) => {
        setBusy(true);
        setError(null);
        try {
            await api('/billing/transfers', { method: 'POST', body: JSON.stringify({ transferId, ...body }) });
            onDone(done);
            await load();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const t = detail?.transfer;
    const f = detail?.financials;
    const verifiedConsumed = consumption?.assessment.status === 'verified' ? consumption.assessment.consumedAmount : null;
    const decision = reviewState(form, verifiedConsumed, f?.unusedCeiling ?? 0);
    const reviewing = t?.creditStatus === 'pending_review';
    const planning = t && !reviewing && t.feePlanStatus === 'pending';

    return (
        <Modal title={t ? `${t.studentName} — ${t.fromCourse} to ${t.toCourse}` : 'Course transfer'} onClose={onClose} maxWidth="860px">
            {!detail || !t || !f ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--cs-text-muted)' }}>{error ?? <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto' }} />}</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12.5px', color: 'var(--cs-text-secondary)' }}>
                        <span className={`badge ${CREDIT_STATUS[t.creditStatus]?.badge}`}>{CREDIT_STATUS[t.creditStatus]?.label}</span>
                        <span className={`badge ${PLAN_STATUS[t.feePlanStatus]?.badge}`}>{PLAN_STATUS[t.feePlanStatus]?.label}</span>
                        <span>{t.fromBatch} → {t.toBatch} · {formatDate(t.transferDate)} · {t.reason}</span>
                        <button type="button" className="btn-ghost" style={{ marginLeft: 'auto', fontSize: '12px', padding: '2px 8px', color: 'var(--cs-primary)' }} onClick={() => onOpenStudent(t.studentId)}>Payments & ledger</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                        <Metric label="Old course fee" value={money(f.courseFee)} />
                        <Metric label="Verified payments" value={money(f.verifiedPaid)} tone="#15803D" note={f.refunded > 0 ? `Refunded ${money(f.refunded)} excluded` : undefined} />
                        <Metric label="Old dues (stay on old course)" value={money(f.outstanding)} tone={f.outstanding > 0 ? '#DC2626' : undefined} />
                        {f.creditReceived > 0 && <Metric label="Credit used on old course" value={money(f.creditReceived)} />}
                        {f.lateFeesPaid > 0 && <Metric label="Late fees paid (not credit)" value={money(f.lateFeesPaid)} />}
                        <Metric label="Available credit balance" value={money(detail.creditBalance)} tone="#1D4ED8" />
                        {reviewing
                            ? <Metric label="Unused at most" value={money(f.unusedCeiling)} note="Before consumed fee" />
                            : <Metric label="Approved transfer credit" value={money(t.approvedCredit)} note={t.consumedAmount === null ? undefined : `Consumed ${money(t.consumedAmount)}`} />}
                    </div>

                    {reviewing && (
                        <>
                            <ConsumptionReview enrollmentId={detail.from.enrollmentId} currency={currency} onView={setConsumption} />
                            {f.pendingVerification > 0 && <div style={note}>{money(f.pendingVerification)} of manual payments on the old course await verification. Verify or reject them before approving credit.</div>}
                            {!f.paymentsMatchInvoices && <div style={note}>Payment records and invoices of the old course do not match (for example an invoice marked paid without a receipt, or a refund). Only actual payments are counted.</div>}
                            {f.unlinkedPaid > 0 && <div style={note}>{money(f.unlinkedPaid)} was paid on invoices that name no course and is not counted. Link them from “Payments & ledger” if they belong to the old course.</div>}
                        </>
                    )}
                    {!reviewing && t.reviewedAt && <div style={{ fontSize: '12.5px', color: 'var(--cs-text-secondary)' }}>Decided by {t.reviewedBy ?? 'Finance'} on {formatDate(t.reviewedAt)}{t.reviewNotes ? ` — ${t.reviewNotes}` : ''}</div>}

                    {reviewing && canEdit && (
                        <>
                            <CreditReviewFields form={form} onChange={p => setForm(x => ({ ...x, ...p }))} currency={currency} idPrefix="tr" unusedCeiling={f.unusedCeiling} verifiedConsumed={verifiedConsumed} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-primary" disabled={busy || decision.problem !== null}
                                    onClick={() => run({ action: 'review', ...reviewPayload(form) }, form.decision === 'approve' ? 'Transfer credit decided.' : 'Transfer credit rejected.')}>
                                    {busy ? 'Saving…' : form.decision === 'approve' ? 'Approve credit' : 'Reject credit'}
                                </button>
                            </div>
                        </>
                    )}
                    {planning && canEdit && (
                        <>
                            <FeePlanFields form={form} onChange={p => setForm(x => ({ ...x, ...p }))} currency={currency} idPrefix="tp" tuition={detail.to.tuitionAmount}
                                courseId={detail.to.courseId} templates={templates} availableCredit={detail.creditBalance} period={detail.period} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-primary" disabled={busy || planProblem(form, detail.to.tuitionAmount, templates.find(t => t.planId === form.templatePlanId), detail.period, detail.creditBalance) !== null} onClick={() => run({ action: 'create_fee_plan', ...planPayload(form) }, 'New course fee plan created.')}>
                                    {busy ? 'Saving…' : 'Create fee plan'}
                                </button>
                            </div>
                        </>
                    )}
                    {t.plan && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                            <Metric label="New course fee" value={money(t.plan.netFee)} />
                            <Metric label="Credit applied" value={money(t.plan.creditApplied)} tone="#15803D" />
                            <Metric label="Payable" value={money(t.plan.payable)} tone="var(--cs-primary)" note={t.plan.paymentMode === 'one_time' ? 'One-time payment' : `${t.plan.installmentCount} installments`} />
                        </div>
                    )}
                    {error && <div role="alert" style={{ padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '12.5px' }}>{error}</div>}
                </div>
            )}
        </Modal>
    );
}

interface CreditData {
    balance: number;
    entries: Array<{ entryId: string; entryType: string; amount: number; balanceAfter: number; reason: string | null; createdAt: string; sourceCourse: string | null; targetCourse: string | null; invoiceNumber: string | null; actorName: string | null }>;
    audit: Array<{ action: string; createdAt: string; actorName: string | null; details: Record<string, unknown> | null }>;
}

const ENTRY_LABEL: Record<string, string> = {
    transfer_credit: 'Transfer credit approved', advance_payment: 'Advance payment', legacy_credit: 'Earlier transfer credit', credit_applied: 'Credit applied',
};
const ACTION_LABEL: Record<string, string> = {
    'student.course_transferred': 'Course transferred', 'billing.transfer_credit_approved': 'Transfer credit approved', 'billing.transfer_credit_rejected': 'Transfer credit rejected',
    'billing.credit_applied': 'Credit applied', 'billing.fee_plan_created': 'Fee plan created', 'billing.payment_posted': 'Payment recorded',
    'billing.consumption_manual_review': 'Consumed fee reviewed by Finance', 'billing.consumption_verification_requested': 'Attendance verification requested',
    'attendance.corrected': 'Missing attendance corrected', 'attendance.session_confirmed': 'Class confirmed or cancelled',
    'billing.schedule_adjusted': 'Installment schedule adjusted',
    'billing.installment_carried_forward': 'Unpaid balance carried forward',
    'billing.payment_declared': 'Payment declared by guardian', 'billing.payment_verified': 'Payment verified', 'billing.payment_rejected': 'Payment rejected',
};

/** Credit balance, ledger and audit history of one student, with Finance-approved application of credit. */
export function StudentCreditPanel({ studentId, courses, canEdit, currency, version, onChanged }: {
    studentId: string; canEdit: boolean; currency: string; version: number; onChanged: (message: string) => void;
    courses: Array<{ enrollmentId: string | null; enrollmentStatus: string | null; courseTitle: string; batchName?: string; balanceAmount: number }>;
}) {
    const [data, setData] = useState<CreditData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [applying, setApplying] = useState<{ enrollmentId: string; amount: string; reason: string; key: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const money = (v: number) => formatMoney(v, currency, 2);

    useEffect(() => {
        let active = true;
        api<CreditData>(`/billing/credits?studentId=${studentId}`)
            .then(d => { if (active) { setData(d); setError(null); } })
            .catch((err: Error) => { if (active) setError(err.message); });
        return () => { active = false; };
    }, [studentId, version]);

    const payable = courses.filter(c => c.enrollmentId && c.balanceAmount > 0 && c.enrollmentStatus !== 'transferred' && c.enrollmentStatus !== 'completed');

    const apply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!applying) return;
        setBusy(true);
        setError(null);
        try {
            await api('/billing/credits', {
                method: 'POST', headers: { 'Idempotency-Key': applying.key },
                body: JSON.stringify({ action: 'apply', studentId, enrollmentId: applying.enrollmentId, amount: Number(applying.amount), reason: applying.reason }),
            });
            setApplying(null);
            onChanged('Credit applied to the course.');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="cs-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>Credit Balance & Audit History</div>
                    <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)' }}>Credit is never a payment; every approval and use is recorded.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#1D4ED8' }}>{data ? money(data.balance) : '—'}</span>
                    {canEdit && data && data.balance > 0 && payable.length > 0 && (
                        <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', height: 'auto' }}
                            onClick={() => setApplying({ enrollmentId: payable[0].enrollmentId!, amount: String(Math.min(data.balance, payable[0].balanceAmount)), reason: '', key: crypto.randomUUID() })}>
                            Apply credit
                        </button>
                    )}
                </div>
            </div>
            {error && !applying && <div role="alert" style={{ color: '#991B1B', fontSize: '12.5px', marginBottom: '8px' }}>{error}</div>}
            {data && (
                <>
                    <table className="cs-table" style={{ width: '100%', fontSize: '12.5px' }}>
                        <thead><tr><th>Date</th><th>Entry</th><th>Details</th><th>By</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
                        <tbody>
                            {data.entries.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: 'var(--cs-text-muted)' }}>No credit entries.</td></tr>}
                            {data.entries.map(x => (
                                <tr key={x.entryId}>
                                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(x.createdAt)}</td>
                                    <td>{ENTRY_LABEL[x.entryType] ?? x.entryType}</td>
                                    <td>{[x.reason, x.targetCourse && `to ${x.targetCourse}`, x.invoiceNumber].filter(Boolean).join(' · ')}</td>
                                    <td>{x.actorName ?? '—'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: x.amount > 0 ? '#15803D' : '#B45309' }}>{x.amount > 0 ? '+' : '−'}{money(Math.abs(x.amount))}</td>
                                    <td style={{ textAlign: 'right' }}>{money(x.balanceAfter)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <details style={{ marginTop: '12px', fontSize: '12.5px' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Audit history ({data.audit.length})</summary>
                        <ul style={{ margin: '8px 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {data.audit.map((a, i) => {
                                const amount = a.details?.amount ?? a.details?.approvedCredit ?? a.details?.payableAmount;
                                return (
                                    <li key={i}>
                                        {formatDate(a.createdAt)} — {ACTION_LABEL[a.action] ?? a.action}
                                        {typeof amount === 'number' ? ` (${money(amount)})` : ''}{a.actorName ? ` by ${a.actorName}` : ''}
                                    </li>
                                );
                            })}
                        </ul>
                    </details>
                </>
            )}
            {applying && data && (
                <Modal title="Apply credit to a course" onClose={() => setApplying(null)} maxWidth="460px">
                    <form onSubmit={apply} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label className="cs-label" htmlFor="ac-course">Course</label>
                            <select id="ac-course" className="cs-input" value={applying.enrollmentId} onChange={e => setApplying({ ...applying, enrollmentId: e.target.value })}>
                                {payable.map(p => <option key={p.enrollmentId!} value={p.enrollmentId!}>{p.courseTitle}{p.batchName ? ` (${p.batchName})` : ''} — due {money(p.balanceAmount)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="cs-label" htmlFor="ac-amount">Amount (available {money(data.balance)})</label>
                            <input id="ac-amount" className="cs-input" type="number" min="0.01" max={data.balance} step="0.01" required value={applying.amount} onChange={e => setApplying({ ...applying, amount: e.target.value })} />
                        </div>
                        <div>
                            <label className="cs-label" htmlFor="ac-reason">Approval reason *</label>
                            <input id="ac-reason" className="cs-input" required value={applying.reason} onChange={e => setApplying({ ...applying, reason: e.target.value })} />
                        </div>
                        {error && <div role="alert" style={{ color: '#991B1B', fontSize: '12.5px' }}>{error}</div>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" className="btn-secondary" onClick={() => setApplying(null)}>Cancel</button>
                            <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Applying…' : 'Apply credit'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
