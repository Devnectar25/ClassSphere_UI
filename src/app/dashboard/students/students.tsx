'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import BadgeList from '@/components/BadgeList';
import CountryPhoneInput, { COUNTRIES, type CountryOption, validatePhoneNumber } from '@/components/CountryPhoneInput';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Phone, Users, UserCheck, UserX, Clock, ChevronLeft, ChevronRight, Plus, Pencil, Upload, Camera, ArrowRight, ArrowLeft, Check, Copy, Send, UserPlus, MapPin, Calendar as CalendarIcon, X, Eye, BookOpen, GraduationCap, DollarSign, AlertCircle, Building, Mail, CheckCircle, Shield, ArrowRightLeft, AlertTriangle, Building2, Filter, Award, CheckCircle2 } from 'lucide-react';
import { api, useApi, formatDate, formatMoney, initials } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';
import { dateInDays, fittingInstallments, frequencyChoices, installmentDates, periodOf, scheduleProblem, splitRemaining, type Frequency } from '@/lib/installments';
import { CREDIT_STATUS, PLAN_STATUS, emptyFinanceForm, planPayload, planProblem, reviewPayload, type FinanceForm } from '@/components/TransferFinance';
import { TransferFeeStep, TransferSummaryStep, availableCredit, feeStepProblem, type TransferPreview } from '@/components/TransferSteps';
import ConsumptionReview, { type ConsumptionView } from '@/components/ConsumptionReview';
import CourseCompletionReviewModal from '@/components/CourseCompletionReviewModal';
import CourseCompletionQueueModal from '@/components/CourseCompletionQueueModal';

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

interface StudentCourseEnrollment {
    enrollmentId: string;
    studentId: string;
    batchId: string;
    batchName: string;
    capacity: number;
    enrolledCount: number;
    courseId: string;
    courseTitle: string;
    courseCode: string;
    tuitionAmount: number;
    oldCourseTotalFee?: number;
    paidAmount?: number;
    outstandingAmount?: number;
    consumedAmount?: number;
    availableCredit?: number;
    unusedCredit?: number;
    pendingVerification?: number;
    hasDues?: boolean;
    billingPeriod: string;
    branchId: string;
    branchName: string;
    status: string;
    enrolledAt: string;
    transferReason?: string | null;
    remarks?: string | null;
    transferredAt?: string | null;
    academicProgress?: any;
}

interface CourseTransferHistoryRecord {
    transferId: string;
    fromCourseTitle: string;
    fromBatchName: string;
    fromBranchName: string;
    toCourseTitle: string;
    toBatchName: string;
    toBranchName: string;
    transferDate: string;
    transferReason: string;
    transferStatus: string;
    creditStatus?: string | null;
    feePlanStatus?: string | null;
    remarks: string | null;
    selectedCreditOption?: 'allowed' | 'not_allowed';
    availableCredit?: number;
    consumedAmount?: number;
    approvedCreditAdjustment?: number;
    unusedRetainedCredit?: number;
    finalPayableAmount?: number;
    previousFeeDetails: {
        totalFee: number;
        paidAmount: number;
        outstandingAmount: number;
        consumedAmount?: number;
        availableCredit?: number;
        waiveOldOutstanding?: boolean;
        waiverReason?: string | null;
    };
    newFeeDetails: {
        newCourseFee: number;
        approvedCreditAdjustment: number;
        finalPayableAmount: number;
        feeStatus?: string;
    };
}

interface StudentProfileResponse {
    student: {
        studentId: string;
        enrollmentNumber: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
        dateOfBirth: string | null;
        status: string;
        academicStanding: string | null;
        matriculationYear: number | null;
        branchId: string | null;
        branchName: string | null;
        photo: string | null;
        createdAt: string;
    };
    enrollments: StudentCourseEnrollment[];
    creditBalance?: number;
    transfers?: CourseTransferHistoryRecord[];
    invoices?: Array<{
        invoiceId: string;
        invoiceNumber: string;
        designation?: string;
        totalAmount: number;
        paidAmount: number;
        balanceAmount: number;
        status: string;
        dueDate?: string | null;
    }>;
    feeSummary?: {
        totalFee: number;
        paidAmount: number;
        balanceAmount: number;
    };
}

const enrollmentStatusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
    enrolled: { label: 'Enrolled', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
    confirmed: { label: 'Confirmed', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
    active: { label: 'Active', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
    approved: { label: 'Approved', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
    pending: { label: 'Pending', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
    waitlisted: { label: 'Waitlisted', bg: '#FDF4FF', color: '#9333EA', border: '#F5D0FE' },
    completed: { label: 'Completed', bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' },
    transferred: { label: 'Transferred', bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
    cancelled: { label: 'Cancelled', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
    rejected: { label: 'Rejected', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
    expired: { label: 'Expired', bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
};

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

interface CourseOption { courseId: string; branchId?: string | null; isActive?: boolean }
interface BatchOption { batchId: string; courseId?: string; branchId?: string; status?: string }

// One rule for every form: a course is offered in a branch when it belongs to that branch, or is academy-wide and
// runs there (or has no batch yet). `keepId` keeps the current selection visible.
function filterCourses<T extends CourseOption>(courses: T[] | null, batches: BatchOption[] | null, branchId?: string | null, keepId?: string): T[] {
    return (courses || []).filter(c => {
        if (keepId && c.courseId === keepId) return true;
        if (c.isActive === false) return false;
        if (!branchId) return true;
        if (c.branchId) return c.branchId === branchId;
        const courseBatches = (batches || []).filter(b => b.status !== 'inactive' && b.courseId === c.courseId);
        return courseBatches.length === 0 || courseBatches.some(b => !b.branchId || b.branchId === branchId);
    });
}

function filterBatches<T extends BatchOption>(batches: T[] | null, branchId: string | null | undefined, courseId: string, keepId?: string): T[] {
    return (batches || []).filter(b => {
        if (!courseId || b.courseId !== courseId) return false;
        if (keepId && b.batchId === keepId) return true;
        return b.status !== 'inactive' && (!branchId || !b.branchId || b.branchId === branchId);
    });
}

export default function StudentsPage() {
    const session = useSession();
    const { workspace, currency } = useWorkspace();
    const branchScoped = !!session?.session.branchId;
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState<string>('all');
    const [courseFilter, setCourseFilter] = useState<string>('all');
    const [batchFilter, setBatchFilter] = useState<string>('all');
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

    // 3-Step Registration state: Step 1 (Student) -> Step 2 (Guardian) -> Step 3 (Fee Structure)
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [guardianForm, setGuardianForm] = useState<GuardianFormData>(emptyGuardianForm);
    const [guardianCountry, setGuardianCountry] = useState<CountryOption>(COUNTRIES[0]);
    const [guardianFieldErrors, setGuardianFieldErrors] = useState<Record<string, string>>({});
    const [guardianTouched, setGuardianTouched] = useState<Record<string, boolean>>({});

    // Step 3: Fee Plan & Installment Schedule state
    const [feePlanForm, setFeePlanForm] = useState<{
        paymentType: 'one_time' | 'installment';
        courseFee: number;
        discountAmount: number;
        finalFee: number;
        installmentCount: number;
        installmentFrequency: 'monthly' | 'bi_monthly' | 'quarterly' | 'half_yearly' | 'custom';
        installments: Array<{ installmentNumber: number; dueDate: string; amount: number; designation?: string }>;
        collectInitialPayment: boolean;
        initialPaymentAmount: string;
        initialPaymentMethod: string;
        initialPaymentReference: string;
    }>({
        paymentType: 'one_time',
        courseFee: 0,
        discountAmount: 0,
        finalFee: 0,
        installmentCount: 3,
        installmentFrequency: 'monthly',
        installments: [],
        collectInitialPayment: false,
        initialPaymentAmount: '',
        initialPaymentMethod: 'Cash',
        initialPaymentReference: '',
    });
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
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', status: 'active', enrollmentNumber: '', courseId: '', batchId: '', branchId: '', feeStatus: 'none', feeAmount: '', photo: '' });
    const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
    const [editPhotoError, setEditPhotoError] = useState<string | null>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const [editCountry, setEditCountry] = useState<CountryOption>(COUNTRIES[0]);
    const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
    const [editTouched, setEditTouched] = useState<Record<string, boolean>>({});
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const editEnrollmentTouched = useRef(false);
    const editLoadId = useRef('');
    // Fees of a student with installments or payments are managed under Fees & Plans, not by this form
    const [editFeeLocked, setEditFeeLocked] = useState(false);

    // Student Profile & Course Enrollment State
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [addCourseForm, setAddCourseForm] = useState({
        branchId: '',
        courseId: '',
        batchId: '',
        enrollmentDate: '',
        feePlanId: '',
        feeStatus: 'pending',
        feeAmount: '',
    });
    const [addCourseSaving, setAddCourseSaving] = useState(false);
    const [addCourseError, setAddCourseError] = useState<string | null>(null);
    const [addCourseSuccess, setAddCourseSuccess] = useState<string | null>(null);

    // Course Transfer State
    const [transferringEnrollment, setTransferringEnrollment] = useState<StudentCourseEnrollment | null>(null);
    const [transferStep, setTransferStep] = useState<'destination' | 'fee_review' | 'confirm'>('destination');
    const [transferForm, setTransferForm] = useState<{
        destinationBranchId: string;
        destinationCourseId: string;
        destinationBatchId: string;
        transferDate: string;
        transferReason: string;
        remarks: string;
        waiveOldOutstanding: boolean;
        waiverReason: string;
        financeNow: boolean;
    }>({
        destinationBranchId: '',
        destinationCourseId: '',
        destinationBatchId: '',
        transferDate: '',
        transferReason: 'Student Request / Preference',
        remarks: '',
        waiveOldOutstanding: false,
        waiverReason: '',
        financeNow: true,
    });
    const [transferFinance, setTransferFinance] = useState<FinanceForm>(emptyFinanceForm);
    const [transferConsumption, setTransferConsumption] = useState<ConsumptionView | null>(null);
    const [transferPreview, setTransferPreview] = useState<TransferPreview | null>(null);
    const canFinance = can(session, 'billing.write');
    const [transferSaving, setTransferSaving] = useState(false);
    const [transferError, setTransferError] = useState<string | null>(null);
    const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
    const [reviewingEnrollmentId, setReviewingEnrollmentId] = useState<string | null>(null);
    const [showCompletionQueue, setShowCompletionQueue] = useState(false);
    const [enrollmentFilterTab, setEnrollmentFilterTab] = useState<'all' | 'active' | 'completed' | 'transferred'>('all');
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
        setGuardianOtpInput(code);
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

    const apiFrequency = (frequency: string) => (frequency === 'bi_monthly' ? 'every_2_months' : frequency) as Frequency;

    // Course period of the selected course and batch: installments start with the course and stay within it
    const registrationPeriod = () => periodOf(courses?.find(c => c.courseId === form.courseId), batches?.find(b => b.batchId === form.batchId));
    const registrationLimit = (frequency: string) => {
        const period = registrationPeriod();
        return period ? fittingInstallments(period, period.firstDueDate, apiFrequency(frequency)) : null;
    };
    const registrationProblem = () => feePlanForm.paymentType === 'installment'
        ? scheduleProblem(registrationPeriod(), feePlanForm.installments.map(i => i.dueDate)) : null;

    // The same rule for the destination course of a transfer
    const transferPeriod = () => periodOf(courses?.find(c => c.courseId === transferForm.destinationCourseId), batches?.find(b => b.batchId === transferForm.destinationBatchId));
    const transferFirstDue = () => [transferForm.transferDate, transferPeriod()?.firstDueDate ?? ''].sort().at(-1) || dateInDays();

    const calculateInstallments = (
        total: number,
        count: number,
        frequency: 'monthly' | 'bi_monthly' | 'quarterly' | 'half_yearly' | 'custom'
    ) => {
        const firstDue = registrationPeriod()?.firstDueDate ?? dateInDays();
        const safeCount = Math.max(1, Math.min(count, registrationLimit(frequency) ?? count));
        const equalShare = Math.floor(total / safeCount);
        const remainder = total - (equalShare * safeCount);
        const dates = installmentDates(registrationPeriod(), firstDue, safeCount, apiFrequency(frequency));

        return Array.from({ length: safeCount }, (_, idx) => {
            const amount = idx === safeCount - 1 ? equalShare + remainder : equalShare;
            return {
                installmentNumber: idx + 1,
                dueDate: dates[idx],
                amount,
                designation: `Installment ${idx + 1} of ${safeCount}`
            };
        });
    };

    const handleGuardianNextStep = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Check if guardian information was entered
        const hasGuardianInput = guardianForm.mode === 'existing'
            ? Boolean(guardianForm.existingGuardianId)
            : Boolean(guardianForm.firstName.trim() || guardianForm.lastName.trim() || guardianForm.email.trim() || guardianForm.phone.trim());

        if (hasGuardianInput) {
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
                // Auto-verify phone in demo mode whenever phone format is valid
                if (!gErrors.phone && guardianDigits.length >= 7) {
                    setGuardianVerifiedPhone(guardianDigits);
                    setGuardianOtp(null);
                    setGuardianOtpError(null);
                }

                const activeGErrors = Object.fromEntries(Object.entries(gErrors).filter(([_, msg]) => Boolean(msg)));
                setGuardianFieldErrors(activeGErrors);

                if (Object.keys(activeGErrors).length > 0) {
                    setFormError('Please correct the highlighted guardian errors before proceeding.');
                    return;
                }
            } else {
                if (!guardianForm.existingGuardianId) {
                    setFormError('Please select an existing guardian to link to this student.');
                    return;
                }
            }
        }

        try {
            // Initialize Fee Plan for selected course
            const selectedCourse = courses?.find(c => c.courseId === form.courseId);
            const selectedBatch = batches?.find(b => b.batchId === form.batchId);
            const actualTuition = Number(selectedCourse?.tuitionAmount || selectedBatch?.tuitionAmount || 0);

            setFeePlanForm(prev => {
                const fee = actualTuition > 0 ? actualTuition : (Number(prev.courseFee) || 0);
                const discount = Number(prev.discountAmount) || 0;
                const finalFee = Math.max(0, fee - discount);
                const count = Number(prev.installmentCount) || 3;
                const freq = prev.installmentFrequency || 'monthly';
                const insts = calculateInstallments(finalFee, count, freq);
                return {
                    ...prev,
                    courseFee: fee,
                    discountAmount: discount,
                    finalFee,
                    installments: insts,
                    installmentCount: insts.length,
                    initialPaymentAmount: insts.length > 0 ? String(insts[0].amount) : String(finalFee)
                };
            });

            setFormError(null);
            setStep(3);
        } catch (err) {
            console.error('Error transitioning to step 3:', err);
            setFormError(null);
            setStep(3);
        }
    };

    const handlePreviousStep = () => {
        setFormError(null);
        if (step === 3) setStep(2);
        else if (step === 2) setStep(1);
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
        setFeePlanForm({
            paymentType: 'one_time',
            courseFee: 0,
            discountAmount: 0,
            finalFee: 0,
            installmentCount: 3,
            installmentFrequency: 'monthly',
            installments: [],
            collectInitialPayment: false,
            initialPaymentAmount: '',
            initialPaymentMethod: 'Cash',
            initialPaymentReference: '',
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (search) query.set('q', search);
    if (statusFilter !== 'all') query.set('status', statusFilter);
    if (branchFilter !== 'all') query.set('branchId', branchFilter);
    if (courseFilter !== 'all') query.set('courseId', courseFilter);
    if (batchFilter !== 'all') query.set('batchId', batchFilter);

    const { data, error, reload } = useApi<StudentSearch>(`/students?${query}`);
    const { data: courses } = useApi<Array<{ courseId: string; title: string; code: string; tuitionAmount?: number; branchId?: string | null; isActive?: boolean; durationMonths?: number | null; startDate?: string | null }>>('/courses');
    const { data: batches } = useApi<Array<{ batchId: string; name: string; courseTitle?: string; courseId?: string; tuitionAmount?: number; branchId?: string; branchName?: string; capacity?: number; enrolledCount?: number; status?: string; startDate?: string | null; endDate?: string | null }>>('/batches?branchId=all');
    const { data: branchesApi } = useApi<Array<{ branchId: string; name: string; code?: string }>>('/branches');
    const { data: feeStructure } = useApi<{ feePlans: Array<{ planId: string; name: string; courseId?: string; discountPercent?: number; isActive?: boolean }> }>(!!viewingStudent ? '/fees' : null);
    const { data: profileData, reload: reloadProfile } = useApi<StudentProfileResponse>(
        viewingStudent ? `/students?studentId=${viewingStudent.studentId}` : null
    );
    const { data: rawGuardians } = useApi<Array<{ guardianId: string; firstName: string; lastName: string; phone: string; email: string; relationship: string; householdCode?: string }>>(showAdd ? '/guardians' : null);
    const { data: nextIdData } = useApi<{ nextId: string }>(showAdd ? '/students?action=next-id' : null);

    const availableBranchesList = (branchesApi && branchesApi.length > 0) ? branchesApi : (workspace?.branches || []);

    // Dynamic courses based on selected branch
    const dynamicCourses = useMemo(() => {
        if (!courses) return [];
        if (branchFilter === 'all') return courses;
        return filterCourses(courses, batches, branchFilter);
    }, [courses, batches, branchFilter]);

    // Dynamic batches based on selected branch and course
    const dynamicBatches = useMemo(() => {
        if (!batches) return [];
        return batches.filter(b => {
            if (b.status === 'inactive') return false;
            if (courseFilter !== 'all' && b.courseId !== courseFilter) return false;
            if (branchFilter !== 'all' && b.branchId && b.branchId !== branchFilter) return false;
            return true;
        });
    }, [batches, courseFilter, branchFilter]);

    const handleBranchFilterChange = (newBranch: string) => {
        setBranchFilter(newBranch);
        setOffset(0);
        // Cascading reset: if active course doesn't exist in new branch, reset course
        if (courseFilter !== 'all') {
            const course = courses?.find(c => c.courseId === courseFilter);
            if (course && course.branchId && newBranch !== 'all' && course.branchId !== newBranch) {
                setCourseFilter('all');
                setBatchFilter('all');
                return;
            }
        }
        // Cascading reset: if active batch doesn't exist in new branch, reset batch
        if (batchFilter !== 'all') {
            const batch = batches?.find(b => b.batchId === batchFilter);
            if (batch && batch.branchId && newBranch !== 'all' && batch.branchId !== newBranch) {
                setBatchFilter('all');
            }
        }
    };

    const handleCourseFilterChange = (newCourse: string) => {
        setCourseFilter(newCourse);
        setOffset(0);
        // Cascading reset: if active batch doesn't belong to the selected course, reset batch
        if (batchFilter !== 'all') {
            const batch = batches?.find(b => b.batchId === batchFilter);
            if (batch && newCourse !== 'all' && batch.courseId !== newCourse) {
                setBatchFilter('all');
            }
        }
    };

    const handleBatchFilterChange = (newBatch: string) => {
        setBatchFilter(newBatch);
        setOffset(0);
    };

    const clearFilters = () => {
        setBranchFilter('all');
        setCourseFilter('all');
        setBatchFilter('all');
        setOffset(0);
    };

    const hasActiveFilters = branchFilter !== 'all' || courseFilter !== 'all' || batchFilter !== 'all';

    const openProfile = (student: Student) => {
        setViewingStudent(student);
        setShowAddCourse(false);
        setAddCourseError(null);
        setAddCourseSuccess(null);
        setTransferSuccess(null);
        setTransferError(null);
        setTransferringEnrollment(null);
        setAddCourseForm({
            branchId: student.branchId || availableBranchesList[0]?.branchId || '',
            courseId: '',
            batchId: '',
            enrollmentDate: new Date().toISOString().split('T')[0],
            feePlanId: '',
            feeStatus: 'pending',
            feeAmount: '',
        });
    };

    const handleAddCourseBranchChange = (newBranchId: string) => {
        setAddCourseForm(f => ({
            ...f,
            branchId: newBranchId,
            courseId: '',
            batchId: '',
            feePlanId: '',
            feeAmount: '',
        }));
        setAddCourseError(null);
    };

    const handleAddCourseCourseChange = (newCourseId: string) => {
        const selCourse = courses?.find(c => c.courseId === newCourseId);
        setAddCourseForm(f => ({
            ...f,
            courseId: newCourseId,
            batchId: '',
            feePlanId: '',
            feeAmount: selCourse?.tuitionAmount ? String(selCourse.tuitionAmount) : '',
        }));
        setAddCourseError(null);
    };

    const handleAddCourseBatchChange = (newBatchId: string) => {
        setAddCourseForm(f => ({ ...f, batchId: newBatchId }));
        setAddCourseError(null);
    };

    const handleAddCourseFeePlanChange = (newFeePlanId: string) => {
        const plan = feeStructure?.feePlans?.find(p => p.planId === newFeePlanId);
        const selCourse = courses?.find(c => c.courseId === addCourseForm.courseId);
        let amount = selCourse?.tuitionAmount ? Number(selCourse.tuitionAmount) : 0;
        if (plan?.discountPercent && Number(plan.discountPercent) > 0 && amount > 0) {
            amount = Math.round(amount * (1 - Number(plan.discountPercent) / 100));
        }
        setAddCourseForm(f => ({
            ...f,
            feePlanId: newFeePlanId,
            feeAmount: amount > 0 ? String(amount) : f.feeAmount,
        }));
    };

    const submitAddCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!viewingStudent) return;

        if (!addCourseForm.branchId) {
            setAddCourseError('Please select a branch.');
            return;
        }
        if (!addCourseForm.courseId) {
            setAddCourseError('Please select a course.');
            return;
        }
        if (!addCourseForm.batchId) {
            setAddCourseError('Please select a batch.');
            return;
        }
        if (!addCourseForm.enrollmentDate) {
            setAddCourseError('Please select an enrollment date.');
            return;
        }

        const inactiveStatuses = ['inactive', 'suspended', 'withdrawn', 'cancelled'];
        if (inactiveStatuses.includes(viewingStudent.status?.toLowerCase())) {
            setAddCourseError(`Cannot enroll student because status is '${viewingStudent.status}'. Student must be active to enroll in new courses.`);
            return;
        }

        const alreadyEnrolled = profileData?.enrollments?.some(enr =>
            enr.courseId === addCourseForm.courseId &&
            ['enrolled', 'confirmed', 'active', 'approved'].includes(enr.status?.toLowerCase())
        );
        if (alreadyEnrolled) {
            setAddCourseError('Student is already actively enrolled in this course. Multiple active enrollments in the same course are not allowed.');
            return;
        }

        const batch = batches?.find(b => b.batchId === addCourseForm.batchId);
        if (batch && batch.capacity && (batch.enrolledCount ?? 0) >= batch.capacity) {
            setAddCourseError(`Selected batch '${batch.name}' has reached capacity (${batch.enrolledCount}/${batch.capacity} seats).`);
            return;
        }

        try {
            setAddCourseSaving(true);
            setAddCourseError(null);
            setAddCourseSuccess(null);

            const res = await api<{ success: boolean; message?: string }>('/students', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'add-course',
                    studentId: viewingStudent.studentId,
                    branchId: addCourseForm.branchId,
                    courseId: addCourseForm.courseId,
                    batchId: addCourseForm.batchId,
                    enrollmentDate: addCourseForm.enrollmentDate,
                    feePlanId: addCourseForm.feePlanId || undefined,
                    feeStatus: addCourseForm.feeStatus,
                    feeAmount: addCourseForm.feeAmount || undefined,
                })
            });

            setAddCourseSuccess(res.message || 'Course enrollment added successfully!');
            setShowAddCourse(false);
            setAddCourseForm(f => ({
                ...f,
                courseId: '',
                batchId: '',
                feePlanId: '',
                feeAmount: '',
            }));
            await reloadProfile();
            await reload();
        } catch (err: any) {
            setAddCourseError(err.message || 'Failed to enroll student into course.');
        } finally {
            setAddCourseSaving(false);
        }
    };

    const openTransferModal = (enr: StudentCourseEnrollment) => {
        setTransferringEnrollment(enr);
        setTransferStep('destination');
        setTransferForm({
            destinationBranchId: enr.branchId || availableBranchesList[0]?.branchId || '',
            destinationCourseId: enr.courseId,
            destinationBatchId: '',
            transferDate: new Date().toISOString().split('T')[0],
            transferReason: 'Student Request / Preference',
            remarks: '',
            waiveOldOutstanding: false,
            waiverReason: '',
            financeNow: can(session, 'billing.write'),
        });
        setTransferFinance(emptyFinanceForm());
        setTransferConsumption(null);
        setTransferPreview(null);
        setTransferError(null);
    };

    const handleTransferBranchChange = (newBranchId: string) => {
        setTransferForm(f => ({
            ...f,
            destinationBranchId: newBranchId,
            destinationCourseId: '',
            destinationBatchId: '',
        }));
        setTransferError(null);
    };

    const handleTransferCourseChange = (newCourseId: string) => {
        setTransferForm(f => ({ ...f, destinationCourseId: newCourseId, destinationBatchId: '' }));
        setTransferFinance(f => ({ ...f, templatePlanId: '', applyCredit: '', rows: [] }));
        setTransferError(null);
    };

    const handleTransferBatchChange = (newBatchId: string) => {
        setTransferForm(f => ({
            ...f,
            destinationBatchId: newBatchId,
        }));
        setTransferError(null);
    };

    const handleGoToFeeReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!viewingStudent || !transferringEnrollment) return;

        if (!transferForm.destinationBranchId) {
            setTransferError('Please select a destination branch.');
            return;
        }
        if (!transferForm.destinationCourseId) {
            setTransferError('Please select a destination course.');
            return;
        }
        if (!transferForm.destinationBatchId) {
            setTransferError('Please select a destination batch.');
            return;
        }
        if (transferForm.destinationBatchId === transferringEnrollment.batchId) {
            setTransferError('Destination batch cannot be the same as the current batch.');
            return;
        }
        if (!transferForm.transferDate) {
            setTransferError('Please select a valid transfer date.');
            return;
        }
        if (!transferForm.transferReason.trim()) {
            setTransferError('Please provide a reason for the transfer.');
            return;
        }

        // Check if student already has another active enrollment in destination course
        if (transferForm.destinationCourseId !== transferringEnrollment.courseId) {
            const alreadyEnrolled = profileData?.enrollments?.some(e =>
                e.courseId === transferForm.destinationCourseId &&
                e.enrollmentId !== transferringEnrollment.enrollmentId &&
                ['enrolled', 'confirmed', 'active', 'approved'].includes(e.status?.toLowerCase())
            );
            if (alreadyEnrolled) {
                setTransferError('Student is already actively enrolled in this destination course.');
                return;
            }
        }

        // Check destination batch capacity
        const destBatch = batches?.find(b => b.batchId === transferForm.destinationBatchId);
        if (destBatch && destBatch.capacity && (destBatch.enrolledCount ?? 0) >= destBatch.capacity) {
            setTransferError(`Selected destination batch '${destBatch.name}' has reached capacity (${destBatch.enrolledCount}/${destBatch.capacity} seats).`);
            return;
        }

        setTransferError(null);

        const otherCourse = transferForm.destinationCourseId !== transferringEnrollment.courseId;
        if (otherCourse && !transferConsumption) {
            setTransferError('Attendance and fees are still being checked. Try again in a moment.');
            return;
        }
        if (otherCourse && transferConsumption?.transferBlocked && !canFinance) {
            setTransferError('The consumed fee is not verified yet. Resolve the dates above or send them for verification; the student stays in the current course until then.');
            return;
        }

        // Due dates of the new course start with it, not before the transfer
        const firstDue = transferFirstDue();
        const lastDue = transferPeriod()?.lastDueDate ?? null;
        setTransferFinance(f => (f.firstDueDate < firstDue || (lastDue !== null && f.firstDueDate > lastDue) ? { ...f, firstDueDate: firstDue, rows: [] } : f));
        if (transferConsumption?.transferBlocked) setTransferForm(f => ({ ...f, financeNow: true }));
        setTransferPreview(null);
        setTransferStep('fee_review');
    };

    const transferSameCourse = transferForm.destinationCourseId === transferringEnrollment?.courseId;
    const transferFinanceNow = canFinance && transferForm.financeNow && !transferSameCourse;
    const transferDues = { waive: transferForm.waiveOldOutstanding, reason: transferForm.waiverReason };
    const transferBody = () => ({
        action: 'transfer-course',
        studentId: viewingStudent?.studentId,
        currentEnrollmentId: transferringEnrollment?.enrollmentId,
        destinationBranchId: transferForm.destinationBranchId,
        destinationCourseId: transferForm.destinationCourseId,
        destinationBatchId: transferForm.destinationBatchId,
        transferDate: transferForm.transferDate,
        transferReason: transferForm.transferReason,
        remarks: transferForm.remarks || undefined,
        ...(transferFinanceNow ? {
            ...(transferConsumption?.credit?.reviewable ? { review: reviewPayload(transferFinance) } : {}),
            feePlan: planPayload(transferFinance),
        } : {}),
        ...(transferDues.waive && !transferSameCourse ? { waiveOldOutstanding: true, waiverReason: transferDues.reason.trim() } : {}),
    });
    const transferTemplates = feeStructure?.feePlans ?? [];
    const transferStepProblem = () => feeStepProblem({ view: transferConsumption, sameCourse: transferSameCourse, canFinance, financeNow: transferForm.financeNow, form: transferFinance, dues: transferDues })
        ?? (transferFinanceNow ? planProblem(transferFinance, Number(courses?.find(c => c.courseId === transferForm.destinationCourseId)?.tuitionAmount ?? 0),
            transferTemplates.find(t => t.planId === transferFinance.templatePlanId), transferPeriod(), availableCredit(transferConsumption, transferFinance)) : null);

    // The API carries the transfer out, reports every amount and undoes it again
    const reviewTransfer = async () => {
        const problem = transferStepProblem();
        if (problem) {
            setTransferError(problem);
            return;
        }
        try {
            setTransferSaving(true);
            setTransferError(null);
            setTransferPreview(await api<TransferPreview>('/students', { method: 'POST', body: JSON.stringify({ ...transferBody(), dryRun: true }) }));
            setTransferStep('confirm');
        } catch (err) {
            setTransferError((err as Error).message);
        } finally {
            setTransferSaving(false);
        }
    };

    const confirmAndExecuteTransfer = async () => {
        if (!viewingStudent || !transferringEnrollment || !transferPreview) return;

        try {
            setTransferSaving(true);
            setTransferError(null);

            const res = await api<{ success: boolean; message?: string }>('/students', {
                method: 'POST',
                body: JSON.stringify({ ...transferBody(), reviewed: transferPreview.summary })
            });

            setTransferSuccess(res.message || 'Course transferred successfully!');
            setTransferringEnrollment(null);
            await reloadProfile();
            await reload();
        } catch (err: any) {
            setTransferError(err.message || 'Failed to complete course transfer.');
        } finally {
            setTransferSaving(false);
        }
    };

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
        if (step === 2) {
            handleGuardianNextStep(e);
            return;
        }

        // Validate step 3: Fee Structure & Installment Schedule
        if (feePlanForm.paymentType === 'installment') {
            const problem = registrationProblem();
            if (problem) {
                setFormError(problem);
                return;
            }
            if (feePlanForm.installments.some(inst => !(Number(inst.amount) > 0))) {
                setFormError('Every installment amount must be greater than zero. Reduce the number of installments if fewer are needed.');
                return;
            }
            const totalScheduled = feePlanForm.installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
            if (totalScheduled !== feePlanForm.finalFee) {
                setFormError(`Total installments (₹${totalScheduled.toLocaleString('en-IN')}) must match the final course fee (₹${feePlanForm.finalFee.toLocaleString('en-IN')}). Please balance amounts.`);
                return;
            }
        }

        if (feePlanForm.collectInitialPayment) {
            const initAmt = Number(feePlanForm.initialPaymentAmount);
            if (isNaN(initAmt) || initAmt <= 0) {
                setFormError('Please enter a valid initial payment amount or uncheck initial payment.');
                return;
            }
            if (initAmt > feePlanForm.finalFee) {
                setFormError(`Initial payment cannot exceed final fee (₹${feePlanForm.finalFee.toLocaleString('en-IN')}).`);
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
                    feeStatus: feePlanForm.collectInitialPayment && Number(feePlanForm.initialPaymentAmount) >= feePlanForm.finalFee ? 'paid' : (feePlanForm.finalFee > 0 ? 'pending' : 'none'),
                    feeAmount: feePlanForm.finalFee > 0 ? feePlanForm.finalFee : undefined,
                    feeStructure: {
                        paymentType: feePlanForm.paymentType,
                        courseId: form.courseId || undefined,
                        courseTitle: courses?.find(c => c.courseId === form.courseId)?.title,
                        courseFee: feePlanForm.courseFee,
                        discountAmount: feePlanForm.discountAmount,
                        finalFee: feePlanForm.finalFee,
                        installments: feePlanForm.paymentType === 'installment'
                            ? feePlanForm.installments
                            : [{
                                installmentNumber: 1,
                                dueDate: new Date().toISOString().split('T')[0],
                                amount: feePlanForm.finalFee,
                                designation: 'One-Time Tuition Fee'
                            }],
                        initialPayment: feePlanForm.collectInitialPayment && Number(feePlanForm.initialPaymentAmount) > 0 ? {
                            amount: Number(feePlanForm.initialPaymentAmount),
                            paymentMethod: feePlanForm.initialPaymentMethod,
                            paymentReference: feePlanForm.initialPaymentReference || undefined
                        } : undefined
                    },
                    guardian: guardianForm.mode === 'existing' ? (
                        guardianForm.existingGuardianId ? {
                            mode: 'existing',
                            guardianId: guardianForm.existingGuardianId,
                        } : undefined
                    ) : (
                        guardianForm.firstName.trim() && guardianForm.lastName.trim() ? {
                            mode: 'new',
                            firstName: guardianForm.firstName.trim(),
                            lastName: guardianForm.lastName.trim(),
                            relationship: guardianForm.relationship || 'Parent',
                            email: guardianForm.email.trim().toLowerCase(),
                            phone: formattedGuardianPhone,
                            countryCode: guardianCountry.dialCode,
                            createLogin: guardianForm.createLogin,
                        } : undefined
                    ),
                }),
            });

            closeAddModal();
            reload();
            if (res?.credentials?.password) {
                setCreatedCredentials(res.credentials);
            }
            setActionBanner({ type: 'success', text: `Student ${form.firstName} ${form.lastName} registered successfully with fee plan.` });
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

    const handleEditPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setEditPhotoError('Please select a valid image file (PNG, JPG, WebP).');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setEditPhotoError('Image must be 2 MB or smaller.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result);
            setEditPhotoPreview(dataUrl);
            setEditForm(f => ({ ...f, photo: dataUrl }));
            setEditPhotoError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleEditRemovePhoto = () => {
        setEditPhotoPreview(null);
        setEditForm(f => ({ ...f, photo: '' }));
        setEditPhotoError(null);
        if (editFileInputRef.current) editFileInputRef.current.value = '';
    };

    const startEdit = async (s: Student) => {
        const { country: parsedCountry, digits: parsedDigits } = parseExistingPhone(s.phone);
        setEditingStudent(s);
        editEnrollmentTouched.current = false;
        setEditFeeLocked(false);
        editLoadId.current = s.studentId;
        setEditCountry(parsedCountry);
        setEditPhotoPreview(s.photo || null);
        setEditPhotoError(null);
        if (editFileInputRef.current) editFileInputRef.current.value = '';

        // Match initial batch and course from in-memory batches
        let initialCourseId = '';
        let initialBatchId = '';
        let initialBranchId = s.branchId || workspace?.branches.find(b => b.isPrimary)?.branchId || '';
        let initialFeeAmount = '';

        if (s.batches && batches) {
            const batchNames = s.batches.split(',').map(b => b.trim());
            const matchedBatch = batches.find(b => batchNames.includes(b.name));
            if (matchedBatch) {
                initialBatchId = matchedBatch.batchId;
                initialCourseId = matchedBatch.courseId || '';
                initialBranchId = matchedBatch.branchId || initialBranchId;
                if (matchedBatch.tuitionAmount) initialFeeAmount = String(matchedBatch.tuitionAmount);
            }
        }

        if (initialCourseId && !initialFeeAmount && courses) {
            const matchedCourse = courses.find(c => c.courseId === initialCourseId);
            if (matchedCourse && matchedCourse.tuitionAmount) {
                initialFeeAmount = String(matchedCourse.tuitionAmount);
            }
        }

        setEditForm({
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email || '',
            phone: parsedDigits,
            status: s.status,
            enrollmentNumber: s.enrollmentNumber || '',
            courseId: initialCourseId,
            batchId: initialBatchId,
            branchId: initialBranchId,
            feeStatus: s.feeStatus || 'none',
            feeAmount: initialFeeAmount,
            photo: s.photo || '',
        });
        setEditFieldErrors({});
        setEditTouched({});
        setEditError(null);

        // Fetch detailed profile to populate exact active course, batch, and actual fee
        try {
            const profile = await api<StudentProfileResponse>(`/students?studentId=${s.studentId}`);
            // Another student was opened, or branch/course/batch was already changed by the user
            if (editLoadId.current !== s.studentId) return;
            setEditFeeLocked(Boolean(profile?.invoices?.some((i, n, all) => (n === all.length - 1 && Number(i.paidAmount) > 0) || /^Installment \d+ of \d+/i.test(i.designation || ''))));
            if (profile) {
                if (profile.enrollments && profile.enrollments.length > 0) {
                    const activeEnr = profile.enrollments.find(e => ['enrolled', 'confirmed', 'active', 'approved'].includes(e.status.toLowerCase()));
                    if (activeEnr && !editEnrollmentTouched.current) {
                        const profileFee = profile.feeSummary?.totalFee || activeEnr.oldCourseTotalFee || activeEnr.tuitionAmount || activeEnr.paidAmount || 0;
                        setEditForm(prev => ({
                            ...prev,
                            courseId: activeEnr.courseId || prev.courseId || '',
                            batchId: activeEnr.batchId || prev.batchId || '',
                            branchId: activeEnr.branchId || prev.branchId,
                            feeAmount: profileFee > 0 ? String(profileFee) : prev.feeAmount,
                        }));
                    }
                } else if (profile.feeSummary?.totalFee) {
                    const fee = profile.feeSummary.totalFee;
                    if (fee > 0) {
                        setEditForm(prev => ({
                            ...prev,
                            feeAmount: prev.feeAmount || String(fee),
                        }));
                    }
                }
            }
        } catch {
            // non-critical, fallback to in-memory matches
        }
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
                    photo: editForm.photo !== undefined ? editForm.photo : undefined,
                    enrollmentNumber: editForm.enrollmentNumber ? editForm.enrollmentNumber.trim() : undefined,
                    phone: formattedPhone,
                    batchId: editForm.batchId || undefined,
                    branchId: editForm.branchId || undefined,
                    feeStatus: editFeeLocked ? undefined : editForm.feeStatus,
                    feeAmount: editFeeLocked ? undefined : editForm.feeAmount || undefined,
                }),
            });
            setEditingStudent(null);
            await reload();
            if (viewingStudent && viewingStudent.studentId === editingStudent.studentId) {
                await reloadProfile();
                setViewingStudent(v => v ? {
                    ...v,
                    photo: editForm.photo || null,
                    firstName: editForm.firstName,
                    lastName: editForm.lastName,
                    email: editForm.email
                } : null);
            }
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

                        {/* Action buttons: Completion Queue & Add Student */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setShowCompletionQueue(true)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                    padding: '0 14px',
                                    height: '38px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    borderRadius: '10px',
                                    border: '1px solid #C7D2FE',
                                    background: '#EEF2FF',
                                    color: '#4338CA',
                                    cursor: 'pointer'
                                }}
                            >
                                <Award size={15} />
                                Completion Queue
                            </button>

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
                    </div>

                    {/* Dynamic Filters Bar: Branch, Course, Batch */}
                    <div style={{
                        padding: '12px 20px',
                        background: 'var(--cs-surface-1)',
                        borderBottom: '1px solid var(--cs-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                        fontSize: '12.5px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cs-text-secondary)', fontWeight: 600, fontSize: '12px', marginRight: '2px' }}>
                            <Filter size={14} color="var(--cs-primary)" />
                            <span>Filter by:</span>
                        </div>

                        {/* Branch Filter */}
                        {!branchScoped && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '0 10px',
                                height: '34px',
                                borderRadius: '8px',
                                border: `1px solid ${branchFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-border)'}`,
                                background: branchFilter !== 'all' ? 'rgba(108, 99, 255, 0.05)' : 'var(--cs-surface-2)',
                                transition: 'all 0.15s ease'
                            }}>
                                <Building2 size={13} color={branchFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-muted)'} />
                                <select
                                    value={branchFilter}
                                    onChange={e => handleBranchFilterChange(e.target.value)}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        outline: 'none',
                                        fontSize: '12.5px',
                                        fontWeight: branchFilter !== 'all' ? 600 : 500,
                                        color: branchFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-primary)',
                                        cursor: 'pointer'
                                    }}
                                    aria-label="Filter students by branch"
                                >
                                    <option value="all">All Branches</option>
                                    {availableBranchesList.map(b => (
                                        <option key={b.branchId} value={b.branchId}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Course Filter */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0 10px',
                            height: '34px',
                            borderRadius: '8px',
                            border: `1px solid ${courseFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-border)'}`,
                            background: courseFilter !== 'all' ? 'rgba(108, 99, 255, 0.05)' : 'var(--cs-surface-2)',
                            transition: 'all 0.15s ease'
                        }}>
                            <GraduationCap size={13} color={courseFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-muted)'} />
                            <select
                                value={courseFilter}
                                onChange={e => handleCourseFilterChange(e.target.value)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    outline: 'none',
                                    fontSize: '12.5px',
                                    fontWeight: courseFilter !== 'all' ? 600 : 500,
                                    color: courseFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-primary)',
                                    cursor: 'pointer'
                                }}
                                aria-label="Filter students by course"
                            >
                                <option value="all">
                                    {branchFilter !== 'all'
                                        ? `All Courses (${dynamicCourses.length} in Branch)`
                                        : 'All Courses'}
                                </option>
                                {dynamicCourses.map(c => (
                                    <option key={c.courseId} value={c.courseId}>
                                        {c.title} ({c.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Batch Filter */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0 10px',
                            height: '34px',
                            borderRadius: '8px',
                            border: `1px solid ${batchFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-border)'}`,
                            background: batchFilter !== 'all' ? 'rgba(108, 99, 255, 0.05)' : 'var(--cs-surface-2)',
                            transition: 'all 0.15s ease'
                        }}>
                            <CalendarIcon size={13} color={batchFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-muted)'} />
                            <select
                                value={batchFilter}
                                onChange={e => handleBatchFilterChange(e.target.value)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    outline: 'none',
                                    fontSize: '12.5px',
                                    fontWeight: batchFilter !== 'all' ? 600 : 500,
                                    color: batchFilter !== 'all' ? 'var(--cs-primary)' : 'var(--cs-text-primary)',
                                    cursor: 'pointer'
                                }}
                                aria-label="Filter students by batch"
                            >
                                <option value="all">
                                    {courseFilter !== 'all'
                                        ? `All Batches (${dynamicBatches.length} in Course)`
                                        : branchFilter !== 'all'
                                            ? `All Batches (${dynamicBatches.length} in Branch)`
                                            : 'All Batches'}
                                </option>
                                {dynamicBatches.map(b => (
                                    <option key={b.batchId} value={b.batchId}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Active filter count & Reset button */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                style={{
                                    border: '1px solid #FECACA',
                                    background: '#FEF2F2',
                                    color: '#DC2626',
                                    borderRadius: '8px',
                                    padding: '0 10px',
                                    height: '32px',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.15s ease',
                                    marginLeft: 'auto'
                                }}
                                title="Reset branch, course, and batch filters"
                            >
                                <X size={13} />
                                Clear Filters
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
                                                    {hasActiveFilters
                                                        ? 'No students found matching the selected branch, course, or batch filters.'
                                                        : 'No students found matching your search or filter.'}
                                                </div>
                                                {hasActiveFilters ? (
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        onClick={clearFilters}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                    >
                                                        <X size={14} /> Clear Active Filters
                                                    </button>
                                                ) : can(session, 'students.write') && (
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
                                                        <div
                                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                                                            onClick={() => openProfile(s)}
                                                            title={`View Profile: ${name}`}
                                                        >
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
                                                                <div
                                                                    style={{ fontWeight: 800, fontSize: '14px', color: 'var(--cs-text-primary)', letterSpacing: '-0.01em', transition: 'color 0.15s ease' }}
                                                                    onMouseEnter={e => (e.currentTarget.style.color = '#6C63FF')}
                                                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--cs-text-primary)')}
                                                                >
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
                                                                Array.from(new Set(s.batches.split(/,\s*/).map(b => b.trim()).filter(Boolean))).map((b, idx) => (
                                                                    <span
                                                                        key={`${b}-${idx}`}
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
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => openProfile(s)}
                                                                title={`View Profile: ${name}`}
                                                                style={{
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    padding: 0,
                                                                    borderRadius: '8px',
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
                                                                aria-label={`View Profile: ${name}`}
                                                            >
                                                                <Eye size={13} />
                                                            </button>
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
                                                        </div>
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

            {/* Add Student Modal (3-Step Registration) */}
            {showAdd && (
                <Modal title="Add Student" onClose={closeAddModal} maxWidth="720px" style={{ padding: '20px 24px', maxHeight: '90vh', overflowY: 'auto' }}>
                    {/* 3-Step Progress Indicator (Static Single Row, Non-Scrollable) */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        flexWrap: 'nowrap',
                        width: '100%',
                        userSelect: 'none',
                        overflow: 'hidden'
                    }}>
                        <button
                            type="button"
                            onClick={() => { setFormError(null); setStep(1); }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '16px',
                                background: step === 1 ? '#EEF2FF' : '#ECFDF5',
                                color: step === 1 ? '#4F46E5' : '#059669',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                border: step === 1 ? '1px solid #C7D2FE' : '1px solid #A7F3D0',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: step > 1 ? '#059669' : '#4F46E5',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                flexShrink: 0
                            }}>
                                {step > 1 ? '✓' : '1'}
                            </span>
                            Step 1: Student Details
                        </button>

                        <div style={{ width: 16, height: 2, background: step > 1 ? '#059669' : '#E2E8F0', flexShrink: 0 }} />

                        <button
                            type="button"
                            onClick={() => {
                                if (step === 1) handleNextStep();
                                else { setFormError(null); setStep(2); }
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '16px',
                                background: step === 2 ? '#EEF2FF' : (step > 2 ? '#ECFDF5' : '#F1F5F9'),
                                color: step === 2 ? '#4F46E5' : (step > 2 ? '#059669' : '#64748B'),
                                fontSize: '11.5px',
                                fontWeight: 600,
                                border: step === 2 ? '1px solid #C7D2FE' : (step > 2 ? '1px solid #A7F3D0' : '1px solid #E2E8F0'),
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: step > 2 ? '#059669' : (step === 2 ? '#4F46E5' : '#94A3B8'),
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                flexShrink: 0
                            }}>
                                {step > 2 ? '✓' : '2'}
                            </span>
                            Step 2: Guardian Details
                        </button>

                        <div style={{ width: 16, height: 2, background: step > 2 ? '#059669' : '#E2E8F0', flexShrink: 0 }} />

                        <button
                            type="button"
                            onClick={() => {
                                if (step === 1) handleNextStep();
                                else if (step === 2) handleGuardianNextStep();
                                else { setFormError(null); setStep(3); }
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '16px',
                                background: step === 3 ? '#EEF2FF' : '#F1F5F9',
                                color: step === 3 ? '#4F46E5' : '#64748B',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                border: step === 3 ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: step === 3 ? '#4F46E5' : '#94A3B8',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                flexShrink: 0
                            }}>
                                3
                            </span>
                            Step 3: Fee Structure
                        </button>
                    </div>

                    <form onSubmit={step === 1 ? handleNextStep : (step === 2 ? handleGuardianNextStep : submit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                        {step === 1 && (
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
                                            const branchCourses = filterCourses(courses, batches, activeBranch);
                                            const placeholder = !courses
                                                ? 'Loading courses…'
                                                : branchCourses.length > 0
                                                    ? '— Select a course (optional) —'
                                                    : '— No courses available for this branch —';
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
                                        disabled={!form.courseId}
                                        onChange={e => {
                                            const bId = e.target.value;
                                            setForm(f => ({
                                                ...f,
                                                batchId: bId,
                                            }));
                                        }}
                                        style={{
                                            opacity: !form.courseId ? 0.65 : 1,
                                            cursor: !form.courseId ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {(() => {
                                            const activeBranch = form.branchId || session?.selectedBranchId || workspace?.branches.find(br => br.isPrimary)?.branchId;

                                            if (!form.courseId) {
                                                return (
                                                    <option value="">— Select a course first to view batches —</option>
                                                );
                                            }

                                            const filteredBatches = filterBatches(batches, activeBranch, form.courseId);

                                            const placeholder = !batches
                                                ? 'Loading batches…'
                                                : filteredBatches.length > 0
                                                    ? '— Select a batch (optional) —'
                                                    : '— No batches available for this course in this branch —';

                                            return (
                                                <>
                                                    <option value="">{placeholder}</option>
                                                    {filteredBatches.map(b => (
                                                        <option key={b.batchId} value={b.batchId}>
                                                            {b.name}{b.capacity ? ` (Cap: ${b.enrolledCount || 0}/${b.capacity})` : ''}
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
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
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
                        )}

                        {step === 2 && (
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

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
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
                                            type="button"
                                            className="btn-primary"
                                            onClick={handleGuardianNextStep}
                                            disabled={saving}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            Next: Fee Structure <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                {/* Step 3: Fee Structure Header Card */}
                                <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 600 }}>Enrolled Course</div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <BookOpen size={15} color="#4F46E5" />
                                            {courses?.find(c => c.courseId === form.courseId)?.title || 'General Admission / Custom'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 600 }}>Standard Tuition Fee</div>
                                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#4F46E5' }}>
                                            ₹{feePlanForm.courseFee.toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Plan Options: One-Time vs Installment */}
                                <div>
                                    <label className="cs-label" style={{ marginBottom: '6px', display: 'block' }}>Payment Option</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <label style={{
                                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                                            borderRadius: '8px', cursor: 'pointer',
                                            border: feePlanForm.paymentType === 'one_time' ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                                            background: feePlanForm.paymentType === 'one_time' ? '#EEF2FF' : '#FFFFFF',
                                            transition: 'all 0.15s ease'
                                        }}>
                                            <input
                                                type="radio"
                                                name="paymentType"
                                                checked={feePlanForm.paymentType === 'one_time'}
                                                onChange={() => setFeePlanForm(prev => ({ ...prev, paymentType: 'one_time' }))}
                                                style={{ accentColor: '#4F46E5' }}
                                            />
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>One-Time Payment</div>
                                                <div style={{ fontSize: '11px', color: '#64748B' }}>Pay full course fee in a single invoice</div>
                                            </div>
                                        </label>

                                        <label style={{
                                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                                            borderRadius: '8px', cursor: 'pointer',
                                            border: feePlanForm.paymentType === 'installment' ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                                            background: feePlanForm.paymentType === 'installment' ? '#EEF2FF' : '#FFFFFF',
                                            transition: 'all 0.15s ease'
                                        }}>
                                            <input
                                                type="radio"
                                                name="paymentType"
                                                checked={feePlanForm.paymentType === 'installment'}
                                                onChange={() => setFeePlanForm(prev => {
                                                    const insts = calculateInstallments(prev.finalFee, prev.installmentCount, prev.installmentFrequency);
                                                    return { ...prev, paymentType: 'installment', installmentCount: insts.length, installments: insts };
                                                })}
                                                style={{ accentColor: '#4F46E5' }}
                                            />
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>Installment Payment</div>
                                                <div style={{ fontSize: '11px', color: '#64748B' }}>Split course fee into scheduled installments</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Fee & Discount Breakdown */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label className="cs-label">Course Fee (₹)</label>
                                        <input
                                            className="cs-input"
                                            type="number"
                                            min="0"
                                            value={feePlanForm.courseFee}
                                            onChange={e => {
                                                const fee = Number(e.target.value) || 0;
                                                setFeePlanForm(prev => {
                                                    const finalFee = Math.max(0, fee - prev.discountAmount);
                                                    const insts = calculateInstallments(finalFee, prev.installmentCount, prev.installmentFrequency);
                                                    return { ...prev, courseFee: fee, finalFee, installments: insts };
                                                });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="cs-label">Discount (₹)</label>
                                        <input
                                            className="cs-input"
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={feePlanForm.discountAmount || ''}
                                            onChange={e => {
                                                const disc = Number(e.target.value) || 0;
                                                setFeePlanForm(prev => {
                                                    const finalFee = Math.max(0, prev.courseFee - disc);
                                                    const insts = calculateInstallments(finalFee, prev.installmentCount, prev.installmentFrequency);
                                                    return { ...prev, discountAmount: disc, finalFee, installments: insts };
                                                });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="cs-label">Final Payable Fee (₹)</label>
                                        <input
                                            className="cs-input"
                                            type="number"
                                            disabled
                                            value={feePlanForm.finalFee}
                                            style={{ background: '#F1F5F9', fontWeight: 700, color: '#1E293B' }}
                                        />
                                    </div>
                                </div>

                                {/* If Installment Payment is selected: Installment Controls & Schedule Table */}
                                {feePlanForm.paymentType === 'installment' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                                            <div>
                                                <label className="cs-label">Number of Installments</label>
                                                <select
                                                    className="cs-input"
                                                    value={feePlanForm.installmentCount}
                                                    onChange={e => {
                                                        const count = Number(e.target.value);
                                                        setFeePlanForm(prev => {
                                                            if (prev.installmentFrequency === 'custom') {
                                                                const existing = prev.installments;
                                                                const safeCount = Math.max(1, count);
                                                                const equalShare = Math.floor(prev.finalFee / safeCount);
                                                                const remainder = prev.finalFee - (equalShare * safeCount);
                                                                const firstDue = registrationPeriod()?.firstDueDate ?? dateInDays();
                                                                // Dates already chosen are kept while the others still fit after them
                                                                const chosen = existing.slice(0, safeCount).map(i => i.dueDate);
                                                                const planned = installmentDates(registrationPeriod(), firstDue, safeCount, 'custom');
                                                                const kept = planned.map((d, idx) => chosen[idx] || d);
                                                                const dates = scheduleProblem(registrationPeriod(), kept) ? planned : kept;
                                                                const newInsts = Array.from({ length: safeCount }, (_, idx) => {
                                                                    const old = existing[idx];
                                                                    return {
                                                                        installmentNumber: idx + 1,
                                                                        dueDate: dates[idx],
                                                                        amount: idx === safeCount - 1 ? equalShare + remainder : equalShare,
                                                                        designation: old?.designation || `Installment ${idx + 1} of ${safeCount}`
                                                                    };
                                                                });
                                                                return {
                                                                    ...prev,
                                                                    installmentCount: count,
                                                                    installments: newInsts
                                                                };
                                                            }
                                                            const installments = calculateInstallments(prev.finalFee, count, prev.installmentFrequency);
                                                            return { ...prev, installmentCount: installments.length, installments };
                                                        });
                                                    }}
                                                >
                                                    {[...new Set([1, 2, 3, 4, 6, 12, registrationLimit(feePlanForm.installmentFrequency) ?? 1, feePlanForm.installmentCount])]
                                                        .filter(n => n <= (registrationLimit(feePlanForm.installmentFrequency) ?? 36)).sort((a, b) => a - b)
                                                        .map(n => <option key={n} value={n}>{n} Installment{n > 1 ? 's' : ''}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="cs-label">Installment Frequency</label>
                                                <select
                                                    className="cs-input"
                                                    value={feePlanForm.installmentFrequency}
                                                    onChange={e => {
                                                        const freq = e.target.value as any;
                                                        setFeePlanForm(prev => {
                                                            const installments = calculateInstallments(prev.finalFee, prev.installmentCount, freq);
                                                            return { ...prev, installmentFrequency: freq, installmentCount: installments.length, installments };
                                                        });
                                                    }}
                                                >
                                                    {frequencyChoices(registrationPeriod(), registrationPeriod()?.firstDueDate ?? dateInDays()).map(f => (
                                                        <option key={f.value} value={f.value === 'every_2_months' ? 'bi_monthly' : f.value} disabled={f.disabled}>{f.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={() => {
                                                    setFeePlanForm(prev => {
                                                        if (prev.installmentFrequency === 'custom') {
                                                            const safeCount = Math.max(1, prev.installments.length);
                                                            const equalShare = Math.floor(prev.finalFee / safeCount);
                                                            const remainder = prev.finalFee - (equalShare * safeCount);
                                                            return {
                                                                ...prev,
                                                                installments: prev.installments.map((item, idx) => ({
                                                                    ...item,
                                                                    amount: idx === safeCount - 1 ? equalShare + remainder : equalShare
                                                                }))
                                                            };
                                                        }
                                                        return {
                                                            ...prev,
                                                            installments: calculateInstallments(prev.finalFee, prev.installmentCount, prev.installmentFrequency)
                                                        };
                                                    });
                                                }}
                                                style={{ height: '36px', fontSize: '12px' }}
                                            >
                                                Auto-Split Evenly
                                            </button>
                                        </div>

                                        {registrationPeriod()?.startDate && (
                                            <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)' }}>
                                                Course {formatDate(registrationPeriod()!.startDate)} – {registrationPeriod()!.lastDueDate ? formatDate(registrationPeriod()!.lastDueDate) : 'no end date'}
                                                {registrationPeriod()!.durationMonths ? ` (${registrationPeriod()!.durationMonths} months)` : ''}
                                                {registrationLimit(feePlanForm.installmentFrequency) ? `; up to ${registrationLimit(feePlanForm.installmentFrequency)} installments fit` : ''}
                                            </div>
                                        )}
                                        {registrationProblem() && (
                                            <div role="alert" style={{ padding: '8px 12px', borderRadius: '6px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <AlertCircle size={14} style={{ flexShrink: 0 }} /> {registrationProblem()}
                                            </div>
                                        )}

                                        {/* Custom Due Dates Section (shown when Frequency is Custom) */}
                                        {feePlanForm.installmentFrequency === 'custom' && (
                                            <div style={{
                                                padding: '12px 14px',
                                                background: '#F0FDF4',
                                                border: '1px solid #BBF7D0',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <CalendarIcon size={14} color="#16A34A" /> Choose Custom Installment Due Dates
                                                    </div>
                                                    <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 500 }}>
                                                        Set specific due dates for each installment below
                                                    </span>
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                                    gap: '8px'
                                                }}>
                                                    {feePlanForm.installments.map((inst, idx) => (
                                                        <div key={idx} style={{ background: '#FFFFFF', padding: '6px 8px', borderRadius: '6px', border: '1px solid #DCFCE7' }}>
                                                            <label className="cs-label" style={{ fontSize: '11px', marginBottom: '3px', color: '#166534', fontWeight: 600 }}>
                                                                Installment {idx + 1} Date <span style={{ color: '#EF4444' }}>*</span>
                                                            </label>
                                                            <input
                                                                type="date"
                                                                className="cs-input"
                                                                min={registrationPeriod()?.startDate ?? undefined}
                                                                max={registrationPeriod()?.lastDueDate ?? undefined}
                                                                value={inst.dueDate}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setFeePlanForm(prev => ({
                                                                        ...prev,
                                                                        installments: prev.installments.map((item, i) => i === idx ? { ...item, dueDate: val } : item)
                                                                    }));
                                                                }}
                                                                style={{ height: '30px', fontSize: '12px', background: '#F8FAFC', borderColor: '#86EFAC' }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Installments Table */}
                                        <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#FFFFFF' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                <thead>
                                                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                                                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569', width: '30px' }}>#</th>
                                                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Installment Name</th>
                                                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Due Date</th>
                                                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Amount (₹)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {feePlanForm.installments.map((inst, idx) => (
                                                        <tr key={idx} style={{ borderBottom: idx < feePlanForm.installments.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                                                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#64748B' }}>{inst.installmentNumber}</td>
                                                            <td style={{ padding: '8px 12px' }}>
                                                                <input
                                                                    className="cs-input"
                                                                    value={inst.designation || `Installment ${inst.installmentNumber} of ${feePlanForm.installments.length}`}
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        setFeePlanForm(prev => ({
                                                                            ...prev,
                                                                            installments: prev.installments.map((item, i) => i === idx ? { ...item, designation: val } : item)
                                                                        }));
                                                                    }}
                                                                    style={{ height: '30px', fontSize: '12px' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '8px 12px' }}>
                                                                <input
                                                                    className="cs-input"
                                                                    type="date"
                                                                    min={registrationPeriod()?.startDate ?? undefined}
                                                                max={registrationPeriod()?.lastDueDate ?? undefined}
                                                                value={inst.dueDate}
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        setFeePlanForm(prev => ({
                                                                            ...prev,
                                                                            installments: prev.installments.map((item, i) => i === idx ? { ...item, dueDate: val } : item)
                                                                        }));
                                                                    }}
                                                                    style={{ height: '30px', fontSize: '12px' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                                                <input
                                                                    className="cs-input"
                                                                    type="number"
                                                                    min="0"
                                                                    value={inst.amount}
                                                                    onChange={e => {
                                                                        const val = Number(e.target.value) || 0;
                                                                        // The rest of the fee moves to the installments after this one
                                                                        setFeePlanForm(prev => {
                                                                            const amounts = splitRemaining(prev.installments.map(item => Number(item.amount) || 0), idx, val, prev.finalFee);
                                                                            const followsFirst = idx === 0 && prev.initialPaymentAmount === String(prev.installments[0]?.amount ?? '');
                                                                            return {
                                                                                ...prev,
                                                                                installments: prev.installments.map((item, i) => ({ ...item, amount: amounts[i] })),
                                                                                initialPaymentAmount: followsFirst ? String(amounts[0]) : prev.initialPaymentAmount
                                                                            };
                                                                        });
                                                                    }}
                                                                    style={{ height: '30px', fontSize: '12px', textAlign: 'right', width: '110px' }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Validation summary bar */}
                                        {(() => {
                                            const scheduledTotal = feePlanForm.installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
                                            const diff = feePlanForm.finalFee - scheduledTotal;
                                            const isValid = diff === 0;
                                            return (
                                                <div style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '8px 12px', borderRadius: '6px',
                                                    background: isValid ? '#ECFDF5' : '#FEF2F2',
                                                    border: `1px solid ${isValid ? '#A7F3D0' : '#FECACA'}`,
                                                    fontSize: '12px', color: isValid ? '#065F46' : '#991B1B'
                                                }}>
                                                    <div>
                                                        Total Scheduled: <strong>₹{scheduledTotal.toLocaleString('en-IN')}</strong> / Target: <strong>₹{feePlanForm.finalFee.toLocaleString('en-IN')}</strong>
                                                        {!isValid && (
                                                            <span style={{ marginLeft: '8px' }}>
                                                                ({diff > 0 ? `₹${diff.toLocaleString('en-IN')} unallocated` : `₹${Math.abs(diff).toLocaleString('en-IN')} over allocated`})
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isValid ? (
                                                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <CheckCircle size={14} /> Schedule Balanced
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontWeight: 600 }}>Must match total course fee</span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Initial Payment Collection (Optional) */}
                                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={feePlanForm.collectInitialPayment}
                                            onChange={e => setFeePlanForm(prev => ({
                                                ...prev,
                                                collectInitialPayment: e.target.checked,
                                                initialPaymentAmount: prev.paymentType === 'installment' && prev.installments.length > 0
                                                    ? String(prev.installments[0].amount)
                                                    : String(prev.finalFee)
                                            }))}
                                            style={{ width: '16px', height: '16px', accentColor: '#4F46E5' }}
                                        />
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>Record Initial Payment Now</div>
                                            <div style={{ fontSize: '11px', color: '#64748B' }}>Only collect if academy has actually received the money (generates payment receipt)</div>
                                        </div>
                                    </label>

                                    {feePlanForm.collectInitialPayment && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                                            <div>
                                                <label className="cs-label">Amount Received (₹) <span style={{ color: '#EF4444' }}>*</span></label>
                                                <input
                                                    className="cs-input"
                                                    type="number"
                                                    min="1"
                                                    max={feePlanForm.finalFee}
                                                    value={feePlanForm.initialPaymentAmount}
                                                    onChange={e => setFeePlanForm(prev => ({ ...prev, initialPaymentAmount: e.target.value }))}
                                                />
                                            </div>
                                            <div>
                                                <label className="cs-label">Payment Method <span style={{ color: '#EF4444' }}>*</span></label>
                                                <select
                                                    className="cs-input"
                                                    value={feePlanForm.initialPaymentMethod}
                                                    onChange={e => setFeePlanForm(prev => ({ ...prev, initialPaymentMethod: e.target.value }))}
                                                >
                                                    <option value="Cash">Cash</option>
                                                    <option value="UPI">UPI</option>
                                                    <option value="Bank Transfer">Bank Transfer</option>
                                                    <option value="Cheque">Cheque</option>
                                                    <option value="Razorpay">Razorpay</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="cs-label">Reference / Cheque No.</label>
                                                <input
                                                    className="cs-input"
                                                    placeholder="e.g. TXN-12345 / Cheque #004"
                                                    value={feePlanForm.initialPaymentReference}
                                                    onChange={e => setFeePlanForm(prev => ({ ...prev, initialPaymentReference: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                    )}
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

                                {/* Action Buttons for Step 3 */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={handlePreviousStep}
                                        disabled={saving}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <ArrowLeft size={14} /> Back: Guardian Details
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
                                            {saving ? 'Completing Registration…' : (
                                                <>
                                                    <CheckCircle size={15} /> Complete Registration &amp; Enroll
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </form>
                </Modal>
            )}

            {/* Student Profile Modal */}
            {viewingStudent && (
                <Modal
                    title={`Student Profile: ${viewingStudent.firstName} ${viewingStudent.lastName}`}
                    onClose={() => { setViewingStudent(null); setShowAddCourse(false); setAddCourseError(null); setAddCourseSuccess(null); }}
                    maxWidth="840px"
                    style={{ padding: '22px 26px', maxHeight: '90vh', overflowY: 'auto' }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* Student Header Card */}
                        <div style={{
                            background: 'var(--cs-surface-1)',
                            border: '1px solid var(--cs-border)',
                            borderRadius: '12px',
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '14px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                {viewingStudent.photo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={viewingStudent.photo}
                                        alt={`${viewingStudent.firstName} ${viewingStudent.lastName}`}
                                        style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(108, 99, 255, 0.3)' }}
                                    />
                                ) : (
                                    <div style={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #6C63FF 0%, #8B5CF6 100%)',
                                        color: '#ffffff',
                                        fontSize: '18px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 3px 8px rgba(108, 99, 255, 0.25)'
                                    }}>
                                        {initials(`${viewingStudent.firstName} ${viewingStudent.lastName}`)}
                                    </div>
                                )}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--cs-text-primary)', margin: 0 }}>
                                            {viewingStudent.firstName} {viewingStudent.lastName}
                                        </h2>
                                        <code style={{ fontSize: '12px', background: 'var(--cs-surface-2)', padding: '2px 7px', borderRadius: '6px', color: 'var(--cs-text-secondary)', fontWeight: 700, border: '1px solid var(--cs-border)' }}>
                                            {viewingStudent.enrollmentNumber}
                                        </code>
                                        <span className={statusConfig[viewingStudent.status]?.cls || 'badge-secondary'} style={{ fontSize: '11.5px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
                                            {statusConfig[viewingStudent.status]?.label || viewingStudent.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', flexWrap: 'wrap', fontSize: '12.5px', color: 'var(--cs-text-secondary)' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={13} color="var(--cs-primary)" />
                                            {viewingStudent.branchName || 'Main Campus'}
                                        </span>
                                        {viewingStudent.email && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <Mail size={13} color="var(--cs-primary)" />
                                                {viewingStudent.email}
                                            </span>
                                        )}
                                        {viewingStudent.phone && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <Phone size={13} color="var(--cs-primary)" />
                                                {viewingStudent.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {can(session, 'students.write') && (
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    onClick={() => {
                                        const cur = viewingStudent;
                                        setViewingStudent(null);
                                        startEdit(cur);
                                    }}
                                    style={{
                                        fontSize: '12.5px',
                                        fontWeight: 600,
                                        padding: '7px 14px',
                                        border: '1px solid var(--cs-border)',
                                        borderRadius: '8px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Pencil size={13} /> Edit Profile
                                </button>
                            )}
                        </div>

                        {/* Success / Error Banners */}
                        {addCourseSuccess && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#065F46',
                                fontSize: '13px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle size={16} color="#059669" />
                                    {addCourseSuccess}
                                </span>
                                <button type="button" onClick={() => setAddCourseSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065F46' }}>
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {transferSuccess && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#065F46',
                                fontSize: '13px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle size={16} color="#059669" />
                                    {transferSuccess}
                                </span>
                                <button type="button" onClick={() => setTransferSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065F46' }}>
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {addCourseError && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                color: '#991B1B',
                                fontSize: '13px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={16} color="#DC2626" />
                                    {addCourseError}
                                </span>
                                <button type="button" onClick={() => setAddCourseError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}>
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {transferError && !transferringEnrollment && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                color: '#991B1B',
                                fontSize: '13px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={16} color="#DC2626" />
                                    {transferError}
                                </span>
                                <button type="button" onClick={() => setTransferError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}>
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {/* Course Enrollments Section Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BookOpen size={18} color="var(--cs-primary)" />
                                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--cs-text-primary)', margin: 0 }}>
                                    Enrolled Courses & Batches
                                </h3>
                                <span style={{
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: 'rgba(108, 99, 255, 0.1)',
                                    color: 'var(--cs-primary)'
                                }}>
                                    {profileData?.enrollments?.length ?? 0}
                                </span>
                            </div>

                            {can(session, 'students.write') && !showAddCourse && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddCourse(true);
                                        setAddCourseError(null);
                                        setAddCourseSuccess(null);
                                        setAddCourseForm({
                                            branchId: viewingStudent.branchId || availableBranchesList[0]?.branchId || '',
                                            courseId: '',
                                            batchId: '',
                                            enrollmentDate: new Date().toISOString().split('T')[0],
                                            feePlanId: '',
                                            feeStatus: 'pending',
                                            feeAmount: '',
                                        });
                                    }}
                                    className="btn-primary"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '7px 14px',
                                        fontSize: '12.5px',
                                        fontWeight: 600,
                                        borderRadius: '8px'
                                    }}
                                >
                                    <Plus size={14} /> Add Course
                                </button>
                            )}
                        </div>

                        {/* Add Course Form (Collapsible) */}
                        {showAddCourse && (
                            <div style={{
                                background: 'rgba(108, 99, 255, 0.03)',
                                border: '1.5px solid rgba(108, 99, 255, 0.35)',
                                borderRadius: '12px',
                                padding: '18px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '14px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--cs-text-primary)' }}>
                                            Enroll in Additional Course
                                        </div>
                                        <p style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', margin: '2px 0 0 0' }}>
                                            Select branch, course and available batch to enroll student ({viewingStudent.enrollmentNumber}). Previous enrollments will remain active.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddCourse(false)}
                                        className="btn-ghost"
                                        style={{ padding: '4px 8px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <X size={14} /> Cancel
                                    </button>
                                </div>

                                <form onSubmit={submitAddCourse} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {/* Branch Selection */}
                                        <div>
                                            <label className="cs-label">Branch <span style={{ color: '#EF4444' }}>*</span></label>
                                            <select
                                                className="cs-input"
                                                value={addCourseForm.branchId}
                                                onChange={e => handleAddCourseBranchChange(e.target.value)}
                                                required
                                            >
                                                <option value="" disabled>Select Branch</option>
                                                {availableBranchesList.map(b => (
                                                    <option key={b.branchId} value={b.branchId}>
                                                        {b.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Course Selection */}
                                        <div>
                                            <label className="cs-label">Course <span style={{ color: '#EF4444' }}>*</span></label>
                                            <select
                                                className="cs-input"
                                                value={addCourseForm.courseId}
                                                onChange={e => handleAddCourseCourseChange(e.target.value)}
                                                required
                                                disabled={!addCourseForm.branchId}
                                            >
                                                <option value="" disabled>
                                                    {!addCourseForm.branchId ? 'Select a branch first' : 'Select Course'}
                                                </option>
                                                {filterCourses(courses, batches, addCourseForm.branchId).map(c => {
                                                    const isEnrolled = profileData?.enrollments?.some(e =>
                                                        e.courseId === c.courseId &&
                                                        ['enrolled', 'confirmed', 'active', 'approved'].includes(e.status?.toLowerCase())
                                                    );
                                                    return (
                                                        <option key={c.courseId} value={c.courseId} disabled={isEnrolled}>
                                                            {c.title} ({c.code}){c.tuitionAmount ? ` — ${formatMoney(c.tuitionAmount)}` : ''}{isEnrolled ? ' (Already Enrolled)' : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            {addCourseForm.courseId && profileData?.enrollments?.some(e => e.courseId === addCourseForm.courseId && ['enrolled', 'confirmed', 'active', 'approved'].includes(e.status?.toLowerCase())) && (
                                                <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                                                    Student is already actively enrolled in this course.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {/* Batch Selection */}
                                        <div>
                                            <label className="cs-label">Batch <span style={{ color: '#EF4444' }}>*</span></label>
                                            <select
                                                className="cs-input"
                                                value={addCourseForm.batchId}
                                                onChange={e => handleAddCourseBatchChange(e.target.value)}
                                                required
                                                disabled={!addCourseForm.courseId}
                                            >
                                                <option value="" disabled>
                                                    {!addCourseForm.courseId ? 'Select a course first' : 'Select Batch'}
                                                </option>
                                                {filterBatches(batches, addCourseForm.branchId, addCourseForm.courseId).map(b => {
                                                    const cap = b.capacity || 25;
                                                    const enrolled = b.enrolledCount ?? 0;
                                                    const isFull = enrolled >= cap;
                                                    return (
                                                        <option key={b.batchId} value={b.batchId} disabled={isFull}>
                                                            {b.name} ({enrolled}/{cap} seats){isFull ? ' — FULL' : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        {/* Enrollment Date */}
                                        <div>
                                            <label className="cs-label">Enrollment Date <span style={{ color: '#EF4444' }}>*</span></label>
                                            <input
                                                type="date"
                                                className="cs-input"
                                                value={addCourseForm.enrollmentDate}
                                                onChange={e => setAddCourseForm(f => ({ ...f, enrollmentDate: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {/* Fee Plan Selection */}
                                        <div>
                                            <label className="cs-label">Fee Plan</label>
                                            <select
                                                className="cs-input"
                                                value={addCourseForm.feePlanId}
                                                onChange={e => handleAddCourseFeePlanChange(e.target.value)}
                                            >
                                                <option value="">Standard Course Tuition</option>
                                                {feeStructure?.feePlans?.filter(p => {
                                                    if (p.isActive === false) return false;
                                                    if (!p.courseId) return true;
                                                    return p.courseId === addCourseForm.courseId;
                                                }).map(p => (
                                                    <option key={p.planId} value={p.planId}>
                                                        {p.name} {p.discountPercent ? `(${p.discountPercent}% off)` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Fee Status */}
                                        <div>
                                            <label className="cs-label">Initial Invoice / Fee</label>
                                            <select
                                                className="cs-input"
                                                value={addCourseForm.feeStatus}
                                                onChange={e => setAddCourseForm(f => ({ ...f, feeStatus: e.target.value }))}
                                            >
                                                <option value="pending">Generate Pending Invoice (Default)</option>
                                                <option value="paid">Mark as Paid (Generate Receipt)</option>
                                                <option value="none">No Initial Invoice / Waived</option>
                                            </select>
                                        </div>
                                    </div>

                                    {addCourseForm.feeStatus !== 'none' && addCourseForm.feeAmount && (
                                        <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', background: 'var(--cs-surface-1)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--cs-border)' }}>
                                            Tuition Amount: <strong style={{ color: 'var(--cs-text-primary)' }}>{formatMoney(Number(addCourseForm.feeAmount))}</strong>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                                        <button
                                            type="button"
                                            className="btn-ghost"
                                            onClick={() => setShowAddCourse(false)}
                                            disabled={addCourseSaving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn-primary"
                                            disabled={addCourseSaving || Boolean(addCourseForm.courseId && profileData?.enrollments?.some(e => e.courseId === addCourseForm.courseId && ['enrolled', 'confirmed', 'active', 'approved'].includes(e.status?.toLowerCase())))}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            {addCourseSaving ? (
                                                <>Enrolling...</>
                                            ) : (
                                                <>
                                                    <Check size={14} /> Enroll in Course
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Status filter tabs: All, Active, Completed, Transferred */}
                        {profileData?.enrollments && profileData.enrollments.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                                {[
                                    { key: 'all', label: 'All Courses', count: profileData.enrollments.length },
                                    { key: 'active', label: 'Active', count: profileData.enrollments.filter(e => ['enrolled', 'confirmed', 'active', 'approved'].includes(e.status?.toLowerCase())).length },
                                    { key: 'completed', label: 'Completed', count: profileData.enrollments.filter(e => e.status?.toLowerCase() === 'completed').length },
                                    { key: 'transferred', label: 'Transferred', count: profileData.enrollments.filter(e => e.status?.toLowerCase() === 'transferred').length }
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setEnrollmentFilterTab(tab.key as any)}
                                        style={{
                                            border: '1px solid',
                                            borderColor: enrollmentFilterTab === tab.key ? 'var(--cs-primary)' : 'var(--cs-border)',
                                            background: enrollmentFilterTab === tab.key ? 'rgba(108, 99, 255, 0.08)' : 'var(--cs-surface-1)',
                                            color: enrollmentFilterTab === tab.key ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                            fontWeight: enrollmentFilterTab === tab.key ? 700 : 500,
                                            fontSize: '12px',
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                    >
                                        <span>{tab.label}</span>
                                        <span style={{
                                            fontSize: '10.5px',
                                            background: enrollmentFilterTab === tab.key ? 'var(--cs-primary)' : 'var(--cs-surface-2)',
                                            color: enrollmentFilterTab === tab.key ? '#fff' : 'var(--cs-text-muted)',
                                            padding: '1px 5px',
                                            borderRadius: '10px'
                                        }}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Enrollments Table */}
                        <div style={{
                            background: 'var(--cs-surface-1)',
                            border: '1px solid var(--cs-border)',
                            borderRadius: '12px',
                            overflow: 'hidden'
                        }}>
                            {(!profileData || profileData.enrollments.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--cs-text-muted)' }}>
                                    <GraduationCap size={32} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
                                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--cs-text-secondary)' }}>
                                        No courses enrolled yet
                                    </div>
                                    <p style={{ fontSize: '12px', margin: '4px 0 14px 0' }}>
                                        Click &quot;Add Course&quot; above to enroll this student into their first or additional course.
                                    </p>
                                </div>
                            ) : (
                                <table className="cs-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--cs-surface-2)', borderBottom: '1px solid var(--cs-border)', textAlign: 'left' }}>
                                            <th style={{ padding: '10px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--cs-text-secondary)' }}>Course</th>
                                            <th style={{ padding: '10px 14px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--cs-text-secondary)' }}>Branch & Batch</th>
                                            <th style={{ padding: '10px 14px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--cs-text-secondary)' }}>Academic Progress & Result</th>
                                            <th style={{ padding: '10px 14px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--cs-text-secondary)' }}>Fee</th>
                                            <th style={{ padding: '10px 14px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--cs-text-secondary)', textAlign: 'center' }}>Status</th>
                                            <th style={{ padding: '10px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--cs-text-secondary)', textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {profileData.enrollments
                                            .filter(enr => {
                                                if (enrollmentFilterTab === 'active') return ['enrolled', 'confirmed', 'active', 'approved'].includes(enr.status?.toLowerCase());
                                                if (enrollmentFilterTab === 'completed') return enr.status?.toLowerCase() === 'completed';
                                                if (enrollmentFilterTab === 'transferred') return enr.status?.toLowerCase() === 'transferred';
                                                return true;
                                            })
                                            .map(enr => {
                                            const stCfg = enrollmentStatusConfig[enr.status.toLowerCase()] || {
                                                label: enr.status,
                                                bg: 'var(--cs-surface-2)',
                                                color: 'var(--cs-text-secondary)',
                                                border: 'var(--cs-border)'
                                            };
                                            const isActive = ['enrolled', 'confirmed', 'active', 'approved'].includes(enr.status.toLowerCase());
                                            const isTransferred = enr.status.toLowerCase() === 'transferred';
                                            const isComp = enr.status.toLowerCase() === 'completed';
                                            const prog = enr.academicProgress;

                                            return (
                                                <tr key={enr.enrollmentId} style={{ borderBottom: '1px solid var(--cs-border)' }}>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                                        <div style={{ fontWeight: 700, color: 'var(--cs-text-primary)' }}>
                                                            {enr.courseTitle}
                                                        </div>
                                                        <code style={{ fontSize: '10.5px', color: 'var(--cs-text-secondary)', background: 'var(--cs-surface-2)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--cs-border)' }}>
                                                            {enr.courseCode}
                                                        </code>
                                                    </td>
                                                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                                                        <div style={{ fontWeight: 600, color: 'var(--cs-text-primary)', fontSize: '12.5px' }}>
                                                            {enr.batchName}
                                                        </div>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--cs-text-secondary)' }}>
                                                            <MapPin size={10} color="var(--cs-primary)" />
                                                            {enr.branchName}
                                                        </div>
                                                    </td>
                                                    {/* Academic Progress & Completion Result */}
                                                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', minWidth: '170px' }}>
                                                        {prog ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                                                                    {isComp ? (
                                                                        <span style={{ fontWeight: 700, color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                                            <Award size={12} /> {prog.completionRecord?.finalResult || 'Passed'}
                                                                        </span>
                                                                    ) : prog.isEligible ? (
                                                                        <span style={{ fontWeight: 700, color: '#1d4ed8', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                                            <CheckCircle2 size={12} /> Eligible for Review
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ color: '#64748b', fontWeight: 600 }}>
                                                                            Progress
                                                                        </span>
                                                                    )}
                                                                    <span style={{ fontWeight: 700, color: isComp ? '#15803d' : '#4f46e5' }}>
                                                                        {prog.overallProgressPct}%
                                                                    </span>
                                                                </div>
                                                                <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                    <div style={{
                                                                        width: `${Math.min(100, prog.overallProgressPct)}%`,
                                                                        height: '100%',
                                                                        background: isComp ? '#10b981' : '#6366f1',
                                                                        borderRadius: '4px'
                                                                    }} />
                                                                </div>
                                                                <div style={{ fontSize: '10.5px', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: '1px' }}>
                                                                    <span>Att: <b>{prog.attendanceRate}%</b></span>
                                                                    <span>Tests: <b>{prog.assessmentsCompleted}/{prog.assessmentsTotal}</b></span>
                                                                </div>
                                                                {isComp && prog.completionRecord?.completionDate && (
                                                                    <div style={{ fontSize: '10px', color: '#15803d' }}>
                                                                        Completed: {formatDate(prog.completionRecord.completionDate)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>—</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontWeight: 600, color: 'var(--cs-text-primary)', fontSize: '12.5px' }}>
                                                        {enr.tuitionAmount > 0 ? formatMoney(enr.tuitionAmount) : '—'}
                                                    </td>
                                                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            background: stCfg.bg,
                                                            color: stCfg.color,
                                                            border: `1px solid ${stCfg.border}`
                                                        }}>
                                                            {stCfg.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                            {/* Review Progress / View Completion Details button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setReviewingEnrollmentId(enr.enrollmentId)}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 600,
                                                                    padding: '4px 9px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #c7d2fe',
                                                                    background: '#eef2ff',
                                                                    color: '#4338ca',
                                                                    cursor: 'pointer'
                                                                }}
                                                                title="View academic progress and review completion"
                                                            >
                                                                <Award size={12} />
                                                                {isComp ? 'Graduation' : 'Review'}
                                                            </button>

                                                            {isActive && can(session, 'students.write') && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openTransferModal(enr)}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        fontSize: '11.5px',
                                                                        fontWeight: 600,
                                                                        padding: '4px 9px',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #fed7aa',
                                                                        background: '#fff7ed',
                                                                        color: '#c2410c',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    title="Transfer course or batch"
                                                                >
                                                                    <ArrowRightLeft size={11} />
                                                                    Transfer
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Course Transfer History Section */}
                        {profileData?.transfers && profileData.transfers.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ArrowRightLeft size={17} color="var(--cs-primary)" />
                                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--cs-text-primary)', margin: 0 }}>
                                            Course Transfer History
                                        </h3>
                                        <span style={{
                                            fontSize: '11.5px',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            background: 'rgba(79, 70, 229, 0.1)',
                                            color: '#4F46E5'
                                        }}>
                                            {profileData.transfers.length} {profileData.transfers.length === 1 ? 'Transfer' : 'Transfers'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '11.5px', color: 'var(--cs-text-muted)' }}>
                                        Audit-verified academic &amp; fee records
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {profileData.transfers.map(tr => (
                                        <div
                                            key={tr.transferId}
                                            style={{
                                                background: 'var(--cs-surface-1)',
                                                border: '1px solid var(--cs-border)',
                                                borderRadius: '12px',
                                                padding: '14px 16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                            }}
                                        >
                                            {/* Header Bar */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                                                    <span style={{ fontWeight: 700, color: 'var(--cs-text-primary)' }}>
                                                        Transfer Date: {formatDate(tr.transferDate)}
                                                    </span>
                                                    <span style={{ color: 'var(--cs-text-muted)' }}>•</span>
                                                    <span style={{ color: 'var(--cs-text-secondary)' }}>
                                                        Reason: <strong style={{ color: 'var(--cs-text-primary)' }}>{tr.transferReason}</strong>
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className={`badge ${tr.creditStatus ? CREDIT_STATUS[tr.creditStatus]?.badge : 'badge-secondary'}`}>
                                                        {tr.creditStatus ? CREDIT_STATUS[tr.creditStatus]?.label : (tr.selectedCreditOption === 'not_allowed' ? 'Credit: Not Allowed' : 'Credit: Allowed & Adjusted')}
                                                    </span>
                                                    {tr.feePlanStatus && <span className={`badge ${PLAN_STATUS[tr.feePlanStatus]?.badge}`}>{PLAN_STATUS[tr.feePlanStatus]?.label}</span>}
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        padding: '3px 10px',
                                                        borderRadius: '12px',
                                                        background: '#F3E8FF',
                                                        color: '#7E22CE',
                                                        border: '1px solid #D8B4FE'
                                                    }}>
                                                        {tr.transferStatus || 'Transferred'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Academic & Fee Transfer Details Comparison Grid */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
                                                {/* Previous Course (From) */}
                                                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 14px' }}>
                                                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                        Previous Course (From)
                                                    </div>
                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1F2937', marginTop: '3px' }}>
                                                        {tr.fromCourseTitle}
                                                    </div>
                                                    <div style={{ fontSize: '11.5px', color: '#4B5563', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <MapPin size={11} color="#EF4444" />
                                                        {tr.fromBranchName} • {tr.fromBatchName}
                                                    </div>

                                                    {/* Previous Course Fee Details */}
                                                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #FCA5A5', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', fontSize: '11px' }}>
                                                        <div>
                                                            <div style={{ color: '#7F1D1D' }}>Fee</div>
                                                            <div style={{ fontWeight: 700, color: '#1F2937' }}>₹{(tr.previousFeeDetails.totalFee || 0).toLocaleString('en-IN')}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ color: '#7F1D1D' }}>Paid</div>
                                                            <div style={{ fontWeight: 700, color: '#15803D' }}>₹{(tr.previousFeeDetails.paidAmount || 0).toLocaleString('en-IN')}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ color: '#7F1D1D' }}>Available Credit</div>
                                                            <div style={{ fontWeight: 700, color: '#1E40AF' }}>₹{(tr.availableCredit ?? tr.previousFeeDetails.availableCredit ?? 0).toLocaleString('en-IN')}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ color: '#7F1D1D' }}>Outstanding</div>
                                                            <div style={{ fontWeight: 700, color: tr.previousFeeDetails.outstandingAmount > 0 ? '#DC2626' : '#1F2937' }}>
                                                                {tr.previousFeeDetails.outstandingAmount > 0
                                                                    ? (tr.previousFeeDetails.waiveOldOutstanding ? '₹0 (Waived)' : `₹${(tr.previousFeeDetails.outstandingAmount).toLocaleString('en-IN')}`)
                                                                    : '₹0'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Arrow Separator */}
                                                <div style={{ color: 'var(--cs-primary)', display: 'flex', justifyContent: 'center' }}>
                                                    <ArrowRight size={22} />
                                                </div>

                                                {/* New Destination Course (To) */}
                                                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 14px' }}>
                                                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                        New Destination Course (To)
                                                    </div>
                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1F2937', marginTop: '3px' }}>
                                                        {tr.toCourseTitle}
                                                    </div>
                                                    <div style={{ fontSize: '11.5px', color: '#4B5563', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <MapPin size={11} color="#16A34A" />
                                                        {tr.toBranchName} • {tr.toBatchName}
                                                    </div>

                                                    {/* New Course Fee Details */}
                                                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #86EFAC', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '11px' }}>
                                                        <div>
                                                            <div style={{ color: '#14532D' }}>New Fee</div>
                                                            <div style={{ fontWeight: 700, color: '#1F2937' }}>₹{(tr.newFeeDetails.newCourseFee || 0).toLocaleString('en-IN')}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ color: '#14532D' }}>Approved Credit</div>
                                                            <div style={{ fontWeight: 700, color: (tr.approvedCreditAdjustment ?? tr.newFeeDetails.approvedCreditAdjustment) > 0 ? '#15803D' : '#6B7280' }}>
                                                                {(tr.approvedCreditAdjustment ?? tr.newFeeDetails.approvedCreditAdjustment) > 0
                                                                    ? `-₹${(tr.approvedCreditAdjustment ?? tr.newFeeDetails.approvedCreditAdjustment).toLocaleString('en-IN')}`
                                                                    : '₹0 (None)'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div style={{ color: '#14532D' }}>Final Payable</div>
                                                            <div style={{ fontWeight: 800, color: '#7E22CE' }}>
                                                                ₹{((tr.finalPayableAmount !== undefined ? tr.finalPayableAmount : tr.newFeeDetails.finalPayableAmount) || 0).toLocaleString('en-IN')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Credit Adjustment Outcome Banner */}
                                            <div style={{
                                                fontSize: '11.5px',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                background: tr.selectedCreditOption === 'not_allowed' ? '#F8FAFC' : '#F0FDF4',
                                                border: tr.selectedCreditOption === 'not_allowed' ? '1px solid #E2E8F0' : '1px solid #DCFCE7',
                                                color: tr.selectedCreditOption === 'not_allowed' ? '#475569' : '#166534',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <DollarSign size={14} style={{ flexShrink: 0 }} />
                                                <span>
                                                    {tr.creditStatus === 'pending_review' ? (
                                                        <><strong>Awaiting Finance:</strong> the unused fee of {tr.fromCourseTitle} is under review. The new course fee plan follows.</>
                                                    ) : tr.feePlanStatus === 'pending' ? (
                                                        <><strong>Awaiting Finance:</strong> the fee plan of {tr.toCourseTitle} has not been created yet.</>
                                                    ) : tr.feePlanStatus === 'carried_over' ? (
                                                        <><strong>Same course:</strong> the fee plan and payments moved with the student.</>
                                                    ) : tr.selectedCreditOption === 'not_allowed' ? (
                                                        <>
                                                            <strong>Credit Not Applied:</strong> Full new course fee of ₹{(tr.newFeeDetails.newCourseFee || 0).toLocaleString('en-IN')} is charged.{(tr.unusedRetainedCredit ?? 0) > 0 && <> ₹{(tr.unusedRetainedCredit ?? 0).toLocaleString('en-IN')} remains in the credit balance.</>}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <strong>Credit Adjusted:</strong> ₹{(tr.approvedCreditAdjustment ?? tr.newFeeDetails.approvedCreditAdjustment ?? 0).toLocaleString('en-IN')} approved credit deducted from new course fee. Final payable amount: ₹{((tr.finalPayableAmount !== undefined ? tr.finalPayableAmount : tr.newFeeDetails.finalPayableAmount) || 0).toLocaleString('en-IN')}.
                                                        </>
                                                    )}
                                                </span>
                                            </div>

                                            {/* Notes / Waiver Details */}
                                            {(tr.remarks || tr.previousFeeDetails.waiverReason) && (
                                                <div style={{ fontSize: '11.5px', color: 'var(--cs-text-secondary)', background: 'var(--cs-surface-2)', padding: '7px 12px', borderRadius: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {tr.previousFeeDetails.waiverReason && (
                                                        <span>
                                                            <strong>Dues Waiver:</strong> {tr.previousFeeDetails.waiverReason}
                                                        </span>
                                                    )}
                                                    {tr.previousFeeDetails.waiverReason && tr.remarks && <span>•</span>}
                                                    {tr.remarks && (
                                                        <span>
                                                            <strong>Remarks:</strong> {tr.remarks}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Fee Structure, Invoices & Installment Schedule */}
                        <div style={{
                            background: 'var(--cs-surface-1)',
                            border: '1px solid var(--cs-border)',
                            borderRadius: '12px',
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <DollarSign size={18} color="var(--cs-primary)" />
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--cs-text-primary)', margin: 0 }}>
                                        Fee Structure & Billing Schedule
                                    </h3>
                                </div>
                                {profileData?.feeSummary && (
                                    <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                        {profileData.invoices?.length || 0} Invoice{profileData.invoices?.length === 1 ? '' : 's'} / Installments
                                    </span>
                                )}
                            </div>

                            {/* Fee Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                <div style={{
                                    background: 'var(--cs-surface-2)',
                                    border: '1px solid var(--cs-border)',
                                    borderRadius: '10px',
                                    padding: '12px 14px',
                                }}>
                                    <div style={{ fontSize: '11.5px', color: 'var(--cs-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Total Course Fee
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--cs-text-primary)', marginTop: '4px' }}>
                                        ₹{(profileData?.feeSummary?.totalFee ?? 0).toLocaleString('en-IN')}
                                    </div>
                                </div>

                                <div style={{
                                    background: '#F0FDF4',
                                    border: '1px solid #DCFCE7',
                                    borderRadius: '10px',
                                    padding: '12px 14px',
                                }}>
                                    <div style={{ fontSize: '11.5px', color: '#166534', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Total Paid
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                                        ₹{(profileData?.feeSummary?.paidAmount ?? 0).toLocaleString('en-IN')}
                                    </div>
                                </div>

                                <div style={{
                                    background: (profileData?.feeSummary?.balanceAmount ?? 0) > 0 ? '#FEF2F2' : '#F8FAFC',
                                    border: (profileData?.feeSummary?.balanceAmount ?? 0) > 0 ? '1px solid #FECACA' : '1px solid var(--cs-border)',
                                    borderRadius: '10px',
                                    padding: '12px 14px',
                                }}>
                                    <div style={{
                                        fontSize: '11.5px',
                                        color: (profileData?.feeSummary?.balanceAmount ?? 0) > 0 ? '#B91C1C' : 'var(--cs-text-secondary)',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em'
                                    }}>
                                        Remaining Balance
                                    </div>
                                    <div style={{
                                        fontSize: '20px',
                                        fontWeight: 800,
                                        color: (profileData?.feeSummary?.balanceAmount ?? 0) > 0 ? '#DC2626' : '#10B981',
                                        marginTop: '4px'
                                    }}>
                                        ₹{(profileData?.feeSummary?.balanceAmount ?? 0).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            </div>

                            {/* Invoices & Installments Table */}
                            {profileData?.invoices && profileData.invoices.length > 0 ? (
                                <div style={{ overflowX: 'auto', border: '1px solid var(--cs-border)', borderRadius: '8px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--cs-surface-2)', borderBottom: '1px solid var(--cs-border)' }}>
                                                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--cs-text-secondary)' }}>Invoice #</th>
                                                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--cs-text-secondary)' }}>Installment / Description</th>
                                                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--cs-text-secondary)' }}>Due Date</th>
                                                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--cs-text-secondary)', textAlign: 'right' }}>Total</th>
                                                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--cs-text-secondary)', textAlign: 'right' }}>Paid</th>
                                                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--cs-text-secondary)', textAlign: 'right' }}>Balance</th>
                                                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--cs-text-secondary)', textAlign: 'center' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {profileData.invoices.map((inv, idx) => {
                                                const isPaid = inv.status?.toLowerCase() === 'paid';
                                                const isOverdue = inv.status?.toLowerCase() === 'overdue';
                                                return (
                                                    <tr key={inv.invoiceId || idx} style={{ borderBottom: '1px solid var(--cs-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                                                        <td style={{ padding: '8px 12px', fontWeight: 600, fontFamily: 'monospace' }}>
                                                            {inv.invoiceNumber}
                                                        </td>
                                                        <td style={{ padding: '8px 12px', color: 'var(--cs-text-primary)' }}>
                                                            {inv.designation || 'Tuition Fee'}
                                                        </td>
                                                        <td style={{ padding: '8px 12px', color: 'var(--cs-text-secondary)' }}>
                                                            {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                                                        </td>
                                                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                                                            ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#166534', fontWeight: 600 }}>
                                                            ₹{Number(inv.paidAmount).toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: inv.balanceAmount > 0 ? '#DC2626' : '#10B981', fontWeight: 600 }}>
                                                            ₹{Number(inv.balanceAmount).toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                            <span style={{
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                padding: '2px 8px',
                                                                borderRadius: '12px',
                                                                background: isPaid ? '#DCFCE7' : isOverdue ? '#FEE2E2' : '#FEF3C7',
                                                                color: isPaid ? '#15803D' : isOverdue ? '#B91C1C' : '#B45309'
                                                            }}>
                                                                {isPaid ? 'Paid' : isOverdue ? 'Overdue' : (Number(inv.paidAmount) > 0 ? 'Partial' : 'Pending')}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ fontSize: '12.5px', color: 'var(--cs-text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                                    No invoices or installment records found for this student.
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Course Transfer Modal */}
            {transferringEnrollment && (() => {
                const destCourse = courses?.find(c => c.courseId === transferForm.destinationCourseId);
                const destBatch = batches?.find(b => b.batchId === transferForm.destinationBatchId);
                const sameCourse = transferSameCourse;
                const stepIndex = ['destination', 'fee_review', 'confirm'].indexOf(transferStep);

                return (
                    <Modal
                        title={`Transfer Course — ${viewingStudent?.firstName} ${viewingStudent?.lastName} (${viewingStudent?.enrollmentNumber})`}
                        onClose={() => { if (!transferSaving) { setTransferringEnrollment(null); } }}
                        maxWidth="780px"
                        style={{ padding: '20px 24px' }}
                    >
                        {/* Stepper */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--cs-border)' }}>
                            {['Step 1: Destination & Attendance', 'Step 2: Fees & Credit', 'Step 3: Review & Confirm'].map((label, i) => {
                                const tone = i < stepIndex ? { bg: '#ECFDF5', fg: '#059669', line: '#A7F3D0', dot: '#059669' } : i === stepIndex ? { bg: '#EEF2FF', fg: '#4F46E5', line: '#C7D2FE', dot: '#4F46E5' } : { bg: '#F1F5F9', fg: '#64748B', line: '#E2E8F0', dot: '#94A3B8' };
                                return (
                                    <div key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '16px', background: tone.bg, color: tone.fg, border: `1px solid ${tone.line}`, fontSize: '12px', fontWeight: 600 }}>
                                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: tone.dot, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{i < stepIndex ? '✓' : i + 1}</span>
                                        {label}
                                    </div>
                                );
                            })}
                        </div>

                        {/* STEP 1: Destination & Schedule */}
                        {transferStep === 'destination' && (
                            <form onSubmit={handleGoToFeeReview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {/* Current Course Banner */}
                                <div style={{
                                    background: 'var(--cs-surface-2)',
                                    border: '1px solid var(--cs-border)',
                                    borderRadius: '8px',
                                    padding: '12px 14px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '10px'
                                }}>
                                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', width: '100%' }}>
                                        Current Enrollment (From)
                                    </div>
                                    {([
                                        ['Student ID', viewingStudent?.enrollmentNumber], ['Branch', transferringEnrollment.branchName], ['Course', `${transferringEnrollment.courseTitle} (${transferringEnrollment.courseCode})`],
                                        ['Batch', transferringEnrollment.batchName], ['Enrollment date', formatDate(transferConsumption?.assessment.enrollmentDate ?? transferringEnrollment.enrolledAt)],
                                        ['Status', transferringEnrollment.status.charAt(0).toUpperCase() + transferringEnrollment.status.slice(1)],
                                    ] as Array<[string, string | undefined]>).map(([label, value]) => (
                                        <div key={label} style={{ flex: '1 1 180px' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{label}</div>
                                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>{value ?? '—'}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Destination Branch & Course */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label className="cs-label">Destination Branch <span style={{ color: '#EF4444' }}>*</span></label>
                                        <select
                                            className="cs-input"
                                            value={transferForm.destinationBranchId}
                                            onChange={e => handleTransferBranchChange(e.target.value)}
                                            required
                                        >
                                            <option value="">Select Branch</option>
                                            {availableBranchesList.map(br => (
                                                <option key={br.branchId} value={br.branchId}>{br.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="cs-label">Destination Course <span style={{ color: '#EF4444' }}>*</span></label>
                                        <select
                                            className="cs-input"
                                            value={transferForm.destinationCourseId}
                                            onChange={e => handleTransferCourseChange(e.target.value)}
                                            required
                                            disabled={!transferForm.destinationBranchId}
                                        >
                                            <option value="">Select Course</option>
                                            {filterCourses(courses, batches, transferForm.destinationBranchId, transferForm.destinationCourseId).map(c => {
                                                const isCurrent = c.courseId === transferringEnrollment.courseId;
                                                const isAlreadyEnrolled = profileData?.enrollments?.some(e =>
                                                    e.courseId === c.courseId &&
                                                    e.enrollmentId !== transferringEnrollment.enrollmentId &&
                                                    ['enrolled', 'confirmed', 'active', 'approved'].includes(e.status?.toLowerCase())
                                                );
                                                return (
                                                    <option key={c.courseId} value={c.courseId} disabled={Boolean(isAlreadyEnrolled)}>
                                                        {c.title} ({c.code}){isCurrent ? ' — (Current Course)' : isAlreadyEnrolled ? ' — [Already Enrolled]' : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>

                                {/* Destination Batch & Transfer Date */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label className="cs-label">Destination Batch <span style={{ color: '#EF4444' }}>*</span></label>
                                        <select
                                            className="cs-input"
                                            value={transferForm.destinationBatchId}
                                            onChange={e => handleTransferBatchChange(e.target.value)}
                                            required
                                            disabled={!transferForm.destinationCourseId}
                                        >
                                            <option value="">Select Batch</option>
                                            {filterBatches(batches, transferForm.destinationBranchId, transferForm.destinationCourseId).map(b => {
                                                const isCurrentBatch = b.batchId === transferringEnrollment.batchId;
                                                const cap = b.capacity || 25;
                                                const enrCount = b.enrolledCount ?? 0;
                                                const isFull = cap > 0 && enrCount >= cap && !isCurrentBatch;
                                                return (
                                                    <option key={b.batchId} value={b.batchId} disabled={isCurrentBatch || isFull}>
                                                        {b.name} ({enrCount}/{cap} seats){isCurrentBatch ? ' — (Current Batch)' : isFull ? ' — [Full]' : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="cs-label">Transfer Date <span style={{ color: '#EF4444' }}>*</span></label>
                                        <input
                                            type="date"
                                            className="cs-input"
                                            min={transferConsumption?.assessment.enrollmentDate ?? undefined}
                                            max={dateInDays()}
                                            value={transferForm.transferDate}
                                            onChange={e => setTransferForm(f => ({ ...f, transferDate: e.target.value }))}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Transfer Reason & Remarks */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label className="cs-label">Transfer Reason <span style={{ color: '#EF4444' }}>*</span></label>
                                        <select
                                            className="cs-input"
                                            value={transferForm.transferReason}
                                            onChange={e => setTransferForm(f => ({ ...f, transferReason: e.target.value }))}
                                            required
                                        >
                                            <option value="Student Request / Preference">Student Request / Preference</option>
                                            <option value="Academic Level Progression">Academic Level Progression</option>
                                            <option value="Schedule / Timetable Conflict">Schedule / Timetable Conflict</option>
                                            <option value="Branch Relocation / Transfer">Branch Relocation / Transfer</option>
                                            <option value="Performance / Instructor Recommendation">Performance / Instructor Recommendation</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="cs-label">Remarks / Notes</label>
                                        <input
                                            type="text"
                                            className="cs-input"
                                            placeholder="Optional administrative notes..."
                                            value={transferForm.remarks}
                                            onChange={e => setTransferForm(f => ({ ...f, remarks: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {!sameCourse && transferForm.destinationCourseId && (
                                    <ConsumptionReview enrollmentId={transferringEnrollment.enrollmentId} until={transferForm.transferDate} currency={currency} onView={setTransferConsumption} />
                                )}

                                {transferError && (
                                    <div style={{
                                        padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA',
                                        color: '#991B1B', fontSize: '12.5px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px'
                                    }}>
                                        <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                                        <span>{transferError}</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setTransferringEnrollment(null)}
                                        className="btn-secondary"
                                        style={{ padding: '8px 16px', fontSize: '13px' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        style={{
                                            padding: '8px 18px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        Next: Fees &amp; Credit <ArrowRight size={14} />
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* STEP 2: Fees & credit */}
                        {transferStep === 'fee_review' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center' }}>
                                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>From (Current)</div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>{transferringEnrollment.courseTitle}</div>
                                        <div style={{ fontSize: '11.5px', color: '#64748B' }}>{transferringEnrollment.batchName} • {transferringEnrollment.branchName}</div>
                                    </div>
                                    <ArrowRight size={20} color="#4F46E5" />
                                    <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '10px 12px' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>To (Destination)</div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#065F46', marginTop: '2px' }}>{destCourse?.title}</div>
                                        <div style={{ fontSize: '11.5px', color: '#047857' }}>{destBatch?.name} • {availableBranchesList.find(b => b.branchId === transferForm.destinationBranchId)?.name}</div>
                                    </div>
                                </div>
                                <TransferFeeStep view={transferConsumption} sameCourse={sameCourse} currency={currency} canFinance={canFinance} financeNow={transferForm.financeNow}
                                    onFinanceNow={financeNow => setTransferForm(f => ({ ...f, financeNow }))} form={transferFinance} onChange={p => setTransferFinance(f => ({ ...f, ...p }))}
                                    dues={transferDues} onDues={d => setTransferForm(f => ({ ...f, waiveOldOutstanding: d.waive, waiverReason: d.reason }))}
                                    oldOutstanding={sameCourse ? 0 : transferConsumption?.credit?.outstanding ?? transferringEnrollment.outstandingAmount ?? 0}
                                    tuition={Number(destCourse?.tuitionAmount ?? 0)} courseId={transferForm.destinationCourseId} templates={transferTemplates} period={transferPeriod()} />
                                {transferStepProblem() && <div style={{ fontSize: '12px', color: '#92400E' }}>{transferStepProblem()}</div>}
                                {transferError && (
                                    <div role="alert" style={{
                                        padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA',
                                        color: '#991B1B', fontSize: '12.5px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px'
                                    }}>
                                        <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                                        <span>{transferError}</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                    <button type="button" onClick={() => { setTransferError(null); setTransferStep('destination'); }} className="btn-secondary" disabled={transferSaving}
                                        style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <ArrowLeft size={14} /> Back to Destination
                                    </button>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button type="button" onClick={() => setTransferringEnrollment(null)} className="btn-secondary" disabled={transferSaving} style={{ padding: '8px 16px', fontSize: '13px' }}>Cancel</button>
                                        <button type="button" onClick={reviewTransfer} className="btn-primary" disabled={transferSaving || transferStepProblem() !== null}
                                            style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            {transferSaving ? 'Checking…' : <>Review &amp; Transfer <ArrowRight size={14} /></>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Review & confirm */}
                        {transferStep === 'confirm' && transferPreview && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <TransferSummaryStep preview={transferPreview} currency={currency} studentId={viewingStudent?.enrollmentNumber ?? ''} transferDate={transferForm.transferDate} reason={transferForm.transferReason}
                                    enrollmentDate={transferConsumption?.assessment.enrollmentDate ?? transferringEnrollment.enrolledAt} paymentMode={transferFinanceNow ? transferFinance.paymentMode : null} />
                                {transferError && (
                                    <div role="alert" style={{
                                        padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA',
                                        color: '#991B1B', fontSize: '12.5px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px'
                                    }}>
                                        <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                                        <span>{transferError}</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                    <button type="button" onClick={() => { setTransferError(null); setTransferStep('fee_review'); }} className="btn-secondary" disabled={transferSaving}
                                        style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <ArrowLeft size={14} /> Back to Fees
                                    </button>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button type="button" onClick={() => setTransferringEnrollment(null)} className="btn-secondary" disabled={transferSaving} style={{ padding: '8px 16px', fontSize: '13px' }}>Cancel</button>
                                        <button type="button" onClick={confirmAndExecuteTransfer} className="btn-primary" disabled={transferSaving}
                                            style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#059669', borderColor: '#059669' }}>
                                            {transferSaving ? 'Processing Transfer…' : <><CheckCircle size={15} /> Confirm &amp; Complete Transfer</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Modal>
                );
            })()}

            {/* Edit Student Modal */}
            {editingStudent && (
                <Modal title={`Edit Student: ${editingStudent.firstName} ${editingStudent.lastName}`} onClose={() => setEditingStudent(null)} maxWidth="660px" style={{ padding: '20px 24px' }}>
                    <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                        {/* Student Profile Photo Uploader */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: '#FFFFFF', border: '2px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {editPhotoPreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={editPhotoPreview} alt="Student preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                        <Upload size={12} /> {editPhotoPreview ? 'Change Photo' : 'Upload Photo'}
                                        <input
                                            ref={editFileInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            style={{ display: 'none' }}
                                            onChange={handleEditPhotoSelect}
                                        />
                                    </label>
                                    {editPhotoPreview && (
                                        <button
                                            type="button"
                                            className="btn-ghost"
                                            onClick={handleEditRemovePhoto}
                                            style={{ height: '28px', padding: '0 6px', fontSize: '11px', color: '#EF4444' }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                {editPhotoError ? (
                                    <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 500 }}>{editPhotoError}</span>
                                ) : (
                                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                                        Profile photo (PNG, JPG, WebP up to 2 MB)
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
                                                editEnrollmentTouched.current = true;
                                                setEditForm(f => ({ ...f, branchId: newBranchId, courseId: '', batchId: '' }));
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
                                                editEnrollmentTouched.current = true;
                                                const newCourseId = e.target.value;
                                                const selectedCourse = courses?.find(c => c.courseId === newCourseId);
                                                setEditForm(f => ({
                                                    ...f,
                                                    courseId: newCourseId,
                                                    batchId: '',
                                                    feeAmount: selectedCourse && selectedCourse.tuitionAmount && !f.feeAmount ? String(selectedCourse.tuitionAmount) : f.feeAmount,
                                                    feeStatus: selectedCourse && f.feeStatus === 'none' ? 'pending' : f.feeStatus,
                                                }));
                                            }}
                                        >
                                            {(() => {
                                                const editBranchCourses = filterCourses(courses, batches, editForm.branchId, editForm.courseId);
                                                const placeholder = !courses
                                                    ? 'Loading courses…'
                                                    : editBranchCourses.length > 0
                                                        ? '— Select a course (optional) —'
                                                        : '— No courses available for this branch —';
                                                return (
                                                    <>
                                                        <option value="">{placeholder}</option>
                                                        {editBranchCourses.map(c => (
                                                            <option key={c.courseId} value={c.courseId}>
                                                                {c.title} ({c.code}){c.tuitionAmount ? ` — ₹${Number(c.tuitionAmount).toLocaleString('en-IN')}` : ''}
                                                            </option>
                                                        ))}
                                                    </>
                                                );
                                            })()}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="cs-label">Change / Assign Batch</label>
                                    <select
                                        className="cs-input"
                                        value={editForm.batchId}
                                        disabled={!editForm.courseId}
                                        onChange={e => {
                                            editEnrollmentTouched.current = true;
                                            const bId = e.target.value;
                                            const selected = batches?.find(b => b.batchId === bId);
                                            setEditForm(f => ({
                                                ...f,
                                                batchId: bId,
                                                feeAmount: selected && selected.tuitionAmount && !f.feeAmount ? String(selected.tuitionAmount) : f.feeAmount,
                                                feeStatus: selected && f.feeStatus === 'none' ? 'pending' : f.feeStatus
                                            }));
                                        }}
                                        style={{
                                            opacity: !editForm.courseId ? 0.65 : 1,
                                            cursor: !editForm.courseId ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {(() => {
                                            if (!editForm.courseId) {
                                                return <option value="">— Select a course first to view batches —</option>;
                                            }
                                            const editBatches = filterBatches(batches, editForm.branchId, editForm.courseId, editForm.batchId);
                                            const editPlaceholder = !batches
                                                ? 'Loading batches…'
                                                : editBatches.length > 0
                                                    ? '— Select a batch (optional) —'
                                                    : '— No batches available for this course in this branch —';
                                            return (
                                                <>
                                                    <option value="">{editPlaceholder}</option>
                                                    {editBatches.map(b => (
                                                        <option key={b.batchId} value={b.batchId}>
                                                            {b.name}{b.capacity ? ` (Cap: ${b.enrolledCount || 0}/${b.capacity})` : ''} {b.tuitionAmount ? `— ₹${Number(b.tuitionAmount).toLocaleString('en-IN')}` : ''}
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
                                            editEnrollmentTouched.current = true;
                                            const newCourseId = e.target.value;
                                            const selectedCourse = courses?.find(c => c.courseId === newCourseId);
                                            setEditForm(f => ({
                                                ...f,
                                                courseId: newCourseId,
                                                batchId: '',
                                                feeAmount: selectedCourse && selectedCourse.tuitionAmount && !f.feeAmount ? String(selectedCourse.tuitionAmount) : f.feeAmount,
                                                feeStatus: selectedCourse && f.feeStatus === 'none' ? 'pending' : f.feeStatus,
                                            }));
                                        }}
                                    >
                                        {(() => {
                                            const editBranchCourses = filterCourses(courses, batches, editForm.branchId, editForm.courseId);
                                            const placeholder = !courses
                                                ? 'Loading courses…'
                                                : editBranchCourses.length > 0
                                                    ? '— Select a course (optional) —'
                                                    : '— No courses available for this branch —';
                                            return (
                                                <>
                                                    <option value="">{placeholder}</option>
                                                    {editBranchCourses.map(c => (
                                                        <option key={c.courseId} value={c.courseId}>
                                                            {c.title} ({c.code}){c.tuitionAmount ? ` — ₹${Number(c.tuitionAmount).toLocaleString('en-IN')}` : ''}
                                                        </option>
                                                    ))}
                                                </>
                                            );
                                        })()}
                                    </select>
                                </div>
                                <div>
                                    <label className="cs-label">Change / Assign Batch</label>
                                    <select
                                        className="cs-input"
                                        value={editForm.batchId}
                                        disabled={!editForm.courseId}
                                        onChange={e => {
                                            editEnrollmentTouched.current = true;
                                            const bId = e.target.value;
                                            const selected = batches?.find(b => b.batchId === bId);
                                            setEditForm(f => ({
                                                ...f,
                                                batchId: bId,
                                                feeAmount: selected && selected.tuitionAmount && !f.feeAmount ? String(selected.tuitionAmount) : f.feeAmount,
                                                feeStatus: selected && f.feeStatus === 'none' ? 'pending' : f.feeStatus
                                            }));
                                        }}
                                        style={{
                                            opacity: !editForm.courseId ? 0.65 : 1,
                                            cursor: !editForm.courseId ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {(() => {
                                            if (!editForm.courseId) {
                                                return <option value="">— Select a course first to view batches —</option>;
                                            }
                                            const editBatches = filterBatches(batches, editForm.branchId, editForm.courseId, editForm.batchId);
                                            const editPlaceholder = !batches
                                                ? 'Loading batches…'
                                                : editBatches.length > 0
                                                    ? '— Select a batch (optional) —'
                                                    : '— No batches available for this course in this branch —';
                                            return (
                                                <>
                                                    <option value="">{editPlaceholder}</option>
                                                    {editBatches.map(b => (
                                                        <option key={b.batchId} value={b.batchId}>
                                                            {b.name}{b.capacity ? ` (Cap: ${b.enrolledCount || 0}/${b.capacity})` : ''} {b.tuitionAmount ? `— ₹${Number(b.tuitionAmount).toLocaleString('en-IN')}` : ''}
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
                                    disabled={editFeeLocked}
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
                                    disabled={editFeeLocked || editForm.feeStatus === 'none'}
                                    value={editForm.feeAmount}
                                    onChange={e => setEditForm({ ...editForm, feeAmount: e.target.value })}
                                    style={{
                                        opacity: editForm.feeStatus === 'none' ? 0.6 : 1,
                                        cursor: editForm.feeStatus === 'none' ? 'not-allowed' : 'text'
                                    }}
                                />
                            </div>
                        </div>

                        {editFeeLocked && (
                            <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)' }}>
                                This student has an installment schedule or recorded payments. Manage the fees under Fees &amp; Plans.
                            </div>
                        )}

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

            {/* Course Completion Review Modal */}
            {reviewingEnrollmentId && (
                <CourseCompletionReviewModal
                    enrollmentId={reviewingEnrollmentId}
                    canManage={can(session, 'students.write')}
                    onClose={() => setReviewingEnrollmentId(null)}
                    onCompleted={() => {
                        setReviewingEnrollmentId(null);
                        reloadProfile();
                    }}
                />
            )}

            {/* Academy Course Completion Queue Modal */}
            {showCompletionQueue && (
                <CourseCompletionQueueModal
                    canManage={can(session, 'students.write')}
                    onClose={() => {
                        setShowCompletionQueue(false);
                        reloadProfile();
                    }}
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
