import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import SignOutButton from '@/components/SignOutButton';
import AdminSidebar from '@/components/AdminSidebar';
import AdminMenuButton from '@/components/AdminMenuButton';

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
        <div className="h-screen flex flex-col bg-[#F8FAFC] text-slate-900 antialiased overflow-hidden font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Operator Header Bar — fixed in place at top of screen */}
            <header className="shrink-0 h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 shadow-xs z-30">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <AdminMenuButton />

                    <Link href="/admin" className="flex items-center gap-3 min-w-0 group no-underline">
                        <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                            <ShieldCheck size={24} className="stroke-[2.2]" />
                        </div>
                        <div className="flex items-center gap-2.5">
                            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                                ClassSphere
                            </span>
                            <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                                Platform Operator
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Operator Profile & SignOut */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <SignOutButton
                        label="Logout"
                        className="text-xs font-semibold text-slate-700 hover:text-rose-600 px-3.5 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-rose-50 hover:border-rose-200 transition-all shadow-2xs"
                    />
                </div>
            </header>

            {/* Viewport-fixed shell: sidebar & header stay static, only main content scrolls */}
            <div className="flex-1 flex overflow-hidden">
                <AdminSidebar />
                <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-4 sm:p-6 lg:p-8 min-w-0 bg-[#F8FAFC]">
                    <div className="max-w-7xl mx-auto w-full">
                        <AuthGuard area="platform">{children}</AuthGuard>
                    </div>
                </main>
            </div>
        </div>
    );
}
