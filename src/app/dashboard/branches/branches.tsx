'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import CountryPhoneInput, { COUNTRIES, type CountryOption, validatePhoneNumber } from '@/components/CountryPhoneInput';
import { api, useApi } from '@/lib/api';
import { can, selectBranch, useSession } from '@/lib/session';
import {
    Building2, MapPin, Phone, Users, BookOpen, Pencil, Check,
    ExternalLink, ArrowRight, Calendar, UserCheck, CheckCircle2, X
} from 'lucide-react';
import { useWorkspace, type Branch } from '@/lib/workspace';

interface BatchItem {
    batchId: string;
    branchId?: string;
    branchName?: string;
    name: string;
    courseTitle: string;
    instructorName: string | null;
    capacity: number;
    enrolledCount: number;
    status: string;
    room: string | null;
}

export default function BranchesPage() {
    const router = useRouter();
    const { workspace, reload } = useWorkspace();
    const session = useSession();
    const { data: staffList } = useApi<Array<{ userId: string; fullName: string; role: string }>>('/staff');
    const { data: allBatches } = useApi<BatchItem[]>('/batches');
    const limits = workspace?.entitlements.branches;
    const canManage = can(session, 'branches.write');

    // Add branch state
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState({ name: '', code: '', address: '', phone: '' });
    const [phoneCountry, setPhoneCountry] = useState<CountryOption>(COUNTRIES[0]);
    const [phoneError, setPhoneError] = useState('');
    const [phoneTouched, setPhoneTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit branch state
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [editForm, setEditForm] = useState({
        branchId: '',
        name: '',
        code: '',
        address: '',
        phone: '',
        headUserId: '',
        isPrimary: false,
        isActive: true,
    });
    const [editPhoneCountry, setEditPhoneCountry] = useState<CountryOption>(COUNTRIES[0]);
    const [editPhoneError, setEditPhoneError] = useState('');
    const [editPhoneTouched, setEditPhoneTouched] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    // Manage branch modal state
    const [managingBranch, setManagingBranch] = useState<Branch | null>(null);

    const submitAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const phoneDigits = form.phone ? form.phone.replace(/\D/g, '') : '';
        if (phoneDigits) {
            const phoneErr = validatePhoneNumber(phoneDigits, phoneCountry, false);
            if (phoneErr) {
                setPhoneError(phoneErr);
                setPhoneTouched(true);
                return;
            }
        }

        setSaving(true);
        try {
            const finalPhone = phoneDigits ? `${phoneCountry.dialCode} ${phoneDigits}`.trim() : null;
            await api('/branches', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    phone: finalPhone,
                }),
            });
            setAdding(false);
            setForm({ name: '', code: '', address: '', phone: '' });
            setPhoneCountry(COUNTRIES[0]);
            setPhoneError('');
            setPhoneTouched(false);
            reload();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const openEdit = (b: Branch) => {
        const matchCountry = COUNTRIES.find(c => b.phone && b.phone.startsWith(c.dialCode)) || COUNTRIES[0];
        const rawDigits = b.phone ? b.phone.replace(matchCountry.dialCode, '').trim() : '';
        const headMember = staffList?.find(s => s.fullName.toLowerCase() === (b.headName || '').toLowerCase());

        setEditForm({
            branchId: b.branchId,
            name: b.name,
            code: b.code,
            address: b.address ?? '',
            phone: rawDigits,
            headUserId: headMember?.userId ?? '',
            isPrimary: b.isPrimary,
            isActive: b.isActive,
        });
        setEditPhoneCountry(matchCountry);
        setEditPhoneError('');
        setEditPhoneTouched(false);
        setEditError(null);
        setEditingBranch(b);
    };

    const submitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEditError(null);

        const phoneDigits = editForm.phone ? editForm.phone.replace(/\D/g, '') : '';
        if (phoneDigits) {
            const phoneErr = validatePhoneNumber(phoneDigits, editPhoneCountry, false);
            if (phoneErr) {
                setEditPhoneError(phoneErr);
                setEditPhoneTouched(true);
                return;
            }
        }

        setEditSaving(true);
        try {
            const finalPhone = phoneDigits ? `${editPhoneCountry.dialCode} ${phoneDigits}`.trim() : null;
            await api('/branches', {
                method: 'PUT',
                body: JSON.stringify({
                    branchId: editForm.branchId,
                    name: editForm.name.trim(),
                    code: editForm.code.trim().toUpperCase(),
                    address: editForm.address.trim() || null,
                    phone: finalPhone,
                    headUserId: editForm.headUserId || null,
                    isPrimary: editForm.isPrimary,
                    isActive: editForm.isActive,
                }),
            });
            setEditingBranch(null);
            reload();
        } catch (err) {
            setEditError((err as Error).message);
        } finally {
            setEditSaving(false);
        }
    };

    const handleManageBranch = (b: Branch) => {
        // Automatically activate this branch view in session
        selectBranch(b.branchId);
        setManagingBranch(b);
    };

    const handleClearBranchFilter = () => {
        selectBranch(null);
    };

    // Filter batches for managing branch
    const branchBatches = managingBranch
        ? (allBatches?.filter(bt =>
            (bt.branchId && bt.branchId === managingBranch.branchId) ||
            bt.branchName?.toLowerCase() === managingBranch.name.toLowerCase()
        ) ?? [])
        : [];

    return (
        <>
            <Topbar
                title="Branches"
                subtitle={limits ? `${limits.current} of ${limits.maximum} branches used on your plan` : 'Manage branch locations, contacts, and capacity'}
                action={canManage ? { label: 'Add Branch', onClick: () => setAdding(true) } : undefined}
            />
            <div className="page-body">
                {!workspace ? <PageState error={null} /> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                        {workspace.branches.map(b => {
                            const isCurrentScope = session?.selectedBranchId === b.branchId;

                            return (
                                <div
                                    key={b.branchId}
                                    className="cs-card"
                                    style={{
                                        padding: '24px',
                                        position: 'relative',
                                        border: isCurrentScope ? '2px solid var(--cs-primary)' : '1px solid var(--cs-border)',
                                        boxShadow: isCurrentScope ? '0 4px 16px rgba(108, 99, 255, 0.12)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: '12px',
                                                background: isCurrentScope ? 'rgba(108,99,255,0.22)' : 'rgba(108,99,255,0.15)',
                                                border: '1px solid rgba(108,99,255,0.25)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Building2 size={20} color="#8B85FF" />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--cs-text-primary)' }}>{b.name}</div>
                                                <code style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{b.code}{b.isPrimary ? ' • Primary' : ''}</code>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {isCurrentScope && (
                                                <span className="badge badge-primary" style={{ fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px' }}>
                                                    <Check size={10} /> Active View
                                                </span>
                                            )}
                                            <span className={`badge ${b.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                {b.isActive ? 'active' : 'inactive'}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: 'var(--cs-text-secondary)' }}>
                                            <MapPin size={14} style={{ marginTop: '1px', flexShrink: 0, color: 'var(--cs-text-muted)' }} />
                                            <span>{[b.address, b.location, b.city, b.state].filter(Boolean).join(', ') || b.address || '—'}</span>
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

                                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                        <button
                                            type="button"
                                            className={isCurrentScope ? 'btn-primary' : 'btn-secondary'}
                                            style={{
                                                flex: 1,
                                                justifyContent: 'center',
                                                fontSize: '12.5px',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                            onClick={() => handleManageBranch(b)}
                                        >
                                            <Building2 size={13} />
                                            Manage this branch
                                        </button>
                                        {canManage && (
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={() => openEdit(b)}
                                                title={`Edit ${b.name}`}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '5px',
                                                    fontSize: '12px',
                                                    padding: '0 14px',
                                                    fontWeight: 600,
                                                    color: 'var(--cs-primary)',
                                                    borderColor: 'rgba(108, 99, 255, 0.3)'
                                                }}
                                            >
                                                <Pencil size={12} /> Edit
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Manage Branch Modal */}
            {managingBranch && (
                <Modal
                    title={`Manage Branch: ${managingBranch.name}`}
                    onClose={() => setManagingBranch(null)}
                    maxWidth="640px"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* Branch Banner Card */}
                        <div style={{
                            background: 'var(--cs-surface-2)',
                            border: '1px solid var(--cs-border)',
                            borderRadius: '10px',
                            padding: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '12px',
                                    background: 'rgba(108,99,255,0.15)',
                                    border: '1px solid rgba(108,99,255,0.25)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Building2 size={24} color="#6C63FF" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>
                                        {managingBranch.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <code>{managingBranch.code}</code>
                                        {managingBranch.isPrimary && <span className="badge badge-primary">Primary Campus</span>}
                                        <span className={`badge ${managingBranch.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                            {managingBranch.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => { setManagingBranch(null); openEdit(managingBranch); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
                            >
                                <Pencil size={12} /> Edit Details
                            </button>
                        </div>

                        {/* Location & Contact Details */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                            <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-border)', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Location & Address</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cs-text-primary)', fontWeight: 500 }}>
                                    <MapPin size={14} color="var(--cs-text-muted)" /> {managingBranch.address || 'No address specified'}
                                </div>
                            </div>
                            <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-border)', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Contact Phone</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cs-text-primary)', fontWeight: 500 }}>
                                    <Phone size={14} color="var(--cs-text-muted)" /> {managingBranch.phone || 'No phone provided'}
                                </div>
                            </div>
                        </div>

                        {/* Active Workspace View Notification */}
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            background: 'rgba(108, 99, 255, 0.08)',
                            border: '1px solid rgba(108, 99, 255, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={16} color="var(--cs-primary)" />
                                <span style={{ fontSize: '13px', color: 'var(--cs-text-primary)', fontWeight: 600 }}>
                                    Active Workspace View: {managingBranch.name}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {session?.selectedBranchId === managingBranch.branchId ? (
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={handleClearBranchFilter}
                                        style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', padding: '4px 8px' }}
                                    >
                                        Show All Branches
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={() => selectBranch(managingBranch.branchId)}
                                        style={{ fontSize: '12px', padding: '4px 10px' }}
                                    >
                                        Switch To This Branch
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Batches running in this Branch */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>
                                    Batches at this Branch ({branchBatches.length})
                                </div>
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    onClick={() => {
                                        selectBranch(managingBranch.branchId);
                                        setManagingBranch(null);
                                        router.push(`/dashboard/batches?branchId=${managingBranch.branchId}`);
                                    }}
                                    style={{ fontSize: '12px', color: 'var(--cs-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                    Open Batches & Schedule <ArrowRight size={12} />
                                </button>
                            </div>

                            <div style={{
                                background: 'var(--cs-surface-2)',
                                border: '1px solid var(--cs-border)',
                                borderRadius: '8px',
                                maxHeight: '180px',
                                overflowY: 'auto'
                            }}>
                                {branchBatches.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--cs-text-muted)', fontSize: '13px' }}>
                                        No batches created under this branch yet.
                                    </div>
                                ) : (
                                    branchBatches.map(bt => (
                                        <div
                                            key={bt.batchId}
                                            style={{
                                                padding: '10px 14px',
                                                borderBottom: '1px solid var(--cs-border)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontSize: '13px'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                                    {bt.name} <span style={{ color: 'var(--cs-text-muted)', fontWeight: 400 }}>• {bt.courseTitle}</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>
                                                    Instructor: {bt.instructorName || 'Unassigned'} {bt.room ? `• Room: ${bt.room}` : ''}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                                                    {bt.enrolledCount} / {bt.capacity} Enrolled
                                                </span>
                                                <span className={`badge ${bt.status === 'active' ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '10px' }}>
                                                    {bt.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Quick Action Navigation Grid */}
                        <div>
                            <div style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--cs-text-muted)', marginBottom: '8px' }}>
                                Branch Quick Management
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        selectBranch(managingBranch.branchId);
                                        setManagingBranch(null);
                                        router.push('/dashboard/batches');
                                    }}
                                    style={{ padding: '12px 10px', flexDirection: 'column', gap: '6px', height: 'auto', textAlign: 'center' }}
                                >
                                    <BookOpen size={18} color="var(--cs-primary)" />
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Manage Batches</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        selectBranch(managingBranch.branchId);
                                        setManagingBranch(null);
                                        router.push('/dashboard/students');
                                    }}
                                    style={{ padding: '12px 10px', flexDirection: 'column', gap: '6px', height: 'auto', textAlign: 'center' }}
                                >
                                    <Users size={18} color="#10B981" />
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Manage Students</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        selectBranch(managingBranch.branchId);
                                        setManagingBranch(null);
                                        router.push('/dashboard/attendance');
                                    }}
                                    style={{ padding: '12px 10px', flexDirection: 'column', gap: '6px', height: 'auto', textAlign: 'center' }}
                                >
                                    <UserCheck size={18} color="#F59E0B" />
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Attendance</span>
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setManagingBranch(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Add Branch Modal */}
            {adding && (
                <Modal
                    title="Add Branch"
                    onClose={() => { setAdding(false); setError(null); setPhoneError(''); setPhoneTouched(false); }}
                    maxWidth="540px"
                    style={{ overflow: 'visible' }}
                >
                    <form onSubmit={submitAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Branch Name *</label>
                                <input className="cs-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Code *</label>
                                <input className="cs-input" required maxLength={10} placeholder="e.g. NORTH" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                            </div>
                        </div>
                        <div>
                            <label className="cs-label">Address</label>
                            <input className="cs-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                        </div>
                        <div>
                            <label className="cs-label">Phone</label>
                            <CountryPhoneInput
                                value={form.phone}
                                selectedCountry={phoneCountry}
                                onCountryChange={country => {
                                    setPhoneCountry(country);
                                    if (phoneTouched && form.phone) {
                                        setPhoneError(validatePhoneNumber(form.phone, country, false));
                                    }
                                }}
                                onChange={(val: string, country: CountryOption) => {
                                    setForm(f => ({ ...f, phone: val }));
                                    setPhoneCountry(country);
                                    if (phoneTouched) {
                                        setPhoneError(validatePhoneNumber(val, country, false));
                                    }
                                }}
                                onBlur={() => {
                                    setPhoneTouched(true);
                                    if (form.phone) {
                                        setPhoneError(validatePhoneNumber(form.phone, phoneCountry, false));
                                    }
                                }}
                                touched={phoneTouched}
                                error={phoneError}
                                placeholder="e.g. 9840012345"
                            />
                        </div>
                        {error && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{error}</div>}
                        <button className="btn-primary" type="submit" disabled={saving} style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Check size={14} />
                            {saving ? 'Creating…' : 'Create Branch'}
                        </button>
                    </form>
                </Modal>
            )}

            {/* Edit Branch Modal */}
            {editingBranch && (
                <Modal
                    title={`Edit Branch: ${editingBranch.name}`}
                    onClose={() => { setEditingBranch(null); setEditError(null); setEditPhoneError(''); setEditPhoneTouched(false); }}
                    maxWidth="540px"
                    style={{ overflow: 'visible' }}
                >
                    <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Branch Name *</label>
                                <input
                                    className="cs-input"
                                    required
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="cs-label">Code *</label>
                                <input
                                    className="cs-input"
                                    required
                                    maxLength={10}
                                    value={editForm.code}
                                    onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="cs-label">Address</label>
                            <input
                                className="cs-input"
                                placeholder="e.g. Baner, Pune"
                                value={editForm.address}
                                onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="cs-label">Phone</label>
                            <CountryPhoneInput
                                value={editForm.phone}
                                selectedCountry={editPhoneCountry}
                                onCountryChange={country => {
                                    setEditPhoneCountry(country);
                                    if (editPhoneTouched && editForm.phone) {
                                        setEditPhoneError(validatePhoneNumber(editForm.phone, country, false));
                                    }
                                }}
                                onChange={(val: string, country: CountryOption) => {
                                    setEditForm(f => ({ ...f, phone: val }));
                                    setEditPhoneCountry(country);
                                    if (editPhoneTouched) {
                                        setEditPhoneError(validatePhoneNumber(val, country, false));
                                    }
                                }}
                                onBlur={() => {
                                    setEditPhoneTouched(true);
                                    if (editForm.phone) {
                                        setEditPhoneError(validatePhoneNumber(editForm.phone, editPhoneCountry, false));
                                    }
                                }}
                                touched={editPhoneTouched}
                                error={editPhoneError}
                                placeholder="e.g. 9878637838"
                            />
                        </div>

                        <div>
                            <label className="cs-label">Branch Head</label>
                            <select
                                className="cs-input"
                                value={editForm.headUserId}
                                onChange={e => setEditForm({ ...editForm, headUserId: e.target.value })}
                            >
                                <option value="">No Head Assigned</option>
                                {staffList?.map(s => (
                                    <option key={s.userId} value={s.userId}>
                                        {s.fullName} ({s.role})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '4px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                <input
                                    type="checkbox"
                                    checked={editForm.isPrimary}
                                    onChange={e => setEditForm({ ...editForm, isPrimary: e.target.checked })}
                                />
                                <span>Primary Campus</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                <input
                                    type="checkbox"
                                    checked={editForm.isActive}
                                    onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
                                />
                                <span>Active Branch</span>
                            </label>
                        </div>

                        {editError && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{editError}</div>}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setEditingBranch(null)}
                                disabled={editSaving}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                type="submit"
                                disabled={editSaving}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Check size={14} />
                                {editSaving ? 'Saving Changes…' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
