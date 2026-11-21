'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
    currentPage: number;
    totalPages?: number;
    totalRecords?: number;
    totalItems?: number;
    pageSize?: number;
    onPageChange: (page: number) => void;
    recordLabel?: string;
    loading?: boolean;
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
        return [1, 2, 3, 4, 5, 'ellipsis', total];
    }
    if (current >= total - 3) {
        return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
}

export default function Pagination({
    currentPage,
    totalPages,
    totalRecords,
    totalItems,
    pageSize = 10,
    onPageChange,
    recordLabel = 'records',
    loading = false,
}: PaginationProps) {
    const actualTotal = totalRecords ?? totalItems ?? 0;
    const actualPages = totalPages ?? Math.max(1, Math.ceil(actualTotal / pageSize));

    if (actualTotal === 0) return null;

    const from = Math.min((currentPage - 1) * pageSize + 1, actualTotal);
    const to = Math.min(currentPage * pageSize, actualTotal);
    const pages = getPageNumbers(currentPage, Math.max(1, actualPages));

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 bg-white border-t border-slate-200/90 text-xs">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
                <span>
                    Showing <strong className="text-slate-800 font-bold">{from}</strong> to{' '}
                    <strong className="text-slate-800 font-bold">{to}</strong> of{' '}
                    <strong className="text-slate-800 font-bold">{actualTotal}</strong> {recordLabel}
                </span>
                <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px]">
                    {pageSize} per page
                </span>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors font-semibold flex items-center gap-1 cursor-pointer shadow-2xs text-xs"
                    title="Previous page"
                >
                    <ChevronLeft size={14} />
                    <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-1">
                    {pages.map((p, idx) => {
                        if (p === 'ellipsis') {
                            return (
                                <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-400 font-medium select-none">
                                    …
                                </span>
                            );
                        }
                        const isActive = p === currentPage;
                        return (
                            <button
                                key={`page-${p}`}
                                type="button"
                                onClick={() => onPageChange(p)}
                                disabled={loading}
                                className={`w-8 h-8 rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold shadow-2xs'
                                }`}
                            >
                                {p}
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= actualPages || loading}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors font-semibold flex items-center gap-1 cursor-pointer shadow-2xs text-xs"
                    title="Next page"
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}
