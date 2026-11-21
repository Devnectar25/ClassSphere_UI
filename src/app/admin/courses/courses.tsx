'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Sparkles, Eye, EyeOff, Star, BookOpen } from 'lucide-react';
import { api, formatMoney } from '@/lib/api';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';

interface CourseRecord {
    courseId: string;
    tenantId: string;
    academyName: string;
    title: string;
    code: string;
    description: string;
    category: string;
    level: string | null;
    tuitionAmount: number;
    billingPeriod: string;
    isActive: boolean;
    isHidden: boolean;
    isFeatured: boolean;
    createdAt: string;
    batchCount: number;
}

interface CoursesApiResponse {
    courses: CourseRecord[];
    total: number;
    limit: number;
    offset: number;
}

const PAGE_SIZE = 10;

export default function PlatformAdminCoursesPage() {
    const [courses, setCourses] = useState<CourseRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Selected course for inspection
    const [inspectCourse, setInspectCourse] = useState<CourseRecord | null>(null);

    // Moderation modal for hiding a course
    const [moderateCourse, setModerateCourse] = useState<CourseRecord | null>(null);
    const [moderateReason, setModerateReason] = useState('');
    const [moderateBusy, setModerateBusy] = useState(false);
    const [moderateError, setModerateError] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const fetchCourses = useCallback(async (page = 1, query = searchQuery, category = categoryFilter) => {
        try {
            setLoading(true);
            const offset = (page - 1) * PAGE_SIZE;
            const params = new URLSearchParams({
                limit: PAGE_SIZE.toString(),
                offset: offset.toString(),
            });
            if (query.trim()) params.set('q', query.trim());
            if (category) params.set('category', category);
            params.set('_t', Date.now().toString());

            const res = await api<CoursesApiResponse>(`/platform/courses?${params.toString()}`);
            setCourses(res.courses || []);
            setTotal(res.total || 0);
            setCurrentPage(page);
            if (page > 0 && total > 0) showToast('Courses catalog refreshed.');
        } catch {
            showToast('Unable to fetch platform courses catalogue.');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, categoryFilter]);

    useEffect(() => {
        fetchCourses(1);
    }, [fetchCourses]);

    const handleConfirmModerateHide = async () => {
        if (!moderateCourse) return;
        if (!moderateReason.trim() || moderateReason.trim().length < 10) {
            setModerateError('A detailed moderation reason (at least 10 characters) is required.');
            return;
        }

        try {
            setModerateBusy(true);
            setModerateError(null);
            await api('/platform/courses', {
                method: 'PATCH',
                body: JSON.stringify({
                    courseId: moderateCourse.courseId,
                    isHidden: true,
                    reason: moderateReason.trim(),
                }),
            });

            showToast(`Course "${moderateCourse.title}" hidden from marketplace. Audited.`);
            setModerateCourse(null);
            setModerateReason('');
            fetchCourses(currentPage, searchQuery, categoryFilter);
        } catch (err) {
            const msg = (err as Error).message || 'Failed to hide course.';
            setModerateError(msg);
            showToast(msg);
        } finally {
            setModerateBusy(false);
        }
    };

    const handleUnhide = async (course: CourseRecord) => {
        try {
            await api('/platform/courses', {
                method: 'PATCH',
                body: JSON.stringify({
                    courseId: course.courseId,
                    isHidden: false,
                    reason: 'Admin restored course to public marketplace',
                }),
            });
            showToast(`Course "${course.title}" is now public.`);
            fetchCourses(currentPage, searchQuery, categoryFilter);
        } catch (err) {
            showToast((err as Error).message || 'Failed to unhide course.');
        }
    };

    const handleToggleFeatured = async (course: CourseRecord) => {
        try {
            await api('/platform/courses', {
                method: 'PATCH',
                body: JSON.stringify({
                    courseId: course.courseId,
                    isFeatured: !course.isFeatured,
                }),
            });

            showToast(`Course "${course.title}" ${!course.isFeatured ? 'featured on home page' : 'unfeatured'}.`);
            fetchCourses(currentPage, searchQuery, categoryFilter);
        } catch (err) {
            showToast((err as Error).message || 'Failed to update featured status.');
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="space-y-6 animate-fade-in">
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[10000] bg-white border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold">
                    <Sparkles size={16} className="text-amber-500" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Courses Management</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Global academy course offerings, moderation controls, and marketplace featured placements.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchCourses(currentPage, searchQuery, categoryFilter)}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs hover:border-slate-300 cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <form onSubmit={(e) => { e.preventDefault(); fetchCourses(1, searchQuery, categoryFilter); }} className="relative flex-1 max-w-md flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search courses or academies..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs transition-all"
                        />
                    </div>
                    <button type="submit" className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs">
                        Search
                    </button>
                </form>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] table-fixed text-left text-xs">
                        <colgroup>
                            <col className="w-[23%]" />
                            <col className="w-[16%]" />
                            <col className="w-[12%]" />
                            <col className="w-[11%]" />
                            <col className="w-[9%]" />
                            <col className="w-[12%]" />
                            <col className="w-[17%]" />
                        </colgroup>
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                                <th className="py-3 px-3">Course</th>
                                <th className="py-3 px-3">Academy</th>
                                <th className="py-3 px-3">Category</th>
                                <th className="py-3 px-3">Tuition Fee</th>
                                <th className="py-3 px-3">Batches</th>
                                <th className="py-3 px-3">Visibility</th>
                                <th className="py-3 px-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {courses.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-500">
                                        No courses match the current filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                courses.map((c) => (
                                    <tr key={c.courseId} className="hover:bg-slate-50/70 transition-colors [&>td]:align-middle">
                                        <td className="py-3.5 px-3 font-bold text-slate-900">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                                    <BookOpen size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-900 break-words line-clamp-2" title={c.title}>
                                                        {c.title}
                                                    </div>
                                                    {c.isFeatured && (
                                                        <span className="inline-block mt-0.5 px-1.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold">
                                                            Featured
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-3 font-semibold text-slate-700">
                                            <div className="break-words line-clamp-2" title={c.academyName}>{c.academyName}</div>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <span className="inline-block max-w-full px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] break-words line-clamp-2" title={c.category}>
                                                {c.category}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                                            {formatMoney(c.tuitionAmount)}
                                            <span className="text-[10px] text-slate-400 font-sans block font-normal">/{c.billingPeriod}</span>
                                        </td>
                                        <td className="py-3.5 px-3 text-slate-600 font-medium">
                                            <div className="font-semibold text-slate-800">{c.batchCount}</div>
                                            <div className="text-[10px] text-slate-400">active</div>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            {c.isHidden ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold whitespace-nowrap" title="Hidden (Moderated)">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                    Hidden
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold whitespace-nowrap">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Public
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5">
                                                <button
                                                    onClick={() => setInspectCourse(c)}
                                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors inline-flex items-center cursor-pointer"
                                                    title="View details"
                                                >
                                                    <Eye size={13} />
                                                </button>
                                                <button
                                                    onClick={() => c.isHidden ? handleUnhide(c) : setModerateCourse(c)}
                                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer ${
                                                        c.isHidden
                                                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                            : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 border border-slate-200'
                                                    }`}
                                                    title={c.isHidden ? 'Unhide course' : 'Hide course (Moderate)'}
                                                >
                                                    {c.isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                                                    <span>{c.isHidden ? 'Unhide' : 'Hide'}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleToggleFeatured(c)}
                                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                                                        c.isFeatured
                                                            ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                                                            : 'bg-white text-slate-400 border-slate-200 hover:text-amber-500 hover:bg-slate-50'
                                                    }`}
                                                    title={c.isFeatured ? 'Remove featured status' : 'Feature course on homepage'}
                                                >
                                                    <Star size={13} className={c.isFeatured ? 'fill-amber-500' : ''} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={total}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => fetchCourses(page, searchQuery, categoryFilter)}
                    recordLabel="courses"
                    loading={loading}
                />
            </div>

            {/* Inspect Course Modal */}
            {inspectCourse && (
                <Modal title="Course Curricular Overview" onClose={() => setInspectCourse(null)} maxWidth="540px">
                    <div className="space-y-4 text-xs font-sans text-slate-800">
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] text-slate-400">ID: {inspectCourse.courseId}</span>
                                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                                    {inspectCourse.category}
                                </span>
                            </div>
                            <h2 className="text-base font-bold text-slate-900">{inspectCourse.title}</h2>
                            <p className="text-slate-500 font-medium">Offered by <strong>{inspectCourse.academyName}</strong></p>
                        </div>

                        <div>
                            <span className="font-bold text-slate-700 block mb-1">Course Description:</span>
                            <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                                {inspectCourse.description || 'No description provided by the academy.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                            <div><strong>Tuition Fee:</strong> {formatMoney(inspectCourse.tuitionAmount)} / {inspectCourse.billingPeriod}</div>
                            <div><strong>Course Code:</strong> {inspectCourse.code}</div>
                            <div><strong>Batches Running:</strong> {inspectCourse.batchCount}</div>
                            <div><strong>Created Date:</strong> {new Date(inspectCourse.createdAt).toLocaleDateString()}</div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setInspectCourse(null)}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors cursor-pointer text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Moderate Course Content Modal */}
            {moderateCourse && (
                <Modal
                    title={`Moderate Course: Hide "${moderateCourse.title}"`}
                    onClose={() => { setModerateCourse(null); setModerateReason(''); setModerateError(null); }}
                    maxWidth="440px"
                >
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleConfirmModerateHide();
                        }}
                        className="space-y-4 text-xs font-sans"
                    >
                        <p className="text-slate-600 leading-relaxed">
                            Hiding this course will immediately remove it from the public marketplace, search suggestions, and direct enrollment links.
                        </p>

                        {moderateError && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                                {moderateError}
                            </div>
                        )}

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-slate-700">
                                    Moderation Reason <span className="text-rose-500">*</span>
                                </label>
                                <span className={`text-[10px] ${moderateReason.trim().length > 500 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                    {moderateReason.trim().length}/500
                                </span>
                            </div>
                            <textarea
                                rows={3}
                                required
                                placeholder="Explain why this course is being hidden (e.g. copyright infringement, misleading fee structure)..."
                                value={moderateReason}
                                onChange={(e) => {
                                    setModerateReason(e.target.value);
                                    if (moderateError) setModerateError(null);
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 resize-none"
                            />
                        </div>

                        <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => { setModerateCourse(null); setModerateReason(''); setModerateError(null); }}
                                disabled={moderateBusy}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={moderateBusy || !moderateReason.trim() || moderateReason.trim().length < 10}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-rose-600/25 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                            >
                                {moderateBusy ? <>Hiding… <RefreshCw size={13} className="animate-spin" /></> : 'Confirm & Hide Course'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
