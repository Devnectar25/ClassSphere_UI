'use client';
import { useCallback, useEffect, useState } from 'react';
import { clearSession, getSession, useSession } from '@/lib/session';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

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
    razorpayPlanId?: string | null;
}

/**
 * Calls the ClassSphere backend with the signed-in session and selected branch view, and unwraps the
 * `{ success, data }` envelope; throws with the problem detail on failure. An expired session signs out.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const session = getSession();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            cache: 'no-store',
            ...init,
            signal: init?.signal || controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
                ...(session?.selectedBranchId ? { 'X-Branch-Id': session.selectedBranchId } : {}),
                ...init?.headers,
            },
        });
        clearTimeout(timeoutId);
        const body = await res.json().catch(() => null);
        // AuthGuard then returns the user to sign-in; a suspended or deactivated account is signed out the same way
        const blocked = res.status === 403 && (body?.title === 'Account Suspended' || body?.title === 'Account Inactive');
        if ((res.status === 401 || blocked) && session) clearSession();
        if (!res.ok || !body?.success) {
            throw new Error(body?.detail || body?.title || `Request failed (${res.status})`);
        }
        return body.data as T;
    } catch (err) {
        clearTimeout(timeoutId);
        if ((err as Error).name === 'AbortError') {
            throw new Error('Server took too long to respond. Please check your connection and try again.');
        }
        throw err;
    }
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
    return { data, error, loading: Boolean(path) && data === null && error === null, reload };
}

export function formatMoney(value: number, currency = 'INR', fractionDigits = 0) {
    const safeCurrency = (typeof currency === 'string' && /^[A-Za-z]{3}$/.test(currency.trim()))
        ? currency.trim().toUpperCase()
        : 'INR';
    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: safeCurrency,
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
        }).format(value || 0);
    } catch {
        return `₹${Number(value || 0).toLocaleString('en-IN')}`;
    }
}

export function formatDate(value: string | null | undefined) {
    return value ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export function initials(name: string) {
    return name.split(' ').filter(w => !/\.$/.test(w)).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
