'use client';
import { createContext, useContext } from 'react';
import { useApi } from '@/lib/api';

export interface Branch {
    branchId: string;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
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
            academicSession?: string;
            notificationTriggers?: Array<{ key: string; label: string; description: string; channels: string[]; enabled: boolean }>;
        };
    };
    subscription: { planTier: string; status: string; maxSeats: number; maxBranches: number } | null;
    actor: { fullName: string; email: string; role: string | null; title: string | null } | null;
    branches: Branch[];
    entitlements: { seats: { current: number; maximum: number }; branches: { current: number; maximum: number } };
}

const WorkspaceContext = createContext<{ workspace: Workspace | null; reload: () => void }>({ workspace: null, reload: () => {} });

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const { data, reload } = useApi<Workspace>('/tenants');
    return <WorkspaceContext.Provider value={{ workspace: data, reload }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
    const { workspace, reload } = useContext(WorkspaceContext);
    return { workspace, reload, currency: workspace?.organization.currency ?? 'INR' };
}
