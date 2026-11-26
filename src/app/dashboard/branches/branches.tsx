'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import CountryPhoneInput, { COUNTRIES, type CountryOption, validatePhoneNumber } from '@/components/CountryPhoneInput';
import { api, useApi, initials, formatMoney } from '@/lib/api';
import { can, selectBranch, useSession } from '@/lib/session';
import {
    Building2, MapPin, Phone, Users, BookOpen, Pencil, Check,
    ExternalLink, ArrowRight, Calendar, UserCheck, CheckCircle2, X,
    Trash2, AlertTriangle, GraduationCap
} from 'lucide-react';
import { useWorkspace, type Branch } from '@/lib/workspace';
import BranchManagerDropdown, { type StaffDropdownItem } from '@/components/BranchManagerDropdown';

interface CourseItem {
    courseId: string;
    title: string;
    code: string;
    category: string;
    level: string | null;
    branchId: string | null;
    branchName: string | null;
    tuitionAmount: number;
    billingPeriod: string;
    durationMonths: number | null;
    startDate: string | null;
    isActive: boolean;
    subjects: Array<{ name: string; subjectId: string }>;
    batchCount: number;
    studentCount: number;
}

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
    const { workspace, reload, currency } = useWorkspace();
    const session = useSession();
    const { data: staffList } = useApi<StaffDropdownItem[]>('/staff?branchId=all');
    const { data: allBatches } = useApi<BatchItem[]>('/batches?branchId=all');
    const { data: allCourses } = useApi<CourseItem[]>('/courses?branchId=all');
    const limits = workspace?.entitlements.branches;
    const canManage = can(session, 'branches.write');

    // Add branch state
    const [adding, setAdding] = useState(false);
    const [addHeadMode, setAddHeadMode] = useState<'select' | 'custom'>('select');
    const [form, setForm] = useState({
        name: '',
        code: '',
        address: '',
        phone: '',
        headUserId: '',
        headName: '',
        isPrimary: false,
        isActive: true,
    });
    const [phoneCountry, setPhoneCountry] = useState<CountryOption>(COUNTRIES[0]);
    const [phoneError, setPhoneError] = useState('');
    const [phoneTouched, setPhoneTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetAddForm = () => {
        setForm({
            name: '',
            code: '',
            address: '',
            phone: '',
            headUserId: '',
            headName: '',
            isPrimary: false,
            isActive: true,
        });
        setAddHeadMode(staffList && staffList.length > 0 ? 'select' : 'custom');
        setPhoneCountry(COUNTRIES[0]);
        setPhoneError('');
        setPhoneTouched(false);
        setError(null);
    };

    // Edit branch state
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [editHeadMode, setEditHeadMode] = useState<'select' | 'custom'>('select');
    const [editForm, setEditForm] = useState({
        branchId: '',
        name: '',
        code: '',
        address: '',
        phone: '',
        headUserId: '',
        headName: '',
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

    // Delete branch state
    const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
    const [deleteSaving, setDeleteSaving] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleDeleteBranch = async () => {
        if (!deletingBranch) return;
        setDeleteSaving(true);
        setDeleteError(null);
        try {
            await api(`/branches?branchId=${deletingBranch.branchId}`, {
                method: 'DELETE',
            });
            if (session?.selectedBranchId === deletingBranch.branchId) {
                selectBranch(null);
            }
            const deletedName = deletingBranch.name;
            setDeletingBranch(null);
            reload();
            setActionBanner({ type: 'success', text: `Branch "${deletedName}" has been successfully deleted.` });
        } catch (err) {
            setDeleteError((err as Error).message || 'Failed to delete branch.');
        } finally {
            setDeleteSaving(false);
        }
    };

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
                    name: form.name.trim(),
                    code: form.code.trim().toUpperCase(),
                    address: form.address.trim() || null,
                    phone: finalPhone,
                    headUserId: form.headUserId || null,
                    headName: form.headName.trim() || null,
                    isPrimary: form.isPrimary,
                    isActive: form.isActive,
                }),
            });
            const addedName = form.name.trim();
            setAdding(false);
            resetAddForm();
            reload();
            setActionBanner({ type: 'success', text: `Branch "${addedName}" has been successfully added.` });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const openEdit = (b: Branch) => {
        const matchCountry = COUNTRIES.find(c => b.phone && b.phone.startsWith(c.dialCode)) || COUNTRIES[0];
        const rawDigits = b.phone ? b.phone.replace(matchCountry.dialCode, '').trim() : '';
        const assignedManager = staffList?.find(s => s.role === 'BranchManager' && s.branchId === b.branchId);
        const currentManagerName = assignedManager?.fullName || b.headName || '';
        const headMember = staffList?.find(s => (assignedManager && s.userId === assignedManager.userId) || s.fullName.toLowerCase() === currentManagerName.toLowerCase());
        const hasMatchingStaff = !!headMember;
        const isCustom = !hasMatchingStaff && !!currentManagerName;

        setEditHeadMode(isCustom ? 'custom' : (staffList && staffList.length > 0 ? 'select' : 'custom'));
        setEditForm({
            branchId: b.branchId,
            name: b.name,
            code: b.code,
            address: b.address ?? '',
            phone: rawDigits,
            headUserId: headMember?.userId ?? assignedManager?.userId ?? '',
            headName: currentManagerName,
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
                    headName: editForm.headName.trim() || null,
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

    // Filter courses for managing branch
    const managingBranchCourses = managingBranch
        ? (allCourses?.filter(c =>
            c.branchId === managingBranch.branchId ||
            (!c.branchId && (c.branchName === 'All Branches' || !c.branchName))
        ) ?? [])
        : [];

    // Filter courses for editing branch
    const editingBranchCourses = editingBranch
        ? (allCourses?.filter(c =>
            c.branchId === editingBranch.branchId ||
            (!c.branchId && (c.branchName === 'All Branches' || !c.branchName))
        ) ?? [])
        : [];

    return (
        <>
            <Topbar
                title="Branches"
                subtitle={limits ? `${limits.current} of ${limits.maximum} branches used on your plan` : 'Manage branch locations, contacts, and capacity'}
                action={canManage ? { label: 'Add Branch', onClick: () => { resetAddForm(); setAdding(true); } } : undefined}
            />
            <div className="page-body">
                {/* Action Feedback Banner */}
                {actionBanner && (
                    <div
                        style={{
                            marginBottom: '16px',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            background: actionBanner.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                            border: `1px solid ${actionBanner.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
                            color: actionBanner.type === 'success' ? '#065F46' : '#991B1B',
                            fontSize: '13px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            animation: 'fadeIn 0.2s ease',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {actionBanner.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            <span>{actionBanner.text}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActionBanner(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0 4px', fontSize: '14px' }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {!workspace ? <PageState error={null} /> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '22px' }}>
                        {workspace.branches.map(b => {
                            const isCurrentScope = session?.selectedBranchId === b.branchId;
                            const assignedManager = staffList?.find(s => s.role === 'BranchManager' && s.branchId === b.branchId);
                            const managerName = assignedManager?.fullName || b.headName || null;
                            const branchCourses = allCourses?.filter(c =>
                                c.branchId === b.branchId ||
                                (!c.branchId && (c.branchName === 'All Branches' || !c.branchName))
                            ) ?? [];

                            return (
                                <div
                                    key={b.branchId}
                                    className="cs-card"
                                    style={{
                                        padding: '22px',
                                        position: 'relative',
                                        borderRadius: '16px',
                                        background: '#ffffff',
                                        border: isCurrentScope ? '2px solid var(--cs-primary)' : '1px solid var(--cs-border)',
                                        boxShadow: isCurrentScope
                                            ? '0 10px 25px -5px rgba(108, 99, 255, 0.16), 0 4px 10px -2px rgba(108, 99, 255, 0.08)'
                                            : '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                    }}
                                >
                                    <div>
                                        {/* Top Header: Icon + Name + Badges */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                                <div style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: '12px',
                                                    background: isCurrentScope
                                                        ? 'linear-gradient(135deg, rgba(108, 99, 255, 0.25) 0%, rgba(108, 99, 255, 0.1) 100%)'
                                                        : 'var(--cs-surface-2)',
                                                    border: isCurrentScope ? '1.5px solid rgba(108, 99, 255, 0.35)' : '1px solid var(--cs-border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <Building2 size={20} color={isCurrentScope ? 'var(--cs-primary)' : '#6B7280'} />
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--cs-text-primary)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {b.name}
                                                        </span>
                                                        {b.isPrimary && (
                                                            <span style={{
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.04em',
                                                                padding: '2px 7px',
                                                                borderRadius: '6px',
                                                                background: '#FEF3C7',
                                                                color: '#B45309',
                                                                border: '1px solid #FDE68A',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '3px'
                                                            }}>
                                                                ★ Primary
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                                                        <code style={{ fontSize: '11px', background: 'var(--cs-surface-2)', padding: '2px 6px', borderRadius: '4px', color: 'var(--cs-text-secondary)', fontWeight: 600 }}>
                                                            {b.code}
                                                        </code>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
                                                {isCurrentScope ? (
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        padding: '3px 10px',
                                                        borderRadius: '20px',
                                                        background: 'rgba(108, 99, 255, 0.12)',
                                                        color: 'var(--cs-primary)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        border: '1px solid rgba(108, 99, 255, 0.25)'
                                                    }}>
                                                        <Check size={12} strokeWidth={3} /> Active View
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        padding: '3px 8px',
                                                        borderRadius: '20px',
                                                        background: b.isActive ? '#ECFDF5' : 'var(--cs-surface-2)',
                                                        color: b.isActive ? '#059669' : 'var(--cs-text-muted)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        border: b.isActive ? '1px solid #A7F3D0' : '1px solid var(--cs-border)'
                                                    }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.isActive ? '#10B981' : '#9CA3AF' }} />
                                                        {b.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Location & Contact Information */}
                                        <div style={{
                                            background: 'var(--cs-surface-2)',
                                            borderRadius: '10px',
                                            padding: '10px 12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            marginBottom: '14px',
                                            border: '1px solid var(--cs-border)'
                                        }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: 'var(--cs-text-secondary)' }}>
                                                <MapPin size={14} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--cs-text-muted)' }} />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {[b.address, b.location, b.city, b.state].filter(Boolean).join(', ') || b.address || 'Location unconfigured'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12.5px', color: 'var(--cs-text-secondary)' }}>
                                                <Phone size={13} style={{ flexShrink: 0, color: 'var(--cs-text-muted)' }} />
                                                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{b.phone ?? 'No phone added'}</span>
                                            </div>
                                        </div>

                                        {/* Metrics & Head Ribbon */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(3, 1fr) 1.35fr',
                                            background: '#ffffff',
                                            border: '1px solid var(--cs-border)',
                                            borderRadius: '12px',
                                            padding: '10px 8px',
                                            gap: '6px',
                                            marginBottom: '16px'
                                        }}>
                                            {/* Stat 1: Students */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--cs-border)' }}>
                                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#6C63FF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                    {b.studentCount}
                                                </div>
                                                <div style={{ fontSize: '10.5px', color: 'var(--cs-text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                                                    <Users size={11} /> Students
                                                </div>
                                            </div>

                                            {/* Stat 2: Batches */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--cs-border)' }}>
                                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                    {b.batchCount}
                                                </div>
                                                <div style={{ fontSize: '10.5px', color: 'var(--cs-text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                                                    <BookOpen size={11} /> Batches
                                                </div>
                                            </div>

                                            {/* Stat 3: Courses */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--cs-border)' }}>
                                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#6366F1', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                    {branchCourses.length}
                                                </div>
                                                <div style={{ fontSize: '10.5px', color: 'var(--cs-text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                                                    <GraduationCap size={11} /> Courses
                                                </div>
                                            </div>

                                            {/* Stat 4: Branch Manager Persona */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', paddingLeft: '4px', minWidth: 0 }}>
                                                <div className="avatar-placeholder" style={{ width: 26, height: 26, fontSize: '10.5px', flexShrink: 0 }}>
                                                    {initials(managerName || '—')}
                                                </div>
                                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--cs-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {managerName || 'Unassigned'}
                                                    </div>
                                                    <div style={{ fontSize: '9.5px', color: 'var(--cs-text-muted)' }}>
                                                        Branch Manager
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Footer */}
                                    <div style={{ display: 'flex', gap: '8px', paddingTop: '14px', borderTop: '1px solid var(--cs-border)', alignItems: 'center' }}>
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
                                                gap: '6px',
                                                height: '36px'
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
                                                    gap: '4px',
                                                    fontSize: '12px',
                                                    height: '36px',
                                                    padding: '0 12px',
                                                    fontWeight: 600,
                                                    color: 'var(--cs-text-secondary)'
                                                }}
                                            >
                                                <Pencil size={12} /> Edit
                                            </button>
                                        )}

                                        {canManage && !b.isPrimary && (
                                            <button
                                                type="button"
                                                className="btn-ghost"
                                                onClick={() => {
                                                    setDeleteError(null);
                                                    setDeletingBranch(b);
                                                }}
                                                title={`Delete ${b.name}`}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px',
                                                    fontSize: '12px',
                                                    height: '36px',
                                                    padding: '0 10px',
                                                    fontWeight: 600,
                                                    color: '#EF4444',
                                                    background: 'rgba(239, 68, 68, 0.06)',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)')}
                                            >
                                                <Trash2 size={12} /> Delete
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

                        {/* Courses Included in this Branch */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>
                                        Courses Offered at this Branch
                                    </div>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        background: 'rgba(108, 99, 255, 0.12)',
                                        color: 'var(--cs-primary)',
                                        border: '1px solid rgba(108, 99, 255, 0.25)'
                                    }}>
                                        {managingBranchCourses.length} {managingBranchCourses.length === 1 ? 'Course' : 'Courses'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    onClick={() => {
                                        setManagingBranch(null);
                                        router.push(`/dashboard/courses?branchId=${managingBranch.branchId}`);
                                    }}
                                    style={{ fontSize: '12px', color: 'var(--cs-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                    View in Catalogue <ArrowRight size={12} />
                                </button>
                            </div>

                            <div style={{
                                background: 'var(--cs-surface-2)',
                                border: '1px solid var(--cs-border)',
                                borderRadius: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}>
                                {managingBranchCourses.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--cs-text-muted)', fontSize: '13px' }}>
                                        No courses assigned to this branch yet.
                                    </div>
                                ) : (
                                    managingBranchCourses.map(course => (
                                        <div
                                            key={course.courseId}
                                            style={{
                                                padding: '10px 14px',
                                                borderBottom: '1px solid var(--cs-border)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
                                                    <code style={{
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        background: 'rgba(108, 99, 255, 0.1)',
                                                        color: 'var(--cs-primary)',
                                                        padding: '1px 6px',
                                                        borderRadius: '4px'
                                                    }}>
                                                        {course.code}
                                                    </code>
                                                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--cs-text-primary)' }}>
                                                        {course.title}
                                                    </span>
                                                    {course.category && (
                                                        <span style={{
                                                            fontSize: '11px',
                                                            color: 'var(--cs-text-secondary)',
                                                            background: 'var(--cs-surface)',
                                                            border: '1px solid var(--cs-border)',
                                                            borderRadius: '4px',
                                                            padding: '1px 6px'
                                                        }}>
                                                            {course.category}
                                                        </span>
                                                    )}
                                                    {course.level && (
                                                        <span style={{
                                                            fontSize: '11px',
                                                            color: '#4B5563',
                                                            background: '#F3F4F6',
                                                            borderRadius: '4px',
                                                            padding: '1px 6px'
                                                        }}>
                                                            {course.level}
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>
                                                        {formatMoney(course.tuitionAmount, currency || 'INR')}
                                                        <span style={{ fontSize: '10.5px', fontWeight: 500, color: 'var(--cs-text-muted)' }}>
                                                            /{course.billingPeriod === 'monthly' ? 'mo' : course.billingPeriod}
                                                        </span>
                                                    </span>
                                                    <span className={`badge ${course.isActive ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '10px' }}>
                                                        {course.isActive ? 'Active' : 'Draft'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Subjects list & duration */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontSize: '11px', color: 'var(--cs-text-secondary)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {course.durationMonths && <span>{course.durationMonths} Months</span>}
                                                    {course.startDate && <span>• Starts {course.startDate}</span>}
                                                </div>

                                                {course.subjects && course.subjects.length > 0 && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '10.5px', color: 'var(--cs-text-muted)', fontWeight: 600 }}>Subjects:</span>
                                                        {course.subjects.map((subj, idx) => (
                                                            <span
                                                                key={idx}
                                                                style={{
                                                                    fontSize: '10px',
                                                                    padding: '1px 5px',
                                                                    background: 'var(--cs-surface)',
                                                                    border: '1px solid var(--cs-border)',
                                                                    borderRadius: '3px',
                                                                    color: 'var(--cs-text-primary)'
                                                                }}
                                                            >
                                                                {typeof subj === 'string' ? subj : subj.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
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
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        setManagingBranch(null);
                                        router.push(`/dashboard/courses?branchId=${managingBranch.branchId}`);
                                    }}
                                    style={{ padding: '12px 10px', flexDirection: 'column', gap: '6px', height: 'auto', textAlign: 'center' }}
                                >
                                    <GraduationCap size={18} color="#6366F1" />
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Courses ({managingBranchCourses.length})</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        setManagingBranch(null);
                                        router.push(`/dashboard/batches?branchId=${managingBranch.branchId}`);
                                    }}
                                    style={{ padding: '12px 10px', flexDirection: 'column', gap: '6px', height: 'auto', textAlign: 'center' }}
                                >
                                    <BookOpen size={18} color="var(--cs-primary)" />
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Batches ({branchBatches.length})</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        setManagingBranch(null);
                                        router.push(`/dashboard/students?branchId=${managingBranch.branchId}`);
                                    }}
                                    style={{ padding: '12px 10px', flexDirection: 'column', gap: '6px', height: 'auto', textAlign: 'center' }}
                                >
                                    <Users size={18} color="#10B981" />
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Students</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        setManagingBranch(null);
                                        router.push(`/dashboard/attendance?branchId=${managingBranch.branchId}`);
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
                    onClose={() => { setAdding(false); resetAddForm(); }}
                    maxWidth="540px"
                    style={{ overflow: 'visible' }}
                >
                    <form onSubmit={submitAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Branch Name *</label>
                                <input
                                    className="cs-input"
                                    required
                                    placeholder="e.g. Branch-01"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="cs-label">Code *</label>
                                <input
                                    className="cs-input"
                                    required
                                    maxLength={10}
                                    placeholder="e.g. BH-01"
                                    value={form.code}
                                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="cs-label">Address</label>
                            <input
                                className="cs-input"
                                placeholder="e.g. Dadar, Mumbai, Maharashtra"
                                value={form.address}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                            />
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
                                placeholder="e.g. 9098987787"
                            />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label className="cs-label" style={{ marginBottom: 0 }}>Branch Manager</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextMode = addHeadMode === 'select' ? 'custom' : 'select';
                                        setAddHeadMode(nextMode);
                                        if (nextMode === 'custom' && form.headUserId) {
                                            const sel = staffList?.find(s => s.userId === form.headUserId);
                                            if (sel && !form.headName) setForm(f => ({ ...f, headName: sel.fullName }));
                                        }
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--cs-primary)',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        padding: '2px 4px',
                                    }}
                                >
                                    {addHeadMode === 'custom' ? '← Choose from Staff List' : '+ Enter Name Directly'}
                                </button>
                            </div>

                            <BranchManagerDropdown
                                selectedUserId={form.headUserId}
                                customName={form.headName}
                                isCustomMode={addHeadMode === 'custom'}
                                onChange={(userId, name) => setForm({ ...form, headUserId: userId, headName: name })}
                                onToggleCustomMode={isCustom => setAddHeadMode(isCustom ? 'custom' : 'select')}
                                staffList={staffList}
                                placeholder="No Manager Assigned"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '4px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                <input
                                    type="checkbox"
                                    checked={form.isPrimary}
                                    onChange={e => setForm({ ...form, isPrimary: e.target.checked })}
                                />
                                <span>Primary Campus</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                                />
                                <span>Active Branch</span>
                            </label>
                        </div>

                        {error && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{error}</div>}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => { setAdding(false); resetAddForm(); }}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                type="submit"
                                disabled={saving}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Check size={14} />
                                {saving ? 'Adding Branch…' : 'Add Branch'}
                            </button>
                        </div>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label className="cs-label" style={{ marginBottom: 0 }}>Branch Manager</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextMode = editHeadMode === 'select' ? 'custom' : 'select';
                                        setEditHeadMode(nextMode);
                                        if (nextMode === 'custom' && editForm.headUserId) {
                                            const sel = staffList?.find(s => s.userId === editForm.headUserId);
                                            if (sel && !editForm.headName) setEditForm(f => ({ ...f, headName: sel.fullName }));
                                        }
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--cs-primary)',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        padding: '2px 4px',
                                    }}
                                >
                                    {editHeadMode === 'custom' ? '← Choose from Staff List' : '+ Enter Name Directly'}
                                </button>
                            </div>

                            <BranchManagerDropdown
                                selectedUserId={editForm.headUserId}
                                customName={editForm.headName}
                                isCustomMode={editHeadMode === 'custom'}
                                onChange={(userId, name) => setEditForm({ ...editForm, headUserId: userId, headName: name })}
                                onToggleCustomMode={isCustom => setEditHeadMode(isCustom ? 'custom' : 'select')}
                                staffList={staffList}
                                currentBranchId={editForm.branchId}
                                placeholder="No Manager Assigned"
                            />
                        </div>

                        {/* Courses Assigned to this Branch */}
                        <div style={{ background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', borderRadius: '8px', padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingBranchCourses.length > 0 ? '6px' : 0 }}>
                                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--cs-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                    Courses in this Branch ({editingBranchCourses.length})
                                </span>
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    onClick={() => {
                                        setEditingBranch(null);
                                        router.push(`/dashboard/courses?branchId=${editingBranch.branchId}`);
                                    }}
                                    style={{ fontSize: '11px', color: 'var(--cs-primary)', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                    Manage Courses <ExternalLink size={10} />
                                </button>
                            </div>
                            {editingBranchCourses.length === 0 ? (
                                <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>No courses assigned to this branch yet.</div>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {editingBranchCourses.map(c => (
                                        <span key={c.courseId} style={{
                                            fontSize: '11.5px',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            background: '#ffffff',
                                            border: '1px solid var(--cs-border)',
                                            color: 'var(--cs-text-primary)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <strong style={{ color: 'var(--cs-primary)' }}>{c.code}</strong> {c.title}
                                        </span>
                                    ))}
                                </div>
                            )}
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

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                            {canManage && editingBranch && !editingBranch.isPrimary ? (
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    onClick={() => {
                                        const b = editingBranch;
                                        setEditingBranch(null);
                                        setDeleteError(null);
                                        setDeletingBranch(b);
                                    }}
                                    disabled={editSaving}
                                    style={{
                                        color: '#EF4444',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        background: 'rgba(239, 68, 68, 0.08)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Trash2 size={13} /> Delete Branch
                                </button>
                            ) : <div />}

                            <div style={{ display: 'flex', gap: '10px' }}>
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
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Branch Confirmation Modal */}
            {deletingBranch && (
                <Modal
                    title={`Delete Branch: ${deletingBranch.name}`}
                    onClose={() => !deleteSaving && setDeletingBranch(null)}
                    maxWidth="520px"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div
                            style={{
                                padding: '12px 16px',
                                borderRadius: '10px',
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                            }}
                        >
                            <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.5 }}>
                                <strong>Warning:</strong> Are you sure you want to delete <strong>{deletingBranch.name}</strong> (<code>{deletingBranch.code}</code>)?
                                <div style={{ marginTop: '6px', fontSize: '12px', color: '#7F1D1D' }}>
                                    This branch currently has <strong>{deletingBranch.studentCount} student{deletingBranch.studentCount !== 1 ? 's' : ''}</strong> and <strong>{deletingBranch.batchCount} batch{deletingBranch.batchCount !== 1 ? 'es' : ''}</strong>.
                                    They will be safely moved to your Primary Campus.
                                </div>
                            </div>
                        </div>

                        {deleteError && (
                            <div style={{ color: '#DC2626', fontSize: '13px', background: '#FEE2E2', padding: '8px 12px', borderRadius: '6px' }}>
                                {deleteError}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--cs-border)' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setDeletingBranch(null)}
                                disabled={deleteSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleDeleteBranch}
                                disabled={deleteSaving}
                                style={{
                                    background: '#DC2626',
                                    borderColor: '#DC2626',
                                    color: '#FFFFFF',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <Trash2 size={14} />
                                {deleteSaving ? 'Deleting…' : 'Delete Branch'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
