'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard, CalendarCheck, Wallet, GraduationCap, CalendarDays, Music, Bell, Award,
    Download, Printer, CreditCard, ArrowLeft, Flame, Send, Calendar, CheckCircle, User, X, Building, Clock,
} from 'lucide-react';
import { api, formatDate, formatMoney } from '@/lib/api';
import SignOutButton from '@/components/SignOutButton';
import { useSession } from '@/lib/session';
import { gradeClass } from '@/lib/academy';

interface Invoice {
    id: string; invoiceNumber: string; billingPeriod: string; designation: string; subtitle: string;
    amount: number; balance: number; paymentMethod: string; status: 'settled' | 'pending' | 'overdue'; receiptNumber: string;
}
interface Payment {
    paymentId: string; receiptNumber: string; paidAt: string; amount: number; paymentMethod: string;
    reference: string; status: string; invoiceNumber: string; designation: string; billingPeriod: string;
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
    id: string; name: string; preferredName: string; division: string; track: string; matriculationYear: string;
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

function openPrintWindow(title: string, household: Household, body: string) {
    const w = window.open('', '_blank', 'width=760,height=900');
    if (!w) return false;
    const logo = household.logoUrl ? `<img src="${escapeHtml(household.logoUrl)}" alt="">` : '';
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;color:#0f172a;margin:36px}header{display:flex;gap:14px;align-items:center;border-bottom:2px solid #1e3a8a;padding-bottom:12px}
header img{height:52px;max-width:130px;object-fit:contain}h1{font-size:19px;margin:0}h2{font-size:13px;color:#475569;font-weight:500;margin:4px 0 0}
table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#f1f5f9}
.big{font-size:26px;font-weight:700;color:#065f46;margin-top:18px}footer{margin-top:32px;font-size:11px;color:#64748b}</style></head><body>
<header>${logo}<div><h1>${escapeHtml(household.organizationName)}</h1><h2>${escapeHtml(title)}</h2></div></header>${body}
<footer>System-generated document issued by ${escapeHtml(household.organizationName)}.</footer>
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
    const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 5000);
    }, []);

    useEffect(() => {
        let active = true;
        fetchHousehold()
            .then(data => { if (active) setHousehold(data); })
            .catch((err: Error) => { if (active) setLoadError(err.message); });
        return () => { active = false; };
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

    if (!household) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-sm text-slate-500">
                {loadError ? `Unable to load the parent portal: ${loadError}` : 'Loading your family portal…'}
            </div>
        );
    }

    const ward = household.wards.find(w => w.id === wardId) ?? household.wards[0];
    const money = (value: number) => formatMoney(value, household.currency, 2);

    if (!ward) {
        return <div className="min-h-screen flex items-center justify-center p-6 text-sm text-slate-600">No children are linked to this parent account yet.</div>;
    }

    const totalPaid = ward.payments.reduce((s, p) => s + p.amount, 0);

    const downloadSlip = (p: Payment) => {
        const rows = [
            ['Receipt Number', p.receiptNumber], ['Payment Date', formatDate(p.paidAt)], ['Student', ward.name],
            ['Parent / Guardian', household.guardianName], ['Invoice', `${p.invoiceNumber} — ${p.designation}`],
            ['Billing Period', p.billingPeriod], ['Payment Method', p.paymentMethod], ['Reference', p.reference],
        ].map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('');
        if (!openPrintWindow(`Payment Slip ${p.receiptNumber}`, household, `<div class="big">${escapeHtml(money(p.amount))}</div><table>${rows}</table>`)) {
            showToast('Allow pop-ups for this site to download payment slips.');
        }
    };

    const printFeeStatement = () => {
        const rows = ward.invoices.map(i => `<tr><td>${escapeHtml(i.invoiceNumber)}</td><td>${escapeHtml(i.designation)}</td><td>${escapeHtml(i.billingPeriod)}</td><td>${escapeHtml(money(i.amount))}</td><td>${escapeHtml(i.status)}</td></tr>`).join('');
        if (!openPrintWindow(`Fee Statement — ${ward.name}`, household,
            `<table><tr><th>Invoice</th><th>Description</th><th>Period</th><th>Amount</th><th>Status</th></tr>${rows}</table>
<p><b>Total paid:</b> ${escapeHtml(money(totalPaid))} &nbsp; <b>Outstanding:</b> ${escapeHtml(money(ward.balance))}</p>`)) {
            showToast('Allow pop-ups for this site to print the fee statement.');
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
    const isStaffPreview = session?.session.role !== 'Guardian';

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
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left cursor-pointer ${w.id === ward.id ? 'bg-blue-50 text-[#1e3a8a] font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}>
                                <span className="h-6 w-6 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-[11px] font-bold flex items-center justify-center shrink-0">{w.preferredName.charAt(0)}</span>
                                <span className="truncate text-[13px]">{w.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
                    {PAGES.map(p => (
                        <button key={p.id} onClick={() => setPage(p.id)}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] cursor-pointer ${page === p.id ? 'bg-[#1e3a8a] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
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

                <div className="p-5 max-w-6xl flex flex-col gap-4">
                    {page === 'overview' && (
                        <>
                            <section className={`${card} flex flex-wrap items-center justify-between gap-3`}>
                                <div>
                                    {ward.division !== '—' && <div className={eyebrow}>{ward.division}</div>}
                                    <h2 className="text-lg font-semibold">{ward.name}</h2>
                                    <p className="text-xs text-slate-500">{[ward.track, `Since ${ward.matriculationYear}`, ward.standing].filter(v => v && v !== '—').join(' • ')}</p>
                                </div>
                                <div className="text-xs text-slate-600 flex items-center gap-1.5"><Clock size={13} /> Next class: <b>{ward.nextClassTime}</b></div>
                            </section>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Stat label="Attendance" value={ward.sessionsTotal ? `${ward.attendanceRate}%` : '—'} sub={`${ward.sessionsCompleted} of ${ward.sessionsTotal} sessions`} onClick={() => setPage('attendance')} />
                                <Stat label="Fees due" value={money(ward.balance)} sub={ward.balance > 0 ? `Next due ${ward.nextDraftDate}` : 'All settled'} tone={ward.balance > 0 ? 'text-red-600' : 'text-emerald-700'} onClick={() => setPage('fees')} />
                                <Stat label="Latest result" value={latestResult?.result?.grade ?? '—'} sub={latestResult ? `${latestResult.test.title} • ${latestResult.result?.percentage}%` : 'No results yet'} onClick={() => setPage('results')} />
                                <Stat label="Practice" value={`${ward.practiceHours} h`} sub={`${ward.practiceStreakDays}-day streak`} onClick={() => setPage('practice')} />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {ward.primaryMentor && (
                                    <section className={card}>
                                        <div className={eyebrow}>Mentor</div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="h-10 w-10 rounded-full bg-blue-50 text-[#1e3a8a] flex items-center justify-center shrink-0"><User size={18} /></div>
                                            <div className="min-w-0">
                                                <div className="font-semibold">{ward.primaryMentor.name}</div>
                                                <div className="text-xs text-slate-500 truncate">{ward.primaryMentor.title} • {ward.primaryMentor.office}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            {ward.primaryMentor.email && (
                                                <a href={`mailto:${ward.primaryMentor.email}?subject=${encodeURIComponent(`Regarding ${ward.name}`)}`}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold"><Send size={12} /> Message</a>
                                            )}
                                            <button onClick={() => setModal('advisory')} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold cursor-pointer"><Calendar size={12} /> Book advisory</button>
                                        </div>
                                    </section>
                                )}
                                {ward.featuredEvent && (
                                    <section className="rounded-xl bg-[#0f172a] text-white p-4">
                                        <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">Upcoming event • {ward.featuredEvent.date}</div>
                                        <h3 className="font-semibold mt-1">{ward.featuredEvent.title}</h3>
                                        <p className="text-xs text-slate-300 mt-1 line-clamp-2">{ward.featuredEvent.description}</p>
                                        <div className="text-[11px] text-slate-400 mt-1">{ward.featuredEvent.venue} • {ward.featuredEvent.box}</div>
                                        <button disabled={ward.featuredEvent.seatsClaimed}
                                            onClick={() => action({ action: 'claim_seats', wardId: ward.id, eventId: ward.featuredEvent?.eventId })}
                                            className={`mt-3 w-full py-1.5 rounded-lg text-xs font-semibold ${ward.featuredEvent.seatsClaimed ? 'bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer'}`}>
                                            {ward.featuredEvent.seatsClaimed ? 'Seats confirmed' : `Claim ${ward.featuredEvent.guaranteedSeats} reserved seats`}
                                        </button>
                                    </section>
                                )}
                            </div>

                            {household.notices.length > 0 && (
                                <section className={card}>
                                    <div className="flex items-center justify-between">
                                        <div className={eyebrow}>Latest notices</div>
                                        <button className="text-xs text-[#1e3a8a] font-semibold cursor-pointer" onClick={() => setPage('notices')}>View all</button>
                                    </div>
                                    <div className="mt-2 divide-y divide-slate-100">
                                        {household.notices.slice(0, 3).map(n => (
                                            <div key={n.noticeId} className="py-2">
                                                <div className="font-medium text-[13px]">{n.title}</div>
                                                <div className="text-[11px] text-slate-500">{formatDate(n.publishedAt)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}

                    {page === 'attendance' && (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Stat label="Attendance rate" value={`${ward.attendanceRate}%`} />
                                <Stat label="Sessions attended" value={`${ward.sessionsCompleted}/${ward.sessionsTotal}`} />
                                <Stat label="Excused absences" value={String(ward.excusedAbsences)} sub={ward.absenceNote} />
                                <div className={`${card} flex items-center justify-center`}>
                                    <button onClick={() => setModal('absence')} className="px-3 py-2 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold cursor-pointer">Request absence</button>
                                </div>
                            </div>
                            <section className={card}>
                                <div className={eyebrow}>Attendance history</div>
                                <table className="w-full mt-2 text-[13px]">
                                    <thead><tr className={th}><th className="py-1.5">Date</th><th>Batch</th><th>Status</th><th>Remarks</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {ward.attendanceHistory.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-slate-500 text-xs">No sessions recorded yet.</td></tr>}
                                        {ward.attendanceHistory.map(a => (
                                            <tr key={`${a.date}-${a.batch}`}>
                                                <td className="py-1.5 whitespace-nowrap">{formatDate(a.date)}</td>
                                                <td>{a.batch}</td>
                                                <td><span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold capitalize ${ATTENDANCE_STYLE[a.status] ?? ''}`}>{a.status}</span></td>
                                                <td className="text-slate-500 text-xs">{a.remarks ?? ''}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        </>
                    )}

                    {page === 'fees' && (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Stat label="Outstanding dues" value={money(ward.balance)} tone={ward.balance > 0 ? 'text-red-600' : 'text-emerald-700'} />
                                <Stat label="Next due" value={ward.balance > 0 ? money(ward.nextDraftAmount) : '—'} sub={ward.balance > 0 ? ward.nextDraftDate : 'Nothing due'} />
                                <Stat label="Paid so far" value={money(totalPaid)} sub={`${ward.payments.length} payments`} />
                                <div className={`${card} flex items-center justify-center`}>
                                    <button onClick={printFeeStatement} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"><Printer size={13} /> Fee statement</button>
                                </div>
                            </div>
                            <section className={card}>
                                <div className={eyebrow}>Invoices</div>
                                <table className="w-full mt-2 text-[13px]">
                                    <thead><tr className={th}><th className="py-1.5">Invoice</th><th>Description</th><th>Amount</th><th>Status</th><th></th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {ward.invoices.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-slate-500 text-xs">No invoices yet.</td></tr>}
                                        {ward.invoices.map(inv => (
                                            <tr key={inv.id}>
                                                <td className="py-2 font-mono text-xs whitespace-nowrap">{inv.invoiceNumber}</td>
                                                <td>{inv.designation}<div className="text-[11px] text-slate-500">{inv.billingPeriod} • {inv.subtitle}</div></td>
                                                <td className="whitespace-nowrap font-semibold">{money(inv.amount)}</td>
                                                <td><span className={`text-[11px] font-semibold capitalize ${inv.status === 'settled' ? 'text-emerald-700' : inv.status === 'overdue' ? 'text-red-600' : 'text-amber-600'}`}>{inv.status}</span></td>
                                                <td className="text-right">
                                                    {inv.status !== 'settled' && (
                                                        <button onClick={() => { setPayInvoice(inv); setModal('pay'); }} className="px-2.5 py-1 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold whitespace-nowrap cursor-pointer">Pay {money(inv.balance)}</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                            <section className={card}>
                                <div className={eyebrow}>Payments & slips</div>
                                <table className="w-full mt-2 text-[13px]">
                                    <thead><tr className={th}><th className="py-1.5">Date</th><th>For</th><th>Method</th><th>Amount</th><th></th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {ward.payments.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-slate-500 text-xs">No payments recorded yet.</td></tr>}
                                        {ward.payments.map(p => (
                                            <tr key={p.paymentId}>
                                                <td className="py-2 whitespace-nowrap">{formatDate(p.paidAt)}</td>
                                                <td>{p.designation}<div className="text-[11px] text-slate-500 font-mono">{p.receiptNumber}</div></td>
                                                <td>{p.paymentMethod}</td>
                                                <td className="whitespace-nowrap font-semibold">{money(p.amount)}</td>
                                                <td className="text-right">
                                                    <button onClick={() => downloadSlip(p)} className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#1e3a8a] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"><Download size={12} /> Slip</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                                        <thead><tr className={th}><th className="py-1.5">Subject</th><th>Marks</th><th>Grade</th><th>Teacher remarks</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {r.subjects.map(s => {
                                                const m = r.result?.marks[s.subjectId];
                                                return (
                                                    <tr key={s.subjectId}>
                                                        <td className="py-1.5">{s.name}</td>
                                                        <td className="whitespace-nowrap">{m?.absent ? 'Absent' : `${m?.marks ?? '—'} / ${s.maxMarks}`}</td>
                                                        <td>{m?.grade ? <span className={`badge ${gradeClass(m.grade)}`}>{m.grade}</span> : '—'}</td>
                                                        <td className="text-xs text-slate-500">{m?.remarks ?? ''}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    <div className="mt-2 text-[11px] text-slate-500">Class average {r.summary.averagePercentage ?? '—'}% • Highest {r.summary.highestPercentage ?? '—'}%</div>
                                </section>
                            ))}
                        </>
                    )}

                    {page === 'timetable' && (
                        <>
                            <section className={card}>
                                <div className={eyebrow}>This week</div>
                                <div className="mt-2 divide-y divide-slate-100">
                                    {ward.timetable.length === 0 && <p className="py-4 text-center text-slate-500 text-xs">No scheduled sessions.</p>}
                                    {ward.timetable.map(t => (
                                        <div key={t.id} className="py-2.5 flex items-center gap-3">
                                            <div className="w-11 text-center shrink-0 rounded-lg bg-blue-50 text-[#1e3a8a] py-1">
                                                <div className="text-[10px] font-semibold uppercase">{t.day}</div>
                                                <div className="font-bold leading-none">{t.dateNum}</div>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium">{t.subject} <span className="text-[11px] text-slate-500 font-normal">• {t.type}</span></div>
                                                <div className="text-xs text-slate-500 truncate">{t.time} • {t.studio} • {t.faculty}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                            {ward.practiceSuite.room !== '—' && (
                                <section className={`${card} text-xs`}><b>Practice room:</b> {ward.practiceSuite.room} • {ward.practiceSuite.schedule}</section>
                            )}
                        </>
                    )}

                    {page === 'practice' && (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Stat label="Total practice" value={`${ward.practiceHours} h`} sub={ward.practiceCohortDiff} />
                                <Stat label="Streak" value={`${ward.practiceStreakDays} days`} />
                                <Stat label="This week" value={`${ward.weeklyPractice.reduce((s, d) => s + d.hours, 0)} h`} />
                                <div className={`${card} flex items-center justify-center`}>
                                    <button onClick={() => setModal('practice')} className="px-3 py-2 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold cursor-pointer">Log practice</button>
                                </div>
                            </div>
                            <section className={card}>
                                <div className={`${eyebrow} flex items-center gap-1`}><Flame size={12} className="text-amber-500" /> Daily practice this week</div>
                                <div className="flex items-end gap-3 h-36 mt-3">
                                    {ward.weeklyPractice.map(d => {
                                        const max = Math.max(...ward.weeklyPractice.map(x => x.hours), 1);
                                        return (
                                            <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${d.day}: ${d.hours} h`}>
                                                <span className="text-[10px] text-slate-500">{d.hours}h</span>
                                                <div className="w-full rounded-t bg-[#1e3a8a]" style={{ height: `${(d.hours / max) * 100}%`, minHeight: d.hours ? 4 : 0 }} />
                                                <span className="text-[11px] text-slate-600">{d.shortDay}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </>
                    )}

                    {page === 'notices' && (
                        <section className={card}>
                            {household.notices.length === 0 && <p className="py-4 text-center text-slate-500 text-xs">No current notices.</p>}
                            <div className="divide-y divide-slate-100">
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
            {modal === 'pay' && payInvoice && (
                <PortalModal title={`Pay ${payInvoice.invoiceNumber}`} onClose={() => setModal(null)}>
                    <p className="text-xs text-slate-600 mb-3">{payInvoice.designation} • Amount due <b>{money(payInvoice.balance)}</b></p>
                    <SimpleForm fields={[{ name: 'paymentMethod', label: 'Payment method', options: PAYMENT_METHODS }]} submitLabel={`Pay ${money(payInvoice.balance)}`}
                        onSubmit={v => action({ action: 'pay_invoice', wardId: ward.id, invoiceId: payInvoice.id, ...v })} />
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

function PortalModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{title}</h3>
                    <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={16} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

interface Field { name: string; label: string; type?: string; defaultValue?: string; options?: string[] }

function SimpleForm({ fields, submitLabel, onSubmit }: { fields: Field[]; submitLabel: string; onSubmit: (values: Record<string, string | boolean>) => void }) {
    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        onSubmit(Object.fromEntries(fields.map(f => [f.name, f.type === 'checkbox' ? data.get(f.name) === 'on' : String(data.get(f.name) ?? '')])));
    };
    const input = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#1e3a8a]';
    return (
        <form onSubmit={submit} className="flex flex-col gap-3 text-xs">
            {fields.map(f => f.type === 'checkbox' ? (
                <label key={f.name} className="flex items-center gap-2"><input type="checkbox" name={f.name} /> {f.label}</label>
            ) : (
                <label key={f.name} className="flex flex-col gap-1 font-medium text-slate-700">
                    {f.label}
                    {f.options
                        ? <select name={f.name} className={input}>{f.options.map(o => <option key={o}>{o}</option>)}</select>
                        : <input name={f.name} type={f.type ?? 'text'} required defaultValue={f.defaultValue} step={f.type === 'number' ? '0.5' : undefined} className={input} />}
                </label>
            ))}
            <button type="submit" className="self-end px-4 py-2 rounded-lg bg-[#1e3a8a] text-white font-semibold flex items-center gap-1.5 cursor-pointer"><CreditCard size={13} /> {submitLabel}</button>
        </form>
    );
}
