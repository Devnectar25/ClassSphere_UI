'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    CheckCircle, ArrowRight, Eye, EyeOff, BadgeCheck, Circle,
    GraduationCap, HeartHandshake, X
} from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { saveSession, type SessionState } from '@/lib/session';
import AuthBrandPanel from '@/components/AuthBrandPanel';

type PortalRole = 'student' | 'parent';

interface AcademyOption {
    tenantId: string;
    name: string;
    academyType: string;
    slug: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[a-zA-Z]+(?:[ '.-][a-zA-Z]*)*$/;
const MAX = { firstName: 50, lastName: 50, email: 254, phone: 10, password: 64 };
const RELATIONSHIPS = ['Parent', 'Mother', 'Father', 'Guardian'];
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_SECONDS = 30;

const PASSWORD_RULES: Array<{ label: string; test: (v: string) => boolean }> = [
    { label: '8–64 characters', test: v => v.length >= 8 && v.length <= MAX.password },
    { label: 'An uppercase letter', test: v => /[A-Z]/.test(v) },
    { label: 'A lowercase letter', test: v => /[a-z]/.test(v) },
    { label: 'A number', test: v => /[0-9]/.test(v) },
    { label: 'A special character (!@#$…)', test: v => /[^a-zA-Z0-9\s]/.test(v) },
    { label: 'No spaces', test: v => v.length > 0 && !/\s/.test(v) },
];

function phoneError(value: string): string {
    const val = value.trim();
    if (!val) return 'Mobile number is required.';
    if (!/^\d+$/.test(val)) return 'Only digits are allowed.';
    if (val.length !== 10) return 'Enter a valid 10-digit mobile number.';
    if (!/^[6-9]/.test(val)) return 'Indian mobile numbers start with 6, 7, 8 or 9.';
    if (/^(\d)\1{9}$/.test(val)) return 'Enter a real mobile number.';
    return '';
}

function PortalRegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialRole: PortalRole = searchParams.get('role') === 'parent' ? 'parent' : 'student';

    const { data: academies } = useApi<AcademyOption[]>('/auth/academies');
    const [role, setRole] = useState<PortalRole>(initialRole);
    const [done, setDone] = useState(false);

    const [form, setForm] = useState({
        tenantId: '',
        firstName: '',
        lastName: '',
        childFirstName: '',
        childLastName: '',
        relationship: 'Parent',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [termsTouched, setTermsTouched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Demo OTP state (matching /register)
    const [otp, setOtp] = useState<{ code: string; phone: string; expiresAt: number } | null>(null);
    const [otpInput, setOtpInput] = useState('');
    const [otpError, setOtpError] = useState<string | null>(null);
    const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
    const [resendIn, setResendIn] = useState(0);

    const phoneDigits = form.phone.replace(/\D/g, '');
    const phoneVerified = verifiedPhone !== null && verifiedPhone === phoneDigits;
    const accent = '#4F46E5';

    useEffect(() => {
        const param = searchParams.get('role');
        if (param === 'student' || param === 'parent') setRole(param);
    }, [searchParams]);

    useEffect(() => {
        if (academies?.length && !form.tenantId) {
            setForm(f => ({ ...f, tenantId: academies[0].tenantId }));
        }
    }, [academies, form.tenantId]);

    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn(s => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);

    const validateField = (name: string, value: string, nextRole: PortalRole = role): string => {
        const val = value.trim();
        switch (name) {
            case 'tenantId':
                return val ? '' : 'Please select your academy.';
            case 'firstName':
            case 'lastName': {
                const label = name === 'firstName' ? 'First name' : 'Last name';
                const min = name === 'firstName' ? 2 : 1;
                if (!val) return `${label} is required.`;
                if (val.length < min) return `${label} must be at least ${min} characters.`;
                if (val.length > MAX[name]) return `${label} cannot exceed ${MAX[name]} characters.`;
                if (/\d/.test(val)) return `${label} cannot contain numbers.`;
                if (!NAME_REGEX.test(val)) return `${label} can only contain letters, spaces, apostrophes, hyphens and dots.`;
                return '';
            }
            case 'childFirstName':
            case 'childLastName': {
                if (nextRole !== 'parent') return '';
                const label = name === 'childFirstName' ? "Child's first name" : "Child's last name";
                const min = name === 'childFirstName' ? 2 : 1;
                if (!val) return `${label} is required.`;
                if (val.length < min) return `${label} must be at least ${min} characters.`;
                if (/\d/.test(val)) return `${label} cannot contain numbers.`;
                if (!NAME_REGEX.test(val)) return `${label} can only contain letters, spaces, apostrophes, hyphens and dots.`;
                return '';
            }
            case 'email': {
                if (!val) return '';
                if (/\s/.test(val)) return 'Email address cannot contain spaces.';
                if (val.length > MAX.email) return `Email address cannot exceed ${MAX.email} characters.`;
                if (!EMAIL_REGEX.test(val)) return 'Please enter a valid email address (e.g. name@domain.com).';
                return '';
            }
            case 'phone':
                return phoneError(value);
            case 'password': {
                if (!value) return 'Password is required.';
                const failed = PASSWORD_RULES.find(r => !r.test(value));
                if (failed) return `Password needs: ${failed.label.toLowerCase()}.`;
                if (phoneDigits.length >= 6 && value.includes(phoneDigits.slice(-6))) {
                    return 'Password should not contain your mobile number.';
                }
                return '';
            }
            case 'confirmPassword': {
                if (!value) return 'Please confirm your password.';
                if (value !== form.password) return 'Passwords do not match.';
                return '';
            }
            default:
                return '';
        }
    };

    const handleFieldChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let val = e.target.value;
        if (key === 'firstName' || key === 'lastName' || key === 'childFirstName' || key === 'childLastName') {
            val = val.replace(/[0-9]/g, '');
        }
        setForm(f => ({ ...f, [key]: val }));
        if (touched[key]) {
            setFieldErrors(errs => ({ ...errs, [key]: validateField(key, val) }));
        }
        if (key === 'password' && (form.confirmPassword || touched.confirmPassword)) {
            setFieldErrors(errs => ({
                ...errs,
                confirmPassword: form.confirmPassword ? (form.confirmPassword === val ? '' : 'Passwords do not match.') : 'Please confirm your password.',
            }));
        }
        if (key === 'confirmPassword') {
            setTouched(t => ({ ...t, confirmPassword: true }));
            setFieldErrors(errs => ({
                ...errs,
                confirmPassword: !val ? 'Please confirm your password.' : val !== form.password ? 'Passwords do not match.' : '',
            }));
        }
        if (error) setError(null);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (phoneVerified) return;
        const cleaned = e.target.value.replace(/\D/g, '').slice(0, MAX.phone);
        setForm(f => ({ ...f, phone: cleaned }));
        if (touched.phone) {
            setFieldErrors(errs => ({ ...errs, phone: validateField('phone', cleaned) }));
        }
        if (error) setError(null);
    };

    const handleBlur = (key: keyof typeof form) => () => {
        if (key === 'phone' && phoneVerified) return;
        let val = form[key];
        if (key === 'firstName' || key === 'lastName' || key === 'childFirstName' || key === 'childLastName') {
            val = val.trim().replace(/\s+/g, ' ');
        } else if (key === 'email') {
            val = val.trim().toLowerCase();
        } else if (key === 'phone') {
            val = val.trim();
        }
        if (val !== form[key]) setForm(f => ({ ...f, [key]: val }));
        setTouched(t => ({ ...t, [key]: true }));
        setFieldErrors(errs => ({ ...errs, [key]: validateField(key, val) }));
    };

    const sendOtp = () => {
        setTouched(t => ({ ...t, phone: true }));
        const pErr = validateField('phone', form.phone);
        setFieldErrors(errs => ({ ...errs, phone: pErr }));
        if (pErr) return;
        const code = String(Math.floor(100000 + Math.random() * 900000));
        setOtp({ code, phone: phoneDigits, expiresAt: Date.now() + OTP_TTL_MS });
        setOtpInput('');
        setOtpError(null);
        setResendIn(OTP_RESEND_SECONDS);
    };

    const verifyOtp = () => {
        if (!otp) return;
        if (otp.phone !== phoneDigits) { setOtpError('The mobile number changed. Please send a new OTP.'); return; }
        if (Date.now() > otp.expiresAt) { setOtpError('This OTP has expired. Please resend.'); return; }
        if (otpInput.trim() !== otp.code) { setOtpError('Incorrect OTP. Please try again.'); return; }
        setVerifiedPhone(phoneDigits);
        setOtp(null);
        setOtpInput('');
        setOtpError(null);
        setFieldErrors(errs => ({ ...errs, phoneOtp: '' }));
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const fields = (role === 'parent'
            ? ['tenantId', 'firstName', 'lastName', 'childFirstName', 'childLastName', 'email', 'phone', 'password', 'confirmPassword']
            : ['tenantId', 'firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword']) as Array<keyof typeof form>;

        setTouched(Object.fromEntries(fields.map(f => [f, true])));
        setTermsTouched(true);

        const errs: Record<string, string> = Object.fromEntries(fields.map(f => [f, validateField(f, form[f])]));
        if (!errs.phone && !phoneVerified) {
            errs.phoneOtp = 'Please verify your mobile number with the OTP.';
        }
        if (!acceptTerms) {
            errs.acceptTerms = 'Please agree to the Terms of Service and Privacy Policy to continue.';
        }
        setFieldErrors(errs);

        const firstError = Object.values(errs).find(Boolean);
        if (firstError) {
            setError(firstError);
            return;
        }

        setBusy(true);
        setError(null);
        try {
            const created = await api<SessionState>('/auth/register-portal', {
                method: 'POST',
                body: JSON.stringify({
                    role,
                    tenantId: form.tenantId,
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    childFirstName: role === 'parent' ? form.childFirstName.trim() : form.firstName.trim(),
                    childLastName: role === 'parent' ? form.childLastName.trim() : form.lastName.trim(),
                    relationship: role === 'parent' ? form.relationship : 'Self',
                    email: form.email.trim() || null,
                    phone: form.phone.trim(),
                    password: form.password,
                    acceptTerms,
                }),
            });
            saveSession({ ...created, selectedBranchId: null });
            setDone(true);
        } catch (errObj) {
            setError((errObj as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const getInputStyle = (fieldName: string) => {
        const hasError = touched[fieldName] && Boolean(fieldErrors[fieldName]);
        return {
            borderColor: hasError ? '#EF4444' : undefined,
            background: hasError ? '#FEF2F2' : undefined,
        };
    };

    const selectedAcademyName = academies?.find(a => a.tenantId === form.tenantId)?.name ?? 'your academy';

    return (
        <div className="reg-page">
          <div className="reg-shell">
            <AuthBrandPanel />

            <div className="reg-main">
                <Link href="/" aria-label="Close and go to home page" className="reg-close">
                    <X size={18} />
                </Link>

                {/* ─── Static header: role switcher + title ─── */}
                {!done && (
                    <div style={{ flexShrink: 0, padding: '32px 36px 0' }}>
                      <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.16em', color: accent, marginBottom: '8px', textAlign: 'center' }}>
                            JOIN YOUR ACADEMY
                        </div>
                        <h1 className="reg-title" style={{ marginBottom: '6px' }}>
                            {role === 'student' ? 'Student Registration' : 'Parent Registration'}
                        </h1>
                        <p className="reg-subtitle" style={{ fontSize: '14px', marginBottom: '18px', lineHeight: 1.5 }}>
                            {role === 'student'
                                ? 'Create your student portal account to view schedules, test scores, and badges.'
                                : 'Create your parent portal account to monitor attendance, report cards, and fees.'}
                        </p>

                        {/* Role Switcher */}
                        <div role="tablist" aria-label="Register as" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '12px' }}>
                            {[
                                { id: 'student' as PortalRole, label: 'Student', icon: GraduationCap, color: '#4F46E5' },
                                { id: 'parent' as PortalRole, label: 'Parent / Guardian', icon: HeartHandshake, color: '#4F46E5' },
                            ].map(tab => {
                                const active = role === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => { setRole(tab.id); setError(null); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            height: '36px', padding: '0 10px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                                            fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
                                            background: active ? '#FFFFFF' : 'transparent',
                                            color: active ? tab.color : '#64748B',
                                            boxShadow: active ? '0 1px 3px rgba(15, 23, 42, 0.1)' : 'none',
                                        }}
                                    >
                                        <tab.icon size={15} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                      </div>
                    </div>
                )}

                {/* ─── Scrollable fields ─── */}
                <div className="reg-body no-scrollbar" style={{ padding: '20px 36px 24px', scrollbarWidth: 'none' }}>
                {!done ? (
                    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '380px', margin: '0 auto' }}>

                        {/* Select Academy */}
                        <div>
                            <label className="cs-label">Select Your Academy *</label>
                            <select
                                className="cs-input reg-native-select"
                                value={form.tenantId}
                                onChange={handleFieldChange('tenantId')}
                                onBlur={handleBlur('tenantId')}
                                style={{ cursor: 'pointer', ...getInputStyle('tenantId') }}
                            >
                                {!academies && <option value="">Loading academies…</option>}
                                {academies?.map(a => (
                                    <option key={a.tenantId} value={a.tenantId}>
                                        {a.name} ({a.academyType})
                                    </option>
                                ))}
                            </select>
                            {touched.tenantId && fieldErrors.tenantId && (
                                <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>{fieldErrors.tenantId}</p>
                            )}
                        </div>

                        {/* Name row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">{role === 'parent' ? 'Parent First Name *' : 'First Name *'}</label>
                                <input
                                    className="cs-input"
                                    placeholder="First name"
                                    autoComplete="given-name"
                                    maxLength={MAX.firstName}
                                    value={form.firstName}
                                    onChange={handleFieldChange('firstName')}
                                    onBlur={handleBlur('firstName')}
                                    style={getInputStyle('firstName')}
                                />
                                {touched.firstName && fieldErrors.firstName && (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>{fieldErrors.firstName}</p>
                                )}
                            </div>
                            <div>
                                <label className="cs-label">{role === 'parent' ? 'Parent Last Name *' : 'Last Name *'}</label>
                                <input
                                    className="cs-input"
                                    placeholder="Last name"
                                    autoComplete="family-name"
                                    maxLength={MAX.lastName}
                                    value={form.lastName}
                                    onChange={handleFieldChange('lastName')}
                                    onBlur={handleBlur('lastName')}
                                    style={getInputStyle('lastName')}
                                />
                                {touched.lastName && fieldErrors.lastName && (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>{fieldErrors.lastName}</p>
                                )}
                            </div>
                        </div>

                        {/* Child details (Parent registration only) */}
                        {role === 'parent' && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label className="cs-label">Child&apos;s First Name *</label>
                                        <input
                                            className="cs-input"
                                            placeholder="Student first name"
                                            maxLength={MAX.firstName}
                                            value={form.childFirstName}
                                            onChange={handleFieldChange('childFirstName')}
                                            onBlur={handleBlur('childFirstName')}
                                            style={getInputStyle('childFirstName')}
                                        />
                                        {touched.childFirstName && fieldErrors.childFirstName && (
                                            <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>{fieldErrors.childFirstName}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="cs-label">Child&apos;s Last Name *</label>
                                        <input
                                            className="cs-input"
                                            placeholder="Student last name"
                                            maxLength={MAX.lastName}
                                            value={form.childLastName}
                                            onChange={handleFieldChange('childLastName')}
                                            onBlur={handleBlur('childLastName')}
                                            style={getInputStyle('childLastName')}
                                        />
                                        {touched.childLastName && fieldErrors.childLastName && (
                                            <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>{fieldErrors.childLastName}</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="cs-label">Relationship *</label>
                                    <select
                                        className="cs-input reg-native-select"
                                        style={{ cursor: 'pointer' }}
                                        value={form.relationship}
                                        onChange={handleFieldChange('relationship')}
                                    >
                                        {RELATIONSHIPS.map(rel => <option key={rel} value={rel}>{rel}</option>)}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Email (optional) */}
                        <div>
                            <label className="cs-label">Email Address <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span></label>
                            <input
                                className="cs-input"
                                type="email"
                                placeholder="you@example.com"
                                autoComplete="email"
                                maxLength={MAX.email}
                                value={form.email}
                                onChange={handleFieldChange('email')}
                                onBlur={handleBlur('email')}
                                style={getInputStyle('email')}
                            />
                            {touched.email && fieldErrors.email && (
                                <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Mobile Number + OTP verification (identical to /register) */}
                        <div>
                            <label className="cs-label">Mobile Number *</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    className="cs-input"
                                    type="tel"
                                    placeholder="9840012345"
                                    autoComplete="tel"
                                    inputMode="numeric"
                                    maxLength={MAX.phone}
                                    value={form.phone}
                                    disabled={phoneVerified}
                                    readOnly={phoneVerified}
                                    onChange={handlePhoneChange}
                                    onBlur={handleBlur('phone')}
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        ...getInputStyle('phone'),
                                        ...(phoneVerified ? {
                                            borderColor: '#10B981',
                                            background: '#F0FDF4',
                                            color: '#475569',
                                            cursor: 'not-allowed',
                                        } : {}),
                                    }}
                                />
                                {phoneVerified ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0 12px', borderRadius: '8px', background: '#ECFDF5', color: '#047857', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        <BadgeCheck size={16} /> Verified
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={sendOtp}
                                        disabled={resendIn > 0}
                                        style={{ whiteSpace: 'nowrap', justifyContent: 'center', minWidth: '110px' }}
                                    >
                                        {resendIn > 0 ? `Resend in ${resendIn}s` : otp ? 'Resend OTP' : 'Send OTP'}
                                    </button>
                                )}
                            </div>
                            {touched.phone && fieldErrors.phone ? (
                                <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>{fieldErrors.phone}</p>
                            ) : !phoneVerified && fieldErrors.phoneOtp ? (
                                <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>{fieldErrors.phoneOtp}</p>
                            ) : (
                                <p style={{ color: '#94A3B8', fontSize: '11px', marginTop: '4px' }}>
                                    {phoneVerified ? 'Mobile number verified and locked' : 'Enter a 10-digit mobile number (e.g. 9840012345)'}
                                </p>
                            )}

                            {otp && !phoneVerified && (
                                <div style={{ marginTop: '10px', padding: '12px', border: '1px solid #C7D2FE', background: '#EEF2FF', borderRadius: '8px' }}>
                                    <p style={{ fontSize: '12px', color: '#4338CA', marginBottom: '8px' }}>
                                        <strong>Demo mode:</strong> no SMS is sent. Your OTP is{' '}
                                        <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, letterSpacing: '0.15em' }}>{otp.code}</span>
                                    </p>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            className="cs-input"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={6}
                                            placeholder="Enter 6-digit OTP"
                                            value={otpInput}
                                            onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(null); }}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verifyOtp(); } }}
                                            style={{ flex: 1, minWidth: 0, letterSpacing: '0.2em', background: '#FFFFFF' }}
                                        />
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={verifyOtp}
                                            disabled={otpInput.length !== 6}
                                            style={{ justifyContent: 'center', minWidth: '90px' }}
                                        >
                                            Verify
                                        </button>
                                    </div>
                                    {otpError && (
                                        <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{otpError}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Password (Dynamic strength bar + unmet-only rules) */}
                        <div>
                            <label className="cs-label">Password *</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="cs-input"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Create a strong password"
                                    autoComplete="new-password"
                                    maxLength={MAX.password}
                                    value={form.password}
                                    onChange={handleFieldChange('password')}
                                    onFocus={() => setPasswordFocused(true)}
                                    onBlur={() => { setPasswordFocused(false); handleBlur('password')(); }}
                                    style={{ paddingRight: '42px', ...getInputStyle('password') }}
                                />
                                <button
                                    type="button"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    onClick={() => setShowPassword(v => !v)}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {(() => {
                                const pw = form.password;
                                const passed = PASSWORD_RULES.filter(r => r.test(pw)).length;
                                const pending = PASSWORD_RULES.filter(r => !r.test(pw));
                                const showHints = pw.length > 0 && (passwordFocused || !touched.password);
                                if (!showHints) {
                                    return touched.password && fieldErrors.password ? (
                                        <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>{fieldErrors.password}</p>
                                    ) : null;
                                }
                                const ratio = passed / PASSWORD_RULES.length;
                                const [strength, color] = ratio === 1 ? ['Strong', '#10B981'] : ratio >= 0.67 ? ['Medium', '#F59E0B'] : ['Weak', '#EF4444'];
                                return (
                                    <div style={{ marginTop: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#E2E8F0', overflow: 'hidden' }}>
                                                <div style={{ width: `${ratio * 100}%`, height: '100%', background: color, transition: 'width 0.2s, background 0.2s' }} />
                                            </div>
                                            <span style={{ fontSize: '11px', fontWeight: 600, color }}>{strength}</span>
                                        </div>
                                        {pending.length > 0 ? (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                {pending.map(rule => (
                                                    <li key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
                                                        <Circle size={10} /> {rule.label}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
                                                <CheckCircle size={12} /> Great, your password is strong
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="cs-label">Confirm Password *</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="cs-input"
                                    type={showConfirm ? 'text' : 'password'}
                                    placeholder="Re-enter your password"
                                    autoComplete="new-password"
                                    maxLength={MAX.password}
                                    value={form.confirmPassword}
                                    onChange={handleFieldChange('confirmPassword')}
                                    onBlur={handleBlur('confirmPassword')}
                                    style={{
                                        paddingRight: '42px',
                                        ...getInputStyle('confirmPassword'),
                                        ...(form.confirmPassword && !fieldErrors.confirmPassword && form.confirmPassword === form.password ? { borderColor: '#10B981' } : {}),
                                    }}
                                />
                                <button
                                    type="button"
                                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                    onClick={() => setShowConfirm(v => !v)}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                                >
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {touched.confirmPassword && fieldErrors.confirmPassword ? (
                                <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>{fieldErrors.confirmPassword}</p>
                            ) : form.confirmPassword.length > 0 && form.confirmPassword === form.password ? (
                                <p style={{ color: '#059669', fontSize: '12px', marginTop: '4px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle size={13} /> Passwords match
                                </p>
                            ) : null}
                        </div>

                        {/* Terms */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={acceptTerms}
                                    onChange={e => {
                                        setAcceptTerms(e.target.checked);
                                        setTermsTouched(true);
                                        if (e.target.checked && fieldErrors.acceptTerms) setFieldErrors(prev => ({ ...prev, acceptTerms: '' }));
                                        if (error) setError(null);
                                    }}
                                    style={{ marginTop: 2, accentColor: accent }}
                                />
                                <span>I agree to ClassSphere&apos;s <a href="#" style={{ color: accent, fontWeight: 500 }}>Terms of Service</a> and <a href="#" style={{ color: accent, fontWeight: 500 }}>Privacy Policy</a></span>
                            </label>
                            {termsTouched && !acceptTerms && (
                                <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                    Please agree to the Terms of Service and Privacy Policy to continue.
                                </p>
                            )}
                        </div>

                        {error && (
                            <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 12px', color: '#B91C1C', fontSize: '13px', fontWeight: 500 }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={busy}
                            style={{ justifyContent: 'center', height: '46px', fontSize: '15px', fontWeight: 700, borderRadius: '12px', background: accent, borderColor: accent, boxShadow: `0 10px 22px -8px ${accent}80` }}
                        >
                            {busy ? 'Creating account…' : <>{role === 'student' ? 'Register as Student' : 'Register as Parent'} <ArrowRight size={16} /></>}
                        </button>
                    </form>
                ) : (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <CheckCircle size={28} color="#10B981" />
                        </div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                            Welcome to {selectedAcademyName}!
                        </h1>
                        <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                            Your {role === 'student' ? 'Student' : 'Parent'} Portal account is ready. You can sign in anytime using your mobile number ({form.phone}){form.email.trim() ? ` or ${form.email.trim()}` : ''}.
                        </p>
                        <button
                            className="btn-primary"
                            onClick={() => router.replace('/portal')}
                            style={{ width: '100%', justifyContent: 'center', height: '44px', background: accent, borderColor: accent }}
                        >
                            Open {role === 'student' ? 'Student' : 'Parent'} Portal <ArrowRight size={16} />
                        </button>
                    </div>
                )}
                </div>

                {/* ─── Static footer ─── */}
                {!done && (
                    <p className="reg-foot">
                        Already registered? <Link href={`/login?role=${role}`} style={{ color: accent, fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
                        {' • '}
                        <Link href="/register" style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>Register an Academy</Link>
                    </p>
                )}
            </div>
          </div>
        </div>
    );
}

export default function PortalRegisterPage() {
    return (
        <Suspense fallback={<div className="reg-page" />}>
            <PortalRegisterForm />
        </Suspense>
    );
}

