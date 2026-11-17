'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import BadgeList from '@/components/BadgeList';
import React, { useState } from 'react';
import { Search, CreditCard, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { api, useApi, formatMoney, formatDate, initials } from '@/lib/api';
import { confirmDialog } from '@/lib/dialogs';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';

interface Invoice {
    invoiceId: string;
    invoiceNumber: string;
    studentName: string;
    batches: string | null;
    designation: string;
    totalAmount: number;
    balanceAmount: number;
    dueDate: string;
    status: 'paid' | 'pending' | 'overdue' | 'void';
    paidOn: string | null;
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
    overdue: { label: 'Overdue', cls: 'badge-danger', icon: AlertCircle },
    pending: { label: 'Pending', cls: 'badge-warning', icon: Clock },
    void: { label: 'Voided', cls: 'badge-secondary', icon: XCircle },
};

const PAYMENT_METHODS = ['Cash', 'Cheque', 'UPI', 'Card', 'BankWire'];

export default function InvoicesPage() {
    const session = useSession();
    const canCollect = can(session, 'billing.write');
    const { currency } = useWorkspace();
    const { data, error, reload } = useApi<Ledger>('/invoices');
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [collecting, setCollecting] = useState<Invoice | null>(null);
    const [payment, setPayment] = useState({ amount: '', paymentMethod: 'Cash' });
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const money = (v: number) => formatMoney(v, currency);

    const generateCycle = async () => {
        if (!(await confirmDialog('Generate this month\'s invoices?', 'Tuition invoices will be created for all actively enrolled students.', 'Generate'))) return;
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
            const res = await api<{ receiptNumber: string }>('/payments', {
                method: 'POST',
                headers: { 'Idempotency-Key': crypto.randomUUID() },
                body: JSON.stringify({ invoiceId: collecting.invoiceId, amount: Number(payment.amount), paymentMethod: payment.paymentMethod }),
            });
            setNotice(`Payment recorded for ${collecting.invoiceNumber}. Receipt ${res.receiptNumber}.`);
            setCollecting(null);
            reload();
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

    const summaryStats = data ? [
        { label: 'Billed This Month', value: money(data.summary.billedThisMonth), color: '#6C63FF', sub: `${data.summary.billedThisMonthCount} invoices` },
        { label: 'Collected (all time)', value: money(data.summary.collectedTotal), color: '#10B981', sub: `${data.summary.billedTotal > 0 ? Math.round((data.summary.collectedTotal / data.summary.billedTotal) * 100) : 0}% of billed` },
        { label: 'Outstanding', value: money(data.summary.outstandingAmount), color: '#F59E0B', sub: `${data.summary.outstandingCount} invoices` },
        { label: 'Overdue', value: money(data.summary.overdueAmount), color: '#EF4444', sub: `${data.summary.overdueCount} invoices` },
    ] : [];

    const agingBuckets = data ? [
        { label: 'Current (not yet due)', amount: data.aging.current, count: data.aging.counts.current, color: '#10B981' },
        { label: '1–30 days overdue', amount: data.aging.days1To30, count: data.aging.counts.days1To30, color: '#F59E0B' },
        { label: '31–60 days overdue', amount: data.aging.days31To60, count: data.aging.counts.days31To60, color: '#EF4444' },
        { label: '60+ days overdue', amount: data.aging.days61Plus, count: data.aging.counts.days61Plus, color: '#991B1B' },
    ] : [];

    return (
        <>
            <Topbar title="Invoices & Dues" subtitle="View, collect, and manage all student fee invoices" action={canCollect ? { label: busy ? 'Working…' : 'Generate Invoices', onClick: generateCycle } : undefined} />
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
                                        <input className="cs-input" placeholder="Search invoice or student..." style={{ background: 'none', border: 'none', padding: 0, boxShadow: 'none' }} value={search} onChange={e => setSearch(e.target.value)} />
                                    </div>

                                    <div className="tab-list">
                                        {['all', 'pending', 'paid', 'overdue', 'void'].map(tab => (
                                            <button key={tab} className={`tab-trigger${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
                                                {tab === 'all' ? 'All' : statusConfig[tab].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table className="cs-table">
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Student</th>
                                            <th>Batch</th>
                                            <th>Fee Type</th>
                                            <th>Amount</th>
                                            <th>Due Date</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(inv => {
                                            const sc = statusConfig[inv.status];
                                            return (
                                                <tr key={inv.invoiceId}>
                                                    <td>
                                                        <code style={{ fontSize: '12px', background: 'var(--cs-surface-2)', padding: '3px 8px', borderRadius: '6px', color: '#8B85FF' }}>{inv.invoiceNumber}</code>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div className="avatar-placeholder" style={{ width: 30, height: 30, fontSize: '11px' }}>{initials(inv.studentName)}</div>
                                                            <span style={{ fontWeight: 600, fontSize: '13px' }}>{inv.studentName}</span>
                                                        </div>
                                                    </td>
                                                    <td><BadgeList value={inv.batches} /></td>
                                                    <td style={{ color: 'var(--cs-text-secondary)', fontSize: '13px', maxWidth: '220px' }}>{inv.designation}</td>
                                                    <td>
                                                        <span className="cell-nowrap" style={{ fontSize: '14px', fontWeight: 700, color: inv.status === 'paid' ? '#10B981' : inv.status === 'overdue' ? '#EF4444' : 'var(--cs-text-primary)' }}>
                                                            {money(inv.totalAmount)}
                                                        </span>
                                                        {inv.balanceAmount > 0 && inv.balanceAmount < inv.totalAmount && (
                                                            <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>Balance {money(inv.balanceAmount)}</div>
                                                        )}
                                                    </td>
                                                    <td className="cell-nowrap" style={{ color: 'var(--cs-text-muted)', fontSize: '12px' }}>
                                                        <div>{formatDate(inv.dueDate)}</div>
                                                        {inv.paidOn && inv.status === 'paid' && <div style={{ color: '#10B981', fontSize: '11px' }}>Paid: {formatDate(inv.paidOn)}</div>}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${sc.cls}`}>
                                                            <sc.icon size={11} /> {sc.label}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {canCollect && (inv.status === 'pending' || inv.status === 'overdue') && (
                                                            <button className="btn-primary cell-nowrap" style={{ padding: '6px 12px', fontSize: '12px' }}
                                                                onClick={() => { setCollecting(inv); setPayment({ amount: String(inv.balanceAmount), paymentMethod: 'Cash' }); }}>
                                                                <CreditCard size={13} /> Collect
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--cs-border)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>Showing {filtered.length} of {data.invoices.length} invoices</span>
                            </div>
                        </div>

                        {/* Aging report */}
                        <div className="cs-card" style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <div className="section-title">Aging Report</div>
                                <div className="section-subtitle">Outstanding dues by overdue period</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                {agingBuckets.map(ag => (
                                    <div key={ag.label} style={{ background: 'var(--cs-surface-2)', borderRadius: '12px', padding: '16px', border: `1px solid ${ag.color}30` }}>
                                        <div style={{ fontSize: '20px', fontWeight: 800, color: ag.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{money(ag.amount)}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', marginTop: '4px' }}>{ag.label}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>{ag.count} invoices</div>
                                        <div style={{ marginTop: '10px' }}>
                                            <div className="progress-bar">
                                                <div className="progress-fill" style={{ width: `${data.aging.totalOutstanding > 0 ? (ag.amount / data.aging.totalOutstanding) * 100 : 0}%`, background: ag.color }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {collecting && (
                <Modal title={`Collect Payment — ${collecting.invoiceNumber}`} onClose={() => setCollecting(null)}>
                    <form onSubmit={submitPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>
                            {collecting.studentName} • Outstanding {money(collecting.balanceAmount)}
                        </div>
                        <div>
                            <label className="cs-label">Amount</label>
                            <input className="cs-input" type="number" min="0.01" step="0.01" max={collecting.balanceAmount} required
                                value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} />
                        </div>
                        <div>
                            <label className="cs-label">Payment Method</label>
                            <select className="cs-input" value={payment.paymentMethod} onChange={e => setPayment({ ...payment, paymentMethod: e.target.value })}>
                                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <button className="btn-primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-end' }}>
                            {busy ? 'Recording…' : 'Record Payment'}
                        </button>
                    </form>
                </Modal>
            )}
        </>
    );
}
