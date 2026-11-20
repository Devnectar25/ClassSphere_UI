'use client';
import Link from 'next/link';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import AuthBrandPanel from '@/components/AuthBrandPanel';
import ForgotPasswordPanel from '@/components/ForgotPasswordPanel';

const ROLE_ACCENT: Record<string, string> = { owner: '#4F46E5', student: '#4F46E5', parent: '#4F46E5' };

/** Standalone /forgot-password page — the same flow is also embedded in the sign-in card. */
function ForgotPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleParam = searchParams.get('role');
    const role = roleParam === 'owner' || roleParam === 'student' || roleParam === 'parent' ? roleParam : null;
    const initialIdentifier = (searchParams.get('identifier') ?? '').trim();

    const loginHref = (identifier: string) => {
        const params = new URLSearchParams();
        if (role) params.set('role', role);
        if (identifier.trim()) params.set('identifier', identifier.trim());
        return params.toString() ? `/login?${params.toString()}` : '/login';
    };

    const accent = ROLE_ACCENT[role ?? 'owner'];

    return (
        <div className="reg-page">
            <div className="reg-shell auth-shell">
                <AuthBrandPanel />
                <div className="reg-main">
                    <Link href={loginHref(initialIdentifier)} aria-label="Back to sign in" className="reg-close">
                        <X size={18} />
                    </Link>
                    <div style={{ flexShrink: 0, padding: '36px 36px 0' }}>
                        <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.16em', color: accent, marginBottom: '8px' }}>
                                ACCOUNT RECOVERY
                            </div>
                            <h1 className="reg-title" style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '6px' }}>
                                Reset your password
                            </h1>
                            <p className="reg-subtitle" style={{ fontSize: '13.5px', color: '#64748B', letterSpacing: '-0.005em', lineHeight: 1.5, marginBottom: 0 }}>
                                Verify with a one-time code, then choose a new password.
                            </p>
                        </div>
                    </div>
                    <div
                        className="auth-body auth-compact"
                        style={{
                            padding: '24px 36px 28px',
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                        }}
                    >
                        <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <ForgotPasswordPanel
                                initialIdentifier={initialIdentifier}
                                lockInitialIdentifier
                                accent={accent}
                                onBack={() => router.push(loginHref(initialIdentifier))}
                                onDone={id => router.replace(loginHref(id))}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={<div className="reg-page" />}>
            <ForgotPasswordContent />
        </Suspense>
    );
}
