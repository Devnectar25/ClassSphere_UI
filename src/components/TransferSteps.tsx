'use client';
import { ArrowRight, DollarSign } from 'lucide-react';
import { CreditReviewFields, FeePlanFields, Metric, reviewState, planFee, type FeePlanTemplate, type FinanceForm } from '@/components/TransferFinance';
import { VERIFICATION_STATUS, type ConsumptionView } from '@/components/ConsumptionReview';
import { formatDate, formatMoney } from '@/lib/api';
import type { CoursePeriod } from '@/lib/installments';

/** Amounts of a transfer as the API calculated them. */
export interface TransferSummary {
    sameCourse: boolean; oldCourseFee: number; verifiedPaid: number; previousAdjustments: number; unusedCeiling: number;
    consumedAmount: number | null; eligibleCredit: number | null; consumptionMethod: string | null; calculation: string | null;
    oldOutstanding: number; waivedAmount: number; remainingOutstanding: number;
    existingCredit: number; approvedCredit: number; creditApplied: number; remainingCredit: number;
    newCourseFee: number; discount: number; payable: number | null;
}
interface Side { courseTitle: string; courseCode: string; batchName: string; branchName: string | null; enrolledAt: string }
export interface TransferPreview {
    summary: TransferSummary; creditStatus: string; feePlanStatus: string; from: Side; to: Side;
    installments: Array<{ installmentNumber: number; dueDate: string; gross: number; credit: number; payable: number }> | null;
}
export interface DuesDecision { waive: boolean; reason: string }

const card: React.CSSProperties = { background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' };
const heading: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' };
const warn: React.CSSProperties = { padding: '9px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid #FDE68A', background: '#FFFBEB', color: '#92400E' };
const METHOD: Record<string, string> = { monthly: 'Monthly', session: 'Per session', manual: 'Manual Finance review' };

/** Why the fee step cannot be reviewed yet, or null. The API decides again. */
export function feeStepProblem(p: { view: ConsumptionView | null; sameCourse: boolean; canFinance: boolean; financeNow: boolean; form: FinanceForm; dues: DuesDecision }): string | null {
    if (p.dues.waive && p.dues.reason.trim().length < 3) return 'Enter the reason for waiving the old dues.';
    if (p.sameCourse || !p.view) return null;
    const now = p.canFinance && p.financeNow;
    const credit = p.view.credit;
    if (now && credit?.reviewable) {
        if (credit.pendingVerification > 0 && p.form.decision === 'approve') return 'Verify or reject the pending payments of the old course first, or leave the credit to Finance.';
        const problem = reviewState(p.form, verifiedConsumed(p.view), credit.unusedCeiling).problem;
        if (problem) return problem;
    } else if (p.view.transferBlocked) return 'The consumed fee is not verified. Resolve the attendance, or complete a Finance review here.';
    return null;
}

/** Credit that could be applied: the existing balance plus what this decision approves. */
export function availableCredit(view: ConsumptionView | null, form: FinanceForm): number {
    const credit = view?.credit;
    return (credit?.creditBalance ?? 0) + (credit?.reviewable ? reviewState(form, verifiedConsumed(view), credit.unusedCeiling).credit : 0);
}

export const verifiedConsumed = (view: ConsumptionView | null) => (view?.assessment.status === 'verified' ? view.assessment.consumedAmount : null);

/** Fee position, old dues, transfer credit and the fee plan of the new course. */
export function TransferFeeStep({ view, sameCourse, currency, canFinance, financeNow, onFinanceNow, form, onChange, dues, onDues, oldOutstanding, tuition, courseId, templates, period }: {
    view: ConsumptionView | null; sameCourse: boolean; currency: string; canFinance: boolean; financeNow: boolean; onFinanceNow: (now: boolean) => void;
    form: FinanceForm; onChange: (patch: Partial<FinanceForm>) => void; dues: DuesDecision; onDues: (d: DuesDecision) => void; oldOutstanding: number;
    tuition: number; courseId: string; templates: FeePlanTemplate[]; period: CoursePeriod | null;
}) {
    const money = (v: number) => formatMoney(v, currency, 2);
    if (sameCourse) {
        return (
            <div style={card}>
                <div style={heading}><DollarSign size={14} color="var(--cs-primary)" /> Fees</div>
                <div style={{ fontSize: '12.5px', color: 'var(--cs-text-secondary)' }}>The course stays the same, so its fee, payments and installments move to the new batch unchanged. No credit is created.</div>
            </div>
        );
    }
    const credit = view?.credit;
    const a = view?.assessment;
    const decision = credit?.reviewable ? reviewState(form, verifiedConsumed(view), credit.unusedCeiling) : null;
    const approved = decision?.credit ?? 0;
    const existing = credit?.creditBalance ?? 0;
    const available = availableCredit(view, form);
    const netFee = planFee(tuition, templates.find(t => t.planId === form.templatePlanId));
    const applied = Math.min(Number(form.applyCredit || 0), available, netFee);

    return (
        <>
            {credit && a && (
                <div style={card}>
                    <div style={heading}><DollarSign size={14} color="var(--cs-primary)" /> Fee position</div>
                    <div style={grid}>
                        <Metric label="Old course fee" value={money(credit.courseFee)} />
                        <Metric label="Verified payments" value={money(credit.verifiedPayments)} tone="#15803D" note={credit.pendingVerification > 0 ? `${money(credit.pendingVerification)} not verified, not counted` : credit.refunded > 0 ? `${money(credit.refunded)} refunded, not counted` : undefined} />
                        <Metric label="Old outstanding dues" value={money(credit.outstanding)} tone={credit.outstanding > 0 ? '#DC2626' : undefined} />
                        <Metric label="Maximum unused amount" value={money(credit.unusedCeiling)} note="Before the consumed fee" />
                        <Metric label="Consumed fee" value={a.consumedAmount === null ? 'Not verified' : money(a.consumedAmount)} note={`${METHOD[a.method]}${a.calculation ? ` · ${a.calculation}` : ''}`} />
                        <Metric label="Previous adjustments" value={money(credit.previousAdjustments)} />
                        <Metric label="Existing credit balance" value={money(existing)} />
                        <Metric label="New course fee" value={money(tuition)} note="From course catalogue" />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)' }}>
                        Attendance review: <span className={`badge ${VERIFICATION_STATUS[a.status].badge}`}>{VERIFICATION_STATUS[a.status].label}</span>
                    </div>
                    {credit.unlinkedPaid > 0 && <div style={warn}>{money(credit.unlinkedPaid)} was paid on invoices that are not linked to a course. It is not counted here.</div>}
                </div>
            )}

            {oldOutstanding > 0 && (
                <div style={{ ...warn, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontWeight: 700 }}>Old course outstanding dues ({money(oldOutstanding)})</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="radio" name="duesAction" checked={!dues.waive} onChange={() => onDues({ ...dues, waive: false })} />
                        <span><strong>Retain:</strong> the dues stay with the old enrollment. They are not added to the new course or taken from credit.</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: canFinance ? 'pointer' : 'not-allowed', opacity: canFinance ? 1 : 0.6 }}>
                        <input type="radio" name="duesAction" disabled={!canFinance} checked={dues.waive} onChange={() => onDues({ ...dues, waive: true })} />
                        <span><strong>Waive:</strong> write off {money(oldOutstanding)}. Recorded as a waiver with your name, not as a payment or credit.{canFinance ? '' : ' Finance permission is required.'}</span>
                    </label>
                    {dues.waive && <input className="cs-input" aria-label="Reason for the waiver" placeholder="Reason for the waiver *" value={dues.reason} onChange={e => onDues({ ...dues, reason: e.target.value })} />}
                    <div>Old outstanding after the transfer: <strong>{money(dues.waive ? 0 : oldOutstanding)}</strong></div>
                </div>
            )}

            {canFinance ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {([[true, 'Set Up Credit & Fee Plan Now', 'Decide the transfer credit and create the new fee plan with this transfer'],
                        [false, 'Defer to Finance Queue', 'Transfer now; Finance decides the credit and fee plan later']] as const).map(([now, title, text]) => {
                        const blocked = !now && Boolean(view?.transferBlocked);
                        return (
                            <label key={title} style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? 0.6 : 1,
                                border: financeNow === now ? '2px solid #4F46E5' : '1px solid #E2E8F0', background: financeNow === now ? '#EEF2FF' : '#FFFFFF',
                            }}>
                                <input type="radio" name="financeWhen" checked={financeNow === now} disabled={blocked} onChange={() => onFinanceNow(now)} style={{ accentColor: '#4F46E5' }} />
                                <div>
                                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1E293B' }}>{title}</div>
                                    <div style={{ fontSize: '11px', color: '#64748B' }}>{blocked ? 'Not available until the consumed fee is verified' : text}</div>
                                </div>
                            </label>
                        );
                    })}
                </div>
            ) : <div style={warn}>Finance decides the transfer credit and creates the fee plan of the new course after the transfer.</div>}

            {canFinance && financeNow && (
                <>
                    {credit?.reviewable && <CreditReviewFields form={form} onChange={onChange} currency={currency} idPrefix="st-review" unusedCeiling={credit.unusedCeiling} verifiedConsumed={verifiedConsumed(view)} />}
                    <div style={card}>
                        <div style={heading}>Transfer credit</div>
                        <div style={grid}>
                            <Metric label="Existing available credit" value={money(existing)} />
                            <Metric label="Newly eligible credit" value={!credit?.reviewable ? money(0) : decision?.eligible == null ? 'Not verified' : money(decision.eligible)} tone="#15803D" />
                            <Metric label="Credit approved" value={money(approved)} />
                            <Metric label="Total available credit" value={money(available)} />
                            <Metric label="Credit applied" value={money(applied)} tone="var(--cs-primary)" />
                            <Metric label="Remaining unused credit" value={money(available - applied)} note="Kept for later, not refunded or forfeited" />
                        </div>
                    </div>
                    <FeePlanFields form={form} onChange={onChange} currency={currency} idPrefix="st-plan" tuition={tuition} courseId={courseId} templates={templates} availableCredit={available} period={period} />
                </>
            )}
        </>
    );
}

function Rows({ rows }: { rows: Array<[string, React.ReactNode, boolean?]> }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {rows.map(([label, value, strong]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12.5px' }}>
                    <span style={{ color: 'var(--cs-text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight: strong ? 800 : 600, textAlign: 'right', color: 'var(--cs-text-primary)' }}>{value}</span>
                </div>
            ))}
        </div>
    );
}

/** Everything the transfer will do, as calculated by the API, before it is confirmed. */
export function TransferSummaryStep({ preview, currency, studentId, transferDate, reason, enrollmentDate, paymentMode }: {
    preview: TransferPreview; currency: string; studentId: string; transferDate: string; reason: string; enrollmentDate: string; paymentMode: 'one_time' | 'installment' | null;
}) {
    const { summary: s, from, to, installments } = preview;
    const money = (v: number | null) => (v === null ? 'Finance decides later' : formatMoney(v, currency, 2));
    const place = (x: Side) => `${x.branchName ?? '—'} · ${x.batchName}`;
    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '12px' }}>
                <div style={card}>
                    <div style={heading}>Old course</div>
                    <Rows rows={[
                        ['Course', `${from.courseTitle} (${from.courseCode})`], ['Branch · batch', place(from)], ['Enrollment date', formatDate(enrollmentDate)],
                        ...(s.sameCourse ? [] : [
                            ['Old course fee', money(s.oldCourseFee)], ['Verified payments', money(s.verifiedPaid)],
                            ['Consumed fee', s.consumedAmount === null ? 'Not verified' : `${money(s.consumedAmount)}${s.consumptionMethod ? ` (${METHOD[s.consumptionMethod]})` : ''}`],
                            ...(s.previousAdjustments > 0 ? [['Previous adjustments', money(s.previousAdjustments)]] : []),
                            ['Eligible credit', money(s.eligibleCredit)], ['Approved transfer credit', preview.creditStatus === 'pending_review' ? 'Finance decides later' : money(s.approvedCredit), true],
                            ['Outstanding dues', money(s.oldOutstanding)], ...(s.waivedAmount > 0 ? [['Waived', `− ${money(s.waivedAmount)}`]] : []),
                            ['Old outstanding after transfer', money(s.remainingOutstanding), true],
                        ] as Array<[string, React.ReactNode, boolean?]>),
                    ]} />
                </div>
                <div style={card}>
                    <div style={heading}><ArrowRight size={13} color="#059669" /> New course</div>
                    <Rows rows={[
                        ['Course', `${to.courseTitle} (${to.courseCode})`], ['Branch · batch', place(to)], ['Transfer date', formatDate(transferDate)], ['Reason', reason],
                        ...(s.sameCourse ? [['Fees', 'Carried over unchanged']] : [
                            ['New course fee', money(s.newCourseFee)], ...(s.discount > 0 ? [['Fee plan discount', `− ${money(s.discount)}`]] : []),
                            ['Approved credit applied', s.payable === null ? 'Finance decides later' : `− ${money(s.creditApplied)}`],
                            ['Remaining credit', money(s.remainingCredit)], ['Payable by guardian', money(s.payable), true],
                            ['Payment option', !installments ? 'Finance decides later' : paymentMode === 'installment' ? `${installments.length} installment${installments.length === 1 ? '' : 's'}` : 'One-time payment'],
                        ] as Array<[string, React.ReactNode, boolean?]>) as Array<[string, React.ReactNode, boolean?]>,
                    ]} />
                </div>
            </div>
            {installments && (
                <table className="cs-table" style={{ width: '100%', fontSize: '12.5px' }}>
                    <thead><tr><th style={{ width: '40px' }}>#</th><th>Due date</th><th style={{ textAlign: 'right' }}>Fee</th><th style={{ textAlign: 'right' }}>Credit</th><th style={{ textAlign: 'right' }}>Guardian pays</th></tr></thead>
                    <tbody>
                        {installments.map(i => (
                            <tr key={i.installmentNumber}>
                                <td>{i.installmentNumber}</td><td>{formatDate(i.dueDate)}</td><td style={{ textAlign: 'right' }}>{money(i.gross)}</td>
                                <td style={{ textAlign: 'right', color: '#15803D' }}>{i.credit > 0 ? `− ${money(i.credit)}` : '—'}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{money(i.payable)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <div style={{ fontSize: '11.5px', color: 'var(--cs-text-secondary)', lineHeight: 1.45, background: 'var(--cs-surface)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--cs-border)' }}>
                Student ID {studentId} and all payments, invoices, attendance and results are kept. The old enrollment becomes <strong>Transferred</strong> only if every step succeeds.
            </div>
        </>
    );
}
