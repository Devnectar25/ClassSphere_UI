'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import { Percent, Tag } from 'lucide-react';
import { useApi, formatMoney } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';

interface FeeStructure {
    feeHeads: Array<{ feeHeadId: string; code: string; name: string; frequency: string; isActive: boolean }>;
    feePlans: Array<{
        planId: string;
        name: string;
        appliedTo: string;
        discountPercent: number;
        isActive: boolean;
        items: Array<{ feeHeadId: string; name: string; amount: number }>;
    }>;
}

export default function FeesPage() {
    const { currency } = useWorkspace();
    const { data, error } = useApi<FeeStructure>('/fees');

    return (
        <>
            <Topbar title="Fee Heads & Plans" subtitle="Configure recurring and one-time fee structures" />
            <div className="page-body">
                {!data ? <PageState error={error} /> : (
                    <>
                        {/* Fee Heads */}
                        <div className="cs-card">
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--cs-border)' }}>
                                <div className="section-title">Fee Heads</div>
                                <div className="section-subtitle">Charge categories like tuition, admission, equipment</div>
                            </div>
                            <table className="cs-table">
                                <thead>
                                    <tr>
                                        <th>Fee Head</th>
                                        <th>Code</th>
                                        <th>Type</th>
                                        <th>Frequency</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.feeHeads.map(fh => {
                                        const recurring = fh.frequency !== 'one-time';
                                        return (
                                            <tr key={fh.feeHeadId}>
                                                <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Tag size={14} color="#6C63FF" /><span style={{ fontWeight: 600, fontSize: '13px' }}>{fh.name}</span></div></td>
                                                <td><code style={{ fontSize: '12px', background: 'var(--cs-surface-2)', padding: '2px 8px', borderRadius: '6px', color: 'var(--cs-text-muted)' }}>{fh.code}</code></td>
                                                <td><span className={`badge ${recurring ? 'badge-primary' : 'badge-info'}`}>{recurring ? 'Recurring' : 'One-time'}</span></td>
                                                <td style={{ color: 'var(--cs-text-secondary)', fontSize: '13px', textTransform: 'capitalize' }}>{recurring ? fh.frequency : '—'}</td>
                                                <td><span className={`badge ${fh.isActive ? 'badge-success' : 'badge-secondary'}`}>{fh.isActive ? 'active' : 'inactive'}</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Fee Plans */}
                        <div className="cs-card">
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--cs-border)' }}>
                                <div className="section-title">Fee Plans</div>
                                <div className="section-subtitle">Fee structures assigned to batches or individual students</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', padding: '20px' }}>
                                {data.feePlans.map(fp => (
                                    <div key={fp.planId} className="cs-card-inner" style={{ padding: '18px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--cs-text-primary)' }}>{fp.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>{fp.appliedTo}</div>
                                            </div>
                                            {fp.discountPercent > 0 && <span className="badge badge-warning"><Percent size={10} /> {fp.discountPercent}% off</span>}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                                            {fp.items.map(item => (
                                                <div key={item.feeHeadId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'var(--cs-text-secondary)' }}>{item.name}</span>
                                                    <span style={{ fontWeight: 600, color: 'var(--cs-text-primary)' }}>{formatMoney(item.amount, currency)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
