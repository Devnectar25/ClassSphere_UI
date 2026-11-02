import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import PageState from '@/components/PageState';
import AuthGuard from '@/components/AuthGuard';
import { WorkspaceProvider } from '@/lib/workspace';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard area="academy">
        <WorkspaceProvider>
            <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cs-bg)' }}>
                <Sidebar />
                <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
                    {/* Pages read the current date/time, so they render at request time */}
                    <Suspense fallback={<div style={{ padding: '20px' }}><PageState error={null} /></div>}>
                        {children}
                    </Suspense>
                </main>
            </div>
        </WorkspaceProvider>
        </AuthGuard>
    );
}
