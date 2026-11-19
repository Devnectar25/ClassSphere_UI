'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import { Trophy, Star, Award, Medal, Camera, Eye, Lock, Globe, Users, Plus } from 'lucide-react';
import React, { useState } from 'react';
import { api, useApi, formatDate, initials } from '@/lib/api';
import { can, useSession } from '@/lib/session';

interface Achievement {
    achievementId: string;
    studentName: string;
    title: string;
    category: string;
    level: string;
    visibility: string;
    awardDate: string;
    issuer: string;
    grade: string | null;
    remarks: string | null;
    hasPhoto: boolean;
}

interface StudentSearch {
    total: number;
    students: Array<{
        studentId: string;
        firstName: string;
        lastName: string;
        enrollmentNumber: string;
    }>;
}

const visibilityConfig: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    public: { label: 'Public', icon: Globe, cls: 'badge-success' },
    batch: { label: 'Batch', icon: Users, cls: 'badge-info' },
    guardian: { label: 'Guardian', icon: Eye, cls: 'badge-warning' },
    private: { label: 'Private', icon: Lock, cls: 'badge-secondary' },
};

const levelConfig: Record<string, string> = {
    National: '#EF4444',
    State: '#F59E0B',
    District: '#6C63FF',
    City: '#06B6D4',
    Institute: '#10B981',
};

const categoryColor: Record<string, string> = {
    Distinction: '#F59E0B',
    Honors: '#06B6D4',
    Competition: '#6C63FF',
    Certification: '#10B981',
};

const emptyForm = {
    studentId: '',
    title: '',
    category: 'Competition',
    level: 'National',
    visibility: 'public',
    awardDate: new Date().toISOString().split('T')[0],
    issuer: '',
    grade: '',
    remarks: '',
};

export default function AchievementsPage() {
    const session = useSession();
    const { data: achievements, error, reload } = useApi<Achievement[]>('/achievements');
    const { data: studentData } = useApi<StudentSearch>('/students?limit=200');
    const [filter, setFilter] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const students = studentData?.students ?? [];
    const count = (levels: string[]) => achievements?.filter(a => levels.includes(a.level)).length ?? 0;
    const stats = [
        { label: 'Total Achievements', value: achievements?.length ?? 0, icon: Trophy, color: '#F59E0B' },
        { label: 'National / State', value: count(['National', 'State']), icon: Medal, color: '#EF4444' },
        { label: 'District / City', value: count(['District', 'City']), icon: Award, color: '#6C63FF' },
        { label: 'Institute Level', value: count(['Institute']), icon: Star, color: '#10B981' },
    ];
    const categories = ['All', ...new Set(achievements?.map(a => a.category))];
    const visible = achievements?.filter(a => filter === 'All' || a.category === filter) ?? [];

    const handleCreateAchievement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.studentId) {
            setFormError('Please select a student.');
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            await api('/achievements', {
                method: 'POST',
                body: JSON.stringify(form),
            });
            setShowModal(false);
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
            <Topbar title="Achievements" subtitle="Celebrate and showcase student accomplishments" />
            <div className="page-body">

                {/* Header stats */}
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

                {/* Filter & Action bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>Filter:</span>
                        {categories.map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{
                                    padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                    cursor: 'pointer', border: '1px solid var(--cs-border)',
                                    background: f === filter ? 'rgba(108,99,255,0.15)' : 'transparent',
                                    color: f === filter ? '#8B85FF' : 'var(--cs-text-muted)',
                                    transition: 'all 0.2s'
                                }}
                            >{f}</button>
                        ))}
                    </div>

                    {can(session, 'students.write') && (
                        <button
                            className="btn-primary"
                            onClick={() => { setForm(emptyForm); setFormError(null); setShowModal(true); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px', borderRadius: '10px' }}
                        >
                            <Plus size={16} /> New Achievement
                        </button>
                    )}
                </div>

                {/* Achievement cards */}
                {!achievements ? <PageState error={error} /> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                        {visible.map(ach => {
                            const vc = visibilityConfig[ach.visibility] ?? visibilityConfig.private;
                            const color = categoryColor[ach.category] ?? '#6C63FF';
                            const levelColor = levelConfig[ach.level] ?? '#64748B';
                            return (
                                <div key={ach.achievementId} className="cs-card" style={{ padding: '0', overflow: 'hidden' }}>
                                    {/* Coloured top bar */}
                                    <div style={{ height: '6px', background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
                                    <div style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div className="avatar-placeholder" style={{ width: 36, height: 36, fontSize: '12px' }}>{initials(ach.studentName)}</div>
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>{ach.studentName}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{formatDate(ach.awardDate)}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <span className={`badge ${vc.cls}`}><vc.icon size={10} /> {vc.label}</span>
                                                <span style={{
                                                    padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700,
                                                    background: `${levelColor}20`, color: levelColor, border: `1px solid ${levelColor}30`
                                                }}>{ach.level}</span>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--cs-text-primary)', lineHeight: 1.3, marginBottom: '4px' }}>
                                                🏆 {ach.title}
                                            </div>
                                            <span className="badge badge-secondary" style={{ fontSize: '10px' }}>{ach.category}{ach.grade ? ` • ${ach.grade}` : ''}</span>
                                            <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginLeft: '8px' }}>by {ach.issuer}</span>
                                        </div>

                                        {ach.remarks && <p style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>{ach.remarks}</p>}

                                        {ach.hasPhoto && (
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                fontSize: '11px', color: 'var(--cs-text-muted)', background: 'var(--cs-surface-2)',
                                                padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--cs-border)'
                                            }}>
                                                <Camera size={12} /> Photo attached
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: New Achievement */}
            {showModal && (
                <Modal title="New Student Achievement" onClose={() => setShowModal(false)} maxWidth="660px">
                    <form onSubmit={handleCreateAchievement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label className="cs-label">Student <span style={{ color: '#EF4444' }}>*</span></label>
                            <select
                                className="cs-input"
                                required
                                value={form.studentId}
                                onChange={e => setForm({ ...form, studentId: e.target.value })}
                            >
                                <option value="">— Select Student —</option>
                                {students.map(s => (
                                    <option key={s.studentId} value={s.studentId}>
                                        {s.firstName} {s.lastName} ({s.enrollmentNumber})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="cs-label">Achievement Title <span style={{ color: '#EF4444' }}>*</span></label>
                            <input
                                className="cs-input"
                                required
                                placeholder="e.g. Regional Theory Olympiad — Finalist"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Category <span style={{ color: '#EF4444' }}>*</span></label>
                                <select
                                    className="cs-input"
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                >
                                    <option value="Competition">Competition</option>
                                    <option value="Distinction">Distinction</option>
                                    <option value="Certification">Certification</option>
                                    <option value="Honors">Honors</option>
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">Level <span style={{ color: '#EF4444' }}>*</span></label>
                                <select
                                    className="cs-input"
                                    value={form.level}
                                    onChange={e => setForm({ ...form, level: e.target.value })}
                                >
                                    <option value="Institute">Institute</option>
                                    <option value="City">City</option>
                                    <option value="District">District</option>
                                    <option value="State">State</option>
                                    <option value="National">National</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Award Date <span style={{ color: '#EF4444' }}>*</span></label>
                                <input
                                    className="cs-input"
                                    type="date"
                                    required
                                    value={form.awardDate}
                                    onChange={e => setForm({ ...form, awardDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="cs-label">Visibility <span style={{ color: '#EF4444' }}>*</span></label>
                                <select
                                    className="cs-input"
                                    value={form.visibility}
                                    onChange={e => setForm({ ...form, visibility: e.target.value })}
                                >
                                    <option value="public">Public (Showcase)</option>
                                    <option value="batch">Batch Only</option>
                                    <option value="guardian">Guardian & Student</option>
                                    <option value="private">Private</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Awarding Body / Issuer <span style={{ color: '#EF4444' }}>*</span></label>
                                <input
                                    className="cs-input"
                                    required
                                    placeholder="e.g. Apex Conservatory Faculty"
                                    value={form.issuer}
                                    onChange={e => setForm({ ...form, issuer: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="cs-label">Grade / Distinction (optional)</label>
                                <input
                                    className="cs-input"
                                    placeholder="e.g. Grade VII, 1st Place"
                                    value={form.grade}
                                    onChange={e => setForm({ ...form, grade: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="cs-label">Remarks / Description (optional)</label>
                            <textarea
                                className="cs-input"
                                rows={3}
                                placeholder="Add notes, citations or achievement details..."
                                value={form.remarks}
                                onChange={e => setForm({ ...form, remarks: e.target.value })}
                            />
                        </div>

                        {formError && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{formError}</div>}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-primary" type="submit" disabled={saving}>
                                {saving ? 'Saving…' : 'Save Achievement'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
