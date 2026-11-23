'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    CheckCircle, ArrowRight, ArrowLeft, Eye, EyeOff, BadgeCheck, Circle, Building2, Phone, Mail, X, AlertCircle, RefreshCw,
    Globe, Map, Building, Compass, MapPin, User, Lock, Sparkles, Check, ShieldCheck
} from 'lucide-react';
import { api, useApi, formatMoney, type Plan } from '@/lib/api';
import { homePath, saveSession, type SessionState } from '@/lib/session';
import AuthBrandPanel from '@/components/AuthBrandPanel';
import CountrySelect from '@/components/CountrySelect';
import { getRecommendedCategories } from '@/lib/academy';

const steps = ['Account', 'Plan', 'Ready'];

// Values are the backend's academy types matching the Academy Domains specification
const CATEGORIES: [string, string][] = [
    ['Tuition', 'Tuition / Coaching'],
    ['Music', 'Music Academy'],
    ['Dance', 'Dance Academy'],
    ['Sports', 'Sports / Fitness / Yoga'],
    ['Arts', 'Arts & Crafts'],
    ['Test Prep', 'Test Preparation'],
    ['Language', 'Language Institute'],
    ['Other', 'Other / Custom'],
];

// Email: local part of letters/digits/._%+-, a domain of dot-separated labels and a 2+ letter TLD
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
// Person names: letters, separated by single spaces, apostrophes, hyphens or dots (e.g. "Mary-Jane", "D'Souza", "R.")
const NAME_REGEX = /^[a-zA-Z]+(?:[ '.-][a-zA-Z]*)*$/;
// Academy names: letters, spaces and common punctuation (no digits)
const ACADEMY_NAME_REGEX = /^[a-zA-Z][a-zA-Z &'.,()\-/]*$/;
const NO_DIGIT_FIELDS: string[] = ['academyName', 'firstName', 'lastName', 'customCategory', 'customCountry', 'state', 'city'];
const CATEGORY_VALUES = CATEGORIES.map(([value]) => value);
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

const DEFAULT_PLANS: Plan[] = [
    {
        planTier: 'Starter',
        description: 'For growing independent academies and tutors',
        priceMonthly: 999,
        currency: 'INR',
        maxSeats: 50,
        maxBranches: 1,
        features: ['Up to 50 active students', '1 branch included', 'Roll call & attendance tracking', 'Student & guardian profiles', 'Basic fee management'],
        isPopular: false,
    },
    {
        planTier: 'Professional',
        description: 'For established multi-class academies',
        priceMonthly: 2499,
        currency: 'INR',
        maxSeats: 250,
        maxBranches: 3,
        features: ['Up to 250 active students', '3 branches included', 'Automated fee invoices & receipts', 'Staff & instructor management', 'Batch matrix & scheduling', 'WhatsApp & email alerts'],
        isPopular: true,
    },
    {
        planTier: 'Enterprise',
        description: 'For large multi-branch institutes',
        priceMonthly: 4999,
        currency: 'INR',
        maxSeats: 1000,
        maxBranches: 10,
        features: ['Unlimited students', 'Up to 10 branches', 'Dedicated account manager', 'Custom reports & analytics', 'Priority 24/7 phone support', 'Full data export & API access'],
        isPopular: false,
    },
];

const INITIAL_FORM = {
    academyName: '',
    academyType: 'Tuition',
    customCategory: '',
    country: 'India',
    customCountry: '',
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
};

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const { data: plans } = useApi<Plan[]>('/plans');
    const displayPlans = plans && plans.length > 0 ? plans : DEFAULT_PLANS;
    const [planTier, setPlanTier] = useState<string | null>(null);
    const selectedPlan = planTier ?? displayPlans.find(p => p.isPopular)?.planTier ?? 'Professional';
    const [form, setForm] = useState(INITIAL_FORM);
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

    const resetRegistration = () => {
        setStep(0);
        setForm(INITIAL_FORM);
        setPlanTier(null);
        setPaymentStatus('idle');
        setSession(null);
        setError(null);
        setFieldErrors({});
        setTouched({});
        setVerifiedPhone(null);
        setOtp(null);
        setOtpInput('');
        setTermsTouched(false);
        setAcceptTerms(false);
        setBusy(false);
        setBusyState('idle');
    };

    // Guarantee that visiting /register always starts on Step 0 if completed earlier
    useEffect(() => {
        if (step === 2) {
            resetRegistration();
        }
        return () => {
            setStep(0);
            setSession(null);
            setPaymentStatus('idle');
            setError(null);
        };
    }, []);

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

    // Pre-load Razorpay checkout script in background so payment modal opens immediately
    useEffect(() => {
        void loadRazorpayScript();
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
        const pErr = validateField('phone', form.phone);
        setFieldErrors(errs => ({ ...errs, phone: pErr }));
        if (pErr) return;
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
            case 'location': {
                if (!val) return 'PIN code / Area is required.';
                const isIndia = form.country !== 'Other Country';
                if (isIndia) {
                    const cleanDigits = val.replace(/\s/g, '');
                    if (/^\d+$/.test(cleanDigits)) {
                        if (cleanDigits.length < 6) return 'PIN code must be exactly 6 digits (e.g. 411038).';
                        if (cleanDigits.length > 6) return 'PIN code cannot exceed 6 digits.';
                        if (cleanDigits.startsWith('0')) return 'Indian PIN code cannot start with 0.';
                        if (!/^[1-9][0-9]{5}$/.test(cleanDigits)) return 'Please enter a valid 6-digit PIN code.';
                        return '';
                    }
                    const pinMatches = val.match(/\b\d+\b/g);
                    if (!pinMatches) {
                        return 'Please include a valid 6-digit PIN code (e.g. 411038).';
                    }
                    const hasValidPin = pinMatches.some(p => /^[1-9][0-9]{5}$/.test(p));
                    if (!hasValidPin) {
                        return 'Please enter a valid 6-digit PIN code (e.g. 411038).';
                    }
                    return '';
                } else {
                    if (val.length < 3) return 'Postal code must be at least 3 characters.';
                    if (!/^[a-zA-Z0-9\s-]{3,10}$/.test(val)) return 'Please enter a valid postal code (3–10 characters).';
                    return '';
                }
            }
            case 'address':
                if (!val) return 'Campus street address is required.';
                if (val.length < 5) return 'Address must be at least 5 characters.';
                return '';
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
            case 'country':
                if (!val) return 'Please select your country.';
                return '';
            case 'customCountry':
                if (form.country === 'Other Country') {
                    if (!val) return 'Please specify your country name.';
                    if (val.length < 2) return 'Country name must be at least 2 characters.';
                    if (val.length > 60) return 'Country name cannot exceed 60 characters.';
                    if (/\d/.test(val)) return 'Country name cannot contain numbers.';
                }
                return '';
            default:
                return '';
        }
    };

    const handleFieldChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let val = e.target.value;
        // Name fields never accept digits — typed or pasted numbers are dropped
        if (NO_DIGIT_FIELDS.includes(key)) val = val.replace(/[0-9]/g, '');
        if (key === 'location') {
            const cleanDigits = val.replace(/\s/g, '');
            if (/^\d+$/.test(cleanDigits) && cleanDigits.length > 6) {
                val = cleanDigits.slice(0, 6);
            }
        }
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
            'country',
            ...(form.country === 'Other Country' ? ['customCountry' as const] : []),
            'state', 'city', 'location', 'address',
            'password', 'confirmPassword'
        ] as const;
        setTouched(Object.fromEntries(fields.map(f => [f, true])));
        setTermsTouched(true);

        const errorsObj: Record<string, string> = Object.fromEntries(fields.map(f => [f, validateField(f, form[f as keyof typeof form] ?? '')]));

        // Re-check uniqueness with the server
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

    const handleRegisterError = (err: unknown) => {
        const message = (err as Error).message || 'Registration failed.';
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
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                setError('Failed to connect to Razorpay payment gateway. Please check your internet connection.');
                setBusy(false);
                setBusyState('idle');
                return;
            }

            const effectiveAcademyType = form.academyType === 'Other' && form.customCategory.trim()
                ? form.customCategory.trim()
                : form.academyType;
            const effectiveCountry = form.country === 'Other Country' && form.customCountry.trim()
                ? form.customCountry.trim()
                : form.country;
            const payload: Record<string, unknown> = {
                ...form,
                academyType: effectiveAcademyType,
                country: effectiveCountry,
            };
            delete payload.confirmPassword;
            delete payload.customCategory;
            delete payload.customCountry;

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
                    color: '#4F46E5',
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

    // Sleek input styling helper
    const getFieldInputStyle = (fieldName: string, hasIconLeft = true) => {
        const hasError = touched[fieldName] && Boolean(fieldErrors[fieldName]);
        return {
            width: '100%',
            height: '44px',
            borderRadius: '10px',
            fontSize: '13.5px',
            paddingLeft: hasIconLeft ? '40px' : '14px',
            paddingRight: '14px',
            border: `1.5px solid ${hasError ? '#EF4444' : '#E2E8F0'}`,
            background: hasError ? '#FEF2F2' : '#F8FAFC',
            color: '#0F172A',
            outline: 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: hasError ? '0 0 0 3px rgba(239, 68, 68, 0.12)' : 'none',
        };
    };

    return (
        <div className="reg-page">
            <div className="reg-shell">
                <AuthBrandPanel />

                {/* ─── Right: Form panel ─── */}
                <div className="reg-main">
                    <Link
                        href="/"
                        aria-label="Close and go to home page"
                        className="reg-close"
                        onClick={() => {
                            if (step === 2) resetRegistration();
                        }}
                    >
                        <X size={18} />
                    </Link>

                    {/* ─── Header: Modern Stepper & Titles ─── */}
                    <div className="reg-head" style={{ padding: '24px 44px 18px', borderBottom: '1px solid #F1F5F9', background: '#FFFFFF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', maxWidth: '380px', margin: '0 auto' }}>
                            {steps.map((s, i) => {
                                const isCompleted = i < step;
                                const isActive = i === step;
                                return (
                                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: i < steps.length - 1 ? 1 : 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: 30, height: 30, borderRadius: '50%',
                                                background: isCompleted ? '#10B981' : isActive ? 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)' : '#F1F5F9',
                                                border: `2px solid ${isCompleted ? '#10B981' : isActive ? '#4F46E5' : '#E2E8F0'}`,
                                                boxShadow: isActive ? '0 3px 10px rgba(79, 70, 229, 0.3)' : 'none',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '12px', fontWeight: 700, color: (isCompleted || isActive) ? '#FFFFFF' : '#94A3B8',
                                                transition: 'all 0.3s ease',
                                                flexShrink: 0
                                            }}>
                                                {isCompleted ? <Check size={15} strokeWidth={2.8} /> : i + 1}
                                            </div>
                                            <span style={{
                                                fontSize: '12.5px',
                                                fontWeight: isActive ? 700 : 600,
                                                color: isActive ? '#0F172A' : isCompleted ? '#059669' : '#94A3B8',
                                                letterSpacing: '-0.01em',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {s}
                                            </span>
                                        </div>
                                        {i < steps.length - 1 && (
                                            <div style={{
                                                flex: 1,
                                                height: 2,
                                                borderRadius: 1,
                                                background: i < step ? '#10B981' : '#E2E8F0',
                                                margin: '0 6px',
                                                transition: 'background 0.3s ease'
                                            }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {step < 2 && (
                            <div style={{ marginTop: '16px', textAlign: 'left' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                        padding: '2px 8px', borderRadius: '9999px',
                                        background: '#EEF2FF', color: '#4F46E5',
                                        fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase'
                                    }}>
                                        Step {step + 1} of 3 • {step === 0 ? 'Academy Setup' : 'Choose Plan'}
                                    </span>
                                </div>
                                <h1 className="reg-title" style={{ fontSize: '21px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '4px 0 2px' }}>
                                    {step === 0 ? 'Create your academy' : 'Choose your plan'}
                                </h1>
                                <p className="reg-subtitle" style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                                    {step === 0 ? 'Start your 14-day free trial — no credit card needed.' : 'All plans include full feature access during your 14-day free trial.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ─── Scrollable body ─── */}
                    <div className="reg-body no-scrollbar" style={{ scrollbarWidth: 'none', padding: '20px 44px 24px' }}>

                        {/* ══════════════════════════════════════════════════
                            STEP 0: ACCOUNT INFORMATION (Sequence Unchanged)
                           ══════════════════════════════════════════════════ */}
                        {step === 0 && (
                            <form onSubmit={continueToPlan} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                                {/* 1. First Name & Last Name */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label className="cs-label" style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                                            Your First Name <span style={{ color: '#EF4444' }}>*</span>
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                            <input
                                                className="cs-input"
                                                placeholder="First name"
                                                autoComplete="given-name"
                                                maxLength={MAX.firstName}
                                                value={form.firstName}
                                                onChange={handleFieldChange('firstName')}
                                                onBlur={handleBlur('firstName')}
                                                style={getFieldInputStyle('firstName', true)}
                                            />
                                        </div>
                                        {touched.firstName && fieldErrors.firstName && (
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                                <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                                <span>{fieldErrors.firstName}</span>
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="cs-label" style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                                            Last Name <span style={{ color: '#EF4444' }}>*</span>
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                            <input
                                                className="cs-input"
                                                placeholder="Last name"
                                                autoComplete="family-name"
                                                maxLength={MAX.lastName}
                                                value={form.lastName}
                                                onChange={handleFieldChange('lastName')}
                                                onBlur={handleBlur('lastName')}
                                                style={getFieldInputStyle('lastName', true)}
                                            />
                                        </div>
                                        {touched.lastName && fieldErrors.lastName && (
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                                <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                                <span>{fieldErrors.lastName}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Email Address */}
                                <div>
                                    <label className="cs-label" style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                                        Email Address <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                        <input
                                            className="cs-input reg-input"
                                            type="email"
                                            placeholder="you@academy.com"
                                            autoComplete="email"
                                            maxLength={MAX.email}
                                            value={form.email}
                                            onChange={handleFieldChange('email')}
                                            onBlur={handleBlur('email')}
                                            style={getFieldInputStyle('email', true)}
                                            required
                                        />
                                    </div>
                                    {touched.email && fieldErrors.email ? (
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                            <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                            <span>{fieldErrors.email}</span>
                                            {fieldErrors.email === EMAIL_TAKEN && (
                                                <Link href="/login" style={{ color: '#4F46E5', fontWeight: 700, marginLeft: '4px', textDecoration: 'underline' }}>Sign in</Link>
                                            )}
                                        </p>
                                    ) : (
                                        <p style={{ color: '#94A3B8', fontSize: '11px', marginTop: '3px', marginLeft: '2px' }}>
                                            Required for account verification, login, and billing receipts.
                                        </p>
                                    )}
                                </div>

                                {/* 3. Mobile Number + OTP Verification */}
                                <div>
                                    <label className="cs-label" style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                                        Mobile Number <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                                            <Phone size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
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
                                                    ...getFieldInputStyle('phone', true),
                                                    ...(phoneVerified ? {
                                                        borderColor: '#10B981',
                                                        background: '#F0FDF4',
                                                        color: '#166534',
                                                        cursor: 'not-allowed',
                                                        fontWeight: 600,
                                                    } : {}),
                                                }}
                                            />
                                        </div>
                                        {phoneVerified ? (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                padding: '0 14px', height: '44px', borderRadius: '10px',
                                                background: '#ECFDF5', border: '1.5px solid #A7F3D0', color: '#047857',
                                                fontSize: '12.5px', fontWeight: 700, whiteSpace: 'nowrap'
                                            }}>
                                                <BadgeCheck size={16} /> Verified
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={sendOtp}
                                                disabled={resendIn > 0 || checkingPhone}
                                                style={{
                                                    height: '44px', borderRadius: '10px', padding: '0 16px',
                                                    fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
                                                    justifyContent: 'center', minWidth: '110px',
                                                    border: '1.5px solid #CBD5E1', background: '#FFFFFF', color: '#334155'
                                                }}
                                            >
                                                {checkingPhone ? 'Checking…' : resendIn > 0 ? `Resend in ${resendIn}s` : otp ? 'Resend OTP' : 'Send OTP'}
                                            </button>
                                        )}
                                    </div>
                                    {touched.phone && fieldErrors.phone ? (
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                            <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                            <span>{fieldErrors.phone}</span>
                                            {fieldErrors.phone === PHONE_TAKEN && (
                                                <Link href="/login" style={{ color: '#4F46E5', fontWeight: 700, marginLeft: '4px', textDecoration: 'underline' }}>Sign in</Link>
                                            )}
                                        </p>
                                    ) : !phoneVerified && fieldErrors.phoneOtp ? (
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                            <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                            <span>{fieldErrors.phoneOtp}</span>
                                        </p>
                                    ) : (
                                        <p style={{ color: '#94A3B8', fontSize: '11px', marginTop: '3px', marginLeft: '2px' }}>
                                            {phoneVerified ? 'Mobile number verified and locked' : 'Enter 10-digit Indian mobile number (e.g. 9840012345)'}
                                        </p>
                                    )}

                                    {/* OTP verification drawer */}
                                    {otp && !phoneVerified && (
                                        <div style={{
                                            marginTop: '10px', padding: '12px 14px',
                                            border: '1.5px solid #C7D2FE', background: '#F5F7FF',
                                            borderRadius: '10px', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.08)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '12px', color: '#4338CA', fontWeight: 500 }}>
                                                    Demo Verification Code:
                                                </span>
                                                <span style={{
                                                    fontFamily: 'monospace', fontSize: '14px', fontWeight: 800,
                                                    letterSpacing: '0.18em', color: '#3730A3', background: '#EEF2FF',
                                                    padding: '2px 8px', borderRadius: '6px', border: '1px solid #C7D2FE'
                                                }}>
                                                    {otp.code}
                                                </span>
                                            </div>
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
                                                    style={{
                                                        flex: 1, minWidth: 0, height: '40px', letterSpacing: '0.22em',
                                                        textAlign: 'center', fontWeight: 700, fontSize: '14px',
                                                        background: '#FFFFFF', border: '1.5px solid #CBD5E1', borderRadius: '8px'
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn-primary"
                                                    onClick={verifyOtp}
                                                    disabled={otpInput.length !== 6}
                                                    style={{
                                                        height: '40px', borderRadius: '8px', padding: '0 16px',
                                                        justifyContent: 'center', minWidth: '90px', fontSize: '13px', fontWeight: 600
                                                    }}
                                                >
                                                    Verify
                                                </button>
                                            </div>
                                            {otpError && (
                                                <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '6px', fontWeight: 500 }}>
                                                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                                    <span>{otpError}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 4. Academy / Class Name */}
                                <div>
                                    <label className="cs-label" style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                                        Academy / Class Name <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Building2 size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                        <input
                                            className="cs-input reg-input"
                                            placeholder="e.g. Apex Music & Arts Conservatory"
                                            autoComplete="organization"
                                            maxLength={MAX.academyName}
                                            value={form.academyName}
                                            onChange={handleFieldChange('academyName')}
                                            onBlur={handleBlur('academyName')}
                                            style={getFieldInputStyle('academyName', true)}
                                        />
                                    </div>
                                    {touched.academyName && fieldErrors.academyName && (
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                            <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                            <span>{fieldErrors.academyName}</span>
                                        </p>
                                    )}
                                </div>

                                {/* 5. Class Category */}
                                <div>
                                    <label className="cs-label" id="reg-category-label" style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                                        Class Category <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Sparkles size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                        <select
                                            id="reg-category"
                                            className="cs-input reg-native-select"
                                            aria-labelledby="reg-category-label"
                                            value={form.academyType}
                                            onChange={handleFieldChange('academyType')}
                                            style={{
                                                ...getFieldInputStyle('academyType', true),
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                        </select>
                                    </div>
                                    {touched.academyType && fieldErrors.academyType && (
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                            <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                            <span>{fieldErrors.academyType}</span>
                                        </p>
                                    )}

                                    {form.academyType === 'Other' && (
                                        <div style={{ marginTop: '8px' }}>
                                            <label className="cs-label" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                                                Specify Category Name <span style={{ color: '#EF4444' }}>*</span>
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <Sparkles size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                                <input
                                                    className="cs-input reg-input"
                                                    type="text"
                                                    placeholder="Enter your class category (e.g. Coding, Robotics, Karate)"
                                                    maxLength={50}
                                                    value={form.customCategory}
                                                    onChange={handleFieldChange('customCategory')}
                                                    onBlur={handleBlur('customCategory')}
                                                    style={getFieldInputStyle('customCategory', true)}
                                                    autoFocus
                                                    required
                                                />
                                            </div>
                                            {touched.customCategory && fieldErrors.customCategory && (
                                                <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                                    <span>{fieldErrors.customCategory}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 6. Country & State */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label className="cs-label" style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                                            Country <span style={{ color: '#EF4444' }}>*</span>
                                        </label>
                                        <CountrySelect
                                            value={form.country}
                                            onChange={val => {
                                                setForm(f => ({
                                                    ...f,
                                                    country: val,
                                                    customCountry: val === 'Other Country' ? f.customCountry : '',
                                                }));
                                                if (touched.country) {
                                                    setFieldErrors(errs => ({ ...errs, country: validateField('country', val) }));
                                                }
                                            }}
                                            onBlur={handleBlur('country')}
                                            hasError={Boolean(touched.country && fieldErrors.country)}
                                            style={{ height: '44px', borderRadius: '10px' }}
                                        />
                                        {touched.country && fieldErrors.country && (
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                                <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                                <span>{fieldErrors.country}</span>
                                            </p>
                                        )}

                                        {form.country === 'Other Country' && (
                                            <div style={{ marginTop: '8px' }}>
                                                <label className="cs-label" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                                                    Specify Country Name <span style={{ color: '#EF4444' }}>*</span>
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <Globe size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                                    <input
                                                        className="cs-input reg-input"
                                                        type="text"
                                                        placeholder="Enter your country name"
                                                        maxLength={60}
                                                        value={form.customCountry}
                                                        onChange={handleFieldChange('customCountry')}
                                                        onBlur={handleBlur('customCountry')}
                                                        style={getFieldInputStyle('customCountry', true)}
                                                        autoFocus
                                                        required
                                                    />
                                                </div>
                                                {touched.customCountry && fieldErrors.customCountry && (
                                                    <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                                        <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                                        <span>{fieldErrors.customCountry}</span>
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="cs-label" style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                                            State / Province <span style={{ color: '#EF4444' }}>*</span>
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <Map size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                            <input
                                                className="cs-input reg-input"
                                                placeholder="e.g. Maharashtra"
                                                maxLength={60}
                                                value={form.state}
                                                onChange={handleFieldChange('state')}
                                                onBlur={handleBlur('state')}
                                                style={getFieldInputStyle('state', true)}
                                            />
                                        </div>
                                        {touched.state && fieldErrors.state && (
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                                <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                                <span>{fieldErrors.state}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* 7. City & Location / Area / Pin */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label className="cs-label" style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                                            City <span style={{ color: '#EF4444' }}>*</span>
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <Building size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                            <input
                                                className="cs-input reg-input"
                                                placeholder="e.g. Pune"
                                                maxLength={60}
                                                value={form.city}
                                                onChange={handleFieldChange('city')}
                                                onBlur={handleBlur('city')}
                                                style={getFieldInputStyle('city', true)}
                                            />
                                        </div>
                                        {touched.city && fieldErrors.city && (
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                                <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                                <span>{fieldErrors.city}</span>
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="cs-label" style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                                            Location / Area / Pin <span style={{ color: '#EF4444' }}>*</span>
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <Compass size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                            <input
                                                className="cs-input reg-input"
                                                placeholder="e.g. 411038 or Kothrud, 411038"
                                                maxLength={80}
                                                value={form.location}
                                                onChange={handleFieldChange('location')}
                                                onBlur={handleBlur('location')}
                                                style={getFieldInputStyle('location', true)}
                                            />
                                        </div>
                                        {touched.location && fieldErrors.location && (
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                                <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                                <span>{fieldErrors.location}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* 8. Address */}
                                <div>
                                    <label className="cs-label" style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                                        Street Address / Campus Premises <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <MapPin size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                        <input
                                            className="cs-input reg-input"
                                            placeholder="e.g. Office 204, Crystal Plaza, Paud Road"
                                            maxLength={200}
                                            value={form.address}
                                            onChange={handleFieldChange('address')}
                                            onBlur={handleBlur('address')}
                                            style={getFieldInputStyle('address', true)}
                                        />
                                    </div>
                                    {touched.address && fieldErrors.address && (
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                            <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                            <span>{fieldErrors.address}</span>
                                        </p>
                                    )}
                                </div>

                                {/* 9. Password */}
                                <div>
                                    <label className="cs-label" style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                                        Password <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                        <input
                                            className="cs-input"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Create a strong password"
                                            autoComplete="new-password"
                                            maxLength={MAX.password}
                                            style={{
                                                ...getFieldInputStyle('password', true),
                                                paddingRight: '42px',
                                            }}
                                            value={form.password}
                                            onChange={handleFieldChange('password')}
                                            onFocus={() => setPasswordFocused(true)}
                                            onBlur={() => { setPasswordFocused(false); handleBlur('password')(); }}
                                        />
                                        <button
                                            type="button"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>

                                    {/* Dynamic Password Strength & Criteria Checklist */}
                                    {(() => {
                                        const pw = form.password;
                                        const passedRules = PASSWORD_RULES.filter(r => r.test(pw));
                                        const passedCount = passedRules.length;
                                        const showHints = pw.length > 0 && (passwordFocused || !touched.password);

                                        if (!showHints) {
                                            return touched.password && fieldErrors.password ? (
                                                <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                                    <span>{fieldErrors.password}</span>
                                                </p>
                                            ) : null;
                                        }

                                        const score = passedCount; // 0 to 6
                                        const [strengthLabel, strengthColor] = score === 6
                                            ? ['Strong Password', '#10B981']
                                            : score >= 4
                                            ? ['Good Password', '#F59E0B']
                                            : score >= 2
                                            ? ['Fair Password', '#FB923C']
                                            : ['Weak Password', '#EF4444'];

                                        return (
                                            <div style={{ marginTop: '8px', padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
                                                {/* 4-segment visual strength bar */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: strengthColor }}>{strengthLabel}</span>
                                                    <span style={{ fontSize: '11px', color: '#64748B' }}>{passedCount} of 6 requirements</span>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', height: '4px', marginBottom: '8px' }}>
                                                    {[1, 2, 3, 4].map(seg => {
                                                        const active = score >= seg * 1.5;
                                                        return (
                                                            <div
                                                                key={seg}
                                                                style={{
                                                                    height: '100%',
                                                                    borderRadius: '2px',
                                                                    background: active ? strengthColor : '#E2E8F0',
                                                                    transition: 'all 0.25s ease'
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>

                                                {/* Live criteria checklist */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
                                                    {PASSWORD_RULES.map(rule => {
                                                        const isMet = rule.test(pw);
                                                        return (
                                                            <div key={rule.label} style={{
                                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                                fontSize: '11px', fontWeight: 500,
                                                                color: isMet ? '#059669' : '#64748B',
                                                                transition: 'color 0.2s'
                                                            }}>
                                                                {isMet ? (
                                                                    <Check size={12} strokeWidth={2.5} color="#10B981" />
                                                                ) : (
                                                                    <Circle size={8} color="#94A3B8" />
                                                                )}
                                                                <span>{rule.label}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {fieldErrors.password && touched.password && (
                                                    <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11px', marginTop: '6px', fontWeight: 500 }}>
                                                        <AlertCircle size={11} style={{ flexShrink: 0 }} />
                                                        <span>{fieldErrors.password}</span>
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* 10. Confirm Password */}
                                <div>
                                    <label className="cs-label" style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                                        Confirm Password <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                                        <input
                                            className="cs-input"
                                            type={showConfirm ? 'text' : 'password'}
                                            placeholder="Re-enter your password"
                                            autoComplete="new-password"
                                            maxLength={MAX.password}
                                            style={{
                                                ...getFieldInputStyle('confirmPassword', true),
                                                paddingRight: '42px',
                                                ...(form.confirmPassword && form.confirmPassword === form.password ? {
                                                    borderColor: '#10B981',
                                                    background: '#F0FDF4',
                                                } : {}),
                                            }}
                                            value={form.confirmPassword}
                                            onChange={e => {
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
                                            style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                                        >
                                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {touched.confirmPassword && fieldErrors.confirmPassword ? (
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                                            <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                            <span>{fieldErrors.confirmPassword}</span>
                                        </p>
                                    ) : form.confirmPassword && form.confirmPassword === form.password ? (
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '11.5px', marginTop: '4px', fontWeight: 600 }}>
                                            <CheckCircle size={12} /> Passwords match
                                        </p>
                                    ) : null}
                                </div>

                                {/* 11. Terms of Service Checkbox */}
                                <div style={{
                                    padding: '10px 12px', borderRadius: '10px',
                                    background: (termsTouched && !acceptTerms) ? '#FEF2F2' : '#F8FAFC',
                                    border: `1.5px solid ${(termsTouched && !acceptTerms) ? '#FCA5A5' : '#E2E8F0'}`,
                                    transition: 'all 0.2s'
                                }}>
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: '#334155', cursor: 'pointer' }}>
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
                                            style={{ marginTop: 2, accentColor: '#4F46E5', width: 16, height: 16, cursor: 'pointer' }}
                                        />
                                        <span style={{ lineHeight: 1.45 }}>
                                            I agree to ClassSphere&apos;s <Link href="/terms" target="_blank" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'underline' }}>Terms &amp; Conditions</Link> and <Link href="/privacy" target="_blank" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'underline' }}>Privacy Policy</Link>
                                        </span>
                                    </label>
                                    {termsTouched && !acceptTerms && (
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11.5px', marginTop: '6px', fontWeight: 500 }}>
                                            <AlertCircle size={12} style={{ flexShrink: 0 }} />
                                            <span>Please agree to the Terms &amp; Conditions and Privacy Policy to continue.</span>
                                        </p>
                                    )}
                                </div>

                                {/* Form error banner */}
                                {error && (
                                    <div role="alert" style={{
                                        background: '#FEF2F2', border: '1.5px solid #FCA5A5',
                                        borderRadius: '10px', padding: '10px 14px', color: '#B91C1C',
                                        fontSize: '12.5px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px'
                                    }}>
                                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* 12. Submit CTA */}
                                <button
                                    type="submit"
                                    className="btn-primary reg-cta"
                                    style={{
                                        width: '100%', height: '46px', borderRadius: '10px',
                                        fontSize: '14.5px', fontWeight: 700, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                                        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                                        cursor: 'pointer', transition: 'all 0.2s ease',
                                    }}
                                >
                                    Continue to Plans <ArrowRight size={17} />
                                </button>
                            </form>
                        )}

                        {/* ══════════════════════════════════════════════════
                            STEP 1: PLAN SELECTION (Sequence Unchanged)
                           ══════════════════════════════════════════════════ */}
                        {step === 1 && (
                            <div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                    {plans?.map(p => {
                                        const selected = p.planTier === selectedPlan;
                                        return (
                                            <div
                                                key={p.planTier}
                                                onClick={() => setPlanTier(p.planTier)}
                                                style={{
                                                    position: 'relative',
                                                    padding: '16px',
                                                    background: selected ? '#F5F7FF' : '#FFFFFF',
                                                    border: `2px solid ${selected ? '#4F46E5' : '#E2E8F0'}`,
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: selected ? '0 4px 16px rgba(79, 70, 229, 0.12)' : 'none',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <input
                                                            type="radio"
                                                            name="plan"
                                                            checked={selected}
                                                            onChange={() => setPlanTier(p.planTier)}
                                                            style={{ accentColor: '#4F46E5', width: 18, height: 18, cursor: 'pointer' }}
                                                        />
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <h3 style={{ fontSize: '15px', fontWeight: 700, color: selected ? '#3730A3' : '#0F172A', margin: 0 }}>
                                                                    {p.planTier}
                                                                </h3>
                                                                {p.isPopular && (
                                                                    <span style={{
                                                                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em',
                                                                        padding: '2px 8px', borderRadius: '9999px',
                                                                        background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE'
                                                                    }}>
                                                                        ⭐ POPULAR
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                                                                {p.description || `Up to ${p.maxSeats} active students • ${p.maxBranches} campus branch`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <div style={{ fontSize: '17px', fontWeight: 800, color: selected ? '#4F46E5' : '#0F172A' }}>
                                                            {formatMoney(p.priceMonthly, p.currency)}
                                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>/mo</span>
                                                        </div>
                                                        <span style={{ fontSize: '10.5px', color: '#10B981', fontWeight: 600 }}>14 days free trial</span>
                                                    </div>
                                                </div>

                                                {/* Plan feature highlights */}
                                                {p.features && p.features.length > 0 && (
                                                    <div style={{
                                                        marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #EEF2FF',
                                                        display: 'flex', flexWrap: 'wrap', gap: '6px'
                                                    }}>
                                                        {p.features.slice(0, 3).map((f: string, fi: number) => (
                                                            <span key={fi} style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                                fontSize: '11px', color: '#475569', background: selected ? '#EEF2FF' : '#F8FAFC',
                                                                padding: '2px 8px', borderRadius: '6px'
                                                            }}>
                                                                <Check size={11} color="#10B981" strokeWidth={2.5} /> {f}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {paymentStatus === 'cancelled' && (
                                    <div style={{
                                        padding: '12px 14px', borderRadius: '10px', background: '#FFFBEB',
                                        border: '1px solid #FDE68A', color: '#92400E', fontSize: '12.5px',
                                        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px',
                                    }}>
                                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                        <span>Payment was cancelled. You can retry with the button below or choose a different plan.</span>
                                    </div>
                                )}

                                {paymentStatus === 'failed' && (
                                    <div style={{
                                        padding: '12px 14px', borderRadius: '10px', background: '#FEF2F2',
                                        border: '1px solid #FECACA', color: '#991B1B', fontSize: '12.5px',
                                        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px',
                                    }}>
                                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                        <span>{error || 'Payment was unsuccessful. Your account was not charged. Please try again.'}</span>
                                    </div>
                                )}

                                {error && paymentStatus !== 'failed' && (
                                    <div role="alert" style={{
                                        padding: '12px 14px', borderRadius: '10px', background: '#FEF2F2',
                                        border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '12.5px',
                                        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px'
                                    }}>
                                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ height: '46px', borderRadius: '10px', padding: '0 18px', fontSize: '14px', fontWeight: 600 }}
                                        disabled={busy}
                                        onClick={() => { setError(null); setPaymentStatus('idle'); setStep(0); }}
                                    >
                                        <ArrowLeft size={16} /> Back
                                    </button>
                                    <button
                                        className="btn-primary reg-cta"
                                        style={{
                                            flex: 1, height: '46px', borderRadius: '10px',
                                            fontSize: '14.5px', fontWeight: 700,
                                            background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                                            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                                        }}
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
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════════
                            STEP 2: READY / WELCOME (Sequence Unchanged)
                           ══════════════════════════════════════════════════ */}
                        {step === 2 && (
                            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: '20px',
                                    background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                                    border: '1.5px solid #C7D2FE',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '32px', margin: '0 auto 16px',
                                    boxShadow: '0 8px 20px rgba(79, 70, 229, 0.15)'
                                }}>
                                    🎉
                                </div>
                                <h1 style={{ fontSize: '23px', fontWeight: 800, marginBottom: '8px', color: '#0F172A', letterSpacing: '-0.02em' }}>
                                    Welcome to ClassSphere!
                                </h1>
                                <p style={{ color: '#64748B', fontSize: '13.5px', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto 20px' }}>
                                    <strong style={{ color: '#0F172A' }}>{form.academyName.trim()}</strong> is ready with a Main Campus branch.
                                    Next, configure your courses, batches, and student admissions.
                                </p>

                                {/* Academy summary card */}
                                <div style={{
                                    background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '12px',
                                    padding: '14px 18px', textAlign: 'left', marginBottom: '22px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                        <ShieldCheck size={18} color="#4F46E5" />
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                            Account Setup Summary
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                                        <div>
                                            <span style={{ color: '#64748B' }}>Primary Contact:</span>
                                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{`${form.firstName} ${form.lastName}`.trim()}</div>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748B' }}>Login Identifier:</span>
                                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{form.email.trim() || form.phone.trim()}</div>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748B' }}>Branch:</span>
                                            <div style={{ fontWeight: 600, color: '#0F172A' }}>Main Campus</div>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748B' }}>Plan Tier:</span>
                                            <div style={{ fontWeight: 600, color: '#4F46E5' }}>{selectedPlan || 'Starter'} (14-Day Trial)</div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className="btn-primary"
                                    style={{
                                        width: '100%', maxWidth: '280px', height: '44px',
                                        justifyContent: 'center', padding: '0 24px',
                                        fontSize: '14.5px', fontWeight: 700, borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                                        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                                        margin: '0 auto'
                                    }}
                                    onClick={() => {
                                        const dest = session ? homePath(session) : '/login';
                                        resetRegistration();
                                        router.replace(dest);
                                    }}
                                >
                                    Go to Dashboard <ArrowRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ─── Static footer ─── */}
                    {step < 2 && (
                        <p className="reg-foot" style={{ padding: '14px 44px', fontSize: '13px' }}>
                            Already have an account? <Link href="/login" style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none', marginLeft: '4px' }}>Sign in</Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
