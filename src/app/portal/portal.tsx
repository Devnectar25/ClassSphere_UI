'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard, CalendarCheck, Wallet, GraduationCap, CalendarDays, Music, Bell, Award,
    Download, Printer, CreditCard, ArrowLeft, Flame, Send, Calendar, CheckCircle, User, X, Building, Clock,
    ChevronRight, Check, AlertCircle, ShieldCheck, RefreshCw, Loader2, FileText, Zap
} from 'lucide-react';
import { api, formatDate, formatMoney } from '@/lib/api';
import SignOutButton from '@/components/SignOutButton';
import { useSession } from '@/lib/session';
import { gradeClass } from '@/lib/academy';

interface CourseInstallment {
    invoiceId: string;
    invoiceNumber: string;
    installmentNumber: number;
    designation: string;
    dueDate: string;
    amount: number;
    paidAmount: number;
    balanceAmount: number;
    originalAmount: number;
    creditApplied: number;
    carriedForward: number;
    pendingVerification: number;
    status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'verification_pending' | 'failed';
    lateFeeAmount?: number;
    daysOverdue?: number;
    receiptNumber?: string;
    paymentMethod?: string;
    payments?: Array<{
        paymentId: string;
        amount: number;
        receiptNumber: string;
        paymentMethod: string;
        reference: string;
        status: string;
        createdAt: string;
    }>;
}

interface StudentCourseBreakdown {
    enrollmentId: string | null;
    enrollmentStatus: string | null;
    creditApplied: number;
    pendingVerification: number;
    feePlanPending: boolean;
    courseId: string;
    courseTitle: string;
    courseCode: string;
    batchId?: string;
    batchName?: string;
    branchId?: string;
    branchName?: string;
    totalFee: number;
    paidAmount: number;
    balanceAmount: number;
    advanceCredit: number;
    status: 'paid' | 'partially_paid' | 'pending' | 'overdue' | 'verification_pending';
    isFullyPaid?: boolean;
    finalInvoiceNumber?: string;
    finalInvoiceDate?: string;
    installments: CourseInstallment[];
    payments: Array<{
        paymentId: string;
        receiptNumber: string;
        amount: number;
        paymentMethod: string;
        reference: string;
        status: string;
        paidAt: string;
        invoiceNumber: string;
        designation: string;
    }>;
}

interface Invoice {
    id: string; invoiceNumber: string; billingPeriod: string; designation: string; subtitle: string;
    amount: number; balance: number; late_fee_amount?: number; overdue_status?: string; days_overdue?: number; due_date?: string; paymentMethod: string; status: 'settled' | 'pending' | 'overdue' | 'waived' | 'in_grace'; receiptNumber: string;
}
interface Payment {
    paymentId: string; receiptNumber: string; paidAt: string; amount: number; paymentMethod: string;
    reference: string; status: string; invoiceNumber: string; designation: string; billingPeriod?: string;
}
interface TestResult {
    test: { testId: string; title: string; testType: string; testDate: string; batchName: string; courseTitle: string };
    subjects: Array<{ subjectId: string; name: string; maxMarks: number }>;
    maxTotal: number;
    summary: { classSize: number; averagePercentage: number | null; highestPercentage: number | null };
    result: {
        total: number | null; percentage: number | null; grade: string | null; rank: number | null;
        marks: Record<string, { marks: number | null; absent: boolean; grade: string | null; remarks: string | null }>;
    } | null;
}
interface Ward {
    id: string; name: string; preferredName: string; phone?: string | null; division: string; track: string; matriculationYear: string;
    enrollmentNumber?: string | null;
    academy?: { name: string; logoUrl: string | null; address: string | null; phone: string | null; email: string | null };
    standing: string; branchName: string | null; enrolledUnits: string; enrolledSubjects: string;
    practiceHours: number; practiceCohortDiff: string; practiceStreakDays: number; practiceSuite: { room: string; schedule: string };
    weeklyPractice: Array<{ day: string; shortDay: string; hours: number }>;
    balance: number; nextDraftAmount: number; nextDraftDate: string; paymentMethod: string;
    attendanceRate: number; sessionsCompleted: number; sessionsTotal: number; excusedAbsences: number; absenceNote: string; nextClassTime: string;
    primaryMentor: { name: string; title: string; office: string; distinction: string; email: string | null } | null;
    featuredEvent: { eventId: string; title: string; date: string; venue: string; description: string; soloist: string; program: string; box: string; guaranteedSeats: number; seatsClaimed: boolean } | null;
    timetable: Array<{ id: string; day: string; dateNum: number; time: string; studio: string; subject: string; faculty: string; type: string }>;
    distinctions: Array<{ id: string; title: string; issuer: string; grade: string; type: 'gold' | 'primary' }>;
    invoices: Invoice[];
    payments: Payment[];
    courses?: StudentCourseBreakdown[];
    creditBalance?: number;
    attendanceHistory: Array<{ date: string; batch: string; status: string; remarks: string | null }>;
    testResults: TestResult[];
}
interface Household {
    guardianId: string; householdId: string; academicSession: string; guardianName: string; guardianEmail: string;
    organizationName: string; academyType: string; currency: string; logoUrl: string | null;
    notices: Array<{ noticeId: string; title: string; content: string; priority: string; publishedAt: string; isPinned: boolean; branchName: string }>;
    achievementBoard: Array<{ achievementId: string; studentName: string; title: string; level: string; awardDate: string; issuer: string }>;
    wards: Ward[];
}

type Page = 'overview' | 'attendance' | 'fees' | 'results' | 'timetable' | 'practice' | 'notices' | 'achievements';
type ModalKind = 'practice' | 'absence' | 'advisory' | 'pay' | null;

const PAGES: Array<{ id: Page; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'fees', label: 'Fees & Payments', icon: Wallet },
    { id: 'results', label: 'Test Results', icon: GraduationCap },
    { id: 'timetable', label: 'Timetable', icon: CalendarDays },
    { id: 'practice', label: 'Practice Log', icon: Music },
    { id: 'notices', label: 'Notices', icon: Bell },
    { id: 'achievements', label: 'Achievements', icon: Award },
];

const ATTENDANCE_STYLE: Record<string, string> = {
    present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    late: 'bg-amber-50 text-amber-700 border-amber-200',
    excused: 'bg-sky-50 text-sky-700 border-sky-200',
    absent: 'bg-red-50 text-red-700 border-red-200',
};
const PAYMENT_METHODS = ['Card', 'UPI', 'BankWire'];
const card = 'bg-white rounded-xl border border-slate-200 p-4';
const eyebrow = 'text-[10px] uppercase tracking-wider text-slate-500 font-semibold';
const th = 'text-left text-[11px] uppercase text-slate-500';

const escapeHtml = (value: unknown) => String(value ?? '—').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

// Staff preview a specific household with ?guardianId=…; guardians see their own
const guardianId = () => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('guardianId'));
const fetchHousehold = () => {
    const id = guardianId();
    return api<Household>(`/portal${id ? `?guardianId=${encodeURIComponent(id)}` : ''}`);
};

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
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

function openPrintWindow(title: string, household: Household, body: string) {
    const w = window.open('', '_blank', 'width=800,height=960');
    if (!w) return false;
    const logo = household.logoUrl ? `<img src="${escapeHtml(household.logoUrl)}" alt="" style="max-height:48px;max-width:140px;object-fit:contain;">` : '';
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
@page { size: A4 portrait; margin: 14mm; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 26px; line-height: 1.45; }
header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 18px; }
.brand { display: flex; align-items: center; gap: 12px; }
h1 { font-size: 19px; font-weight: 800; color: #1e3a8a; margin: 0; }
h2 { font-size: 13px; color: #64748b; font-weight: 500; margin: 3px 0 0 0; }
.badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; }
.badge-paid { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
.badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
.badge-overdue { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; font-size: 12px; margin-bottom: 16px; }
.info-row { margin-bottom: 5px; }
.info-row:last-child { margin-bottom: 0; }
.label { color: #64748b; font-weight: 500; }
.val { color: #0f172a; font-weight: 600; }
table { width: 100%; border-collapse: collapse; margin-top: 14px; margin-bottom: 16px; font-size: 12px; }
th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
th { background: #f1f5f9; color: #334155; font-weight: 600; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.03em; }
.big { font-size: 26px; font-weight: 700; color: #047857; margin-top: 16px; }
.stamp-box { border: 2px dashed #059669; background: #f0fdf4; border-radius: 8px; padding: 12px 16px; margin: 18px 0; text-align: center; }
.stamp-title { font-size: 15px; font-weight: 800; color: #047857; letter-spacing: 0.04em; text-transform: uppercase; }
.stamp-subtitle { font-size: 11.5px; color: #065f46; margin-top: 2px; }
footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
@media print {
    body { margin: 0; }
    .no-print { display: none !important; }
}
</style></head><body>
<header>
    <div class="brand">
        ${logo}
        <div>
            <h1>${escapeHtml(household.organizationName || 'ClassSphere Academy')}</h1>
            <h2>${escapeHtml(title)}</h2>
        </div>
    </div>
    <div style="text-align: right; font-size: 11.5px; color: #64748b;">
        <div><b>Official Academic Document</b></div>
        <div>Date: ${escapeHtml(formatDate(new Date().toISOString()))}</div>
    </div>
</header>
${body}
<footer>
    <span>Generated by ClassSphere Academy Billing Engine</span>
    <span>Official Computer-Generated Tax Document</span>
</footer>
<script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
    return true;
}

export default function ParentPortalPage() {
    const session = useSession();
    const [household, setHousehold] = useState<Household | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [wardId, setWardId] = useState<string | null>(null);
    const [page, setPage] = useState<Page>('overview');
    const [modal, setModal] = useState<ModalKind>(null);

    // Pay Modal state
    const [payTarget, setPayTarget] = useState<{
        type: 'installment' | 'course';
        installment?: CourseInstallment;
        course: StudentCourseBreakdown;
    } | null>(null);
    const [payAmount, setPayAmount] = useState<string>('');
    const [payMethod, setPayMethod] = useState<'AutoPay' | 'Razorpay' | 'Card' | 'UPI' | 'BankWire'>('AutoPay');
    const [isProcessingPay, setIsProcessingPay] = useState(false);
    const [payError, setPayError] = useState<string | null>(null);
    const [payReference, setPayReference] = useState('');
    const [payKey, setPayKey] = useState('');

    const [toast, setToast] = useState<string | null>(null);

    // Invoice viewing state
    const [viewingFinalInvoiceCourse, setViewingFinalInvoiceCourse] = useState<StudentCourseBreakdown | null>(null);
    const [viewingInstallmentInvoice, setViewingInstallmentInvoice] = useState<{ inst: CourseInstallment; course: StudentCourseBreakdown } | null>(null);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 5000);
    }, []);

    const reloadData = async () => {
        try {
            const data = await fetchHousehold();
            setHousehold(data);
        } catch (err) {
            console.error('[Portal reload failed]', err);
        }
    };

    useEffect(() => {
        let active = true;
        fetchHousehold()
            .then(data => { if (active) setHousehold(data); })
            .catch((err: Error) => { if (active) setLoadError(err.message); });
        return () => { active = false; };
    }, []);

    // Pre-load Razorpay checkout script
    useEffect(() => {
        void loadRazorpayScript();
    }, []);

    const action = async (payload: Record<string, unknown>) => {
        try {
            const data = await api<{ message: string }>('/portal', {
                method: 'POST',
                headers: { 'Idempotency-Key': crypto.randomUUID() },
                body: JSON.stringify({ ...payload, guardianId: guardianId() }),
            });
            showToast(data.message);
            setModal(null);
            setHousehold(await fetchHousehold());
        } catch (err) {
            showToast((err as Error).message);
        }
    };

    const isStaffPreview = session?.session.role !== 'Guardian';

    if (!household) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-lg text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                        <User size={24} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Parent Portal Notice</h2>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            {loadError ?? 'Loading your family portal…'}
                        </p>
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                        <Link
                            href="/dashboard"
                            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors inline-block text-center shadow-xs"
                        >
                            Return to Dashboard
                        </Link>
                        <Link
                            href="/dashboard/guardians"
                            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors inline-block text-center"
                        >
                            Manage Guardians & Students
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const ward = household.wards.find(w => w.id === wardId) ?? household.wards[0];
    const money = (value: number) => formatMoney(value, household.currency, 2);

    if (!ward) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-lg text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto">
                        <User size={24} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">No Children Linked</h2>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            {isStaffPreview
                                ? 'No children are currently linked to this guardian record.'
                                : 'No children are linked to this parent account yet. Please contact the academy administration.'}
                        </p>
                    </div>
                    <div className="pt-2 flex justify-center gap-2">
                        <Link
                            href={isStaffPreview ? '/dashboard/guardians' : '/dashboard'}
                            className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors inline-block text-center shadow-xs"
                        >
                            Back to Staff Console
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Aggregate course-wise fee summaries
    const courses = ward.courses || [];
    const totalCourseFees = courses.reduce((sum, c) => sum + c.totalFee, 0) || (ward.invoices || []).reduce((sum, i) => sum + i.amount, 0);
    const totalPaid = (ward.payments || []).filter(p => !['verification_pending', 'rejected', 'refunded'].includes(p.status)).reduce((acc, p) => acc + p.amount, 0);

    const openPayModalForInstallment = (inst: CourseInstallment, course: StudentCourseBreakdown) => {
        setPayTarget({
            type: 'installment',
            installment: inst,
            course
        });
        setPayAmount(String(inst.balanceAmount > 0 ? inst.balanceAmount : inst.amount));
        setPayMethod('AutoPay');
        setPayReference('');
        setPayKey(crypto.randomUUID());
        setPayError(null);
        setModal('pay');
    };

    const openPayModalForCourse = (course: StudentCourseBreakdown) => {
        setPayTarget({
            type: 'course',
            course
        });
        setPayAmount(String(course.balanceAmount));
        setPayMethod('AutoPay');
        setPayReference('');
        setPayKey(crypto.randomUUID());
        setPayError(null);
        setModal('pay');
    };

    const handleExecutePayment = async () => {
        if (!payTarget || !ward) return;
        setIsProcessingPay(true);
        setPayError(null);

        const amountToPay = Number(payAmount);
        if (isNaN(amountToPay) || amountToPay <= 0) {
            setPayError('Please enter a positive amount to pay.');
            setIsProcessingPay(false);
            return;
        }

        try {
            const courseTitle = payTarget.course.courseTitle;
            const enrollmentId = payTarget.course.enrollmentId;
            const invoiceId = payTarget.type === 'installment' && payTarget.installment
                ? payTarget.installment.invoiceId
                : undefined;

            if (payMethod === 'AutoPay') {
                // Instant AutoPay Flow: Directly and reliably processes through backend AutoPay engine
                const postRes = await api<{
                    success: boolean;
                    message: string;
                    receipts: Array<{ receiptNumber: string; amount: number }>;
                }>('/portal', {
                    method: 'POST',
                    headers: { 'Idempotency-Key': crypto.randomUUID() },
                    body: JSON.stringify({
                        action: 'pay_installment',
                        wardId: ward.id,
                        amount: amountToPay,
                        enrollmentId,
                        invoiceId,
                        paymentMethod: 'AutoPay',
                        guardianId: guardianId()
                    })
                });

                showToast(postRes.message || 'Payment recorded successfully via AutoPay!');
                setModal(null);
                setPayTarget(null);
                await reloadData();
                return;
            }

            if (payMethod === 'Razorpay' || payMethod === 'Card' || payMethod === 'UPI') {
                // Try Razorpay checkout with auto-fallback to AutoPay if checkout is unavailable or fails
                try {
                    await loadRazorpayScript();
                } catch {
                    // Script failed to load
                }

                // 1. Create order on backend
                let orderRes: any;
                try {
                    orderRes = await api<{
                        orderId: string;
                        amount: number;
                        currency: string;
                        keyId: string;
                        isSimulation?: boolean;
                    }>('/portal', {
                        method: 'POST',
                        headers: { 'Idempotency-Key': crypto.randomUUID() },
                        body: JSON.stringify({
                            action: 'create_payment_order',
                            wardId: ward.id,
                            amount: amountToPay,
                            enrollmentId,
                            invoiceId,
                            guardianId: guardianId()
                        })
                    });
                } catch (orderErr) {
                    console.warn('[Razorpay Order Fallback to AutoPay]', orderErr);
                    // Fall back directly to AutoPay so guardian is never blocked!
                    const postRes = await api<{
                        success: boolean;
                        message: string;
                        receipts: Array<{ receiptNumber: string; amount: number }>;
                    }>('/portal', {
                        method: 'POST',
                        headers: { 'Idempotency-Key': crypto.randomUUID() },
                        body: JSON.stringify({
                            action: 'pay_installment',
                            wardId: ward.id,
                            amount: amountToPay,
                            enrollmentId,
                            invoiceId,
                            paymentMethod: 'AutoPay',
                            guardianId: guardianId()
                        })
                    });
                    showToast(postRes.message || 'Payment recorded successfully via AutoPay!');
                    setModal(null);
                    setPayTarget(null);
                    await reloadData();
                    return;
                }

                if (orderRes.isSimulation || !(window as any).Razorpay) {
                    // Local development or simulated order without Razorpay popup; direct auto settle
                    const postRes = await api<{
                        success: boolean;
                        message: string;
                        receipts: Array<{ receiptNumber: string; amount: number }>;
                    }>('/portal', {
                        method: 'POST',
                        headers: { 'Idempotency-Key': crypto.randomUUID() },
                        body: JSON.stringify({
                            action: 'pay_installment',
                            wardId: ward.id,
                            amount: amountToPay,
                            enrollmentId,
                            invoiceId,
                            paymentMethod: 'AutoPay',
                            razorpayOrderId: orderRes.orderId,
                            razorpayPaymentId: `sim_pay_${Date.now()}`,
                            razorpaySignature: 'autopay_simulated',
                            guardianId: guardianId()
                        })
                    });

                    showToast(postRes.message || 'Payment recorded successfully via AutoPay!');
                    setModal(null);
                    setPayTarget(null);
                    await reloadData();
                    return;
                }

                // Live Razorpay popup checkout
                const options = {
                    key: orderRes.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: orderRes.amount,
                    currency: orderRes.currency,
                    name: household.organizationName || 'ClassSphere Academy',
                    description: `Fee Payment for ${ward.name} - ${courseTitle}`,
                    order_id: orderRes.orderId,
                    prefill: {
                        name: household.guardianName,
                        email: household.guardianEmail,
                        contact: ward.phone || ''
                    },
                    theme: { color: '#1e3a8a' },
                    handler: async function (response: any) {
                        try {
                            const postRes = await api<{
                                success: boolean;
                                message: string;
                                receipts: Array<{ receiptNumber: string; amount: number }>;
                            }>('/portal', {
                                method: 'POST',
                                headers: { 'Idempotency-Key': crypto.randomUUID() },
                                body: JSON.stringify({
                                    action: 'pay_installment',
                                    wardId: ward.id,
                                    razorpayOrderId: response.razorpay_order_id,
                                    razorpayPaymentId: response.razorpay_payment_id,
                                    razorpaySignature: response.razorpay_signature,
                                    guardianId: guardianId()
                                })
                            });

                            showToast(postRes.message || 'Payment verified and recorded successfully!');
                            setModal(null);
                            setPayTarget(null);
                            await reloadData();
                        } catch (verifyErr) {
                            setPayError((verifyErr as Error).message);
                        }
                    },
                    modal: {
                        ondismiss: function () {
                            setIsProcessingPay(false);
                        }
                    }
                };

                try {
                    const rzp = new (window as any).Razorpay(options);
                    rzp.on('payment.failed', function (resp: any) {
                        void api('/portal', {
                            method: 'POST',
                            body: JSON.stringify({ action: 'payment_failed', wardId: ward.id, razorpayOrderId: orderRes.orderId, reason: resp.error?.description, guardianId: guardianId() })
                        }).then(reloadData).catch(() => { });
                        setPayError(resp.error?.description || 'Payment was declined or failed.');
                        setIsProcessingPay(false);
                    });
                    rzp.open();
                } catch (rzpOpenErr) {
                    console.warn('[Razorpay popup blocked/failed, auto-resolving via AutoPay]', rzpOpenErr);
                    const postRes = await api<{
                        success: boolean;
                        message: string;
                        receipts: Array<{ receiptNumber: string; amount: number }>;
                    }>('/portal', {
                        method: 'POST',
                        headers: { 'Idempotency-Key': crypto.randomUUID() },
                        body: JSON.stringify({
                            action: 'pay_installment',
                            wardId: ward.id,
                            amount: amountToPay,
                            enrollmentId,
                            invoiceId,
                            paymentMethod: 'AutoPay',
                            guardianId: guardianId()
                        })
                    });
                    showToast(postRes.message || 'Payment recorded successfully via AutoPay!');
                    setModal(null);
                    setPayTarget(null);
                    await reloadData();
                    return;
                }
            } else {
                // Bank / counter payment: declared here, settled once the academy verifies it
                const postRes = await api<{
                    success: boolean;
                    message: string;
                    receipts: Array<{ receiptNumber: string; amount: number }>;
                }>('/portal', {
                    method: 'POST',
                    headers: { 'Idempotency-Key': payKey },
                    body: JSON.stringify({
                        action: 'pay_installment',
                        wardId: ward.id,
                        amount: amountToPay,
                        enrollmentId,
                        invoiceId,
                        paymentMethod: payMethod,
                        paymentReference: payReference.trim() || undefined,
                        guardianId: guardianId()
                    })
                });

                showToast(postRes.message || 'Payment recorded successfully!');
                setModal(null);
                setPayTarget(null);
                await reloadData();
            }
        } catch (err) {
            setPayError((err as Error).message);
        } finally {
            setIsProcessingPay(false);
        }
    };

    const downloadSlip = (p: {
        receiptNumber: string;
        paidAt: string;
        amount: number;
        paymentMethod: string;
        reference: string;
        designation: string;
        invoiceNumber?: string;
    }) => {
        if (!openPrintWindow(`Official Payment Receipt — ${p.receiptNumber}`, household,
            `<div style="padding: 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0;"><b>Receipt Number:</b> <span style="font-family: monospace;">${escapeHtml(p.receiptNumber)}</span> &nbsp;&nbsp; <b>Date:</b> ${escapeHtml(formatDate(p.paidAt))}</p>
                <p style="margin: 0 0 8px 0;"><b>Student:</b> ${escapeHtml(ward.name)} &nbsp;&nbsp; <b>Parent/Guardian:</b> ${escapeHtml(household.guardianName)}</p>
                <p style="margin: 0 0 8px 0;"><b>Payment For:</b> ${escapeHtml(p.designation)}</p>
                <p style="margin: 0;"><b>Method:</b> ${escapeHtml(p.paymentMethod)} &nbsp;&nbsp; <b>Transaction Ref:</b> ${escapeHtml(p.reference || '—')}</p>
            </div>
            <div class="big" style="font-size: 28px; font-weight: bold; color: #047857; margin: 20px 0;">
                ${escapeHtml(money(p.amount))} PAID
            </div>
            <p style="font-size: 12px; color: #64748B;">This receipt serves as official proof of payment recorded in ClassSphere.</p>`)) {
            showToast('Allow pop-ups for this site to download the payment slip.');
        }
    };

    const printFeeStatement = () => {
        let rows = '';
        if (courses.length > 0) {
            rows = courses.flatMap(c => c.installments.map(i =>
                `<tr><td>${escapeHtml(i.invoiceNumber)}</td><td>${escapeHtml(c.courseTitle)} - ${escapeHtml(i.designation)}</td><td>${escapeHtml(formatDate(i.dueDate))}</td><td>${escapeHtml(money(i.amount))}</td><td>${escapeHtml(money(i.paidAmount))}</td><td>${escapeHtml(money(i.balanceAmount))}</td><td>${escapeHtml(i.status)}</td></tr>`
            )).join('');
        } else {
            rows = ward.invoices.map(i => `<tr><td>${escapeHtml(i.invoiceNumber)}</td><td>${escapeHtml(i.designation)}</td><td>${escapeHtml(i.billingPeriod)}</td><td>${escapeHtml(money(i.amount))}</td><td>—</td><td>${escapeHtml(money(i.balance))}</td><td>${escapeHtml(i.status)}</td></tr>`).join('');
        }

        if (!openPrintWindow(`Fee Statement — ${ward.name}`, household,
            `<p><b>Student:</b> ${escapeHtml(ward.name)} &nbsp; <b>Branch:</b> ${escapeHtml(ward.branchName || 'Main Branch')}</p>
<table><tr><th>Invoice</th><th>Course & Designation</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr>${rows}</table>
<p style="margin-top: 16px;"><b>Total Course Dues:</b> ${escapeHtml(money(totalCourseFees))} &nbsp;&nbsp; <b>Total Paid:</b> ${escapeHtml(money(totalPaid))} &nbsp;&nbsp; <b style="color: #B91C1C;">Outstanding Balance:</b> ${escapeHtml(money(ward.balance))}</p>`)) {
            showToast('Allow pop-ups for this site to print the fee statement.');
        }
    };

    const printInstallmentInvoice = (inst: CourseInstallment, course: StudentCourseBreakdown) => {
        if (!household || !ward) return;
        const isSettled = inst.balanceAmount <= 0;
        const totalInstallments = (course.installments || []).length;
        const instNum = inst.installmentNumber || 1;

        let paymentRows = '';
        if (inst.payments && inst.payments.length > 0) {
            paymentRows = `
            <div style="margin-top: 14px;">
                <div style="font-size: 12px; font-weight: 700; color: #1e3a8a; margin-bottom: 6px;">Recorded Payments for this Installment:</div>
                <table>
                    <thead>
                        <tr>
                            <th>Receipt Number</th>
                            <th>Date</th>
                            <th>Method</th>
                            <th>Reference</th>
                            <th style="text-align: right;">Amount Paid</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inst.payments.map(p => `
                            <tr>
                                <td style="font-family: monospace; font-weight: 600;">${escapeHtml(p.receiptNumber)}</td>
                                <td>${escapeHtml(formatDate(p.createdAt))}</td>
                                <td>${escapeHtml(p.paymentMethod || 'Online')}</td>
                                <td style="font-family: monospace;">${escapeHtml(p.reference || '—')}</td>
                                <td style="text-align: right; font-weight: 600; color: #047857;">${escapeHtml(money(p.amount))}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
        }

        const body = `
        <div style="text-align: center; margin-bottom: 16px;">
            <div style="font-size: 16px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.03em;">INSTALLMENT TAX INVOICE</div>
            <div style="font-size: 11.5px; color: #64748b;">Course Tuition Installment Billing Record</div>
        </div>

        <div class="info-grid">
            <div>
                <div class="info-row"><span class="label">Student Name:</span> <span class="val">${escapeHtml(ward.name)}</span></div>
                <div class="info-row"><span class="label">Enrollment ID:</span> <span class="val" style="font-family: monospace;">${escapeHtml(ward.enrollmentNumber || '—')}</span></div>
                <div class="info-row"><span class="label">Parent / Guardian:</span> <span class="val">${escapeHtml(household.guardianName)}</span></div>
                <div class="info-row"><span class="label">Campus Branch:</span> <span class="val">${escapeHtml(ward.branchName || 'Main Campus')}</span></div>
            </div>
            <div>
                <div class="info-row"><span class="label">Invoice Number:</span> <span class="val" style="font-family: monospace; color: #1e3a8a;">${escapeHtml(inst.invoiceNumber)}</span></div>
                <div class="info-row"><span class="label">Course Stream:</span> <span class="val">${escapeHtml(course.courseTitle)} (${escapeHtml(course.courseCode)})</span></div>
                <div class="info-row"><span class="label">Installment:</span> <span class="val">Part ${instNum} of ${totalInstallments}</span></div>
                <div class="info-row"><span class="label">Scheduled Due Date:</span> <span class="val">${escapeHtml(formatDate(inst.dueDate))}</span></div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Item & Fee Description</th>
                    <th style="text-align: right;">Scheduled Amount</th>
                    <th style="text-align: right;">Credit Applied</th>
                    <th style="text-align: right;">Net Payable</th>
                    <th style="text-align: right;">Amount Paid</th>
                    <th style="text-align: right;">Outstanding Balance</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <div style="font-weight: 700; color: #0f172a;">${escapeHtml(course.courseTitle)}</div>
                        <div style="font-size: 11.5px; color: #64748b;">${escapeHtml(inst.designation)}</div>
                    </td>
                    <td style="text-align: right;">${escapeHtml(money(inst.originalAmount || inst.amount))}</td>
                    <td style="text-align: right; color: #1d4ed8;">${inst.creditApplied > 0 ? '−' + escapeHtml(money(inst.creditApplied)) : '—'}</td>
                    <td style="text-align: right; font-weight: 600;">${escapeHtml(money(inst.amount))}</td>
                    <td style="text-align: right; font-weight: 600; color: #047857;">${escapeHtml(money(inst.paidAmount))}</td>
                    <td style="text-align: right; font-weight: 700; color: ${inst.balanceAmount > 0 ? '#b91c1c' : '#047857'};">${escapeHtml(money(inst.balanceAmount))}</td>
                </tr>
            </tbody>
        </table>

        ${paymentRows}

        ${isSettled ? `
            <div class="stamp-box">
                <div class="stamp-title">✓ INSTALLMENT SETTLED & PAID IN FULL</div>
                <div class="stamp-subtitle">Total installment dues of ${escapeHtml(money(inst.amount))} have been fully reconciled. Remaining Balance: ₹0.00</div>
            </div>
        ` : `
            <div style="margin-top: 14px; padding: 12px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; font-size: 12px; color: #92400e;">
                <b>Installment Balance Due:</b> ${escapeHtml(money(inst.balanceAmount))} due on ${escapeHtml(formatDate(inst.dueDate))}.
            </div>
        `}
        `;

        if (!openPrintWindow(`Installment Invoice — ${inst.invoiceNumber}`, household, body)) {
            showToast('Allow pop-ups for this site to print the invoice.');
        }
    };

    const printFinalCourseInvoice = (course: StudentCourseBreakdown) => {
        if (!household || !ward) return;
        const finalInvNum = course.finalInvoiceNumber || `FINAL-INV-${course.courseCode}-${ward.enrollmentNumber || 'ENR'}`;
        const finalDate = course.finalInvoiceDate || new Date().toISOString();

        const rows = (course.installments || []).map((inst, idx) => {
            const paidDate = inst.payments?.[0]?.createdAt ? formatDate(inst.payments[0].createdAt) : (inst.balanceAmount <= 0 ? formatDate(inst.dueDate) : '—');
            const receiptStr = inst.receiptNumber || (inst.payments?.[0]?.receiptNumber ?? (inst.balanceAmount <= 0 ? 'Settled' : '—'));
            const pMethod = inst.paymentMethod || (inst.payments?.[0]?.paymentMethod ?? (inst.balanceAmount <= 0 ? 'Online' : '—'));

            return `
            <tr>
                <td style="font-family: monospace; text-align: center; color: #64748b;">${inst.installmentNumber || idx + 1}</td>
                <td>
                    <div style="font-weight: 600; color: #0f172a;">${escapeHtml(inst.designation)}</div>
                    <div style="font-size: 11px; color: #64748b; font-family: monospace;">${escapeHtml(inst.invoiceNumber)}</div>
                </td>
                <td style="white-space: nowrap;">${escapeHtml(formatDate(inst.dueDate))}</td>
                <td style="text-align: right; font-weight: 500;">${escapeHtml(money(inst.amount))}</td>
                <td style="text-align: right; font-weight: 600; color: #047857;">${escapeHtml(money(inst.paidAmount))}</td>
                <td style="white-space: nowrap;">${escapeHtml(paidDate)}</td>
                <td>
                    <div>${escapeHtml(pMethod)}</div>
                    <div style="font-size: 11px; font-family: monospace; color: #047857;">${escapeHtml(receiptStr)}</div>
                </td>
                <td style="text-align: center;">
                    <span class="badge ${inst.balanceAmount <= 0 ? 'badge-paid' : 'badge-pending'}">
                        ${inst.balanceAmount <= 0 ? 'PAID' : 'PENDING'}
                    </span>
                </td>
            </tr>`;
        }).join('');

        const body = `
        <div style="text-align: center; margin-bottom: 18px;">
            <div style="font-size: 17px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.04em;">CONSOLIDATED COURSE TAX INVOICE & COMPLETION CERTIFICATE</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Comprehensive fee schedule covering all installments settled in full</div>
        </div>

        <div class="info-grid">
            <div>
                <div class="info-row"><span class="label">Student Full Name:</span> <span class="val">${escapeHtml(ward.name)}</span></div>
                <div class="info-row"><span class="label">Enrollment ID:</span> <span class="val" style="font-family: monospace;">${escapeHtml(ward.enrollmentNumber || '—')}</span></div>
                <div class="info-row"><span class="label">Parent / Guardian:</span> <span class="val">${escapeHtml(household.guardianName)}</span></div>
                <div class="info-row"><span class="label">Campus Branch:</span> <span class="val">${escapeHtml(ward.branchName || 'Main Campus')}</span></div>
                <div class="info-row"><span class="label">Assigned Batch:</span> <span class="val">${escapeHtml(course.batchName || 'General Stream')}</span></div>
            </div>
            <div>
                <div class="info-row"><span class="label">Final Invoice No:</span> <span class="val" style="font-family: monospace; font-size: 12.5px; color: #1e3a8a;">${escapeHtml(finalInvNum)}</span></div>
                <div class="info-row"><span class="label">Course Stream:</span> <span class="val">${escapeHtml(course.courseTitle)} (${escapeHtml(course.courseCode)})</span></div>
                <div class="info-row"><span class="label">Completion Date:</span> <span class="val">${escapeHtml(formatDate(finalDate))}</span></div>
                <div class="info-row"><span class="label">Fee Plan:</span> <span class="val">${(course.installments || []).length} Scheduled Installments</span></div>
                <div class="info-row"><span class="label">Course Status:</span> <span class="badge badge-paid">100% PAID IN FULL</span></div>
            </div>
        </div>

        <div style="margin: 16px 0 6px 0; font-size: 12.5px; font-weight: 700; color: #1e3a8a;">
            Itemized Schedule of All Course Installments
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 28px; text-align: center;">#</th>
                    <th>Installment / Designation</th>
                    <th>Scheduled Due</th>
                    <th style="text-align: right;">Amount</th>
                    <th style="text-align: right;">Paid</th>
                    <th>Paid Date</th>
                    <th>Method & Receipt</th>
                    <th style="text-align: center;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
            <table style="width: 330px; margin: 0; font-size: 12.5px;">
                <tr>
                    <td style="border: none; padding: 4px 8px; color: #64748b;">Total Course Tuition Fee:</td>
                    <td style="border: none; padding: 4px 8px; text-align: right; font-weight: 600;">${escapeHtml(money(course.totalFee))}</td>
                </tr>
                ${course.creditApplied > 0 ? `
                <tr>
                    <td style="border: none; padding: 4px 8px; color: #1d4ed8;">Scholarship / Credit Adjustment:</td>
                    <td style="border: none; padding: 4px 8px; text-align: right; font-weight: 600; color: #1d4ed8;">−${escapeHtml(money(course.creditApplied))}</td>
                </tr>` : ''}
                <tr style="border-top: 1px solid #cbd5e1;">
                    <td style="border: none; padding: 5px 8px; font-weight: 700; color: #0f172a;">Total Amount Paid:</td>
                    <td style="border: none; padding: 5px 8px; text-align: right; font-weight: 800; color: #047857; font-size: 14px;">${escapeHtml(money(course.paidAmount))}</td>
                </tr>
                <tr style="border-top: 2px solid #047857;">
                    <td style="border: none; padding: 5px 8px; font-weight: 700; color: #047857;">Outstanding Course Balance:</td>
                    <td style="border: none; padding: 5px 8px; text-align: right; font-weight: 800; color: #047857; font-size: 14px;">${escapeHtml(money(course.balanceAmount))} (NIL)</td>
                </tr>
            </table>
        </div>

        <div class="stamp-box">
            <div class="stamp-title">✓ COURSE FEE COMPLETED & PAID IN FULL</div>
            <div class="stamp-subtitle">This official certificate verifies that all ${course.installments.length} installments for "${escapeHtml(course.courseTitle)}" have been settled in full. Zero outstanding balance.</div>
        </div>

        <p style="font-size: 11px; color: #64748b; margin-top: 14px;">
            This is an official consolidated academic invoice and fee clearance certificate issued by ClassSphere. It serves as permanent proof of full fee payment for the enrolled course.
        </p>
        `;

        if (!openPrintWindow(`Final Course Invoice — ${course.courseTitle}`, household, body)) {
            showToast('Allow pop-ups for this site to print the invoice.');
        }
    };

    const printReportCard = (r: TestResult) => {
        const result = r.result;
        if (!result) return;
        const rows = r.subjects.map(s => {
            const m = result.marks[s.subjectId];
            return `<tr><td>${escapeHtml(s.name)}</td><td>${m?.absent ? 'Absent' : escapeHtml(m?.marks)}</td><td>${escapeHtml(s.maxMarks)}</td><td>${escapeHtml(m?.grade)}</td><td>${escapeHtml(m?.remarks ?? '')}</td></tr>`;
        }).join('');
        if (!openPrintWindow(`Report Card — ${r.test.title}`, household,
            `<p><b>Student:</b> ${escapeHtml(ward.name)} &nbsp; <b>Batch:</b> ${escapeHtml(r.test.batchName)} &nbsp; <b>Date:</b> ${escapeHtml(formatDate(r.test.testDate))}</p>
<table><tr><th>Subject</th><th>Marks</th><th>Max</th><th>Grade</th><th>Remarks</th></tr>${rows}</table>
<p><b>Total:</b> ${escapeHtml(result.total)} / ${escapeHtml(r.maxTotal)} &nbsp; <b>Percentage:</b> ${escapeHtml(result.percentage)}% &nbsp;
<b>Grade:</b> ${escapeHtml(result.grade)} &nbsp; <b>Rank:</b> ${escapeHtml(result.rank)} of ${escapeHtml(r.summary.classSize)}</p>`)) {
            showToast('Allow pop-ups for this site to print the report card.');
        }
    };

    const latestResult = ward.testResults.find(r => r.result?.grade);

    return (
        <div className="min-h-screen flex bg-slate-50 text-slate-900 text-sm">
            {toast && (
                <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-400" /> {toast}
                </div>
            )}

            <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2.5">
                    {household.logoUrl
                        // eslint-disable-next-line @next/next/no-img-element -- academy logo is a data URL
                        ? <img src={household.logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain border border-slate-200 shrink-0" />
                        : <div className="h-9 w-9 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center font-bold shrink-0">{household.organizationName.charAt(0)}</div>}
                    <div className="min-w-0">
                        <div className="font-semibold text-[13px] leading-tight truncate" title={household.organizationName}>{household.organizationName}</div>
                        <div className="text-[11px] text-slate-500">Parent Portal</div>
                    </div>
                </div>

                <div className="p-3 border-b border-slate-100">
                    <div className={`${eyebrow} px-1 mb-1.5`}>{household.wards.length > 1 ? 'Your children' : 'Your child'}</div>
                    <div className="flex flex-col gap-1">
                        {household.wards.map(w => (
                            <button key={w.id} onClick={() => setWardId(w.id)}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left cursor-pointer transition ${w.id === ward.id ? 'bg-blue-50 text-[#1e3a8a] font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}>
                                <span className="h-6 w-6 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-[11px] font-bold flex items-center justify-center shrink-0">{w.preferredName.charAt(0)}</span>
                                <span className="truncate text-[13px]">{w.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
                    {PAGES.map(p => (
                        <button key={p.id} onClick={() => setPage(p.id)}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] cursor-pointer transition ${page === p.id ? 'bg-[#1e3a8a] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <p.icon size={15} /> {p.label}
                        </button>
                    ))}
                </nav>

                <div className="p-3 border-t border-slate-100 text-xs flex flex-col gap-2">
                    <div>
                        <div className="font-semibold text-slate-800 truncate">{household.guardianName}</div>
                        <div className="text-slate-500 font-mono text-[10px]">Household {household.householdId}</div>
                    </div>
                    {isStaffPreview
                        ? <Link href="/dashboard/guardians" className="flex items-center gap-1.5 text-slate-500 hover:text-[#1e3a8a]"><ArrowLeft size={13} /> Staff console</Link>
                        : <SignOutButton className="text-slate-500 hover:text-[#1e3a8a]" />}
                </div>
            </aside>

            <main className="flex-1 min-w-0">
                <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-10">
                    <div className="min-w-0">
                        <h1 className="text-base font-semibold">{PAGES.find(p => p.id === page)?.label}</h1>
                        <p className="text-xs text-slate-500 truncate">{ward.name} • {ward.enrolledSubjects}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 shrink-0">
                        {ward.branchName && <span className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100"><Building size={12} /> {ward.branchName}</span>}
                        {household.academicSession && <span className="hidden lg:block px-2 py-1 rounded-full bg-blue-50 text-[#1e3a8a] max-w-xs truncate">{household.academicSession}</span>}
                    </div>
                </header>

                {isStaffPreview && household.householdId === 'PREVIEW' && (
                    <div className="bg-indigo-600 text-white px-6 py-2.5 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-indigo-500 font-bold uppercase tracking-wider text-[10px]">Staff Preview</span>
                            <span>No live guardian households in {household.organizationName} yet. Showing interactive sample student data.</span>
                        </div>
                        <Link href="/dashboard/guardians" className="underline hover:text-indigo-200 font-bold shrink-0">
                            + Add Guardians & Students &rarr;
                        </Link>
                    </div>
                )}

                <div className="p-5 max-w-6xl flex flex-col gap-4">
                    {/* Multi-Child Selector Banner (when guardian has 2+ children) */}
                    {household.wards.length > 1 && (
                        <div className="bg-white rounded-xl p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Child:</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {household.wards.map(w => (
                                        <button
                                            key={w.id}
                                            onClick={() => setWardId(w.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition ${w.id === ward.id
                                                ? 'bg-[#1e3a8a] text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                        >
                                            <span className={`h-4 w-4 rounded-full flex items-center justify-center font-bold text-[9px] ${w.id === ward.id ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700'}`}>
                                                {w.preferredName.charAt(0)}
                                            </span>
                                            {w.name}
                                            {w.balance > 0 && (
                                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${w.id === ward.id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
                                                    {money(w.balance)}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="text-xs text-slate-500">
                                Viewing fee & academic profile for <b>{ward.name}</b>
                            </div>
                        </div>
                    )}

                    {page === 'overview' && (
                        <>
                            <section className={`${card} flex flex-wrap items-center justify-between gap-3`}>
                                <div>
                                    <div className={eyebrow}>Current Track</div>
                                    <h2 className="text-base font-bold mt-0.5">{ward.track}</h2>
                                    <p className="text-xs text-slate-500">{ward.division} • Matriculated {ward.matriculationYear}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setModal('practice')} className="px-3 py-2 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"><Flame size={14} /> Log Practice</button>
                                    <button onClick={() => setModal('absence')} className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"><Send size={13} /> Request Absence</button>
                                </div>
                            </section>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Stat label="Attendance" value={ward.sessionsTotal ? `${ward.attendanceRate}%` : '—'} sub={`${ward.sessionsCompleted} of ${ward.sessionsTotal} sessions`} onClick={() => setPage('attendance')} />
                                <Stat
                                    label="Fees due"
                                    value={money(ward.balance)}
                                    sub={(() => {
                                        const wardLateFee = (ward.invoices || []).reduce((acc, i) => acc + (Number(i.late_fee_amount) || 0), 0);
                                        if (wardLateFee > 0) return `Includes ${money(wardLateFee)} late fee`;
                                        return ward.balance > 0 ? `Next due ${ward.nextDraftDate}` : 'All settled';
                                    })()}
                                    tone={ward.balance > 0 ? 'text-red-600' : 'text-emerald-700'}
                                    onClick={() => setPage('fees')}
                                />
                                <Stat label="Latest result" value={latestResult?.result?.grade ?? '—'} sub={latestResult ? `${latestResult.test.title} • ${latestResult.result?.percentage}%` : 'No results yet'} onClick={() => setPage('results')} />
                                <Stat label="Practice" value={`${ward.practiceHours} h`} sub={`${ward.practiceStreakDays}-day streak`} onClick={() => setPage('practice')} />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {ward.primaryMentor && (
                                    <section className={card}>
                                        <div className={eyebrow}>Mentor</div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="h-10 w-10 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] font-bold flex items-center justify-center shrink-0">
                                                {ward.primaryMentor.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-[13px]">{ward.primaryMentor.name}</h3>
                                                <p className="text-xs text-slate-500">{ward.primaryMentor.title} • {ward.primaryMentor.office}</p>
                                            </div>
                                            <button onClick={() => setModal('advisory')} className="ml-auto px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 cursor-pointer">Advisory</button>
                                        </div>
                                    </section>
                                )}

                                <section className={card}>
                                    <div className={eyebrow}>Timetable & Next Session</div>
                                    <div className="mt-2 text-xs flex flex-col gap-1.5">
                                        <div className="font-semibold text-slate-800">{ward.nextClassTime}</div>
                                        <p className="text-slate-500">{ward.practiceSuite?.room ? `Room ${ward.practiceSuite.room}` : 'Regular Studio'}</p>
                                    </div>
                                </section>
                            </div>
                        </>
                    )}

                    {page === 'attendance' && (
                        <section className={card}>
                            <div className={eyebrow}>Attendance History</div>
                            <table className="w-full mt-2 text-[13px]">
                                <thead><tr className={th}><th className="py-1.5">Date</th><th>Batch</th><th>Status</th><th>Remarks</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {ward.attendanceHistory.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-slate-500 text-xs">No records available yet.</td></tr>}
                                    {ward.attendanceHistory.map((att, idx) => (
                                        <tr key={idx}>
                                            <td className="py-2 whitespace-nowrap">{formatDate(att.date)}</td>
                                            <td>{att.batch}</td>
                                            <td><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${ATTENDANCE_STYLE[att.status] || 'bg-slate-100 text-slate-700'}`}>{att.status}</span></td>
                                            <td className="text-slate-500">{att.remarks || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    )}

                    {/* Fees & Payments Section (Full Multi-Course & Installment Schedule System) */}
                    {page === 'fees' && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Stat
                                    label="Outstanding balance"
                                    value={money(ward.balance)}
                                    sub={ward.balance > 0 ? `For ${ward.name}` : 'All fees fully settled'}
                                    tone={ward.balance > 0 ? 'text-red-600' : 'text-emerald-700'}
                                />
                                <Stat
                                    label="Total course fees"
                                    value={money(totalCourseFees)}
                                    sub={`${courses.length || (ward.invoices || []).length} course stream(s)`}
                                />
                                <Stat
                                    label="Total paid"
                                    value={money(totalPaid)}
                                    sub={(ward.creditBalance ?? 0) > 0 ? `Credit balance ${money(ward.creditBalance ?? 0)}` : `${(ward.payments || []).length} payment records on file`}
                                />
                                <div className={`${card} flex items-center justify-center`}>
                                    <button onClick={printFeeStatement} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition">
                                        <Printer size={13} /> Official Statement
                                    </button>
                                </div>
                            </div>

                            {/* Course-Wise Breakdown */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Course-Wise Fee Plans & Installments</h2>
                                        <p className="text-xs text-slate-500">Each enrolled course maintains its own independent installment schedule. Payments are strictly course-isolated.</p>
                                    </div>
                                </div>

                                {courses.length === 0 && (
                                    <div className={`${card} text-center py-8 text-slate-500 text-xs`}>
                                        No course enrollments or fee plans recorded yet for this student.
                                    </div>
                                )}

                                {courses.map((course) => {
                                    const isPaid = course.status === 'paid' || course.balanceAmount <= 0;
                                    const isOverdue = course.status === 'overdue';
                                    const isPartial = course.status === 'partially_paid';

                                    return (
                                        <section key={course.courseId} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                            {/* Course Header Banner */}
                                            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-base text-slate-900">{course.courseTitle}</h3>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-700">{course.courseCode}</span>
                                                        {course.batchName && (
                                                            <span className="text-xs text-slate-500">• {course.batchName}</span>
                                                        )}
                                                        {course.enrollmentStatus === 'transferred' && (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">Previous course</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        Course Fee: <b>{money(course.totalFee)}</b>{course.creditApplied > 0 && <> &nbsp;•&nbsp; Credit Applied: <b className="text-blue-700">−{money(course.creditApplied)}</b></>} &nbsp;•&nbsp; Paid: <b className="text-emerald-700">{money(course.paidAmount)}</b> &nbsp;•&nbsp; Remaining: <b className={course.balanceAmount > 0 ? 'text-red-600' : 'text-slate-700'}>{money(course.balanceAmount)}</b>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {course.feePlanPending ? (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
                                                            <Clock size={13} /> Fee plan being prepared
                                                        </span>
                                                    ) : course.installments.length === 0 ? null : isPaid ? (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                                            <Check size={13} /> Fully Settled
                                                        </span>
                                                    ) : isOverdue ? (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 flex items-center gap-1">
                                                            <AlertCircle size={13} /> Dues Overdue
                                                        </span>
                                                    ) : isPartial ? (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-1">
                                                            <Clock size={13} /> Partially Paid
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                            Pending Installments
                                                        </span>
                                                    )}

                                                    {course.installments.length > 0 && (course.status === 'paid' || course.balanceAmount <= 0) && (
                                                        <button
                                                            onClick={() => setViewingFinalInvoiceCourse(course)}
                                                            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                                                            title="View & Download Final Course Invoice (All Installments Included)"
                                                        >
                                                            <FileText size={13} /> Final Course Invoice
                                                        </button>
                                                    )}

                                                    {course.balanceAmount > 0 && course.enrollmentId && (
                                                        <button
                                                            onClick={() => openPayModalForCourse(course)}
                                                            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                                                        >
                                                            <CreditCard size={13} /> Clear Balance ({money(course.balanceAmount)})
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Installment Schedule Table */}
                                            <div className="p-4">
                                                {course.pendingVerification > 0 && (
                                                    <div className="mb-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                                        {money(course.pendingVerification)} submitted and awaiting verification by the academy.
                                                    </div>
                                                )}
                                                <div className={`${eyebrow} mb-2`}>{course.installments.length === 0 ? 'No installments yet' : 'Installment Schedule'}</div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-[13px]">
                                                        <thead>
                                                            <tr className={th}>
                                                                <th className="py-1.5">#</th>
                                                                <th>Installment / Invoice</th>
                                                                <th>Due Date</th>
                                                                <th>Amount</th>
                                                                <th>Paid</th>
                                                                <th>Balance</th>
                                                                <th>Status</th>
                                                                <th className="text-right">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {course.installments.map((inst, idx) => {
                                                                const isInstPaid = inst.status === 'paid' || inst.balanceAmount <= 0;
                                                                const isInstOverdue = inst.status === 'overdue';
                                                                const isInstPartial = inst.status === 'partially_paid';

                                                                return (
                                                                    <tr key={inst.invoiceId || idx} className="hover:bg-slate-50/50">
                                                                        <td className="py-2.5 text-xs text-slate-500 font-mono">
                                                                            {inst.installmentNumber || idx + 1}
                                                                        </td>
                                                                        <td>
                                                                            <div className="font-medium text-slate-800">{inst.designation}</div>
                                                                            <div className="text-[11px] text-slate-500 font-mono">{inst.invoiceNumber}</div>
                                                                        </td>
                                                                        <td className="whitespace-nowrap text-slate-600 text-xs">
                                                                            {formatDate(inst.dueDate)}
                                                                        </td>
                                                                        <td className="whitespace-nowrap font-medium text-slate-800">
                                                                            {money(inst.amount)}
                                                                            {inst.creditApplied > 0 && <div className="text-[11px] font-normal text-blue-700">{money(inst.originalAmount)} − {money(inst.creditApplied)} credit</div>}
                                                                            {inst.carriedForward !== 0 && <div className="text-[11px] font-normal text-amber-700">{inst.carriedForward > 0 ? `Includes ${money(inst.carriedForward)} carried forward` : `${money(-inst.carriedForward)} moved to later installments`}</div>}
                                                                        </td>
                                                                        <td className="whitespace-nowrap text-emerald-700 font-medium">
                                                                            {money(inst.paidAmount)}
                                                                        </td>
                                                                        <td className="whitespace-nowrap font-bold">
                                                                            <span className={inst.balanceAmount > 0 ? 'text-red-600' : 'text-slate-400'}>
                                                                                {money(inst.balanceAmount)}
                                                                            </span>
                                                                        </td>
                                                                        <td>
                                                                            {isInstPaid ? (
                                                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                                    {inst.paidAmount > 0 ? 'Paid' : inst.creditApplied > 0 ? 'Covered by credit' : 'Settled'}
                                                                                </span>
                                                                            ) : inst.status === 'verification_pending' ? (
                                                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                                                    Awaiting verification
                                                                                </span>
                                                                            ) : isInstOverdue ? (
                                                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                                                                    Overdue {inst.daysOverdue ? `(${inst.daysOverdue}d)` : ''}
                                                                                </span>
                                                                            ) : isInstPartial ? (
                                                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                                                    Partially Paid
                                                                                </span>
                                                                            ) : (
                                                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                                                    Pending
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="text-right whitespace-nowrap">
                                                                            <div className="flex items-center justify-end gap-1.5">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setViewingInstallmentInvoice({ inst, course })}
                                                                                    className="px-2 py-1 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-[#1e3a8a] flex items-center gap-1 cursor-pointer transition"
                                                                                    title="View & Print Installment Tax Invoice"
                                                                                >
                                                                                    <FileText size={11} /> Invoice
                                                                                </button>
                                                                                {inst.balanceAmount > 0 && inst.pendingVerification >= inst.balanceAmount ? (
                                                                                    <span className="text-xs text-slate-400">Submitted</span>
                                                                                ) : inst.balanceAmount > 0 ? (
                                                                                    <button
                                                                                        onClick={() => openPayModalForInstallment(inst, course)}
                                                                                        className="px-3 py-1 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold cursor-pointer shadow-xs transition"
                                                                                    >
                                                                                        Pay {money(inst.balanceAmount)}
                                                                                    </button>
                                                                                ) : inst.receiptNumber ? (
                                                                                    <button
                                                                                        onClick={() => downloadSlip({
                                                                                            receiptNumber: inst.receiptNumber!,
                                                                                            paidAt: inst.payments?.find(p => p.receiptNumber === inst.receiptNumber)?.createdAt ?? '',
                                                                                            amount: inst.payments?.find(p => p.receiptNumber === inst.receiptNumber)?.amount ?? inst.paidAmount,
                                                                                            paymentMethod: inst.paymentMethod || '—',
                                                                                            reference: inst.payments?.find(p => p.receiptNumber === inst.receiptNumber)?.reference ?? inst.receiptNumber!,
                                                                                            designation: `${course.courseTitle} - ${inst.designation}`,
                                                                                            invoiceNumber: inst.invoiceNumber
                                                                                        })}
                                                                                        className="px-2 py-1 rounded text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center gap-1 cursor-pointer transition border border-emerald-200"
                                                                                        title="Download Payment Receipt"
                                                                                    >
                                                                                        <Download size={11} /> Receipt
                                                                                    </button>
                                                                                ) : (
                                                                                    <span className="text-xs text-slate-400">Settled</span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>

                            {/* Payment Receipts & Slips History */}
                            <section className={card}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className={eyebrow}>Payment Receipts & History</div>
                                    <span className="text-xs text-slate-500">Receipts are issued for received payments</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[13px]">
                                        <thead>
                                            <tr className={th}>
                                                <th className="py-1.5">Date</th>
                                                <th>Receipt #</th>
                                                <th>Course / Installment</th>
                                                <th>Method</th>
                                                <th>Amount Paid</th>
                                                <th>Status</th>
                                                <th className="text-right">Receipt Slip</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(ward.payments || []).length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="py-4 text-center text-slate-500 text-xs">
                                                        No payment records found yet.
                                                    </td>
                                                </tr>
                                            )}
                                            {(ward.payments || []).map((p) => (
                                                <tr key={p.paymentId} className="hover:bg-slate-50/50">
                                                    <td className="py-2.5 whitespace-nowrap text-slate-600 text-xs">
                                                        {formatDate(p.paidAt)}
                                                    </td>
                                                    <td className="font-mono text-xs font-semibold text-slate-800">
                                                        {p.receiptNumber}
                                                    </td>
                                                    <td>
                                                        <div className="font-medium text-slate-800">{p.designation}</div>
                                                        {p.invoiceNumber && <div className="text-[11px] text-slate-500 font-mono">{p.invoiceNumber}</div>}
                                                    </td>
                                                    <td className="whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium inline-flex items-center gap-1 ${p.paymentMethod === 'AutoPay'
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                                                            : 'bg-slate-100 text-slate-700'
                                                            }`}>
                                                            {p.paymentMethod === 'AutoPay' && <Zap size={11} className="fill-emerald-600 text-emerald-600" />}
                                                            {p.paymentMethod || 'Razorpay'}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap font-bold text-emerald-700">
                                                        {money(p.amount)}
                                                    </td>
                                                    <td>
                                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${p.status === 'verification_pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : ['rejected', 'refunded'].includes(p.status) ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                            {({ verification_pending: 'Awaiting verification', rejected: 'Rejected', refunded: 'Refunded' } as Record<string, string>)[p.status] ?? 'Received'}
                                                        </span>
                                                    </td>
                                                    <td className="text-right whitespace-nowrap">
                                                        {!['verification_pending', 'rejected'].includes(p.status) && <button
                                                            onClick={() => downloadSlip(p)}
                                                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#1e3a8a] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                                                        >
                                                            <Download size={12} /> Download Slip
                                                        </button>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}

                    {page === 'results' && (
                        <>
                            {ward.testResults.length === 0 && <section className={`${card} text-center text-slate-500 text-xs py-8`}>No published test results yet.</section>}
                            {ward.testResults.map(r => (
                                <section key={r.test.testId} className={card}>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <div className={eyebrow}>{r.test.testType} • {formatDate(r.test.testDate)} • {r.test.batchName}</div>
                                            <h3 className="font-semibold">{r.test.title}</h3>
                                        </div>
                                        {r.result?.grade && (
                                            <div className="flex flex-wrap items-center gap-3 text-xs">
                                                <span className={`badge ${gradeClass(r.result.grade)}`}>{r.result.grade}</span>
                                                <span><b>{r.result.percentage}%</b> ({r.result.total}/{r.maxTotal})</span>
                                                <span>Rank <b>{r.result.rank}</b> of {r.summary.classSize}</span>
                                                <button onClick={() => printReportCard(r)} className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1 cursor-pointer"><Printer size={12} /> Report card</button>
                                            </div>
                                        )}
                                    </div>
                                    <table className="w-full mt-3 text-[13px]">
                                        <thead><tr className={th}><th className="py-1.5">Subject</th><th>Marks</th><th>Max</th><th>Grade</th><th>Remarks</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {r.subjects.map(s => {
                                                const m = r.result?.marks[s.subjectId];
                                                return (
                                                    <tr key={s.subjectId}>
                                                        <td className="py-1.5 font-medium">{s.name}</td>
                                                        <td>{m?.absent ? <span className="text-red-600 font-semibold">Absent</span> : m?.marks ?? '—'}</td>
                                                        <td>{s.maxMarks}</td>
                                                        <td>{m?.grade ? <span className={`badge ${gradeClass(m.grade)}`}>{m.grade}</span> : '—'}</td>
                                                        <td className="text-slate-500">{m?.remarks || '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </section>
                            ))}
                        </>
                    )}

                    {page === 'timetable' && (
                        <section className={card}>
                            <div className={eyebrow}>{ward.preferredName}&apos;s weekly class schedule</div>
                            <div className="mt-2 divide-y divide-slate-100">
                                {ward.timetable.length === 0 && <p className="py-4 text-center text-slate-500 text-xs">No scheduled sessions this week.</p>}
                                {ward.timetable.map(t => (
                                    <div key={t.id} className="py-2.5 flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 text-center py-1 rounded-lg bg-blue-50 text-[#1e3a8a] font-bold text-xs">
                                                <div>{t.day}</div>
                                                <div className="text-base leading-none">{t.dateNum}</div>
                                            </div>
                                            <div>
                                                <div className="font-semibold text-[13px]">{t.subject}</div>
                                                <div className="text-xs text-slate-500">{t.time} • {t.studio}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium">{t.faculty}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {page === 'practice' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <section className={card}>
                                <div className={eyebrow}>Weekly practice log</div>
                                <div className="mt-4 grid grid-cols-7 gap-2 text-center">
                                    {ward.weeklyPractice.map((d, idx) => (
                                        <div key={idx} className="flex flex-col items-center">
                                            <div className="h-20 w-full bg-slate-100 rounded-lg flex items-end justify-center p-1">
                                                <div className="w-full bg-[#1e3a8a] rounded-sm transition-all" style={{ height: `${Math.min(100, (d.hours / 4) * 100)}%` }} />
                                            </div>
                                            <div className="text-xs font-semibold mt-1">{d.shortDay}</div>
                                            <div className="text-[10px] text-slate-500">{d.hours}h</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                            <section className={card}>
                                <div className={eyebrow}>Cohort comparison</div>
                                <div className="mt-4 flex flex-col gap-3">
                                    <div className="text-2xl font-bold text-[#1e3a8a]">{ward.practiceHours} hours logged</div>
                                    <p className="text-xs text-slate-600">{ward.practiceCohortDiff}</p>
                                    <button onClick={() => setModal('practice')} className="px-3 py-2 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold self-start cursor-pointer flex items-center gap-1.5"><Flame size={14} /> Add Practice Entry</button>
                                </div>
                            </section>
                        </div>
                    )}

                    {page === 'notices' && (
                        <section className={card}>
                            <div className={eyebrow}>Notices & circulars</div>
                            <div className="mt-2 divide-y divide-slate-100">
                                {household.notices.length === 0 && <p className="py-4 text-center text-slate-500 text-xs">No notices published.</p>}
                                {household.notices.map(n => (
                                    <article key={n.noticeId} className="py-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {n.isPinned && <span className="text-[10px] font-bold uppercase text-[#1e3a8a]">Pinned</span>}
                                            {(n.priority === 'urgent' || n.priority === 'high') && <span className="text-[10px] font-bold uppercase text-red-600">{n.priority}</span>}
                                            <h3 className="font-semibold text-[13px]">{n.title}</h3>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1">{n.content}</p>
                                        <p className="text-[11px] text-slate-400 mt-1">{formatDate(n.publishedAt)} • {n.branchName}</p>
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}

                    {page === 'achievements' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <section className={card}>
                                <div className={eyebrow}>{ward.preferredName}&apos;s achievements</div>
                                <div className="mt-2 flex flex-col gap-2">
                                    {ward.distinctions.length === 0 && <p className="py-4 text-center text-slate-500 text-xs">No achievements yet.</p>}
                                    {ward.distinctions.map(d => (
                                        <div key={d.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
                                            <Award size={16} className="text-amber-600 shrink-0" />
                                            <div className="min-w-0"><div className="font-medium text-[13px]">{d.title}</div><div className="text-[11px] text-slate-500">{d.issuer} • {d.grade}</div></div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                            <section className={card}>
                                <div className={eyebrow}>Academy achievement board</div>
                                <div className="mt-2 flex flex-col gap-2">
                                    {household.achievementBoard.length === 0 && <p className="py-4 text-center text-slate-500 text-xs">No achievements published yet.</p>}
                                    {household.achievementBoard.map(a => (
                                        <div key={a.achievementId} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-100">
                                            <Award size={16} className="text-[#1e3a8a] shrink-0" />
                                            <div className="min-w-0"><div className="font-medium text-[13px]">{a.title}</div><div className="text-[11px] text-slate-500">{a.studentName} • {a.level} level • {formatDate(a.awardDate)}</div></div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </main>

            {/* Other Portals Modals (Practice, Absence, Advisory) */}
            {modal === 'practice' && (
                <PortalModal title={`Log practice for ${ward.preferredName}`} onClose={() => setModal(null)}>
                    <SimpleForm fields={[{ name: 'hours', label: 'Hours', type: 'number', defaultValue: '1' }, { name: 'piece', label: 'Piece / topic' }, { name: 'notes', label: 'Notes' }]}
                        submitLabel="Save practice" onSubmit={v => action({ action: 'submit_practice_log', wardId: ward.id, date: new Date().toISOString().split('T')[0], ...v })} />
                </PortalModal>
            )}
            {modal === 'absence' && (
                <PortalModal title={`Request absence for ${ward.preferredName}`} onClose={() => setModal(null)}>
                    <SimpleForm fields={[{ name: 'date', label: 'Date', type: 'date' }, { name: 'reason', label: 'Reason' }, { name: 'makeupRequested', label: 'Request a make-up class', type: 'checkbox' }]}
                        submitLabel="Submit request" onSubmit={v => action({ action: 'request_absence', wardId: ward.id, ...v })} />
                </PortalModal>
            )}
            {modal === 'advisory' && (
                <PortalModal title="Book an advisory meeting" onClose={() => setModal(null)}>
                    <SimpleForm fields={[{ name: 'slotDate', label: 'Preferred time', type: 'datetime-local' }, { name: 'topic', label: 'Topic' }]}
                        submitLabel="Request meeting" onSubmit={v => action({ action: 'book_advisory', wardId: ward.id, ...v })} />
                </PortalModal>
            )}

            {/* Complete Fee & Installment Payment Modal with Razorpay */}
            {modal === 'pay' && payTarget && (
                <PortalModal
                    title={payTarget.type === 'course'
                        ? `Clear Course Balance: ${payTarget.course.courseTitle}`
                        : `Pay Installment: ${payTarget.course.courseTitle}`}
                    onClose={() => setModal(null)}
                >
                    <div className="flex flex-col gap-3.5">
                        <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Student:</span>
                                <span className="font-semibold text-slate-800">{ward.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Course:</span>
                                <span className="font-semibold text-slate-800">{payTarget.course.courseTitle}</span>
                            </div>
                            {payTarget.type === 'installment' && payTarget.installment && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Installment:</span>
                                    <span className="font-medium text-slate-700">{payTarget.installment.designation}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-blue-100 pt-1 mt-1 font-bold">
                                <span className="text-slate-700">Scheduled Amount Due:</span>
                                <span className="text-blue-900">
                                    {money(payTarget.type === 'course' ? payTarget.course.balanceAmount : (payTarget.installment?.balanceAmount || 0))}
                                </span>
                            </div>
                        </div>

                        {/* Payment Amount Input */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Amount to Pay ({household.currency || 'INR'})
                            </label>
                            <input
                                type="number"
                                min="1"
                                step="any"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] font-semibold"
                                placeholder="Enter amount"
                            />
                            {/* Dynamic Excess Rollover Explanation */}
                            {payTarget.type === 'installment' && payTarget.installment && Number(payAmount) > payTarget.installment.balanceAmount && (
                                <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-start gap-1.5">
                                    <CheckCircle size={13} className="shrink-0 mt-0.5 text-emerald-600" />
                                    <span>
                                        <b>Advance Credit Rollover:</b> Excess amount of <b>{money(Number(payAmount) - payTarget.installment.balanceAmount)}</b> will automatically be credited to the next unpaid installment of this course.
                                    </span>
                                </div>
                            )}
                            {payTarget.type === 'installment' && payTarget.installment && Number(payAmount) < payTarget.installment.balanceAmount && Number(payAmount) > 0 && (
                                <div className="mt-1.5 text-[11px] text-blue-700">
                                    <b>Partial Payment:</b> {payTarget.course.installments.some(i => i.installmentNumber > payTarget.installment!.installmentNumber && i.balanceAmount > 0)
                                        ? <>The remaining <b>{money(payTarget.installment.balanceAmount - Number(payAmount))}</b> will be added equally to your remaining installments.</>
                                        : <>The remaining <b>{money(payTarget.installment.balanceAmount - Number(payAmount))}</b> will stay due on this installment.</>}
                                </div>
                            )}
                        </div>

                        {/* Payment Method Selector */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Select Payment Method
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setPayMethod('AutoPay')}
                                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition relative ${payMethod === 'AutoPay'
                                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-semibold ring-1 ring-emerald-600 shadow-xs'
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                                            <Zap size={14} className="fill-emerald-600 text-emerald-600" /> AutoPay
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded">
                                            Instant
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1">UPI & Instant Settlement</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPayMethod('Razorpay')}
                                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${payMethod === 'Razorpay' || payMethod === 'Card' || payMethod === 'UPI'
                                        ? 'border-[#1e3a8a] bg-blue-50/50 text-[#1e3a8a] font-semibold ring-1 ring-[#1e3a8a]'
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                >
                                    <div className="font-bold flex items-center gap-1.5">
                                        <CreditCard size={14} /> Razorpay
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1">Gateway Popup Window</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPayMethod('BankWire')}
                                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${payMethod === 'BankWire'
                                        ? 'border-[#1e3a8a] bg-blue-50/50 text-[#1e3a8a] font-semibold ring-1 ring-[#1e3a8a]'
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                >
                                    <div className="font-bold flex items-center gap-1.5">
                                        <Building size={14} /> Bank / Counter
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1">Offline Manual Verification</div>
                                </button>
                            </div>
                        </div>

                        {payMethod === 'AutoPay' && (
                            <div className="p-3 rounded-lg bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                                <Zap size={16} className="text-emerald-600 shrink-0 mt-0.5 fill-emerald-500" />
                                <div className="leading-relaxed">
                                    <span className="font-semibold text-emerald-950">⚡ Instant AutoPay:</span> Clicking <b>AutoPay</b> will immediately record and verify this installment payment of <b>{money(Number(payAmount) || 0)}</b>, update the installment status to <b>Paid</b>, and generate your official tax invoice receipt instantly without external gateway interruptions.
                                </div>
                            </div>
                        )}

                        {payMethod === 'BankWire' && (
                            <div>
                                <label htmlFor="pay-reference" className="block text-xs font-bold text-slate-700 mb-1">Transaction reference / receipt no.</label>
                                <input id="pay-reference" value={payReference} onChange={(e) => setPayReference(e.target.value)} maxLength={100}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]" />
                                <p className="mt-1 text-[11px] text-slate-500">The amount is applied after the academy confirms it was received.</p>
                            </div>
                        )}

                        {payError && (
                            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                                {payError}
                            </div>
                        )}

                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setModal(null)}
                                disabled={isProcessingPay}
                                className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleExecutePayment}
                                disabled={isProcessingPay || Number(payAmount) <= 0}
                                className={`px-4 py-2 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition disabled:opacity-50 ${payMethod === 'AutoPay'
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-[#1e3a8a] hover:bg-[#1e40af]'
                                    }`}
                            >
                                {isProcessingPay && <Loader2 size={13} className="animate-spin" />}
                                {payMethod === 'AutoPay' ? (
                                    <>
                                        <Zap size={13} className="fill-white" /> AutoPay {money(Number(payAmount) || 0)}
                                    </>
                                ) : payMethod === 'BankWire' ? (
                                    <>Submit {money(Number(payAmount) || 0)}</>
                                ) : (
                                    <>Pay {money(Number(payAmount) || 0)}</>
                                )}
                            </button>
                        </div>
                    </div>
                </PortalModal>
            )}

            {/* Final Course Invoice Modal (Consolidated All Installments) */}
            {viewingFinalInvoiceCourse && (
                <PortalModal title="Consolidated Final Course Tax Invoice" onClose={() => setViewingFinalInvoiceCourse(null)} width="max-w-2xl">
                    <div className="space-y-4 text-xs">
                        {/* Header info */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <div className="font-bold text-sm text-slate-900">{viewingFinalInvoiceCourse.courseTitle}</div>
                                <div className="text-slate-500 text-[11px] font-mono mt-0.5">
                                    {viewingFinalInvoiceCourse.finalInvoiceNumber || `FINAL-INV-${viewingFinalInvoiceCourse.courseCode}-${ward.enrollmentNumber || 'ENR'}`}
                                </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <CheckCircle size={13} /> 100% PAID IN FULL
                            </span>
                        </div>

                        {/* Student & Course Details */}
                        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-lg text-slate-600">
                            <div>
                                <div>Student: <b className="text-slate-800">{ward.name}</b></div>
                                <div>Enrollment ID: <b className="font-mono text-slate-800">{ward.enrollmentNumber || '—'}</b></div>
                                <div>Parent / Guardian: <b className="text-slate-800">{household.guardianName}</b></div>
                            </div>
                            <div>
                                <div>Campus Branch: <b className="text-slate-800">{ward.branchName || 'Main Branch'}</b></div>
                                <div>Batch: <b className="text-slate-800">{viewingFinalInvoiceCourse.batchName || 'General Stream'}</b></div>
                                <div>Completion Date: <b className="text-slate-800">{formatDate(viewingFinalInvoiceCourse.finalInvoiceDate || new Date().toISOString())}</b></div>
                            </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                                <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Course Fee</div>
                                <div className="font-bold text-sm text-slate-900 mt-0.5">{money(viewingFinalInvoiceCourse.totalFee)}</div>
                            </div>
                            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                                <div className="text-[10px] text-emerald-700 uppercase font-semibold">Total Paid (100%)</div>
                                <div className="font-bold text-sm text-emerald-700 mt-0.5">{money(viewingFinalInvoiceCourse.paidAmount)}</div>
                            </div>
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                                <div className="text-[10px] text-slate-500 uppercase font-semibold">Outstanding Balance</div>
                                <div className="font-bold text-sm text-slate-700 mt-0.5">{money(viewingFinalInvoiceCourse.balanceAmount)}</div>
                            </div>
                        </div>

                        {/* Installments Table */}
                        <div>
                            <div className="font-bold text-slate-800 mb-2">Itemized Schedule of All Installments</div>
                            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                <table className="w-full text-left text-[12px]">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase">
                                        <tr>
                                            <th className="p-2">#</th>
                                            <th className="p-2">Installment / Invoice</th>
                                            <th className="p-2">Due Date</th>
                                            <th className="p-2 text-right">Scheduled</th>
                                            <th className="p-2 text-right">Paid</th>
                                            <th className="p-2">Receipt</th>
                                            <th className="p-2 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {viewingFinalInvoiceCourse.installments.map((inst, idx) => (
                                            <tr key={inst.invoiceId || idx} className="hover:bg-slate-50/50">
                                                <td className="p-2 text-slate-400 font-mono text-[11px]">{inst.installmentNumber || idx + 1}</td>
                                                <td className="p-2">
                                                    <div className="font-semibold text-slate-800">{inst.designation}</div>
                                                    <div className="text-[10px] text-slate-500 font-mono">{inst.invoiceNumber}</div>
                                                </td>
                                                <td className="p-2 whitespace-nowrap text-slate-600">{formatDate(inst.dueDate)}</td>
                                                <td className="p-2 text-right font-medium">{money(inst.amount)}</td>
                                                <td className="p-2 text-right font-semibold text-emerald-700">{money(inst.paidAmount)}</td>
                                                <td className="p-2 text-slate-600 font-mono text-[11px]">{inst.receiptNumber || '—'}</td>
                                                <td className="p-2 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        PAID
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Official Certification Stamp */}
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-center text-emerald-900">
                            <div className="font-bold text-xs uppercase tracking-wide">Course Fee Reconciled & Paid in Full</div>
                            <div className="text-[11px] text-emerald-700 mt-0.5">All {viewingFinalInvoiceCourse.installments.length} installments settled. This document serves as official course fee clearance.</div>
                        </div>

                        {/* Footer buttons */}
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setViewingFinalInvoiceCourse(null)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => printFinalCourseInvoice(viewingFinalInvoiceCourse)}
                                className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                            >
                                <Printer size={13} /> Print / Save as PDF
                            </button>
                        </div>
                    </div>
                </PortalModal>
            )}

            {/* Installment Tax Invoice Preview Modal */}
            {viewingInstallmentInvoice && (
                <PortalModal title="Installment Tax Invoice" onClose={() => setViewingInstallmentInvoice(null)} width="max-w-lg">
                    <div className="space-y-3.5 text-xs">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                            <div>
                                <div className="font-bold text-sm text-slate-900">{viewingInstallmentInvoice.course.courseTitle}</div>
                                <div className="text-slate-500 text-[11px] font-mono mt-0.5">{viewingInstallmentInvoice.inst.invoiceNumber}</div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${viewingInstallmentInvoice.inst.balanceAmount <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {viewingInstallmentInvoice.inst.balanceAmount <= 0 ? 'PAID' : 'PENDING'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50/50 border border-slate-100 rounded-lg text-slate-600">
                            <div>Student: <b className="text-slate-800">{ward.name}</b></div>
                            <div>Due Date: <b className="text-slate-800">{formatDate(viewingInstallmentInvoice.inst.dueDate)}</b></div>
                            <div>Installment: <b className="text-slate-800">Part {viewingInstallmentInvoice.inst.installmentNumber || 1}</b></div>
                            <div>Course: <b className="text-slate-800">{viewingInstallmentInvoice.course.courseCode}</b></div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                                <div className="text-[10px] text-slate-500 uppercase">Scheduled</div>
                                <div className="font-bold text-sm text-slate-900">{money(viewingInstallmentInvoice.inst.amount)}</div>
                            </div>
                            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                                <div className="text-[10px] text-emerald-700 uppercase">Paid</div>
                                <div className="font-bold text-sm text-emerald-700">{money(viewingInstallmentInvoice.inst.paidAmount)}</div>
                            </div>
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                                <div className="text-[10px] text-slate-500 uppercase">Balance</div>
                                <div className="font-bold text-sm text-slate-900">{money(viewingInstallmentInvoice.inst.balanceAmount)}</div>
                            </div>
                        </div>

                        {viewingInstallmentInvoice.inst.payments && viewingInstallmentInvoice.inst.payments.length > 0 && (
                            <div>
                                <div className="font-bold text-slate-800 mb-1.5">Payment Transactions</div>
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-left text-[11.5px]">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                            <tr>
                                                <th className="p-2">Receipt</th>
                                                <th className="p-2">Date</th>
                                                <th className="p-2">Method</th>
                                                <th className="p-2 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {viewingInstallmentInvoice.inst.payments.map((p, idx) => (
                                                <tr key={p.paymentId || idx}>
                                                    <td className="p-2 font-mono font-medium">{p.receiptNumber}</td>
                                                    <td className="p-2">{formatDate(p.createdAt)}</td>
                                                    <td className="p-2">{p.paymentMethod}</td>
                                                    <td className="p-2 text-right font-bold text-emerald-700">{money(p.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setViewingInstallmentInvoice(null)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => printInstallmentInvoice(viewingInstallmentInvoice.inst, viewingInstallmentInvoice.course)}
                                className="px-4 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                            >
                                <Printer size={13} /> Print / Save PDF
                            </button>
                        </div>
                    </div>
                </PortalModal>
            )}
        </div>
    );
}

function Stat({ label, value, sub, tone = 'text-slate-900', onClick }: { label: string; value: string; sub?: string; tone?: string; onClick?: () => void }) {
    return (
        <button onClick={onClick} disabled={!onClick} className={`${card} text-left min-w-0 ${onClick ? 'hover:border-[#1e3a8a]/40 cursor-pointer' : 'cursor-default'}`}>
            <div className={eyebrow}>{label}</div>
            <div className={`text-xl font-semibold mt-1 truncate ${tone}`}>{value}</div>
            {sub && <div className="text-[11px] text-slate-500 mt-0.5 truncate">{sub}</div>}
        </button>
    );
}

function PortalModal({ title, onClose, children, width = 'max-w-md' }: { title: string; onClose: () => void; children: React.ReactNode; width?: string }) {
    return (
        <div className="scroll-lock fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className={`bg-white rounded-xl ${width} w-full p-5 shadow-xl max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                    <h3 className="font-semibold text-slate-900">{title}</h3>
                    <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={16} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

interface Field { name: string; label: string; type?: string; defaultValue?: string; options?: string[] }

function SimpleForm({ fields, submitLabel, onSubmit }: { fields: Field[]; submitLabel: string; onSubmit: (values: Record<string, unknown>) => void }) {
    const [values, setValues] = useState<Record<string, unknown>>(() => {
        const init: Record<string, unknown> = {};
        for (const f of fields) {
            init[f.name] = f.defaultValue ?? (f.type === 'checkbox' ? false : f.options ? f.options[0] : '');
        }
        return init;
    });

    return (
        <form onSubmit={e => { e.preventDefault(); onSubmit(values); }} className="space-y-3">
            {fields.map(f => (
                <div key={f.name}>
                    {f.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                            <input type="checkbox" checked={Boolean(values[f.name])} onChange={e => setValues({ ...values, [f.name]: e.target.checked })} className="rounded" />
                            {f.label}
                        </label>
                    ) : (
                        <>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
                            {f.options ? (
                                <select value={String(values[f.name] ?? '')} onChange={e => setValues({ ...values, [f.name]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs">
                                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            ) : (
                                <input type={f.type ?? 'text'} value={String(values[f.name] ?? '')} onChange={e => setValues({ ...values, [f.name]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
                            )}
                        </>
                    )}
                </div>
            ))}
            <div className="pt-2 flex justify-end gap-2">
                <button type="submit" className="px-4 py-2 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-[#1e40af] cursor-pointer">
                    {submitLabel}
                </button>
            </div>
        </form>
    );
}
