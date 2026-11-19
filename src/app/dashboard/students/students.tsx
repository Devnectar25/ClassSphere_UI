'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import BadgeList from '@/components/BadgeList';
import CountryPhoneInput, { COUNTRIES, type CountryOption, validatePhoneNumber } from '@/components/CountryPhoneInput';
import { useState, useRef } from 'react';
import { Search, Phone, Users, UserCheck, UserX, Clock, ChevronLeft, ChevronRight, Plus, Pencil, Upload, Camera } from 'lucide-react';
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

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', photo: '', dateOfBirth: '', batchId: '', branchId: '', feeStatus: 'none', feeAmount: '' };

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

    // Edit student state
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', status: 'active', batchId: '', branchId: '', feeStatus: 'none', feeAmount: '' });
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

    const closeAddModal = () => {
        setShowAdd(false);
        setForm(emptyForm);
        setPhotoPreview(null);
        setPhotoError(null);
        setFieldErrors({});
        setTouched({});
        setFormError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (search) query.set('q', search);
    if (statusFilter !== 'all') query.set('status', statusFilter);
    const { data, error, reload } = useApi<StudentSearch>(`/students?${query}`);
    const { data: batches } = useApi<Array<{ batchId: string; name: string; courseTitle?: string; tuitionAmount?: number }>>(showAdd || !!editingStudent ? '/batches' : null);

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
            setFormError('Please correct the highlighted errors before submitting.');
            return;
        }

        setSaving(true);
        setFormError(null);
        try {
            const formattedPhone = form.phone ? `${selectedCountry.dialCode} ${form.phone}`.trim() : undefined;
            await api('/students', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    phone: formattedPhone,
                    countryCode: selectedCountry.dialCode,
                    batchId: form.batchId || undefined,
                    branchId: form.branchId || session?.selectedBranchId || undefined,
                    feeStatus: form.feeStatus,
                    feeAmount: form.feeAmount || undefined,
                }),
            });
            closeAddModal();
            reload();
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
            batchId: '',
            branchId: s.branchId || '',
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', width: '100%' }}>
                    {stats.map(s => (
                        <div key={s.label} className="cs-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: 38, height: 38, borderRadius: '10px', background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <s.icon size={18} color={s.color} />
                            </div>
                            <div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--cs-text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.1 }}>{s.value}</div>
                                <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', marginTop: '2px' }}>{s.label} Students</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table card */}
                <div className="cs-card" style={{ width: '100%', overflow: 'hidden' }}>
                    {/* Toolbar */}
                    <div style={{
                        padding: '12px 20px',
                        borderBottom: '1px solid var(--cs-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: '1', minWidth: '280px' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)',
                                borderRadius: '8px', padding: '0 10px', height: '32px', boxSizing: 'border-box',
                                width: '280px', flexShrink: 0
                            }}>
                                <Search size={14} color="var(--cs-text-muted)" style={{ flexShrink: 0 }} />
                                <input
                                    placeholder="Search by name, ID or email..."
                                    style={{
                                        background: 'none', border: 'none', outline: 'none',
                                        padding: 0, height: '100%', fontSize: '12px', width: '100%',
                                        color: 'var(--cs-text-primary)'
                                    }}
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setOffset(0); }}
                                />
                            </div>

                            {/* Status filter pills */}
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {['all', 'active', 'on-hold', 'inquiry', 'completed', 'withdrawn'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { setStatusFilter(s); setOffset(0); }}
                                        style={{
                                            padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 600,
                                            cursor: 'pointer', border: '1px solid',
                                            background: statusFilter === s ? 'rgba(108,99,255,0.15)' : 'transparent',
                                            borderColor: statusFilter === s ? 'rgba(108,99,255,0.4)' : 'var(--cs-border)',
                                            color: statusFilter === s ? '#8B85FF' : 'var(--cs-text-muted)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {s === 'all' ? 'All' : statusConfig[s].label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Add Student button */}
                        {can(session, 'students.write') && (
                            <button
                                className="btn-primary"
                                onClick={() => setShowAdd(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    height: '32px',
                                    borderRadius: '8px'
                                }}
                            >
                                <Plus size={14} />
                                Add Student
                            </button>
                        )}
                    </div>

                    {!data ? <PageState error={error} /> : (
                        <div style={{ width: '100%', overflow: 'hidden' }}>
                            <table className="cs-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr style={{ background: 'var(--cs-surface-2)' }}>
                                        <th style={{ width: '20%', padding: '9px 8px 9px 18px' }}>Student</th>
                                        <th style={{ width: '14%', padding: '9px 8px' }}>Branch</th>
                                        <th style={{ width: '22%', padding: '9px 8px' }}>Batch</th>
                                        <th style={{ width: '13%', padding: '9px 8px' }}>Guardian</th>
                                        <th style={{ width: '9%', padding: '9px 8px' }}>Joined</th>
                                        <th style={{ width: '8%', padding: '9px 6px', textAlign: 'center' }}>Status</th>
                                        <th style={{ width: '8%', padding: '9px 6px', textAlign: 'center' }}>Fees</th>
                                        <th style={{ width: '6%', padding: '9px 12px 9px 6px', textAlign: 'center' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.students.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: '28px 14px', color: 'var(--cs-text-muted)', fontSize: '13px' }}>
                                                No students found.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.students.map(s => {
                                            const name = `${s.firstName} ${s.lastName}`;
                                            return (
                                                <tr key={s.studentId} style={{ transition: 'background 0.15s' }}>
                                                    <td style={{ padding: '9px 8px 9px 18px', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            {s.photo ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={s.photo}
                                                                    alt={name}
                                                                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #E2E8F0' }}
                                                                />
                                                            ) : (
                                                                <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: '11px', flexShrink: 0 }}>
                                                                    {initials(name)}
                                                                </div>
                                                            )}
                                                            <div style={{ minWidth: 0 }}>
                                                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cs-text-primary)', lineHeight: 1.3 }}>
                                                                    {name}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', lineHeight: 1.25, marginTop: '2px' }}>
                                                                    <code>{s.enrollmentNumber}</code>
                                                                </div>
                                                                {s.phone && (
                                                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px', lineHeight: 1.25 }}>
                                                                        <Phone size={10} />
                                                                        <span>{s.phone}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '9px 8px', fontSize: '12px', color: 'var(--cs-text-secondary)', verticalAlign: 'middle', lineHeight: 1.35, whiteSpace: 'normal', wordBreak: 'normal' }}>
                                                        {s.branchName ?? '—'}
                                                    </td>
                                                    <td style={{ padding: '9px 8px', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                            {!s.batches ? (
                                                                <span style={{ color: 'var(--cs-text-muted)', fontSize: '12px' }}>—</span>
                                                            ) : (
                                                                s.batches.split(', ').map(b => (
                                                                    <span
                                                                        key={b}
                                                                        className="badge badge-primary"
                                                                        style={{
                                                                            display: 'inline-block',
                                                                            whiteSpace: 'normal',
                                                                            wordBreak: 'normal',
                                                                            lineHeight: 1.3,
                                                                            fontSize: '11px',
                                                                            padding: '3px 8px',
                                                                            height: 'auto',
                                                                            borderRadius: '6px',
                                                                            maxWidth: '100%'
                                                                        }}
                                                                    >
                                                                        {b}
                                                                    </span>
                                                                ))
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '9px 8px', color: 'var(--cs-text-secondary)', fontSize: '12px', verticalAlign: 'middle', lineHeight: 1.35, whiteSpace: 'normal', wordBreak: 'normal' }}>
                                                        {s.guardianName ?? '—'}
                                                    </td>
                                                    <td style={{ padding: '9px 8px', color: 'var(--cs-text-muted)', fontSize: '11px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                        {formatDate(s.createdAt)}
                                                    </td>
                                                    <td style={{ padding: '9px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                        <span className={`badge ${statusConfig[s.status]?.cls ?? 'badge-secondary'}`} style={{ fontSize: '11px', padding: '2px 8px', height: '22px', lineHeight: '22px' }}>
                                                            {statusConfig[s.status]?.label ?? s.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '9px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                        <span className={`badge ${feesConfig[s.feeStatus]?.cls}`} style={{ fontSize: '11px', padding: '2px 8px', height: '22px', lineHeight: '22px' }}>
                                                            {feesConfig[s.feeStatus]?.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '9px 12px 9px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                        {can(session, 'students.write') && (
                                                            <button
                                                                className="btn-ghost"
                                                                onClick={() => startEdit(s)}
                                                                title={`Edit ${name}`}
                                                                style={{
                                                                    width: '28px',
                                                                    height: '28px',
                                                                    padding: 0,
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    color: '#6C63FF',
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
                        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                Showing {data.total === 0 ? 0 : offset + 1}–{Math.min(offset + data.students.length, data.total)} of {data.total} students (7 per page)
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    className="btn-ghost"
                                    style={{
                                        padding: '5px 10px',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid var(--cs-border)',
                                        borderRadius: '6px',
                                        cursor: offset === 0 ? 'not-allowed' : 'pointer',
                                        opacity: offset === 0 ? 0.4 : 1
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
                                                onClick={() => setOffset((pageNum - 1) * PAGE_SIZE)}
                                                style={{
                                                    minWidth: '28px',
                                                    height: '28px',
                                                    padding: '0 6px',
                                                    fontSize: '12px',
                                                    fontWeight: isCurrent ? 700 : 500,
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    border: '1px solid',
                                                    background: isCurrent ? 'var(--cs-primary)' : 'transparent',
                                                    borderColor: isCurrent ? 'var(--cs-primary)' : 'var(--cs-border)',
                                                    color: isCurrent ? '#FFFFFF' : 'var(--cs-text-secondary)',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    className="btn-ghost"
                                    style={{
                                        padding: '5px 10px',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid var(--cs-border)',
                                        borderRadius: '6px',
                                        cursor: offset + PAGE_SIZE >= data.total ? 'not-allowed' : 'pointer',
                                        opacity: offset + PAGE_SIZE >= data.total ? 0.4 : 1
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

            {/* Add Student Modal */}
            {showAdd && (
                <Modal title="Add Student" onClose={closeAddModal} maxWidth="660px">
                    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Student Photo Upload */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                            <div style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: '#FFFFFF', border: '2px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {photoPreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={photoPreview} alt="Student preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                                        <Camera size={20} />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label
                                        className="btn-secondary"
                                        style={{
                                            height: '30px',
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
                                            style={{ height: '30px', padding: '0 6px', fontSize: '11px', color: '#EF4444' }}
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
                                <select className="cs-input" value={form.branchId || session?.selectedBranchId || ''} onChange={e => setForm({ ...form, branchId: e.target.value })}>
                                    <option value="">Primary branch</option>
                                    {workspace?.branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="cs-label">Enroll in Batch (optional)</label>
                            <select
                                className="cs-input"
                                value={form.batchId}
                                onChange={e => {
                                    const bId = e.target.value;
                                    const selected = batches?.find(b => b.batchId === bId);
                                    setForm(f => ({
                                        ...f,
                                        batchId: bId,
                                        feeAmount: selected && selected.tuitionAmount ? String(selected.tuitionAmount) : (bId ? f.feeAmount : ''),
                                        feeStatus: selected && f.feeStatus === 'none' ? 'pending' : f.feeStatus
                                    }));
                                }}
                            >
                                <option value="">— No batch yet —</option>
                                {batches?.map(b => (
                                    <option key={b.batchId} value={b.batchId}>
                                        {b.name} {b.courseTitle ? `(${b.courseTitle})` : ''} {b.tuitionAmount ? `— ₹${Number(b.tuitionAmount).toLocaleString('en-IN')}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Fee Status</label>
                                <select
                                    className="cs-input"
                                    value={form.feeStatus}
                                    onChange={e => {
                                        const status = e.target.value;
                                        setForm(f => ({
                                            ...f,
                                            feeStatus: status,
                                            feeAmount: status === 'none' ? '' : f.feeAmount
                                        }));
                                    }}
                                >
                                    <option value="none">— No Fee (Exempt) —</option>
                                    <option value="pending">Pending (Fee Due)</option>
                                    <option value="paid">Paid (Paid Upfront)</option>
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">
                                    Fee / Tuition Amount {form.feeStatus !== 'none' && <span style={{ color: '#EF4444' }}>*</span>}
                                </label>
                                <input
                                    className="cs-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder={form.feeStatus === 'none' ? '—' : 'e.g. 5000'}
                                    disabled={form.feeStatus === 'none'}
                                    value={form.feeAmount}
                                    onChange={e => setForm({ ...form, feeAmount: e.target.value })}
                                    style={{
                                        opacity: form.feeStatus === 'none' ? 0.6 : 1,
                                        cursor: form.feeStatus === 'none' ? 'not-allowed' : 'text'
                                    }}
                                />
                            </div>
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
                            <button className="btn-primary" type="submit" disabled={saving}>
                                {saving ? 'Adding…' : 'Add Student'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Edit Student Modal */}
            {editingStudent && (
                <Modal title={`Edit Student: ${editingStudent.firstName} ${editingStudent.lastName}`} onClose={() => setEditingStudent(null)} maxWidth="660px">
                    <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

                        {!branchScoped && (workspace?.branches.length ?? 0) > 1 && (
                            <div>
                                <label className="cs-label">Branch</label>
                                <select className="cs-input" value={editForm.branchId} onChange={handleEditFieldChange('branchId')}>
                                    <option value="">Primary branch</option>
                                    {workspace?.branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                                </select>
                            </div>
                        )}

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
                                        feeAmount: selected && selected.tuitionAmount ? String(selected.tuitionAmount) : f.feeAmount,
                                        feeStatus: selected && f.feeStatus === 'none' ? 'pending' : f.feeStatus
                                    }));
                                }}
                            >
                                <option value="">— Keep existing batch —</option>
                                {batches?.map(b => (
                                    <option key={b.batchId} value={b.batchId}>
                                        {b.name} {b.courseTitle ? `(${b.courseTitle})` : ''} {b.tuitionAmount ? `— ₹${Number(b.tuitionAmount).toLocaleString('en-IN')}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
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
        </>
    );
}
