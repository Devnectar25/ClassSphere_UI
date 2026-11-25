'use client';
import { formatDate, formatMoney } from '@/lib/api';
import { addMonths, dateInDays, fittingInstallments, frequencyChoices, scheduleProblem, splitRemaining, stepMonths, type CoursePeriod, type Frequency } from '@/lib/installments';

/** Credit review and fee plan fields shared by the transfer dialog and the Finance panel. The API validates everything again. */
export interface FinanceForm {
    decision: 'approve' | 'reject';
    /** Finance enters the consumed fee instead of using the verified calculation */
    manualConsumed: boolean;
    consumedAmount: string;
    approvedCredit: string;
    notes: string;
    templatePlanId: string;
    paymentMode: 'one_time' | 'installment';
    frequency: Frequency;
    installmentCount: string;
    firstDueDate: string;
    distribution: 'equal' | 'custom';
    rows: Array<{ dueDate: string; amount: string }>;
    applyCredit: string;
    creditAllocation: 'spread' | 'sequential';
    allowBeyond: boolean;
    beyondReason: string;
}

export interface FeePlanTemplate { planId: string; name: string; courseId?: string | null; discountPercent?: number; isActive?: boolean }

export const CREDIT_STATUS: Record<string, { label: string; badge: string }> = {
    pending_review: { label: 'Credit review pending', badge: 'badge-warning' },
    approved: { label: 'Credit approved', badge: 'badge-success' },
    rejected: { label: 'Credit rejected', badge: 'badge-danger' },
    no_credit: { label: 'No eligible credit', badge: 'badge-secondary' },
    not_applicable: { label: 'No credit to review', badge: 'badge-secondary' },
};

export const PLAN_STATUS: Record<string, { label: string; badge: string }> = {
    pending: { label: 'Fee plan pending', badge: 'badge-warning' },
    configured: { label: 'Fee plan created', badge: 'badge-success' },
    carried_over: { label: 'Fee plan carried over', badge: 'badge-secondary' },
};

export const emptyFinanceForm = (): FinanceForm => ({
    decision: 'approve', manualConsumed: false, consumedAmount: '', approvedCredit: '', notes: '', templatePlanId: '', paymentMode: 'one_time', frequency: 'monthly',
    installmentCount: '3', firstDueDate: dateInDays(15), distribution: 'equal', rows: [], applyCredit: '', creditAllocation: 'spread', allowBeyond: false, beyondReason: '',
});

const toPaise = (value: string | number) => Math.round(Number(value || 0) * 100);

export const planFee = (tuition: number, template?: FeePlanTemplate) =>
    template?.discountPercent ? Math.round(tuition * (1 - Number(template.discountPercent) / 100)) : tuition;

/** Schedule preview: what the guardian will pay and when. */
export function previewSchedule(form: FinanceForm, netFee: number, credit: number) {
    const net = toPaise(netFee);
    const used = Math.min(toPaise(credit), net);
    const payable = net - used;
    const sequential = form.creditAllocation === 'sequential';
    const covered = payable === 0 && !sequential;
    const count = form.paymentMode === 'one_time' || covered ? 1 : Math.max(1, Math.min(36, Math.floor(Number(form.installmentCount) || 1)));
    const scheduled = sequential || covered ? net : payable;
    const base = Math.floor(scheduled / count);
    const step = stepMonths(form.frequency);
    let left = used;
    return Array.from({ length: count }, (_, i) => {
        const row = form.paymentMode === 'installment' ? form.rows[i] : undefined;
        const custom = form.distribution === 'custom' && form.paymentMode === 'installment' && !covered;
        const amount = custom && row ? toPaise(row.amount) : i === count - 1 ? scheduled - base * (count - 1) : base;
        const share = sequential ? Math.min(left, amount) : 0;
        left -= share;
        const dueDate = form.paymentMode === 'installment' && form.frequency === 'custom' ? row?.dueDate ?? ''
            : addMonths(form.firstDueDate, form.paymentMode === 'one_time' ? 0 : i * step);
        return { number: i + 1, dueDate, scheduled: amount / 100, payable: (sequential ? amount - share : covered ? 0 : amount) / 100, credit: share / 100 };
    });
}

export function reviewPayload(form: FinanceForm) {
    return {
        decision: form.decision,
        consumedAmount: form.decision === 'approve' && form.manualConsumed && form.consumedAmount !== '' ? Number(form.consumedAmount) : null,
        approvedCredit: form.decision === 'approve' && form.approvedCredit !== '' ? Number(form.approvedCredit) : null,
        notes: form.notes.trim() || null,
    };
}

export function planPayload(form: FinanceForm) {
    const installment = form.paymentMode === 'installment';
    const custom = installment && (form.distribution === 'custom' || form.frequency === 'custom');
    const count = Math.floor(Number(form.installmentCount) || 0);
    return {
        paymentMode: form.paymentMode,
        frequency: installment ? form.frequency : null,
        installmentCount: installment ? count : 1,
        firstDueDate: installment && form.frequency === 'custom' ? null : form.firstDueDate || null,
        installments: custom ? Array.from({ length: count }, (_, i) => ({
            dueDate: form.frequency === 'custom' ? form.rows[i]?.dueDate || null : null,
            amount: form.distribution === 'custom' ? form.rows[i]?.amount ?? null : null,
        })) : null,
        templatePlanId: form.templatePlanId || null,
        applyCredit: form.applyCredit === '' ? 0 : Number(form.applyCredit),
        creditAllocation: form.creditAllocation,
        allowBeyondDuration: form.allowBeyond,
        beyondDurationReason: form.beyondReason.trim() || null,
    };
}

/** Why this plan cannot be saved, or null: credit, installment amounts and dates. The API checks the same. */
export function planProblem(form: FinanceForm, tuition: number, template: FeePlanTemplate | undefined, period: CoursePeriod | null | undefined, availableCredit: number): string | null {
    const netFee = planFee(tuition, template);
    const credit = Number(form.applyCredit || 0);
    if (credit < 0) return 'Credit to apply cannot be negative.';
    if (toPaise(credit) > toPaise(netFee)) return 'Credit to apply cannot exceed the new course fee.';
    if (toPaise(credit) > toPaise(availableCredit)) return 'Credit to apply cannot exceed the available credit.';
    const schedule = previewSchedule(form, netFee, credit);
    if (form.paymentMode !== 'installment') return schedule[0].dueDate ? null : 'Choose the due date.';
    const expected = form.creditAllocation === 'sequential' ? netFee : netFee - credit;
    if (form.distribution === 'custom' && schedule.reduce((sum, x) => sum + toPaise(x.scheduled), 0) !== toPaise(expected)) return 'The installment amounts must add up to the payable fee.';
    return scheduleProblem(period, schedule.map(x => x.dueDate));
}

const box: React.CSSProperties = {
    background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px',
};
const heading: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const grid = (min: number): React.CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: '10px' });
const hint: React.CSSProperties = { fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '3px' };

export function Metric({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: string }) {
    return (
        <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-border)', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{label}</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: tone ?? 'var(--cs-text-primary)', marginTop: '2px' }}>{value}</div>
            {note && <div style={{ fontSize: '10.5px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>{note}</div>}
        </div>
    );
}

interface FieldProps { form: FinanceForm; onChange: (patch: Partial<FinanceForm>) => void; currency: string; idPrefix: string }

/** What the review form would decide: a verified calculation, or Finance's own amount with its reason. */
export function reviewState(form: FinanceForm, verifiedConsumed: number | null, unusedCeiling: number) {
    const consumed = form.manualConsumed ? (form.consumedAmount === '' ? null : Number(form.consumedAmount)) : verifiedConsumed;
    const eligible = consumed === null ? null : Math.max(0, Math.round((unusedCeiling - consumed) * 100) / 100);
    const problem = form.decision === 'reject' ? (form.notes.trim() ? null : 'Enter the reason for rejecting the transfer credit.')
        : consumed === null ? (form.manualConsumed ? 'Enter the consumed fee of the old course.' : 'The consumed fee is not verified yet. Resolve the attendance or complete a Finance review.')
            : form.manualConsumed && form.notes.trim().length < 3 ? 'Enter the reason for the manual Finance review.'
                : form.approvedCredit !== '' && Number(form.approvedCredit) > eligible! ? 'Approved credit exceeds the eligible credit.'
                    : form.approvedCredit !== '' && (Number(form.approvedCredit) < 0 || Number(form.approvedCredit) < eligible!) && form.notes.trim().length < 3 ? 'Enter the reason for approving less than the eligible credit.' : null;
    const credit = form.decision === 'approve' && eligible !== null ? (form.approvedCredit === '' ? eligible : Math.min(eligible, Number(form.approvedCredit))) : 0;
    return { consumed, eligible, credit, problem };
}

/** Finance decision on the unused fee of the old course. */
export function CreditReviewFields({ form, onChange, currency, idPrefix, unusedCeiling, verifiedConsumed }: FieldProps & { unusedCeiling: number; verifiedConsumed: number | null }) {
    const { eligible, problem } = reviewState(form, verifiedConsumed, unusedCeiling);
    const approve = form.decision === 'approve';
    return (
        <div style={box}>
            <div style={heading}>Transfer credit review</div>
            <div style={{ display: 'flex', gap: '18px', fontSize: '12.5px', flexWrap: 'wrap' }}>
                {(['approve', 'reject'] as const).map(d => (
                    <label key={d} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="radio" name={`${idPrefix}-decision`} checked={form.decision === d} onChange={() => onChange({ decision: d, ...(d === 'reject' ? { applyCredit: '' } : {}) })} />
                        {d === 'approve' ? 'Approve transfer credit' : 'Reject transfer credit'}
                    </label>
                ))}
            </div>
            {approve && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.manualConsumed} onChange={e => onChange({ manualConsumed: e.target.checked, consumedAmount: '', approvedCredit: '', applyCredit: '' })} />
                    Manual Finance review: enter the consumed fee myself
                </label>
            )}
            <div style={grid(180)}>
                {approve && (
                    <div>
                        <label className="cs-label" htmlFor={`${idPrefix}-consumed`}>Consumed fee of old course{form.manualConsumed && ' *'}</label>
                        {form.manualConsumed ? (
                            <input id={`${idPrefix}-consumed`} className="cs-input" type="number" min="0" step="0.01" value={form.consumedAmount}
                                onChange={e => onChange({ consumedAmount: e.target.value })} placeholder="Enter after checking records" />
                        ) : (
                            <input id={`${idPrefix}-consumed`} className="cs-input" readOnly value={verifiedConsumed === null ? 'Not verified' : formatMoney(verifiedConsumed, currency, 2)} />
                        )}
                        <div style={hint}>{form.manualConsumed ? 'Recorded with your name and reason.' : 'From verified attendance. Never assumed.'}</div>
                    </div>
                )}
                {approve && (
                    <div>
                        <label className="cs-label" htmlFor={`${idPrefix}-approved`}>Approved credit</label>
                        <input id={`${idPrefix}-approved`} className="cs-input" type="number" min="0" max={eligible ?? 0} step="0.01" value={form.approvedCredit} disabled={eligible === null}
                            onChange={e => onChange({ approvedCredit: e.target.value })} placeholder={eligible === null ? '' : String(eligible)} />
                        <div style={hint}>Eligible: {eligible === null ? 'after verification' : formatMoney(eligible, currency, 2)}</div>
                    </div>
                )}
                <div>
                    <label className="cs-label" htmlFor={`${idPrefix}-notes`}>{!approve ? 'Reason for rejection *' : form.manualConsumed ? 'Reason for manual review *' : eligible !== null && form.approvedCredit !== '' && Number(form.approvedCredit) < eligible ? 'Reason for the lower credit *' : 'Review note'}</label>
                    <input id={`${idPrefix}-notes`} className="cs-input" value={form.notes} onChange={e => onChange({ notes: e.target.value })} />
                </div>
            </div>
            {problem && <div style={{ ...hint, color: '#92400E' }}>{problem}</div>}
        </div>
    );
}

/** Payment mode, schedule and credit of the new course. */
export function FeePlanFields({ form, onChange, currency, idPrefix, tuition, courseId, templates, availableCredit, period }: FieldProps & {
    tuition: number; courseId: string; templates: FeePlanTemplate[]; availableCredit: number; period?: CoursePeriod | null;
}) {
    const usable = templates.filter(t => t.isActive !== false && (!t.courseId || t.courseId === courseId));
    const netFee = planFee(tuition, usable.find(t => t.planId === form.templatePlanId));
    const maxCredit = Math.min(availableCredit, netFee);
    const credit = Math.min(Number(form.applyCredit || 0), maxCredit);
    const schedule = previewSchedule(form, netFee, credit);
    const total = schedule.reduce((sum, s) => sum + Math.round(s.scheduled * 100), 0) / 100;
    const expected = form.creditAllocation === 'sequential' ? netFee : netFee - credit;
    const mismatch = form.paymentMode === 'installment' && form.distribution === 'custom' && Math.round(total * 100) !== Math.round(expected * 100);
    const lastDue = schedule.at(-1)?.dueDate ?? '';
    // Installments stay within the course; only a one-time due date after it can be authorized
    const beyond = form.paymentMode === 'one_time' && Boolean(period?.lastDueDate && lastDue > period.lastDueDate);
    const problem = mismatch ? null : planProblem(form, tuition, usable.find(t => t.planId === form.templatePlanId), period, availableCredit);
    const fits = fittingInstallments(period, form.firstDueDate, form.frequency);
    // As many installments as fit in the course, starting with it
    const withFrequency = (frequency: Frequency, firstDueDate: string): Partial<FinanceForm> => {
        const count = fittingInstallments(period, firstDueDate, frequency);
        return { frequency, firstDueDate, rows: [], ...(count ? { installmentCount: String(count) } : {}) };
    };
    const courseFirstDue = period && period.firstDueDate > form.firstDueDate ? period.firstDueDate : form.firstDueDate;
    const setRow = (i: number, patch: Partial<{ dueDate: string; amount: string }>) => {
        const rows = schedule.map((s, n) => form.rows[n] ?? { dueDate: s.dueDate, amount: String(s.scheduled) });
        rows[i] = { ...rows[i], ...patch };
        // The rest of the amount moves to the installments after this one
        if (patch.amount !== undefined) {
            splitRemaining(rows.map(r => Number(r.amount) || 0), i, Number(patch.amount) || 0, expected)
                .forEach((amount, n) => { if (n > i) rows[n] = { ...rows[n], amount: String(amount) }; });
        }
        onChange({ rows });
    };

    return (
        <div style={box}>
            <div style={heading}>New course fee plan</div>
            {period?.startDate && (
                <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)' }}>
                    Course {formatDate(period.startDate)} – {period.lastDueDate ? formatDate(period.lastDueDate) : 'no end date'}{period.durationMonths ? ` (${period.durationMonths} months)` : ''}
                </div>
            )}
            <div style={grid(150)}>
                <Metric label="New course fee" value={formatMoney(netFee, currency, 2)} note={netFee < tuition ? `After discount on ${formatMoney(tuition, currency, 2)}` : 'From course catalogue'} />
                <Metric label="Credit applied" value={formatMoney(credit, currency, 2)} note={`Available: ${formatMoney(availableCredit, currency, 2)}`} tone="#15803D" />
                <Metric label="Payable by guardian" value={formatMoney(netFee - credit, currency, 2)} tone="var(--cs-primary)" />
                {availableCredit - credit > 0 && <Metric label="Credit kept in ledger" value={formatMoney(availableCredit - credit, currency, 2)} note="Not refunded or forfeited" />}
            </div>
            <div role="radiogroup" aria-label="Payment option" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {([['one_time', 'One-Time Payment', 'One payable amount and due date'], ['installment', 'Installment Payment', 'Split the payable fee over the course']] as const).map(([paymentMode, title, text]) => (
                    <label key={paymentMode} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                        border: form.paymentMode === paymentMode ? '2px solid #4F46E5' : '1px solid #E2E8F0', background: form.paymentMode === paymentMode ? '#EEF2FF' : '#FFFFFF',
                    }}>
                        <input type="radio" name={`${idPrefix}-mode`} checked={form.paymentMode === paymentMode} style={{ accentColor: '#4F46E5' }}
                            onChange={() => onChange(paymentMode === 'installment' ? { paymentMode, ...withFrequency(form.frequency, courseFirstDue) } : { paymentMode, rows: [] })} />
                        <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1E293B' }}>{title}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{text}</div>
                        </div>
                    </label>
                ))}
            </div>
            <div style={grid(180)}>
                <div>
                    <label className="cs-label" htmlFor={`${idPrefix}-template`}>Fee plan / discount</label>
                    <select id={`${idPrefix}-template`} className="cs-input" value={form.templatePlanId} onChange={e => onChange({ templatePlanId: e.target.value })}>
                        <option value="">Standard course fee</option>
                        {usable.map(t => <option key={t.planId} value={t.planId}>{t.name}{t.discountPercent ? ` (${t.discountPercent}% off)` : ''}</option>)}
                    </select>
                </div>
                <div>
                    <label className="cs-label" htmlFor={`${idPrefix}-credit`}>Credit to apply</label>
                    <input id={`${idPrefix}-credit`} className="cs-input" type="number" min="0" max={maxCredit} step="0.01" value={form.applyCredit} disabled={maxCredit <= 0}
                        onChange={e => onChange({ applyCredit: e.target.value })} placeholder="0" />
                    <div style={hint}>
                        {maxCredit > 0
                            ? <>Up to {formatMoney(maxCredit, currency, 2)}. <button type="button" className="btn-ghost" style={{ padding: 0, fontSize: '11px', color: 'var(--cs-primary)' }} onClick={() => onChange({ applyCredit: String(maxCredit) })}>Apply all</button> · <button type="button" className="btn-ghost" style={{ padding: 0, fontSize: '11px', color: 'var(--cs-primary)' }} onClick={() => onChange({ applyCredit: '' })}>Apply none</button></>
                            : 'No credit available'}
                    </div>
                </div>
                {form.paymentMode === 'installment' && (
                    <>
                        <div>
                            <label className="cs-label" htmlFor={`${idPrefix}-count`}>Number of installments</label>
                            <input id={`${idPrefix}-count`} className="cs-input" type="number" min="1" max={fits || 36} value={form.installmentCount} onChange={e => onChange({ installmentCount: e.target.value, rows: [] })} />
                            {fits !== null && <div style={hint}>{fits} fit in the course</div>}
                        </div>
                        <div>
                            <label className="cs-label" htmlFor={`${idPrefix}-freq`}>Frequency</label>
                            <select id={`${idPrefix}-freq`} className="cs-input" value={form.frequency} onChange={e => onChange(withFrequency(e.target.value as Frequency, courseFirstDue))}>
                                {frequencyChoices(period, courseFirstDue).map(f => <option key={f.value} value={f.value} disabled={f.disabled}>{f.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="cs-label" htmlFor={`${idPrefix}-dist`}>Distribution</label>
                            <select id={`${idPrefix}-dist`} className="cs-input" value={form.distribution} onChange={e => onChange({ distribution: e.target.value as FinanceForm['distribution'], rows: [] })}>
                                <option value="equal">Equal amounts</option>
                                <option value="custom">Custom amounts</option>
                            </select>
                        </div>
                    </>
                )}
                {(form.paymentMode === 'one_time' || form.frequency !== 'custom') && (
                    <div>
                        <label className="cs-label" htmlFor={`${idPrefix}-due`}>{form.paymentMode === 'one_time' ? 'Due date' : 'First due date'}</label>
                        <input id={`${idPrefix}-due`} className="cs-input" type="date" value={form.firstDueDate} onChange={e => onChange({ firstDueDate: e.target.value })} />
                    </div>
                )}
                {form.paymentMode === 'installment' && credit > 0 && (
                    <div>
                        <label className="cs-label" htmlFor={`${idPrefix}-alloc`}>Use credit</label>
                        <select id={`${idPrefix}-alloc`} className="cs-input" value={form.creditAllocation} onChange={e => onChange({ creditAllocation: e.target.value as FinanceForm['creditAllocation'], rows: [] })}>
                            <option value="spread">Across all installments</option>
                            <option value="sequential">On the first installments</option>
                        </select>
                    </div>
                )}
            </div>
            <table className="cs-table" style={{ width: '100%', fontSize: '12.5px' }}>
                <thead><tr><th style={{ width: '40px' }}>#</th><th>Due date</th><th>Scheduled</th>{form.creditAllocation === 'sequential' && credit > 0 && <th>Credit</th>}<th style={{ textAlign: 'right' }}>Guardian pays</th></tr></thead>
                <tbody>
                    {schedule.map((s, i) => (
                        <tr key={s.number}>
                            <td>{s.number}</td>
                            <td>{form.paymentMode === 'installment' && form.frequency === 'custom'
                                ? <input className="cs-input" aria-label={`Due date of installment ${s.number}`} type="date" min={period?.startDate ?? undefined} max={period?.lastDueDate ?? undefined} style={{ height: '30px', padding: '0 8px' }} value={form.rows[i]?.dueDate ?? ''} onChange={e => setRow(i, { dueDate: e.target.value })} />
                                : s.dueDate || '—'}</td>
                            <td>{form.paymentMode === 'installment' && form.distribution === 'custom'
                                ? <input className="cs-input" aria-label={`Amount of installment ${s.number}`} type="number" min="0" step="0.01" style={{ height: '30px', padding: '0 8px' }} value={form.rows[i]?.amount ?? String(s.scheduled)} onChange={e => setRow(i, { amount: e.target.value })} />
                                : formatMoney(s.scheduled, currency, 2)}</td>
                            {form.creditAllocation === 'sequential' && credit > 0 && <td style={{ color: '#15803D' }}>{s.credit > 0 ? `-${formatMoney(s.credit, currency, 2)}` : '—'}</td>}
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(s.payable, currency, 2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {beyond && (
                <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #FDE68A', background: '#FFFBEB', color: '#92400E', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.allowBeyond} onChange={e => onChange({ allowBeyond: e.target.checked })} />
                        The due date ({formatDate(lastDue)}) is after the course ends ({formatDate(period!.lastDueDate)}). I authorize this.
                    </label>
                    {form.allowBeyond && <input className="cs-input" aria-label="Reason for going beyond the course" placeholder="Authorization reason *" value={form.beyondReason} onChange={e => onChange({ beyondReason: e.target.value })} />}
                </div>
            )}
            {problem && <div role="alert" style={{ fontSize: '12px', color: '#B91C1C' }}>{problem}</div>}
            {mismatch && <div style={{ fontSize: '12px', color: '#B91C1C' }}>Installments total {formatMoney(total, currency, 2)}; they must total {formatMoney(expected, currency, 2)}.</div>}
        </div>
    );
}
