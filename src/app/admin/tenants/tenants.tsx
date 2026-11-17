'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, Sparkles, LogIn } from 'lucide-react';
import { api } from '@/lib/api';
import { homePath, saveSession, type SessionState } from '@/lib/session';

interface TenantSummary {
    tenantId: string;
    name: string;
    slug: string;
    academyType: string;
    adminEmail: string | null;
    branchCount: number;
    status: string;
    currency: string;
    timezone: string;
    planTier: string | null;
    activeStudents: number;
}

export default function PlatformAdminTenantsPage() {
    const router = useRouter();
    const [tenants, setTenants] = useState<TenantSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const [refreshCount, setRefreshCount] = useState(0);

    useEffect(() => {
        let isMounted = true;
        api<TenantSummary[]>('/platform/tenants')
            .then((data) => {
                if (isMounted) {
                    setTenants(data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    showToast('Unable to fetch tenant workspaces.');
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [refreshCount]);

    const refreshTenants = () => {
        setLoading(true);
        setRefreshCount((c) => c + 1);
    };

    // Opens the academy workspace with academy-admin rights (support access, audited as the operator)
    const openAcademy = async (tenant: TenantSummary) => {
        try {
            const session = await api<SessionState>('/auth/switch', { method: 'POST', body: JSON.stringify({ tenantId: tenant.tenantId }) });
            saveSession({ ...session, selectedBranchId: null });
            router.push(homePath(session));
        } catch (err) {
            showToast((err as Error).message);
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 text-slate-900 px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold">
                    <Sparkles size={16} className="text-amber-500" />
                    <span>{toastMessage}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">Academies</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        SaaS multi-tenant isolation registry, branch entitlements, and subscription states.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={refreshTenants}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs hover:border-slate-300 cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Filter Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tenants by organization name or slug..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs transition-all"
                    />
                </div>
            </div>

            {/* Tenants Data Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                                <th className="py-3 px-4">Organization Name</th>
                                <th className="py-3 px-4">Type</th>
                                <th className="py-3 px-4">Admin</th>
                                <th className="py-3 px-4">Branches</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Plan / Students</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTenants.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-500">
                                        No tenant organizations match the current filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredTenants.map((t) => (
                                    <tr key={t.tenantId} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs">
                                                {t.name.charAt(0)}
                                            </div>
                                            <span>{t.name}</span>
                                        </td>
                                        <td className="py-4 px-4 text-slate-600 font-medium">{t.academyType}</td>
                                        <td className="py-4 px-4 font-mono text-slate-600">{t.adminEmail ?? '—'}</td>
                                        <td className="py-4 px-4 text-slate-600 font-medium">{t.branchCount}</td>
                                        <td className="py-4 px-4">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-bold capitalize">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                                            <strong className="text-slate-800">{t.planTier ?? '—'}</strong> • {t.activeStudents} students
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <button onClick={() => openAcademy(t)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all">
                                                <LogIn size={13} /> Open
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
