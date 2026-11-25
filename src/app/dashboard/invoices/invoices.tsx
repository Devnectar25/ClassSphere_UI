'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import BadgeList from '@/components/BadgeList';
import React, { useState } from 'react';
import { Search, CreditCard, CheckCircle, Clock, XCircle, AlertCircle, Download, Loader2, ChevronLeft, ChevronRight, Plus, FileText } from 'lucide-react';
import { api, useApi, formatMoney, formatDate, initials } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';
import { downloadInvoicePdf } from '@/lib/invoice-pdf';
import type { DocAcademy, DocCourse } from '@/lib/fee-documents';

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
    studentId: string;
    studentName: string;
    batches: string | null;
    designation: string;
    totalAmount: number;
    paidAmount?: number;
    balanceAmount: number;
    dueDate: string;
    status: 'paid' | 'pending' | 'overdue' | 'void' | 'partially_paid' | 'waived';
    overdue_status?: 'upcoming' | 'due' | 'in_grace' | 'overdue' | 'paid' | 'waived' | 'cancelled';
    late_fee_amount?: number;
    days_overdue?: number;
    waived_reason?: string | null;
    waived_at?: string | null;
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
    in_grace: { label: 'In Grace', cls: 'badge-warning', icon: Clock },
    waived: { label: 'Waived', cls: 'badge-secondary', icon: CheckCircle },
    pending: { label: 'Pending', cls: 'badge-warning', icon: Clock },
    void: { label: 'Voided', cls: 'badge-secondary', icon: XCircle },
};

const PAYMENT_METHODS = ['Cash', 'Cheque', 'UPI', 'Card', 'BankWire'];
const PAGE_SIZE = 7;

export default function InvoicesPage() {
    const session = useSession();
    const canCollect = can(session, 'billing.write');
    const { currency } = useWorkspace();
    const { data, error, reload } = useApi<Ledger>('/invoices');
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('pending');
    const [offset, setOffset] = useState(0);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [collecting, setCollecting] = useState<Invoice | null>(null);
    const [payment, setPayment] = useState({ amount: '', paymentMethod: 'Cash' });
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Waive Late Fee Dialog state
    const [waivingInvoice, setWaivingInvoice] = useState<Invoice | null>(null);
    const [waiveReason, setWaiveReason] = useState('');
    const [waiveError, setWaiveError] = useState<string | null>(null);
    const [waiving, setWaiving] = useState(false);

    const money = (v: number) => formatMoney(v, currency);

    const handleWaiveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!waivingInvoice) return;
        if (!waiveReason.trim()) {
            setWaiveError('Please enter a reason for waiving the late fee.');
            return;
        }
        setWaiving(true);
        setWaiveError(null);
        try {
            await api('/billing/invoices/waive-late-fee', {
                method: 'POST',
                body: JSON.stringify({
                    invoiceId: waivingInvoice.invoiceId,
                    reason: waiveReason.trim(),
                }),
            });
            setNotice(`Late fee for Invoice ${waivingInvoice.invoiceNumber} has been waived.`);
            setWaivingInvoice(null);
            setWaiveReason('');
            reload();
        } catch (err) {
            setWaiveError((err as Error).message);
        } finally {
            setWaiving(false);
        }
    };

    
    const downloadInvoice = async (inv: Invoice) => {
        const invId = inv.invoiceId || inv.invoiceNumber;
        setDownloadingId(invId);
        try {
            // The PDF is built from the student's billing record, like the Finance and Guardian invoices
            const record = await api<{
                academy: DocAcademy; courses: DocCourse[]; guardians: Array<{ fullName: string }>;
                student: { fullName: string; enrollmentNumber: string; branchName: string | null };
            }>(`/payments?studentId=${encodeURIComponent(inv.studentId)}`);
            const course = record.courses.find(c => c.installments.some(i => i.invoiceId === inv.invoiceId));
            const installment = course?.installments.find(i => i.invoiceId === inv.invoiceId);
            if (!course || !installment) throw new Error('This invoice is void or no longer part of the billing record.');
            await downloadInvoicePdf(installment, course, {
                academy: record.academy, studentName: record.student.fullName, studentCode: record.student.enrollmentNumber,
                branchName: record.student.branchName, guardianName: record.guardians[0]?.fullName ?? null, currency,
            });
            setNotice(`Invoice ${inv.invoiceNumber} downloaded successfully.`);
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
            const res = await api<{ message: string }>('/payments', {
                method: 'POST',
                headers: { 'Idempotency-Key': crypto.randomUUID() },
                body: JSON.stringify({ invoiceId: collecting.invoiceId, amount: Number(payment.amount), paymentMethod: payment.paymentMethod }),
            });
            setNotice(`${collecting.invoiceNumber}: ${res.message}`);
            setCollecting(null);
            reload();
        } catch (err) {
            setNotice((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const filtered = data?.invoices.filter(inv => {
        const matchesSearch = inv.studentName.toLowerCase().includes(search.toLowerCase()) ||
            inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;
        if (activeTab === 'all') return true;
        if (activeTab === 'overdue') {
            return inv.status === 'overdue' || inv.overdue_status === 'overdue' || inv.overdue_status === 'in_grace' || inv.overdue_status === 'waived';
        }
        return inv.status === activeTab;
    }) ?? [];

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
        {
            label: 'Billed This Month',
            value: money(data.summary.billedThisMonth),
            color: 'var(--cs-primary)',
            bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)',
            border: 'rgba(99, 102, 241, 0.25)',
            icon: CreditCard,
            sub: `${data.summary.billedThisMonthCount} invoices`
        },
        {
            label: 'Collected (all time)',
            value: money(data.summary.collectedTotal),
            color: '#10B981',
            bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
            border: 'rgba(16, 185, 129, 0.25)',
            icon: CheckCircle,
            sub: `${data.summary.billedTotal > 0 ? Math.round((data.summary.collectedTotal / data.summary.billedTotal) * 100) : 0}% of billed`
        },
        {
            label: 'Outstanding',
            value: money(data.summary.outstandingAmount),
            color: '#F59E0B',
            bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
            border: 'rgba(245, 158, 11, 0.25)',
            icon: Clock,
            sub: `${data.summary.outstandingCount} invoices`
        },
        {
            label: 'Overdue',
            value: money(data.summary.overdueAmount),
            color: '#EF4444',
            bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
            border: 'rgba(239, 68, 68, 0.25)',
            icon: AlertCircle,
            sub: `${data.summary.overdueCount} invoices`
        },
    ] : [];

    return (
        <>
            <Topbar title="Invoices & Dues" subtitle="View, collect, and manage all student fee invoices" />
            <div className="page-body">
                {notice && (
                    <div style={{
                        padding: '14px 18px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '20px',
                        background: 'var(--cs-surface)',
                        border: '1px solid var(--cs-border)',
                        borderRadius: '12px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle size={15} color="#10B981" />
                            <span style={{ fontWeight: 600, color: 'var(--cs-text-primary)' }}>{notice}</span>
                        </div>
                        <button className="btn-ghost" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => setNotice(null)}>Dismiss</button>
                    </div>
                )}

                {!data ? <PageState error={error} /> : (
                    <>
                        {/* Summary row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '22px' }}>
                            {summaryStats.map(s => {
                                const Icon = s.icon;
                                return (
                                    <div
                                        key={s.label}
                                        className="cs-card"
                                        style={{
                                            borderRadius: '16px',
                                            background: 'var(--cs-surface)',
                                            border: '1px solid var(--cs-border)',
                                            padding: '18px 20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                                        }}
                                    >
                                        <div style={{
                                            width: '46px',
                                            height: '46px',
                                            borderRadius: '12px',
                                            background: s.bg,
                                            border: `1px solid ${s.border}`,
                                            color: s.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <Icon size={22} color={s.color} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '24px', fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                                {s.value}
                                            </div>
                                            <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', fontWeight: 600, marginTop: '4px' }}>{s.label}</div>
                                            <div style={{ fontSize: '11.5px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>{s.sub}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Overdue Banner when in Overdue tab */}
                        {activeTab === 'overdue' && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '16px',
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '12px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#EF4444'
                                    }}>
                                        <AlertCircle size={22} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '16px', color: '#EF4444' }}>
                                            Total Overdue: {money(filtered.reduce((acc, i) => acc + (i.balanceAmount || 0), 0))}
                                        </div>
                                        <div style={{ fontSize: '12.5px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>
                                            {filtered.length} overdue invoice(s) • {money(filtered.reduce((acc, i) => acc + (i.late_fee_amount || 0), 0))} in assessed late fees
                                        </div>
                                    </div>
                                </div>
                                {canCollect && (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ fontSize: '12.5px', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#EF4444' }}
                                        onClick={async () => {
                                            try {
                                                setBusy(true);
                                                await api('/billing/overdue/recalculate', { method: 'POST' });
                                                setNotice('Overdue recalculation executed successfully.');
                                                reload();
                                            } catch (err) {
                                                setNotice((err as Error).message);
                                            } finally {
                                                setBusy(false);
                                            }
                                        }}
                                        disabled={busy}
                                    >
                                        Recalculate Late Fees
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Main table card */}
                        <div className="cs-card" style={{
                            borderRadius: '16px',
                            border: '1px solid var(--cs-border)',
                            background: 'var(--cs-surface)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            overflow: 'hidden'
                        }}>
                            {/* Toolbar */}
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--cs-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                                        {/* Search Input */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            background: 'var(--cs-surface-2)',
                                            border: '1px solid var(--cs-border)',
                                            borderRadius: '10px',
                                            padding: '0 12px',
                                            width: '280px',
                                            height: '38px',
                                            boxSizing: 'border-box'
                                        }}>
                                            <Search size={15} color="var(--cs-text-muted)" style={{ flexShrink: 0 }} />
                                            <input
                                                className="cs-input"
                                                placeholder="Search invoice or student..."
                                                style={{ background: 'none', border: 'none', padding: 0, boxShadow: 'none', fontSize: '13px', width: '100%' }}
                                                value={search}
                                                onChange={e => { setSearch(e.target.value); setOffset(0); }}
                                            />
                                            {search && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setSearch(''); setOffset(0); }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-text-muted)', padding: '2px', display: 'flex' }}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>

                                        {/* Status Filter Tabs */}
                                        <div style={{ display: 'inline-flex', background: 'var(--cs-surface-2)', padding: '3px', borderRadius: '10px', border: '1px solid var(--cs-border)', gap: '3px' }}>
                                            {['all', 'pending', 'paid', 'overdue', 'void'].map(tab => {
                                                const isActive = activeTab === tab;
                                                const label = tab === 'all' ? 'All' : statusConfig[tab]?.label || tab;
                                                return (
                                                    <button
                                                        key={tab}
                                                        type="button"
                                                        onClick={() => { setActiveTab(tab); setOffset(0); }}
                                                        style={{
                                                            padding: '6px 14px',
                                                            fontSize: '12.5px',
                                                            fontWeight: isActive ? 700 : 500,
                                                            borderRadius: '7px',
                                                            border: 'none',
                                                            background: isActive ? 'var(--cs-surface)' : 'transparent',
                                                            color: isActive ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                                            boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Action button */}
                                    {canCollect && (
                                        <button
                                            type="button"
                                            onClick={generateCycle}
                                            disabled={busy}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                padding: '0 16px',
                                                height: '38px',
                                                borderRadius: '10px',
                                                border: 'none',
                                                background: 'linear-gradient(135deg, var(--cs-primary) 0%, #6366f1 100%)',
                                                color: '#ffffff',
                                                cursor: busy ? 'wait' : 'pointer',
                                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                                                transition: 'all 0.15s ease',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <Plus size={15} /> Generate Invoices
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table className="cs-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--cs-surface-2)', borderBottom: '1px solid var(--cs-border)' }}>
                                            <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Invoice #</th>
                                            <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Student</th>
                                            <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Batch</th>
                                            <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Fee Type</th>
                                            <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Amount</th>
                                            <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Due Date</th>
                                            <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Status</th>
                                            <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedInvoices.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--cs-text-muted)' }}>
                                                    <FileText size={36} style={{ opacity: 0.35, marginBottom: '10px' }} />
                                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cs-text-secondary)' }}>No invoices found</div>
                                                    <div style={{ fontSize: '12.5px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>
                                                        {search ? 'Try clearing your search query' : 'There are no invoices in this category'}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedInvoices.map(inv => {
                                                const sc = statusConfig[inv.status] || statusConfig.pending;
                                                const desig = inv.designation || 'Tuition Fee';
                                                const feeParts = desig.includes('—')
                                                    ? desig.split('—').map(p => p.trim())
                                                    : desig.includes('-')
                                                    ? desig.split('-').map(p => p.trim())
                                                    : [desig];

                                                return (
                                                    <tr key={inv.invoiceId} style={{ borderBottom: '1px solid var(--cs-border)' }}>
                                                        <td style={{ padding: '16px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                            <code style={{
                                                                fontSize: '12px',
                                                                fontFamily: 'monospace',
                                                                fontWeight: 600,
                                                                background: 'rgba(99, 102, 241, 0.08)',
                                                                color: 'var(--cs-primary)',
                                                                border: '1px solid rgba(99, 102, 241, 0.18)',
                                                                padding: '4px 9px',
                                                                borderRadius: '6px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '5px',
                                                                letterSpacing: '-0.01em'
                                                            }}>
                                                                <FileText size={12} color="var(--cs-primary)" />
                                                                {inv.invoiceNumber}
                                                            </code>
                                                        </td>
                                                        <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{
                                                                    width: 34,
                                                                    height: 34,
                                                                    borderRadius: '50%',
                                                                    background: 'linear-gradient(135deg, var(--cs-primary) 0%, #4338ca 100%)',
                                                                    color: '#ffffff',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 700,
                                                                    flexShrink: 0,
                                                                    boxShadow: '0 2px 5px rgba(99, 102, 241, 0.2)'
                                                                }}>
                                                                    {initials(inv.studentName)}
                                                                </div>
                                                                <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--cs-text-primary)' }}>
                                                                    {inv.studentName}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                                                            {!inv.batches ? (
                                                                <span style={{ color: 'var(--cs-text-muted)', fontSize: '13px' }}>—</span>
                                                            ) : (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                                    {Array.from(new Set(inv.batches.split(/,\s*/).map(b => b.trim()).filter(Boolean))).map((b, idx) => (
                                                                        <span
                                                                            key={`${b}-${idx}`}
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                fontSize: '11.5px',
                                                                                fontWeight: 600,
                                                                                padding: '3px 8px',
                                                                                borderRadius: '6px',
                                                                                background: 'rgba(99, 102, 241, 0.08)',
                                                                                color: 'var(--cs-primary)',
                                                                                border: '1px solid rgba(99, 102, 241, 0.15)'
                                                                            }}
                                                                        >
                                                                            {b}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                                                            {feeParts.length > 1 ? (
                                                                <div>
                                                                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--cs-text-primary)' }}>
                                                                        {feeParts[0]}
                                                                    </div>
                                                                    <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                                                                        {feeParts.slice(1).join(' — ')}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ fontSize: '13px', color: 'var(--cs-text-primary)', fontWeight: 600 }}>
                                                                    {inv.designation}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                                                            <div style={{
                                                                fontSize: '14.5px',
                                                                fontWeight: 800,
                                                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                                color: inv.status === 'paid' ? '#059669' : inv.status === 'overdue' ? '#DC2626' : 'var(--cs-text-primary)'
                                                            }}>
                                                                {money(inv.totalAmount)}
                                                            </div>
                                                            {Number(inv.late_fee_amount || 0) > 0 && (
                                                                <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, marginTop: '2px' }}>
                                                                    + {money(inv.late_fee_amount || 0)} late fee
                                                                </div>
                                                            )}
                                                            {inv.balanceAmount > 0 && inv.balanceAmount < (inv.totalAmount + Number(inv.late_fee_amount || 0)) && (
                                                                <div style={{ fontSize: '11.5px', color: 'var(--cs-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                                                                    Bal: {money(inv.balanceAmount)}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '16px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--cs-text-secondary)' }}>
                                                                {formatDate(inv.dueDate)}
                                                            </div>
                                                            {inv.paidOn && inv.status === 'paid' && (
                                                                <div style={{ color: '#059669', fontSize: '11.5px', fontWeight: 600, marginTop: '2px' }}>
                                                                    Paid: {formatDate(inv.paidOn)}
                                                                </div>
                                                            )}
                                                            {Number(inv.days_overdue || 0) > 0 && inv.status !== 'paid' && (
                                                                <div style={{ color: '#DC2626', fontWeight: 700, fontSize: '11px', marginTop: '2px' }}>
                                                                    {inv.days_overdue} days overdue
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '16px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                            {inv.overdue_status === 'waived' ? (
                                                                <span style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '5px',
                                                                    background: 'var(--cs-surface-2)',
                                                                    color: 'var(--cs-text-muted)',
                                                                    border: '1px solid var(--cs-border)',
                                                                    borderRadius: '12px',
                                                                    padding: '3px 10px',
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 500
                                                                }} title={inv.waived_reason ? `Waived: ${inv.waived_reason}` : 'Late fee waived'}>
                                                                    <CheckCircle size={11} /> Waived
                                                                </span>
                                                            ) : inv.overdue_status === 'in_grace' ? (
                                                                <span style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '5px',
                                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                                    color: '#D97706',
                                                                    border: '1px solid rgba(245, 158, 11, 0.25)',
                                                                    borderRadius: '12px',
                                                                    padding: '3px 10px',
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 600
                                                                }}>
                                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }} />
                                                                    In Grace
                                                                </span>
                                                            ) : inv.status === 'paid' ? (
                                                                <span style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '5px',
                                                                    background: 'rgba(16, 185, 129, 0.08)',
                                                                    color: '#059669',
                                                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                                                    borderRadius: '12px',
                                                                    padding: '3px 10px',
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 600
                                                                }}>
                                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                                                                    Paid
                                                                </span>
                                                            ) : inv.status === 'overdue' ? (
                                                                <span style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '5px',
                                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                                    color: '#DC2626',
                                                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                                                    borderRadius: '12px',
                                                                    padding: '3px 10px',
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 600
                                                                }}>
                                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626' }} />
                                                                    Overdue
                                                                </span>
                                                            ) : (
                                                                <span style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '5px',
                                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                                    color: '#D97706',
                                                                    border: '1px solid rgba(245, 158, 11, 0.25)',
                                                                    borderRadius: '12px',
                                                                    padding: '3px 10px',
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 600
                                                                }}>
                                                                    <Clock size={11} /> {sc.label}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '16px 20px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                                {canCollect && Number(inv.late_fee_amount || 0) > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        style={{
                                                                            padding: '0 10px',
                                                                            height: '32px',
                                                                            fontSize: '11.5px',
                                                                            fontWeight: 600,
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px',
                                                                            borderRadius: '8px',
                                                                            color: '#DC2626',
                                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                            background: 'rgba(239, 68, 68, 0.05)',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.15s ease'
                                                                        }}
                                                                        onClick={() => {
                                                                            setWaivingInvoice(inv);
                                                                            setWaiveReason('');
                                                                            setWaiveError(null);
                                                                        }}
                                                                        title={`Waive late fee of ${money(inv.late_fee_amount || 0)}`}
                                                                    >
                                                                        Waive
                                                                    </button>
                                                                )}

                                                                {canCollect && inv.balanceAmount > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        style={{
                                                                            padding: '0 12px',
                                                                            height: '32px',
                                                                            fontSize: '12px',
                                                                            fontWeight: 600,
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '5px',
                                                                            borderRadius: '8px',
                                                                            border: 'none',
                                                                            background: 'linear-gradient(135deg, var(--cs-primary) 0%, #6366f1 100%)',
                                                                            color: '#ffffff',
                                                                            boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.15s ease'
                                                                        }}
                                                                        onClick={() => { setCollecting(inv); setPayment({ amount: String(inv.balanceAmount), paymentMethod: 'Cash' }); }}
                                                                        title={`Collect payment for ${inv.studentName}`}
                                                                    >
                                                                        <CreditCard size={13} /> Collect
                                                                    </button>
                                                                )}

                                                                {(() => {
                                                                    const isDownloading = downloadingId === (inv.invoiceId || inv.invoiceNumber);
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            disabled={isDownloading}
                                                                            style={{
                                                                                padding: '0 12px',
                                                                                height: '32px',
                                                                                fontSize: '12px',
                                                                                fontWeight: 600,
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '5px',
                                                                                borderRadius: '8px',
                                                                                border: '1px solid var(--cs-border)',
                                                                                background: 'var(--cs-surface-2)',
                                                                                color: 'var(--cs-primary)',
                                                                                cursor: isDownloading ? 'wait' : 'pointer',
                                                                                transition: 'all 0.15s ease'
                                                                            }}
                                                                            onMouseEnter={e => {
                                                                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                                                                                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                                                                            }}
                                                                            onMouseLeave={e => {
                                                                                e.currentTarget.style.background = 'var(--cs-surface-2)';
                                                                                e.currentTarget.style.borderColor = 'var(--cs-border)';
                                                                            }}
                                                                            onClick={() => {
                                                                                if (!isDownloading) downloadInvoice(inv);
                                                                            }}
                                                                            title={`Download Invoice ${inv.invoiceNumber}`}
                                                                        >
                                                                            {isDownloading ? (
                                                                                <>
                                                                                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Download size={13} /> Invoice
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination footer */}
                            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'var(--cs-surface)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--cs-text-muted)', fontWeight: 500 }}>
                                    Showing <strong style={{ color: 'var(--cs-text-primary)', fontWeight: 700 }}>{total === 0 ? 0 : offset + 1}–{Math.min(offset + paginatedInvoices.length, total)}</strong> of <strong style={{ color: 'var(--cs-text-primary)', fontWeight: 700 }}>{total}</strong> invoices (7 per page)
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12.5px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            border: '1px solid var(--cs-border)',
                                            borderRadius: '8px',
                                            cursor: offset === 0 ? 'not-allowed' : 'pointer',
                                            opacity: offset === 0 ? 0.4 : 1,
                                            background: 'var(--cs-surface)'
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
                                                        background: isCurrent ? 'var(--cs-primary)' : 'var(--cs-surface)',
                                                        borderColor: isCurrent ? 'var(--cs-primary)' : 'var(--cs-border)',
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
                                            fontSize: '12.5px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            border: '1px solid var(--cs-border)',
                                            borderRadius: '8px',
                                            cursor: offset + PAGE_SIZE >= total ? 'not-allowed' : 'pointer',
                                            opacity: offset + PAGE_SIZE >= total ? 0.4 : 1,
                                            background: 'var(--cs-surface)'
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

            {waivingInvoice && (
                <Modal title={`Waive Late Fee — ${waivingInvoice.invoiceNumber}`} onClose={() => setWaivingInvoice(null)}>
                    <form onSubmit={handleWaiveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: 'var(--cs-surface-2)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--cs-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>Student:</span>
                                <span style={{ fontSize: '13px', fontWeight: 600 }}>{waivingInvoice.studentName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>Late Fee Amount:</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444' }}>{money(waivingInvoice.late_fee_amount || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>Current Balance:</span>
                                <span style={{ fontSize: '13px', fontWeight: 600 }}>{money(waivingInvoice.balanceAmount)}</span>
                            </div>
                        </div>

                        <div>
                            <label className="cs-label" style={{ display: 'block', marginBottom: '6px' }}>
                                Reason for Waiving <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <textarea
                                className="cs-input"
                                rows={3}
                                placeholder="Provide a mandatory reason for waiving this late fee (e.g. medical leave, verified banking delay, executive exception)..."
                                value={waiveReason}
                                onChange={e => setWaiveReason(e.target.value)}
                                required
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>

                        {waiveError && (
                            <div className="alert alert-danger" style={{ fontSize: '12px', padding: '8px 12px' }}>
                                {waiveError}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setWaivingInvoice(null)}
                                disabled={waiving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={waiving || !waiveReason.trim()}
                                style={{ background: '#EF4444', borderColor: '#EF4444' }}
                            >
                                {waiving ? 'Waiving...' : 'Confirm Waive'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
