'use client';
import { useState } from 'react';
import { Info } from 'lucide-react';
import Modal from '@/components/Modal';
import { api, useApi } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';

export interface StaffAssignments { courseIds: string[]; batchIds: string[] }
export const NO_ASSIGNMENTS: StaffAssignments = { courseIds: [], batchIds: [] };

interface Course { courseId: string; title: string; code?: string; branchId?: string | null; isActive?: boolean }
interface Batch { batchId: string; name: string; courseId?: string; branchId?: string; branchName?: string }

/** Keeps only what belongs to the branch, e.g. after another branch was chosen. */
function within(value: StaffAssignments, courses: Course[], batches: Batch[]): StaffAssignments {
    return {
        courseIds: value.courseIds.filter(id => courses.some(c => c.courseId === id)),
        batchIds: value.batchIds.filter(id => batches.some(b => b.batchId === id)),
    };
}

/** Courses and batches a Staff user may work with. A ticked course without a ticked batch means all of its batches. */
export function StaffAccessFields({ branchId, value, onChange }: { branchId: string; value: StaffAssignments; onChange: (value: StaffAssignments) => void }) {
    const { data: allCourses, error } = useApi<Course[]>('/courses');
    const { data: allBatches } = useApi<Batch[]>('/batches?branchId=all');
    if (!allCourses || !allBatches) return <div style={{ fontSize: '12.5px', color: error ? '#991B1B' : 'var(--cs-text-muted)' }}>{error ?? 'Loading courses and batches…'}</div>;

    const batches = allBatches.filter(b => !branchId || b.branchId === branchId);
    const courses = allCourses.filter(c => !branchId || !c.branchId || c.branchId === branchId || batches.some(b => b.courseId === c.courseId));
    const current = within(value, courses, batches);
    const toggle = (list: string[], id: string, on: boolean) => (on ? [...list.filter(x => x !== id), id] : list.filter(x => x !== id));
    const setCourse = (c: Course, on: boolean) => onChange({
        courseIds: toggle(current.courseIds, c.courseId, on),
        batchIds: on ? current.batchIds : current.batchIds.filter(id => batches.find(b => b.batchId === id)?.courseId !== c.courseId),
    });
    const setBatch = (b: Batch, on: boolean) => onChange({
        courseIds: on && b.courseId ? toggle(current.courseIds, b.courseId, true) : current.courseIds,
        batchIds: toggle(current.batchIds, b.batchId, on),
    });
    const none = current.courseIds.length === 0 && current.batchIds.length === 0;

    return (
        <div>
            <div className="cs-label">Assigned courses &amp; batches</div>
            <div style={{ maxHeight: '230px', overflowY: 'auto', border: '1px solid var(--cs-border)', borderRadius: '8px', padding: '8px 12px', background: 'var(--cs-surface-2)' }}>
                {courses.length === 0 && <div style={{ fontSize: '12.5px', color: 'var(--cs-text-muted)' }}>This branch has no courses yet.</div>}
                {courses.map(c => {
                    const own = batches.filter(b => b.courseId === c.courseId);
                    const picked = current.courseIds.includes(c.courseId) || own.some(b => current.batchIds.includes(b.batchId));
                    const chosen = own.filter(b => current.batchIds.includes(b.batchId)).length;
                    return (
                        <div key={c.courseId} style={{ padding: '4px 0' }}>
                            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <input type="checkbox" checked={picked} onChange={e => setCourse(c, e.target.checked)} />
                                {c.title}{c.code ? ` (${c.code})` : ''}
                                {picked && <span style={{ fontWeight: 500, fontSize: '11px', color: 'var(--cs-text-muted)' }}>{chosen > 0 ? `${chosen} of ${own.length} batches` : own.length > 0 ? 'all batches' : 'no batches yet'}</span>}
                            </label>
                            {picked && own.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', padding: '4px 0 4px 26px' }}>
                                    {own.map(b => (
                                        <label key={b.batchId} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12.5px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={current.batchIds.includes(b.batchId)} onChange={e => setBatch(b, e.target.checked)} />
                                            {b.name}{!branchId && b.branchName ? ` · ${b.branchName}` : ''}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div style={{ fontSize: '11.5px', marginTop: '4px', color: none && branchId ? '#B45309' : 'var(--cs-text-muted)' }}>
                {none
                    ? branchId ? 'Nothing is assigned: this user will see no courses, batches or students.' : 'Without a branch and without assignments this user works across all branches.'
                    : 'The user sees only these. A course without a ticked batch includes all its batches.'}
            </div>
        </div>
    );
}

/** Branch, courses and batches of an existing Staff user. */
export function StaffAccessDialog({ member, branches, onClose, onSaved }: {
    member: { membershipId: string; fullName: string; branchId?: string | null; assignments?: StaffAssignments };
    branches: Array<{ branchId: string; name: string }>; onClose: () => void; onSaved: () => void;
}) {
    const [branchId, setBranchId] = useState(member.branchId ?? '');
    const [value, setValue] = useState<StaffAssignments>(member.assignments ?? NO_ASSIGNMENTS);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const save = async () => {
        setBusy(true);
        setError(null);
        try {
            await api('/staff', { method: 'PUT', body: JSON.stringify({ action: 'assign', membershipId: member.membershipId, branchId: branchId || null, assignments: value }) });
            onSaved();
        } catch (err) {
            setError((err as Error).message);
            setBusy(false);
        }
    };
    return (
        <Modal title={`Access — ${member.fullName}`} onClose={onClose} maxWidth="560px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                    <label className="cs-label" htmlFor="staff-branch">Branch</label>
                    <select id="staff-branch" className="cs-input" value={branchId} onChange={e => { setBranchId(e.target.value); setValue(NO_ASSIGNMENTS); }}>
                        <option value="">All branches</option>
                        {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                    </select>
                </div>
                <StaffAccessFields branchId={branchId} value={value} onChange={setValue} />
                {error && <div role="alert" style={{ padding: '9px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '12.5px' }}>{error}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save access'}</button>
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
