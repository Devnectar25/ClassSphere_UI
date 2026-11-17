'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search, RefreshCw,
    Sparkles, Eye
} from 'lucide-react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';

interface ComplianceLog {
    logId: string;
    tenantId: string | null;
    actorId: string | null;
    action: string;
    entityType: string;
    correlationId: string;
    details: Record<string, unknown> | null;
    createdAt: string;
}

export default function PlatformAdminAuditPage() {
    const [logs, setLogs] = useState<ComplianceLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const [selectedLog, setSelectedLog] = useState<ComplianceLog | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const url = actionFilter
                ? `/reports?type=audit&action=${encodeURIComponent(actionFilter)}`
                : '/reports?type=audit';
            setLogs((await api<{ logs: ComplianceLog[] }>(url)).logs);
        } catch {
            showToast('Unable to fetch compliance audit records.');
        } finally {
            setLoading(false);
        }
    }, [actionFilter]);

    useEffect(() => {
        let isMounted = true;
        api<{ logs: ComplianceLog[] }>('/reports?type=audit')
            .then((data) => {
                if (isMounted) {
                    setLogs(data.logs);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    showToast('Unable to fetch compliance audit records.');
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="space-y-6">
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold">
                    <Sparkles size={16} className="text-amber-500" />
                    <span>{toastMessage}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">Immutable Compliance Audit Trail</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Cryptographically verifiable log of all administrative, financial, and security lifecycle mutations.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchLogs}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs hover:border-slate-300 cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh Logs</span>
                    </button>
                </div>
            </div>

            {/* Filter Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        placeholder="Filter by action (e.g. tenant, payment, student)..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs transition-all font-mono"
                    />
                </div>
                <button
                    onClick={fetchLogs}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                    Apply Filter
                </button>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 font-sans">
                                <th className="py-3 px-4">Timestamp (UTC)</th>
                                <th className="py-3 px-4">Action Event</th>
                                <th className="py-3 px-4">Entity Type</th>
                                <th className="py-3 px-4">Correlation ID</th>
                                <th className="py-3 px-4 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                                        No audit events matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.logId} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-4 px-4 text-slate-600 font-medium whitespace-nowrap">
                                            {new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                                        </td>
                                        <td className="py-4 px-4 whitespace-nowrap">
                                            <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-bold text-[11px]">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-slate-600 font-sans font-medium whitespace-nowrap">{log.entityType}</td>
                                        <td className="py-4 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">{log.correlationId}</td>
                                        <td className="py-4 px-4 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans text-[11px] font-semibold transition-colors inline-flex items-center gap-1.5 ml-auto cursor-pointer"
                                            >
                                                <Eye size={13} />
                                                <span>Inspect</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: JSON Payload Inspector */}
            {selectedLog && (
                <Modal title="Audit Event Details" onClose={() => setSelectedLog(null)}>
                    <div className="space-y-4 text-xs font-sans text-slate-800">
                        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                            <span className="text-[10px] text-indigo-700 uppercase tracking-wider font-bold block mb-0.5">Action Event</span>
                            <span className="text-sm font-bold text-slate-900 font-mono">{selectedLog.action}</span>
                        </div>

                        <div className="space-y-1.5 font-mono text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-[11px]">
                            <div><strong className="text-slate-500 font-sans">Log ID:</strong> {selectedLog.logId}</div>
                            <div><strong className="text-slate-500 font-sans">Tenant ID:</strong> {selectedLog.tenantId ?? '—'}</div>
                            <div><strong className="text-slate-500 font-sans">Actor ID:</strong> {selectedLog.actorId ?? '—'}</div>
                            <div><strong className="text-slate-500 font-sans">Correlation ID:</strong> {selectedLog.correlationId}</div>
                            <div><strong className="text-slate-500 font-sans">Timestamp:</strong> {new Date(selectedLog.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</div>
                        </div>

                        <div>
                            <span className="text-slate-700 block font-semibold mb-1 text-xs">Raw Payload Details:</span>
                            <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono overflow-x-auto text-[11px] max-h-60 leading-relaxed border border-slate-800">
                                {JSON.stringify(selectedLog.details, null, 2)}
                            </pre>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors cursor-pointer text-xs shadow-xs"
                            >
                                Close Inspector
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
