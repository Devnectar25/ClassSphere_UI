'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    CheckCircle, ArrowRight, ArrowLeft, Eye, EyeOff, BadgeCheck, Circle, Building2, Phone, Mail, X, AlertCircle, RefreshCw,
    Globe, Map, Building, Compass, MapPin,
} from 'lucide-react';
import { api, useApi, formatMoney, type Plan } from '@/lib/api';
import { homePath, saveSession, type SessionState } from '@/lib/session';
import AuthBrandPanel from '@/components/AuthBrandPanel';

const steps = ['Account', 'Plan', 'Ready'];

// Values are the backend's academy types
const CATEGORIES = [
    ['Tuition', 'Tuition / Coaching'], ['Music', 'Music'], ['Dance', 'Dance'], ['Sports', 'Sports / Martial Arts / Yoga'],
    ['Arts', 'Arts'], ['Test Prep', 'Test Prep'], ['Language', 'Language'], ['Other', 'Other'],
];

// Email: local part of letters/digits/._%+-, a domain of dot-separated labels and a 2+ letter TLD
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
// Person names: letters, separated by single spaces, apostrophes, hyphens or dots (e.g. "Mary-Jane", "D'Souza", "R.")
const NAME_REGEX = /^[a-zA-Z]+(?:[ '.-][a-zA-Z]*)*$/;
// Academy names: letters, spaces and common punctuation (no digits)
const ACADEMY_NAME_REGEX = /^[a-zA-Z][a-zA-Z &'.,()\-/]*$/;
const NO_DIGIT_FIELDS: string[] = ['academyName', 'firstName', 'lastName', 'customCategory', 'state', 'city'];
const CATEGORY_VALUES = CATEGORIES.map(([value]) => value);
const iconLeft: React.CSSProperties = { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' };
const MAX = { academyName: 100, firstName: 50, lastName: 50, email: 254, phone: 10, password: 64 };

/** Password rules, shown as a live checklist under the field. */
const PASSWORD_RULES: { label: string; test: (v: string) => boolean }[] = [
    { label: '8–64 characters', test: v => v.length >= 8 && v.length <= MAX.password },
    { label: 'An uppercase letter', test: v => /[A-Z]/.test(v) },
    { label: 'A lowercase letter', test: v => /[a-z]/.test(v) },
    { label: 'A number', test: v => /[0-9]/.test(v) },
    { label: 'A special character (!@#$…)', test: v => /[^a-zA-Z0-9\s]/.test(v) },
    { label: 'No spaces', test: v => v.length > 0 && !/\s/.test(v) },
];

/** Validates a 10-digit Indian mobile number starting with 6–9. */
function phoneError(value: string): string {
    const val = value.trim();
    if (!val) return 'Mobile number is required.';
    if (!/^\d+$/.test(val)) return 'Only digits are allowed.';
    if (val.length !== 10) return 'Enter a valid 10-digit mobile number.';
    if (!/^[6-9]/.test(val)) return 'Indian mobile numbers start with 6, 7, 8 or 9.';
    if (/^(\d)\1{9}$/.test(val)) return 'Enter a real mobile number.';
    return '';
}
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_SECONDS = 30;
const PHONE_TAKEN = 'An account already exists with this mobile number. Please sign in instead.';
const EMAIL_TAKEN = 'An account already exists with this email address. Please sign in instead.';
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const otpExpiry = () => Date.now() + OTP_TTL_MS;

function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') return resolve(false);
        if ((window as any).Razorpay) return resolve(true);
        const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(true));
            existing.addEventListener('error', () => resolve(false));
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const { data: plans } = useApi<Plan[]>('/plans');
    const [planTier, setPlanTier] = useState<string | null>(null);
    const selectedPlan = planTier ?? plans?.find(p => p.isPopular)?.planTier;
    const [form, setForm] = useState({
        academyName: '',
        academyType: 'Tuition',
        customCategory: '',
        country: 'India',
        state: '',
        city: '',
        location: '',
        address: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [termsTouched, setTermsTouched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [busyState, setBusyState] = useState<'idle' | 'opening' | 'verifying'>('idle');
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'cancelled' | 'failed' | 'success'>('idle');
    const [session, setSession] = useState<SessionState | null>(null);

    // Demo OTP: the code is generated in the browser and shown on screen — no SMS is sent.
    const [otp, setOtp] = useState<{ code: string; phone: string; expiresAt: number } | null>(null);
    const [otpInput, setOtpInput] = useState('');
    const [otpError, setOtpError] = useState<string | null>(null);
    const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
    const [resendIn, setResendIn] = useState(0);
    const phoneDigits = form.phone.replace(/\D/g, '');
    const phoneVerified = verifiedPhone !== null && verifiedPhone === phoneDigits;

    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn(s => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const cat = params.get('category');
            if (cat) {
                if (cat.toLowerCase() === 'coaching' || cat.toLowerCase() === 'tuition') {
                    setForm(f => ({ ...f, academyType: 'Tuition' }));
                } else if (CATEGORY_VALUES.some(v => v.toLowerCase() === cat.toLowerCase())) {
                    const matched = CATEGORY_VALUES.find(v => v.toLowerCase() === cat.toLowerCase());
                    if (matched) setForm(f => ({ ...f, academyType: matched }));
                }
            }
        }
    }, []);

    // Mobile numbers / emails the server reported as already registered (one account per mobile number)
    const [takenPhones, setTakenPhones] = useState<string[]>([]);
    const [takenEmails, setTakenEmails] = useState<string[]>([]);
    const [checkingPhone, setCheckingPhone] = useState(false);

    /** Asks the API whether the mobile number / email already has an account. Network errors count as "free" — create re-checks. */
    const checkAvailability = async (check: { phone?: string; email?: string }) => {
        try {
            const res = await api<{ phoneTaken: boolean; emailTaken: boolean }>('/auth/availability', {
                method: 'POST', body: JSON.stringify(check),
            });
            if (res.phoneTaken && check.phone) setTakenPhones(list => [...list, check.phone!.replace(/\D/g, '')]);
            if (res.emailTaken && check.email) setTakenEmails(list => [...list, check.email!.trim().toLowerCase()]);
            return res;
        } catch {
            return { phoneTaken: false, emailTaken: false };
        }
    };

    const sendOtp = async () => {
        setTouched(t => ({ ...t, phone: true }));
        const phoneError = validateField('phone', form.phone);
        setFieldErrors(errs => ({ ...errs, phone: phoneError }));
        if (phoneError) return;
        // Never send an OTP to a number that already has an account
        setCheckingPhone(true);
        const { phoneTaken } = await checkAvailability({ phone: phoneDigits });
        setCheckingPhone(false);
        if (phoneTaken) {
            setFieldErrors(errs => ({ ...errs, phone: PHONE_TAKEN }));
            return;
        }
        setOtp({ code: generateOtp(), phone: phoneDigits, expiresAt: otpExpiry() });
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

    const validateField = (name: string, value: string): string => {
        const val = value.trim();
        switch (name) {
            case 'academyName':
                if (!val) return 'Academy / Class name is required.';
                if (val.length < 3) return 'Academy name must be at least 3 characters.';
                if (val.length > MAX.academyName) return `Academy name cannot exceed ${MAX.academyName} characters.`;
                if (/\d/.test(val)) return 'Academy name cannot contain numbers.';
                if (!ACADEMY_NAME_REGEX.test(val)) return "Use letters, spaces and & ' . , ( ) - / only, starting with a letter.";
                if (/\s{2,}/.test(val)) return 'Academy name cannot contain consecutive spaces.';
                return '';
            case 'country':
                if (!val) return 'Country is required.';
                return '';
            case 'state':
                if (!val) return 'State / Province is required.';
                if (val.length < 2) return 'State must be at least 2 characters.';
                return '';
            case 'city':
                if (!val) return 'City is required.';
                if (val.length < 2) return 'City must be at least 2 characters.';
                return '';
            case 'location':
                if (!val) return 'Location / Area is required.';
                if (val.length < 2) return 'Location must be at least 2 characters.';
                return '';
            case 'address':
                if (!val) return 'Campus street address is required.';
                if (val.length < 5) return 'Address must be at least 5 characters.';
                return '';
            case 'firstName':
            case 'lastName': {
                const label = name === 'firstName' ? 'First name' : 'Last name';
                const min = name === 'firstName' ? 2 : 1; // last names may be an initial
                if (!val) return `${label} is required.`;
                if (val.length < min) return `${label} must be at least ${min} characters.`;
                if (val.length > MAX[name]) return `${label} cannot exceed ${MAX[name]} characters.`;
                if (/\d/.test(val)) return `${label} cannot contain numbers.`;
                if (!NAME_REGEX.test(val)) return `${label} can only contain letters, spaces, apostrophes, hyphens and dots.`;
                return '';
            }
            case 'email': {
                if (!val) return 'Email address is required.';
                if (/\s/.test(val)) return 'Email address cannot contain spaces.';
                if (val.length > MAX.email) return `Email address cannot exceed ${MAX.email} characters.`;
                const [local = ''] = val.split('@');
                if (local.length > 64) return 'The part before @ cannot exceed 64 characters.';
                if (/\.\./.test(val) || local.startsWith('.') || local.endsWith('.')) return 'Email address has misplaced dots.';
                if (!EMAIL_REGEX.test(val)) return 'Please enter a valid email address (e.g. name@domain.com).';
                if (takenEmails.includes(val.toLowerCase())) return EMAIL_TAKEN;
                return '';
            }
            case 'phone': {
                const formatError = phoneError(value);
                if (formatError) return formatError;
                return takenPhones.includes(value.replace(/\D/g, '')) ? PHONE_TAKEN : '';
            }
            case 'academyType':
                return CATEGORY_VALUES.includes(value) ? '' : 'Please choose a class category.';
            case 'customCategory':
                if (form.academyType === 'Other') {
                    if (!val) return 'Please specify your class category name.';
                    if (val.length < 2) return 'Category name must be at least 2 characters.';
                    if (val.length > 50) return 'Category name cannot exceed 50 characters.';
                    if (/\d/.test(val)) return 'Category name cannot contain numbers.';
                    if (!ACADEMY_NAME_REGEX.test(val)) return "Use letters, spaces and & ' . , ( ) - / only, starting with a letter.";
                }
                return '';
            case 'password': {
                if (!value) return 'Password is required.';
                const failed = PASSWORD_RULES.find(r => !r.test(value));
                if (failed) return `Password needs: ${failed.label.toLowerCase()}.`;
                const lower = value.toLowerCase();
                const personal = [form.firstName, form.lastName, form.email.split('@')[0]]
                    .map(s => s.trim().toLowerCase()).filter(s => s.length >= 3);
                if (personal.some(p => lower.includes(p))) return 'Password should not contain your name or email.';
                if (phoneDigits.length >= 6 && value.includes(phoneDigits.slice(-6))) return 'Password should not contain your mobile number.';
                return '';
            }
            case 'confirmPassword':
                if (!value) return 'Please confirm your password.';
                if (value !== form.password) return 'Passwords do not match.';
                return '';
            default:
                return '';
        }
    };

    const handleFieldChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let val = e.target.value;
        // Name fields never accept digits — typed or pasted numbers are dropped
        if (NO_DIGIT_FIELDS.includes(key)) val = val.replace(/[0-9]/g, '');
        setForm(f => ({ ...f, [key]: val }));
        if (touched[key]) {
            setFieldErrors(errs => ({ ...errs, [key]: validateField(key, val) }));
        }
        // Changing the password re-checks the confirmation against the new value
        if (key === 'password' && (touched.confirmPassword || form.confirmPassword)) {
            const confirmError = !form.confirmPassword ? 'Please confirm your password.'
                : form.confirmPassword !== val ? 'Passwords do not match.' : '';
            setFieldErrors(errs => ({ ...errs, confirmPassword: confirmError }));
        }
        if (error) setError(null);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (phoneVerified) return;
        // Allow digits only and never allow more than 10 digits
        const cleaned = e.target.value.replace(/\D/g, '').slice(0, MAX.phone);
        setForm(f => ({ ...f, phone: cleaned }));
        if (touched.phone) {
            setFieldErrors(errs => ({ ...errs, phone: validateField('phone', cleaned) }));
        }
        if (error) setError(null);
    };

    const handleBlur = (key: keyof typeof form) => () => {
        if (key === 'phone' && phoneVerified) return;
        // Tidy the value on leaving the field: trim and collapse repeated spaces; emails are lower-cased
        let val = form[key];
        if (key === 'academyName' || key === 'firstName' || key === 'lastName') val = val.trim().replace(/\s+/g, ' ');
        else if (key === 'email') val = val.trim().toLowerCase();
        else if (key === 'phone') val = val.trim();
        if (val !== form[key]) setForm(f => ({ ...f, [key]: val }));
        setTouched(t => ({ ...t, [key]: true }));
        const fieldError = validateField(key, val);
        setFieldErrors(errs => ({ ...errs, [key]: fieldError }));

        // A well-formed mobile number / email is checked against existing accounts straight away
        if (!fieldError && val && (key === 'phone' || key === 'email')) {
            void checkAvailability(key === 'phone' ? { phone: val } : { email: val }).then(res => {
                const taken = key === 'phone' ? res.phoneTaken : res.emailTaken;
                if (taken) setFieldErrors(errs => ({ ...errs, [key]: key === 'phone' ? PHONE_TAKEN : EMAIL_TAKEN }));
            });
        }
    };

    const continueToPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        const fields = [
            'firstName', 'lastName', 'email', 'phone',
            'academyName', 'academyType',
            ...(form.academyType === 'Other' ? ['customCategory' as const] : []),
            'country', 'state', 'city', 'location', 'address',
            'password', 'confirmPassword'
        ] as const;
        setTouched(Object.fromEntries(fields.map(f => [f, true])));
        setTermsTouched(true);

        const errorsObj: Record<string, string> = Object.fromEntries(fields.map(f => [f, validateField(f, form[f as keyof typeof form] ?? '')]));

        // Re-check uniqueness with the server (another sign-up may have used the number meanwhile)
        if (!errorsObj.phone || (form.email.trim() && !errorsObj.email)) {
            const res = await checkAvailability({
                phone: errorsObj.phone ? undefined : phoneDigits,
                email: form.email.trim() && !errorsObj.email ? form.email.trim() : undefined,
            });
            if (res.phoneTaken && !errorsObj.phone) errorsObj.phone = PHONE_TAKEN;
            if (res.emailTaken && !errorsObj.email) errorsObj.email = EMAIL_TAKEN;
        }

        if (!errorsObj.phone && !phoneVerified) {
            errorsObj.phoneOtp = 'Please verify your mobile number with the OTP.';
        }

        if (!acceptTerms) {
            errorsObj.acceptTerms = 'Please agree to the Terms & Conditions and Privacy Policy to continue.';
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

    const handleRegisterError = (err: unknown) => {
        const message = (err as Error).message || 'Registration failed.';
        // Duplicate caught by the server at create time: send the user back to the field to fix
        if (/mobile number already exists/i.test(message) || /email already exists/i.test(message)) {
            const isPhone = /mobile/i.test(message);
            if (isPhone) { setTakenPhones(l => [...l, phoneDigits]); setVerifiedPhone(null); }
            else setTakenEmails(l => [...l, form.email.trim().toLowerCase()]);
            setTouched(t => ({ ...t, [isPhone ? 'phone' : 'email']: true }));
            setFieldErrors(errs => ({ ...errs, [isPhone ? 'phone' : 'email']: isPhone ? PHONE_TAKEN : EMAIL_TAKEN }));
            setError(isPhone ? PHONE_TAKEN : EMAIL_TAKEN);
            setStep(0);
        } else {
            setError(message);
        }
    };

    const createAcademy = async () => {
        setBusy(true);
        setBusyState('opening');
        setError(null);
        setPaymentStatus('idle');

        try {
            // 1. Ensure Razorpay Checkout SDK is ready
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                setError('Failed to connect to Razorpay payment gateway. Please check your internet connection.');
                setBusy(false);
                setBusyState('idle');
                return;
            }

            // 2. Prepare payload
            const effectiveAcademyType = form.academyType === 'Other' && form.customCategory.trim()
                ? form.customCategory.trim()
                : form.academyType;
            const payload: Record<string, unknown> = {
                ...form,
                academyType: effectiveAcademyType,
            };
            delete payload.confirmPassword;
            delete payload.customCategory;

            // 3. Create server-side Razorpay Autopay Subscription & Order
            const orderRes = await api<{
                orderId: string;
                subscriptionId?: string | null;
                amount: number;
                currency: string;
                keyId: string;
                planTier: string;
                planName: string;
                priceMonthly: number;
                academyName: string;
                isAutopay?: boolean;
            }>('/auth/register/order', {
                method: 'POST',
                body: JSON.stringify({
                    ...payload,
                    planTier: selectedPlan,
                    acceptTerms,
                }),
            });

            // 4. Configure Razorpay checkout options (Autopay Subscription or standard Order)
            const options: Record<string, unknown> = {
                key: orderRes.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                name: 'ClassSphere',
                description: `${orderRes.planName || selectedPlan} — Autopay Monthly`,
                prefill: {
                    name: `${form.firstName} ${form.lastName}`.trim(),
                    email: form.email.trim(),
                    contact: form.phone.trim(),
                },
                notes: {
                    academyName: form.academyName,
                    planTier: selectedPlan,
                },
                theme: {
                    color: '#4F46E5', // ClassSphere signature indigo
                },
                modal: {
                    ondismiss: () => {
                        api('/auth/register/cancel', {
                            method: 'POST',
                            body: JSON.stringify({
                                orderId: orderRes.orderId || orderRes.subscriptionId,
                                reason: 'Modal closed by user'
                            }),
                        }).catch(() => {});
                        setPaymentStatus('cancelled');
                        setBusyState('idle');
                        setBusy(false);
                    },
                },
                handler: async function (response: {
                    razorpay_payment_id: string;
                    razorpay_order_id?: string;
                    razorpay_subscription_id?: string;
                    razorpay_signature: string;
                }) {
                    try {
                        setBusy(true);
                        setBusyState('verifying');
                        setError(null);

                        // 5. Verify payment signature on backend and activate academy
                        const verifyRes = await api<{
                            session: SessionState;
                            tenantId: string;
                            planTier: string;
                            paymentStatus: string;
                        }>('/auth/register/verify', {
                            method: 'POST',
                            body: JSON.stringify({
                                orderId: response.razorpay_order_id || orderRes.orderId,
                                subscriptionId: response.razorpay_subscription_id || orderRes.subscriptionId,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                            }),
                        });

                        setPaymentStatus('success');
                        saveSession({ ...verifyRes.session, selectedBranchId: null });
                        setSession(verifyRes.session);
                        setStep(2);
                    } catch (verifyErr) {
                        setPaymentStatus('failed');
                        handleRegisterError(verifyErr);
                    } finally {
                        setBusy(false);
                        setBusyState('idle');
                    }
                },
            };

            // If an Autopay subscription exists, use subscription_id; otherwise fall back to order_id & amount
            if (orderRes.subscriptionId) {
                options.subscription_id = orderRes.subscriptionId;
            } else {
                options.order_id = orderRes.orderId;
                options.amount = orderRes.amount;
                options.currency = orderRes.currency || 'INR';
            }

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (resp: any) {
                api('/auth/register/cancel', {
                    method: 'POST',
                    body: JSON.stringify({
                        orderId: orderRes.orderId || orderRes.subscriptionId,
                        reason: resp.error?.description || 'Payment failed'
                    }),
                }).catch(() => {});
                setPaymentStatus('failed');
                setError(resp.error?.description || 'Payment was unsuccessful. Your account was not charged. Please retry.');
                setBusyState('idle');
                setBusy(false);
            });
            rzp.open();
        } catch (err) {
            handleRegisterError(err);
            setBusy(false);
            setBusyState('idle');
        }
    };

    return (
        <div className="reg-page">
            <div className="reg-shell">
                <AuthBrandPanel />

                {/* ─── Right: Form panel ─── */}
                <div className="reg-main">
                    <Link href="/" aria-label="Close and go to home page" className="reg-close">
                        <X size={18} />
                    </Link>

                    {/* ─── Static header: logo + steps ─── */}
                    <div className="reg-head">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transform: 'translateX(-20px)' }}>
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

                        {step < 2 && (
                            <div style={{ marginTop: '24px' }}>
                                <h1 className="reg-title">{step === 0 ? 'Create your academy' : 'Choose your plan'}</h1>
                                <p className="reg-subtitle" style={{ marginBottom: 0 }}>
                                    {step === 0 ? 'Start your 14-day free trial — no credit card needed' : 'Start with a free 14-day trial on any plan.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ─── Scrollable middle ─── */}
                    <div className="reg-body no-scrollbar" style={{ scrollbarWidth: 'none' }}>

                {step === 0 && (
                    <>
                        <form onSubmit={continueToPlan} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label className="cs-label">Your First Name <span className="reg-req">*</span></label>
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
                                        <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                            {fieldErrors.firstName}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="cs-label">Last Name <span className="reg-req">*</span></label>
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
                                        <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                            {fieldErrors.lastName}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="cs-label">Email Address <span className="reg-req">*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={17} style={iconLeft} />
                                    <input
                                        className="cs-input reg-input"
                                        type="email"
                                        placeholder="you@academy.com"
                                        autoComplete="email"
                                        maxLength={MAX.email}
                                        value={form.email}
                                        onChange={handleFieldChange('email')}
                                        onBlur={handleBlur('email')}
                                        style={{ paddingLeft: '42px', ...getInputStyle('email') }}
                                        required
                                    />
                                </div>
                                {touched.email && fieldErrors.email ? (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        {fieldErrors.email}
                                        {fieldErrors.email === EMAIL_TAKEN && (
                                            <> <Link href="/login" style={{ color: '#4F46E5', fontWeight: 600 }}>Sign in</Link></>
                                        )}
                                    </p>
                                ) : (
                                    <p style={{ color: '#94A3B8', fontSize: '11px', marginTop: '4px' }}>
                                        Required for account verification, login, and billing receipts
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="cs-label">Mobile Number <span className="reg-req">*</span></label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                                    <Phone size={17} style={iconLeft} />
                                    <input
                                        className="cs-input reg-input"
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
                                            width: '100%',
                                            paddingLeft: '42px',
                                            ...getInputStyle('phone'),
                                            ...(phoneVerified ? {
                                                borderColor: '#10B981',
                                                background: '#F0FDF4',
                                                color: '#475569',
                                                cursor: 'not-allowed',
                                            } : {}),
                                        }}
                                    />
                                    </div>
                                    {phoneVerified ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0 12px', borderRadius: '8px', background: '#ECFDF5', color: '#047857', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            <BadgeCheck size={16} /> Verified
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={sendOtp}
                                            disabled={resendIn > 0 || checkingPhone}
                                            style={{ whiteSpace: 'nowrap', justifyContent: 'center', minWidth: '110px' }}
                                        >
                                            {checkingPhone ? 'Checking…' : resendIn > 0 ? `Resend in ${resendIn}s` : otp ? 'Resend OTP' : 'Send OTP'}
                                        </button>
                                    )}
                                </div>
                                {touched.phone && fieldErrors.phone ? (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        {fieldErrors.phone}
                                        {fieldErrors.phone === PHONE_TAKEN && (
                                            <> <Link href="/login" style={{ color: '#4F46E5', fontWeight: 600 }}>Sign in</Link></>
                                        )}
                                    </p>
                                ) : !phoneVerified && fieldErrors.phoneOtp ? (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        {fieldErrors.phoneOtp}
                                    </p>
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
                                                onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '')); setOtpError(null); }}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verifyOtp(); } }}
                                                style={{ flex: 1, minWidth: 0, letterSpacing: '0.2em', background: '#FFFFFF' }}
                                            />
                                            <button type="button" className="btn-primary" onClick={verifyOtp} disabled={otpInput.length !== 6}
                                                style={{ justifyContent: 'center', minWidth: '90px' }}>
                                                Verify
                                            </button>
                                        </div>
                                        {otpError && (
                                            <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>{otpError}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="cs-label">Academy / Class Name <span className="reg-req">*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <Building2 size={17} style={iconLeft} />
                                    <input
                                        className="cs-input reg-input"
                                        placeholder="e.g. Apex Music & Arts Conservatory"
                                        autoComplete="organization"
                                        maxLength={MAX.academyName}
                                        value={form.academyName}
                                        onChange={handleFieldChange('academyName')}
                                        onBlur={handleBlur('academyName')}
                                        style={{ paddingLeft: '42px', ...getInputStyle('academyName') }}
                                    />
                                </div>
                                {touched.academyName && fieldErrors.academyName && (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        {fieldErrors.academyName}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="cs-label" id="reg-category-label">Class Category <span className="reg-req">*</span></label>
                                <select
                                    id="reg-category"
                                    className="cs-input reg-native-select"
                                    aria-labelledby="reg-category-label"
                                    value={form.academyType}
                                    onChange={handleFieldChange('academyType')}
                                >
                                    {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                                {touched.academyType && fieldErrors.academyType && (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        {fieldErrors.academyType}
                                    </p>
                                )}

                                {form.academyType === 'Other' && (
                                    <div style={{ marginTop: '10px' }}>
                                        <label className="cs-label" style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                                            Specify Category Name <span className="reg-req">*</span>
                                        </label>
                                        <input
                                            className="cs-input reg-input"
                                            type="text"
                                            placeholder="Enter your class category (e.g. Coding, Robotics, Karate)"
                                            maxLength={50}
                                            value={form.customCategory}
                                            onChange={handleFieldChange('customCategory')}
                                            onBlur={handleBlur('customCategory')}
                                            style={getInputStyle('customCategory')}
                                            autoFocus
                                            required
                                        />
                                        {touched.customCategory && fieldErrors.customCategory && (
                                            <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                                {fieldErrors.customCategory}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 1) Country & 2) State */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label className="cs-label">Country <span className="reg-req">*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <Globe size={17} style={iconLeft} />
                                        <select
                                            className="cs-input reg-native-select"
                                            value={form.country}
                                            onChange={handleFieldChange('country')}
                                            onBlur={handleBlur('country')}
                                            style={{ paddingLeft: '42px', ...getInputStyle('country') }}
                                        >
                                            <option value="India">India</option>
                                            <option value="United States">United States</option>
                                            <option value="United Kingdom">United Kingdom</option>
                                            <option value="Canada">Canada</option>
                                            <option value="Australia">Australia</option>
                                            <option value="United Arab Emirates">United Arab Emirates</option>
                                            <option value="Singapore">Singapore</option>
                                            <option value="Other">Other Country</option>
                                        </select>
                                    </div>
                                    {touched.country && fieldErrors.country && (
                                        <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                            {fieldErrors.country}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="cs-label">State / Province <span className="reg-req">*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <Map size={17} style={iconLeft} />
                                        <input
                                            className="cs-input reg-input"
                                            placeholder="e.g. Maharashtra"
                                            maxLength={60}
                                            value={form.state}
                                            onChange={handleFieldChange('state')}
                                            onBlur={handleBlur('state')}
                                            style={{ paddingLeft: '42px', ...getInputStyle('state') }}
                                        />
                                    </div>
                                    {touched.state && fieldErrors.state && (
                                        <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                            {fieldErrors.state}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* 3) City & 5) Location */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label className="cs-label">City <span className="reg-req">*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <Building size={17} style={iconLeft} />
                                        <input
                                            className="cs-input reg-input"
                                            placeholder="e.g. Pune"
                                            maxLength={60}
                                            value={form.city}
                                            onChange={handleFieldChange('city')}
                                            onBlur={handleBlur('city')}
                                            style={{ paddingLeft: '42px', ...getInputStyle('city') }}
                                        />
                                    </div>
                                    {touched.city && fieldErrors.city && (
                                        <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                            {fieldErrors.city}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="cs-label">Location / Area / Pin <span className="reg-req">*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <Compass size={17} style={iconLeft} />
                                        <input
                                            className="cs-input reg-input"
                                            placeholder="e.g. Kothrud, 411038"
                                            maxLength={80}
                                            value={form.location}
                                            onChange={handleFieldChange('location')}
                                            onBlur={handleBlur('location')}
                                            style={{ paddingLeft: '42px', ...getInputStyle('location') }}
                                        />
                                    </div>
                                    {touched.location && fieldErrors.location && (
                                        <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                            {fieldErrors.location}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* 4) Address */}
                            <div>
                                <label className="cs-label">Street Address / Campus Premises <span className="reg-req">*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <MapPin size={17} style={iconLeft} />
                                    <input
                                        className="cs-input reg-input"
                                        placeholder="e.g. Office 204, Crystal Plaza, Paud Road"
                                        maxLength={200}
                                        value={form.address}
                                        onChange={handleFieldChange('address')}
                                        onBlur={handleBlur('address')}
                                        style={{ paddingLeft: '42px', ...getInputStyle('address') }}
                                    />
                                </div>
                                {touched.address && fieldErrors.address && (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        {fieldErrors.address}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="cs-label">Password <span className="reg-req">*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className="cs-input"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Create a strong password"
                                        autoComplete="new-password"
                                        maxLength={MAX.password}
                                        style={{ paddingRight: '44px', ...getInputStyle('password') }}
                                        value={form.password}
                                        onChange={handleFieldChange('password')}
                                        onFocus={() => setPasswordFocused(true)}
                                        onBlur={() => { setPasswordFocused(false); handleBlur('password')(); }}
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
                                {(() => {
                                    // Dynamic hints: only while typing, only the rules still unmet, plus a strength bar
                                    const pw = form.password;
                                    const passed = PASSWORD_RULES.filter(r => r.test(pw)).length;
                                    const pending = PASSWORD_RULES.filter(r => !r.test(pw));
                                    const showHints = pw.length > 0 && (passwordFocused || !touched.password);
                                    if (!showHints) {
                                        return touched.password && fieldErrors.password ? (
                                            <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                                {fieldErrors.password}
                                            </p>
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
                                            ) : fieldErrors.password && touched.password ? (
                                                <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>{fieldErrors.password}</p>
                                            ) : (
                                                <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
                                                    <CheckCircle size={12} /> Great, your password is strong
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div>
                                <label className="cs-label">Confirm Password <span className="reg-req">*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className="cs-input"
                                        type={showConfirm ? 'text' : 'password'}
                                        placeholder="Re-enter your password"
                                        autoComplete="new-password"
                                        maxLength={MAX.password}
                                        style={{
                                            paddingRight: '44px', ...getInputStyle('confirmPassword'),
                                            ...(form.confirmPassword && form.confirmPassword === form.password ? { borderColor: '#10B981' } : {}),
                                        }}
                                        value={form.confirmPassword}
                                        onChange={e => {
                                            // Live match check once the user has typed as many characters as the password
                                            handleFieldChange('confirmPassword')(e);
                                            const v = e.target.value;
                                            if (touched.confirmPassword || v.length >= form.password.length) {
                                                setTouched(t => ({ ...t, confirmPassword: true }));
                                                setFieldErrors(errs => ({ ...errs, confirmPassword: validateField('confirmPassword', v) }));
                                            }
                                        }}
                                        onPaste={e => e.preventDefault()}
                                        onBlur={handleBlur('confirmPassword')}
                                    />
                                    <button
                                        type="button"
                                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                                    >
                                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {touched.confirmPassword && fieldErrors.confirmPassword ? (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        {fieldErrors.confirmPassword}
                                    </p>
                                ) : form.confirmPassword && form.confirmPassword === form.password ? (
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        <CheckCircle size={12} /> Passwords match
                                    </p>
                                ) : null}
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
                                    <span>I agree to ClassSphere&apos;s <Link href="/terms" target="_blank" style={{ color: '#4F46E5', fontWeight: 500 }}>Terms &amp; Conditions</Link> and <Link href="/privacy" target="_blank" style={{ color: '#4F46E5', fontWeight: 500 }}>Privacy Policy</Link></span>
                                </label>
                                {termsTouched && !acceptTerms && (
                                    <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                                        Please agree to the Terms &amp; Conditions and Privacy Policy to continue.
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', color: '#B91C1C', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}
                            <button type="submit" className="btn-primary reg-cta">
                                Continue <ArrowRight size={17} />
                            </button>
                        </form>
                    </>
                )}

                {step === 1 && (
                    <>
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
                        {paymentStatus === 'cancelled' && (
                            <div style={{
                                padding: '12px 14px', borderRadius: '10px', background: '#FFFBEB',
                                border: '1px solid #FDE68A', color: '#92400E', fontSize: '13px',
                                display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px',
                            }}>
                                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                <span>Payment was cancelled. You can retry with the button below or change your selected plan.</span>
                            </div>
                        )}

                        {paymentStatus === 'failed' && (
                            <div style={{
                                padding: '12px 14px', borderRadius: '10px', background: '#FEF2F2',
                                border: '1px solid #FECACA', color: '#991B1B', fontSize: '13px',
                                display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px',
                            }}>
                                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                <span>{error || 'Payment was unsuccessful. Your account was not charged. Please try again.'}</span>
                            </div>
                        )}

                        {error && paymentStatus !== 'failed' && (
                            <div role="alert" style={{ color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                style={{ height: '50px', borderRadius: '12px' }}
                                disabled={busy}
                                onClick={() => { setError(null); setPaymentStatus('idle'); setStep(0); }}
                            >
                                <ArrowLeft size={16} /> Back
                            </button>
                            <button
                                className="btn-primary reg-cta"
                                style={{ flex: 1 }}
                                disabled={busy || !selectedPlan}
                                onClick={createAcademy}
                            >
                                {busy ? (
                                    busyState === 'verifying' ? (
                                        <>Verifying Payment… <RefreshCw size={16} className="animate-spin" /></>
                                    ) : (
                                        <>Opening Razorpay… <RefreshCw size={16} className="animate-spin" /></>
                                    )
                                ) : paymentStatus === 'failed' || paymentStatus === 'cancelled' ? (
                                    <>Retry Payment <ArrowRight size={16} /></>
                                ) : (
                                    <>Create Academy <ArrowRight size={16} /></>
                                )}
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
                                You can sign in any time with {form.email.trim()
                                    ? <>{form.email.trim().toLowerCase()} or your mobile number</>
                                    : <>your mobile number {form.phone.trim()}</>}.
                            </p>
                            <button className="btn-primary" style={{ justifyContent: 'center', padding: '12px 32px', height: '44px', fontSize: '15px' }}
                                onClick={() => router.replace(session ? homePath(session) : '/login')}>
                                Go to Dashboard <ArrowRight size={16} />
                            </button>
                        </div>
                    </>
                )}
                    </div>

                    {/* ─── Static footer ─── */}
                    {step < 2 && (
                        <p className="reg-foot">
                            Already have an account? <Link href="/login" style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none', marginLeft: '4px' }}>Sign in</Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
