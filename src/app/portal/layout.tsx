import type { Metadata } from 'next';
import { Suspense } from 'react';
import AuthGuard from '@/components/AuthGuard';

export const metadata: Metadata = {
    title: 'Parent & Student Portal — ClassSphere Academy',
    description: 'Archival self-service portal for household records, masterclass schedules, fee settlements, and academic distinctions.',
    robots: {
        index: false,
        follow: false,
    },
};

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] antialiased">
            {/* The portal reads the current date/time, so it renders at request time */}
            <Suspense><AuthGuard area="portal">{children}</AuthGuard></Suspense>
        </div>
    );
}
