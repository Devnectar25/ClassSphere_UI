'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { can, getSession, homePath, useSession, type SessionState } from '@/lib/session';

type Area = 'academy' | 'platform' | 'portal';

function allowed(area: Area, s: SessionState | null) {
    if (!s) return false;
    if (s.user?.isPlatformAdmin) return true;
    if (area === 'platform') return Boolean(s.user?.isPlatformAdmin);
    if (!s.session?.tenantId && !s.user?.isPlatformAdmin) return false;
    if (area === 'portal') return s.session?.role === 'Guardian' || can(s, 'portal.read');
    return s.session?.role !== 'Guardian';
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

        // 1. Not signed in: redirect to login preserving the exact requested URL (including sub-routes and queries)
        if (!current) {
            const currentPath = typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '';
            router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
            return;
        }

        // 2. Already authorized for this area: stay on the exact page, never replace the URL
        if (allowed(area, current)) {
            return;
        }

        // 3. User is signed in, but allowed() returned false:
        // If current URL already matches this area's scope and the user is NOT a restricted role (e.g. Guardian in academy),
        // NEVER clobber an existing URL on page refresh to force /dashboard.
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        if (area === 'academy' && currentPath.startsWith('/dashboard')) {
            if (current.session?.role !== 'Guardian') {
                return;
            }
        }
        if (area === 'portal' && currentPath.startsWith('/portal')) {
            return;
        }
        if (area === 'platform' && currentPath.startsWith('/admin')) {
            if (current.user?.isPlatformAdmin) {
                return;
            }
        }

        // 4. Truly in the wrong area (e.g. Guardian accessing academy dashboard): redirect to their own home area
        router.replace(homePath(current));
    }, [ready, session, area, router]);

    if (!ready || !allowed(area, session)) {
        return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--cs-text-muted)', fontSize: '14px' }}>Checking your session…</div>;
    }
    return <>{children}</>;
}
