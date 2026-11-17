'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react';
import { api } from '@/lib/api';
import { homePath, saveSession, type SessionState } from '@/lib/session';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const session = await api<SessionState>('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) });
            saveSession({ ...session, selectedBranchId: null });
            const next = new URLSearchParams(window.location.search).get('next');
            router.replace(next && next.startsWith('/') ? next : homePath(session));
        } catch (err) {
            setError((err as Error).message);
            setBusy(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'linear-gradient(135deg, #4F46E5, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={18} color="white" />
                </div>
                <span style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A' }}>
                    Class<span className="gradient-text">Sphere</span>
                </span>
            </div>

            <form onSubmit={submit} className="cs-card" style={{ width: '100%', maxWidth: '420px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>Sign in</h1>
                    <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px' }}>Academy staff, parents and platform operators</p>
                </div>
                <div>
                    <label className="cs-label">Email</label>
                    <input className="cs-input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                    <label className="cs-label">Password</label>
                    <div style={{ position: 'relative' }}>
                        <input className="cs-input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                            value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: '40px' }} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Show password"
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
                {error && <div style={{ color: 'var(--cs-danger)', fontSize: '13px' }}>{error}</div>}
                <button className="btn-primary" type="submit" disabled={busy} style={{ justifyContent: 'center', height: '44px' }}>
                    <LogIn size={16} /> {busy ? 'Signing in…' : 'Sign in'}
                </button>
            </form>

            <p style={{ marginTop: '20px', fontSize: '13px', color: '#94A3B8' }}>
                New academy? <Link href="/register" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>Start a free trial</Link>
            </p>
        </div>
    );
}
