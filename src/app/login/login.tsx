'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, UserRound, Lock, X, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { homePath, saveSession, type SessionState } from '@/lib/session';
import AuthBrandPanel from '@/components/AuthBrandPanel';
import ForgotPasswordPanel from '@/components/ForgotPasswordPanel';

const iconLeft: React.CSSProperties = {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94A3B8',
    pointerEvents: 'none',
};

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialIdentifier = searchParams.get('identifier') ?? '';

    const [email, setEmail] = useState(initialIdentifier);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [identifierError, setIdentifierError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [mode, setMode] = useState<'login' | 'forgot'>('login');
    const [notice, setNotice] = useState<string | null>(null);

    const validateIdentifier = (val: string): string | null => {
        const trimmed = val.trim();
        if (!trimmed) return 'Email or mobile number is required.';
        if (!trimmed.includes('@') && !/^\d{10}$/.test(trimmed)) {
            return 'Enter a valid 10-digit mobile number or email address.';
        }
        return null;
    };

    const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        // When entering a mobile number (digits/spaces only, no letters or @), allow only up to 10 digits
        if (/^[\d\s]+$/.test(val) && /\d/.test(val)) {
            val = val.replace(/\D/g, '').slice(0, 10);
        }
        setEmail(val);
        if (notice) setNotice(null);
        if (identifierError) setIdentifierError(null);
        if (error) setError(null);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const idErr = validateIdentifier(email);
        if (idErr) {
            setIdentifierError(idErr);
            return;
        }
        setIdentifierError(null);
        setBusy(true);
        setError(null);
        try {
            const session = await api<SessionState>('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ identifier: email.trim(), password }),
            });
            saveSession({ ...session, selectedBranchId: null });
            const next = searchParams.get('next');
            const destination = (next && next.startsWith('/')) ? next : homePath(session);
            window.location.href = destination;
        } catch (err) {
            setError((err as Error).message);
            setBusy(false);
        }
    };

    return (
        <div className="reg-page">
            <div className="reg-shell auth-shell">
                <AuthBrandPanel />

                {/* ─── Right: Sign-in form or Account Recovery ─── */}
                <div className="reg-main">
                    {mode === 'forgot' ? (
                        <button
                            type="button"
                            onClick={() => { setError(null); setIdentifierError(null); setNotice(null); setMode('login'); }}
                            aria-label="Back to sign in"
                            className="reg-close"
                            style={{ border: 'none', cursor: 'pointer' }}
                        >
                            <X size={18} />
                        </button>
                    ) : (
                        <Link href="/" aria-label="Close and go to home page" className="reg-close">
                            <X size={18} />
                        </Link>
                    )}

                    {/* ─── Static header ─── */}
                    <div style={{ flexShrink: 0, padding: '36px 36px 0' }}>
                        <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.16em', color: '#4F46E5', marginBottom: '8px' }}>
                                {mode === 'forgot' ? 'ACCOUNT RECOVERY' : 'ORGANISATION PORTAL'}
                            </div>
                            <h1 className="reg-title" style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '6px' }}>
                                {mode === 'forgot' ? 'Reset your password' : 'Sign in to ClassSphere'}
                            </h1>
                            <p
                                className="reg-subtitle"
                                style={{ fontSize: '13.5px', color: '#64748B', letterSpacing: '-0.005em', lineHeight: 1.5, marginBottom: 0 }}
                            >
                                {mode === 'forgot'
                                    ? 'Verify with a one-time code, then choose a new password.'
                                    : 'Access your academy dashboard, batches, fees, and staff.'}
                            </p>
                        </div>
                    </div>

                    {/* ─── Body: sign-in form or forgot-password flow ─── */}
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
                        {mode === 'forgot' ? (
                            <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <ForgotPasswordPanel
                                    initialIdentifier={email}
                                    accent="#4F46E5"
                                    onBack={() => { setError(null); setIdentifierError(null); setNotice(null); setMode('login'); }}
                                    onDone={id => {
                                        setEmail(id);
                                        setPassword('');
                                        setError(null);
                                        setIdentifierError(null);
                                        setNotice('Password updated. Sign in with your new password.');
                                        setMode('login');
                                    }}
                                />
                            </div>
                        ) : (
                        <form onSubmit={submit} noValidate className="auth-form" style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
                            {notice && (
                                <div role="status" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '10px 14px', color: '#047857', fontSize: '13px', fontWeight: 500 }}>
                                    <CheckCircle size={16} style={{ flexShrink: 0 }} /> {notice}
                                </div>
                            )}

                            <div style={{ marginBottom: '16px' }}>
                                <label className="cs-label" htmlFor="login-identifier">Email or Mobile Number <span className="reg-req">*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <UserRound size={17} style={iconLeft} />
                                    <input
                                        id="login-identifier"
                                        className="cs-input"
                                        type="text"
                                        autoComplete="username"
                                        placeholder="owner@academy.com or 9840012345"
                                        required
                                        value={email}
                                        onChange={handleIdentifierChange}
                                        onBlur={() => { if (email.trim()) setIdentifierError(validateIdentifier(email)); }}
                                        style={{ paddingLeft: '42px', ...(identifierError ? { borderColor: '#EF4444', background: '#FEF2F2' } : {}) }}
                                    />
                                </div>
                                {identifierError && (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        {identifierError}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="cs-label" htmlFor="login-password">Password <span className="reg-req">*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={17} style={iconLeft} />
                                    <input
                                        id="login-password"
                                        className="cs-input"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        style={{ paddingLeft: '42px', paddingRight: '44px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setError(null); setIdentifierError(null); setNotice(null); setMode('forgot'); }}
                                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#4F46E5' }}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div role="alert" style={{ marginTop: '14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '12px 14px', color: '#B91C1C', fontSize: '13px', lineHeight: 1.5 }}>
                                    {error.toLowerCase().includes('suspend') ? (
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 500 }}>
                                                {error}
                                            </p>
                                            <div style={{ marginTop: '8px' }}>
                                                <Link
                                                    href={`/contact?topic=Technical+support${email.includes('@') ? `&email=${encodeURIComponent(email.trim())}` : /^\d{10}$/.test(email.trim()) ? `&phone=${encodeURIComponent(email.trim())}` : ''}&message=${encodeURIComponent('My academy or account has been suspended. Please review my suspension and help me restore access.')}`}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        color: '#4F46E5',
                                                        fontWeight: 700,
                                                        fontSize: '13px',
                                                        textDecoration: 'underline',
                                                    }}
                                                >
                                                    Contact Us <ArrowRight size={14} />
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            {error}
                                            {error.toLowerCase().includes('sign up') && (
                                                <>
                                                    {' '}
                                                    <Link href="/register" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'underline' }}>
                                                        Sign up now
                                                    </Link>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                className="btn-primary reg-cta"
                                type="submit"
                                disabled={busy}
                                style={{
                                    width: '100%', marginTop: '20px', height: '46px',
                                    background: '#4F46E5', borderColor: '#4F46E5',
                                    boxShadow: '0 10px 22px -8px rgba(79, 70, 229, 0.5)',
                                }}
                            >
                                {busy ? 'Signing in…' : <>Sign in to Dashboard <ArrowRight size={17} /></>}
                            </button>

                            <p style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', textAlign: 'center', fontSize: '14px', color: '#64748B' }}>
                                New organisation?{' '}
                                <Link
                                    href="/register"
                                    style={{ display: 'inline-block', marginLeft: '4px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.08)', color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}
                                >
                                    Start a free trial
                                </Link>
                            </p>
                        </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="reg-page" />}>
            <LoginForm />
        </Suspense>
    );
}
