import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import ApiStatus from '@/components/ApiStatus';
import AuthGuard from '@/components/AuthGuard';
import SignOutButton from '@/components/SignOutButton';

export const metadata: Metadata = {
    title: 'Platform Operator Console — ClassSphere SaaS',
    description: 'SaaS multi-tenant lifecycle management, subscription telemetry, and compliance audit trail.',
    robots: {
        index: false,
        follow: false,
    },
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 antialiased flex flex-col">
            {/* Operator Header Bar */}
            <header className="sticky top-0 z-50 bg-[#1e293b]/95 backdrop-blur-md border-b border-slate-700/80 px-6 lg:px-10 py-3 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/20">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm tracking-tight text-white font-serif">ClassSphere</span>
                                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    Platform Operator
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400">Global SaaS Control Plane • v1.0.0</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
                    <Link href="/admin" className="px-3 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors">
                        Overview
                    </Link>
                    <Link href="/admin/tenants" className="px-3 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors">
                        Academies
                    </Link>
                    <Link href="/admin/subscriptions" className="px-3 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors">
                        Subscriptions
                    </Link>
                    <Link href="/admin/audit" className="px-3 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors">
                        Audit Logs
                    </Link>
                </nav>

                {/* Operator Profile */}
                <div className="flex items-center gap-3">
                    <ApiStatus />

                    <SignOutButton className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800" />
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
                <AuthGuard area="platform">{children}</AuthGuard>
            </main>
        </div>
    );
}
