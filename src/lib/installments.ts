/** Course period and installment dates, the same rules as the API (which validates everything again). */
export type Frequency = 'monthly' | 'every_2_months' | 'quarterly' | 'half_yearly' | 'custom';

export const FREQUENCIES: Array<{ value: Frequency; label: string; months: number }> = [
    { value: 'monthly', label: 'Monthly', months: 1 },
    { value: 'every_2_months', label: 'Every 2 Months', months: 2 },
    { value: 'quarterly', label: 'Quarterly', months: 3 },
    { value: 'half_yearly', label: 'Half-Yearly', months: 6 },
    { value: 'custom', label: 'Custom dates', months: 0 },
];
export const MAX_INSTALLMENTS = 36;
export const stepMonths = (frequency: Frequency) => FREQUENCIES.find(f => f.value === frequency)?.months ?? 0;

export interface CoursePeriod { startDate: string | null; endDate: string | null; durationMonths: number | null; firstDueDate: string;
    /** Last day an installment may fall due on: within the course duration and not after the batch ends */
    lastDueDate: string | null }

const pad = (n: number) => String(n).padStart(2, '0');

/** Calendar date on the viewer's clock (never shifted to the day before by time zone). */
export function dateInDays(days = 0) {
    const d = new Date(Date.now() + days * 86400000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Same day of a later month; the last day when that month is shorter. */
export function addMonths(date: string, months: number) {
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) return '';
    const last = new Date(Date.UTC(y, m + months, 0)).getUTCDate();
    return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10);
}

export const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

/** How many installments fit between the first due date and the last day of the course; null when the end is unknown. */
export function fittingInstallments(period: Pick<CoursePeriod, 'lastDueDate'> | null | undefined, firstDueDate: string, frequency: Frequency): number | null {
    const step = stepMonths(frequency);
    if (!period?.lastDueDate || !firstDueDate || step === 0) return null;
    if (firstDueDate > period.lastDueDate) return 0;
    let count = 1;
    while (count < MAX_INSTALLMENTS && addMonths(firstDueDate, count * step) <= period.lastDueDate) count++;
    return count;
}

/** Frequencies with whether at least two installments fit in the course with them. */
export function frequencyChoices(period: CoursePeriod | null | undefined, firstDueDate: string) {
    return FREQUENCIES.map(f => {
        const fits = fittingInstallments(period, firstDueDate, f.value);
        const disabled = fits !== null && fits < 2;
        return { ...f, disabled, label: disabled ? `${f.label} (longer than the course)` : f.label };
    });
}

/** Due dates of a new schedule. Custom dates that would run past the course are spread evenly over what is left of it. */
export function installmentDates(period: CoursePeriod | null | undefined, firstDueDate: string, count: number, frequency: Frequency): string[] {
    const step = stepMonths(frequency) || 1;
    const dates = Array.from({ length: count }, (_, i) => addMonths(firstDueDate, i * step));
    const last = period?.lastDueDate;
    if (frequency !== 'custom' || !last || firstDueDate >= last || dates[count - 1] <= last) return dates;
    const days = Math.round((Date.parse(last) - Date.parse(firstDueDate)) / 86400000);
    return dates.map((_, i) => addDays(firstDueDate, Math.floor((days * i) / Math.max(1, count - 1))));
}

/** Why these due dates cannot be used, or null. Installments are paid within the course; the API checks the same. */
export function scheduleProblem(period: CoursePeriod | null | undefined, dueDates: string[]): string | null {
    const day = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    const missing = dueDates.findIndex(d => !d);
    if (missing >= 0) return `Choose a due date for installment ${missing + 1}.`;
    const unordered = dueDates.findIndex((d, i) => i > 0 && d <= dueDates[i - 1]);
    if (unordered >= 0) return `Installment ${unordered + 1} must be due later than installment ${unordered}.`;
    if (!period) return null;
    if (!period.lastDueDate) return 'Set the course duration before using installments: every installment must be paid within the course.';
    const start = period.startDate ?? period.firstDueDate;
    const range = `Installments must be paid within the course, from ${day(start)} to ${day(period.lastDueDate)}.`;
    const early = dueDates.findIndex(d => d < start);
    if (early >= 0) return `Installment ${early + 1} is due on ${day(dueDates[early])}, before the course starts. ${range}`;
    const late = dueDates.findIndex(d => d > period.lastDueDate!);
    return late >= 0 ? `Installment ${late + 1} is due on ${day(dueDates[late])}, after the course ends. ${range}` : null;
}

/** Period of a course in a batch, for forms opened before an enrollment exists. */
export function periodOf(course?: { durationMonths?: number | null; startDate?: string | null } | null, batch?: { startDate?: string | null; endDate?: string | null } | null): CoursePeriod | null {
    if (!course && !batch) return null;
    const starts = [course?.startDate, batch?.startDate].filter((d): d is string => Boolean(d)).map(d => d.slice(0, 10)).sort();
    const startDate = starts.at(-1) ?? null;
    const batchEnd = batch?.endDate?.slice(0, 10) ?? null;
    const duration = course?.durationMonths ?? null;
    const endDate = startDate && batchEnd && batchEnd > startDate ? batchEnd : startDate && duration ? addMonths(startDate, duration) : null;
    const today = dateInDays();
    // Before a batch is chosen the duration counts from the course start, or today
    const byDuration = duration && duration > 0 ? addDays(addMonths(startDate ?? today, duration), -1) : null;
    const byBatch = startDate && batchEnd && batchEnd > startDate ? batchEnd : null;
    const lastDueDate = [byDuration, byBatch].filter((d): d is string => Boolean(d)).sort()[0] ?? null;
    return { startDate, endDate, durationMonths: duration, lastDueDate, firstDueDate: startDate && startDate > today ? startDate : today };
}

/**
 * Amounts after one installment is edited: what remains of the total is divided equally over the installments after it.
 * Earlier installments stay as they are. Whole rupees when possible; the last installment takes the rounding.
 */
export function splitRemaining(amounts: number[], index: number, value: number, total: number): number[] {
    const paise = amounts.map(a => Math.round((Number(a) || 0) * 100));
    paise[index] = Math.round((Number(value) || 0) * 100);
    const after = paise.length - 1 - index;
    if (after > 0) {
        const rest = Math.max(0, Math.round(total * 100) - paise.slice(0, index + 1).reduce((sum, a) => sum + a, 0));
        const unit = rest % 100 === 0 ? 100 : 1;
        const share = Math.floor(rest / after / unit) * unit;
        for (let i = index + 1; i < paise.length; i++) paise[i] = i === paise.length - 1 ? rest - share * (after - 1) : share;
    }
    return paise.map(a => a / 100);
}
