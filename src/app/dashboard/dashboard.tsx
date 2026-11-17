'use client';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import React from 'react';
import {
    CreditCard, TrendingUp, AlertCircle, ArrowUpRight,
    ArrowDownRight, CheckCircle, Clock, BookOpen, Calendar,
    GraduationCap, Zap, Activity, Bell, ClipboardList
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { useApi, formatMoney, initials } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';

interface DashboardSummary {
    stats: {
        revenueThisMonth: number;
        revenueLastMonth: number;
        outstandingAmount: number;
        outstandingCount: number;
        overdueAmount: number;
        overdueCount: number;
        activeStudents: number;
        newStudentsThisMonth: number;
        classesToday: number;
        collectionRate: number;
    };
    revenueTrend: Array<{ month: string; collected: number; pending: number }>;
    paymentModes: Array<{ name: string; value: number }>;
    batchCapacity: Array<{ name: string; students: number; capacity: number }>;
    recentActivity: Array<{ action: string; entityType: string; details: Record<string, string | number> | null; createdAt: string }>;
    upcoming: Array<{ eventId: string; title: string; eventType: string; startsAt: string }>;
}

interface Aging {
    overdueInvoices: Array<{ invoiceId: string; studentName: string; batches: string | null; balanceAmount: number; daysOverdue: number }>;
}

const PIE_COLORS = ['#4F46E5', '#06B6D4', '#F59E0B', '#10B981', '#EC4899'];
const EVENT_COLORS: Record<string, string> = { test: '#6C63FF', session: '#06B6D4', fee: '#F59E0B', event: '#10B981' };

function describeActivity(a: DashboardSummary['recentActivity'][0], money: (v: number) => string) {
    const d = a.details ?? {};
    if (a.action.startsWith('billing.payment')) return { text: `Payment of ${money(Number(d.amount ?? 0))} received${d.method ? ` via ${d.method}` : ''} (${d.receipt ?? 'receipt'})`, color: '#10B981', icon: CheckCircle };
    if (a.action.startsWith('billing.invoice_cycle')) return { text: `Invoice cycle generated: ${d.invoices ?? 0} invoices`, color: '#F59E0B', icon: CreditCard };
    if (a.action.startsWith('student.')) return { text: `${d.name ?? 'Student'} enrolled (${d.enrollmentNo ?? ''})`, color: '#6C63FF', icon: GraduationCap };
    if (a.action.startsWith('notice.')) return { text: `Notice "${d.title ?? ''}" ${a.action.split('.')[1]}`, color: '#F59E0B', icon: Bell };
    if (a.action === 'tenant.settings_updated') return { text: 'Workspace settings updated', color: '#64748B', icon: Clock };
    if (a.action === 'tenant.created') return { text: `Workspace "${d.name ?? ''}" created`, color: '#64748B', icon: Clock };
    if (a.action.startsWith('attendance.')) return { text: `Attendance recorded (${d.count ?? d.date ?? ''})`, color: '#06B6D4', icon: ClipboardList };
    return { text: `${a.action} on ${a.entityType}`, color: '#64748B', icon: Clock };
}

function timeAgo(iso: string) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${Math.max(mins, 1)} mins ago`;
    if (mins < 1440) return `${Math.round(mins / 60)} hrs ago`;
    return `${Math.round(mins / 1440)} days ago`;
}

interface StatCardProps {
    label: string;
    value: string;
    sub?: string;
    trend?: string;
    icon: React.ElementType;
    color: string;
}

function StatCard({ label, value, sub, trend, icon: Icon, color }: StatCardProps) {
    const isUp = trend?.startsWith('+');
    return (
        <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{
                    width: 44, height: 44, borderRadius: '12px',
                    background: `${color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${color}30`
                }}>
                    <Icon size={22} color={color} />
                </div>
                {trend && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '12px', fontWeight: 600,
                        color: isUp ? '#10B981' : '#EF4444',
                        background: isUp ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        padding: '4px 8px', borderRadius: '6px'
                    }}>
                        {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {trend}
                    </div>
                )}
            </div>
            <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--cs-text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.5px' }}>
                    {value}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', marginTop: '2px' }}>{label}</div>
                {sub && <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>{sub}</div>}
            </div>
        </div>
    );
}

interface TooltipPayloadItem {
    name: string;
    value: number;
    color: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
    money: (v: number) => string;
}

const CustomTooltip = ({ active, payload, label, money }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: '#FFFFFF', border: '1px solid #E2E8F0',
                borderRadius: '8px', padding: '10px 14px', boxShadow: '0px 4px 6px -1px rgba(15, 23, 42, 0.05), 0px 20px 24px -4px rgba(15, 23, 42, 0.08)'
            }}>
                <p style={{ color: 'var(--cs-text-muted)', fontSize: '12px', marginBottom: '6px' }}>{label}</p>
                {payload.map((p) => (
                    <div key={p.name} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: 'var(--cs-text-primary)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                        <span style={{ color: 'var(--cs-text-secondary)' }}>{p.name}:</span>
                        <strong>{money(p.value)}</strong>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const { workspace, currency } = useWorkspace();
    const { data, error } = useApi<DashboardSummary>('/reports?type=dashboard');
    const { data: aging } = useApi<Aging>('/reports?type=aging');
    const money = (v: number) => formatMoney(v, currency);

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const firstName = workspace?.actor?.fullName.split(' ')[0] ?? '';
    const monthLabel = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const s = data?.stats;
    const revenueTrend = s && s.revenueLastMonth > 0
        ? `${s.revenueThisMonth >= s.revenueLastMonth ? '+' : ''}${(((s.revenueThisMonth - s.revenueLastMonth) / s.revenueLastMonth) * 100).toFixed(1)}%`
        : undefined;
    const modesTotal = data?.paymentModes.reduce((sum, m) => sum + m.value, 0) ?? 0;
    const pieData = data?.paymentModes.map((m, i) => ({
        name: m.name,
        value: modesTotal > 0 ? Math.round((m.value / modesTotal) * 100) : 0,
        color: PIE_COLORS[i % PIE_COLORS.length],
    })) ?? [];

    return (
        <>
            <Topbar title="Dashboard" subtitle={`${workspace?.organization.name ?? ''} • ${monthLabel}`} />

            <div className="page-body">
                {!data || !s ? <PageState error={error} /> : (
                    <>
                        {/* Hero banner */}
                        <div style={{
                            background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 50%, #312E81 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '28px 32px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            overflow: 'hidden',
                            position: 'relative',
                            boxShadow: '0px 24px 48px -12px rgba(79, 70, 229, 0.25)',
                        }}>
                            <div style={{
                                position: 'absolute', top: '-40px', right: '40px',
                                width: '300px', height: '300px', borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
                            }} />
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    {workspace?.subscription && (
                                        <div style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '9999px', fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                                            Active Plan — {workspace.subscription.planTier}
                                        </div>
                                    )}
                                    <div className="badge badge-success">● Live</div>
                                </div>
                                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px', letterSpacing: '-0.015em' }}>
                                    {greeting}{firstName ? `, ${firstName}` : ''}! 👋
                                </h2>
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', maxWidth: '440px' }}>
                                    You have <strong style={{ color: '#F59E0B' }}>{s.overdueCount} overdue invoices</strong> totaling {money(s.overdueAmount)} pending collection.
                                    {revenueTrend && ` Collections this month are ${revenueTrend} vs last month.`}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                                <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '20px 24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'white', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.015em' }}>{s.activeStudents}</div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Active Students</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '20px 24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#10B981', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.015em' }}>{s.collectionRate}%</div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Fee Collection</div>
                                </div>
                            </div>
                        </div>

                        {/* Stats row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            <StatCard label="Collected This Month" value={money(s.revenueThisMonth)} trend={revenueTrend} icon={TrendingUp} color="#4F46E5" sub={`vs ${money(s.revenueLastMonth)} last month`} />
                            <StatCard label="Outstanding Dues" value={money(s.outstandingAmount)} icon={AlertCircle} color="#EF4444" sub={`${s.outstandingCount} invoices pending`} />
                            <StatCard label="Active Students" value={String(s.activeStudents)} trend={s.newStudentsThisMonth ? `+${s.newStudentsThisMonth}` : undefined} icon={GraduationCap} color="#10B981" sub={`${s.newStudentsThisMonth} new this month`} />
                            <StatCard label="Classes Today" value={String(s.classesToday)} icon={BookOpen} color="#F59E0B" sub="Scheduled batch sessions" />
                        </div>

                        {/* Charts row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
                            {/* Revenue Chart */}
                            <div className="cs-card" style={{ padding: '24px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <div className="section-title">Fee Collection Trend</div>
                                    <div className="section-subtitle">Collected vs pending dues, last 6 months</div>
                                </div>
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={data.revenueTrend}>
                                        <defs>
                                            <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                        <XAxis dataKey="month" tick={{ fill: 'var(--cs-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: 'var(--cs-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => money(v)} width={80} />
                                        <Tooltip content={<CustomTooltip money={money} />} />
                                        <Area isAnimationActive={false} type="monotone" dataKey="collected" name="Collected" stroke="#4F46E5" strokeWidth={2.5} fill="url(#cGrad)" />
                                        <Area isAnimationActive={false} type="monotone" dataKey="pending" name="Pending" stroke="#EF4444" strokeWidth={2} fill="url(#pGrad)" strokeDasharray="4 2" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Payment mode pie */}
                            <div className="cs-card" style={{ padding: '24px' }}>
                                <div className="section-title" style={{ marginBottom: '4px' }}>Payment Modes</div>
                                <div className="section-subtitle" style={{ marginBottom: '20px' }}>{now.toLocaleDateString(undefined, { month: 'long' })} breakdown</div>
                                {pieData.length === 0 ? (
                                    <div style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>No payments recorded this month.</div>
                                ) : (
                                    <>
                                        <ResponsiveContainer width="100%" height={160}>
                                            <PieChart>
                                                <Pie isAnimationActive={false} data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                                                    {pieData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                                                </Pie>
                                                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0px 4px 6px -1px rgba(15, 23, 42, 0.05)' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                            {pieData.map(d => (
                                                <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ width: 10, height: 10, borderRadius: '3px', background: d.color, display: 'inline-block' }} />
                                                        <span style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{d.name}</span>
                                                    </div>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>{d.value}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Batch capacity + Overdue */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Batch fill */}
                            <div className="cs-card" style={{ padding: '24px' }}>
                                <div className="section-title" style={{ marginBottom: '4px' }}>Batch Capacity</div>
                                <div className="section-subtitle" style={{ marginBottom: '20px' }}>Enrollment vs capacity</div>
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={data.batchCapacity} layout="vertical" barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                                        <XAxis type="number" tick={{ fill: 'var(--cs-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" tick={{ fill: 'var(--cs-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
                                        <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0px 4px 6px -1px rgba(15, 23, 42, 0.05)' }} />
                                        <Bar isAnimationActive={false} dataKey="students" name="Enrolled" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                                        <Bar isAnimationActive={false} dataKey="capacity" name="Capacity" fill="rgba(79,70,229,0.12)" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Overdue */}
                            <div className="cs-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div>
                                        <div className="section-title">Overdue Fees</div>
                                        <div className="section-subtitle">Requires immediate follow-up</div>
                                    </div>
                                    <Link href="/dashboard/invoices" className="btn-danger" style={{ fontSize: '12px', padding: '6px 14px' }}>View Invoices</Link>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {aging?.overdueInvoices.length === 0 && <div style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>No overdue invoices. 🎉</div>}
                                    {aging?.overdueInvoices.slice(0, 4).map(inv => (
                                        <div key={inv.invoiceId} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: '#F8FAFC', borderRadius: '8px', padding: '12px 14px',
                                            border: '1px solid #E2E8F0'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: '11px' }}>{initials(inv.studentName)}</div>
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>{inv.studentName}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{inv.batches ?? '—'}</div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#EF4444' }}>{money(inv.balanceAmount)}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{inv.daysOverdue} days overdue</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Activity + Upcoming */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
                            {/* Recent activity */}
                            <div className="cs-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <div>
                                        <div className="section-title">Recent Activity</div>
                                        <div className="section-subtitle">Latest audited actions across your academy</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontSize: '12px', fontWeight: 600 }}>
                                        <Activity size={14} />
                                        Audit log
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {data.recentActivity.map(item => {
                                        const view = describeActivity(item, money);
                                        return (
                                            <div key={`${item.action}-${item.createdAt}`} className="timeline-item">
                                                <div className="timeline-dot" style={{ background: view.color }}>
                                                    <view.icon size={8} color="white" style={{ margin: '3px' }} />
                                                </div>
                                                <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px 12px', border: '1px solid #E2E8F0' }}>
                                                    <div style={{ fontSize: '13px', color: 'var(--cs-text-primary)' }}>{view.text}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>{timeAgo(item.createdAt)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Upcoming events */}
                            <div className="cs-card" style={{ padding: '24px' }}>
                                <div className="section-title" style={{ marginBottom: '4px' }}>Upcoming</div>
                                <div className="section-subtitle" style={{ marginBottom: '16px' }}>Next 30 days</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {data.upcoming.length === 0 && <div style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>Nothing scheduled.</div>}
                                    {data.upcoming.map(ev => {
                                        const color = EVENT_COLORS[ev.eventType] ?? '#10B981';
                                        const date = new Date(ev.startsAt);
                                        return (
                                            <div key={ev.eventId} style={{
                                                display: 'flex', alignItems: 'center', gap: '12px',
                                                background: '#F8FAFC', borderRadius: '8px', padding: '12px 14px',
                                                border: '1px solid #E2E8F0'
                                            }}>
                                                <div style={{
                                                    width: 44, height: 44, borderRadius: '10px',
                                                    background: `${color}20`, border: `1px solid ${color}30`,
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 700, color }}>{date.getDate()}</div>
                                                    <div style={{ fontSize: '9px', color, fontWeight: 600, textTransform: 'uppercase' }}>
                                                        {date.toLocaleDateString(undefined, { month: 'short' })}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)', lineHeight: 1.3 }}>{ev.title}</div>
                                                    <span className={`badge badge-${ev.eventType === 'fee' ? 'warning' : ev.eventType === 'test' ? 'primary' : ev.eventType === 'event' ? 'success' : 'info'}`} style={{ marginTop: '4px', fontSize: '10px', padding: '2px 8px' }}>
                                                        {ev.eventType}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Quick actions */}
                                <div style={{ marginTop: '16px' }}>
                                    <hr className="cs-divider" />
                                    <div className="section-title" style={{ fontSize: '14px', marginBottom: '12px' }}>Quick Actions</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {[
                                            { label: 'Add Student', icon: GraduationCap, color: '#4F46E5', href: '/dashboard/students' },
                                            { label: 'Collect Fee', icon: CreditCard, color: '#10B981', href: '/dashboard/invoices' },
                                            { label: 'Mark Attend.', icon: Calendar, color: '#06B6D4', href: '/dashboard/attendance' },
                                            { label: 'Send Notice', icon: Zap, color: '#F59E0B', href: '/dashboard/notices' },
                                        ].map(action => (
                                            <Link key={action.label} href={action.href} className="btn-secondary" style={{ flexDirection: 'column', gap: '6px', padding: '12px 8px', fontSize: '11px', alignItems: 'center' }}>
                                                <action.icon size={16} color={action.color} />
                                                {action.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
