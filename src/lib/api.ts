'use client';
import { useCallback, useEffect, useState } from 'react';
import { clearSession, getSession, useSession } from '@/lib/session';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/** Subscription plan from the public catalogue (GET /plans). */
export interface Plan {
    planTier: string;
    description: string;
    priceMonthly: number;
    currency: string;
    maxSeats: number;
    maxBranches: number;
    features: string[];
    isPopular: boolean;
}

/**
 * Calls the ClassSphere backend with the signed-in session and selected branch view, and unwraps the
 * `{ success, data }` envelope; throws with the problem detail on failure. An expired session signs out.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const session = getSession();
    const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
            ...(session?.selectedBranchId ? { 'X-Branch-Id': session.selectedBranchId } : {}),
            ...init?.headers,
        },
    });
    const body = await res.json().catch(() => null);
    if (res.status === 401 && session) clearSession(); // AuthGuard then returns the user to sign-in
    if (!res.ok || !body?.success) {
        throw new Error(body?.detail || body?.title || `Request failed (${res.status})`);
    }
    return body.data as T;
}

/** Fetches on mount and whenever the path, signed-in session or branch view changes. */
export function useApi<T>(path: string | null) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [version, setVersion] = useState(0);
    const session = useSession();
    const scope = `${session?.token}|${session?.selectedBranchId ?? ''}`;

    useEffect(() => {
        if (!path) return;
        let active = true;
        api<T>(path)
            .then(result => { if (active) { setData(result); setError(null); } })
            .catch((err: Error) => { if (active) setError(err.message); });
        return () => { active = false; };
    }, [path, scope, version]);

    const reload = useCallback(() => setVersion(v => v + 1), []);
    return { data, error, loading: data === null && error === null, reload };
}

export function formatMoney(value: number, currency = 'INR', fractionDigits = 0) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency, minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits,
    }).format(value);
}

export function formatDate(value: string | null | undefined) {
    return value ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export function initials(name: string) {
    return name.split(' ').filter(w => !/\.$/.test(w)).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
