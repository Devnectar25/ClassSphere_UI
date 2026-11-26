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

const listBox: React.CSSProperties = { maxHeight: '170px', overflowY: 'auto', border: '1px solid var(--cs-border)', borderRadius: '8px', padding: '8px 12px', background: 'var(--cs-surface-2)', display: 'flex', flexDirection: 'column', gap: '8px' };
const hintText: React.CSSProperties = { fontSize: '12.5px', color: 'var(--cs-text-muted)' };
const option: React.CSSProperties = { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', cursor: 'pointer' };

/**
 * Courses and batches a Staff user may work with: the branch is chosen first, then its courses, then the batches of those courses.
 * A course without a chosen batch means all of its batches, including later ones.
 */
export function StaffAccessFields({ branchId, value, onChange }: { branchId: string; value: StaffAssignments; onChange: (value: StaffAssignments) => void }) {
    const { data: allCourses, error } = useApi<Course[]>('/courses');
    const { data: allBatches } = useApi<Batch[]>('/batches?branchId=all');
    if (!allCourses || !allBatches) return <div style={{ ...hintText, color: error ? '#991B1B' : hintText.color }}>{error ?? 'Loading courses and batches…'}</div>;

    const batches = allBatches.filter(b => !branchId || b.branchId === branchId);
    const courses = allCourses.filter(c => !branchId || !c.branchId || c.branchId === branchId || batches.some(b => b.courseId === c.courseId));
    const current = within(value, courses, batches);
    const batchesOf = (courseId: string) => batches.filter(b => b.courseId === courseId);
    const selected = courses.filter(c => current.courseIds.includes(c.courseId) || batchesOf(c.courseId).some(b => current.batchIds.includes(b.batchId)));

    if (!branchId && selected.length === 0) {
        return <div style={hintText}>Select a branch to choose courses and batches. With All branches this user works across the whole academy.</div>;
    }
    const without = (courseId: string) => current.batchIds.filter(id => !batchesOf(courseId).some(b => b.batchId === id));
    // A course with chosen batches is stored by its batches only, so losing a batch never opens the whole course
    const save = (courseIds: string[], batchIds: string[]) => onChange({
        courseIds: courseIds.filter(id => !batchesOf(id).some(b => batchIds.includes(b.batchId))), batchIds,
    });
    const ids = selected.map(c => c.courseId);
    const setCourse = (courseId: string, on: boolean) => (on ? save([...ids, courseId], current.batchIds) : save(ids.filter(x => x !== courseId), without(courseId)));
    const setBatch = (batchId: string, on: boolean) => save(ids, on ? [...current.batchIds, batchId] : current.batchIds.filter(x => x !== batchId));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
                <div className="cs-label">Courses{selected.length > 0 ? ` (${selected.length} selected)` : ''}</div>
                <div role="group" aria-label="Courses" style={listBox}>
                    {courses.length === 0 && <div style={hintText}>This branch has no courses yet.</div>}
                    {courses.map(c => (
                        <label key={c.courseId} style={option}>
                            <input type="checkbox" checked={ids.includes(c.courseId)} onChange={e => setCourse(c.courseId, e.target.checked)} />
                            <span style={{ fontWeight: 600 }}>{c.title}{c.code ? ` (${c.code})` : ''}</span>
                            <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{batchesOf(c.courseId).length} batch{batchesOf(c.courseId).length === 1 ? '' : 'es'}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div>
                <div className="cs-label">Batches</div>
                <div role="group" aria-label="Batches" style={{ ...listBox, maxHeight: '210px', gap: '12px' }}>
                    {selected.length === 0 && <div style={hintText}>Select a course to see its batches.</div>}
                    {selected.map(c => {
                        const own = batchesOf(c.courseId);
                        const chosen = own.filter(b => current.batchIds.includes(b.batchId));
                        return (
                            <div key={c.courseId}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cs-text-secondary)', marginBottom: '4px' }}>{c.title}{c.code ? ` (${c.code})` : ''}</div>
                                {own.length === 0 ? <div style={hintText}>No batches in this branch yet. New ones are included.</div> : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
                                        <label style={option}>
                                            <input type="checkbox" checked={chosen.length === 0} disabled={chosen.length === 0} onChange={() => save(ids, without(c.courseId))} /> All batches
                                        </label>
                                        {own.map(b => (
                                            <label key={b.batchId} style={option}>
                                                <input type="checkbox" checked={current.batchIds.includes(b.batchId)} onChange={e => setBatch(b.batchId, e.target.checked)} />
                                                {b.name}{!branchId && b.branchName ? ` · ${b.branchName}` : ''}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div style={{ fontSize: '11.5px', color: selected.length === 0 ? '#B45309' : 'var(--cs-text-muted)' }}>
                {selected.length === 0 ? 'Nothing is assigned: this user will see no courses, batches or students.' : 'The user sees only these. All batches also covers batches added later.'}
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
