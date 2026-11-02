'use client';
import Link from 'next/link';
import { useState } from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import { BookOpen, Clock, Users, Tag, Calendar, Plus, X } from 'lucide-react';
import { api, useApi, formatMoney } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';
import { COURSE_CATALOGUE } from '@/lib/academy';

interface Course {
    courseId: string;
    title: string;
    code: string;
    category: string;
    level: string | null;
    durationMonths: number | null;
    tuitionAmount: number;
    billingPeriod: string;
    isActive: boolean;
    batchCount: number;
    studentCount: number;
    subjects: Array<{ subjectId: string; name: string }>;
}

const emptyCourse = { title: '', code: '', category: '', level: '', durationMonths: '12', tuitionAmount: '', billingPeriod: 'monthly', subjects: [] as string[] };

export default function CoursesPage() {
    const session = useSession();
    const { workspace, currency } = useWorkspace();
    const { data: courses, error, reload } = useApi<Course[]>('/courses');
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState(emptyCourse);
    const [subjectInput, setSubjectInput] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const canManage = can(session, 'courses.write');

    const catalogue = COURSE_CATALOGUE[workspace?.organization.academyType ?? 'Other'] ?? COURSE_CATALOGUE.Other;
    const suggestions = (catalogue[form.category] ?? []).filter(s => !form.subjects.includes(s));

    const addSubject = (name: string) => {
        const value = name.trim();
        if (value && !form.subjects.includes(value)) setForm(f => ({ ...f, subjects: [...f.subjects, value] }));
        setSubjectInput('');
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        try {
            await api('/courses', { method: 'POST', body: JSON.stringify(form) });
            setCreating(false);
            setForm(emptyCourse);
            reload();
        } catch (err) {
            setMessage((err as Error).message);
        }
    };

    const addSubjectToCourse = async (course: Course) => {
        const subject = prompt(`New subject for ${course.title}`);
        if (!subject?.trim()) return;
        try {
            await api('/courses', { method: 'PUT', body: JSON.stringify({ courseId: course.courseId, subject }) });
            reload();
        } catch (err) {
            alert((err as Error).message);
        }
    };

    return (
        <>
            <Topbar title="Courses" subtitle="Course catalogue with subjects, tuition and enrollment"
                action={canManage ? { label: 'Create Course', onClick: () => { setForm({ ...emptyCourse, category: Object.keys(catalogue)[0] ?? '' }); setCreating(true); } } : undefined} />
            <div className="page-body">
                {!courses ? <PageState error={error} /> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                        {courses.length === 0 && <PageState error="No courses yet — create your first course." />}
                        {courses.map(c => (
                            <div key={c.courseId} className="cs-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <BookOpen size={18} color="#6C63FF" />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--cs-text-primary)' }}>{c.title}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>{c.code} • {formatMoney(c.tuitionAmount, currency)} / {c.billingPeriod}</div>
                                        </div>
                                    </div>
                                    <span className={`badge ${c.isActive ? 'badge-success' : 'badge-secondary'}`}>{c.isActive ? 'active' : 'draft'}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <span className="badge badge-secondary"><Tag size={10} /> {c.category}</span>
                                    {c.level && <span className="badge badge-info"><Users size={10} /> {c.level}</span>}
                                    {c.durationMonths && <span className="badge badge-secondary"><Clock size={10} /> {c.durationMonths} months</span>}
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cs-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Subjects</div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {c.subjects.length === 0 && <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>No subjects yet</span>}
                                        {c.subjects.map(s => <span key={s.subjectId} className="badge badge-primary">{s.name}</span>)}
                                        {canManage && (
                                            <button className="badge badge-secondary" style={{ border: '1px dashed var(--cs-border)', cursor: 'pointer' }} onClick={() => addSubjectToCourse(c)}>
                                                <Plus size={10} /> Subject
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--cs-text-secondary)', borderTop: '1px solid var(--cs-border)', paddingTop: '10px', marginTop: 'auto' }}>
                                    <span>{c.batchCount} batches • {c.studentCount} students</span>
                                    {c.batchCount > 0 && (
                                        <Link href="/dashboard/batches" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--cs-primary)', fontWeight: 600 }}>
                                            <Calendar size={12} /> Batches
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {creating && (
                <Modal title={`Create ${workspace?.organization.academyType ?? ''} Course`} onClose={() => setCreating(false)}>
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                            <div>
                                <label className="cs-label">Course Title</label>
                                <input className="cs-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Code</label>
                                <input className="cs-input" required placeholder="e.g. SCI-10" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                            </div>
                            <div>
                                <label className="cs-label">Category</label>
                                <input className="cs-input" required list="course-categories" value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })} />
                                <datalist id="course-categories">
                                    {Object.keys(catalogue).map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="cs-label">Level</label>
                                <input className="cs-input" placeholder="e.g. Class 10" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Fee ({currency})</label>
                                <input className="cs-input" type="number" min="0" required value={form.tuitionAmount} onChange={e => setForm({ ...form, tuitionAmount: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                    <label className="cs-label">Billing</label>
                                    <select className="cs-input" value={form.billingPeriod} onChange={e => setForm({ ...form, billingPeriod: e.target.value })}>
                                        <option value="monthly">Monthly</option>
                                        <option value="term">Per term</option>
                                        <option value="annual">Annual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="cs-label">Months</label>
                                    <input className="cs-input" type="number" min="1" value={form.durationMonths} onChange={e => setForm({ ...form, durationMonths: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="cs-label">Subjects</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                {form.subjects.map(s => (
                                    <span key={s} className="badge badge-primary">
                                        {s}
                                        <button type="button" aria-label={`Remove ${s}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                                            onClick={() => setForm(f => ({ ...f, subjects: f.subjects.filter(x => x !== s) }))}>
                                            <X size={11} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input className="cs-input" placeholder="Type a subject and press Enter" value={subjectInput}
                                    onChange={e => setSubjectInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubject(subjectInput); } }} />
                                <button type="button" className="btn-secondary" onClick={() => addSubject(subjectInput)}>Add</button>
                            </div>
                            {suggestions.length > 0 && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>Suggested:</span>
                                    {suggestions.map(s => (
                                        <button type="button" key={s} className="badge badge-secondary" style={{ cursor: 'pointer', border: '1px dashed var(--cs-border)' }} onClick={() => addSubject(s)}>
                                            <Plus size={10} /> {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {message && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{message}</div>}
                        <button className="btn-primary" type="submit" disabled={form.subjects.length === 0} style={{ alignSelf: 'flex-end' }}>Create Course</button>
                    </form>
                </Modal>
            )}
        </>
    );
}
