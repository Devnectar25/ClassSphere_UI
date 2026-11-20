'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import BadgeList from '@/components/BadgeList';
import React, { useState } from 'react';
import { Search, CreditCard, CheckCircle, Clock, XCircle, AlertCircle, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, useApi, formatMoney, formatDate, initials } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';

interface PaymentTerm {
    paymentId: string;
    amount: number;
    paymentMethod: string;
    receiptNumber: string;
    createdAt: string;
}

interface Invoice {
    invoiceId: string;
    invoiceNumber: string;
    studentName: string;
    batches: string | null;
    designation: string;
    totalAmount: number;
    paidAmount?: number;
    balanceAmount: number;
    dueDate: string;
    status: 'paid' | 'pending' | 'overdue' | 'void' | 'partially_paid';
    paidOn: string | null;
    payments?: PaymentTerm[];
}

interface Ledger {
    invoices: Invoice[];
    summary: {
        billedThisMonth: number;
        billedThisMonthCount: number;
        billedTotal: number;
        collectedTotal: number;
        outstandingAmount: number;
        outstandingCount: number;
        overdueAmount: number;
        overdueCount: number;
    };
    aging: {
        current: number;
        days1To30: number;
        days31To60: number;
        days61Plus: number;
        totalOutstanding: number;
        counts: { current: number; days1To30: number; days31To60: number; days61Plus: number };
    };
}

const statusConfig: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    paid: { label: 'Paid', cls: 'badge-success', icon: CheckCircle },
    partially_paid: { label: 'Partially Paid', cls: 'badge-primary', icon: Clock },
    overdue: { label: 'Overdue', cls: 'badge-danger', icon: AlertCircle },
    pending: { label: 'Pending', cls: 'badge-warning', icon: Clock },
    void: { label: 'Voided', cls: 'badge-secondary', icon: XCircle },
};

const PAYMENT_METHODS = ['Cash', 'Cheque', 'UPI', 'Card', 'BankWire'];
const PAGE_SIZE = 7;

export default function InvoicesPage() {
    const session = useSession();
    const canCollect = can(session, 'billing.write');
    const { workspace, currency } = useWorkspace();
    const { data, error, reload } = useApi<Ledger>('/invoices');
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('pending');
    const [offset, setOffset] = useState(0);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [collecting, setCollecting] = useState<Invoice | null>(null);
    const [payment, setPayment] = useState({ amount: '', paymentMethod: 'Cash' });
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const money = (v: number) => formatMoney(v, currency);

    
    const downloadInvoice = async (inv: Invoice) => {
        const invId = inv.invoiceId || inv.invoiceNumber;
        setDownloadingId(invId);
        try {
            const jspdfModule = await import('jspdf');
            const jsPDFConstructor = jspdfModule.jsPDF || (jspdfModule as any).default?.jsPDF || jspdfModule.default;
            if (!jsPDFConstructor) {
                throw new Error('PDF generator library (jsPDF) could not be loaded.');
            }
            const doc = new jsPDFConstructor({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = 210;
            const margin = 16;
            const contentWidth = pageWidth - (margin * 2); // 178mm

            const orgName = workspace?.organization?.name || 'devnectar';
            const orgType = workspace?.organization?.academyType || 'Tuition Academy';
            const orgEmail = workspace?.organization?.settings?.email || 'dev@nectar.com';
            const orgPhone = workspace?.organization?.settings?.phone || '+91 98765 43210';
            const orgAddress = workspace?.organization?.settings?.address || 'Main Campus';

            const studentName = inv.studentName || 'Student';
            const invoiceNumber = inv.invoiceNumber || 'INV-0000';
            const feeDesignation = inv.designation || 'Tuition Fee';

            const paidAmt = Number(inv.paidAmount !== undefined ? inv.paidAmount : Math.max(0, inv.totalAmount - (inv.balanceAmount || 0)));
            const balanceAmt = Number(inv.balanceAmount || 0);
            const totalAmt = Number(inv.totalAmount || 0);

            const isPaid = inv.status === 'paid' || (balanceAmt === 0 && totalAmt > 0);
            const isOverdue = inv.status === 'overdue';
            const isPartiallyPaid = balanceAmt > 0 && paidAmt > 0;

            const fmtMoney = (v: number) => 'Rs. ' + Number(v || 0).toLocaleString('en-IN');
            const fmtDate = (d: string | null) => {
                if (!d) return '—';
                try {
                    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                } catch {
                    return String(d);
                }
            };

            const dueDateStr = fmtDate(inv.dueDate);
            const paidDateStr = inv.paidOn ? fmtDate(inv.paidOn) : (isPaid ? dueDateStr : '—');
            const totalFormatted = fmtMoney(totalAmt);
            const balanceFormatted = fmtMoney(balanceAmt);
            const paidFormatted = fmtMoney(paidAmt);

            // Cohesive Color Palette
            const primaryColor: [number, number, number] = [108, 99, 255]; // #6C63FF
            const darkText: [number, number, number] = [15, 23, 42]; // #0f172a
            const mutedText: [number, number, number] = [100, 116, 139]; // #64748b
            const lightBg: [number, number, number] = [248, 250, 252]; // #f8fafc
            const borderColor: [number, number, number] = [226, 232, 240]; // #e2e8f0

            const statusColor: [number, number, number] = isPaid ? [16, 185, 129] : isPartiallyPaid ? [99, 102, 241] : isOverdue ? [239, 68, 68] : [245, 158, 11];
            const statusBg: [number, number, number] = isPaid ? [220, 252, 231] : isPartiallyPaid ? [238, 242, 255] : isOverdue ? [254, 226, 226] : [254, 243, 199];
            const statusText: [number, number, number] = isPaid ? [22, 101, 52] : isPartiallyPaid ? [67, 56, 202] : isOverdue ? [153, 27, 27] : [146, 64, 14];
            const statusTitle = isPaid ? 'PAID IN FULL' : isPartiallyPaid ? 'PARTIALLY PAID' : isOverdue ? 'OVERDUE' : 'PENDING';

            // 1. Top Decorative Brand Bar
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, pageWidth, 5, 'F');

            // 2. Header Section
            let y = 16;

            // Org Logo Avatar
            doc.setFillColor(...primaryColor);
            doc.roundedRect(margin, y, 13, 13, 3, 3, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text(orgName.charAt(0) || 'C', margin + 3.8, y + 9.5);

            // Organization Info
            doc.setTextColor(...darkText);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13.5);
            doc.text(orgName, margin + 17, y + 4.5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...mutedText);
            doc.text(`${orgType} • ${orgEmail} • ${orgPhone}`, margin + 17, y + 9);
            doc.text(orgAddress, margin + 17, y + 13);

            // Right Header: Invoice Title & Status
            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(15);
            doc.text(isPaid ? 'RECEIPT & TAX INVOICE' : 'FEE STATEMENT & INVOICE', pageWidth - margin, y + 4, { align: 'right' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(...darkText);
            doc.text(invoiceNumber, pageWidth - margin, y + 9.5, { align: 'right' });

            // Status Pill
            const pillW = isPartiallyPaid ? 30 : isPaid ? 26 : 22;
            doc.setFillColor(...statusBg);
            doc.roundedRect(pageWidth - margin - pillW, y + 12, pillW, 6, 2, 2, 'F');
            doc.setTextColor(...statusText);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text(statusTitle, pageWidth - margin - (pillW / 2), y + 16.2, { align: 'center' });

            // Header Divider
            y = 35;
            doc.setDrawColor(...borderColor);
            doc.setLineWidth(0.4);
            doc.line(margin, y, pageWidth - margin, y);

            // 3. Information Cards: Billed To (Left) & Invoice Info (Right)
            y = 40;
            const cardWidth = (contentWidth - 6) / 2; // 86mm
            const cardHeight = 36;

            // Billed To Card
            doc.setFillColor(...lightBg);
            doc.roundedRect(margin, y, cardWidth, cardHeight, 3, 3, 'F');
            doc.setDrawColor(...borderColor);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, y, cardWidth, cardHeight, 3, 3, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...mutedText);
            doc.text('BILLED TO (STUDENT)', margin + 6, y + 6);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(...darkText);
            doc.text(studentName, margin + 6, y + 12);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...mutedText);
            const batchLine = inv.batches ? `Batch: ${inv.batches}` : 'Batch: General Enrollment';
            const batchLines = doc.splitTextToSize(batchLine, cardWidth - 12);
            doc.text(batchLines[0], margin + 6, y + 17.5);

            const feeLine = `Fee Structure: ${feeDesignation}`;
            const feeLines = doc.splitTextToSize(feeLine, cardWidth - 12);
            doc.text(feeLines[0], margin + 6, y + 22.5);
            if (feeLines[1]) {
                doc.text(feeLines[1], margin + 6, y + 27);
            }

            // Build Term Rows dynamically from payments or balances
            const paymentList = (inv.payments && inv.payments.length > 0) ? inv.payments : [];
            const termRows: Array<{
                term: string;
                date: string;
                mode: string;
                receipt: string;
                amount: number;
                status: 'PAID' | 'OVERDUE' | 'DUE' | 'UPCOMING';
            }> = [];

            if (paymentList.length > 0) {
                paymentList.forEach((p, idx) => {
                    termRows.push({
                        term: `Term ${idx + 1}`,
                        date: fmtDate(p.createdAt),
                        mode: p.paymentMethod || 'Online/Cash',
                        receipt: p.receiptNumber || '—',
                        amount: p.amount,
                        status: 'PAID'
                    });
                });

                if (balanceAmt > 0) {
                    termRows.push({
                        term: `Term ${paymentList.length + 1} (Balance)`,
                        date: dueDateStr,
                        mode: 'Pending Collection',
                        receipt: '—',
                        amount: balanceAmt,
                        status: isOverdue ? 'OVERDUE' : 'DUE'
                    });
                }
            } else if (paidAmt > 0 && balanceAmt > 0) {
                termRows.push({
                    term: 'Term 1 (First Installment)',
                    date: paidDateStr,
                    mode: 'Recorded Payment',
                    receipt: 'RCP-TERM-01',
                    amount: paidAmt,
                    status: 'PAID'
                });
                termRows.push({
                    term: 'Term 2 (Remaining Balance)',
                    date: dueDateStr,
                    mode: 'Pending Collection',
                    receipt: '—',
                    amount: balanceAmt,
                    status: isOverdue ? 'OVERDUE' : 'DUE'
                });
            } else if (isPaid) {
                termRows.push({
                    term: 'Term 1 (Full Settle)',
                    date: paidDateStr,
                    mode: 'Paid in Full',
                    receipt: 'RCP-PAID-FULL',
                    amount: totalAmt,
                    status: 'PAID'
                });
            } else {
                if (totalAmt > 600) {
                    const t1 = Math.round(totalAmt / 2);
                    termRows.push({
                        term: 'Term 1 (Installment 1 of 2)',
                        date: dueDateStr,
                        mode: 'Pending',
                        receipt: '—',
                        amount: t1,
                        status: isOverdue ? 'OVERDUE' : 'DUE'
                    });
                    termRows.push({
                        term: 'Term 2 (Installment 2 of 2)',
                        date: 'Subsequent Term',
                        mode: 'Scheduled',
                        receipt: '—',
                        amount: totalAmt - t1,
                        status: 'UPCOMING'
                    });
                } else {
                    termRows.push({
                        term: 'Term 1 (Single Settle)',
                        date: dueDateStr,
                        mode: 'Pending',
                        receipt: '—',
                        amount: totalAmt,
                        status: isOverdue ? 'OVERDUE' : 'DUE'
                    });
                }
            }

            // Invoice Info Card
            const rightCardX = margin + cardWidth + 6;
            doc.setFillColor(...lightBg);
            doc.roundedRect(rightCardX, y, cardWidth, cardHeight, 3, 3, 'F');
            doc.setDrawColor(...borderColor);
            doc.roundedRect(rightCardX, y, cardWidth, cardHeight, 3, 3, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...mutedText);
            doc.text('INVOICE INFORMATION', rightCardX + 6, y + 6);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...darkText);

            doc.text('Invoice Number: ', rightCardX + 6, y + 12);
            doc.setFont('helvetica', 'bold');
            doc.text(invoiceNumber, rightCardX + 32, y + 12);

            doc.setFont('helvetica', 'normal');
            doc.text('Due Date: ', rightCardX + 6, y + 17.5);
            doc.text(dueDateStr, rightCardX + 32, y + 17.5);

            const paidTermsCount = termRows.filter(r => r.status === 'PAID').length;
            doc.text('Payment Plan: ', rightCardX + 6, y + 23);
            doc.setTextColor(...statusColor);
            doc.setFont('helvetica', 'bold');
            doc.text(`${paidTermsCount} of ${termRows.length} Terms Settled`, rightCardX + 32, y + 23);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...darkText);
            doc.text('Payment Status: ', rightCardX + 6, y + 28.5);
            doc.setTextColor(...statusColor);
            doc.setFont('helvetica', 'bold');
            doc.text(statusTitle, rightCardX + 32, y + 28.5);

            // 4. Academic Program / Course Description Row
            y = 81;
            doc.setFillColor(...lightBg);
            doc.rect(margin, y, contentWidth, 7, 'F');
            doc.setDrawColor(...borderColor);
            doc.setLineWidth(0.3);
            doc.rect(margin, y, contentWidth, 7, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...mutedText);
            doc.text('ACADEMIC PROGRAM / FEE STRUCTURE', margin + 6, y + 4.8);
            doc.text('TOTAL COURSE FEE', pageWidth - margin - 6, y + 4.8, { align: 'right' });

            y += 7;
            const courseRowH = 14;
            doc.rect(margin, y, contentWidth, courseRowH, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...darkText);
            doc.text(feeDesignation, margin + 6, y + 5.5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...mutedText);
            doc.text(`${inv.batches || 'Enrolled Academic Program'} • Comprehensive Tuition & Studio Fee`, margin + 6, y + 10);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(...darkText);
            doc.text(totalFormatted, pageWidth - margin - 6, y + 7.5, { align: 'right' });

            // 5. Payment Terms & Installments Breakdown Table
            y += courseRowH + 8;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(...primaryColor);
            doc.text('PAYMENT TERMS & INSTALLMENTS BREAKDOWN', margin, y);
            y += 4;

            // Proportional column coordinates (Total width: 178mm, with 0 overlap)
            const cTerm = margin + 5;           // 21mm (Term Label)
            const cDate = margin + 46;          // 62mm (Date)
            const cMode = margin + 74;          // 90mm (Payment Mode)
            const cReceipt = margin + 102;      // 118mm (Receipt No.)
            const cAmountRight = margin + 152;  // 168mm (AMOUNT - RIGHT ALIGNED)
            const cStatusCenter = margin + 165; // 181mm (STATUS PILL - CENTERED)

            // Table Header
            doc.setFillColor(...lightBg);
            doc.rect(margin, y, contentWidth, 7, 'F');
            doc.setDrawColor(...borderColor);
            doc.rect(margin, y, contentWidth, 7, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...mutedText);

            doc.text('INSTALLMENT / TERM', cTerm, y + 4.8);
            doc.text('DATE', cDate, y + 4.8);
            doc.text('PAYMENT MODE', cMode, y + 4.8);
            doc.text('RECEIPT NO.', cReceipt, y + 4.8);
            doc.text('AMOUNT', cAmountRight, y + 4.8, { align: 'right' });
            doc.text('STATUS', cStatusCenter + 6, y + 4.8, { align: 'center' });

            y += 7;

            // Render Term Rows
            termRows.forEach((tr, i) => {
                const trHeight = 9;
                doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
                doc.rect(margin, y, contentWidth, trHeight, 'F');
                doc.setDrawColor(...borderColor);
                doc.rect(margin, y, contentWidth, trHeight, 'S');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(...darkText);
                doc.text(tr.term, cTerm, y + 5.8);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(...mutedText);
                doc.text(tr.date, cDate, y + 5.8);
                doc.text(tr.mode, cMode, y + 5.8);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(51, 65, 85);
                doc.text(tr.receipt, cReceipt, y + 5.8);

                // Amount: Cleanly right-aligned with 13mm buffer before status pill
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(...darkText);
                doc.text(fmtMoney(tr.amount), cAmountRight, y + 5.8, { align: 'right' });

                // Status pill badge centered in its dedicated space
                const tColor: [number, number, number] = tr.status === 'PAID' ? [16, 185, 129] : tr.status === 'OVERDUE' ? [239, 68, 68] : tr.status === 'DUE' ? [245, 158, 11] : [148, 163, 184];
                const tBg: [number, number, number] = tr.status === 'PAID' ? [220, 252, 231] : tr.status === 'OVERDUE' ? [254, 226, 226] : tr.status === 'DUE' ? [254, 243, 199] : [241, 245, 249];
                const tText: [number, number, number] = tr.status === 'PAID' ? [22, 101, 52] : tr.status === 'OVERDUE' ? [153, 27, 27] : tr.status === 'DUE' ? [146, 64, 14] : [71, 85, 105];

                const sPillW = 16;
                doc.setFillColor(...tBg);
                doc.roundedRect(cStatusCenter - 2, y + 2.2, sPillW, 4.8, 1.2, 1.2, 'F');
                doc.setTextColor(...tText);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.8);
                doc.text(tr.status, cStatusCenter + 6, y + 5.6, { align: 'center' });

                y += trHeight;
            });

            // 6. Summary Box (Right Aligned)
            y += 8;
            const summaryWidth = 84;
            const summaryX = pageWidth - margin - summaryWidth;

            doc.setFillColor(...lightBg);
            doc.roundedRect(summaryX, y, summaryWidth, 29, 2, 2, 'F');
            doc.setDrawColor(...borderColor);
            doc.roundedRect(summaryX, y, summaryWidth, 29, 2, 2, 'S');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...mutedText);
            doc.text('Total Course Fee:', summaryX + 6, y + 6.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...darkText);
            doc.text(totalFormatted, pageWidth - margin - 6, y + 6.5, { align: 'right' });

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...mutedText);
            doc.text('Total Paid Across Terms:', summaryX + 6, y + 13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 185, 129);
            doc.text(paidFormatted, pageWidth - margin - 6, y + 13, { align: 'right' });

            doc.setDrawColor(...borderColor);
            doc.line(summaryX + 6, y + 17.5, pageWidth - margin - 6, y + 17.5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...darkText);
            doc.text('Remaining Balance Due:', summaryX + 6, y + 24);
            doc.setTextColor(balanceAmt > 0 ? 239 : 16, balanceAmt > 0 ? 68 : 185, balanceAmt > 0 ? 68 : 129);
            doc.text(balanceFormatted, pageWidth - margin - 6, y + 24, { align: 'right' });

            // 7. Official Certification & Stamp Box (Properly Wrapped to Avoid Collision)
            y += 37;
            const certBoxH = 20;
            doc.setFillColor(...statusBg);
            doc.roundedRect(margin, y, contentWidth, certBoxH, 2.5, 2.5, 'F');
            doc.setDrawColor(...statusColor);
            doc.setLineWidth(0.4);
            doc.roundedRect(margin, y, contentWidth, certBoxH, 2.5, 2.5, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(...statusText);
            const certTitle = isPaid
                ? 'Official Payment Receipt & Full Settlement Certification'
                : isPartiallyPaid
                ? 'Official Partial Payment Statement & Term Receipt'
                : 'Official Fee Notice & Term Invoice';
            doc.text(certTitle, margin + 6, y + 6.5);

            // Text wrapping with max width so it NEVER collides with the right-hand stamp
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...statusText);
            const certDesc = isPaid
                ? `This document certifies that full fee settlement of ${totalFormatted} across all scheduled terms has been completed and verified.`
                : isPartiallyPaid
                ? `This document certifies payment of ${paidFormatted} received to date across terms. Balance of ${balanceFormatted} remains due for subsequent terms.`
                : `This document certifies fee billing of ${totalFormatted} (Balance Due: ${balanceFormatted}) for student ${studentName}.`;

            const maxTextWidth = contentWidth - 44; // leaves 44mm for stamp on the right
            const descLines = doc.splitTextToSize(certDesc, maxTextWidth);
            doc.text(descLines[0], margin + 6, y + 12);
            if (descLines[1]) {
                doc.text(descLines[1], margin + 6, y + 16);
            }

            // Stamp Badge on Right
            const stampW = isPartiallyPaid ? 30 : 24;
            doc.setFillColor(...statusColor);
            doc.roundedRect(pageWidth - margin - stampW - 5, y + 5.5, stampW, 9, 1.5, 1.5, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(255, 255, 255);
            doc.text(statusTitle, pageWidth - margin - 5 - (stampW / 2), y + 11.2, { align: 'center' });

            // 8. Footer
            y = 270;
            doc.setDrawColor(...borderColor);
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageWidth - margin, y);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...mutedText);
            doc.text(`Thank you for being part of ${orgName}. This is a computer-generated tax invoice and requires no physical signature.`, pageWidth / 2, y + 6, { align: 'center' });
            doc.text(`For accounts & payment inquiries, contact ${orgEmail} • ${orgPhone}`, pageWidth / 2, y + 10.5, { align: 'center' });

            // Robust multi-method download execution
            const fileName = `Invoice-${invoiceNumber}.pdf`;
            let downloaded = false;

            if (typeof window !== 'undefined' && window.URL && window.URL.createObjectURL) {
                try {
                    const blob = doc.output('blob');
                    const blobUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.style.display = 'none';
                    link.href = blobUrl;
                    link.setAttribute('download', fileName);
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => {
                        try {
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(blobUrl);
                        } catch {}
                    }, 1500);
                    downloaded = true;
                } catch (blobErr) {
                    console.warn('Direct blob anchor download failed, falling back to doc.save:', blobErr);
                }
            }

            if (!downloaded) {
                doc.save(fileName);
            }

            setNotice(`Invoice ${invoiceNumber} downloaded successfully.`);
        } catch (err) {
            console.error('Invoice download error:', err);
            const msg = (err as Error).message || 'Failed to generate and download invoice';
            setNotice(`Failed to download invoice: ${msg}`);
            if (typeof window !== 'undefined') {
                window.alert(`Could not download invoice: ${msg}`);
            }
        } finally {
            setDownloadingId(null);
        }
    };

    const generateCycle = async () => {
        if (!confirm('Generate this month\'s tuition invoices for all actively enrolled students?')) return;
        setBusy(true);
        try {
            const res = await api<{ invoicesGenerated: number; totalBilled: number }>('/invoices', {
                method: 'POST',
                headers: { 'Idempotency-Key': crypto.randomUUID() },
                body: JSON.stringify({ cycleDate: new Date().toISOString().split('T')[0] }),
            });
            setNotice(`${res.invoicesGenerated} invoices generated totalling ${money(res.totalBilled)}.`);
            reload();
        } catch (err) {
            setNotice((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const submitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!collecting) return;
        setBusy(true);
        try {
            const res = await api<{
                paymentId?: string;
                receiptNumber: string;
                amountPaid?: number;
                remainingBalance?: number;
                invoiceStatus?: string;
            }>('/payments', {
                method: 'POST',
                headers: { 'Idempotency-Key': crypto.randomUUID() },
                body: JSON.stringify({ invoiceId: collecting.invoiceId, amount: Number(payment.amount), paymentMethod: payment.paymentMethod }),
            });

            const paidAmt = Number(payment.amount);
            const newBal = Math.max(0, collecting.balanceAmount - paidAmt);
            const isFull = newBal === 0;

            const existingPayments = collecting.payments || [];
            const newPaymentEntry: PaymentTerm = {
                paymentId: res.paymentId || crypto.randomUUID(),
                amount: paidAmt,
                paymentMethod: payment.paymentMethod,
                receiptNumber: res.receiptNumber,
                createdAt: new Date().toISOString()
            };

            const updatedInv: Invoice = {
                ...collecting,
                status: isFull ? 'paid' : 'partially_paid',
                balanceAmount: newBal,
                paidAmount: (collecting.paidAmount || (collecting.totalAmount - collecting.balanceAmount)) + paidAmt,
                paidOn: new Date().toISOString(),
                payments: [...existingPayments, newPaymentEntry]
            };

            const termNo = existingPayments.length + 1;
            setNotice(`Payment of ${money(paidAmt)} recorded for ${collecting.invoiceNumber} (Term ${termNo}). Receipt ${res.receiptNumber}.`);
            setCollecting(null);
            reload();
            downloadInvoice(updatedInv);
        } catch (err) {
            setNotice((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const filtered = data?.invoices.filter(inv =>
        (activeTab === 'all' || inv.status === activeTab) &&
        (inv.studentName.toLowerCase().includes(search.toLowerCase()) ||
            inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()))
    ) ?? [];

    const total = filtered.length;
    const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
    const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
    const paginatedInvoices = filtered.slice(offset, offset + PAGE_SIZE);

    const getVisiblePages = (curr: number, totalPagesCount: number): (number | string)[] => {
        if (totalPagesCount <= 7) return Array.from({ length: totalPagesCount }, (_, i) => i + 1);
        const pages: (number | string)[] = [1];
        if (curr > 3) pages.push('...');
        const start = Math.max(2, curr - 1);
        const end = Math.min(totalPagesCount - 1, curr + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (curr < totalPagesCount - 2) pages.push('...');
        pages.push(totalPagesCount);
        return pages;
    };

    const summaryStats = data ? [
        { label: 'Billed This Month', value: money(data.summary.billedThisMonth), color: '#6C63FF', sub: `${data.summary.billedThisMonthCount} invoices` },
        { label: 'Collected (all time)', value: money(data.summary.collectedTotal), color: '#10B981', sub: `${data.summary.billedTotal > 0 ? Math.round((data.summary.collectedTotal / data.summary.billedTotal) * 100) : 0}% of billed` },
        { label: 'Outstanding', value: money(data.summary.outstandingAmount), color: '#F59E0B', sub: `${data.summary.outstandingCount} invoices` },
        { label: 'Overdue', value: money(data.summary.overdueAmount), color: '#EF4444', sub: `${data.summary.overdueCount} invoices` },
    ] : [];

    return (
        <>
            <Topbar title="Invoices & Dues" subtitle="View, collect, and manage all student fee invoices" />
            <div className="page-body">
                {notice && (
                    <div className="cs-card" style={{ padding: '12px 16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{notice}</span>
                        <button className="btn-ghost" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => setNotice(null)}>Dismiss</button>
                    </div>
                )}

                {!data ? <PageState error={error} /> : (
                    <>
                        {/* Summary row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            {summaryStats.map(s => (
                                <div key={s.label} className="cs-card" style={{ padding: '20px' }}>
                                    <div style={{ fontSize: '22px', fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>{s.value}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{s.label}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>{s.sub}</div>
                                </div>
                            ))}
                        </div>

                        {/* Main table */}
                        <div className="cs-card">
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--cs-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', borderRadius: '10px', padding: '8px 14px', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
                                        <Search size={15} color="var(--cs-text-muted)" />
                                        <input className="cs-input" placeholder="Search invoice or student..." style={{ background: 'none', border: 'none', padding: 0, boxShadow: 'none' }} value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }} />
                                    </div>

                                    <div className="tab-list">
                                        {['pending', 'paid', 'overdue', 'void', 'all'].map(tab => (
                                            <button key={tab} className={`tab-trigger${activeTab === tab ? ' active' : ''}`} onClick={() => { setActiveTab(tab); setOffset(0); }}>
                                                {tab === 'all' ? 'All' : statusConfig[tab].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table className="cs-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--cs-surface-2)' }}>
                                            <th style={{ width: '12%', padding: '10px 6px 10px 14px' }}>Invoice #</th>
                                            <th style={{ width: '14%', padding: '10px 6px' }}>Student</th>
                                            <th style={{ width: '17%', padding: '10px 6px' }}>Batch</th>
                                            <th style={{ width: '18%', padding: '10px 6px' }}>Fee Type</th>
                                            <th style={{ width: '9%', padding: '10px 6px' }}>Amount</th>
                                            <th style={{ width: '10%', padding: '10px 6px' }}>Due Date</th>
                                            <th style={{ width: '8%', padding: '10px 4px', textAlign: 'center' }}>Status</th>
                                            <th style={{ width: '12%', padding: '10px 8px', textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedInvoices.map(inv => {
                                            const sc = statusConfig[inv.status] || statusConfig.pending;
                                            const desig = inv.designation || 'Tuition Fee';
                                            const feeParts = desig.includes('—')
                                                ? desig.split('—').map(p => p.trim())
                                                : desig.includes('-')
                                                ? desig.split('-').map(p => p.trim())
                                                : [desig];

                                            return (
                                                <tr
                                                    key={inv.invoiceId}
                                                    onClick={(e) => { e.stopPropagation(); if (!downloadingId) downloadInvoice(inv); }}
                                                    style={{ cursor: 'pointer' }}
                                                    title={`Click any field to view / generate invoice for ${inv.studentName}`}
                                                >
                                                    <td style={{ padding: '9px 6px 9px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                        <code style={{ fontSize: '11px', background: 'var(--cs-surface-2)', padding: '2px 5px', borderRadius: '4px', color: '#8B85FF', display: 'inline-block', letterSpacing: '-0.02em' }}>
                                                            {inv.invoiceNumber}
                                                        </code>
                                                    </td>
                                                    <td style={{ padding: '9px 6px', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <div className="avatar-placeholder" style={{ width: 26, height: 26, fontSize: '10px', flexShrink: 0 }}>
                                                                {initials(inv.studentName)}
                                                            </div>
                                                            <span style={{ fontWeight: 600, fontSize: '12px', lineHeight: 1.25, whiteSpace: 'normal', wordBreak: 'normal', color: 'var(--cs-text-primary)' }}>
                                                                {inv.studentName}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '9px 6px', verticalAlign: 'middle' }}>
                                                        {!inv.batches ? (
                                                            <span style={{ color: 'var(--cs-text-muted)', fontSize: '11px' }}>—</span>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                                                {inv.batches.split(', ').map(b => (
                                                                    <span
                                                                        key={b}
                                                                        className="badge badge-primary"
                                                                        style={{
                                                                            display: 'inline-block',
                                                                            whiteSpace: 'normal',
                                                                            wordBreak: 'normal',
                                                                            lineHeight: 1.25,
                                                                            fontSize: '10.5px',
                                                                            padding: '2px 6px',
                                                                            height: 'auto',
                                                                            borderRadius: '5px',
                                                                            maxWidth: '100%'
                                                                        }}
                                                                    >
                                                                        {b}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '9px 6px', verticalAlign: 'middle' }}>
                                                        {feeParts.length > 1 ? (
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--cs-text-primary)', lineHeight: 1.25, whiteSpace: 'normal', wordBreak: 'normal' }}>
                                                                    {feeParts[0]}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px', lineHeight: 1.2, whiteSpace: 'normal', wordBreak: 'normal' }}>
                                                                    {feeParts.slice(1).join(' — ')}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', lineHeight: 1.3, whiteSpace: 'normal', wordBreak: 'normal' }}>
                                                                {inv.designation}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '9px 6px', verticalAlign: 'middle' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', color: inv.status === 'paid' ? '#10B981' : inv.status === 'overdue' ? '#EF4444' : 'var(--cs-text-primary)' }}>
                                                            {money(inv.totalAmount)}
                                                        </div>
                                                        {inv.balanceAmount > 0 && inv.balanceAmount < inv.totalAmount && (
                                                            <div style={{ fontSize: '10.5px', color: 'var(--cs-text-muted)', whiteSpace: 'nowrap', marginTop: '1px' }}>
                                                                Balance {money(inv.balanceAmount)}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap', fontSize: '11.5px', color: 'var(--cs-text-muted)' }}>
                                                        <div>{formatDate(inv.dueDate)}</div>
                                                        {inv.paidOn && inv.status === 'paid' && (
                                                            <div style={{ color: '#10B981', fontSize: '10.5px', marginTop: '1px' }}>
                                                                Paid: {formatDate(inv.paidOn)}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '9px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                        <span className={`badge ${sc.cls}`} style={{ display: 'inline-flex', padding: '2px 7px', fontSize: '10.5px' }}>
                                                            <sc.icon size={10} /> {sc.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '9px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {canCollect && inv.balanceAmount > 0 ? (
                                                                <button
                                                                    type="button"
                                                                    className="btn-primary cell-nowrap"
                                                                    style={{
                                                                        padding: '4px 12px',
                                                                        height: '28px',
                                                                        minWidth: '82px',
                                                                        fontSize: '11.5px',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '4px',
                                                                        borderRadius: '6px'
                                                                    }}
                                                                    onClick={(e) => { e.stopPropagation(); setCollecting(inv); setPayment({ amount: String(inv.balanceAmount), paymentMethod: 'Cash' }); }}
                                                                    title={`Collect payment for ${inv.studentName}`}
                                                                >
                                                                    <CreditCard size={11} /> Collect
                                                                </button>
                                                            ) : (() => {
                                                                const isDownloading = downloadingId === (inv.invoiceId || inv.invoiceNumber);
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        className="btn-primary cell-nowrap"
                                                                        disabled={isDownloading}
                                                                        style={{
                                                                            padding: '4px 12px',
                                                                            height: '28px',
                                                                            minWidth: '82px',
                                                                            fontSize: '11.5px',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            gap: '4px',
                                                                            borderRadius: '6px',
                                                                            opacity: isDownloading ? 0.75 : 1,
                                                                            cursor: isDownloading ? 'wait' : 'pointer'
                                                                        }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (!isDownloading) downloadInvoice(inv);
                                                                        }}
                                                                        title={`Download Invoice ${inv.invoiceNumber}`}
                                                                    >
                                                                        {isDownloading ? (
                                                                            <>
                                                                                <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Download size={11} /> Invoice
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })()}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>
                                    Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + paginatedInvoices.length, total)} of {total} invoices (7 per page)
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            border: '1px solid var(--cs-border)',
                                            borderRadius: '8px',
                                            cursor: offset === 0 ? 'not-allowed' : 'pointer',
                                            opacity: offset === 0 ? 0.4 : 1
                                        }}
                                        disabled={offset === 0}
                                        onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                                    >
                                        <ChevronLeft size={16} /> Previous
                                    </button>

                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        {getVisiblePages(currentPage, totalPages).map((p, idx) => {
                                            if (p === '...') {
                                                return <span key={`ellipsis-${idx}`} style={{ padding: '0 6px', color: 'var(--cs-text-muted)', fontSize: '13px' }}>...</span>;
                                            }
                                            const pageNum = Number(p);
                                            const isCurrent = pageNum === currentPage;
                                            return (
                                                <button
                                                    key={pageNum}
                                                    type="button"
                                                    onClick={() => setOffset((pageNum - 1) * PAGE_SIZE)}
                                                    style={{
                                                        minWidth: '32px',
                                                        height: '32px',
                                                        padding: '0 8px',
                                                        borderRadius: '8px',
                                                        fontSize: '13px',
                                                        fontWeight: isCurrent ? 700 : 500,
                                                        cursor: 'pointer',
                                                        border: '1px solid',
                                                        background: isCurrent ? 'var(--cs-primary, #6C63FF)' : 'transparent',
                                                        borderColor: isCurrent ? 'var(--cs-primary, #6C63FF)' : 'var(--cs-border)',
                                                        color: isCurrent ? '#ffffff' : 'var(--cs-text-secondary)',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            border: '1px solid var(--cs-border)',
                                            borderRadius: '8px',
                                            cursor: offset + PAGE_SIZE >= total ? 'not-allowed' : 'pointer',
                                            opacity: offset + PAGE_SIZE >= total ? 0.4 : 1
                                        }}
                                        disabled={offset + PAGE_SIZE >= total}
                                        onClick={() => setOffset(offset + PAGE_SIZE)}
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {collecting && (
                <Modal title={`Collect Term Payment — ${collecting.invoiceNumber}`} onClose={() => setCollecting(null)}>
                    <form onSubmit={submitPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', background: 'var(--cs-surface-2)', padding: '10px 12px', borderRadius: '8px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--cs-text-primary)' }}>{collecting.studentName}</div>
                            <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>
                                Total Fee: {money(collecting.totalAmount)} • Outstanding Balance: <strong style={{ color: '#EF4444' }}>{money(collecting.balanceAmount)}</strong>
                            </div>
                            {collecting.payments && collecting.payments.length > 0 && (
                                <div style={{ fontSize: '11.5px', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>
                                    ✓ {collecting.payments.length} Term(s) already paid ({money(collecting.totalAmount - collecting.balanceAmount)})
                                </div>
                            )}
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label className="cs-label" style={{ margin: 0 }}>Installment / Term Amount</label>
                                <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>Quick split:</span>
                            </div>

                            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--cs-border)' }}
                                    onClick={() => setPayment({ ...payment, amount: String(collecting.balanceAmount) })}
                                >
                                    Full Balance ({money(collecting.balanceAmount)})
                                </button>
                                {collecting.balanceAmount > 100 && (
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--cs-border)' }}
                                        onClick={() => setPayment({ ...payment, amount: String(Math.round(collecting.balanceAmount / 2)) })}
                                    >
                                        2 Terms ({money(Math.round(collecting.balanceAmount / 2))})
                                    </button>
                                )}
                                {collecting.balanceAmount > 300 && (
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--cs-border)' }}
                                        onClick={() => setPayment({ ...payment, amount: String(Math.round(collecting.balanceAmount / 3)) })}
                                    >
                                        3 Terms ({money(Math.round(collecting.balanceAmount / 3))})
                                    </button>
                                )}
                            </div>

                            <input className="cs-input" type="number" min="0.01" step="0.01" max={collecting.balanceAmount} required
                                value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} />
                        </div>

                        <div>
                            <label className="cs-label">Payment Method</label>
                            <select className="cs-input" value={payment.paymentMethod} onChange={e => setPayment({ ...payment, paymentMethod: e.target.value })}>
                                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                            <span style={{ fontSize: '11.5px', color: 'var(--cs-text-muted)' }}>
                                Paying Term {((collecting.payments?.length || 0) + 1)} • Receipt & invoice will download automatically
                            </span>
                            <button className="btn-primary" type="submit" disabled={busy}>
                                {busy ? 'Recording…' : 'Record Term Payment'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
