'use client';
import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { FeePlanFields, emptyFinanceForm, planPayload, planProblem, type FeePlanTemplate, type FinanceForm } from '@/components/TransferFinance';
import { api, formatDate, formatMoney, useApi } from '@/lib/api';
import { FREQUENCIES, MAX_INSTALLMENTS, addMonths, dateInDays, fittingInstallments, splitRemaining, stepMonths, type CoursePeriod, type Frequency } from '@/lib/installments';

interface ScheduleInstallment {
    invoiceId: string; invoiceNumber: string; installmentNumber: number | null; designation: string; originalAmount: number; originalDueDate: string;
    amount: number; dueDate: string; paidAmount: number; balanceAmount: number; openAmount: number; creditApplied: number; adjustable: boolean;
}
interface HistoryEntry {
    id: string; action: string; oldValue: { amount?: number; dueDate?: string; balance?: number } | null; newValue: { amount?: number; dueDate?: string; credit?: number } | null;
    reason: string | null; createdAt: string; invoiceNumber: string; designation: string; actorName: string | null;
}
interface Schedule {
    enrollment: { enrollmentId: string; courseId: string; courseTitle: string; batchName: string; tuitionAmount: number };
    period: CoursePeriod & { today: string }; frequency: Frequency | null; isReview: boolean; outstanding: number; adjustableTotal: number;
    installments: ScheduleInstallment[]; history: HistoryEntry[];
}

const HISTORY_LABEL: Record<string, string> = {
    installment_carry_forward: 'Unpaid balance carried forward', installment_carry_restored: 'Carried balance paid', schedule_adjusted: 'Adjusted by Finance',
    schedule_added: 'Installment added', schedule_removed: 'Installment removed', credit_applied: 'Credit applied', outstanding_waived: 'Outstanding waived',
};
const toPaise = (v: string | number) => Math.round(Number(v || 0) * 100);

function periodText(period: CoursePeriod) {
    if (!period.startDate) return 'Course period is not on record.';
    return `Course ${formatDate(period.startDate)} – ${period.endDate ? formatDate(period.endDate) : 'no end date'}${period.durationMonths ? ` (${period.durationMonths} months)` : ''}`;
}

/** Original and updated installments of one course, their history, and authorized changes to the unpaid future part. */
export default function ScheduleDialog({ enrollmentId, canEdit, currency, onClose, onChanged }: {
    enrollmentId: string; canEdit: boolean; currency: string; onClose: () => void; onChanged: (message: string) => void;
}) {
    const [data, setData] = useState<Schedule | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const money = (v: number) => formatMoney(v, currency, 2);

    useEffect(() => {
        let active = true;
        api<Schedule>(`/billing/schedule?enrollmentId=${enrollmentId}`)
            .then(d => { if (active) setData(d); })
            .catch((err: Error) => { if (active) setError(err.message); });
        return () => { active = false; };
    }, [enrollmentId]);

    return (
        <Modal title={data ? `Installments — ${data.enrollment.courseTitle} (${data.enrollment.batchName})` : 'Installments'} onClose={onClose} maxWidth="860px">
            {!data ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--cs-text-muted)' }}>{error ?? <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto' }} />}</div>
            ) : editing ? (
                <AdjustForm data={data} currency={currency} onCancel={() => setEditing(false)} onSaved={next => { setData(next); setEditing(false); onChanged('Installment schedule updated.'); }} />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '12.5px', color: 'var(--cs-text-secondary)' }}>
                        <span>{periodText(data.period)}{data.frequency ? ` · ${FREQUENCIES.find(f => f.value === data.frequency)?.label ?? data.frequency}` : ''} · Outstanding <b>{money(data.outstanding)}</b></span>
                        {canEdit && data.adjustableTotal > 0 && (
                            <button type="button" className="btn-primary" style={{ padding: '6px 14px', fontSize: '12.5px', height: 'auto' }} onClick={() => setEditing(true)}>
                                {data.isReview ? 'Reschedule outstanding' : 'Adjust future installments'}
                            </button>
                        )}
                    </div>
                    {data.isReview && (
                        <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #FDE68A', background: '#FFFBEB', color: '#92400E', fontSize: '12.5px' }}>
                            No future installments remain. {money(data.outstanding)} is outstanding and needs Finance review.
                        </div>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                        <table className="cs-table" style={{ width: '100%', fontSize: '12.5px' }}>
                            <thead><tr><th>#</th><th>Original</th><th>Updated</th><th>Paid</th><th>Remaining</th></tr></thead>
                            <tbody>
                                {data.installments.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '18px', color: 'var(--cs-text-muted)' }}>No installment schedule on this course.</td></tr>}
                                {data.installments.map(i => {
                                    const amountChanged = i.amount !== i.originalAmount;
                                    const dateChanged = i.dueDate !== i.originalDueDate;
                                    return (
                                        <tr key={i.invoiceId}>
                                            <td>{i.installmentNumber ?? '—'}<div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontFamily: 'monospace' }}>{i.invoiceNumber}</div></td>
                                            <td>{i.originalAmount > 0 ? <>{money(i.originalAmount)}<div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{formatDate(i.originalDueDate)}</div></> : 'Added later'}</td>
                                            <td style={{ fontWeight: amountChanged || dateChanged ? 700 : 400 }}>
                                                {money(i.amount)}<div style={{ fontSize: '11px', color: dateChanged ? '#B45309' : 'var(--cs-text-muted)' }}>{formatDate(i.dueDate)}</div>
                                            </td>
                                            <td style={{ color: '#047857' }}>{money(i.paidAmount)}</td>
                                            <td style={{ fontWeight: 700, color: i.balanceAmount > 0 ? '#DC2626' : undefined }}>{money(i.balanceAmount)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Adjustment history</div>
                        {data.history.length === 0 ? <div style={{ fontSize: '12.5px', color: 'var(--cs-text-muted)' }}>No adjustments yet.</div> : (
                            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                <table className="cs-table" style={{ width: '100%', fontSize: '12px' }}>
                                    <thead><tr><th>Date</th><th>Installment</th><th>Change</th><th>Reason</th><th>By</th></tr></thead>
                                    <tbody>
                                        {data.history.map(h => (
                                            <tr key={h.id}>
                                                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(h.createdAt)}</td>
                                                <td>{h.designation}</td>
                                                <td>
                                                    {HISTORY_LABEL[h.action] ?? h.action}
                                                    {h.oldValue?.amount !== undefined && h.newValue?.amount !== undefined && h.oldValue.amount !== h.newValue.amount && <div>{money(h.oldValue.amount)} → {money(h.newValue.amount)}</div>}
                                                    {h.oldValue?.dueDate && h.newValue?.dueDate && h.oldValue.dueDate !== h.newValue.dueDate && <div>{formatDate(h.oldValue.dueDate)} → {formatDate(h.newValue.dueDate)}</div>}
                                                    {h.newValue?.credit !== undefined && <div>{money(h.newValue.credit)}</div>}
                                                </td>
                                                <td>{h.reason ?? '—'}</td>
                                                <td>{h.actorName ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}

interface DraftRow { invoiceId: string | null; label: string; dueDate: string; amount: string; paid: number }

function AdjustForm({ data, currency, onCancel, onSaved }: { data: Schedule; currency: string; onCancel: () => void; onSaved: (next: Schedule) => void }) {
    const adjustable = data.installments.filter(i => i.adjustable);
    const [rows, setRows] = useState<DraftRow[]>(adjustable.map(i => ({ invoiceId: i.invoiceId, label: `#${i.installmentNumber ?? '—'}`, dueDate: i.dueDate, amount: String(i.openAmount), paid: i.paidAmount })));
    const [frequency, setFrequency] = useState<Frequency>(data.frequency ?? 'custom');
    const [reason, setReason] = useState('');
    const [allowBeyond, setAllowBeyond] = useState(false);
    const [beyondReason, setBeyondReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const money = (v: number) => formatMoney(v, currency, 2);

    const total = rows.reduce((sum, r) => sum + toPaise(r.amount), 0);
    const expected = toPaise(data.adjustableTotal);
    const dated = rows.filter(r => toPaise(r.amount) > 0);
    const last = dated.at(-1)?.dueDate ?? '';
    const beyond = Boolean(data.period.lastDueDate && last > data.period.lastDueDate);
    const outOfOrder = dated.some((r, i) => !r.dueDate || (i > 0 && r.dueDate <= dated[i - 1].dueDate));
    const update = (i: number, patch: Partial<DraftRow>) => setRows(list => list.map((r, n) => (n === i ? { ...r, ...patch } : r)));
    // The rest of the outstanding amount moves to the installments after the edited one
    const setAmount = (i: number, value: string) => setRows(list => {
        const amounts = splitRemaining(list.map(r => Number(r.amount) || 0), i, Number(value) || 0, data.adjustableTotal);
        return list.map((r, n) => (n === i ? { ...r, amount: value } : n > i ? { ...r, amount: String(amounts[n]) } : r));
    });
    const split = (list: DraftRow[]) => {
        const base = Math.floor(expected / list.length);
        return list.map((r, i) => ({ ...r, amount: String((i === list.length - 1 ? expected - base * (list.length - 1) : base) / 100) }));
    };
    // Part-paid installments keep their place: they can be set to zero, not removed
    const resize = (count: number) => setRows(list => {
        const keep = Math.max(1, list.filter(r => r.paid > 0).length, Math.min(MAX_INSTALLMENTS, count));
        const next = [...list];
        while (next.length > keep) next.splice(next.findLastIndex(r => r.paid === 0), 1);
        while (next.length < keep) next.push({ invoiceId: null, label: 'New', dueDate: addMonths(next.at(-1)?.dueDate || dateInDays(30), stepMonths(frequency) || 1), amount: '', paid: 0 });
        return split(next);
    });
    const applyFrequency = (value: Frequency) => {
        setFrequency(value);
        const step = stepMonths(value);
        if (step === 0) return;
        const first = rows[0]?.dueDate && rows[0].dueDate >= data.period.today ? rows[0].dueDate : data.period.firstDueDate;
        setRows(list => list.map((r, i) => ({ ...r, dueDate: addMonths(first, i * step) })));
    };
    const fits = fittingInstallments(data.period, rows[0]?.dueDate ?? '', frequency);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            onSaved(await api<Schedule>('/billing/schedule', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'adjust', enrollmentId: data.enrollment.enrollmentId, frequency, reason, allowBeyondDuration: beyond && allowBeyond, beyondDurationReason: beyondReason,
                    installments: rows.map(r => ({ invoiceId: r.invoiceId, dueDate: r.dueDate, amount: Number(r.amount || 0) })),
                }),
            }));
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '12.5px', color: 'var(--cs-text-secondary)' }}>
                {periodText(data.period)}. Paid installments and payments are not changed; {money(data.adjustableTotal)} is to be collected.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', alignItems: 'end' }}>
                <div>
                    <label className="cs-label" htmlFor="sa-frequency">Frequency</label>
                    <select id="sa-frequency" className="cs-input" value={frequency} onChange={e => applyFrequency(e.target.value as Frequency)}>
                        {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="cs-label" htmlFor="sa-count">Number of installments{fits ? ` (${fits} fit)` : ''}</label>
                    <input id="sa-count" className="cs-input" type="number" min="1" max={MAX_INSTALLMENTS} value={rows.length} onChange={e => resize(Math.floor(Number(e.target.value) || 1))} />
                </div>
                <button type="button" className="btn-secondary" onClick={() => setRows(split)}>Split equally</button>
            </div>
            <table className="cs-table" style={{ width: '100%', fontSize: '12.5px' }}>
                <thead><tr><th>#</th><th>Due date</th><th>Amount to collect</th><th>Already paid</th><th style={{ width: '40px' }}></th></tr></thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={r.invoiceId ?? `new-${i}`}>
                            <td>{r.label}</td>
                            <td><input className="cs-input" aria-label={`Due date of row ${i + 1}`} type="date" style={{ height: '32px', padding: '0 8px' }} value={r.dueDate} required onChange={e => { setFrequency('custom'); update(i, { dueDate: e.target.value }); }} /></td>
                            <td><input className="cs-input" aria-label={`Amount of row ${i + 1}`} type="number" min="0" step="0.01" style={{ height: '32px', padding: '0 8px' }} value={r.amount} required onChange={e => setAmount(i, e.target.value)} /></td>
                            <td>{r.paid > 0 ? money(r.paid) : '—'}</td>
                            <td>{r.paid === 0 && rows.length > 1 && <button type="button" className="btn-ghost" aria-label={`Remove row ${i + 1}`} style={{ padding: '4px' }} onClick={() => setRows(list => list.filter((_, n) => n !== i))}><Trash2 size={14} /></button>}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                <button type="button" className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--cs-primary)' }} disabled={rows.length >= MAX_INSTALLMENTS}
                    onClick={() => setRows(list => [...list, { invoiceId: null, label: 'New', dueDate: addMonths(list.at(-1)?.dueDate || dateInDays(30), stepMonths(frequency) || 1), amount: '', paid: 0 }])}>
                    <Plus size={14} /> Add installment
                </button>
                <span style={{ fontWeight: 700, color: total === expected ? '#15803D' : '#B91C1C' }}>Total {money(total / 100)} of {money(expected / 100)}</span>
            </div>
            {beyond && (
                <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #FDE68A', background: '#FFFBEB', color: '#92400E', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={allowBeyond} onChange={e => setAllowBeyond(e.target.checked)} />
                        The last installment is after the course ends ({formatDate(data.period.lastDueDate)}). I authorize this.
                    </label>
                    {allowBeyond && <input className="cs-input" aria-label="Reason for going beyond the course" placeholder="Authorization reason *" value={beyondReason} onChange={e => setBeyondReason(e.target.value)} />}
                </div>
            )}
            <div>
                <label className="cs-label" htmlFor="sa-reason">Reason for adjustment *</label>
                <input id="sa-reason" className="cs-input" required minLength={3} value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            {outOfOrder && <div style={{ fontSize: '12px', color: '#B91C1C' }}>Due dates must be in order, each later than the one before.</div>}
            {error && <div role="alert" style={{ padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '12.5px' }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={busy || total !== expected || outOfOrder || (beyond && (!allowBeyond || !beyondReason.trim()))}>{busy ? 'Saving…' : 'Save schedule'}</button>
            </div>
        </form>
    );
}

/** Fee plan of an enrollment that has none yet. */
export function CreatePlanDialog({ enrollmentId, creditBalance, currency, onClose, onCreated }: {
    enrollmentId: string; creditBalance: number; currency: string; onClose: () => void; onCreated: (message: string) => void;
}) {
    const { data, error: loadError } = useApi<Schedule>(`/billing/schedule?enrollmentId=${enrollmentId}`);
    const { data: fees } = useApi<{ feePlans: FeePlanTemplate[] }>('/fees');
    const [form, setForm] = useState<FinanceForm>(emptyFinanceForm);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const create = async () => {
        setBusy(true);
        setError(null);
        try {
            await api('/billing/transfers', { method: 'POST', body: JSON.stringify({ action: 'create_fee_plan', enrollmentId, ...planPayload(form) }) });
            onCreated('Fee plan created.');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title={data ? `Fee plan — ${data.enrollment.courseTitle}` : 'Fee plan'} onClose={onClose} maxWidth="820px">
            {!data ? <div style={{ padding: '32px', textAlign: 'center', color: 'var(--cs-text-muted)' }}>{loadError ?? 'Loading…'}</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <FeePlanFields form={form} onChange={p => setForm(x => ({ ...x, ...p }))} currency={currency} idPrefix="cp" tuition={data.enrollment.tuitionAmount}
                        courseId={data.enrollment.courseId} templates={fees?.feePlans ?? []} availableCredit={creditBalance} period={data.period} />
                    {error && <div role="alert" style={{ padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '12.5px' }}>{error}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-primary" disabled={busy || planProblem(form, data.enrollment.tuitionAmount, fees?.feePlans?.find(t => t.planId === form.templatePlanId), data.period, creditBalance) !== null} onClick={create}>{busy ? 'Saving…' : 'Create fee plan'}</button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
