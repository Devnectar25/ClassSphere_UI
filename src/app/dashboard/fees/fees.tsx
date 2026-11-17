'use client';
import { useState, useRef } from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import { Percent, Tag, Pencil, Users, Check, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
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

    // Edit modal state
    const [editingPlan, setEditingPlan] = useState<FeePlan | null>(null);
    const [editForm, setEditForm] = useState<{
        planId: string;
        name: string;
        discountPercent: string;
        isActive: boolean;
        items: Record<string, string>; // feeHeadId -> amount string
    }>({ planId: '', name: '', discountPercent: '0', isActive: true, items: {} });
        const sliderRef = useRef<HTMLDivElement>(null);

    const scrollNext = () => {
        if (!sliderRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
        if (scrollWidth > clientWidth + 10) {
            if (scrollLeft + clientWidth >= scrollWidth - 10) {
                sliderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                sliderRef.current.scrollBy({ left: 300, behavior: 'smooth' });
            }
        } else {
            sliderRef.current.style.transition = 'transform 0.2s ease';
            sliderRef.current.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                if (sliderRef.current) sliderRef.current.style.transform = 'translateX(0)';
            }, 200);
        }
    };

    const scrollPrev = () => {
        if (!sliderRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
        if (scrollWidth > clientWidth + 10) {
            if (scrollLeft <= 10) {
                sliderRef.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
            } else {
                sliderRef.current.scrollBy({ left: -300, behavior: 'smooth' });
            }
        } else {
            sliderRef.current.style.transition = 'transform 0.2s ease';
            sliderRef.current.style.transform = 'translateX(20px)';
            setTimeout(() => {
                if (sliderRef.current) sliderRef.current.style.transform = 'translateX(0)';
            }, 200);
        }
    };

    const [saving, setSaving] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const startEdit = (fp: FeePlan) => {
        setEditingPlan(fp);
        const itemMap: Record<string, string> = {};
        fp.items.forEach(it => {
            itemMap[it.feeHeadId] = String(it.amount);
        });
        setEditForm({
            planId: fp.planId,
            name: fp.name,
            discountPercent: String(fp.discountPercent || 0),
            isActive: fp.isActive,
            items: itemMap
        });
        setModalError(null);
    };

    const submitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setModalError(null);
        try {
            const chosenItems = Object.entries(editForm.items)
                .filter(([, amt]) => Number(amt) > 0)
                .map(([feeHeadId, amt]) => ({ feeHeadId, amount: Number(amt) }));

            await api('/fees', {
                method: 'PUT',
                body: JSON.stringify({
                    planId: editForm.planId,
                    name: editForm.name.trim(),
                    discountPercent: Number(editForm.discountPercent || 0),
                    isActive: editForm.isActive,
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

    // Calculate live modal preview
    const modalSubtotal = Object.values(editForm.items).reduce((acc, val) => acc + (Number(val) || 0), 0);
    const discPct = Math.min(100, Math.max(0, Number(editForm.discountPercent) || 0));
    const modalTotal = discPct > 0 ? Math.round(modalSubtotal * (1 - discPct / 100)) : modalSubtotal;

    return (
        <>
            <Topbar title="Fee Heads & Plans" subtitle="Configure recurring and one-time fee structures" />
            <div className="page-body">
                {!data ? <PageState error={error} /> : (
                    <>
                        {/* Fee Heads Section */}
                        <div className="cs-card" style={{ marginBottom: '24px' }}>
                            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div className="section-title" style={{ fontSize: '15px' }}>Fee Heads</div>
                                    <div className="section-subtitle">Charge categories like tuition, admission, equipment</div>
                                </div>
                                <span className="badge badge-primary" style={{ fontSize: '11px' }}>{data.feeHeads.length} categories</span>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="cs-table">
                                    <thead>
                                        <tr style={{ background: 'var(--cs-surface-2)' }}>
                                            <th style={{ padding: '10px 16px' }}>Fee Head</th>
                                            <th style={{ padding: '10px 16px' }}>Code</th>
                                            <th style={{ padding: '10px 16px' }}>Type</th>
                                            <th style={{ padding: '10px 16px' }}>Frequency</th>
                                            <th style={{ padding: '10px 16px' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.feeHeads.map(fh => {
                                            const recurring = fh.frequency !== 'one-time';
                                            return (
                                                <tr key={fh.feeHeadId}>
                                                    <td style={{ padding: '10px 16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{
                                                                width: '26px', height: '26px', borderRadius: '6px',
                                                                background: 'rgba(108,99,255,0.12)', color: 'var(--cs-primary)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                            }}>
                                                                <Tag size={13} />
                                                            </div>
                                                            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cs-text-primary)' }}>{fh.name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 16px' }}>
                                                        <code style={{ fontSize: '12px', background: 'var(--cs-surface-2)', padding: '2px 8px', borderRadius: '6px', color: 'var(--cs-text-muted)' }}>
                                                            {fh.code}
                                                        </code>
                                                    </td>
                                                    <td style={{ padding: '10px 16px' }}>
                                                        <span className={`badge ${recurring ? 'badge-primary' : 'badge-info'}`}>
                                                            {recurring ? 'Recurring' : 'One-time'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 16px', color: 'var(--cs-text-secondary)', fontSize: '13px', textTransform: 'capitalize' }}>
                                                        {recurring ? fh.frequency : '—'}
                                                    </td>
                                                    <td style={{ padding: '10px 16px' }}>
                                                        <span className={`badge ${fh.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                            {fh.isActive ? 'active' : 'inactive'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Fee Plans Section - Proper Look & Editable Cards */}
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
                                        Fee structures assigned to batches or individual students
                                    </div>
                                </div>

                                {/* Header Navigation Arrow Buttons */}
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
                            </div>

                            {/* Plan Cards Carousel Slider with Side Arrows */}
                            <div style={{ position: 'relative', padding: '16px 12px' }}>
                                {/* Floating Left Arrow Button */}
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
                                        gap: '14px',
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
                                            onClick={() => canEdit && startEdit(fp)}
                                            style={{
                                                flex: '0 0 calc(33.333% - 10px)',
                                                minWidth: '270px',
                                                maxWidth: '360px',
                                                scrollSnapAlign: 'start',
                                                background: 'var(--cs-surface)',
                                                border: '1px solid var(--cs-border)',
                                                borderRadius: '10px',
                                                padding: '14px 16px',
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
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 99, 255, 0.08)';
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
                                                            fontSize: '13.5px',
                                                            color: 'var(--cs-text-primary)',
                                                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                            lineHeight: 1.25
                                                        }}>
                                                            {fp.name}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '11px',
                                                            color: 'var(--cs-text-muted)',
                                                            marginTop: '2px',
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

                                                    {/* Header Badges & Edit Button */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                                        {fp.discountPercent > 0 && (
                                                            <span className="badge badge-warning" style={{ fontSize: '9.5px', fontWeight: 700, padding: '1px 5px' }}>
                                                                <Percent size={9} /> {fp.discountPercent}%
                                                            </span>
                                                        )}
                                                        <span className={`badge ${fp.isActive ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                                                            {fp.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                        {canEdit && (
                                                            <button
                                                                type="button"
                                                                className="btn-ghost"
                                                                onClick={(e) => { e.stopPropagation(); startEdit(fp); }}
                                                                title={`Edit ${fp.name}`}
                                                                style={{
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    padding: 0,
                                                                    borderRadius: '5px',
                                                                    cursor: 'pointer',
                                                                    color: '#6C63FF',
                                                                    background: 'rgba(108, 99, 255, 0.08)',
                                                                    border: '1px solid rgba(108, 99, 255, 0.25)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108, 99, 255, 0.2)')}
                                                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(108, 99, 255, 0.08)')}
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
                                                    borderRadius: '6px',
                                                    padding: '8px 10px',
                                                    marginTop: '10px',
                                                    marginBottom: '10px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '5px'
                                                }}>
                                                    {fp.items.length === 0 ? (
                                                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', textAlign: 'center', padding: '2px 0' }}>
                                                            No fee heads configured
                                                        </div>
                                                    ) : (
                                                        fp.items.map(item => (
                                                            <div key={item.feeHeadId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                                                                <span style={{ color: 'var(--cs-text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px' }}>
                                                                    <Tag size={10} color="var(--cs-primary)" />
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
                                            <div style={{
                                                borderTop: '1px solid var(--cs-border)',
                                                paddingTop: '8px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'baseline'
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: 'var(--cs-text-muted)' }}>
                                                        {fp.discountPercent > 0 ? 'Total (Discounted)' : 'Total Fee'}
                                                    </div>
                                                    {fp.discountPercent > 0 && (
                                                        <div style={{ fontSize: '10px', color: 'var(--cs-text-muted)', textDecoration: 'line-through' }}>
                                                            {formatMoney(subtotal, currency)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{
                                                    fontSize: '15px',
                                                    fontWeight: 800,
                                                    color: '#6C63FF',
                                                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                                                }}>
                                                    {formatMoney(finalTotal, currency)}
                                                </div>
                                            </div>

                                            {/* Edit Prompt on Card */}
                                            {canEdit && (
                                                <div style={{
                                                    fontSize: '10px',
                                                    color: 'var(--cs-primary)',
                                                    fontWeight: 600,
                                                    marginTop: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}>
                                                    <Pencil size={10} /> Click to edit
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                </div>

                                {/* Floating Right Arrow Button */}
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
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Edit Fee Plan Modal */}
            {editingPlan && (
                <Modal title={`Edit Fee Plan: ${editingPlan.name}`} onClose={() => setEditingPlan(null)}>
                    <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label className="cs-label">Plan Name *</label>
                            <input
                                className="cs-input"
                                required
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
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
                                    value={editForm.discountPercent}
                                    onChange={e => setEditForm({ ...editForm, discountPercent: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '16px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                    <input
                                        type="checkbox"
                                        checked={editForm.isActive}
                                        onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
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
                                maxHeight: '240px',
                                overflowY: 'auto'
                            }}>
                                {data?.feeHeads.map(fh => {
                                    const isIncluded = fh.feeHeadId in editForm.items;
                                    const currentAmount = editForm.items[fh.feeHeadId] ?? '';

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
                                                        const next = { ...editForm.items };
                                                        if (e.target.checked) {
                                                            next[fh.feeHeadId] = '100';
                                                        } else {
                                                            delete next[fh.feeHeadId];
                                                        }
                                                        setEditForm({ ...editForm, items: next });
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
                                                            setEditForm({
                                                                ...editForm,
                                                                items: { ...editForm.items, [fh.feeHeadId]: e.target.value }
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
                                {discPct > 0 && (
                                    <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', textDecoration: 'line-through', marginLeft: '6px' }}>
                                        {formatMoney(modalSubtotal, currency)}
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: '17px', fontWeight: 800, color: '#6C63FF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {formatMoney(modalTotal, currency)}
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
                                disabled={saving || Object.keys(editForm.items).length === 0}
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
