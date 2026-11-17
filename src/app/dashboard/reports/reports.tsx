'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import { useApi, formatMoney } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import {
    BarChart3, TrendingUp, Download, Filter,
    CreditCard, Users, BookOpen, ClipboardList, Bell, FileText
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';

interface CollectionReport {
    monthlyCollection: Array<{ month: string; online: number; offline: number; refunds: number }>;
    enrollmentTrend: Array<{ month: string; active: number; inquiry: number }>;
    summary: { totalCollected: number; collectedLast6Months: number; totalRefunds: number; collectionRate: number };
}

const reports = [
    { title: 'Fee Collection Summary', desc: 'Opening due, billed, collected, refunds, adjustments and closing due', icon: CreditCard, color: '#6C63FF' },
    { title: 'Outstanding & Aging', desc: 'Current, overdue and configurable aging buckets per student', icon: TrendingUp, color: '#EF4444' },
    { title: 'Student Enrollment', desc: 'Admissions, active, on hold, completed and withdrawn', icon: Users, color: '#10B981' },
    { title: 'Batch Capacity', desc: 'Capacity, enrolled seats, vacancy and utilization percentage', icon: BookOpen, color: '#F59E0B' },
    { title: 'Attendance Summary', desc: 'Present, absent, late, leave and percentage per batch/student', icon: ClipboardList, color: '#06B6D4' },
    { title: 'Notification Delivery', desc: 'Sent, delivered, failed, read where available by channel', icon: Bell, color: '#8B5CF6' },
    { title: 'Subscription Usage', desc: 'Students, staff, branches, storage and message credits used', icon: BarChart3, color: '#EC4899' },
    { title: 'Audit Report', desc: 'Sensitive actions by date, user, module and target record', icon: FileText, color: '#64748B' },
];

interface TooltipPayloadItem {
    name: string;
    value: number;
    color: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
    currency: string;
}

const CustomTooltip = ({ active, payload, label, currency }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', borderRadius: '10px', padding: '10px 14px' }}>
                <p style={{ color: 'var(--cs-text-muted)', fontSize: '12px', marginBottom: '6px' }}>{label}</p>
                {payload.map((p) => (
                    <div key={p.name} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', marginBottom: '3px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                        <span style={{ color: 'var(--cs-text-secondary)' }}>{p.name}:</span>
                        <strong style={{ color: 'var(--cs-text-primary)' }}>{formatMoney(p.value, currency)}</strong>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function ReportsPage() {
    const { currency } = useWorkspace();
    const { data, error } = useApi<CollectionReport>('/reports?type=collection');
    const money = (v: number) => formatMoney(v, currency);
    const summary = data ? [
        { label: 'Total Collected', value: money(data.summary.totalCollected), sub: 'All posted payments', color: '#10B981' },
        { label: 'Avg Monthly Collection', value: money(data.summary.collectedLast6Months / 6), sub: 'Last 6 months', color: '#6C63FF' },
        { label: 'Total Refunds', value: money(data.summary.totalRefunds), sub: data.summary.totalCollected > 0 ? `${((data.summary.totalRefunds / data.summary.totalCollected) * 100).toFixed(1)}% of collections` : '—', color: '#EF4444' },
        { label: 'Collection Rate', value: `${data.summary.collectionRate}%`, sub: 'Paid vs billed (non-void invoices)', color: '#F59E0B' },
    ] : [];

    return (
        <>
            <Topbar title="Reports & Analytics" subtitle="Financial summaries, attendance, enrollment, and audit trails" />
            <div className="page-body">

                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {summary.map(s => (
                        <div key={s.label} className="cs-card" style={{ padding: '20px' }}>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '4px' }}>{s.value}</div>
                            <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{s.label}</div>
                            <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>{s.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Charts */}
                {!data ? <PageState error={error} /> : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="cs-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <div className="section-title">Monthly Collection Breakdown</div>
                                <div className="section-subtitle">Online vs offline payments, last 6 months</div>
                            </div>
                            <button className="btn-secondary" style={{ fontSize: '12px' }}><Download size={13} /> Export</button>
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data.monthlyCollection}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="month" tick={{ fill: 'var(--cs-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--cs-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => money(v)} width={80} />
                                <Tooltip content={<CustomTooltip currency={currency} />} />
                                <Legend formatter={(v) => <span style={{ color: 'var(--cs-text-secondary)', fontSize: 12 }}>{v}</span>} />
                                <Bar isAnimationActive={false} dataKey="online" name="Online" fill="#6C63FF" radius={[4, 4, 0, 0]} stackId="a" />
                                <Bar isAnimationActive={false} dataKey="offline" name="Offline" fill="#06B6D4" radius={[4, 4, 0, 0]} stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="cs-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <div className="section-title">Enrollment Trend</div>
                                <div className="section-subtitle">Active students over time</div>
                            </div>
                            <button className="btn-secondary" style={{ fontSize: '12px' }}><Filter size={13} /> Filter</button>
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={data.enrollmentTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="month" tick={{ fill: 'var(--cs-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--cs-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', borderRadius: '8px' }} />
                                <Legend formatter={(v) => <span style={{ color: 'var(--cs-text-secondary)', fontSize: 12 }}>{v}</span>} />
                                <Line isAnimationActive={false} type="monotone" dataKey="active" name="Active Students" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', strokeWidth: 0, r: 4 }} />
                                <Line isAnimationActive={false} type="monotone" dataKey="inquiry" name="Inquiries" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 2" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                )}

                {/* Report cards */}
                <div>
                    <div style={{ marginBottom: '16px' }}>
                        <div className="section-title">Available Reports</div>
                        <div className="section-subtitle">Click any report to generate with filters</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {reports.map(r => (
                            <div key={r.title} className="cs-card" style={{ padding: '20px', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: '12px', background: `${r.color}20`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        border: `1px solid ${r.color}30`
                                    }}>
                                        <r.icon size={20} color={r.color} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--cs-text-primary)', marginBottom: '4px' }}>{r.title}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', lineHeight: 1.4 }}>{r.desc}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                                    <button className="btn-secondary" style={{ fontSize: '11px', padding: '6px 12px', flex: 1 }}><Filter size={11} /> Filter & View</button>
                                    <button className="btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }}><Download size={11} /> CSV</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
