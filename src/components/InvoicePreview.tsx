'use client';
import { formatDate, formatMoney } from '@/lib/api';
import {
    installmentLabel, invoiceFigures, receivedPayments, settledOn, type DocContext, type DocCourse, type DocInstallment, type DocPayment,
} from '@/lib/fee-documents';

const box: React.CSSProperties = { padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' };
const cell: React.CSSProperties = { padding: '7px 10px', borderTop: '1px solid #F1F5F9', textAlign: 'left', verticalAlign: 'top' };
const num: React.CSSProperties = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' };
const head: React.CSSProperties = { padding: '7px 10px', background: '#F8FAFC', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: '#64748B' };
const headNum: React.CSSProperties = { ...head, textAlign: 'right' };
const tableBox: React.CSSProperties = { border: '1px solid #E2E8F0', borderRadius: '8px', overflowX: 'auto' };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return <div><span style={{ color: '#64748B' }}>{label}:</span> <b style={{ color: '#0F172A' }}>{value || '—'}</b></div>;
}

function Header({ title, number, status, settled }: { title: string; number: string; status: string; settled: boolean }) {
    return (
        <div style={{ ...box, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{title}</div>
                <div style={{ fontSize: '11.5px', color: '#64748B', fontFamily: 'monospace' }}>{number}</div>
            </div>
            <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11.5px', fontWeight: 700, background: settled ? '#DCFCE7' : '#FEF3C7', color: settled ? '#15803D' : '#92400E' }}>{status}</span>
        </div>
    );
}

function Payments({ payments, money }: { payments: DocPayment[]; money: (v: number) => string }) {
    if (payments.length === 0) return <div style={{ color: '#64748B' }}>No payment received yet.</div>;
    return (
        <div style={tableBox}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={head}>Receipt</th><th style={head}>Date</th><th style={head}>Method</th><th style={head}>Reference</th><th style={headNum}>Amount</th></tr></thead>
                <tbody>
                    {payments.map(p => (
                        <tr key={p.paymentId}>
                            <td style={{ ...cell, fontFamily: 'monospace' }}>{p.receiptNumber}</td>
                            <td style={cell}>{formatDate(p.createdAt)}</td>
                            <td style={cell}>{p.paymentMethod}</td>
                            <td style={cell}>{p.reference || '—'}</td>
                            <td style={{ ...num, color: '#047857', fontWeight: 700 }}>{money(p.amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Invoice of one installment, with the same figures as the printed document. */
export function InstallmentInvoicePreview({ inst, course, ctx }: { inst: DocInstallment; course: DocCourse; ctx: DocContext }) {
    const money = (v: number) => formatMoney(v, ctx.currency, 2);
    const f = invoiceFigures(inst);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
            <Header title={course.courseTitle} number={inst.invoiceNumber} status={f.statusLabel} settled={f.settled} />
            <div style={{ ...box, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px' }}>
                <Field label="Student" value={`${ctx.studentName} (${ctx.studentCode})`} />
                <Field label="Invoice date" value={formatDate(inst.issuedAt)} />
                <Field label="Installment" value={installmentLabel(inst, course)} />
                <Field label="Due date" value={formatDate(inst.dueDate)} />
                <Field label="Batch" value={course.batchName} />
                <Field label="Branch" value={course.branchName ?? ctx.branchName} />
            </div>
            <div style={tableBox}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        {f.lines.map((l, i) => <tr key={l.label}><td style={cell}>{i === 0 ? inst.designation : l.label}</td><td style={num}>{l.amount < 0 ? '−' : ''}{money(Math.abs(l.amount))}</td></tr>)}
                        <tr style={{ fontWeight: 700, background: '#F8FAFC' }}><td style={cell}>Installment total</td><td style={num}>{money(f.total)}</td></tr>
                        <tr><td style={cell}>Amount received</td><td style={{ ...num, color: '#047857' }}>{money(f.paid)}</td></tr>
                        {f.movedToLater > 0 && <tr><td style={cell}>Unpaid balance added to later installments</td><td style={{ ...num, color: '#B45309' }}>{money(f.movedToLater)}</td></tr>}
                        <tr style={{ fontWeight: 700, background: '#F8FAFC' }}><td style={cell}>Balance due on this installment</td><td style={{ ...num, color: f.balance > 0 ? '#B91C1C' : '#047857' }}>{money(f.balance)}</td></tr>
                    </tbody>
                </table>
            </div>
            <div style={{ fontWeight: 700 }}>Payments received</div>
            <Payments payments={f.payments} money={money} />
            {f.awaiting > 0 && <div style={{ color: '#92400E' }}>{money(f.awaiting)} is awaiting verification and is not counted as received.</div>}
            <div style={{ ...box, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                <Field label="Course fee" value={money(course.totalFee)} />
                <Field label="Paid to date" value={money(course.paidAmount)} />
                <Field label="Course balance" value={money(course.balanceAmount)} />
            </div>
        </div>
    );
}

/** All installments of one course. */
export function CourseInvoicePreview({ course, ctx }: { course: DocCourse; ctx: DocContext }) {
    const money = (v: number) => formatMoney(v, ctx.currency, 2);
    const settled = course.balanceAmount <= 0;
    const completed = settledOn(course);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
            <Header title={course.courseTitle} number={`${course.courseCode} / ${ctx.studentCode}`} status={settled ? 'Fully Settled' : 'Outstanding'} settled={settled} />
            <div style={{ ...box, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px' }}>
                <Field label="Student" value={`${ctx.studentName} (${ctx.studentCode})`} />
                <Field label="Batch" value={course.batchName} />
                <Field label="Branch" value={course.branchName ?? ctx.branchName} />
                <Field label="Last payment" value={completed ? formatDate(completed) : '—'} />
            </div>
            <div style={tableBox}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={head}>#</th><th style={head}>Installment</th><th style={head}>Due</th><th style={headNum}>Total</th><th style={headNum}>Received</th><th style={headNum}>Moved to later</th><th style={head}>Status</th></tr></thead>
                    <tbody>
                        {course.installments.map(i => {
                            const f = invoiceFigures(i);
                            return (
                                <tr key={i.invoiceId}>
                                    <td style={cell}>{i.installmentNumber}</td>
                                    <td style={cell}>{i.designation}<div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>{i.invoiceNumber}</div></td>
                                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>{formatDate(i.dueDate)}</td>
                                    <td style={num}>{money(f.total)}</td>
                                    <td style={{ ...num, color: '#047857' }}>{money(f.paid)}</td>
                                    <td style={num}>{f.movedToLater > 0 ? money(f.movedToLater) : '—'}</td>
                                    <td style={cell}>{f.statusLabel}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div style={{ fontWeight: 700 }}>Payments received</div>
            <Payments payments={receivedPayments(course.installments.flatMap(i => i.payments))} money={money} />
            <div style={{ ...box, display: 'grid', gridTemplateColumns: `repeat(${course.creditApplied > 0 ? 4 : 3}, 1fr)`, gap: '8px', textAlign: 'center' }}>
                <Field label="Course fee" value={money(course.totalFee)} />
                {course.creditApplied > 0 && <Field label="Credit applied" value={`−${money(course.creditApplied)}`} />}
                <Field label="Received" value={money(course.paidAmount)} />
                <Field label="Balance" value={money(course.balanceAmount)} />
            </div>
        </div>
    );
}
