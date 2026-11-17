'use client';
import React from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import { Receipt, RefreshCw, CreditCard, Smartphone, DollarSign, Landmark } from 'lucide-react';
import { useApi, formatMoney, formatDate } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';

interface PaymentLedger {
    payments: Array<{
        paymentId: string;
        invoiceNumber: string;
        studentName: string;
        paymentReference: string;
        amount: number;
        paymentMethod: string;
        status: string;
        receiptNumber: string;
        createdAt: string;
    }>;
    summary: { collectedThisMonth: number; onlineTotal: number; offlineTotal: number; refundTotal: number; refundCount: number };
}

const modeIcon: Record<string, React.ElementType> = { UPI: Smartphone, Card: CreditCard, Cash: DollarSign, Cheque: Landmark, BankWire: Landmark };
const statusConfig: Record<string, { cls: string; label: string }> = {
    posted: { cls: 'badge-success', label: 'Success' },
    reconciled: { cls: 'badge-success', label: 'Reconciled' },
    refunded: { cls: 'badge-secondary', label: 'Refunded' },
    reversed: { cls: 'badge-danger', label: 'Reversed' },
};

export default function PaymentsPage() {
    const { currency } = useWorkspace();
    const { data, error } = useApi<PaymentLedger>('/payments');
    const money = (v: number) => formatMoney(v, currency);

    const collected = data ? data.summary.onlineTotal + data.summary.offlineTotal : 0;
    const share = (v: number) => (collected > 0 ? `${Math.round((v / collected) * 100)}% of total` : undefined);
    const summaryData = data ? [
        { label: 'Collected This Month', value: money(data.summary.collectedThisMonth), color: '#10B981', sub: undefined },
        { label: 'Online Payments', value: money(data.summary.onlineTotal), color: '#6C63FF', sub: share(data.summary.onlineTotal) },
        { label: 'Offline Payments', value: money(data.summary.offlineTotal), color: '#F59E0B', sub: share(data.summary.offlineTotal) },
        { label: 'Total Refunds', value: money(data.summary.refundTotal), color: '#EF4444', sub: `${data.summary.refundCount} refunds processed` },
    ] : [];

    return (
        <>
            <Topbar title="Payments & Receipts" subtitle="Track collections, receipts, refunds and settlement" />
            <div className="page-body">
                {!data ? <PageState error={error} /> : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            {summaryData.map(s => (
                                <div key={s.label} className="cs-card" style={{ padding: '20px' }}>
                                    <div style={{ fontSize: '22px', fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>{s.value}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{s.label}</div>
                                    {s.sub && <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>{s.sub}</div>}
                                </div>
                            ))}
                        </div>
                        <div className="cs-card">
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--cs-border)' }}>
                                <div className="section-title">Transaction Ledger</div>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="cs-table">
                                    <thead>
                                        <tr>
                                            <th>Invoice</th>
                                            <th>Student</th>
                                            <th>Mode</th>
                                            <th>Amount</th>
                                            <th>Date</th>
                                            <th>Reference</th>
                                            <th>Status</th>
                                            <th>Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.payments.map(p => {
                                            const Icon = modeIcon[p.paymentMethod] || (p.status === 'refunded' ? RefreshCw : CreditCard);
                                            const sc = statusConfig[p.status] ?? { cls: 'badge-secondary', label: p.status };
                                            const refund = p.status === 'refunded';
                                            return (
                                                <tr key={p.paymentId}>
                                                    <td><code style={{ fontSize: '11px', color: '#8B85FF' }}>{p.invoiceNumber}</code></td>
                                                    <td className="cell-nowrap" style={{ fontWeight: 600, fontSize: '13px' }}>{p.studentName}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Icon size={13} color="var(--cs-text-muted)" />
                                                            <span style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{p.paymentMethod}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontWeight: 700, fontSize: '14px', color: refund ? '#EF4444' : '#10B981' }}>
                                                        {refund ? '-' : ''}{money(p.amount)}
                                                    </td>
                                                    <td className="cell-nowrap" style={{ color: 'var(--cs-text-muted)', fontSize: '12px' }}>{formatDate(p.createdAt)}</td>
                                                    <td><code style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{p.paymentReference}</code></td>
                                                    <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                                                    <td>
                                                        <span className="cell-nowrap" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--cs-text-secondary)' }}>
                                                            <Receipt size={12} /> {p.receiptNumber}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
