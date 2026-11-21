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

const emptyForm = { title: '', content: '', noticeType: 'notice', priority: 'normal', targetAudience: 'all', targetBatchId: '', channels: ['in-app'], status: 'published', scheduledAt: '', expiresAt: '' };

export default function NoticesPage() {
    const session = useSession();
    const canPublish = can(session, 'notices.write');
    const { data: notices, error, reload } = useApi<Notice[]>('/notices');
    const { data: batches } = useApi<Array<{ batchId: string; name: string; courseTitle?: string; enrolledCount?: number }>>('/batches');
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
        if (form.targetAudience === 'students' && !form.targetBatchId) {
            setFormError('Please select which batch students you want to send this notice to.');
            setSaving(false);
            return;
        }
        if (form.status === 'scheduled' && !form.scheduledAt) {
            setFormError('Please select a scheduled date and time for when to send this notice.');
            setSaving(false);
            return;
        }
        try {
            const payload = {
                ...form,
                targetBatchId: form.targetAudience === 'students' && form.targetBatchId !== 'all-batches' ? form.targetBatchId : null,
                scheduledAt: form.status === 'scheduled' ? form.scheduledAt : null,
                expiresAt: form.expiresAt || null,
            };
            await api('/notices', { method: 'POST', body: JSON.stringify(payload) });
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
            <Topbar title="Notices & Announcements" subtitle="Communicate with batches, branches, and individuals" />
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
                <Modal
                    title={form.status === 'scheduled' ? 'Schedule Notice' : 'Compose Notice'}
                    onClose={() => setComposing(false)}
                    maxWidth="700px"
                    className="no-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label className="cs-label">Title</label>
                            <input className="cs-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        </div>
                        <div>
                            <label className="cs-label">Message</label>
                            <textarea className="cs-input" required rows={3} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} style={{ resize: 'vertical' }} />
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
                                <select
                                    className="cs-input"
                                    value={form.targetAudience}
                                    onChange={e => {
                                        const nextAudience = e.target.value;
                                        setForm(f => ({
                                            ...f,
                                            targetAudience: nextAudience,
                                            targetBatchId: nextAudience === 'students' ? (f.targetBatchId || '') : '',
                                        }));
                                    }}
                                >
                                    {['all', 'guardians', 'students', 'staff'].map(a => <option key={a} value={a}>{audienceLabel[a]}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Batch selection when audience is students */}
                        {form.targetAudience === 'students' && (
                            <div style={{
                                background: 'rgba(108, 99, 255, 0.06)',
                                border: '1px solid rgba(108, 99, 255, 0.25)',
                                borderRadius: '10px',
                                padding: '14px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                                    <label className="cs-label" style={{ marginBottom: 0, fontWeight: 700, color: 'var(--cs-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Users size={14} color="#6C63FF" /> Which batch students do you want to send to?
                                    </label>
                                    <span style={{ fontSize: '11px', color: '#6C63FF', fontWeight: 600 }}>Batch Target</span>
                                </div>
                                <select
                                    className="cs-input"
                                    required
                                    value={form.targetBatchId}
                                    onChange={e => setForm({ ...form, targetBatchId: e.target.value })}
                                    style={{ background: 'var(--cs-surface)' }}
                                >
                                    <option value="">Choose a batch…</option>
                                    <option value="all-batches">All Batches (Every enrolled student)</option>
                                    {batches?.map(b => (
                                        <option key={b.batchId} value={b.batchId}>
                                            {b.name} {b.courseTitle ? `— ${b.courseTitle}` : ''} {b.enrolledCount !== undefined ? `(${b.enrolledCount} students)` : ''}
                                        </option>
                                    ))}
                                </select>
                                <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Info size={13} color="var(--cs-text-muted)" />
                                    {form.targetBatchId === 'all-batches'
                                        ? 'Notice will be broadcast to all students across every batch.'
                                        : form.targetBatchId
                                        ? `Notice will be delivered to students enrolled in "${batches?.find(b => b.batchId === form.targetBatchId)?.name ?? 'the selected batch'}".`
                                        : 'Please select which batch students you want to send to.'}
                                </div>
                            </div>
                        )}
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
                        {/* Delivery Schedule / When to send */}
                        <div>
                            <label className="cs-label" style={{ fontWeight: 700, color: 'var(--cs-text-primary)', marginBottom: '8px' }}>
                                When do you want to send this notice?
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, status: 'published' }))}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '12px 14px',
                                        borderRadius: '8px',
                                        border: form.status === 'published' ? '2px solid #6C63FF' : '1px solid var(--cs-border)',
                                        background: form.status === 'published' ? 'rgba(108, 99, 255, 0.08)' : 'var(--cs-surface)',
                                        color: form.status === 'published' ? '#6C63FF' : 'var(--cs-text-secondary)',
                                        fontWeight: form.status === 'published' ? 700 : 500,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <Send size={18} color={form.status === 'published' ? '#6C63FF' : 'var(--cs-text-muted)'} />
                                    <div>
                                        <div style={{ fontSize: '13px' }}>Send Now</div>
                                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontWeight: 400 }}>Publish immediately</div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, status: 'scheduled' }))}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '12px 14px',
                                        borderRadius: '8px',
                                        border: form.status === 'scheduled' ? '2px solid #F59E0B' : '1px solid var(--cs-border)',
                                        background: form.status === 'scheduled' ? 'rgba(245, 158, 11, 0.08)' : 'var(--cs-surface)',
                                        color: form.status === 'scheduled' ? '#D97706' : 'var(--cs-text-secondary)',
                                        fontWeight: form.status === 'scheduled' ? 700 : 500,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <Calendar size={18} color={form.status === 'scheduled' ? '#D97706' : 'var(--cs-text-muted)'} />
                                    <div>
                                        <div style={{ fontSize: '13px' }}>Schedule Later</div>
                                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontWeight: 400 }}>Pick date & time</div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, status: 'draft' }))}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '12px 14px',
                                        borderRadius: '8px',
                                        border: form.status === 'draft' ? '2px solid #64748B' : '1px solid var(--cs-border)',
                                        background: form.status === 'draft' ? 'rgba(100, 116, 139, 0.08)' : 'var(--cs-surface)',
                                        color: form.status === 'draft' ? 'var(--cs-text-primary)' : 'var(--cs-text-secondary)',
                                        fontWeight: form.status === 'draft' ? 700 : 500,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <FileText size={18} color={form.status === 'draft' ? 'var(--cs-text-primary)' : 'var(--cs-text-muted)'} />
                                    <div>
                                        <div style={{ fontSize: '13px' }}>Save as Draft</div>
                                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontWeight: 400 }}>Review later</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Scheduled date and time picker when status is scheduled */}
                        {form.status === 'scheduled' && (
                            <div style={{
                                background: 'rgba(245, 158, 11, 0.06)',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                borderRadius: '10px',
                                padding: '14px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label className="cs-label" style={{ fontWeight: 700, color: 'var(--cs-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Clock size={14} color="#F59E0B" /> Scheduled Send Date & Time <span style={{ color: '#EF4444' }}>*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="cs-input"
                                            required={form.status === 'scheduled'}
                                            value={form.scheduledAt}
                                            min={new Date().toISOString().slice(0, 16)}
                                            onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
                                            style={{ background: 'var(--cs-surface)' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="cs-label" style={{ fontWeight: 500, color: 'var(--cs-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} /> Expiration Date (Optional)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="cs-input"
                                            value={form.expiresAt}
                                            min={form.scheduledAt || new Date().toISOString().slice(0, 16)}
                                            onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                                            style={{ background: 'var(--cs-surface)' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Info size={13} color="#F59E0B" />
                                    {form.scheduledAt
                                        ? `Notice will be dispatched automatically on ${new Date(form.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.`
                                        : 'Please specify the exact date and time when this notice should be published and sent.'}
                                </div>
                            </div>
                        )}

                        {/* Optional expiration when sending now */}
                        {form.status === 'published' && (
                            <div>
                                <label className="cs-label" style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                    Notice Expiration Date (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    className="cs-input"
                                    value={form.expiresAt}
                                    min={new Date().toISOString().slice(0, 16)}
                                    onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                                    style={{ maxWidth: '300px' }}
                                />
                            </div>
                        )}

                        {formError && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{formError}</div>}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button type="button" className="btn-secondary" onClick={() => setComposing(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                type="submit"
                                disabled={saving || form.channels.length === 0}
                                style={form.status === 'scheduled' ? { background: '#F59E0B', borderColor: '#D97706', color: '#FFFFFF' } : form.status === 'draft' ? { background: '#64748B', borderColor: '#475569', color: '#FFFFFF' } : undefined}
                            >
                                {form.status === 'scheduled' ? (
                                    <>
                                        <Calendar size={14} /> {saving ? 'Scheduling…' : 'Schedule Notice'}
                                    </>
                                ) : form.status === 'draft' ? (
                                    <>
                                        <FileText size={14} /> {saving ? 'Saving…' : 'Save as Draft'}
                                    </>
                                ) : (
                                    <>
                                        <Send size={14} /> {saving ? 'Sending…' : 'Publish & Send Now'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
