'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Shield, CheckCircle, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { api, useApi, formatMoney, type Plan } from '@/lib/api';
import { homePath, saveSession, type SessionState } from '@/lib/session';

const steps = ['Account', 'Plan', 'Ready'];

// Values are the backend's academy types
const CATEGORIES = [
    ['Tuition', 'Tuition / Coaching'], ['Music', 'Music'], ['Dance', 'Dance'], ['Sports', 'Sports / Martial Arts / Yoga'],
    ['Arts', 'Arts'], ['Test Prep', 'Test Prep'], ['Language', 'Language'], ['Other', 'Coding / Hobby / Other'],
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;
const PHONE_CHARS_REGEX = /^[+]?[\d\s\-()]+$/;

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const { data: plans } = useApi<Plan[]>('/plans');
    const [planTier, setPlanTier] = useState<string | null>(null);
    const selectedPlan = planTier ?? plans?.find(p => p.isPopular)?.planTier;
    const [form, setForm] = useState({
        academyName: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        academyType: 'Tuition',
        password: '',
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [termsTouched, setTermsTouched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [session, setSession] = useState<SessionState | null>(null);

    const validateField = (name: string, value: string): string => {
        const val = value.trim();
        switch (name) {
            case 'academyName':
                if (!val) return 'Academy / Class name is required.';
                if (val.length < 2) return 'Academy name must be at least 2 characters.';
                if (val.length > 100) return 'Academy name cannot exceed 100 characters.';
                return '';
            case 'firstName':
                if (!val) return 'First name is required.';
                if (val.length < 2) return 'First name must be at least 2 characters.';
                if (!NAME_REGEX.test(val)) return 'First name can only contain letters.';
                return '';
            case 'lastName':
                if (!val) return 'Last name is required.';
                if (val.length < 2) return 'Last name must be at least 2 characters.';
                if (!NAME_REGEX.test(val)) return 'Last name can only contain letters.';
                return '';
            case 'email':
                if (!val) return 'Email address is required.';
                if (!EMAIL_REGEX.test(val)) return 'Please enter a valid email address (e.g. name@domain.com).';
                return '';
            case 'phone': {
                if (!val) return 'Mobile number is required.';
                if (/[a-zA-Z]/.test(val)) return 'Mobile number cannot contain letters.';
                const digits = val.replace(/\D/g, '');
                if (digits.length < 10) return 'Mobile number must be at least 10 digits.';
                if (digits.length > 15) return 'Mobile number cannot exceed 15 digits.';
                if (!PHONE_CHARS_REGEX.test(val)) return 'Enter a valid mobile phone format.';
                return '';
            }
            case 'password':
                if (!value) return 'Password is required.';
                if (value.length < 8) return 'Password must be at least 8 characters.';
                if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
                    return 'Password must contain at least one letter and one number.';
                }
                return '';
            default:
                return '';
        }
    };

    const handleFieldChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const val = e.target.value;
        setForm(f => ({ ...f, [key]: val }));
        if (touched[key]) {
            setFieldErrors(errs => ({ ...errs, [key]: validateField(key, val) }));
        }
        if (error) setError(null);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        // Clean non-phone characters as the user types
        const cleaned = raw.replace(/[^0-9+\s\-()]/g, '');
        setForm(f => ({ ...f, phone: cleaned }));
        if (touched.phone) {
            setFieldErrors(errs => ({ ...errs, phone: validateField('phone', cleaned) }));
        }
        if (error) setError(null);
    };

    const handleBlur = (key: keyof typeof form) => () => {
        setTouched(t => ({ ...t, [key]: true }));
        setFieldErrors(errs => ({ ...errs, [key]: validateField(key, form[key]) }));
    };

    const continueToPlan = (e: React.FormEvent) => {
        e.preventDefault();
        const allTouched = {
            academyName: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            password: true,
        };
        setTouched(allTouched);
        setTermsTouched(true);

        const errorsObj: Record<string, string> = {
            academyName: validateField('academyName', form.academyName),
            firstName: validateField('firstName', form.firstName),
            lastName: validateField('lastName', form.lastName),
            email: validateField('email', form.email),
            phone: validateField('phone', form.phone),
            password: validateField('password', form.password),
        };

        if (!acceptTerms) {
            errorsObj.acceptTerms = 'Please agree to the Terms of Service and Privacy Policy to continue.';
        }

        setFieldErrors(errorsObj);

        const firstError = Object.values(errorsObj).find(msg => Boolean(msg));
        if (firstError) {
            setError(firstError);
            return;
        }

        setError(null);
        setStep(1);
    };

    const getInputStyle = (fieldName: string) => {
        const hasError = touched[fieldName] && Boolean(fieldErrors[fieldName]);
        return {
            borderColor: hasError ? '#EF4444' : undefined,
            background: hasError ? '#FEF2F2' : undefined,
        };
    };

    const createAcademy = async () => {
        setBusy(true);
        setError(null);
        try {
            const created = await api<SessionState>('/auth/register', {
                method: 'POST', body: JSON.stringify({ ...form, planTier: selectedPlan, acceptTerms }),
            });
            saveSession({ ...created, selectedBranchId: null });
            setSession(created);
            setStep(2);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'linear-gradient(135deg, #4F46E5, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}>
                    <Shield size={18} color="white" />
                </div>
                <span style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A' }}>
                    Class<span className="gradient-text">Sphere</span>
                </span>
            </div>

            {/* Progress steps */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
                {steps.map((s, i) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: i < step ? '#10B981' : i === step ? '#4F46E5' : '#F1F5F9',
                            border: `2px solid ${i < step ? '#10B981' : i === step ? '#4F46E5' : '#E2E8F0'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: 700, color: i <= step ? 'white' : '#94A3B8',
                            transition: 'all 0.3s'
                        }}>
                            {i < step ? <CheckCircle size={16} /> : i + 1}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: i === step ? '#0F172A' : '#94A3B8' }}>{s}</span>
                        {i < steps.length - 1 && <div style={{ width: 32, height: 1, background: i < step ? '#10B981' : '#E2E8F0' }} />}
                    </div>
                ))}
            </div>

            {/* Card */}
            <div style={{ width: '100%', maxWidth: '480px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '36px', boxShadow: '0px 1px 3px rgba(15, 23, 42, 0.04), 0px 8px 16px -4px rgba(15, 23, 42, 0.03)' }}>
                {step === 0 && (
                    <>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px', color: '#0F172A', letterSpacing: '-0.015em' }}>Create your academy</h1>
                        <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '28px' }}>Start your 14-day free trial — no credit card needed</p>
                        <form onSubmit={continueToPlan} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label className="cs-label">Academy / Class Name *</label>
                                <input
                                    className="cs-input"
                                    placeholder="e.g. Ravi's Math Academy"
                                    autoComplete="organization"
                                    value={form.academyName}
                                    onChange={handleFieldChange('academyName')}
                                    onBlur={handleBlur('academyName')}
                                    style={getInputStyle('academyName')}
                                />
                                {touched.academyName && fieldErrors.academyName && (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        {fieldErrors.academyName}
                                    </p>
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label className="cs-label">Your First Name *</label>
                                    <input
                                        className="cs-input"
                                        placeholder="First name"
                                        autoComplete="given-name"
                                        value={form.firstName}
                                        onChange={handleFieldChange('firstName')}
                                        onBlur={handleBlur('firstName')}
                                        style={getInputStyle('firstName')}
                                    />
                                    {touched.firstName && fieldErrors.firstName && (
                                        <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                            {fieldErrors.firstName}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="cs-label">Last Name *</label>
                                    <input
                                        className="cs-input"
                                        placeholder="Last name"
                                        autoComplete="family-name"
                                        value={form.lastName}
                                        onChange={handleFieldChange('lastName')}
                                        onBlur={handleBlur('lastName')}
                                        style={getInputStyle('lastName')}
                                    />
                                    {touched.lastName && fieldErrors.lastName && (
                                        <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                            {fieldErrors.lastName}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="cs-label">Email Address *</label>
                                <input
                                    className="cs-input"
                                    type="email"
                                    placeholder="you@academy.com"
                                    autoComplete="email"
                                    value={form.email}
                                    onChange={handleFieldChange('email')}
                                    onBlur={handleBlur('email')}
                                    style={getInputStyle('email')}
                                />
                                {touched.email && fieldErrors.email && (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        {fieldErrors.email}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="cs-label">Mobile Number *</label>
                                <input
                                    className="cs-input"
                                    type="tel"
                                    placeholder="+91 98400 00000"
                                    autoComplete="tel"
                                    value={form.phone}
                                    onChange={handlePhoneChange}
                                    onBlur={handleBlur('phone')}
                                    style={getInputStyle('phone')}
                                />
                                {touched.phone && fieldErrors.phone ? (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        {fieldErrors.phone}
                                    </p>
                                ) : (
                                    <p style={{ color: '#94A3B8', fontSize: '11px', marginTop: '4px' }}>
                                        10 to 15 digits (e.g. 9840012345 or +91 98400 12345)
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="cs-label">Class Category *</label>
                                <select
                                    className="cs-input"
                                    style={{ cursor: 'pointer' }}
                                    value={form.academyType}
                                    onChange={handleFieldChange('academyType')}
                                >
                                    {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">Password *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className="cs-input"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Min 8 characters (letters & numbers)"
                                        autoComplete="new-password"
                                        style={{ paddingRight: '44px', ...getInputStyle('password') }}
                                        value={form.password}
                                        onChange={handleFieldChange('password')}
                                        onBlur={handleBlur('password')}
                                    />
                                    <button
                                        type="button"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {touched.password && fieldErrors.password ? (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        {fieldErrors.password}
                                    </p>
                                ) : (
                                    <p style={{ color: '#94A3B8', fontSize: '11px', marginTop: '4px' }}>
                                        Must be at least 8 characters with letters and numbers
                                    </p>
                                )}
                            </div>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={acceptTerms}
                                        onChange={e => {
                                            setAcceptTerms(e.target.checked);
                                            setTermsTouched(true);
                                            if (e.target.checked && fieldErrors.acceptTerms) {
                                                setFieldErrors(prev => ({ ...prev, acceptTerms: '' }));
                                            }
                                            if (error) setError(null);
                                        }}
                                        style={{ marginTop: 2, accentColor: '#4F46E5' }}
                                    />
                                    <span>I agree to ClassSphere&apos;s <a href="#" style={{ color: '#4F46E5', fontWeight: 500 }}>Terms of Service</a> and <a href="#" style={{ color: '#4F46E5', fontWeight: 500 }}>Privacy Policy</a></span>
                                </label>
                                {termsTouched && !acceptTerms && (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        Please agree to the Terms of Service and Privacy Policy to continue.
                                    </p>
                                )}
                            </div>
                            {error && (
                                <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', color: '#B91C1C', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}
                            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '12px', height: '44px', fontSize: '15px' }}>
                                Continue <ArrowRight size={16} />
                            </button>
                        </form>
                    </>
                )}

                {step === 1 && (
                    <>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px', color: '#0F172A', letterSpacing: '-0.015em' }}>Choose your plan</h1>
                        <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>Start with a free 14-day trial on any plan</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                            {plans?.map(p => {
                                const selected = p.planTier === selectedPlan;
                                return (
                                <label key={p.planTier} style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                                    background: selected ? 'rgba(79,70,229,0.04)' : '#F8FAFC',
                                    border: `1px solid ${selected ? 'rgba(79,70,229,0.25)' : '#E2E8F0'}`,
                                    borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                                }}>
                                    <input type="radio" name="plan" checked={selected} onChange={() => setPlanTier(p.planTier)} style={{ accentColor: '#4F46E5' }} />
                                    <span style={{ fontWeight: 600, fontSize: '14px', color: selected ? '#4338CA' : '#0F172A' }}>
                                        {p.planTier} — {formatMoney(p.priceMonthly, p.currency)}/mo{p.isPopular ? ' ⭐' : ''}
                                    </span>
                                </label>
                                );
                            })}
                        </div>
                        {error && <div role="alert" style={{ color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" className="btn-secondary" style={{ height: '44px' }} disabled={busy} onClick={() => { setError(null); setStep(0); }}>
                                <ArrowLeft size={16} /> Back
                            </button>
                            <button className="btn-primary" style={{ justifyContent: 'center', flex: 1, padding: '12px', height: '44px', fontSize: '15px' }} disabled={busy || !selectedPlan} onClick={createAcademy}>
                                {busy ? 'Creating your academy…' : <>Create Academy <ArrowRight size={16} /></>}
                            </button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
                            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '10px', color: '#0F172A', letterSpacing: '-0.015em' }}>Welcome to ClassSphere!</h1>
                            <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>
                                {form.academyName.trim()} is ready, with a Main Campus branch. Next, add your courses, batches and students.
                                You can sign in any time with {form.email.trim().toLowerCase()}.
                            </p>
                            <button className="btn-primary" style={{ justifyContent: 'center', padding: '12px 32px', height: '44px', fontSize: '15px' }}
                                onClick={() => router.replace(session ? homePath(session) : '/login')}>
                                Go to Dashboard <ArrowRight size={16} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            <p style={{ marginTop: '24px', fontSize: '13px', color: '#94A3B8' }}>
                Already have an account? <Link href="/login" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </p>
        </div>
    );
}
