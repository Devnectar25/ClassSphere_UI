'use client';
import { useState, useMemo, useEffect } from 'react';
import { BookOpen, Layers, Search, X, Check, MapPin, Info } from 'lucide-react';
import Modal from '@/components/Modal';
import { api, useApi } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';

export interface StaffAssignments {
    courseIds: string[];
    batchIds: string[];
}

export const NO_ASSIGNMENTS: StaffAssignments = { courseIds: [], batchIds: [] };

interface Course {
    courseId: string;
    title: string;
    code?: string;
    branchId?: string | null;
    branchName?: string;
    batchCount?: number;
    isActive?: boolean;
}

interface Batch {
    batchId: string;
    name: string;
    courseId?: string;
    courseTitle?: string;
    branchId?: string;
    branchName?: string;
    room?: string | null;
    capacity?: number;
}

/** Keeps only courses & batches that belong to the active branch filter. */
function within(value: StaffAssignments, courses: Course[], batches: Batch[]): StaffAssignments {
    const validCourseIds = new Set(courses.map(c => c.courseId));
    const validBatchIds = new Set(batches.map(b => b.batchId));
    return {
        courseIds: (value?.courseIds || []).filter(id => validCourseIds.has(id)),
        batchIds: (value?.batchIds || []).filter(id => validBatchIds.has(id)),
    };
}

/**
 * Multiple Courses and Batches selector with branch filtering.
 * When branchId is selected (e.g. Mumbai), courses and batches are filtered strictly to that branch.
 * When branchId is empty (All branches), all academy courses and batches are selectable with branch badges.
 */
export function StaffAccessFields({
    branchId,
    value = NO_ASSIGNMENTS,
    onChange,
    role = 'Instructor',
    branchName
}: {
    branchId: string;
    value: StaffAssignments;
    onChange: (value: StaffAssignments) => void;
    role?: string;
    branchName?: string;
}) {
    const { data: allCourses, error: courseError } = useApi<Course[]>('/courses?branchId=all');
    const { data: allBatches, error: batchError } = useApi<Batch[]>('/batches?branchId=all');
    const [courseSearch, setCourseSearch] = useState('');
    const [batchSearch, setBatchSearch] = useState('');

    // Filter courses by active branch
    const branchCourses = useMemo(() => {
        if (!allCourses) return [];
        if (!branchId) return allCourses;
        return allCourses.filter(c => !c.branchId || c.branchId === branchId);
    }, [allCourses, branchId]);

    // Filter batches by active branch
    const branchBatches = useMemo(() => {
        if (!allBatches) return [];
        if (!branchId) return allBatches;
        return allBatches.filter(b => !b.branchId || b.branchId === branchId);
    }, [allBatches, branchId]);

    // Reconcile selected IDs when branch changes so out-of-branch items are stripped
    useEffect(() => {
        if (!allCourses || !allBatches) return;
        const validCourseIds = new Set(branchCourses.map(c => c.courseId));
        const validBatchIds = new Set(branchBatches.map(b => b.batchId));
        const cleanedCourses = (value?.courseIds || []).filter(id => validCourseIds.has(id));
        const cleanedBatches = (value?.batchIds || []).filter(id => validBatchIds.has(id));
        if (
            cleanedCourses.length !== (value?.courseIds || []).length ||
            cleanedBatches.length !== (value?.batchIds || []).length
        ) {
            onChange({ courseIds: cleanedCourses, batchIds: cleanedBatches });
        }
    }, [branchCourses, branchBatches, allCourses, allBatches, value?.courseIds, value?.batchIds, onChange]);

    // Filtered by search query
    const displayedCourses = useMemo(() => {
        const q = courseSearch.trim().toLowerCase();
        if (!q) return branchCourses;
        return branchCourses.filter(c =>
            c.title.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q))
        );
    }, [branchCourses, courseSearch]);

    const displayedBatches = useMemo(() => {
        const q = batchSearch.trim().toLowerCase();
        if (!q) return branchBatches;
        return branchBatches.filter(b =>
            b.name.toLowerCase().includes(q) || (b.courseTitle && b.courseTitle.toLowerCase().includes(q))
        );
    }, [branchBatches, batchSearch]);

    const selectedCourseIds = value?.courseIds || [];
    const selectedBatchIds = value?.batchIds || [];

    // Course actions
    const toggleCourse = (courseId: string) => {
        const isSelected = selectedCourseIds.includes(courseId);
        if (isSelected) {
            // Deselect course and remove any batches belonging to it
            const newCourseIds = selectedCourseIds.filter(id => id !== courseId);
            const newBatchIds = selectedBatchIds.filter(bid => {
                const b = allBatches?.find(x => x.batchId === bid);
                return b?.courseId !== courseId;
            });
            onChange({ courseIds: newCourseIds, batchIds: newBatchIds });
        } else {
            onChange({ courseIds: [...selectedCourseIds, courseId], batchIds: selectedBatchIds });
        }
    };

    const selectAllCourses = () => {
        const visibleIds = displayedCourses.map(c => c.courseId);
        const combined = Array.from(new Set([...selectedCourseIds, ...visibleIds]));
        onChange({ courseIds: combined, batchIds: selectedBatchIds });
    };

    const clearCourses = () => {
        onChange({ courseIds: [], batchIds: [] });
    };

    // Batch actions
    const toggleBatch = (batchId: string) => {
        const isSelected = selectedBatchIds.includes(batchId);
        if (isSelected) {
            const newBatchIds = selectedBatchIds.filter(id => id !== batchId);
            onChange({ courseIds: selectedCourseIds, batchIds: newBatchIds });
        } else {
            const b = allBatches?.find(x => x.batchId === batchId);
            const newBatchIds = [...selectedBatchIds, batchId];
            const newCourseIds = (b?.courseId && !selectedCourseIds.includes(b.courseId))
                ? [...selectedCourseIds, b.courseId]
                : selectedCourseIds;
            onChange({ courseIds: newCourseIds, batchIds: newBatchIds });
        }
    };

    const selectAllBatches = () => {
        const visibleBatchIds = displayedBatches.map(b => b.batchId);
        const combinedBatches = Array.from(new Set([...selectedBatchIds, ...visibleBatchIds]));
        const associatedCourseIds = displayedBatches.map(b => b.courseId).filter((cid): cid is string => Boolean(cid));
        const combinedCourses = Array.from(new Set([...selectedCourseIds, ...associatedCourseIds]));
        onChange({ courseIds: combinedCourses, batchIds: combinedBatches });
    };

    const clearBatches = () => {
        onChange({ courseIds: selectedCourseIds, batchIds: [] });
    };

    if (!allCourses || !allBatches) {
        return (
            <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', fontSize: '12.5px', color: (courseError || batchError) ? '#EF4444' : 'var(--cs-text-muted)' }}>
                {courseError || batchError || 'Loading courses and batches…'}
            </div>
        );
    }

    const activeBranchLabel = branchName || (branchId ? 'Selected Branch' : 'All Branches');

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'var(--cs-surface-2)',
            border: '1px solid var(--cs-border)',
            borderRadius: '12px',
            padding: '14px 16px'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6C63FF' }}>
                        <BookOpen size={15} />
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>
                            Courses &amp; Batches Assignment
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>
                            Assign multiple courses &amp; batches for this {role.toLowerCase()}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge badge-primary" style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} /> {branchId ? `Branch: ${activeBranchLabel}` : 'All Branches'}
                    </span>
                </div>
            </div>

            {/* COURSES SECTION */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>Courses</span>
                        <span style={{ fontSize: '11px', color: selectedCourseIds.length > 0 ? '#6C63FF' : 'var(--cs-text-muted)', fontWeight: 600 }}>
                            ({selectedCourseIds.length} of {branchCourses.length} selected)
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {displayedCourses.length > 0 && (
                            <button
                                type="button"
                                className="btn-ghost"
                                style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', color: 'var(--cs-primary)', fontWeight: 600 }}
                                onClick={selectAllCourses}
                            >
                                Select All ({displayedCourses.length})
                            </button>
                        )}
                        {selectedCourseIds.length > 0 && (
                            <button
                                type="button"
                                className="btn-ghost"
                                style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', color: 'var(--cs-text-muted)', fontWeight: 600 }}
                                onClick={clearCourses}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Course search input if courses > 4 */}
                {branchCourses.length > 4 && (
                    <div style={{ position: 'relative' }}>
                        <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--cs-text-muted)' }} />
                        <input
                            className="cs-input"
                            style={{ paddingLeft: '28px', paddingRight: '26px', fontSize: '11.5px', height: '30px' }}
                            placeholder="Filter courses by name or code…"
                            value={courseSearch}
                            onChange={e => setCourseSearch(e.target.value)}
                        />
                        {courseSearch && (
                            <button
                                type="button"
                                onClick={() => setCourseSearch('')}
                                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--cs-text-muted)' }}
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                )}

                {/* Courses Multi-Select Grid */}
                <div
                    role="group"
                    aria-label="Courses"
                    style={{
                        maxHeight: '160px',
                        overflowY: 'auto',
                        border: '1px solid var(--cs-border)',
                        borderRadius: '8px',
                        padding: '8px',
                        background: 'var(--cs-surface)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: '6px'
                    }}
                >
                    {branchCourses.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                            No courses found for this branch.
                        </div>
                    ) : displayedCourses.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                            No courses match &quot;{courseSearch}&quot;.
                        </div>
                    ) : (
                        displayedCourses.map(c => {
                            const isChecked = selectedCourseIds.includes(c.courseId);
                            const batchCount = allBatches.filter(b => b.courseId === c.courseId && (!branchId || b.branchId === branchId)).length;
                            return (
                                <div
                                    key={c.courseId}
                                    onClick={() => toggleCourse(c.courseId)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '7px 10px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        border: `1px solid ${isChecked ? '#6C63FF' : 'var(--cs-border)'}`,
                                        background: isChecked ? 'rgba(108, 99, 255, 0.08)' : 'var(--cs-surface-2)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {}} // handled by tile click
                                        style={{ cursor: 'pointer', accentColor: '#6C63FF' }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            {c.code && (
                                                <span style={{
                                                    fontSize: '10.5px',
                                                    fontWeight: 700,
                                                    background: isChecked ? '#6C63FF' : 'var(--cs-surface)',
                                                    color: isChecked ? '#FFFFFF' : '#6C63FF',
                                                    padding: '1px 5px',
                                                    borderRadius: '4px',
                                                    border: '1px solid rgba(108, 99, 255, 0.3)'
                                                }}>
                                                    {c.code}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cs-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {c.title}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '10.5px', color: 'var(--cs-text-muted)' }}>
                                            {!branchId && c.branchName && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                                    <MapPin size={9} /> {c.branchName}
                                                </span>
                                            )}
                                            <span>{batchCount} batch{batchCount === 1 ? '' : 'es'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* BATCHES SECTION */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>Batches</span>
                        <span style={{ fontSize: '11px', color: selectedBatchIds.length > 0 ? '#10B981' : 'var(--cs-text-muted)', fontWeight: 600 }}>
                            ({selectedBatchIds.length} of {branchBatches.length} selected)
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {displayedBatches.length > 0 && (
                            <button
                                type="button"
                                className="btn-ghost"
                                style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', color: 'var(--cs-primary)', fontWeight: 600 }}
                                onClick={selectAllBatches}
                            >
                                Select All ({displayedBatches.length})
                            </button>
                        )}
                        {selectedBatchIds.length > 0 && (
                            <button
                                type="button"
                                className="btn-ghost"
                                style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', color: 'var(--cs-text-muted)', fontWeight: 600 }}
                                onClick={clearBatches}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Batch search input if batches > 4 */}
                {branchBatches.length > 4 && (
                    <div style={{ position: 'relative' }}>
                        <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--cs-text-muted)' }} />
                        <input
                            className="cs-input"
                            style={{ paddingLeft: '28px', paddingRight: '26px', fontSize: '11.5px', height: '30px' }}
                            placeholder="Filter batches by name or course…"
                            value={batchSearch}
                            onChange={e => setBatchSearch(e.target.value)}
                        />
                        {batchSearch && (
                            <button
                                type="button"
                                onClick={() => setBatchSearch('')}
                                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--cs-text-muted)' }}
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                )}

                {/* Batches multi-select list or empty notice */}
                {branchBatches.length === 0 ? (
                    <div style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: 'var(--cs-surface)',
                        border: '1px dashed var(--cs-border)',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: 'var(--cs-text-muted)'
                    }}>
                        <Layers size={16} style={{ margin: '0 auto 4px', color: '#6C63FF', opacity: 0.8 }} />
                        <div style={{ fontWeight: 600, color: 'var(--cs-text-secondary)' }}>No batches created under this branch yet.</div>
                        <div style={{ fontSize: '11px', marginTop: '2px', color: 'var(--cs-text-muted)' }}>
                            Selected courses will be saved for this user. When new batches are scheduled, they will be assignable directly.
                        </div>
                    </div>
                ) : (
                    <div
                        role="group"
                        aria-label="Batches"
                        style={{
                            maxHeight: '160px',
                            overflowY: 'auto',
                            border: '1px solid var(--cs-border)',
                            borderRadius: '8px',
                            padding: '8px',
                            background: 'var(--cs-surface)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                            gap: '6px'
                        }}
                    >
                        {displayedBatches.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                No batches match &quot;{batchSearch}&quot;.
                            </div>
                        ) : (
                            displayedBatches.map(b => {
                                const isChecked = selectedBatchIds.includes(b.batchId);
                                return (
                                    <div
                                        key={b.batchId}
                                        onClick={() => toggleBatch(b.batchId)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '7px 10px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            border: `1px solid ${isChecked ? '#10B981' : 'var(--cs-border)'}`,
                                            background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'var(--cs-surface-2)',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {}}
                                            style={{ cursor: 'pointer', accentColor: '#10B981' }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cs-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {b.name}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '10.5px', color: 'var(--cs-text-muted)' }}>
                                                {b.courseTitle && <span style={{ color: '#6C63FF' }}>{b.courseTitle}</span>}
                                                {!branchId && b.branchName && <span>· {b.branchName}</span>}
                                                {b.room && <span>· Room: {b.room}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Bottom summary pill */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                paddingTop: '6px',
                borderTop: '1px solid var(--cs-border)',
                fontSize: '11.5px',
                color: 'var(--cs-text-muted)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={13} color="#10B981" />
                    <span>
                        Selected: <strong style={{ color: '#6C63FF' }}>{selectedCourseIds.length}</strong> course{selectedCourseIds.length === 1 ? '' : 's'}, <strong style={{ color: '#10B981' }}>{selectedBatchIds.length}</strong> batch{selectedBatchIds.length === 1 ? '' : 'es'}
                    </span>
                </div>
                {selectedCourseIds.length === 0 && selectedBatchIds.length === 0 && (
                    <span style={{ color: '#D97706', fontSize: '11px' }}>
                        (Optional: select courses to grant access now)
                    </span>
                )}
            </div>
        </div>
    );
}

/** Branch, courses and batches of an existing Staff or Instructor user. */
export function StaffAccessDialog({ member, branches, onClose, onSaved }: {
    member: { membershipId: string; fullName: string; role?: string; branchId?: string | null; assignments?: StaffAssignments };
    branches: Array<{ branchId: string; name: string }>; onClose: () => void; onSaved: () => void;
}) {
    const [branchId, setBranchId] = useState(member.branchId ?? '');
    const [value, setValue] = useState<StaffAssignments>(member.assignments ?? NO_ASSIGNMENTS);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeBranchName = branches.find(b => b.branchId === branchId)?.name;

    const save = async () => {
        setBusy(true);
        setError(null);
        try {
            await api('/staff', {
                method: 'PUT',
                body: JSON.stringify({
                    action: 'assign',
                    membershipId: member.membershipId,
                    branchId: branchId || null,
                    assignments: value
                })
            });
            onSaved();
        } catch (err) {
            setError((err as Error).message);
            setBusy(false);
        }
    };

    return (
        <Modal title={`Assign Courses & Batches — ${member.fullName}`} onClose={onClose} maxWidth="660px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                    <label className="cs-label" htmlFor="staff-branch">Campus Branch</label>
                    <select
                        id="staff-branch"
                        className="cs-input"
                        value={branchId}
                        onChange={e => {
                            setBranchId(e.target.value);
                            setValue(NO_ASSIGNMENTS);
                        }}
                    >
                        <option value="">All branches</option>
                        {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                    </select>
                </div>

                <StaffAccessFields
                    branchId={branchId}
                    value={value}
                    onChange={setValue}
                    role={member.role || 'Staff'}
                    branchName={activeBranchName}
                />

                {error && (
                    <div role="alert" style={{ padding: '9px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '12.5px' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                    <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="button" className="btn-primary" disabled={busy} onClick={save}>
                        {busy ? 'Saving…' : 'Save Access'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/** Tells Staff why their lists are empty. */
export function StaffAccessNotice() {
    const { workspace } = useWorkspace();
    const access = workspace?.staffAccess;
    if (!access || access.courses > 0 || access.batches > 0) return null;
    return (
        <div role="status" style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '12px 24px 0', padding: '10px 14px', borderRadius: '8px', border: '1px solid #FDE68A', background: '#FFFBEB', color: '#92400E', fontSize: '12.5px' }}>
            <Info size={15} style={{ flexShrink: 0 }} /> No courses or batches are assigned to you yet. Ask your academy admin to assign them under Users &amp; Roles.
        </div>
    );
}
