'use client';
import { useState } from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';
import { can, selectBranch, useSession } from '@/lib/session';
import { Building2, MapPin, Phone, Users, BookOpen } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';

export default function BranchesPage() {
    const { workspace, reload } = useWorkspace();
    const session = useSession();
    const limits = workspace?.entitlements.branches;
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState({ name: '', code: '', address: '', phone: '' });
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await api('/branches', { method: 'POST', body: JSON.stringify(form) });
            setAdding(false);
            setForm({ name: '', code: '', address: '', phone: '' });
            reload();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    return (
        <>
            <Topbar title="Branches" subtitle={limits ? `${limits.current} of ${limits.maximum} branches used on your plan` : 'Manage branch locations, contacts, and capacity'}
                action={can(session, 'branches.write') ? { label: 'Add Branch', onClick: () => setAdding(true) } : undefined} />
            <div className="page-body">
                {!workspace ? <PageState error={null} /> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                        {workspace.branches.map(b => (
                            <div key={b.branchId} className="cs-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Building2 size={20} color="#8B85FF" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--cs-text-primary)' }}>{b.name}</div>
                                            <code style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{b.code}{b.isPrimary ? ' • Primary' : ''}</code>
                                        </div>
                                    </div>
                                    <span className={`badge ${b.isActive ? 'badge-success' : 'badge-secondary'}`}>{b.isActive ? 'active' : 'inactive'}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: 'var(--cs-text-secondary)' }}>
                                        <MapPin size={14} style={{ marginTop: '1px', flexShrink: 0, color: 'var(--cs-text-muted)' }} /> {b.address ?? '—'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: 'var(--cs-text-secondary)' }}>
                                        <Phone size={13} color="var(--cs-text-muted)" /> {b.phone ?? '—'}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {[
                                        { label: 'Students', value: b.studentCount, icon: Users, color: '#6C63FF' },
                                        { label: 'Batches', value: b.batchCount, icon: BookOpen, color: '#10B981' },
                                        { label: 'Head', value: b.headName ?? '—', icon: Users, color: '#F59E0B' },
                                    ].map(stat => (
                                        <div key={stat.label} style={{ background: 'var(--cs-surface-2)', borderRadius: '10px', padding: '10px', textAlign: 'center', border: '1px solid var(--cs-border)' }}>
                                            <div style={{ fontSize: stat.label === 'Head' ? '12px' : '16px', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                                {!session?.session.branchId && (
                                    <button className={session?.selectedBranchId === b.branchId ? 'btn-primary' : 'btn-secondary'}
                                        style={{ width: '100%', justifyContent: 'center', marginTop: '16px', fontSize: '12px' }}
                                        onClick={() => selectBranch(session?.selectedBranchId === b.branchId ? null : b.branchId)}>
                                        {session?.selectedBranchId === b.branchId ? 'Viewing this branch — show all branches' : 'Manage this branch'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {adding && (
                <Modal title="Add Branch" onClose={() => setAdding(false)}>
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Branch Name</label>
                                <input className="cs-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Code</label>
                                <input className="cs-input" required maxLength={10} placeholder="e.g. NORTH" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                            </div>
                        </div>
                        <div>
                            <label className="cs-label">Address</label>
                            <input className="cs-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                        </div>
                        <div>
                            <label className="cs-label">Phone</label>
                            <input className="cs-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        {error && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{error}</div>}
                        <button className="btn-primary" type="submit" style={{ alignSelf: 'flex-end' }}>Create Branch</button>
                    </form>
                </Modal>
            )}
        </>
    );
}
