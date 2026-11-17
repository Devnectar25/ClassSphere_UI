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
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased flex flex-col font-sans">
            {/* Operator Header Bar */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-6 lg:px-10 py-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-indigo-500/20">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm tracking-tight text-slate-900 font-serif">ClassSphere</span>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                                    Platform Operator
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500">Global SaaS Control Plane • v1.0.0</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
                    <Link href="/admin" className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                        Overview
                    </Link>
                    <Link href="/admin/tenants" className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                        Academies
                    </Link>
                    <Link href="/admin/subscriptions" className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                        Subscriptions
                    </Link>
                    <Link href="/admin/audit" className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                        Audit Logs
                    </Link>
                </nav>

                {/* Operator Profile */}
                <div className="flex items-center gap-3">
                    <ApiStatus />
                    <SignOutButton className="text-xs font-semibold text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors" />
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
                <AuthGuard area="platform">{children}</AuthGuard>
            </main>
        </div>
    );
}
