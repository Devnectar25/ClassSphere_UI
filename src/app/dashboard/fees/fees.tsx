'use client';
import { useState, useRef } from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import { Percent, Tag, Pencil, Users, Check, ChevronLeft, ChevronRight, Plus, Layers, Calendar, DollarSign } from 'lucide-react';
import { api, useApi, formatMoney } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { can, useSession } from '@/lib/session';

interface FeeHead {
    feeHeadId: string;
    code: string;
    name: string;
    frequency: string;
    isActive: boolean;
}

interface FeePlan {
    planId: string;
    name: string;
    courseId?: string;
    appliedTo: string;
    discountPercent: number;
    taxPercent?: number;
    isActive: boolean;
    items: Array<{ feeHeadId: string; name: string; amount: number }>;
}

interface FeeStructure {
    feeHeads: FeeHead[];
    feePlans: FeePlan[];
}

export default function FeesPage() {
    const session = useSession();
    const canEdit = can(session, 'billing.write');
    const { currency } = useWorkspace();
    const { data, error, reload } = useApi<FeeStructure>('/fees');
    const { data: courses } = useApi<Array<{ courseId: string; title: string; code: string }>>('/courses');

    // Edit Plan modal state
    const [editingPlan, setEditingPlan] = useState<FeePlan | null>(null);
    const [editPlanForm, setEditPlanForm] = useState<{
        planId: string;
        name: string;
        discountPercent: string;
        isActive: boolean;
        items: Record<string, string>; // feeHeadId -> amount string
    }>({ planId: '', name: '', discountPercent: '0', isActive: true, items: {} });

    // Add Plan modal state
    const [showAddPlan, setShowAddPlan] = useState(false);
    const [addPlanForm, setAddPlanForm] = useState<{
        name: string;
        courseId: string;
        discountPercent: string;
        dueDayOfMonth: string;
        isActive: boolean;
        items: Record<string, string>; // feeHeadId -> amount string
    }>({ name: '', courseId: '', discountPercent: '0', dueDayOfMonth: '5', isActive: true, items: {} });

    // Fee Head modal state (Add / Edit)
    const [headModalMode, setHeadModalMode] = useState<'create' | 'edit' | null>(null);
    const [headForm, setHeadForm] = useState<{
        feeHeadId?: string;
        name: string;
        code: string;
        frequency: string;
        isActive: boolean;
    }>({ name: '', code: '', frequency: 'monthly', isActive: true });

    const [saving, setSaving] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const sliderRef = useRef<HTMLDivElement>(null);

    const scrollNext = () => {
        if (!sliderRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
        if (scrollWidth > clientWidth + 10) {
            if (scrollLeft + clientWidth >= scrollWidth - 10) {
                sliderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                sliderRef.current.scrollBy({ left: 320, behavior: 'smooth' });
            }
        }
    };

    const scrollPrev = () => {
        if (!sliderRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
        if (scrollWidth > clientWidth + 10) {
            if (scrollLeft <= 10) {
                sliderRef.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
            } else {
                sliderRef.current.scrollBy({ left: -320, behavior: 'smooth' });
            }
        }
    };

    // --- Fee Head Handlers ---
    const openAddHead = () => {
        const nextNum = (data?.feeHeads.length ?? 0) + 1;
        setHeadForm({
            name: '',
            code: `FH-00${nextNum}`,
            frequency: 'monthly',
            isActive: true
        });
        setModalError(null);
        setHeadModalMode('create');
    };

    const openEditHead = (head: FeeHead) => {
        setHeadForm({
            feeHeadId: head.feeHeadId,
            name: head.name,
            code: head.code,
            frequency: head.frequency,
            isActive: head.isActive
        });
        setModalError(null);
        setHeadModalMode('edit');
    };

    const submitHeadForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setModalError(null);
        try {
            if (headModalMode === 'create') {
                await api('/fees', {
                    method: 'POST',
                    body: JSON.stringify({
                        type: 'fee_head',
                        name: headForm.name.trim(),
                        code: headForm.code.trim().toUpperCase(),
                        frequency: headForm.frequency,
                        isActive: headForm.isActive
                    })
                });
            } else {
                await api('/fees', {
                    method: 'PUT',
                    body: JSON.stringify({
                        type: 'fee_head',
                        feeHeadId: headForm.feeHeadId,
                        name: headForm.name.trim(),
                        code: headForm.code.trim().toUpperCase(),
                        frequency: headForm.frequency,
                        isActive: headForm.isActive
                    })
                });
            }
            setHeadModalMode(null);
            reload();
        } catch (err) {
            setModalError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    // --- Fee Plan Handlers ---
    const openAddPlan = () => {
        // Pre-select default amounts from fee heads if available
        const defaultItems: Record<string, string> = {};
        data?.feeHeads.forEach(fh => {
            if (fh.isActive && (fh.code.includes('TUI') || fh.frequency === 'monthly')) {
                defaultItems[fh.feeHeadId] = '2500';
            }
        });
        setAddPlanForm({
            name: '',
            courseId: courses?.[0]?.courseId || '',
            discountPercent: '0',
            dueDayOfMonth: '5',
            isActive: true,
            items: defaultItems
        });
        setModalError(null);
        setShowAddPlan(true);
    };

    const submitAddPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setModalError(null);
        try {
            const chosenItems = Object.entries(addPlanForm.items)
                .filter(([, amt]) => Number(amt) > 0)
                .map(([feeHeadId, amt]) => ({ feeHeadId, amount: Number(amt) }));

            await api('/fees', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'fee_plan',
                    name: addPlanForm.name.trim(),
                    courseId: addPlanForm.courseId || null,
                    discountPercent: Number(addPlanForm.discountPercent || 0),
                    dueDayOfMonth: Number(addPlanForm.dueDayOfMonth || 5),
                    isActive: addPlanForm.isActive,
                    items: chosenItems
                })
            });
            setShowAddPlan(false);
            reload();
        } catch (err) {
            setModalError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const startEditPlan = (fp: FeePlan) => {
        setEditingPlan(fp);
        const itemMap: Record<string, string> = {};
        fp.items.forEach(it => {
            itemMap[it.feeHeadId] = String(it.amount);
        });
        setEditPlanForm({
            planId: fp.planId,
            name: fp.name,
            discountPercent: String(fp.discountPercent || 0),
            isActive: fp.isActive,
            items: itemMap
        });
        setModalError(null);
    };

    const submitEditPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setModalError(null);
        try {
            const chosenItems = Object.entries(editPlanForm.items)
                .filter(([, amt]) => Number(amt) > 0)
                .map(([feeHeadId, amt]) => ({ feeHeadId, amount: Number(amt) }));

            await api('/fees', {
                method: 'PUT',
                body: JSON.stringify({
                    type: 'fee_plan',
                    planId: editPlanForm.planId,
                    name: editPlanForm.name.trim(),
                    discountPercent: Number(editPlanForm.discountPercent || 0),
                    isActive: editPlanForm.isActive,
                    items: chosenItems
                })
            });
            setEditingPlan(null);
            reload();
        } catch (err) {
            setModalError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    // Live preview calculations for Add Plan
    const addPlanSubtotal = Object.values(addPlanForm.items).reduce((acc, val) => acc + (Number(val) || 0), 0);
    const addPlanDiscPct = Math.min(100, Math.max(0, Number(addPlanForm.discountPercent) || 0));
    const addPlanTotal = addPlanDiscPct > 0 ? Math.round(addPlanSubtotal * (1 - addPlanDiscPct / 100)) : addPlanSubtotal;

    // Live preview calculations for Edit Plan
    const editPlanSubtotal = Object.values(editPlanForm.items).reduce((acc, val) => acc + (Number(val) || 0), 0);
    const editPlanDiscPct = Math.min(100, Math.max(0, Number(editPlanForm.discountPercent) || 0));
    const editPlanTotal = editPlanDiscPct > 0 ? Math.round(editPlanSubtotal * (1 - editPlanDiscPct / 100)) : editPlanSubtotal;

    return (
        <>
            <Topbar title="Fee Heads & Plans" subtitle="Configure recurring and one-time fee structures" />
            <div className="page-body">
                {!data ? <PageState error={error} /> : (
                    <>
                        {/* 1. Fee Heads Section */}
                        <div className="cs-card" style={{ marginBottom: '24px' }}>
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid var(--cs-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="section-title" style={{ fontSize: '15px', margin: 0 }}>Fee Heads</div>
                                        <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                                            {data.feeHeads.length} categories
                                        </span>
                                    </div>
                                    <div className="section-subtitle" style={{ marginTop: '2px' }}>
                                        Charge categories like tuition, admission, equipment, and costumes
                                    </div>
                                </div>
                                {canEdit && (
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={openAddHead}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 14px' }}
                                    >
                                        <Plus size={14} /> Add Fee Head
                                    </button>
                                )}
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table className="cs-table">
                                    <thead>
                                        <tr style={{ background: 'var(--cs-surface-2)' }}>
                                            <th style={{ padding: '12px 18px' }}>Fee Head</th>
                                            <th style={{ padding: '12px 18px' }}>Code</th>
                                            <th style={{ padding: '12px 18px' }}>Type</th>
                                            <th style={{ padding: '12px 18px' }}>Frequency</th>
                                            <th style={{ padding: '12px 18px' }}>Status</th>
                                            {canEdit && <th style={{ padding: '12px 18px', textAlign: 'right' }}>Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.feeHeads.length === 0 ? (
                                            <tr>
                                                <td colSpan={canEdit ? 6 : 5} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--cs-text-muted)' }}>
                                                    <Tag size={28} style={{ opacity: 0.5, marginBottom: '6px' }} />
                                                    <p style={{ margin: 0, fontSize: '13px' }}>No fee heads configured yet.</p>
                                                    {canEdit && (
                                                        <button type="button" className="btn-secondary" onClick={openAddHead} style={{ marginTop: '10px', fontSize: '12px' }}>
                                                            <Plus size={13} /> Add First Fee Head
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ) : (
                                            data.feeHeads.map(fh => {
                                                const recurring = fh.frequency !== 'one-time';
                                                return (
                                                    <tr key={fh.feeHeadId}>
                                                        <td style={{ padding: '12px 18px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{
                                                                    width: '28px', height: '28px', borderRadius: '6px',
                                                                    background: 'rgba(108,99,255,0.12)', color: 'var(--cs-primary)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                                }}>
                                                                    <Tag size={13} />
                                                                </div>
                                                                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cs-text-primary)' }}>{fh.name}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 18px' }}>
                                                            <code style={{ fontSize: '12px', background: 'var(--cs-surface-2)', padding: '2px 8px', borderRadius: '6px', color: 'var(--cs-text-muted)' }}>
                                                                {fh.code}
                                                            </code>
                                                        </td>
                                                        <td style={{ padding: '12px 18px' }}>
                                                            <span className={`badge ${recurring ? 'badge-primary' : 'badge-info'}`}>
                                                                {recurring ? 'Recurring' : 'One-time'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 18px', color: 'var(--cs-text-secondary)', fontSize: '13px', textTransform: 'capitalize' }}>
                                                            {recurring ? fh.frequency : '—'}
                                                        </td>
                                                        <td style={{ padding: '12px 18px' }}>
                                                            <span className={`badge ${fh.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                                {fh.isActive ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        {canEdit && (
                                                            <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                                                                <button
                                                                    type="button"
                                                                    className="btn-ghost"
                                                                    onClick={() => openEditHead(fh)}
                                                                    title="Edit Fee Head"
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        fontSize: '12px',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        color: 'var(--cs-primary)',
                                                                        background: 'rgba(108,99,255,0.08)',
                                                                        borderRadius: '5px'
                                                                    }}
                                                                >
                                                                    <Pencil size={11} /> Edit
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 2. Fee Plans Section */}
                        <div className="cs-card">
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid var(--cs-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="section-title" style={{ fontSize: '15px', margin: 0 }}>Fee Plans</div>
                                        <span className="badge badge-primary" style={{ fontSize: '11px' }}>{data.feePlans.length} plans</span>
                                    </div>
                                    <div className="section-subtitle" style={{ marginTop: '2px' }}>
                                        Fee structures assigned to batches, courses, or individual students
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {/* Navigation Arrow Buttons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                            type="button"
                                            className="btn-ghost"
                                            onClick={scrollPrev}
                                            title="Previous card"
                                            aria-label="Previous fee plan card"
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                padding: 0,
                                                borderRadius: '6px',
                                                border: '1px solid var(--cs-border)',
                                                background: 'var(--cs-surface-2)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: '#6C63FF',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108, 99, 255, 0.12)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--cs-surface-2)')}
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-ghost"
                                            onClick={scrollNext}
                                            title="Next card"
                                            aria-label="Next fee plan card"
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                padding: 0,
                                                borderRadius: '6px',
                                                border: '1px solid var(--cs-border)',
                                                background: 'var(--cs-surface-2)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: '#6C63FF',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108, 99, 255, 0.12)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--cs-surface-2)')}
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>

                                    {canEdit && (
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={openAddPlan}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 14px' }}
                                        >
                                            <Plus size={14} /> Create Fee Plan
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Plan Cards Carousel Slider */}
                            <div style={{ position: 'relative', padding: '16px 12px' }}>
                                {data.feePlans.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--cs-text-muted)' }}>
                                        <Layers size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                                        <p style={{ margin: '0 0 12px 0', fontSize: '13px' }}>No fee plans configured yet.</p>
                                        {canEdit && (
                                            <button type="button" className="btn-primary" onClick={openAddPlan} style={{ fontSize: '13px', padding: '6px 14px' }}>
                                                <Plus size={14} /> Create First Fee Plan
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {/* Floating Left Arrow */}
                                        <button
                                            type="button"
                                            onClick={scrollPrev}
                                            title="Previous card"
                                            aria-label="Previous fee plan card"
                                            style={{
                                                position: 'absolute',
                                                left: '4px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                zIndex: 10,
                                                width: '34px',
                                                height: '34px',
                                                borderRadius: '50%',
                                                background: 'var(--cs-surface, #ffffff)',
                                                border: '1px solid var(--cs-border)',
                                                boxShadow: '0 3px 10px rgba(0, 0, 0, 0.12)',
                                                color: '#6C63FF',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                                                e.currentTarget.style.background = 'rgba(108, 99, 255, 0.08)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                                                e.currentTarget.style.background = 'var(--cs-surface, #ffffff)';
                                            }}
                                        >
                                            <ChevronLeft size={18} />
                                        </button>

                                        {/* Slider Track */}
                                        <div
                                            ref={sliderRef}
                                            style={{
                                                display: 'flex',
                                                gap: '16px',
                                                overflowX: 'auto',
                                                scrollBehavior: 'smooth',
                                                scrollbarWidth: 'none',
                                                msOverflowStyle: 'none',
                                                padding: '4px 28px',
                                                scrollSnapType: 'x mandatory'
                                            }}
                                        >
                                            {data.feePlans.map(fp => {
                                                const subtotal = fp.items.reduce((sum, it) => sum + Number(it.amount || 0), 0);
                                                const finalTotal = fp.discountPercent > 0
                                                    ? Math.round(subtotal * (1 - fp.discountPercent / 100))
                                                    : subtotal;

                                                return (
                                                    <div
                                                        key={fp.planId}
                                                        onClick={() => canEdit && startEditPlan(fp)}
                                                        style={{
                                                            flex: '0 0 calc(33.333% - 12px)',
                                                            minWidth: '280px',
                                                            maxWidth: '380px',
                                                            scrollSnapAlign: 'start',
                                                            background: 'var(--cs-surface)',
                                                            border: '1px solid var(--cs-border)',
                                                            borderRadius: '12px',
                                                            padding: '16px 18px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            justifyContent: 'space-between',
                                                            boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                                                            cursor: canEdit ? 'pointer' : 'default',
                                                            transition: 'all 0.2s ease',
                                                            position: 'relative'
                                                        }}
                                                        onMouseEnter={e => {
                                                            if (canEdit) {
                                                                e.currentTarget.style.borderColor = 'rgba(108, 99, 255, 0.45)';
                                                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(108, 99, 255, 0.1)';
                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                            }
                                                        }}
                                                        onMouseLeave={e => {
                                                            if (canEdit) {
                                                                e.currentTarget.style.borderColor = 'var(--cs-border)';
                                                                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.03)';
                                                                e.currentTarget.style.transform = 'none';
                                                            }
                                                        }}
                                                        title={canEdit ? `Click to edit ${fp.name}` : undefined}
                                                    >
                                                        {/* Card Header */}
                                                        <div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{
                                                                        fontWeight: 700,
                                                                        fontSize: '14px',
                                                                        color: 'var(--cs-text-primary)',
                                                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                                        lineHeight: 1.3
                                                                    }}>
                                                                        {fp.name}
                                                                    </div>
                                                                    <div style={{
                                                                        fontSize: '11px',
                                                                        color: 'var(--cs-text-muted)',
                                                                        marginTop: '3px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}>
                                                                        <Users size={11} color="var(--cs-text-muted)" />
                                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                            {fp.appliedTo}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                                                    {fp.discountPercent > 0 && (
                                                                        <span className="badge badge-warning" style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px' }}>
                                                                            <Percent size={9} /> {fp.discountPercent}%
                                                                        </span>
                                                                    )}
                                                                    <span className={`badge ${fp.isActive ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                                        {fp.isActive ? 'Active' : 'Inactive'}
                                                                    </span>
                                                                    {canEdit && (
                                                                        <button
                                                                            type="button"
                                                                            className="btn-ghost"
                                                                            onClick={(e) => { e.stopPropagation(); startEditPlan(fp); }}
                                                                            title={`Edit ${fp.name}`}
                                                                            style={{
                                                                                width: '26px',
                                                                                height: '26px',
                                                                                padding: 0,
                                                                                borderRadius: '6px',
                                                                                cursor: 'pointer',
                                                                                color: '#6C63FF',
                                                                                background: 'rgba(108, 99, 255, 0.08)',
                                                                                border: '1px solid rgba(108, 99, 255, 0.25)',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center'
                                                                            }}
                                                                            aria-label={`Edit ${fp.name}`}
                                                                        >
                                                                            <Pencil size={11} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Fee Heads Breakdown */}
                                                            <div style={{
                                                                background: 'var(--cs-surface-2)',
                                                                border: '1px solid var(--cs-border)',
                                                                borderRadius: '8px',
                                                                padding: '10px 12px',
                                                                marginTop: '12px',
                                                                marginBottom: '12px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '6px'
                                                            }}>
                                                                {fp.items.length === 0 ? (
                                                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', textAlign: 'center', padding: '2px 0' }}>
                                                                        No fee heads configured
                                                                    </div>
                                                                ) : (
                                                                    fp.items.map(item => (
                                                                        <div key={item.feeHeadId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                                                                            <span style={{ color: 'var(--cs-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                                                                <Tag size={11} color="var(--cs-primary)" />
                                                                                {item.name}
                                                                            </span>
                                                                            <span style={{ fontWeight: 600, color: 'var(--cs-text-primary)', fontSize: '12px' }}>
                                                                                {formatMoney(item.amount, currency)}
                                                                            </span>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Card Footer: Total Cost */}
                                                        <div>
                                                            <div style={{
                                                                borderTop: '1px solid var(--cs-border)',
                                                                paddingTop: '10px',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'baseline'
                                                            }}>
                                                                <div>
                                                                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: 'var(--cs-text-muted)' }}>
                                                                        {fp.discountPercent > 0 ? 'Total (Discounted)' : 'Total Fee'}
                                                                    </div>
                                                                    {fp.discountPercent > 0 && (
                                                                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', textDecoration: 'line-through' }}>
                                                                            {formatMoney(subtotal, currency)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '16px',
                                                                    fontWeight: 800,
                                                                    color: '#6C63FF',
                                                                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                                                                }}>
                                                                    {formatMoney(finalTotal, currency)}
                                                                </div>
                                                            </div>

                                                            {canEdit && (
                                                                <div style={{
                                                                    fontSize: '11px',
                                                                    color: 'var(--cs-primary)',
                                                                    fontWeight: 600,
                                                                    marginTop: '8px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}>
                                                                    <Pencil size={11} /> Click card to edit plan
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Floating Right Arrow */}
                                        <button
                                            type="button"
                                            onClick={scrollNext}
                                            title="Next card"
                                            aria-label="Next fee plan card"
                                            style={{
                                                position: 'absolute',
                                                right: '4px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                zIndex: 10,
                                                width: '34px',
                                                height: '34px',
                                                borderRadius: '50%',
                                                background: 'var(--cs-surface, #ffffff)',
                                                border: '1px solid var(--cs-border)',
                                                boxShadow: '0 3px 10px rgba(0, 0, 0, 0.12)',
                                                color: '#6C63FF',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                                                e.currentTarget.style.background = 'rgba(108, 99, 255, 0.08)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                                                e.currentTarget.style.background = 'var(--cs-surface, #ffffff)';
                                            }}
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* --- Modals --- */}

            {/* 1. Add / Edit Fee Head Modal */}
            {headModalMode && (
                <Modal
                    title={headModalMode === 'create' ? 'Add New Fee Head' : `Edit Fee Head: ${headForm.name}`}
                    onClose={() => setHeadModalMode(null)}
                >
                    <form onSubmit={submitHeadForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label className="cs-label">Fee Head Name *</label>
                            <input
                                className="cs-input"
                                required
                                placeholder="e.g. Monthly Tuition, Costume & Stage, Exam Fee"
                                value={headForm.name}
                                onChange={e => setHeadForm({ ...headForm, name: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Code *</label>
                                <input
                                    className="cs-input"
                                    required
                                    placeholder="e.g. FH-TUI, FH-ADM"
                                    value={headForm.code}
                                    onChange={e => setHeadForm({ ...headForm, code: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="cs-label">Frequency *</label>
                                <select
                                    className="cs-input"
                                    value={headForm.frequency}
                                    onChange={e => setHeadForm({ ...headForm, frequency: e.target.value })}
                                >
                                    <option value="monthly">Monthly (Recurring)</option>
                                    <option value="quarterly">Quarterly (Recurring)</option>
                                    <option value="term">Term / Semester (Recurring)</option>
                                    <option value="annual">Annual (Recurring)</option>
                                    <option value="one-time">One-time (Non-recurring)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                <input
                                    type="checkbox"
                                    checked={headForm.isActive}
                                    onChange={e => setHeadForm({ ...headForm, isActive: e.target.checked })}
                                />
                                <span>Active (Available to include in Fee Plans)</span>
                            </label>
                        </div>

                        {modalError && (
                            <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>
                                {modalError}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setHeadModalMode(null)}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={saving}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Check size={14} />
                                {saving ? 'Saving…' : headModalMode === 'create' ? 'Create Fee Head' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* 2. Create Fee Plan Modal */}
            {showAddPlan && (
                <Modal title="Create New Fee Plan" onClose={() => setShowAddPlan(false)}>
                    <form onSubmit={submitAddPlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label className="cs-label">Plan Name *</label>
                            <input
                                className="cs-input"
                                required
                                placeholder="e.g. Kathak Comprehensive Track, Regular Weekly Plan"
                                value={addPlanForm.name}
                                onChange={e => setAddPlanForm({ ...addPlanForm, name: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Applicable Course</label>
                                <select
                                    className="cs-input"
                                    value={addPlanForm.courseId}
                                    onChange={e => setAddPlanForm({ ...addPlanForm, courseId: e.target.value })}
                                >
                                    <option value="">General (Selected Students / All)</option>
                                    {courses?.map(c => (
                                        <option key={c.courseId} value={c.courseId}>
                                            {c.title} ({c.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">Discount Percentage (%)</label>
                                <input
                                    className="cs-input"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={addPlanForm.discountPercent}
                                    onChange={e => setAddPlanForm({ ...addPlanForm, discountPercent: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                <input
                                    type="checkbox"
                                    checked={addPlanForm.isActive}
                                    onChange={e => setAddPlanForm({ ...addPlanForm, isActive: e.target.checked })}
                                />
                                <span>Active Plan</span>
                            </label>
                        </div>

                        {/* Fee Heads Selection */}
                        <div>
                            <label className="cs-label" style={{ marginBottom: '8px', fontWeight: 700 }}>
                                Include Fee Heads & Specify Amounts ({currency})
                            </label>
                            <div style={{
                                background: 'var(--cs-surface-2)',
                                border: '1px solid var(--cs-border)',
                                borderRadius: '8px',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                maxHeight: '220px',
                                overflowY: 'auto'
                            }}>
                                {data?.feeHeads.map(fh => {
                                    const isIncluded = fh.feeHeadId in addPlanForm.items;
                                    const currentAmount = addPlanForm.items[fh.feeHeadId] ?? '';

                                    return (
                                        <div
                                            key={fh.feeHeadId}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '12px',
                                                padding: '6px 8px',
                                                borderRadius: '6px',
                                                background: isIncluded ? 'rgba(108, 99, 255, 0.05)' : 'transparent',
                                                border: isIncluded ? '1px solid rgba(108, 99, 255, 0.2)' : '1px solid transparent'
                                            }}
                                        >
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isIncluded}
                                                    onChange={e => {
                                                        const next = { ...addPlanForm.items };
                                                        if (e.target.checked) {
                                                            next[fh.feeHeadId] = '1000';
                                                        } else {
                                                            delete next[fh.feeHeadId];
                                                        }
                                                        setAddPlanForm({ ...addPlanForm, items: next });
                                                    }}
                                                />
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                                        {fh.name}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>
                                                        {fh.frequency} • {fh.code} {!fh.isActive && '(Inactive)'}
                                                    </div>
                                                </div>
                                            </label>

                                            {isIncluded && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>Amount:</span>
                                                    <input
                                                        className="cs-input"
                                                        type="number"
                                                        min="0"
                                                        step="10"
                                                        required
                                                        style={{ width: '90px', padding: '4px 8px', height: '32px', textAlign: 'right', fontWeight: 600 }}
                                                        value={currentAmount}
                                                        onChange={e => {
                                                            setAddPlanForm({
                                                                ...addPlanForm,
                                                                items: { ...addPlanForm.items, [fh.feeHeadId]: e.target.value }
                                                            });
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Calculation Summary */}
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(108, 99, 255, 0.08)',
                            border: '1px solid rgba(108, 99, 255, 0.25)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <span style={{ fontSize: '12px', color: 'var(--cs-text-secondary)' }}>Calculated Total Fee:</span>
                                {addPlanDiscPct > 0 && (
                                    <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', textDecoration: 'line-through', marginLeft: '6px' }}>
                                        {formatMoney(addPlanSubtotal, currency)}
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: '17px', fontWeight: 800, color: '#6C63FF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {formatMoney(addPlanTotal, currency)}
                            </span>
                        </div>

                        {modalError && (
                            <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>
                                {modalError}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setShowAddPlan(false)}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={saving || Object.keys(addPlanForm.items).length === 0}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Check size={14} />
                                {saving ? 'Creating Plan…' : 'Create Fee Plan'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* 3. Edit Fee Plan Modal */}
            {editingPlan && (
                <Modal title={`Edit Fee Plan: ${editingPlan.name}`} onClose={() => setEditingPlan(null)}>
                    <form onSubmit={submitEditPlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label className="cs-label">Plan Name *</label>
                            <input
                                className="cs-input"
                                required
                                value={editPlanForm.name}
                                onChange={e => setEditPlanForm({ ...editPlanForm, name: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Discount Percentage (%)</label>
                                <input
                                    className="cs-input"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={editPlanForm.discountPercent}
                                    onChange={e => setEditPlanForm({ ...editPlanForm, discountPercent: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '16px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                    <input
                                        type="checkbox"
                                        checked={editPlanForm.isActive}
                                        onChange={e => setEditPlanForm({ ...editPlanForm, isActive: e.target.checked })}
                                    />
                                    <span>Active Plan</span>
                                </label>
                            </div>
                        </div>

                        {/* Fee Heads Breakdown Editor */}
                        <div>
                            <label className="cs-label" style={{ marginBottom: '8px', fontWeight: 700 }}>
                                Fee Heads & Amounts ({currency})
                            </label>
                            <div style={{
                                background: 'var(--cs-surface-2)',
                                border: '1px solid var(--cs-border)',
                                borderRadius: '8px',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                maxHeight: '220px',
                                overflowY: 'auto'
                            }}>
                                {data?.feeHeads.map(fh => {
                                    const isIncluded = fh.feeHeadId in editPlanForm.items;
                                    const currentAmount = editPlanForm.items[fh.feeHeadId] ?? '';

                                    return (
                                        <div
                                            key={fh.feeHeadId}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '12px',
                                                padding: '6px 8px',
                                                borderRadius: '6px',
                                                background: isIncluded ? 'rgba(108, 99, 255, 0.05)' : 'transparent',
                                                border: isIncluded ? '1px solid rgba(108, 99, 255, 0.2)' : '1px solid transparent'
                                            }}
                                        >
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isIncluded}
                                                    onChange={e => {
                                                        const next = { ...editPlanForm.items };
                                                        if (e.target.checked) {
                                                            next[fh.feeHeadId] = '100';
                                                        } else {
                                                            delete next[fh.feeHeadId];
                                                        }
                                                        setEditPlanForm({ ...editPlanForm, items: next });
                                                    }}
                                                />
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                                        {fh.name}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>
                                                        {fh.frequency} • {fh.code}
                                                    </div>
                                                </div>
                                            </label>

                                            {isIncluded && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>Amount:</span>
                                                    <input
                                                        className="cs-input"
                                                        type="number"
                                                        min="0"
                                                        step="10"
                                                        required
                                                        style={{ width: '90px', padding: '4px 8px', height: '32px', textAlign: 'right', fontWeight: 600 }}
                                                        value={currentAmount}
                                                        onChange={e => {
                                                            setEditPlanForm({
                                                                ...editPlanForm,
                                                                items: { ...editPlanForm.items, [fh.feeHeadId]: e.target.value }
                                                            });
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Real-time Calculation Summary */}
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(108, 99, 255, 0.08)',
                            border: '1px solid rgba(108, 99, 255, 0.25)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <span style={{ fontSize: '12px', color: 'var(--cs-text-secondary)' }}>Calculated Total:</span>
                                {editPlanDiscPct > 0 && (
                                    <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', textDecoration: 'line-through', marginLeft: '6px' }}>
                                        {formatMoney(editPlanSubtotal, currency)}
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: '17px', fontWeight: 800, color: '#6C63FF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {formatMoney(editPlanTotal, currency)}
                            </span>
                        </div>

                        {modalError && (
                            <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>
                                {modalError}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setEditingPlan(null)}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={saving || Object.keys(editPlanForm.items).length === 0}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Check size={14} />
                                {saving ? 'Saving Changes…' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
