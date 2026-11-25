/** Downloadable PDF of one installment invoice, with the same figures as the preview and the printed document. */
import { formatDate } from '@/lib/api';
import { installmentLabel, invoiceFigures, type DocContext, type DocCourse, type DocInstallment } from '@/lib/fee-documents';

type Rgb = [number, number, number];
const PRIMARY: Rgb = [108, 99, 255], DARK: Rgb = [15, 23, 42], MUTED: Rgb = [100, 116, 139], LIGHT: Rgb = [248, 250, 252], BORDER: Rgb = [226, 232, 240];
const GREEN: Rgb = [4, 120, 87], RED: Rgb = [185, 28, 28], AMBER: Rgb = [180, 83, 9];

export async function downloadInvoicePdf(inst: DocInstallment, course: DocCourse, ctx: DocContext) {
    // UMD build: avoids Turbopack resolving the optional canvg / html2canvas dependencies
    // @ts-expect-error - jsPDF UMD bundle has no types
    const loaded = await import('jspdf/dist/jspdf.umd.min.js');
    const JsPdf = loaded.jsPDF ?? loaded.default?.jsPDF ?? loaded.default;
    if (!JsPdf) throw new Error('PDF generator library could not be loaded.');
    const doc = new JsPdf({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const W = 210, M = 16, R = W - M, BOTTOM = 270;
    const f = invoiceFigures(inst);
    // The built-in PDF font has no rupee sign
    const money = (v: number) => `${ctx.currency === 'INR' ? 'Rs. ' : `${ctx.currency} `}${(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const text = (value: string, x: number, y: number, opt: { size?: number; bold?: boolean; color?: Rgb; right?: boolean } = {}) => {
        doc.setFont('helvetica', opt.bold ? 'bold' : 'normal');
        doc.setFontSize(opt.size ?? 9);
        doc.setTextColor(...(opt.color ?? DARK));
        doc.text(value, x, y, opt.right ? { align: 'right' } : undefined);
    };
    const fit = (value: string, width: number, size = 9): string => {
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(value, width) as string[];
        return lines.length > 1 ? `${lines[0].slice(0, -1)}…` : lines[0] ?? '';
    };
    let y = 18;
    const need = (height: number) => { if (y + height > BOTTOM) { doc.addPage(); y = 20; } };

    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, W, 5, 'F');
    text(fit(ctx.academy.name, 110, 15), M, y, { size: 15, bold: true });
    text('FEE INVOICE', R, y, { size: 15, bold: true, color: PRIMARY, right: true });
    y += 6;
    const contact = [ctx.academy.phone, ctx.academy.email].filter(Boolean).join('  |  ');
    if (ctx.academy.address) text(fit(ctx.academy.address, 110, 8), M, y, { size: 8, color: MUTED });
    text(inst.invoiceNumber, R, y, { size: 10, bold: true, right: true });
    y += 5;
    if (contact) text(contact, M, y, { size: 8, color: MUTED });
    text(`Date: ${formatDate(inst.issuedAt)}`, R, y, { size: 8, color: MUTED, right: true });
    y += 6;
    doc.setDrawColor(...BORDER);
    doc.line(M, y, R, y);
    y += 6;

    const details: Array<[string, string]> = [
        ['Student', `${ctx.studentName} (${ctx.studentCode})`], ['Course', `${course.courseTitle} (${course.courseCode})`],
        ['Guardian', ctx.guardianName ?? '—'], ['Batch', course.batchName ?? '—'],
        ['Branch', course.branchName ?? ctx.branchName ?? '—'], ['Installment', installmentLabel(inst, course)],
        ['Due date', formatDate(inst.dueDate)], ['Status', f.statusLabel],
    ];
    doc.setFillColor(...LIGHT);
    doc.roundedRect(M, y, R - M, 34, 2, 2, 'F');
    details.forEach(([label, value], i) => {
        const x = M + 5 + (i % 2) * 90;
        const top = y + 7 + Math.floor(i / 2) * 7.5;
        text(label, x, top, { size: 8, color: MUTED });
        text(fit(value, 60, 9), x + 22, top, { bold: true });
    });
    y += 42;

    const line = (label: string, value: string, opt: { bold?: boolean; color?: Rgb; fill?: boolean } = {}) => {
        need(9);
        if (opt.fill) { doc.setFillColor(...LIGHT); doc.rect(M, y, R - M, 8, 'F'); }
        doc.setDrawColor(...BORDER);
        doc.rect(M, y, R - M, 8, 'S');
        text(fit(label, 120), M + 4, y + 5.4, { bold: opt.bold });
        text(value, R - 4, y + 5.4, { bold: true, color: opt.color, right: true });
        y += 8;
    };
    f.lines.forEach((l, i) => line(i === 0 ? inst.designation : l.label, `${l.amount < 0 ? '- ' : ''}${money(Math.abs(l.amount))}`));
    line('Installment total', money(f.total), { bold: true, fill: true });
    line('Amount received', money(f.paid), { color: GREEN });
    if (f.movedToLater > 0) line('Unpaid balance added to later installments', money(f.movedToLater), { color: AMBER });
    line('Balance due on this installment', money(f.balance), { bold: true, fill: true, color: f.balance > 0 ? RED : GREEN });
    y += 8;

    need(16);
    text('Payments received', M, y, { size: 10, bold: true, color: PRIMARY });
    y += 4;
    if (f.payments.length === 0) {
        text('No payment received yet.', M, y + 4, { color: MUTED });
        y += 8;
    } else {
        const columns = [M + 3, M + 52, M + 82, M + 112];
        doc.setFillColor(...LIGHT);
        doc.rect(M, y, R - M, 7, 'F');
        ['Receipt', 'Date', 'Method', 'Reference'].forEach((h, i) => text(h, columns[i], y + 4.8, { size: 7.5, bold: true, color: MUTED }));
        text('Amount', R - 4, y + 4.8, { size: 7.5, bold: true, color: MUTED, right: true });
        y += 7;
        for (const p of f.payments) {
            need(8);
            text(p.receiptNumber, columns[0], y + 5, { size: 8 });
            text(formatDate(p.createdAt), columns[1], y + 5, { size: 8 });
            text(fit(p.paymentMethod, 27, 8), columns[2], y + 5, { size: 8 });
            text(fit(p.reference || '—', 36, 8), columns[3], y + 5, { size: 8 });
            text(money(p.amount), R - 4, y + 5, { size: 8.5, bold: true, color: GREEN, right: true });
            doc.line(M, y + 7.5, R, y + 7.5);
            y += 7.5;
        }
    }
    if (f.awaiting > 0) {
        y += 5;
        text(`${money(f.awaiting)} is awaiting verification and is not counted as received.`, M, y, { size: 8.5, color: AMBER });
    }
    y += 8;

    need(34);
    const summary: Array<[string, string, Rgb?]> = [
        ['Course fee', money(course.totalFee)], ...(course.creditApplied > 0 ? [['Credit applied', `- ${money(course.creditApplied)}`] as [string, string]] : []),
        ['Paid for this course to date', money(course.paidAmount), GREEN], ['Course balance', money(course.balanceAmount), course.balanceAmount > 0 ? RED : GREEN],
    ];
    doc.setFillColor(...LIGHT);
    doc.roundedRect(W / 2, y, R - W / 2, summary.length * 6.5 + 4, 2, 2, 'F');
    summary.forEach(([label, value, color], i) => {
        text(label, W / 2 + 4, y + 6 + i * 6.5, { size: 8.5, color: MUTED });
        text(value, R - 4, y + 6 + i * 6.5, { bold: true, color, right: true });
    });

    doc.line(M, 279, R, 279);
    text(`Computer-generated document issued by ${fit(ctx.academy.name, 100, 7.5)}. No signature required.`, M, 284, { size: 7.5, color: MUTED });
    doc.save(`Invoice-${inst.invoiceNumber}.pdf`);
}
