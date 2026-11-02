'use client';
import { useSyncExternalStore } from 'react';

/** Signed-in session returned by POST /auth/login and /auth/switch, plus the selected branch view. */
export interface SessionState {
    token: string;
    user: { userId: string; fullName: string; email: string; isPlatformAdmin: boolean };
    session: {
        tenantId: string | null;
        tenantName: string | null;
        role: string;
        branchId: string | null; // branch the user is restricted to (null = all branches)
        permissions: string[];
    };
    memberships: Array<{ tenantId: string; tenantName: string; academyType: string; role: string; branchId: string | null }>;
    selectedBranchId?: string | null; // branch view chosen in the UI (null = consolidated)
}

export const ROLE_LABELS: Record<string, string> = {
    PlatformAdmin: 'Platform Admin',
    TenantAdmin: 'Academy Admin',
    BranchManager: 'Branch Manager',
    Finance: 'Finance',
    Instructor: 'Instructor',
    Staff: 'Staff',
    Guardian: 'Parent / Guardian',
};

const KEY = 'classsphere.session';
const listeners = new Set<() => void>();
let state: SessionState | null | undefined;

export function getSession(): SessionState | null {
    if (typeof window === 'undefined') return null;
    if (state === undefined) {
        try {
            state = JSON.parse(localStorage.getItem(KEY) ?? 'null');
        } catch {
            state = null;
        }
    }
    return state ?? null;
}

function update(next: SessionState | null) {
    state = next;
    try {
        if (next) localStorage.setItem(KEY, JSON.stringify(next));
        else localStorage.removeItem(KEY);
    } catch {
        // storage unavailable (private mode): keep the in-memory session
    }
    listeners.forEach(listener => listener());
}

export const saveSession = (next: SessionState) => update(next);
export const clearSession = () => update(null);
export const selectBranch = (branchId: string | null) => {
    const current = getSession();
    if (current) update({ ...current, selectedBranchId: branchId });
};

export function useSession() {
    return useSyncExternalStore(
        listener => { listeners.add(listener); return () => listeners.delete(listener); },
        getSession,
        () => null,
    );
}

export function can(session: SessionState | null, permission: string) {
    return !!session && (session.user.isPlatformAdmin || session.session.permissions.includes(permission));
}

/** Where a user lands after signing in. */
export function homePath(session: SessionState) {
    if (!session.session.tenantId) return '/admin';
    if (session.session.role === 'Guardian') return '/portal';
    return can(session, 'reports.read') ? '/dashboard' : '/dashboard/students';
}
