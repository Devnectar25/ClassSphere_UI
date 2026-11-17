'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import React, { useState } from 'react';
import { Bell, Send, Calendar, Users, Globe, AlertTriangle, Info, Megaphone, Clock, CheckCircle2, FileText } from 'lucide-react';
import { api, useApi, formatDate } from '@/lib/api';
import { can, useSession } from '@/lib/session';

interface Notice {
    noticeId: string;
    title: string;
    content: string;
    noticeType: string;
    status: string;
    priority: string;
    targetAudience: string;
    channels: string[];
    branchName: string;
    authorName: string | null;
    publishedAt: string;
    expiresAt: string | null;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
    announcement: { icon: Megaphone, color: '#6C63FF' },
    notice: { icon: Info, color: '#06B6D4' },
    alert: { icon: AlertTriangle, color: '#EF4444' },
    event: { icon: Calendar, color: '#10B981' },
};

const statusConfig: Record<string, { label: string; cls: string }> = {
    published: { label: 'Published', cls: 'badge-success' },
    scheduled: { label: 'Scheduled', cls: 'badge-warning' },
    draft: { label: 'Draft', cls: 'badge-secondary' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
    urgent: { label: '🔴 Urgent', color: '#EF4444' },
    high: { label: '🟠 High', color: '#F59E0B' },
    normal: { label: '⚪ Normal', color: 'var(--cs-text-muted)' },
    low: { label: '⚪ Low', color: 'var(--cs-text-muted)' },
};

const audienceLabel: Record<string, string> = { all: 'All Users', guardians: 'Guardians', students: 'Students', staff: 'Staff', batch: 'Batch' };
const CHANNELS = ['in-app', 'email', 'sms', 'whatsapp'];
const channelIcons: Record<string, string> = { 'in-app': '📱', email: '✉️', sms: '💬', whatsapp: '💚' };

const emptyForm = { title: '', content: '', noticeType: 'notice', priority: 'normal', targetAudience: 'all', channels: ['in-app'], status: 'published' };

export default function NoticesPage() {
    const session = useSession();
    const canPublish = can(session, 'notices.write');
    const { data: notices, error, reload } = useApi<Notice[]>('/notices');
    const [activeTab, setActiveTab] = useState('all');
    const [composing, setComposing] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const filtered = notices?.filter(n => activeTab === 'all' || n.status === activeTab) ?? [];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const stats = [
        { label: 'Published this month', value: notices?.filter(n => n.status === 'published' && new Date(n.publishedAt) >= monthStart).length ?? 0, icon: CheckCircle2, color: '#10B981' },
        { label: 'Scheduled', value: notices?.filter(n => n.status === 'scheduled').length ?? 0, icon: Clock, color: '#F59E0B' },
        { label: 'Drafts', value: notices?.filter(n => n.status === 'draft').length ?? 0, icon: FileText, color: '#6C63FF' },
        { label: 'Channels in use', value: new Set(notices?.flatMap(n => n.channels)).size, icon: Bell, color: '#06B6D4' },
    ];

    const toggleChannel = (c: string) =>
        setForm(f => ({ ...f, channels: f.channels.includes(c) ? f.channels.filter(x => x !== c) : [...f.channels, c] }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            await api('/notices', { method: 'POST', body: JSON.stringify(form) });
            setComposing(false);
            setForm(emptyForm);
            reload();
        } catch (err) {
            setFormError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Topbar title="Notices & Announcements" subtitle="Communicate with batches, branches, and individuals" action={canPublish ? { label: 'New Notice', onClick: () => setComposing(true) } : undefined} />
            <div className="page-body">

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {stats.map(s => (
                        <div key={s.label} className="cs-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <s.icon size={20} color={s.color} />
                            </div>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--cs-text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</div>
                                <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Compose CTA */}
                {canPublish && <div style={{
                    background: 'linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(6,182,212,0.08) 100%)',
                    border: '1px solid rgba(108,99,255,0.25)',
                    borderRadius: '16px', padding: '20px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--cs-text-primary)', marginBottom: '4px' }}>
                            📣 Compose a New Notice
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>
                            Reach targeted audiences via in-app, email, SMS, or WhatsApp
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={() => { setForm({ ...emptyForm, status: 'scheduled' }); setComposing(true); }}><Calendar size={14} /> Schedule</button>
                        <button className="btn-primary" onClick={() => { setForm(emptyForm); setComposing(true); }}><Send size={14} /> Compose & Send</button>
                    </div>
                </div>}

                {/* Notice list */}
                <div className="cs-card">
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="tab-list">
                            {['all', 'published', 'scheduled', 'draft'].map(t => (
                                <button key={t} className={`tab-trigger${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!notices ? <PageState error={error} /> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {filtered.length === 0 && <div style={{ padding: '24px', fontSize: '13px', color: 'var(--cs-text-muted)' }}>No notices.</div>}
                            {filtered.map((n, i) => {
                                const tc = typeConfig[n.noticeType] ?? typeConfig.notice;
                                const sc = statusConfig[n.status];
                                const pc = priorityConfig[n.priority] ?? priorityConfig.normal;
                                return (
                                    <div key={n.noticeId} style={{
                                        padding: '20px 24px',
                                        borderBottom: i < filtered.length - 1 ? '1px solid var(--cs-border)' : 'none',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                            <div style={{
                                                width: 42, height: 42, borderRadius: '12px',
                                                background: `${tc.color}18`, border: `1px solid ${tc.color}30`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                            }}>
                                                <tc.icon size={20} color={tc.color} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>{n.title}</span>
                                                    <span className={`badge ${sc.cls}`} style={{ fontSize: '10px' }}>{sc.label}</span>
                                                    <span style={{ fontSize: '11px', color: pc.color, fontWeight: 600 }}>{pc.label}</span>
                                                </div>
                                                <p style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>{n.content}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                                        <Users size={12} /> {audienceLabel[n.targetAudience] ?? n.targetAudience} • {n.branchName}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                                        <Globe size={12} /> {n.channels.map(c => channelIcons[c]).join(' ')} {n.channels.join(', ')}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                                        <Calendar size={12} /> {n.status === 'scheduled' ? 'Scheduled' : 'Published'}: {formatDate(n.publishedAt)}
                                                        {n.expiresAt && ` • Expires: ${formatDate(n.expiresAt)}`}
                                                        {n.authorName && ` • by ${n.authorName}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {composing && (
                <Modal title="Compose Notice" onClose={() => setComposing(false)}>
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label className="cs-label">Title</label>
                            <input className="cs-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        </div>
                        <div>
                            <label className="cs-label">Message</label>
                            <textarea className="cs-input" required rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Type</label>
                                <select className="cs-input" value={form.noticeType} onChange={e => setForm({ ...form, noticeType: e.target.value })}>
                                    {Object.keys(typeConfig).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">Priority</label>
                                <select className="cs-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                    {['low', 'normal', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">Audience</label>
                                <select className="cs-input" value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })}>
                                    {['all', 'guardians', 'students', 'staff'].map(a => <option key={a} value={a}>{audienceLabel[a]}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="cs-label">Channels</label>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {CHANNELS.map(c => (
                                    <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                        <input type="checkbox" checked={form.channels.includes(c)} onChange={() => toggleChannel(c)} /> {c}
                                    </label>
                                ))}
                            </div>
                        </div>
                        {formError && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{formError}</div>}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <select className="cs-input" style={{ width: 'auto' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                <option value="published">Publish now</option>
                                <option value="scheduled">Schedule</option>
                                <option value="draft">Save as draft</option>
                            </select>
                            <button className="btn-primary" type="submit" disabled={saving || form.channels.length === 0}>
                                <Send size={14} /> {saving ? 'Saving…' : 'Submit'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
