'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import BadgeList from '@/components/BadgeList';
import CountryPhoneInput, { COUNTRIES, type CountryOption, validatePhoneNumber } from '@/components/CountryPhoneInput';
import { useState, useRef, useEffect } from 'react';
import { Search, Phone, Users, UserCheck, UserX, Clock, ChevronLeft, ChevronRight, Plus, Pencil, Upload, Camera, ArrowRight, ArrowLeft, Check, Copy, Send, UserPlus, MapPin, Calendar as CalendarIcon, X } from 'lucide-react';
import { api, useApi, formatDate, initials } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';

interface Student {
    studentId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string | null;
    photo?: string | null;
    enrollmentNumber: string;
    status: string;
    batches: string | null;
    branchId?: string | null;
    branchName: string | null;
    guardianName: string | null;
    feeStatus: string;
    createdAt: string;
}

interface StudentSearch {
    total: number;
    statusCounts: Record<string, number>;
    students: Student[];
}

const PAGE_SIZE = 7;

const statusConfig: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'badge-success' },
    'on-hold': { label: 'On-Hold', cls: 'badge-warning' },
    inquiry: { label: 'Inquiry', cls: 'badge-info' },
    completed: { label: 'Completed', cls: 'badge-secondary' },
    withdrawn: { label: 'Withdrawn', cls: 'badge-danger' },
};
const feesConfig: Record<string, { label: string; cls: string }> = {
    paid: { label: 'Paid', cls: 'badge-success' },
    overdue: { label: 'Overdue', cls: 'badge-danger' },
    pending: { label: 'Pending', cls: 'badge-warning' },
    none: { label: '—', cls: 'badge-secondary' },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', photo: '', dateOfBirth: '', enrollmentNumber: '', courseId: '', batchId: '', branchId: '', feeStatus: 'none', feeAmount: '' };

interface GuardianFormData {
    mode: 'new' | 'existing';
    existingGuardianId: string;
    firstName: string;
    lastName: string;
    relationship: string;
    email: string;
    phone: string;
    createLogin: boolean;
}

const emptyGuardianForm: GuardianFormData = {
    mode: 'new',
    existingGuardianId: '',
    firstName: '',
    lastName: '',
    relationship: 'Parent',
    email: '',
    phone: '',
    createLogin: true,
};

export default function StudentsPage() {
    const session = useSession();
    const { workspace } = useWorkspace();
    const branchScoped = !!session?.session.branchId;
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [offset, setOffset] = useState(0);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[0]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // 2-Step Registration state
    const [step, setStep] = useState<1 | 2>(1);
    const [guardianForm, setGuardianForm] = useState<GuardianFormData>(emptyGuardianForm);
    const [guardianCountry, setGuardianCountry] = useState<CountryOption>(COUNTRIES[0]);
    const [guardianFieldErrors, setGuardianFieldErrors] = useState<Record<string, string>>({});
    const [guardianTouched, setGuardianTouched] = useState<Record<string, boolean>>({});
    const [createdCredentials, setCreatedCredentials] = useState<{ name: string; email: string; password?: string } | null>(null);
    const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Guardian OTP Verification state
    const [guardianOtp, setGuardianOtp] = useState<{ code: string; phone: string; expiresAt: number } | null>(null);
    const [guardianOtpInput, setGuardianOtpInput] = useState('');
    const [guardianOtpError, setGuardianOtpError] = useState<string | null>(null);
    const [guardianVerifiedPhone, setGuardianVerifiedPhone] = useState<string | null>(null);
    const [guardianResendIn, setGuardianResendIn] = useState(0);

    useEffect(() => {
        if (guardianResendIn <= 0) return;
        const timer = setTimeout(() => setGuardianResendIn(s => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [guardianResendIn]);

    // Edit student state
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', status: 'active', enrollmentNumber: '', courseId: '', batchId: '', branchId: '', feeStatus: 'none', feeAmount: '' });
    const [editCountry, setEditCountry] = useState<CountryOption>(COUNTRIES[0]);
    const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
    const [editTouched, setEditTouched] = useState<Record<string, boolean>>({});
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const validateField = (name: string, value: string, country: CountryOption = selectedCountry): string => {
        const val = value.trim();
        switch (name) {
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
            case 'enrollmentNumber':
                if (val && !/^[a-zA-Z0-9_-]{2,30}$/.test(val)) {
                    return 'Student ID must be 2 to 30 alphanumeric characters (e.g. STUD-01).';
                }
                return '';
            case 'email':
                if (!val) return 'Email address is required.';
                if (!EMAIL_REGEX.test(val)) return 'Please enter a valid email address.';
                return '';
            case 'phone':
                return validatePhoneNumber(val, country, true);
            case 'dateOfBirth':
                if (val) {
                    const dob = new Date(val);
                    if (dob > new Date()) return 'Date of birth cannot be in the future.';
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
        if (formError) setFormError(null);
    };

    const handleBlur = (key: keyof typeof form) => () => {
        setTouched(t => ({ ...t, [key]: true }));
        setFieldErrors(errs => ({ ...errs, [key]: validateField(key, form[key]) }));
    };

    const handlePhoneChange = (digits: string, country: CountryOption) => {
        setForm(f => ({ ...f, phone: digits }));
        setSelectedCountry(country);
        if (touched.phone) {
            setFieldErrors(errs => ({ ...errs, phone: validatePhoneNumber(digits, country, true) }));
        }
        if (formError) setFormError(null);
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setPhotoError('Please select a valid image file (PNG, JPG, WebP).');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setPhotoError('Image must be 2 MB or smaller.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result);
            setPhotoPreview(dataUrl);
            setForm(f => ({ ...f, photo: dataUrl }));
            setPhotoError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        setPhotoPreview(null);
        setForm(f => ({ ...f, photo: '' }));
        setPhotoError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getInputStyle = (fieldName: string) => {
        const hasError = touched[fieldName] && Boolean(fieldErrors[fieldName]);
        return {
            borderColor: hasError ? '#EF4444' : undefined,
            background: hasError ? '#FEF2F2' : undefined,
        };
    };

    const validateGuardianField = (name: string, value: string, country: CountryOption = guardianCountry): string => {
        const val = value.trim();
        switch (name) {
            case 'firstName':
                if (!val) return 'Guardian first name is required.';
                if (val.length < 2) return 'Guardian first name must be at least 2 characters.';
                if (!NAME_REGEX.test(val)) return 'First name can only contain letters.';
                return '';
            case 'lastName':
                if (!val) return 'Guardian last name is required.';
                if (val.length < 2) return 'Guardian last name must be at least 2 characters.';
                if (!NAME_REGEX.test(val)) return 'Last name can only contain letters.';
                return '';
            case 'email':
                if (!val) return 'Guardian email address is required.';
                if (!EMAIL_REGEX.test(val)) return 'Please enter a valid email address.';
                return '';
            case 'phone':
                return validatePhoneNumber(val, country, true);
            default:
                return '';
        }
    };

    const handleGuardianFieldChange = (key: keyof GuardianFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const val = e.target.value;
        setGuardianForm(g => ({ ...g, [key]: val }));
        if (guardianTouched[key]) {
            setGuardianFieldErrors(errs => ({ ...errs, [key]: validateGuardianField(key, val) }));
        }
        if (formError) setFormError(null);
    };

    const handleGuardianBlur = (key: keyof GuardianFormData) => () => {
        setGuardianTouched(t => ({ ...t, [key]: true }));
        setGuardianFieldErrors(errs => ({ ...errs, [key]: validateGuardianField(key, String(guardianForm[key])) }));
    };

    const handleGuardianPhoneChange = (digits: string, country: CountryOption) => {
        setGuardianForm(g => ({ ...g, phone: digits }));
        setGuardianCountry(country);
        if (guardianVerifiedPhone && guardianVerifiedPhone !== digits) {
            setGuardianVerifiedPhone(null);
            setGuardianOtp(null);
            setGuardianOtpInput('');
            setGuardianOtpError(null);
        }
        if (guardianTouched.phone) {
            setGuardianFieldErrors(errs => ({ ...errs, phone: validatePhoneNumber(digits, country, true) }));
        }
        if (formError) setFormError(null);
    };

    const sendGuardianOtp = () => {
        setGuardianTouched(t => ({ ...t, phone: true }));
        const phoneErr = validatePhoneNumber(guardianForm.phone, guardianCountry, true);
        if (phoneErr) {
            setGuardianFieldErrors(errs => ({ ...errs, phone: phoneErr }));
            return;
        }
        const digits = guardianForm.phone.replace(/\D/g, '');
        const code = String(Math.floor(100000 + Math.random() * 900000));
        setGuardianOtp({ code, phone: digits, expiresAt: Date.now() + 5 * 60 * 1000 });
        setGuardianOtpInput('');
        setGuardianOtpError(null);
        setGuardianResendIn(30);
    };

    const verifyGuardianOtp = () => {
        if (!guardianOtp) return;
        const digits = guardianForm.phone.replace(/\D/g, '');
        if (guardianOtp.phone !== digits) {
            setGuardianOtpError('The mobile number was changed. Please send a new OTP.');
            return;
        }
        if (Date.now() > guardianOtp.expiresAt) {
            setGuardianOtpError('This OTP has expired. Please resend.');
            return;
        }
        if (guardianOtpInput.trim() !== guardianOtp.code) {
            setGuardianOtpError('Incorrect OTP. Please enter the valid 6-digit code.');
            return;
        }
        setGuardianVerifiedPhone(digits);
        setGuardianOtp(null);
        setGuardianOtpInput('');
        setGuardianOtpError(null);
        setGuardianFieldErrors(errs => {
            const copy = { ...errs };
            delete copy.phone;
            return copy;
        });
        if (formError) setFormError(null);
    };

    const getGuardianInputStyle = (fieldName: string) => {
        const hasError = guardianTouched[fieldName] && Boolean(guardianFieldErrors[fieldName]);
        return {
            borderColor: hasError ? '#EF4444' : undefined,
            background: hasError ? '#FEF2F2' : undefined,
        };
    };

    const handleNextStep = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const allTouched = { firstName: true, lastName: true, email: true, phone: true, dateOfBirth: true };
        setTouched(allTouched);

        const errors: Record<string, string> = {
            firstName: validateField('firstName', form.firstName),
            lastName: validateField('lastName', form.lastName),
            email: validateField('email', form.email),
            phone: validateField('phone', form.phone, selectedCountry),
            dateOfBirth: validateField('dateOfBirth', form.dateOfBirth),
        };

        const activeErrors = Object.fromEntries(Object.entries(errors).filter(([_, msg]) => Boolean(msg)));
        setFieldErrors(activeErrors);

        if (Object.keys(activeErrors).length > 0) {
            setFormError('Please correct the highlighted student errors before proceeding.');
            return;
        }

        setFormError(null);
        setStep(2);
    };

    const handlePreviousStep = () => {
        setFormError(null);
        setStep(1);
    };

    const closeAddModal = () => {
        setShowAdd(false);
        setStep(1);
        setForm(emptyForm);
        setPhotoPreview(null);
        setPhotoError(null);
        setFieldErrors({});
        setTouched({});
        setFormError(null);
        setGuardianForm(emptyGuardianForm);
        setGuardianFieldErrors({});
        setGuardianTouched({});
        setGuardianCountry(COUNTRIES[0]);
        setGuardianVerifiedPhone(null);
        setGuardianOtp(null);
        setGuardianOtpInput('');
        setGuardianOtpError(null);
        setGuardianResendIn(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (search) query.set('q', search);
    if (statusFilter !== 'all') query.set('status', statusFilter);
    const { data, error, reload } = useApi<StudentSearch>(`/students?${query}`);
    const { data: courses } = useApi<Array<{ courseId: string; title: string; code: string; tuitionAmount?: number; branchId?: string | null }>>(showAdd || !!editingStudent ? '/courses' : null);
    const { data: batches } = useApi<Array<{ batchId: string; name: string; courseTitle?: string; courseId?: string; tuitionAmount?: number; branchId?: string }>>(showAdd || !!editingStudent ? '/batches' : null);
    const { data: rawGuardians } = useApi<Array<{ guardianId: string; firstName: string; lastName: string; phone: string; email: string; relationship: string; householdCode?: string }>>(showAdd ? '/guardians' : null);
    const { data: nextIdData } = useApi<{ nextId: string }>(showAdd ? '/students?action=next-id' : null);

    useEffect(() => {
        if (showAdd && !form.enrollmentNumber) {
            if (nextIdData?.nextId) {
                setForm(f => ({ ...f, enrollmentNumber: nextIdData.nextId }));
            } else if (data?.students) {
                const maxSeq = data.students.reduce((max, s) => {
                    const match = s.enrollmentNumber?.match(/^STUD-(\d+)$/i);
                    return match ? Math.max(max, parseInt(match[1], 10)) : max;
                }, 0);
                setForm(f => ({ ...f, enrollmentNumber: `STUD-${String(maxSeq + 1).padStart(2, '0')}` }));
            }
        }
    }, [showAdd, nextIdData, data]);

    const counts = data?.statusCounts ?? {};
    const totalStudents = Object.values(counts).reduce((a, b) => a + b, 0);
    const stats = [
        { label: 'Total', value: totalStudents, icon: Users, color: '#6C63FF' },
        { label: 'Active', value: counts.active ?? 0, icon: UserCheck, color: '#10B981' },
        { label: 'On Hold', value: counts['on-hold'] ?? 0, icon: Clock, color: '#F59E0B' },
        { label: 'Withdrawn', value: counts.withdrawn ?? 0, icon: UserX, color: '#EF4444' },
    ];

    const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE) || 1;
    const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

    const getVisiblePages = (curr: number, total: number): (number | string)[] => {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const pages: (number | string)[] = [1];
        if (curr > 3) pages.push('...');
        const start = Math.max(2, curr - 1);
        const end = Math.min(total - 1, curr + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (curr < total - 2) pages.push('...');
        pages.push(total);
        return pages;
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 1) {
            handleNextStep(e);
            return;
        }

        // Validate step 2: Guardian Registration
        if (guardianForm.mode === 'new') {
            const allGTouched = { firstName: true, lastName: true, email: true, phone: true };
            setGuardianTouched(allGTouched);

            const gErrors: Record<string, string> = {
                firstName: validateGuardianField('firstName', guardianForm.firstName),
                lastName: validateGuardianField('lastName', guardianForm.lastName),
                email: validateGuardianField('email', guardianForm.email),
                phone: validateGuardianField('phone', guardianForm.phone, guardianCountry),
            };

            const guardianDigits = guardianForm.phone.replace(/\D/g, '');
            if (!gErrors.phone && (!guardianVerifiedPhone || guardianVerifiedPhone !== guardianDigits)) {
                gErrors.phone = 'Please verify the guardian mobile number with OTP.';
            }

            const activeGErrors = Object.fromEntries(Object.entries(gErrors).filter(([_, msg]) => Boolean(msg)));
            setGuardianFieldErrors(activeGErrors);

            if (Object.keys(activeGErrors).length > 0) {
                if (!guardianVerifiedPhone || guardianVerifiedPhone !== guardianDigits) {
                    setFormError('Please verify the guardian mobile number with OTP before completing registration.');
                } else {
                    setFormError('Please correct the highlighted guardian errors before submitting.');
                }
                return;
            }
        } else {
            if (!guardianForm.existingGuardianId) {
                setFormError('Please select an existing guardian to link to this student.');
                return;
            }
        }

        setSaving(true);
        setFormError(null);
        try {
            const formattedPhone = form.phone ? `${selectedCountry.dialCode} ${form.phone}`.trim() : undefined;
            const formattedGuardianPhone = guardianForm.phone ? `${guardianCountry.dialCode} ${guardianForm.phone}`.trim() : undefined;

            const res = await api<{ studentId: string; enrollmentNumber: string; credentials?: { name: string; email: string; password?: string } }>('/students', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    enrollmentNumber: form.enrollmentNumber?.trim() || undefined,
                    phone: formattedPhone,
                    countryCode: selectedCountry.dialCode,
                    batchId: form.batchId || undefined,
                    branchId: form.branchId || session?.selectedBranchId || undefined,
                    feeStatus: 'none',
                    feeAmount: undefined,
                    guardian: guardianForm.mode === 'existing' ? {
                        mode: 'existing',
                        guardianId: guardianForm.existingGuardianId,
                    } : {
                        mode: 'new',
                        firstName: guardianForm.firstName.trim(),
                        lastName: guardianForm.lastName.trim(),
                        relationship: guardianForm.relationship || 'Parent',
                        email: guardianForm.email.trim().toLowerCase(),
                        phone: formattedGuardianPhone,
                        countryCode: guardianCountry.dialCode,
                        createLogin: guardianForm.createLogin,
                    },
                }),
            });

            closeAddModal();
            reload();
            if (res?.credentials?.password) {
                setCreatedCredentials(res.credentials);
            }
            setActionBanner({ type: 'success', text: `Student ${form.firstName} ${form.lastName} registered successfully with guardian.` });
            setTimeout(() => setActionBanner(null), 6000);
        } catch (err) {
            setFormError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const parseExistingPhone = (rawPhone: string | null | undefined): { country: CountryOption; digits: string } => {
        if (!rawPhone) return { country: COUNTRIES[0], digits: '' };
        const trimmed = rawPhone.trim();
        for (const c of COUNTRIES) {
            if (trimmed.startsWith(c.dialCode)) {
                const rest = trimmed.slice(c.dialCode.length).replace(/\D/g, '');
                return { country: c, digits: rest.slice(0, c.digits) };
            }
        }
        const digits = trimmed.replace(/\D/g, '');
        return { country: COUNTRIES[0], digits: digits.slice(0, 10) };
    };

    const handleEditFieldChange = (key: keyof typeof editForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const val = e.target.value;
        setEditForm(f => ({ ...f, [key]: val }));
        if (editTouched[key]) {
            setEditFieldErrors(errs => ({ ...errs, [key]: validateField(key, val, editCountry) }));
        }
        if (editError) setEditError(null);
    };

    const handleEditBlur = (key: keyof typeof editForm) => () => {
        setEditTouched(t => ({ ...t, [key]: true }));
        setEditFieldErrors(errs => ({ ...errs, [key]: validateField(key, editForm[key], editCountry) }));
    };

    const handleEditPhoneChange = (digits: string, country: CountryOption) => {
        setEditForm(f => ({ ...f, phone: digits }));
        setEditCountry(country);
        if (editTouched.phone) {
            setEditFieldErrors(errs => ({ ...errs, phone: validatePhoneNumber(digits, country, true) }));
        }
        if (editError) setEditError(null);
    };

    const getEditInputStyle = (fieldName: string) => {
        const hasError = editTouched[fieldName] && Boolean(editFieldErrors[fieldName]);
        return {
            borderColor: hasError ? '#EF4444' : undefined,
            background: hasError ? '#FEF2F2' : undefined,
        };
    };

    const startEdit = (s: Student) => {
        const { country: parsedCountry, digits: parsedDigits } = parseExistingPhone(s.phone);
        setEditingStudent(s);
        setEditCountry(parsedCountry);
        setEditForm({
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email || '',
            phone: parsedDigits,
            status: s.status,
            enrollmentNumber: s.enrollmentNumber || '',
            courseId: '',
            batchId: '',
            branchId: s.branchId || workspace?.branches.find(b => b.isPrimary)?.branchId || '',
            feeStatus: s.feeStatus || 'none',
            feeAmount: '',
        });
        setEditFieldErrors({});
        setEditTouched({});
        setEditError(null);
    };

    const submitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;

        const allTouched = { firstName: true, lastName: true, email: true, phone: true };
        setEditTouched(allTouched);

        const errors: Record<string, string> = {
            firstName: validateField('firstName', editForm.firstName),
            lastName: validateField('lastName', editForm.lastName),
            email: validateField('email', editForm.email),
            phone: validateField('phone', editForm.phone, editCountry),
            enrollmentNumber: validateField('enrollmentNumber', editForm.enrollmentNumber),
        };

        const activeErrors = Object.fromEntries(Object.entries(errors).filter(([_, msg]) => Boolean(msg)));
        setEditFieldErrors(activeErrors);

        if (Object.keys(activeErrors).length > 0) {
            setEditError('Please correct the highlighted errors before saving.');
            return;
        }

        setEditSaving(true);
        setEditError(null);
        try {
            const formattedPhone = editForm.phone ? `${editCountry.dialCode} ${editForm.phone}`.trim() : undefined;
            await api('/students', {
                method: 'PUT',
                body: JSON.stringify({
                    studentId: editingStudent.studentId,
                    ...editForm,
                    enrollmentNumber: editForm.enrollmentNumber ? editForm.enrollmentNumber.trim() : undefined,
                    phone: formattedPhone,
                    batchId: editForm.batchId || undefined,
                    branchId: editForm.branchId || undefined,
                    feeStatus: editForm.feeStatus,
                    feeAmount: editForm.feeAmount || undefined,
                }),
            });
            setEditingStudent(null);
            reload();
        } catch (err) {
            setEditError((err as Error).message);
        } finally {
            setEditSaving(false);
        }
    };

    return (
        <>
            <Topbar title="Students" subtitle="Manage student profiles, enrollments, and status" />
            <div className="page-body" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>

                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', width: '100%', marginBottom: '16px' }}>
                    {stats.map(s => (
                        <div
                            key={s.label}
                            className="cs-card"
                            style={{
                                padding: '18px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                borderRadius: '16px',
                                border: '1px solid var(--cs-border)',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.06)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
                            }}
                        >
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                background: `linear-gradient(135deg, ${s.color}22 0%, ${s.color}0a 100%)`,
                                border: `1px solid ${s.color}35`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <s.icon size={20} color={s.color} />
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: 800,
                                    color: 'var(--cs-text-primary)',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    lineHeight: 1.1,
                                    letterSpacing: '-0.02em'
                                }}>
                                    {s.value}
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--cs-text-secondary)', marginTop: '3px' }}>
                                    {s.label} Students
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action Banner */}
                {actionBanner && (
                    <div style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        background: actionBanner.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                        color: actionBanner.type === 'success' ? '#065F46' : '#991B1B',
                        border: `1px solid ${actionBanner.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <span>{actionBanner.text}</span>
                        <button
                            type="button"
                            onClick={() => setActionBanner(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Table card */}
                <div className="cs-card" style={{
                    width: '100%',
                    overflow: 'hidden',
                    borderRadius: '16px',
                    border: '1px solid var(--cs-border)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                }}>
                    {/* Toolbar */}
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--cs-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: '1', minWidth: '300px' }}>
                            {/* Search Input */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'var(--cs-surface-2)',
                                border: '1px solid var(--cs-border)',
                                borderRadius: '10px',
                                padding: '0 12px',
                                height: '38px',
                                boxSizing: 'border-box',
                                width: '280px',
                                flexShrink: 0
                            }}>
                                <Search size={14} color="var(--cs-text-muted)" style={{ flexShrink: 0 }} />
                                <input
                                    placeholder="Search by name, ID or email..."
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        outline: 'none',
                                        padding: 0,
                                        height: '100%',
                                        fontSize: '13px',
                                        width: '100%',
                                        color: 'var(--cs-text-primary)'
                                    }}
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setOffset(0); }}
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => { setSearch(''); setOffset(0); }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--cs-text-muted)' }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Status filter pills */}
                            <div style={{
                                display: 'inline-flex',
                                background: 'var(--cs-surface-2)',
                                padding: '3px',
                                borderRadius: '10px',
                                border: '1px solid var(--cs-border)',
                                flexWrap: 'wrap',
                                gap: '2px'
                            }}>
                                {[
                                    { id: 'all', label: 'All', count: totalStudents },
                                    { id: 'active', label: 'Active', count: counts.active ?? 0 },
                                    { id: 'on-hold', label: 'On-Hold', count: counts['on-hold'] ?? 0 },
                                    { id: 'inquiry', label: 'Inquiry', count: counts.inquiry ?? 0 },
                                    { id: 'completed', label: 'Completed', count: counts.completed ?? 0 },
                                    { id: 'withdrawn', label: 'Withdrawn', count: counts.withdrawn ?? 0 },
                                ].map(s => {
                                    const isActive = statusFilter === s.id;
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => { setStatusFilter(s.id); setOffset(0); }}
                                            style={{
                                                border: 'none',
                                                background: isActive ? '#ffffff' : 'transparent',
                                                color: isActive ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                                fontWeight: isActive ? 700 : 500,
                                                fontSize: '12px',
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <span>{s.label}</span>
                                            {s.count !== undefined && (
                                                <span style={{
                                                    fontSize: '10.5px',
                                                    padding: '1px 5px',
                                                    borderRadius: '8px',
                                                    background: isActive ? 'rgba(108, 99, 255, 0.12)' : 'rgba(0,0,0,0.05)',
                                                    color: isActive ? 'var(--cs-primary)' : 'var(--cs-text-muted)',
                                                    fontWeight: 600
                                                }}>
                                                    {s.count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Add Student button */}
                        {can(session, 'students.write') && (
                            <button
                                className="btn-primary"
                                onClick={() => setShowAdd(true)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                    padding: '0 18px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    height: '38px',
                                    borderRadius: '10px',
                                    boxShadow: '0 2px 8px rgba(108, 99, 255, 0.28)'
                                }}
                            >
                                <Plus size={15} />
                                Add Student
                            </button>
                        )}
                    </div>

                    {!data ? <PageState error={error} /> : (
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                            <table className="cs-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--cs-surface-2)', borderBottom: '1px solid var(--cs-border)' }}>
                                        <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left', width: '22%' }}>Student</th>
                                        <th style={{ padding: '14px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left', width: '14%' }}>Branch</th>
                                        <th style={{ padding: '14px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left', width: '18%' }}>Batch</th>
                                        <th style={{ padding: '14px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left', width: '14%' }}>Guardian</th>
                                        <th style={{ padding: '14px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left', width: '11%' }}>Joined</th>
                                        <th style={{ padding: '14px 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'center', width: '8%' }}>Status</th>
                                        <th style={{ padding: '14px 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'center', width: '7%' }}>Fees</th>
                                        <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'right', width: '6%' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.students.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--cs-text-muted)' }}>
                                                <div style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                                                    No students found matching your search or filter.
                                                </div>
                                                {can(session, 'students.write') && (
                                                    <button
                                                        type="button"
                                                        className="btn-primary"
                                                        onClick={() => setShowAdd(true)}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                    >
                                                        <Plus size={14} /> Add First Student
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        data.students.map(s => {
                                            const name = `${s.firstName} ${s.lastName}`;
                                            return (
                                                <tr key={s.studentId} style={{ borderBottom: '1px solid var(--cs-border)', transition: 'background 0.15s ease' }}>
                                                    {/* Student Identity */}
                                                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            {s.photo ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={s.photo}
                                                                    alt={name}
                                                                    style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(108, 99, 255, 0.25)' }}
                                                                />
                                                            ) : (
                                                                <div style={{
                                                                    width: 38,
                                                                    height: 38,
                                                                    borderRadius: '50%',
                                                                    background: 'linear-gradient(135deg, #6C63FF 0%, #8B5CF6 100%)',
                                                                    color: '#ffffff',
                                                                    fontSize: '12px',
                                                                    fontWeight: 700,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    flexShrink: 0,
                                                                    boxShadow: '0 2px 4px rgba(108, 99, 255, 0.25)'
                                                                }}>
                                                                    {initials(name)}
                                                                </div>
                                                            )}
                                                            <div style={{ minWidth: 0 }}>
                                                                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--cs-text-primary)', letterSpacing: '-0.01em' }}>
                                                                    {name}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                                                                    <code style={{ fontSize: '11px', background: 'var(--cs-surface-2)', padding: '1px 5px', borderRadius: '4px', color: 'var(--cs-text-secondary)', fontWeight: 600, border: '1px solid var(--cs-border)' }}>
                                                                        {s.enrollmentNumber}
                                                                    </code>
                                                                    {s.phone && (
                                                                        <span style={{ fontSize: '11.5px', color: 'var(--cs-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                                            <Phone size={10} color="var(--cs-primary)" />
                                                                            <span>{s.phone}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Branch */}
                                                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                                                        <span style={{
                                                            fontSize: '12.5px',
                                                            color: 'var(--cs-text-secondary)',
                                                            fontWeight: 600,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}>
                                                            <MapPin size={11} color="var(--cs-primary)" />
                                                            {s.branchName ?? '—'}
                                                        </span>
                                                    </td>

                                                    {/* Batch */}
                                                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {!s.batches ? (
                                                                <span style={{ color: 'var(--cs-text-muted)', fontSize: '12px' }}>—</span>
                                                            ) : (
                                                                s.batches.split(', ').map(b => (
                                                                    <span
                                                                        key={b}
                                                                        style={{
                                                                            background: 'rgba(108, 99, 255, 0.08)',
                                                                            color: 'var(--cs-primary)',
                                                                            border: '1px solid rgba(108, 99, 255, 0.22)',
                                                                            padding: '3px 8px',
                                                                            borderRadius: '6px',
                                                                            fontSize: '11.5px',
                                                                            fontWeight: 600,
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px'
                                                                        }}
                                                                    >
                                                                        <CalendarIcon size={11} /> {b}
                                                                    </span>
                                                                ))
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Guardian */}
                                                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                                                        <span style={{
                                                            fontSize: '12.5px',
                                                            fontWeight: 600,
                                                            color: s.guardianName ? 'var(--cs-text-primary)' : 'var(--cs-text-muted)'
                                                        }}>
                                                            {s.guardianName ?? '—'}
                                                        </span>
                                                    </td>

                                                    {/* Joined */}
                                                    <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                                                            {formatDate(s.createdAt)}
                                                        </span>
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td style={{ padding: '14px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            padding: '3px 9px',
                                                            borderRadius: '20px',
                                                            background: s.status === 'active' ? '#ECFDF5' : s.status === 'on-hold' ? '#FFFBEB' : s.status === 'inquiry' ? '#EFF6FF' : '#FEF2F2',
                                                            color: s.status === 'active' ? '#059669' : s.status === 'on-hold' ? '#D97706' : s.status === 'inquiry' ? '#2563EB' : '#DC2626',
                                                            border: `1px solid ${s.status === 'active' ? '#A7F3D0' : s.status === 'on-hold' ? '#FDE68A' : s.status === 'inquiry' ? '#BFDBFE' : '#FECACA'}`,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}>
                                                            <span style={{
                                                                width: 6,
                                                                height: 6,
                                                                borderRadius: '50%',
                                                                background: s.status === 'active' ? '#10B981' : s.status === 'on-hold' ? '#F59E0B' : s.status === 'inquiry' ? '#3B82F6' : '#EF4444'
                                                            }} />
                                                            {statusConfig[s.status]?.label ?? s.status}
                                                        </span>
                                                    </td>

                                                    {/* Fees Badge */}
                                                    <td style={{ padding: '14px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                        {s.feeStatus === 'paid' ? (
                                                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                                                                Paid
                                                            </span>
                                                        ) : s.feeStatus === 'pending' ? (
                                                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>
                                                                Pending
                                                            </span>
                                                        ) : s.feeStatus === 'overdue' ? (
                                                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                                                                Overdue
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '6px', background: 'var(--cs-surface-2)', color: 'var(--cs-text-muted)', border: '1px solid var(--cs-border)' }}>
                                                                —
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Action */}
                                                    <td style={{ padding: '14px 18px', textAlign: 'right', verticalAlign: 'middle' }}>
                                                        {can(session, 'students.write') && (
                                                            <button
                                                                type="button"
                                                                onClick={() => startEdit(s)}
                                                                title={`Edit ${name}`}
                                                                style={{
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    padding: 0,
                                                                    borderRadius: '8px',
                                                                    cursor: 'pointer',
                                                                    color: 'var(--cs-primary)',
                                                                    background: 'rgba(108, 99, 255, 0.08)',
                                                                    border: '1px solid rgba(108, 99, 255, 0.25)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108, 99, 255, 0.2)')}
                                                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(108, 99, 255, 0.08)')}
                                                                aria-label={`Edit ${name}`}
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {data && (
                        <div style={{
                            padding: '14px 20px',
                            borderTop: '1px solid var(--cs-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            background: 'var(--cs-surface-1)'
                        }}>
                            <span style={{ fontSize: '12.5px', color: 'var(--cs-text-secondary)', fontWeight: 500 }}>
                                Showing <strong style={{ color: 'var(--cs-text-primary)' }}>{data.total === 0 ? 0 : offset + 1}–{Math.min(offset + data.students.length, data.total)}</strong> of <strong style={{ color: 'var(--cs-text-primary)' }}>{data.total}</strong> students ({PAGE_SIZE} per page)
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid var(--cs-border)',
                                        borderRadius: '8px',
                                        cursor: offset === 0 ? 'not-allowed' : 'pointer',
                                        opacity: offset === 0 ? 0.4 : 1,
                                        background: 'var(--cs-surface-2)',
                                        color: 'var(--cs-text-primary)',
                                        transition: 'all 0.15s ease'
                                    }}
                                    disabled={offset === 0}
                                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                                >
                                    <ChevronLeft size={14} /> Previous
                                </button>

                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    {getVisiblePages(currentPage, totalPages).map((p, idx) => {
                                        if (p === '...') {
                                            return <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--cs-text-muted)', fontSize: '12px' }}>...</span>;
                                        }
                                        const pageNum = Number(p);
                                        const isCurrent = pageNum === currentPage;
                                        return (
                                            <button
                                                key={pageNum}
                                                type="button"
                                                onClick={() => setOffset((pageNum - 1) * PAGE_SIZE)}
                                                style={{
                                                    minWidth: '32px',
                                                    height: '32px',
                                                    padding: '0 8px',
                                                    fontSize: '12.5px',
                                                    fontWeight: isCurrent ? 700 : 500,
                                                    borderRadius: '8px',
                                                    border: isCurrent ? '1px solid var(--cs-primary)' : '1px solid var(--cs-border)',
                                                    background: isCurrent ? 'var(--cs-primary)' : 'var(--cs-surface-2)',
                                                    color: isCurrent ? '#ffffff' : 'var(--cs-text-primary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    boxShadow: isCurrent ? '0 2px 6px rgba(108, 99, 255, 0.25)' : 'none'
                                                }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    className="btn-ghost"
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid var(--cs-border)',
                                        borderRadius: '8px',
                                        cursor: offset + PAGE_SIZE >= data.total ? 'not-allowed' : 'pointer',
                                        opacity: offset + PAGE_SIZE >= data.total ? 0.4 : 1,
                                        background: 'var(--cs-surface-2)',
                                        color: 'var(--cs-text-primary)',
                                        transition: 'all 0.15s ease'
                                    }}
                                    disabled={offset + PAGE_SIZE >= data.total}
                                    onClick={() => setOffset(offset + PAGE_SIZE)}
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Student Modal (2-Step Registration) */}
            {showAdd && (
                <Modal title="Add Student" onClose={closeAddModal} maxWidth="660px" style={{ padding: '18px 24px' }}>
                    {/* 2-Step Progress Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '4px 12px', borderRadius: '16px',
                            background: step === 1 ? '#EEF2FF' : '#ECFDF5',
                            color: step === 1 ? '#4F46E5' : '#059669',
                            fontSize: '12px', fontWeight: 600,
                            border: step === 1 ? '1px solid #C7D2FE' : '1px solid #A7F3D0'
                        }}>
                            <span style={{
                                width: 18, height: 18, borderRadius: '50%',
                                background: step > 1 ? '#059669' : '#4F46E5',
                                color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px'
                            }}>
                                {step > 1 ? '✓' : '1'}
                            </span>
                            Step 1: Student Details
                        </div>

                        <div style={{ width: 24, height: 2, background: step > 1 ? '#059669' : '#E2E8F0' }} />

                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '4px 12px', borderRadius: '16px',
                            background: step === 2 ? '#EEF2FF' : '#F1F5F9',
                            color: step === 2 ? '#4F46E5' : '#64748B',
                            fontSize: '12px', fontWeight: 600,
                            border: step === 2 ? '1px solid #C7D2FE' : '1px solid transparent'
                        }}>
                            <span style={{
                                width: 18, height: 18, borderRadius: '50%',
                                background: step === 2 ? '#4F46E5' : '#94A3B8',
                                color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px'
                            }}>
                                2
                            </span>
                            Step 2: Guardian Registration
                        </div>
                    </div>

                    <form onSubmit={step === 1 ? handleNextStep : submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                        {step === 1 ? (
                            <>
                                {/* Student Photo Upload */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                    <div style={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: '#FFFFFF', border: '2px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {photoPreview ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={photoPreview} alt="Student preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                                                <Camera size={18} />
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <label
                                                className="btn-secondary"
                                                style={{
                                                    height: '28px',
                                                    padding: '0 10px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                }}
                                            >
                                                <Upload size={12} /> {photoPreview ? 'Change Photo' : 'Upload Photo'}
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/webp"
                                                    style={{ display: 'none' }}
                                                    onChange={handlePhotoSelect}
                                                />
                                            </label>
                                            {photoPreview && (
                                                <button
                                                    type="button"
                                                    className="btn-ghost"
                                                    onClick={handleRemovePhoto}
                                                    style={{ height: '28px', padding: '0 6px', fontSize: '11px', color: '#EF4444' }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        {photoError ? (
                                            <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 500 }}>{photoError}</span>
                                        ) : (
                                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                                                Student photo (PNG, JPG, WebP up to 2 MB)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label className="cs-label">First Name <span style={{ color: '#EF4444' }}>*</span></label>
                                        <input
                                            className="cs-input"
                                            placeholder="First name"
                                            value={form.firstName}
                                            onChange={handleFieldChange('firstName')}
                                            onBlur={handleBlur('firstName')}
                                            style={getInputStyle('firstName')}
                                        />
                                        {touched.firstName && fieldErrors.firstName && (
                                            <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                                                {fieldErrors.firstName}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="cs-label">Last Name <span style={{ color: '#EF4444' }}>*</span></label>
                                        <input
                                            className="cs-input"
                                            placeholder="Last name"
                                            value={form.lastName}
                                            onChange={handleFieldChange('lastName')}
                                            onBlur={handleBlur('lastName')}
                                            style={getInputStyle('lastName')}
                                        />
                                        {touched.lastName && fieldErrors.lastName && (
                                            <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                                                {fieldErrors.lastName}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label className="cs-label">
                                            Student ID <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>(e.g. STUD-01)</span>
                                        </label>
                                        <input
                                            className="cs-input"
                                            placeholder="e.g. STUD-01"
                                            value={form.enrollmentNumber}
                                            onChange={e => {
                                                const val = e.target.value.toUpperCase();
                                                setForm(f => ({ ...f, enrollmentNumber: val }));
                                                if (touched.enrollmentNumber) {
                                                    setFieldErrors(errs => ({ ...errs, enrollmentNumber: validateField('enrollmentNumber', val) }));
                                                }
                                            }}
                                            onBlur={handleBlur('enrollmentNumber')}
                                            style={getInputStyle('enrollmentNumber')}
                                        />
                                        {touched.enrollmentNumber && fieldErrors.enrollmentNumber ? (
                                            <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                                                {fieldErrors.enrollmentNumber}
                                            </p>
                                        ) : (
                                            <p style={{ color: '#94A3B8', fontSize: '11px', marginTop: '2px' }}>
                                                Auto-assigned if left blank
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="cs-label">Email <span style={{ color: '#EF4444' }}>*</span></label>
                                        <input
                                            className="cs-input"
                                            type="email"
                                            placeholder="student@example.com"
                                            value={form.email}
                                            onChange={handleFieldChange('email')}
                                            onBlur={handleBlur('email')}
                                            style={getInputStyle('email')}
                                        />
                                        {touched.email && fieldErrors.email && (
                                            <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                                                {fieldErrors.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label className="cs-label">Mobile Number <span style={{ color: '#EF4444' }}>*</span></label>
                                        <CountryPhoneInput
                                            value={form.phone}
                                            selectedCountry={selectedCountry}
                                            onCountryChange={setSelectedCountry}
                                            onChange={handlePhoneChange}
                                            onBlur={handleBlur('phone')}
                                            touched={touched.phone}
                                            error={fieldErrors.phone}
                                            required={true}
                                        />
                                    </div>
                                    <div>
                                        <label className="cs-label">Date of Birth</label>
                                        <input
                                            className="cs-input"
                                            type="date"
                                            max={new Date().toISOString().split('T')[0]}
                                            value={form.dateOfBirth}
                                            onChange={handleFieldChange('dateOfBirth')}
                                            onBlur={handleBlur('dateOfBirth')}
                                            style={getInputStyle('dateOfBirth')}
                                        />
                                        {touched.dateOfBirth && fieldErrors.dateOfBirth && (
                                            <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                                                {fieldErrors.dateOfBirth}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {!branchScoped && (workspace?.branches.length ?? 0) > 1 && (
                                    <div>
                                        <label className="cs-label">Home Branch</label>
                                        <select
                                            className="cs-input"
                                            value={form.branchId || session?.selectedBranchId || workspace?.branches.find(b => b.isPrimary)?.branchId || ''}
                                            onChange={e => setForm(f => ({ ...f, branchId: e.target.value, courseId: '', batchId: '' }))}
                                        >
                                            {workspace?.branches.map(b => (
                                                <option key={b.branchId} value={b.branchId}>
                                                    {b.name}{b.isPrimary ? ' (Primary)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="cs-label">Select Course (optional)</label>
                                    <select
                                        className="cs-input"
                                        value={form.courseId}
                                        onChange={e => {
                                            const cId = e.target.value;
                                            setForm(f => ({
                                                ...f,
                                                courseId: cId,
                                                batchId: '',
                                            }));
                                        }}
                                    >
                                        {(() => {
                                            const activeBranch = form.branchId || session?.selectedBranchId || workspace?.branches.find(br => br.isPrimary)?.branchId;
                                            const branchCourses = courses?.filter(c => !activeBranch || !c.branchId || c.branchId === activeBranch) || [];
                                            const placeholder = !courses
                                                ? 'Loading courses…'
                                                : branchCourses.length > 0
                                                    ? '— Select a course (optional) —'
                                                    : '— No courses available —';
                                            return (
                                                <>
                                                    <option value="">{placeholder}</option>
                                                    {branchCourses.map(c => (
                                                        <option key={c.courseId} value={c.courseId}>
                                                            {c.title} {c.code ? `(${c.code})` : ''}
                                                        </option>
                                                    ))}
                                                </>
                                            );
                                        })()}
                                    </select>
                                </div>
                                <div>
                                    <label className="cs-label">Enroll in Batch (optional)</label>
                                    <select
                                        className="cs-input"
                                        value={form.batchId}
                                        onChange={e => {
                                            const bId = e.target.value;
                                            const selected = batches?.find(b => b.batchId === bId);
                                            const matchingCourse = selected?.courseId
                                                ? courses?.find(c => c.courseId === selected.courseId)
                                                : selected?.courseTitle
                                                    ? courses?.find(c => c.title.toLowerCase() === selected.courseTitle?.toLowerCase())
                                                    : null;
                                            setForm(f => ({
                                                ...f,
                                                batchId: bId,
                                                courseId: matchingCourse ? matchingCourse.courseId : f.courseId,
                                            }));
                                        }}
                                    >
                                        {(() => {
                                            const activeBranch = form.branchId || session?.selectedBranchId || workspace?.branches.find(br => br.isPrimary)?.branchId;
                                            const selectedCourseObj = courses?.find(c => c.courseId === form.courseId);
                                            const filteredBatches = (batches || []).filter(b => {
                                                const matchesBranch = !activeBranch || !b.branchId || b.branchId === activeBranch;
                                                if (!matchesBranch) return false;
                                                if (!form.courseId) return true;
                                                return (
                                                    b.courseId === form.courseId ||
                                                    (selectedCourseObj && b.courseTitle && b.courseTitle.toLowerCase() === selectedCourseObj.title.toLowerCase())
                                                );
                                            });
                                            const placeholder = !batches
                                                ? 'Loading batches…'
                                                : filteredBatches.length > 0
                                                    ? '— Select a batch (optional) —'
                                                    : form.courseId
                                                        ? '— No batches available for selected course —'
                                                        : '— No batches available for this branch —';
                                            return (
                                                <>
                                                    <option value="">{placeholder}</option>
                                                    {filteredBatches.map(b => (
                                                        <option key={b.batchId} value={b.batchId}>
                                                            {b.name} {b.courseTitle ? `(${b.courseTitle})` : ''}
                                                        </option>
                                                    ))}
                                                </>
                                            );
                                        })()}
                                    </select>
                                </div>
                                {formError && (
                                    <div style={{
                                        color: '#B91C1C',
                                        background: '#FEF2F2',
                                        border: '1px solid #FECACA',
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                    }}>
                                        {formError}
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={closeAddModal}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={handleNextStep}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        Next: Guardian Details <ArrowRight size={14} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Mode Selector: New Guardian vs Existing Guardian */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGuardianForm(g => ({ ...g, mode: 'new' }));
                                            if (formError) setFormError(null);
                                        }}
                                        style={{
                                            padding: '6px 14px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            borderRadius: '6px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            background: guardianForm.mode === 'new' ? '#4F46E5' : '#F1F5F9',
                                            color: guardianForm.mode === 'new' ? '#FFFFFF' : '#64748B',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <UserPlus size={13} /> Add New Guardian
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGuardianForm(g => ({ ...g, mode: 'existing' }));
                                            if (formError) setFormError(null);
                                        }}
                                        style={{
                                            padding: '6px 14px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            borderRadius: '6px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            background: guardianForm.mode === 'existing' ? '#4F46E5' : '#F1F5F9',
                                            color: guardianForm.mode === 'existing' ? '#FFFFFF' : '#64748B',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <Users size={13} /> Link Existing Guardian
                                    </button>
                                </div>

                                {guardianForm.mode === 'new' ? (
                                    <>
                                        <div>
                                            <label className="cs-label">Relationship to Student</label>
                                            <select
                                                className="cs-input"
                                                value={guardianForm.relationship}
                                                onChange={e => setGuardianForm(g => ({ ...g, relationship: e.target.value }))}
                                            >
                                                <option value="Mother">Mother</option>
                                                <option value="Father">Father</option>
                                                <option value="Parent">Parent</option>
                                                <option value="Guardian">Legal Guardian</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label className="cs-label">Guardian First Name <span style={{ color: '#EF4444' }}>*</span></label>
                                                <input
                                                    className="cs-input"
                                                    placeholder="First name"
                                                    value={guardianForm.firstName}
                                                    onChange={handleGuardianFieldChange('firstName')}
                                                    onBlur={handleGuardianBlur('firstName')}
                                                    style={getGuardianInputStyle('firstName')}
                                                />
                                                {guardianTouched.firstName && guardianFieldErrors.firstName && (
                                                    <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                                                        {guardianFieldErrors.firstName}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="cs-label">Guardian Last Name <span style={{ color: '#EF4444' }}>*</span></label>
                                                <input
                                                    className="cs-input"
                                                    placeholder="Last name"
                                                    value={guardianForm.lastName}
                                                    onChange={handleGuardianFieldChange('lastName')}
                                                    onBlur={handleGuardianBlur('lastName')}
                                                    style={getGuardianInputStyle('lastName')}
                                                />
                                                {guardianTouched.lastName && guardianFieldErrors.lastName && (
                                                    <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                                                        {guardianFieldErrors.lastName}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="cs-label">Guardian Email <span style={{ color: '#EF4444' }}>*</span></label>
                                            <input
                                                className="cs-input"
                                                type="email"
                                                placeholder="parent@example.com"
                                                value={guardianForm.email}
                                                onChange={handleGuardianFieldChange('email')}
                                                onBlur={handleGuardianBlur('email')}
                                                style={getGuardianInputStyle('email')}
                                            />
                                            {guardianTouched.email && guardianFieldErrors.email && (
                                                <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                                                    {guardianFieldErrors.email}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <label className="cs-label" style={{ margin: 0 }}>
                                                    Guardian Mobile Number <span style={{ color: '#EF4444' }}>*</span>
                                                </label>
                                                {guardianVerifiedPhone && guardianVerifiedPhone === guardianForm.phone.replace(/\D/g, '') && (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        color: '#059669',
                                                        background: '#ECFDF5',
                                                        border: '1px solid #A7F3D0',
                                                        padding: '1px 8px',
                                                        borderRadius: '12px'
                                                    }}>
                                                        <Check size={12} /> Verified
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <CountryPhoneInput
                                                        value={guardianForm.phone}
                                                        selectedCountry={guardianCountry}
                                                        onCountryChange={setGuardianCountry}
                                                        onChange={handleGuardianPhoneChange}
                                                        onBlur={handleGuardianBlur('phone')}
                                                        touched={guardianTouched.phone}
                                                        error={guardianFieldErrors.phone}
                                                        required={true}
                                                    />
                                                </div>
                                                {guardianVerifiedPhone && guardianVerifiedPhone === guardianForm.phone.replace(/\D/g, '') ? (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        style={{
                                                            height: '38px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '0 12px',
                                                            background: '#ECFDF5',
                                                            color: '#059669',
                                                            border: '1px solid #A7F3D0',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            whiteSpace: 'nowrap',
                                                            flexShrink: 0,
                                                            cursor: 'default'
                                                        }}
                                                    >
                                                        <Check size={14} /> Verified
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        onClick={sendGuardianOtp}
                                                        disabled={guardianResendIn > 0 || !guardianForm.phone.trim()}
                                                        style={{
                                                            height: '38px',
                                                            whiteSpace: 'nowrap',
                                                            fontSize: '12px',
                                                            padding: '0 12px',
                                                            flexShrink: 0,
                                                            cursor: guardianResendIn > 0 || !guardianForm.phone.trim() ? 'not-allowed' : 'pointer',
                                                            color: '#4F46E5',
                                                            borderColor: '#C7D2FE',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {guardianResendIn > 0 ? `Resend in ${guardianResendIn}s` : guardianOtp ? 'Resend OTP' : 'Send OTP'}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Guardian OTP Verification Card */}
                                            {guardianOtp && (!guardianVerifiedPhone || guardianVerifiedPhone !== guardianForm.phone.replace(/\D/g, '')) && (
                                                <div style={{
                                                    marginTop: '8px',
                                                    padding: '10px 12px',
                                                    border: '1px solid #C7D2FE',
                                                    background: '#EEF2FF',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px'
                                                }}>
                                                    <p style={{ fontSize: '12px', color: '#4338CA', margin: 0, lineHeight: 1.4 }}>
                                                        <strong>Demo mode:</strong> no SMS is sent. Your OTP is{' '}
                                                        <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, letterSpacing: '0.15em', background: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #C7D2FE' }}>
                                                            {guardianOtp.code}
                                                        </span>
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <input
                                                            className="cs-input"
                                                            inputMode="numeric"
                                                            autoComplete="one-time-code"
                                                            maxLength={6}
                                                            placeholder="Enter 6-digit OTP"
                                                            value={guardianOtpInput}
                                                            onChange={e => {
                                                                setGuardianOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                                                                setGuardianOtpError(null);
                                                            }}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    verifyGuardianOtp();
                                                                }
                                                            }}
                                                            style={{ flex: 1, minWidth: 0, letterSpacing: '0.2em', background: '#FFFFFF', height: '36px', fontSize: '13px' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="btn-primary"
                                                            onClick={verifyGuardianOtp}
                                                            disabled={guardianOtpInput.length !== 6}
                                                            style={{ justifyContent: 'center', minWidth: '85px', height: '36px', fontSize: '12px', flexShrink: 0 }}
                                                        >
                                                            Verify
                                                        </button>
                                                    </div>
                                                    {guardianOtpError && (
                                                        <p style={{ color: '#EF4444', fontSize: '11px', margin: 0, fontWeight: 500 }}>
                                                            {guardianOtpError}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '2px' }}>
                                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={guardianForm.createLogin}
                                                    onChange={e => setGuardianForm(g => ({ ...g, createLogin: e.target.checked }))}
                                                    style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#4F46E5' }}
                                                />
                                                <div>
                                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>
                                                        Create Parent Portal Login
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                                                        Generates portal sign-in credentials so the parent can track attendance, dues, and notices.
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div>
                                            <label className="cs-label">Select Existing Guardian <span style={{ color: '#EF4444' }}>*</span></label>
                                            <select
                                                className="cs-input"
                                                value={guardianForm.existingGuardianId}
                                                onChange={e => {
                                                    setGuardianForm(g => ({ ...g, existingGuardianId: e.target.value }));
                                                    if (formError) setFormError(null);
                                                }}
                                            >
                                                <option value="">— Select an existing guardian —</option>
                                                {rawGuardians && rawGuardians.length > 0 ? (
                                                    rawGuardians.map(g => (
                                                        <option key={g.guardianId} value={g.guardianId}>
                                                            {g.firstName} {g.lastName} ({g.relationship || 'Parent'}) • {g.phone}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value="" disabled>No existing guardians found</option>
                                                )}
                                            </select>
                                        </div>

                                        {guardianForm.existingGuardianId && (() => {
                                            const selected = rawGuardians?.find(g => g.guardianId === guardianForm.existingGuardianId);
                                            if (!selected) return null;
                                            return (
                                                <div style={{ padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px' }}>
                                                    <div style={{ fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>
                                                        {selected.firstName} {selected.lastName} ({selected.relationship || 'Parent'})
                                                    </div>
                                                    <div style={{ color: '#64748B', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                        <span>Phone: <strong style={{ color: '#334155' }}>{selected.phone}</strong></span>
                                                        <span>Email: <strong style={{ color: '#334155' }}>{selected.email}</strong></span>
                                                        {selected.householdCode && <span>Household: <strong style={{ color: '#334155' }}>{selected.householdCode}</strong></span>}
                                                    </div>
                                                    <div style={{ marginTop: '8px', color: '#059669', fontWeight: 600, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Check size={12} /> This student will be linked to this guardian as their primary ward.
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {formError && (
                                    <div style={{
                                        color: '#B91C1C',
                                        background: '#FEF2F2',
                                        border: '1px solid #FECACA',
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                    }}>
                                        {formError}
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={handlePreviousStep}
                                        disabled={saving}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <ArrowLeft size={14} /> Back
                                    </button>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={closeAddModal}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="btn-primary"
                                            type="submit"
                                            disabled={saving}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            {saving ? 'Registering…' : 'Complete Registration'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </form>
                </Modal>
            )}

            {/* Edit Student Modal */}
            {editingStudent && (
                <Modal title={`Edit Student: ${editingStudent.firstName} ${editingStudent.lastName}`} onClose={() => setEditingStudent(null)} maxWidth="660px" style={{ padding: '20px 24px' }}>
                    <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">First Name <span style={{ color: '#EF4444' }}>*</span></label>
                                <input
                                    className="cs-input"
                                    placeholder="First name"
                                    value={editForm.firstName}
                                    onChange={handleEditFieldChange('firstName')}
                                    onBlur={handleEditBlur('firstName')}
                                    style={getEditInputStyle('firstName')}
                                />
                                {editTouched.firstName && editFieldErrors.firstName && (
                                    <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                                        {editFieldErrors.firstName}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="cs-label">Last Name <span style={{ color: '#EF4444' }}>*</span></label>
                                <input
                                    className="cs-input"
                                    placeholder="Last name"
                                    value={editForm.lastName}
                                    onChange={handleEditFieldChange('lastName')}
                                    onBlur={handleEditBlur('lastName')}
                                    style={getEditInputStyle('lastName')}
                                />
                                {editTouched.lastName && editFieldErrors.lastName && (
                                    <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                                        {editFieldErrors.lastName}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Email <span style={{ color: '#EF4444' }}>*</span></label>
                                <input
                                    className="cs-input"
                                    type="email"
                                    placeholder="student@example.com"
                                    value={editForm.email}
                                    onChange={handleEditFieldChange('email')}
                                    onBlur={handleEditBlur('email')}
                                    style={getEditInputStyle('email')}
                                />
                                {editTouched.email && editFieldErrors.email && (
                                    <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                                        {editFieldErrors.email}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="cs-label">Phone <span style={{ color: '#EF4444' }}>*</span></label>
                                <CountryPhoneInput
                                    value={editForm.phone}
                                    selectedCountry={editCountry}
                                    onCountryChange={setEditCountry}
                                    onChange={handleEditPhoneChange}
                                    onBlur={handleEditBlur('phone')}
                                    touched={editTouched.phone}
                                    error={editFieldErrors.phone}
                                    required={true}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">
                                    Student ID <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>(e.g. STUD-01)</span>
                                </label>
                                <input
                                    className="cs-input"
                                    value={editForm.enrollmentNumber}
                                    placeholder="e.g. STUD-01"
                                    onChange={e => {
                                        const val = e.target.value.toUpperCase();
                                        setEditForm(f => ({ ...f, enrollmentNumber: val }));
                                        if (editTouched.enrollmentNumber) {
                                            setEditFieldErrors(errs => ({ ...errs, enrollmentNumber: validateField('enrollmentNumber', val) }));
                                        }
                                    }}
                                    onBlur={handleEditBlur('enrollmentNumber')}
                                    style={getEditInputStyle('enrollmentNumber')}
                                />
                                {editTouched.enrollmentNumber && editFieldErrors.enrollmentNumber && (
                                    <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                                        {editFieldErrors.enrollmentNumber}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="cs-label">Status</label>
                                <select className="cs-input" value={editForm.status} onChange={handleEditFieldChange('status')}>
                                    <option value="active">Active</option>
                                    <option value="on-hold">On-Hold</option>
                                    <option value="inquiry">Inquiry</option>
                                    <option value="completed">Completed</option>
                                    <option value="withdrawn">Withdrawn</option>
                                </select>
                            </div>
                        </div>

                        {!branchScoped && (workspace?.branches.length ?? 0) > 1 ? (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label className="cs-label">Branch</label>
                                        <select
                                            className="cs-input"
                                            value={editForm.branchId}
                                            onChange={e => {
                                                const newBranchId = e.target.value;
                                                setEditForm(f => ({
                                                    ...f,
                                                    branchId: newBranchId,
                                                    batchId: '', // Reset batch selection when switching branch
                                                }));
                                            }}
                                        >
                                            {workspace?.branches.map(b => (
                                                <option key={b.branchId} value={b.branchId}>
                                                    {b.name}{b.isPrimary ? ' (Primary)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="cs-label">Course (optional)</label>
                                        <select
                                            className="cs-input"
                                            value={editForm.courseId}
                                            onChange={e => {
                                                const newCourseId = e.target.value;
                                                const selectedCourse = courses?.find(c => c.courseId === newCourseId);
                                                const currentBatch = batches?.find(b => b.batchId === editForm.batchId);
                                                const shouldResetBatch = editForm.batchId && newCourseId && currentBatch?.courseId && currentBatch.courseId !== newCourseId;
                                                setEditForm(f => ({
                                                    ...f,
                                                    courseId: newCourseId,
                                                    batchId: shouldResetBatch ? '' : f.batchId,
                                                    feeAmount: selectedCourse && selectedCourse.tuitionAmount && !f.feeAmount ? String(selectedCourse.tuitionAmount) : f.feeAmount,
                                                    feeStatus: selectedCourse && f.feeStatus === 'none' ? 'pending' : f.feeStatus,
                                                }));
                                            }}
                                        >
                                            <option value="">{courses ? '— All Courses / Any —' : 'Loading courses…'}</option>
                                            {courses?.map(c => (
                                                <option key={c.courseId} value={c.courseId}>
                                                    {c.title} ({c.code}){c.tuitionAmount ? ` — ₹${Number(c.tuitionAmount).toLocaleString('en-IN')}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="cs-label">Change / Assign Batch</label>
                                    <select
                                        className="cs-input"
                                        value={editForm.batchId}
                                        onChange={e => {
                                            const bId = e.target.value;
                                            const selected = batches?.find(b => b.batchId === bId);
                                            setEditForm(f => ({
                                                ...f,
                                                batchId: bId,
                                                courseId: selected?.courseId || f.courseId,
                                                feeAmount: selected && selected.tuitionAmount ? String(selected.tuitionAmount) : f.feeAmount,
                                                feeStatus: selected && f.feeStatus === 'none' ? 'pending' : f.feeStatus
                                            }));
                                        }}
                                    >
                                        {(() => {
                                            const editBatches = batches?.filter(b => (!editForm.branchId || !b.branchId || b.branchId === editForm.branchId) && (!editForm.courseId || b.courseId === editForm.courseId)) || [];
                                            const editPlaceholder = !batches
                                                ? 'Loading batches…'
                                                : editBatches.length > 0
                                                    ? '— Keep existing batch or unassigned —'
                                                    : editForm.courseId
                                                        ? '— No batches available for this course —'
                                                        : '— No batches available for this branch —';
                                            return (
                                                <>
                                                    <option value="">{editPlaceholder}</option>
                                                    {editBatches.map(b => (
                                                        <option key={b.batchId} value={b.batchId}>
                                                            {b.name} {b.courseTitle ? `(${b.courseTitle})` : ''} {b.tuitionAmount ? `— ₹${Number(b.tuitionAmount).toLocaleString('en-IN')}` : ''}
                                                        </option>
                                                    ))}
                                                </>
                                            );
                                        })()}
                                    </select>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label className="cs-label">Course (optional)</label>
                                    <select
                                        className="cs-input"
                                        value={editForm.courseId}
                                        onChange={e => {
                                            const newCourseId = e.target.value;
                                            const selectedCourse = courses?.find(c => c.courseId === newCourseId);
                                            const currentBatch = batches?.find(b => b.batchId === editForm.batchId);
                                            const shouldResetBatch = editForm.batchId && newCourseId && currentBatch?.courseId && currentBatch.courseId !== newCourseId;
                                            setEditForm(f => ({
                                                ...f,
                                                courseId: newCourseId,
                                                batchId: shouldResetBatch ? '' : f.batchId,
                                                feeAmount: selectedCourse && selectedCourse.tuitionAmount && !f.feeAmount ? String(selectedCourse.tuitionAmount) : f.feeAmount,
                                                feeStatus: selectedCourse && f.feeStatus === 'none' ? 'pending' : f.feeStatus,
                                            }));
                                        }}
                                    >
                                        <option value="">{courses ? '— All Courses / Any —' : 'Loading courses…'}</option>
                                        {courses?.map(c => (
                                            <option key={c.courseId} value={c.courseId}>
                                                {c.title} ({c.code}){c.tuitionAmount ? ` — ₹${Number(c.tuitionAmount).toLocaleString('en-IN')}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="cs-label">Change / Assign Batch</label>
                                    <select
                                        className="cs-input"
                                        value={editForm.batchId}
                                        onChange={e => {
                                            const bId = e.target.value;
                                            const selected = batches?.find(b => b.batchId === bId);
                                            setEditForm(f => ({
                                                ...f,
                                                batchId: bId,
                                                courseId: selected?.courseId || f.courseId,
                                                feeAmount: selected && selected.tuitionAmount ? String(selected.tuitionAmount) : f.feeAmount,
                                                feeStatus: selected && f.feeStatus === 'none' ? 'pending' : f.feeStatus
                                            }));
                                        }}
                                    >
                                        {(() => {
                                            const editBatches = batches?.filter(b => (!editForm.branchId || !b.branchId || b.branchId === editForm.branchId) && (!editForm.courseId || b.courseId === editForm.courseId)) || [];
                                            const editPlaceholder = !batches
                                                ? 'Loading batches…'
                                                : editBatches.length > 0
                                                    ? '— Keep existing batch or unassigned —'
                                                    : editForm.courseId
                                                        ? '— No batches available for this course —'
                                                        : '— No batches available for this branch —';
                                            return (
                                                <>
                                                    <option value="">{editPlaceholder}</option>
                                                    {editBatches.map(b => (
                                                        <option key={b.batchId} value={b.batchId}>
                                                            {b.name} {b.courseTitle ? `(${b.courseTitle})` : ''} {b.tuitionAmount ? `— ₹${Number(b.tuitionAmount).toLocaleString('en-IN')}` : ''}
                                                        </option>
                                                    ))}
                                                </>
                                            );
                                        })()}
                                    </select>
                                </div>
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Fee Status</label>
                                <select
                                    className="cs-input"
                                    value={editForm.feeStatus}
                                    onChange={e => {
                                        const status = e.target.value;
                                        setEditForm(f => ({
                                            ...f,
                                            feeStatus: status,
                                            feeAmount: status === 'none' ? '' : f.feeAmount
                                        }));
                                    }}
                                >
                                    <option value="none">— No Fee (Exempt) —</option>
                                    <option value="pending">Pending (Fee Due)</option>
                                    <option value="paid">Paid (Fully Paid)</option>
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">
                                    Fee / Tuition Amount {editForm.feeStatus !== 'none' && <span style={{ color: '#EF4444' }}>*</span>}
                                </label>
                                <input
                                    className="cs-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder={editForm.feeStatus === 'none' ? '—' : 'e.g. 5000'}
                                    disabled={editForm.feeStatus === 'none'}
                                    value={editForm.feeAmount}
                                    onChange={e => setEditForm({ ...editForm, feeAmount: e.target.value })}
                                    style={{
                                        opacity: editForm.feeStatus === 'none' ? 0.6 : 1,
                                        cursor: editForm.feeStatus === 'none' ? 'not-allowed' : 'text'
                                    }}
                                />
                            </div>
                        </div>

                        {editError && (
                            <div style={{
                                color: '#B91C1C',
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 500,
                            }}>
                                {editError}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                            <button className="btn-secondary" type="button" onClick={() => setEditingStudent(null)}>Cancel</button>
                            <button className="btn-primary" type="submit" disabled={editSaving} style={{ cursor: 'pointer' }}>
                                {editSaving ? 'Updating…' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Credentials Dialog for new guardian portal login */}
            {createdCredentials && (
                <CredentialsDialog
                    credentials={createdCredentials}
                    onClose={() => setCreatedCredentials(null)}
                />
            )}
        </>
    );
}

function CredentialsDialog({
    credentials,
    onClose,
}: {
    credentials: { name: string; email: string; password?: string };
    onClose: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const { workspace } = useWorkspace();
    const academy = workspace?.organization.name ?? 'our academy';
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login';
    const text = `Dear ${credentials.name},\n\nYour parent portal for ${academy} is ready. Sign in to see your child's attendance, fees, payment slips, test results and notices.\n\nPortal: ${portalUrl}\nEmail: ${credentials.email}\nTemporary password: ${credentials.password}\n\nRegards,\n${academy}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // fallback
        }
    };

    return (
        <Modal title="Parent Portal Login Credentials" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>
                    Share these details with {credentials.name}. The password is shown only once.
                </div>
                <div
                    style={{
                        background: 'var(--cs-surface-2)',
                        border: '1px solid var(--cs-border)',
                        borderRadius: '10px',
                        padding: '12px',
                        fontSize: '13px',
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: '6px 12px',
                    }}
                >
                    <span style={{ color: 'var(--cs-text-muted)' }}>Portal</span>
                    <span>{portalUrl}</span>
                    <span style={{ color: 'var(--cs-text-muted)' }}>Email</span>
                    <span style={{ fontWeight: 600 }}>{credentials.email}</span>
                    <span style={{ color: 'var(--cs-text-muted)' }}>Password</span>
                    <code style={{ fontWeight: 700, fontSize: '14px', color: 'var(--cs-primary)' }}>
                        {credentials.password}
                    </code>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button type="button" className="btn-secondary" onClick={copy}>
                        {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy message'}
                    </button>
                    <a
                        className="btn-primary"
                        href={`mailto:${credentials.email}?subject=${encodeURIComponent(
                            `Your ${academy} parent portal login`
                        )}&body=${encodeURIComponent(text)}`}
                    >
                        <Send size={14} /> Email to parent
                    </a>
                </div>
            </div>
        </Modal>
    );
}
