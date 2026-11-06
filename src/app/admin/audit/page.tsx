'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search, RefreshCw,
    Sparkles, Eye, X
} from 'lucide-react';
import { api } from '@/lib/api';

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
        <div className="space-y-6 animate-fade-in">
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-indigo-900 border border-indigo-700 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold">
                    <Sparkles size={16} className="text-amber-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold font-serif text-white">Immutable Compliance Audit Trail</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Cryptographically verifiable log of all administrative, financial, and security lifecycle mutations.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchLogs}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh Logs</span>
                    </button>
                </div>
            </div>

            {/* Filter Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        placeholder="Filter by action (e.g. tenant, payment, student)..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                </div>
                <button
                    onClick={fetchLogs}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
                >
                    Apply Filter
                </button>
            </div>

            {/* Audit Log Table */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                        <thead>
                            <tr className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700 font-sans">
                                <th className="py-3 px-4">Timestamp (UTC)</th>
                                <th className="py-3 px-4">Action Event</th>
                                <th className="py-3 px-4">Entity Type</th>
                                <th className="py-3 px-4">Correlation ID</th>
                                <th className="py-3 px-4 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/60">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                                        No audit events matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.logId} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="py-4 px-4 text-slate-300">
                                            {new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-slate-300 font-sans">{log.entityType}</td>
                                        <td className="py-4 px-4 text-slate-400">{log.correlationId}</td>
                                        <td className="py-4 px-4 text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-sans text-[11px] font-semibold transition-colors flex items-center gap-1 ml-auto cursor-pointer"
                                            >
                                                <Eye size={12} />
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
                <div className="scroll-lock fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in relative font-mono text-xs">
                        <button
                            onClick={() => setSelectedLog(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X size={18} />
                        </button>

                        <div className="border-b border-slate-800 pb-3 mb-4 font-sans">
                            <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-bold">Audit Event Inspection</span>
                            <h3 className="text-base font-bold text-white font-mono mt-0.5">{selectedLog.action}</h3>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div><strong className="text-slate-400">Log ID:</strong> {selectedLog.logId}</div>
                            <div><strong className="text-slate-400">Tenant ID:</strong> {selectedLog.tenantId}</div>
                            <div><strong className="text-slate-400">Actor ID:</strong> {selectedLog.actorId}</div>
                            <div><strong className="text-slate-400">Correlation ID:</strong> {selectedLog.correlationId}</div>
                        </div>

                        <div className="mt-4">
                            <span className="text-slate-400 block font-sans text-xs font-semibold mb-1">Raw Payload Details:</span>
                            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 overflow-x-auto text-[11px]">
                                {JSON.stringify(selectedLog.details, null, 2)}
                            </pre>
                        </div>

                        <div className="mt-6 flex justify-end font-sans">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500"
                            >
                                Close Inspector
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
