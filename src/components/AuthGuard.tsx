'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { can, getSession, homePath, useSession, type SessionState } from '@/lib/session';

type Area = 'academy' | 'platform' | 'portal';

function allowed(area: Area, s: SessionState | null) {
    if (!s) return false;
    if (area === 'platform') return s.user.isPlatformAdmin;
    if (!s.session.tenantId) return false;
    if (area === 'portal') return s.session.role === 'Guardian' || can(s, 'portal.read');
    return s.session.role !== 'Guardian';
}

/** Renders children only for a signed-in user allowed in this area; otherwise redirects. */
export default function AuthGuard({ area, children }: { area: Area; children: React.ReactNode }) {
    const router = useRouter();
    const session = useSession();
    // false during server render and hydration, true once running in the browser
    const ready = useSyncExternalStore(() => () => {}, () => true, () => false);

    useEffect(() => {
        if (!ready) return;
        const current = getSession();
        if (allowed(area, current)) return;
        router.replace(current ? homePath(current) : `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }, [ready, session, area, router]);

    if (!ready || !allowed(area, session)) {
        return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--cs-text-muted)', fontSize: '14px' }}>Checking your session…</div>;
    }
    return <>{children}</>;
}
