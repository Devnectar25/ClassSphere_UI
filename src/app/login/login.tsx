'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Building2, GraduationCap, HeartHandshake, UserRound, Lock, X, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { homePath, saveSession, type SessionState } from '@/lib/session';
import AuthBrandPanel from '@/components/AuthBrandPanel';
import ForgotPasswordPanel from '@/components/ForgotPasswordPanel';

type LoginRole = 'owner' | 'student' | 'parent';

const ROLE_CONFIG: Record<LoginRole, {
    label: string;
    shortLabel: string;
    subtitle: string;
    placeholder: string;
    accent: string;
    accentBg: string;
    icon: React.ElementType;
    buttonLabel: string;
}> = {
    owner: {
        label: 'Organisation Owner',
        shortLabel: 'Owner',
        subtitle: 'Academy owners, branch managers, staff and operators',
        placeholder: 'owner@academy.com or 9840012345',
        accent: '#4F46E5',
        accentBg: 'rgba(79, 70, 229, 0.08)',
        icon: Building2,
        buttonLabel: 'Sign in as Owner',
    },
    student: {
        label: 'Student',
        shortLabel: 'Student',
        subtitle: 'Access your timetable, test results, practice log and badges',
        placeholder: 'student@email.com or 9840012345',
        accent: '#4F46E5',
        accentBg: 'rgba(79, 70, 229, 0.08)',
        icon: GraduationCap,
        buttonLabel: 'Sign in as Student',
    },
    parent: {
        label: 'Parent',
        shortLabel: 'Parent',
        subtitle: 'Track your child’s attendance, report cards and fee receipts',
        placeholder: 'parent@email.com or 9840012345',
        accent: '#4F46E5',
        accentBg: 'rgba(79, 70, 229, 0.08)',
        icon: HeartHandshake,
        buttonLabel: 'Sign in as Parent',
    },
};

const iconLeft: React.CSSProperties = { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' };

function parseRole(raw: string | null): LoginRole {
    if (raw === 'student' || raw === 'parent' || raw === 'owner') return raw;
    return 'owner';
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialRole = parseRole(searchParams.get('role'));
    const initialIdentifier = searchParams.get('identifier') ?? '';

    const [role, setRole] = useState<LoginRole>(initialRole);
    const [email, setEmail] = useState(initialIdentifier);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [identifierError, setIdentifierError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [mode, setMode] = useState<'login' | 'forgot'>('login');
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        const param = searchParams.get('role');
        if (param === 'owner' || param === 'student' || param === 'parent') {
            setRole(param);
        }
    }, [searchParams]);

    const activeRole = ROLE_CONFIG[role];

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
            if (next && next.startsWith('/')) {
                router.replace(next);
            } else if ((role === 'student' || role === 'parent') && session.session.tenantId) {
                router.replace('/portal');
            } else {
                router.replace(homePath(session));
            }
        } catch (err) {
            setError((err as Error).message);
            setBusy(false);
        }
    };

    const signUp = role === 'owner'
        ? { prompt: 'New academy?', label: 'Start a free trial', href: '/register' }
        : role === 'student'
            ? { prompt: 'New student?', label: 'Register for Student Portal', href: '/register/portal?role=student' }
            : { prompt: 'New parent?', label: 'Register for Parent Portal', href: '/register/portal?role=parent' };

    return (
        <div className="reg-page">
            <div className="reg-shell">
                <AuthBrandPanel />

                {/* ─── Right: Sign-in form ─── */}
                <div className="reg-main">
                    <Link href="/" aria-label="Close and go to home page" className="reg-close">
                        <X size={18} />
                    </Link>

                    {/* ─── Static header ─── */}
                    <div style={{ flexShrink: 0, padding: '32px 36px 0' }}>
                        <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.16em', color: activeRole.accent, marginBottom: '8px', textAlign: 'center' }}>
                                {mode === 'forgot' ? 'ACCOUNT RECOVERY' : 'WELCOME BACK'}
                            </div>
                            <h1 className="reg-title" style={{ marginBottom: '6px' }}>
                                {mode === 'forgot' ? 'Reset your password' : 'Sign in to ClassSphere'}
                            </h1>
                            <p
                                className="reg-subtitle"
                                style={{ fontSize: '12.5px', letterSpacing: '-0.005em', marginBottom: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                title={mode === 'forgot' ? undefined : activeRole.subtitle}
                            >
                                {mode === 'forgot' ? 'Verify with a one-time code, then choose a new password.' : activeRole.subtitle}
                            </p>
                        </div>
                    </div>

                    {/* ─── Body: sign-in form or forgot-password flow ─── */}
                    <div className="auth-body auth-compact" style={{ padding: '20px 36px 24px', overflowX: 'hidden', overflowY: mode === 'forgot' ? 'auto' : 'hidden' }}>
                        {mode === 'forgot' ? (
                            <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
                                <ForgotPasswordPanel
                                    initialIdentifier={email}
                                    accent={activeRole.accent}
                                    onBack={() => setMode('login')}
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

                            {/* Role selector */}
                            <div role="tablist" aria-label="Sign in as" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '12px', marginBottom: '18px' }}>
                                {(['owner', 'student', 'parent'] as LoginRole[]).map(r => {
                                    const cfg = ROLE_CONFIG[r];
                                    const active = role === r;
                                    const Icon = cfg.icon;
                                    return (
                                        <button
                                            key={r}
                                            type="button"
                                            role="tab"
                                            aria-selected={active}
                                            onClick={() => { setRole(r); setError(null); setIdentifierError(null); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                height: '36px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                                                fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
                                                background: active ? '#FFFFFF' : 'transparent',
                                                color: active ? cfg.accent : '#64748B',
                                                boxShadow: active ? '0 1px 3px rgba(15, 23, 42, 0.1)' : 'none',
                                            }}
                                        >
                                            <Icon size={15} />
                                            {cfg.shortLabel}
                                        </button>
                                    );
                                })}
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label className="cs-label" htmlFor="login-identifier">Email or Mobile Number <span className="reg-req">*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <UserRound size={17} style={iconLeft} />
                                    <input
                                        id="login-identifier"
                                        className="cs-input"
                                        type="text"
                                        autoComplete="username"
                                        placeholder={activeRole.placeholder}
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
                                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: activeRole.accent }}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div role="alert" style={{ marginTop: '14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '10px 14px', color: '#B91C1C', fontSize: '13px', lineHeight: 1.5 }}>
                                    {error}
                                    {error.toLowerCase().includes('sign up') && (
                                        <>
                                            {' '}
                                            <Link href={signUp.href} style={{ color: activeRole.accent, fontWeight: 600, textDecoration: 'underline' }}>
                                                Sign up now
                                            </Link>
                                        </>
                                    )}
                                </div>
                            )}

                            <button
                                className="btn-primary reg-cta"
                                type="submit"
                                disabled={busy}
                                style={{
                                    width: '100%', marginTop: '18px', height: '46px',
                                    background: activeRole.accent, borderColor: activeRole.accent,
                                    boxShadow: `0 10px 22px -8px ${activeRole.accent}80`,
                                }}
                            >
                                {busy ? 'Signing in…' : <>{activeRole.buttonLabel} <ArrowRight size={17} /></>}
                            </button>

                            <p style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #F1F5F9', textAlign: 'center', fontSize: '14px', color: '#64748B' }}>
                                {signUp.prompt}{' '}
                                <Link
                                    href={signUp.href}
                                    style={{ display: 'inline-block', marginLeft: '4px', padding: '6px 12px', borderRadius: '8px', background: activeRole.accentBg, color: activeRole.accent, fontWeight: 700, textDecoration: 'none' }}
                                >
                                    {signUp.label}
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
