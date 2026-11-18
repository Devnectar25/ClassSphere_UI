export type PortalStatus = 'active' | 'invited' | 'none' | 'disabled';

export type PayerFilter = 'all' | 'paid' | 'overdue' | 'pending';
export type LoginFilter = 'all' | 'active' | 'invited' | 'none' | 'disabled';

export interface LinkedStudent {
    studentId: string;
    name: string;
    batchName?: string;
}

export interface RawGuardian {
    guardianId: string;
    firstName: string;
    lastName: string;
    relationship: string;
    phone: string;
    email: string;
    isPrimary: boolean;
    hasPortalAccess: boolean;
    portalEmail: string | null;
    portalLastLogin: string | null;
    payerStatus: string;
    students: LinkedStudent[];
}

/**
 * Normalized UI Guardian record
 */
export interface UIGuardian extends RawGuardian {
    fullName: string;
    portalStatus: PortalStatus;
    // TODO: Backend integration - fetch exact overdue amount and days from invoices/dues API
    dueAmount: number;
    overdueDays: number;
    formattedPhone: string;
    batchIds: string[];
}

export interface GuardianCredentials {
    name: string;
    email: string;
    password: string;
}

export interface StatFilterConfig {
    id: 'all' | 'overdue' | 'invited' | 'multi_child';
    label: string;
    count: number;
    color: string;
    icon: string;
}

