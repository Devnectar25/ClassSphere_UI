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
                <div className="fixed bottom-6 right-6 z-50 bg-indigo-900 border border-indigo-700 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold">
                    <Sparkles size={16} className="text-amber-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold font-serif text-white">Academies</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        SaaS multi-tenant isolation registry, branch entitlements, and subscription states.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={refreshTenants}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Filter Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tenants by organization name or slug..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* Tenants Data Table */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                                <th className="py-3 px-4">Organization Name</th>
                                <th className="py-3 px-4">Type</th>
                                <th className="py-3 px-4">Admin</th>
                                <th className="py-3 px-4">Branches</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Plan / Students</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/60">
                            {filteredTenants.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-400">
                                        No tenant organizations match the current filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredTenants.map((t) => (
                                    <tr key={t.tenantId} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                                                {t.name.charAt(0)}
                                            </div>
                                            <span>{t.name}</span>
                                        </td>
                                        <td className="py-4 px-4 text-slate-300">{t.academyType}</td>
                                        <td className="py-4 px-4 font-mono text-slate-300">{t.adminEmail ?? '—'}</td>
                                        <td className="py-4 px-4 text-slate-300">{t.branchCount}</td>
                                        <td className="py-4 px-4">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 capitalize">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-slate-300 whitespace-nowrap">
                                            {t.planTier ?? '—'} • {t.activeStudents} students
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <button onClick={() => openAcademy(t)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">
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
