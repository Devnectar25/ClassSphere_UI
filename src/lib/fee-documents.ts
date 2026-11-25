/**
 * Invoices and receipts, built only from recorded billing data. The Finance panel, Guardian portal and Invoices page
 * all use this, so one payment can never be shown three different ways.
 */
import { formatDate, formatMoney } from '@/lib/api';

export interface DocPayment { paymentId: string; receiptNumber: string; amount: number; paymentMethod: string; reference: string; status: string; createdAt: string; recordedBy?: string | null }

export interface DocInstallment {
    invoiceId: string; invoiceNumber: string; installmentNumber: number; designation: string; dueDate: string; issuedAt: string;
    scheduledAmount: number; scheduledDueDate: string; amount: number; originalAmount: number; creditApplied: number; carriedIn: number; carriedOut: number;
    scheduleAdjustment: number; lateFeeAmount: number; paidAmount: number; balanceAmount: number; status: string; payments: DocPayment[];
}

export interface DocCourse {
    courseTitle: string; courseCode: string; batchName?: string; branchName?: string; totalFee: number; creditApplied: number; paidAmount: number; balanceAmount: number;
    installments: DocInstallment[];
}

export interface DocAcademy { name: string; logoUrl: string | null; address: string | null; phone: string | null; email: string | null }
export interface DocContext { academy: DocAcademy; studentName: string; studentCode: string; branchName: string | null; guardianName: string | null; currency: string }

const RECEIVED = ['posted', 'reconciled', 'verified'];
const paise = (v: number) => Math.round((Number(v) || 0) * 100);

export const STATUS_LABEL: Record<string, string> = {
    paid: 'Paid', partially_paid: 'Partially Paid', overdue: 'Overdue', verification_pending: 'Verification Pending', failed: 'Failed', pending: 'Pending',
};

/** Received payments, oldest first. Declared or rejected ones are not receipts. */
export const receivedPayments = (payments: DocPayment[] | undefined) =>
    (payments ?? []).filter(p => RECEIVED.includes(p.status)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

export interface InvoiceFigures {
    lines: Array<{ label: string; amount: number }>;
    total: number; paid: number; movedToLater: number; balance: number; statusLabel: string; settled: boolean; payments: DocPayment[]; awaiting: number;
}

/** Lines that add up to the installment, what was received, what moved to later installments and what is due now. */
export function invoiceFigures(inst: DocInstallment): InvoiceFigures {
    const difference = paise(inst.paidAmount) + paise(inst.balanceAmount) - paise(inst.amount);
    const lateFee = Math.max(0, difference);
    const waived = Math.max(0, -difference);
    const payable = paise(inst.amount) + paise(inst.carriedOut);
    // Credit is either part of the first schedule or applied later; both are shown as one deduction
    const tuition = payable + paise(inst.creditApplied) - paise(inst.carriedIn) - paise(inst.scheduleAdjustment);
    const lines = [
        { label: 'Tuition for this installment', amount: tuition },
        { label: 'Credit applied', amount: -paise(inst.creditApplied) },
        { label: 'Balance carried from earlier installments', amount: paise(inst.carriedIn) },
        { label: 'Schedule adjustment', amount: paise(inst.scheduleAdjustment) },
        { label: 'Late fee', amount: lateFee },
        { label: 'Waived by the academy', amount: -waived },
    ].filter((l, i) => i === 0 || l.amount !== 0).map(l => ({ ...l, amount: l.amount / 100 }));
    const settled = inst.status === 'paid';
    return {
        lines, total: (payable + lateFee - waived) / 100, paid: inst.paidAmount, movedToLater: inst.carriedOut, balance: inst.balanceAmount, settled,
        statusLabel: settled && inst.paidAmount === 0 ? (inst.creditApplied > 0 ? 'Covered by Credit' : 'Settled') : STATUS_LABEL[inst.status] ?? inst.status,
        payments: receivedPayments(inst.payments),
        awaiting: (inst.payments ?? []).filter(p => p.status === 'verification_pending').reduce((sum, p) => sum + p.amount, 0),
    };
}

export const installmentLabel = (inst: DocInstallment, course: DocCourse) =>
    (course.installments.length > 1 ? `${inst.installmentNumber} of ${course.installments.length}` : 'One-time payment');

/** Date the course was fully settled: its last received payment. */
export function settledOn(course: DocCourse): string | null {
    return receivedPayments(course.installments.flatMap(i => i.payments)).at(-1)?.createdAt ?? null;
}

const esc = (v: unknown) => String(v ?? '—').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const row = (label: string, value: unknown) => `<div class="r"><span>${esc(label)}</span><b>${esc(value || '—')}</b></div>`;

function page(title: string, heading: string, number: string, date: string, ctx: DocContext, body: string) {
    const a = ctx.academy;
    const logo = a.logoUrl ? `<img src="${esc(a.logoUrl)}" alt="">` : '';
    const contact = [a.address, a.phone, a.email].filter(Boolean).map(esc).join(' &bull; ');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page{size:A4 portrait;margin:14mm}body{font-family:'Segoe UI',system-ui,Arial,sans-serif;color:#0f172a;margin:26px;line-height:1.45;font-size:12.5px}
header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #1e3a8a;padding-bottom:12px;margin-bottom:16px}
.brand{display:flex;gap:12px;align-items:center}.brand img{max-height:52px;max-width:130px;object-fit:contain}h1{font-size:19px;margin:0;color:#1e3a8a}.muted{color:#64748b;font-size:11.5px}
h2{font-size:15px;margin:0;text-align:right}.no{font-family:monospace;font-weight:700;text-align:right}.right{text-align:right}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 28px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:14px}
.r{display:flex;justify-content:space-between;gap:12px}.r span{color:#64748b}h3{font-size:12.5px;color:#1e3a8a;margin:16px 0 6px}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:7px 10px;text-align:left;vertical-align:top}th{background:#f1f5f9;font-size:11px;text-transform:uppercase;color:#334155}
td.n,th.n{text-align:right;white-space:nowrap}tr.t td{font-weight:700;background:#f8fafc}.green{color:#047857}.red{color:#b91c1c}.amber{color:#b45309}
.box{margin-top:16px;padding:12px 16px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc}.ok{border:2px dashed #059669;background:#f0fdf4;color:#047857;font-weight:700;text-align:center}
.due{border-color:#fde68a;background:#fffbeb;color:#92400e}.big{font-size:26px;font-weight:700;color:#047857;margin:16px 0}footer{margin-top:26px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:11px;color:#94a3b8}
</style></head><body><header><div class="brand">${logo}<div><h1>${esc(a.name)}</h1><div class="muted">${contact}</div></div></div>
<div><h2>${esc(heading)}</h2><div class="no">${esc(number)}</div><div class="muted right">Date: ${esc(formatDate(date))}</div></div></header>
${body}<footer>Computer-generated document issued by ${esc(a.name)}. No signature required.</footer>
<script>window.onload=function(){window.print()}<\/script></body></html>`;
}

const studentGrid = (ctx: DocContext, course: DocCourse, extra: string) => `<div class="grid">
<div>${row('Student', ctx.studentName)}${row('Student ID', ctx.studentCode)}${row('Guardian', ctx.guardianName)}</div>
<div>${row('Course', `${course.courseTitle} (${course.courseCode})`)}${row('Batch', course.batchName)}${row('Branch', course.branchName ?? ctx.branchName)}</div>
${extra}</div>`;

function paymentsTable(payments: DocPayment[], money: (v: number) => string) {
    if (payments.length === 0) return '<div class="muted">No payment received yet.</div>';
    return `<table><thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th>Reference</th><th class="n">Amount</th></tr></thead><tbody>${payments.map(p =>
        `<tr><td style="font-family:monospace">${esc(p.receiptNumber)}</td><td>${esc(formatDate(p.createdAt))}</td><td>${esc(p.paymentMethod)}</td><td>${esc(p.reference || '—')}</td><td class="n green">${esc(money(p.amount))}</td></tr>`).join('')}</tbody></table>`;
}

export function installmentInvoiceHtml(inst: DocInstallment, course: DocCourse, ctx: DocContext) {
    const money = (v: number) => formatMoney(v, ctx.currency, 2);
    const f = invoiceFigures(inst);
    const dateNote = inst.scheduledDueDate && inst.scheduledDueDate !== inst.dueDate ? ` (was ${formatDate(inst.scheduledDueDate)})` : '';
    const body = `${studentGrid(ctx, course, `<div>${row('Installment', installmentLabel(inst, course))}</div><div>${row('Due date', formatDate(inst.dueDate) + dateNote)}</div>`)}
<table><thead><tr><th>Description</th><th class="n">Amount</th></tr></thead><tbody>
${f.lines.map((l, i) => `<tr><td>${i === 0 ? `<b>${esc(inst.designation)}</b><div class="muted">${esc(l.label)}</div>` : esc(l.label)}</td><td class="n">${l.amount < 0 ? '−' : ''}${esc(money(Math.abs(l.amount)))}</td></tr>`).join('')}
<tr class="t"><td>Installment total</td><td class="n">${esc(money(f.total))}</td></tr>
<tr><td>Amount received</td><td class="n green">${esc(money(f.paid))}</td></tr>
${f.movedToLater > 0 ? `<tr><td>Unpaid balance added to later installments</td><td class="n amber">${esc(money(f.movedToLater))}</td></tr>` : ''}
<tr class="t"><td>Balance due on this installment</td><td class="n ${f.balance > 0 ? 'red' : 'green'}">${esc(money(f.balance))}</td></tr></tbody></table>
<h3>Payments received</h3>${paymentsTable(f.payments, money)}
${f.awaiting > 0 ? `<div class="box due">${esc(money(f.awaiting))} submitted and awaiting verification. It is not counted as received.</div>` : ''}
${f.settled ? `<div class="box ok">${esc(f.statusLabel.toUpperCase())}</div>`
        : `<div class="box due"><b>${esc(f.statusLabel)}.</b> ${f.movedToLater > 0 ? `${esc(money(f.movedToLater))} was not paid on this installment and is included in the later ones. ` : ''}${f.balance > 0 ? `${esc(money(f.balance))} is due on ${esc(formatDate(inst.dueDate))}.` : ''}</div>`}
<div class="box"><div class="r"><span>Course fee</span><b>${esc(money(course.totalFee))}</b></div>${course.creditApplied > 0 ? `<div class="r"><span>Credit applied</span><b>−${esc(money(course.creditApplied))}</b></div>` : ''}
<div class="r"><span>Paid for this course to date</span><b class="green">${esc(money(course.paidAmount))}</b></div><div class="r"><span>Course balance</span><b>${esc(money(course.balanceAmount))}</b></div></div>`;
    return page(`Invoice ${inst.invoiceNumber}`, 'FEE INVOICE', inst.invoiceNumber, inst.issuedAt, ctx, body);
}

export function courseInvoiceHtml(course: DocCourse, ctx: DocContext) {
    const money = (v: number) => formatMoney(v, ctx.currency, 2);
    const settled = course.balanceAmount <= 0;
    const date = settledOn(course) ?? course.installments.at(-1)?.issuedAt ?? '';
    const rows = course.installments.map(i => {
        const f = invoiceFigures(i);
        return `<tr><td>${esc(i.installmentNumber)}</td><td><b>${esc(i.designation)}</b><div class="muted" style="font-family:monospace">${esc(i.invoiceNumber)}</div></td><td>${esc(formatDate(i.dueDate))}</td>
<td class="n">${esc(money(f.total))}</td><td class="n green">${esc(money(f.paid))}</td><td class="n">${f.movedToLater > 0 ? esc(money(f.movedToLater)) : '—'}</td><td>${esc(f.statusLabel)}</td></tr>`;
    }).join('');
    const payments = receivedPayments(course.installments.flatMap(i => i.payments));
    const body = `${studentGrid(ctx, course, '')}
<h3>Installments</h3><table><thead><tr><th>#</th><th>Installment</th><th>Due</th><th class="n">Total</th><th class="n">Received</th><th class="n">Moved to later</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
<h3>Payments received</h3>${paymentsTable(payments, money)}
<div class="box"><div class="r"><span>Course fee</span><b>${esc(money(course.totalFee))}</b></div>${course.creditApplied > 0 ? `<div class="r"><span>Credit applied</span><b>−${esc(money(course.creditApplied))}</b></div>` : ''}
<div class="r"><span>Total received</span><b class="green">${esc(money(course.paidAmount))}</b></div><div class="r"><span>Course balance</span><b class="${settled ? 'green' : 'red'}">${esc(money(course.balanceAmount))}</b></div></div>
${settled ? '<div class="box ok">COURSE FEE FULLY SETTLED</div>' : `<div class="box due">${esc(money(course.balanceAmount))} is outstanding for this course.</div>`}`;
    return page(`Course invoice — ${course.courseTitle}`, 'COURSE FEE INVOICE', `${course.courseCode} / ${ctx.studentCode}`, date, ctx, body);
}

export function receiptHtml(p: DocPayment & { designation: string; invoiceNumber?: string; courseTitle?: string }, ctx: DocContext) {
    const body = `<div class="grid"><div>${row('Student', ctx.studentName)}${row('Student ID', ctx.studentCode)}${row('Guardian', ctx.guardianName)}</div>
<div>${row('Payment for', p.designation)}${row('Invoice', p.invoiceNumber)}${row('Course', p.courseTitle)}</div>
<div>${row('Method', p.paymentMethod)}</div><div>${row('Reference', p.reference)}</div></div>
<div class="big">${esc(formatMoney(p.amount, ctx.currency, 2))} received</div>${p.recordedBy ? `<div class="muted">Recorded by ${esc(p.recordedBy)}</div>` : ''}`;
    return page(`Receipt ${p.receiptNumber}`, 'PAYMENT RECEIPT', p.receiptNumber, p.createdAt, ctx, body);
}

/** Opens the document for printing or saving as PDF; false when the browser blocked the window. */
export function printDocument(html: string): boolean {
    const w = window.open('', '_blank', 'width=820,height=960');
    if (!w) return false;
    w.document.write(html);
    w.document.close();
    return true;
}
