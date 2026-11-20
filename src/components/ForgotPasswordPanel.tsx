'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, CheckCircle, Circle, BadgeCheck, UserRound, Lock } from 'lucide-react';
import { api } from '@/lib/api';

const MAX_PASSWORD = 64;
const OTP_RESEND_SECONDS = 30;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

const PASSWORD_RULES: Array<{ label: string; test: (v: string) => boolean }> = [
    { label: '8–64 characters', test: v => v.length >= 8 && v.length <= MAX_PASSWORD },
    { label: 'An uppercase letter', test: v => /[A-Z]/.test(v) },
    { label: 'A lowercase letter', test: v => /[a-z]/.test(v) },
    { label: 'A number', test: v => /[0-9]/.test(v) },
    { label: 'A special character (!@#$…)', test: v => /[^a-zA-Z0-9\s]/.test(v) },
    { label: 'No spaces', test: v => v.length > 0 && !/\s/.test(v) },
];

interface ForgotResponse {
    resetToken: string;
    expiresInSeconds: number;
    maskedTarget: string;
    demoOtp?: string;
}

const iconLeft: React.CSSProperties = { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' };
const errText: React.CSSProperties = { color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 };
const eyeBtn: React.CSSProperties = { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' };

function normaliseIdentifier(raw: string): string {
    const v = raw.trim();
    return /^[\d\s]+$/.test(v) && /\d/.test(v) ? v.replace(/\D/g, '').slice(0, 10) : v;
}

/**
 * Forgot-password flow: send OTP → verify OTP → set a new password.
 * Rendered inside the sign-in card (and by the standalone /forgot-password page).
 */
export default function ForgotPasswordPanel({
    initialIdentifier = '',
    lockInitialIdentifier = false,
    accent = '#4F46E5',
    onBack,
    onDone,
}: {
    initialIdentifier?: string;
    /** Keep the email/mobile read-only when it was supplied by the caller. */
    lockInitialIdentifier?: boolean;
    accent?: string;
    onBack: () => void;
    onDone: (identifier: string) => void;
}) {
    const startId = normaliseIdentifier(initialIdentifier);
    const [identifier, setIdentifier] = useState(startId);
    const [identifierError, setIdentifierError] = useState<string | null>(null);
    const [identifierTouched, setIdentifierTouched] = useState(false);

    const [challenge, setChallenge] = useState<(ForgotResponse & { identifier: string }) | null>(null);
    const [otpInput, setOtpInput] = useState('');
    const [otpError, setOtpError] = useState<string | null>(null);
    const [verifiedOtp, setVerifiedOtp] = useState<{ code: string; resetToken: string; identifier: string } | null>(null);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [resendIn, setResendIn] = useState(0);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const [fieldErrors, setFieldErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
    const [touched, setTouched] = useState<{ newPassword?: boolean; confirmPassword?: boolean }>({});
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const otpVerified = verifiedOtp !== null && verifiedOtp.identifier === identifier.trim();
    const identifierLocked = (lockInitialIdentifier && Boolean(startId)) || Boolean(challenge) || otpVerified;

    useEffect(() => {
        if (resendIn <= 0) return;
        const timer = setTimeout(() => setResendIn(s => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendIn]);

    const validateIdentifier = (val: string): string | null => {
        const trimmed = val.trim();
        if (!trimmed) return 'Email or mobile number is required.';
        if (trimmed.includes('@')) {
            if (/\s/.test(trimmed)) return 'Email address cannot contain spaces.';
            if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address.';
            return null;
        }
        if (!/^\d{10}$/.test(trimmed)) return 'Enter a valid 10-digit mobile number or email address.';
        return null;
    };

    const validateNewPassword = (val: string): string => {
        if (!val) return 'New password is required.';
        const failed = PASSWORD_RULES.find(r => !r.test(val));
        if (failed) return `Password needs: ${failed.label.toLowerCase()}.`;
        const digits = identifier.replace(/\D/g, '');
        if (digits.length >= 6 && val.includes(digits.slice(-6))) return 'Password should not contain your mobile number.';
        return '';
    };

    const validateConfirmPassword = (val: string, pw: string): string => {
        if (!val) return 'Please confirm your new password.';
        if (val !== pw) return 'Passwords do not match.';
        return '';
    };

    const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (identifierLocked) return;
        let val = e.target.value;
        if (/^[\d\s]+$/.test(val) && /\d/.test(val)) val = val.replace(/\D/g, '').slice(0, 10);
        setIdentifier(val);
        if (identifierTouched) setIdentifierError(validateIdentifier(val));
        if (otpError) setOtpError(null);
        if (error) setError(null);
    };

    const sendOtp = async () => {
        setIdentifierTouched(true);
        const err = validateIdentifier(identifier);
        setIdentifierError(err);
        if (err) return;

        setSendingOtp(true);
        setOtpError(null);
        setError(null);
        try {
            const trimmed = identifier.trim();
            const res = await api<ForgotResponse>('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ identifier: trimmed }),
            });
            setChallenge({ ...res, identifier: trimmed });
            setOtpInput('');
            setResendIn(OTP_RESEND_SECONDS);
        } catch (errObj) {
            setIdentifierError((errObj as Error).message);
        } finally {
            setSendingOtp(false);
        }
    };

    const verifyOtp = async () => {
        if (!challenge) return;
        const trimmedId = identifier.trim();
        if (challenge.identifier !== trimmedId) {
            setOtpError('The email/mobile number changed. Please send a new OTP.');
            return;
        }
        const code = otpInput.trim();
        if (!/^\d{6}$/.test(code)) {
            setOtpError('Please enter a valid 6-digit OTP.');
            return;
        }
        setVerifyingOtp(true);
        setOtpError(null);
        try {
            await api<{ verified: boolean }>('/auth/forgot-password/verify', {
                method: 'POST',
                body: JSON.stringify({ resetToken: challenge.resetToken, otp: code }),
            });
            setVerifiedOtp({ code, resetToken: challenge.resetToken, identifier: trimmedId });
            setChallenge(null);
            setOtpInput('');
            setError(null);
        } catch (errObj) {
            setOtpError((errObj as Error).message);
        } finally {
            setVerifyingOtp(false);
        }
    };

    const submitReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verifiedOtp || !otpVerified) {
            setError('Please verify your account with the OTP first.');
            return;
        }
        const nextErrors = {
            newPassword: validateNewPassword(newPassword),
            confirmPassword: validateConfirmPassword(confirmPassword, newPassword),
        };
        setTouched({ newPassword: true, confirmPassword: true });
        setFieldErrors(nextErrors);
        if (nextErrors.newPassword || nextErrors.confirmPassword) return;

        setError(null);
        setBusy(true);
        try {
            await api<{ message: string }>('/auth/forgot-password/reset', {
                method: 'POST',
                body: JSON.stringify({ resetToken: verifiedOtp.resetToken, otp: verifiedOtp.code, newPassword, confirmPassword }),
            });
            onDone(identifier.trim());
        } catch (errObj) {
            setError((errObj as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const inputErrorStyle = (hasErr: boolean): React.CSSProperties => hasErr ? { borderColor: '#EF4444', backgroundColor: '#FEF2F2' } : {};
    const stepNo = otpVerified ? 3 : challenge ? 2 : 1;
    const stepText = otpVerified ? 'Set a new password' : challenge ? 'Enter the OTP' : 'Verify your account';

    return (
        <form onSubmit={submitReset} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Mini progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {[1, 2, 3].map(n => (
                            <span key={n} style={{ width: n === stepNo ? 28 : 16, height: 4, borderRadius: 4, background: n <= stepNo ? accent : '#E2E8F0', transition: 'all 0.25s' }} />
                        ))}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Step {stepNo} of 3 · {stepText}</span>
                </div>

                {/* Contextual guidance */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '11px 14px', marginBottom: '16px', fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                    {otpVerified
                        ? 'Your identity is verified. Enter and confirm your new password below.'
                        : challenge
                            ? 'Enter the 6-digit one-time code sent to your registered contact.'
                            : 'Enter your registered email or mobile number to receive a 6-digit verification code.'}
                </div>

                {/* Email / Mobile + Send OTP */}
                <div>
                    <label className="cs-label" htmlFor="fp-identifier" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                        Email or Mobile Number <span className="reg-req">*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                        <UserRound size={17} style={iconLeft} />
                        <input
                            id="fp-identifier"
                            className="cs-input"
                            type="text"
                            autoComplete="username"
                            placeholder="you@academy.com or 9840012345"
                            value={identifier}
                            disabled={identifierLocked}
                            readOnly={identifierLocked}
                            onChange={handleIdentifierChange}
                            onBlur={() => {
                                if (identifierLocked) return;
                                setIdentifierTouched(true);
                                setIdentifierError(validateIdentifier(identifier));
                            }}
                            onKeyDown={e => { if (e.key === 'Enter' && !otpVerified) { e.preventDefault(); sendOtp(); } }}
                            style={{
                                width: '100%',
                                paddingLeft: '42px',
                                ...inputErrorStyle(Boolean(identifierTouched && identifierError)),
                                ...(otpVerified
                                    ? { borderColor: '#10B981', backgroundColor: '#F0FDF4', color: '#475569', cursor: 'not-allowed' }
                                    : identifierLocked ? { backgroundColor: '#F1F5F9', color: '#475569', cursor: 'not-allowed' } : {}),
                            }}
                        />
                    </div>
                    {otpVerified ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0 12px', borderRadius: '12px', background: '#ECFDF5', color: '#047857', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', height: '42px' }}>
                            <BadgeCheck size={16} /> Verified
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={sendOtp}
                            disabled={resendIn > 0 || sendingOtp}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '42px',
                                minWidth: '104px',
                                padding: '0 16px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                border: 'none',
                                cursor: resendIn > 0 || sendingOtp ? 'not-allowed' : 'pointer',
                                backgroundColor: resendIn > 0 || sendingOtp ? '#E2E8F0' : accent,
                                color: resendIn > 0 || sendingOtp ? '#64748B' : '#FFFFFF',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {sendingOtp ? 'Sending…' : resendIn > 0 ? `Resend ${resendIn}s` : challenge ? 'Resend OTP' : 'Send OTP'}
                        </button>
                    )}
                </div>
                {identifierTouched && identifierError && <p style={errText}>{identifierError}</p>}

                {/* OTP verification */}
                {challenge && !otpVerified && (
                    <div style={{ marginTop: '12px', padding: '12px', border: '1px solid #C7D2FE', background: '#EEF2FF', borderRadius: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#4338CA', marginBottom: '8px' }}>
                            OTP sent to <strong>{challenge.maskedTarget}</strong>
                            {challenge.demoOtp && (
                                <> · <strong>Demo:</strong>{' '}
                                    <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, letterSpacing: '0.15em' }}>{challenge.demoOtp}</span>
                                </>
                            )}
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                className="cs-input"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                placeholder="Enter 6-digit OTP"
                                autoFocus
                                value={otpInput}
                                onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(null); }}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verifyOtp(); } }}
                                style={{ flex: 1, minWidth: 0, height: '42px', letterSpacing: '0.2em', backgroundColor: '#FFFFFF' }}
                            />
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={verifyOtp}
                                disabled={otpInput.length !== 6 || verifyingOtp}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '42px', minWidth: '88px', borderRadius: '12px', background: accent, borderColor: accent }}
                            >
                                {verifyingOtp ? 'Verifying…' : 'Verify'}
                            </button>
                        </div>
                        {otpError && <p style={{ ...errText, marginTop: '6px' }}>{otpError}</p>}
                    </div>
                )}
            </div>

            {/* New password — shown once the OTP is verified */}
            {otpVerified && (
                <>
                    <div style={{ marginTop: '14px' }}>
                        <label className="cs-label" htmlFor="fp-new">New Password <span className="reg-req">*</span></label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={17} style={iconLeft} />
                            <input
                                id="fp-new"
                                className="cs-input"
                                type={showNew ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Create a strong new password"
                                maxLength={MAX_PASSWORD}
                                autoFocus
                                value={newPassword}
                                onFocus={() => setPasswordFocused(true)}
                                onChange={e => {
                                    const val = e.target.value;
                                    setNewPassword(val);
                                    if (touched.newPassword) setFieldErrors(prev => ({ ...prev, newPassword: validateNewPassword(val) }));
                                    if (confirmPassword || touched.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword, val) }));
                                    if (error) setError(null);
                                }}
                                onBlur={() => {
                                    setPasswordFocused(false);
                                    setTouched(prev => ({ ...prev, newPassword: true }));
                                    setFieldErrors(prev => ({ ...prev, newPassword: validateNewPassword(newPassword) }));
                                }}
                                style={{
                                    paddingLeft: '42px', paddingRight: '44px',
                                    ...inputErrorStyle(Boolean(touched.newPassword && fieldErrors.newPassword)),
                                    ...(newPassword && !fieldErrors.newPassword && PASSWORD_RULES.every(r => r.test(newPassword)) ? { borderColor: '#10B981' } : {}),
                                }}
                            />
                            <button type="button" onClick={() => setShowNew(v => !v)} aria-label={showNew ? 'Hide password' : 'Show password'} style={eyeBtn}>
                                {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                        {(() => {
                            const pw = newPassword;
                            const passed = PASSWORD_RULES.filter(r => r.test(pw)).length;
                            const pending = PASSWORD_RULES.filter(r => !r.test(pw));
                            const showHints = pw.length > 0 && (passwordFocused || !touched.newPassword);
                            if (!showHints) {
                                return touched.newPassword && fieldErrors.newPassword ? <p style={errText}>{fieldErrors.newPassword}</p> : null;
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
                                        <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
                                            {pending.map(rule => (
                                                <li key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
                                                    <Circle size={9} /> {rule.label}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : fieldErrors.newPassword && touched.newPassword ? (
                                        <p style={{ ...errText, fontSize: '11px' }}>{fieldErrors.newPassword}</p>
                                    ) : (
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
                                            <CheckCircle size={12} /> Great, your password is strong
                                        </p>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    <div style={{ marginTop: '14px' }}>
                        <label className="cs-label" htmlFor="fp-confirm">Confirm New Password <span className="reg-req">*</span></label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={17} style={iconLeft} />
                            <input
                                id="fp-confirm"
                                className="cs-input"
                                type={showConfirm ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Re-enter your new password"
                                maxLength={MAX_PASSWORD}
                                value={confirmPassword}
                                onChange={e => {
                                    const val = e.target.value;
                                    setConfirmPassword(val);
                                    setTouched(prev => ({ ...prev, confirmPassword: true }));
                                    setFieldErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(val, newPassword) }));
                                    if (error) setError(null);
                                }}
                                onBlur={() => {
                                    setTouched(prev => ({ ...prev, confirmPassword: true }));
                                    setFieldErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword, newPassword) }));
                                }}
                                style={{
                                    paddingLeft: '42px', paddingRight: '44px',
                                    ...inputErrorStyle(Boolean(touched.confirmPassword && fieldErrors.confirmPassword)),
                                    ...(confirmPassword && !fieldErrors.confirmPassword && confirmPassword === newPassword ? { borderColor: '#10B981' } : {}),
                                }}
                            />
                            <button type="button" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide password' : 'Show password'} style={eyeBtn}>
                                {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                        {touched.confirmPassword && fieldErrors.confirmPassword ? (
                            <p style={errText}>{fieldErrors.confirmPassword}</p>
                        ) : confirmPassword.length > 0 && confirmPassword === newPassword ? (
                            <p style={{ color: '#059669', fontSize: '12px', marginTop: '4px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={13} /> Passwords match
                            </p>
                        ) : null}
                    </div>

                    {error && (
                        <div role="alert" style={{ marginTop: '14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '10px 14px', color: '#B91C1C', fontSize: '13px' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary reg-cta"
                        disabled={busy}
                        style={{ width: '100%', marginTop: '18px', height: '46px', background: accent, borderColor: accent, boxShadow: `0 10px 22px -8px ${accent}80` }}
                    >
                        {busy ? 'Resetting password…' : <>Reset Password <ArrowRight size={17} /></>}
                    </button>
                </>
            )}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '18px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
                <button
                    type="button"
                    onClick={onBack}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, color: accent }}
                >
                    <ArrowLeft size={15} /> Back to Sign in
                </button>
            </div>
        </form>
    );
}
