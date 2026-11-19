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
            <div className="reg-shell">
                <AuthBrandPanel />
                <div className="reg-main">
                    <Link href="/" aria-label="Close and go to home page" className="reg-close">
                        <X size={18} />
                    </Link>
                    <div style={{ flexShrink: 0, padding: '32px 36px 0' }}>
                        <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.16em', color: accent, marginBottom: '8px', textAlign: 'center' }}>
                                ACCOUNT RECOVERY
                            </div>
                            <h1 className="reg-title" style={{ marginBottom: '6px' }}>Reset your password</h1>
                            <p className="reg-subtitle" style={{ fontSize: '14px', marginBottom: 0 }}>
                                Verify with a one-time code, then choose a new password.
                            </p>
                        </div>
                    </div>
                    <div className="auth-body auth-compact" style={{ padding: '20px 36px 24px', overflowX: 'hidden', overflowY: 'auto' }}>
                        <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
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
