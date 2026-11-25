'use client';
import { createContext, useContext, useEffect } from 'react';
import { useApi } from '@/lib/api';

export interface Branch {
    branchId: string;
    name: string;
    code: string;
    address: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    location?: string | null;
    pincode?: string | null;
    phone: string | null;
    email?: string | null;
    isPrimary: boolean;
    isActive: boolean;
    headName: string | null;
    batchCount: number;
    studentCount: number;
}

export interface Workspace {
    organization: {
        tenantId: string;
        name: string;
        slug: string;
        academyType: string;
        currency: string;
        timezone: string;
        branding: { primaryColor?: string; logoUrl?: string | null; tagline?: string };
        settings: {
            category?: string;
            email?: string;
            phone?: string;
            city?: string;
            address?: string;
            academicSession?: string;
            notificationTriggers?: Array<{ key: string; label: string; description: string; channels: string[]; enabled: boolean }>;
        };
    };
    subscription: { planTier: string; status: string; maxSeats: number; maxBranches: number } | null;
    actor: { fullName: string; email: string; role: string | null; title: string | null } | null;
    branches: Branch[];
    /** Staff limited to assigned courses and batches; null for everyone else */
    staffAccess?: { courses: number; batches: number } | null;
    entitlements: { seats: { current: number; maximum: number }; branches: { current: number; maximum: number } };
}

const WorkspaceContext = createContext<{ workspace: Workspace | null; reload: () => void }>({ workspace: null, reload: () => {} });

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const { data, error, reload } = useApi<Workspace>('/tenants');
    // Every page depends on the workspace: recover from a failed load instead of staying empty until a page refresh
    useEffect(() => {
        if (!error) return;
        const timer = setInterval(reload, 5000);
        return () => clearInterval(timer);
    }, [error, reload]);
    return <WorkspaceContext.Provider value={{ workspace: data, reload }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
    const { workspace, reload } = useContext(WorkspaceContext);
    const rawCurrency = workspace?.organization?.currency;
    const currency = (typeof rawCurrency === 'string' && /^[A-Za-z]{3}$/.test(rawCurrency.trim()))
        ? rawCurrency.trim().toUpperCase()
        : 'INR';
    return { workspace, reload, currency };
}
