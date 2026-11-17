'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import { Trophy, Star, Award, Medal, Camera, Eye, Lock, Globe, Users } from 'lucide-react';
import React, { useState } from 'react';
import { useApi, formatDate, initials } from '@/lib/api';

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

export default function AchievementsPage() {
    const { data: achievements, error } = useApi<Achievement[]>('/achievements');
    const [filter, setFilter] = useState('All');

    const count = (levels: string[]) => achievements?.filter(a => levels.includes(a.level)).length ?? 0;
    const stats = [
        { label: 'Total Achievements', value: achievements?.length ?? 0, icon: Trophy, color: '#F59E0B' },
        { label: 'National / State', value: count(['National', 'State']), icon: Medal, color: '#EF4444' },
        { label: 'District / City', value: count(['District', 'City']), icon: Award, color: '#6C63FF' },
        { label: 'Institute Level', value: count(['Institute']), icon: Star, color: '#10B981' },
    ];
    const categories = ['All', ...new Set(achievements?.map(a => a.category))];
    const visible = achievements?.filter(a => filter === 'All' || a.category === filter) ?? [];

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

                {/* Filter bar */}
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
        </>
    );
}
