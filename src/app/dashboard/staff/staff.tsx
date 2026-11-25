'use client';
import { useState, useMemo, Fragment } from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import BadgeList from '@/components/BadgeList';
import Modal from '@/components/Modal';
import CountryPhoneInput, { COUNTRIES, type CountryOption, validatePhoneNumber } from '@/components/CountryPhoneInput';
import {
    Mail, Phone, Shield, Users, ShieldCheck, CheckCircle2, Eye, Lock,
    MapPin, Plus, Trash2, RotateCcw, Search, Sliders, X, ChevronLeft, ChevronRight,
    UserCheck, UserX, Loader2
} from 'lucide-react';
import { api, useApi, formatDate, initials } from '@/lib/api';
import { can, ROLE_LABELS, useSession } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';
import { NO_ASSIGNMENTS, StaffAccessDialog, StaffAccessFields, type StaffAssignments } from '@/components/StaffAccess';

interface StaffMember {
    membershipId: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: string;
    title: string | null;
    branchId?: string | null;
    branchName: string | null;
    batches: string | null;
    assignments?: StaffAssignments;
    isActive: boolean;
    lastLoginAt: string | null;
}

const roleColors: Record<string, string> = {
    TenantAdmin: 'badge-danger',
    BranchManager: 'badge-success',
    Finance: 'badge-warning',
    Instructor: 'badge-primary',
    Staff: 'badge-info',
};

const ROLE_HELP: Record<string, string> = {
    TenantAdmin: 'Full access to every branch, users, settings and finance',
    BranchManager: 'Runs one branch: students, attendance, billing and notices of that branch',
    Finance: 'Fees, invoices, payments and financial reports',
    Instructor: 'Batches, attendance and notices for their classes',
    Staff: 'Front office: students, guardians, attendance and notices',
};

const ROLE_METADATA: Record<string, {
    label: string;
    badge: string;
    scope: string;
    description: string;
    color: string;
    canDo: string[];
}> = {
    TenantAdmin: {
        label: 'Academy Admin',
        badge: 'badge-danger',
        scope: 'All Branches (Consolidated)',
        description: 'Highest administrative authority. Has unrestricted read and write permissions across every branch, course, user, finance, and system settings.',
        color: '#EF4444',
        canDo: [
            'Create & manage all branch campuses',
            'Add staff and assign roles & passwords',
            'Full financial management & billing cycles',
            'Manage curricula, courses & subjects',
            'Custom branding, logo and notifications',
        ],
    },
    BranchManager: {
        label: 'Branch Manager',
        badge: 'badge-success',
        scope: 'Assigned Branch Only',
        description: 'Runs daily branch operations. Manages students, batches, attendance, billing, and announcements strictly within their home branch.',
        color: '#10B981',
        canDo: [
            'Enroll students into their branch',
            'Conduct roll calls and manage batch schedules',
            'Collect branch payments and manage dues',
            'Publish notices to branch students & parents',
            'Schedule tests and submit grading',
        ],
    },
    Finance: {
        label: 'Finance (Bursar)',
        badge: 'badge-warning',
        scope: 'All Branches (Financial View)',
        description: 'Specialized accounting access. Focuses on fee structures, invoice generation, payment receipts, fee aging, and collection reports.',
        color: '#F59E0B',
        canDo: [
            'Generate bulk monthly/term invoice cycles',
            'Record incoming payments and print receipts',
            'View collection reports and overdue fee aging',
            'Read-only access to students & courses',
            'No access to tests, attendance or settings',
        ],
    },
    Instructor: {
        label: 'Instructor',
        badge: 'badge-primary',
        scope: 'Assigned Batches',
        description: 'Academic instructor role. Access is focused on teaching: batches, taking daily roll calls, scheduling exams, and entering student marks.',
        color: '#6C63FF',
        canDo: [
            'View assigned batch rosters & student details',
            'Take and submit session attendance roll call',
            'Schedule tests and enter subject marks',
            'Publish class announcements & notices',
            'No access to billing, invoices, staff or settings',
        ],
    },
    Staff: {
        label: 'Staff',
        badge: 'badge-info',
        scope: 'All Branches',
        description: 'Front-desk administrative staff. Handles admissions, student inquiries, attendance recording, and circulars; billing is read-only.',
        color: '#06B6D4',
        canDo: [
            'Enroll new students and link guardians',
            'Mark attendance registers for batches',
            'Create and broadcast notices',
            'Read-only access to invoices and fee structures',
            'No access to financial ledger or settings',
        ],
    },
};

interface PageAccessItem {
    page: string;
    path: string;
    description: string;
    permissions: Record<string, 'full' | 'read' | 'none'>;
    branchScopedFor?: string[];
}

interface PageSection {
    section: string;
    items: PageAccessItem[];
}

const PAGE_ACCESS_SECTIONS: PageSection[] = [
    {
        section: 'Core Management',
        items: [
            {
                page: 'Dashboard Overview',
                path: '/dashboard',
                description: 'Key metrics, charts, upcoming events and revenue run-rate',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'full',
                    Finance: 'full',
                    Instructor: 'none',
                    Staff: 'none',
                },
                branchScopedFor: ['BranchManager'],
            },
            {
                page: 'Students Directory',
                path: '/dashboard/students',
                description: 'Rosters, student profiles, admissions and enrollments',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'full',
                    Finance: 'read',
                    Instructor: 'read',
                    Staff: 'full',
                },
                branchScopedFor: ['BranchManager', 'Instructor'],
            },
            {
                page: 'Guardians & Parents',
                path: '/dashboard/guardians',
                description: 'Parent profiles, student links, and portal login management',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'full',
                    Finance: 'read',
                    Instructor: 'none',
                    Staff: 'read',
                },
                branchScopedFor: ['BranchManager'],
            },
        ],
    },
    {
        section: 'Academic Operations',
        items: [
            {
                page: 'Courses & Subjects',
                path: '/dashboard/courses',
                description: 'Course catalog, curriculum subjects, pricing and durations',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'read',
                    Finance: 'read',
                    Instructor: 'read',
                    Staff: 'read',
                },
            },
            {
                page: 'Batches & Schedule',
                path: '/dashboard/batches',
                description: 'Batch rosters, room allocations, instructor assignments and weekly timetable',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'full',
                    Finance: 'read',
                    Instructor: 'read',
                    Staff: 'read',
                },
                branchScopedFor: ['BranchManager', 'Instructor'],
            },
            {
                page: 'Attendance Register',
                path: '/dashboard/attendance',
                description: 'Session roll call, attendance records, present/absent logs and excuse notes',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'full',
                    Finance: 'none',
                    Instructor: 'full',
                    Staff: 'full',
                },
                branchScopedFor: ['BranchManager', 'Instructor'],
            },
            {
                page: 'Tests & Results',
                path: '/dashboard/tests',
                description: 'Test schedules, mark sheets, grade calculations and report cards',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'full',
                    Finance: 'none',
                    Instructor: 'full',
                    Staff: 'none',
                },
                branchScopedFor: ['BranchManager', 'Instructor'],
            },
        ],
    },
    {
        section: 'Finance & Billing',
        items: [
            {
                page: 'Fees & Plans',
                path: '/dashboard/fees',
                description: 'Tuition heads, recurring plans, discounts and fee structures',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'read',
                    Finance: 'read',
                    Instructor: 'none',
                    Staff: 'read',
                },
            },
            {
                page: 'Invoices & Dues',
                path: '/dashboard/invoices',
                description: 'Invoice ledger, automated billing cycles, dues and fee aging',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'full',
                    Finance: 'full',
                    Instructor: 'none',
                    Staff: 'read',
                },
                branchScopedFor: ['BranchManager'],
            },
            {
                page: 'Payments & Receipts',
                path: '/dashboard/payments',
                description: 'Payment settlements, cash/UPI reconciliation and official receipts',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'full',
                    Finance: 'full',
                    Instructor: 'none',
                    Staff: 'read',
                },
                branchScopedFor: ['BranchManager'],
            },
        ],
    },
    {
        section: 'Communication',
        items: [
            {
                page: 'Notices & Events',
                path: '/dashboard/notices',
                description: 'Broadcast circulars, batch announcements, urgent alerts and recital events',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'full',
                    Finance: 'none',
                    Instructor: 'full',
                    Staff: 'full',
                },
                branchScopedFor: ['BranchManager', 'Instructor'],
            },
            {
                page: 'Achievements',
                path: '/dashboard/achievements',
                description: 'Student distinctions, merit awards, honors and competition achievements',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'full',
                    Finance: 'read',
                    Instructor: 'read',
                    Staff: 'full',
                },
                branchScopedFor: ['BranchManager'],
            },
        ],
    },
    {
        section: 'Administration',
        items: [
            {
                page: 'Campus Branches',
                path: '/dashboard/branches',
                description: 'Branch locations, contact information and capacity quotas',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'read',
                    Finance: 'none',
                    Instructor: 'none',
                    Staff: 'read',
                },
            },
            {
                page: 'Users & Staff Roles',
                path: '/dashboard/staff',
                description: 'Staff accounts, role assignments, passwords and access activation',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'read',
                    Finance: 'none',
                    Instructor: 'none',
                    Staff: 'read',
                },
                branchScopedFor: ['BranchManager'],
            },
            {
                page: 'Financial & Audit Reports',
                path: '/dashboard/reports',
                description: 'Revenue collections, fee aging analysis, audit logs and metrics',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'full',
                    Finance: 'full',
                    Instructor: 'none',
                    Staff: 'none',
                },
                branchScopedFor: ['BranchManager'],
            },
            {
                page: 'Academy Settings',
                path: '/dashboard/settings',
                description: 'Academy branding, custom logo, session terms and notification triggers',
                permissions: {
                    TenantAdmin: 'full',
                    BranchManager: 'none',
                    Finance: 'none',
                    Instructor: 'none',
                    Staff: 'none',
                },
            },
        ],
    },
];

type AccessType = 'full' | 'read' | 'none';

interface PageAccessConfig {
    access: AccessType;
    branchScoped: boolean;
}

type RolePageAccessMap = Record<string, Record<string, PageAccessConfig>>;

interface FlattenedPageItem {
    page: string;
    path: string;
    description: string;
    section: string;
    permissions: Partial<Record<string, AccessType>>;
    branchScopedFor?: string[];
}

const ALL_PAGE_ITEMS: FlattenedPageItem[] = PAGE_ACCESS_SECTIONS.flatMap(sec =>
    sec.items.map(item => ({
        page: item.page,
        path: item.path,
        description: item.description,
        section: sec.section,
        permissions: item.permissions,
        branchScopedFor: item.branchScopedFor,
    }))
);

const ACCESS_STORAGE_KEY = 'classsphere.role_page_access.v2';

const buildDefaultAccessMap = (): RolePageAccessMap => {
    const map: RolePageAccessMap = {};
    const roles = Object.keys(ROLE_METADATA);
    roles.forEach(r => { map[r] = {}; });

    PAGE_ACCESS_SECTIONS.forEach(sec => {
        sec.items.forEach(item => {
            roles.forEach(r => {
                map[r][item.path] = {
                    access: item.permissions[r] ?? 'none',
                    branchScoped: item.branchScopedFor?.includes(r) ?? false,
                };
            });
        });
    });

    return map;
};

const emptyUser = { fullName: '', email: '', phone: '', title: '', role: 'Instructor', branchId: '', password: '', assignments: NO_ASSIGNMENTS };

interface PaginationControlsProps {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
    itemLabel?: string;
}

function PaginationControls({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [5, 10, 20],
    itemLabel = 'items',
}: PaginationControlsProps) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startIdx = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const endIdx = Math.min(safePage * pageSize, totalItems);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (safePage > 3) pages.push('...');
            const start = Math.max(2, safePage - 1);
            const end = Math.min(totalPages - 1, safePage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (safePage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--cs-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--cs-surface)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>
                    Showing <strong style={{ color: 'var(--cs-text-primary)' }}>{startIdx}–{endIdx}</strong> of{' '}
                    <strong style={{ color: 'var(--cs-text-primary)' }}>{totalItems}</strong> {itemLabel}
                </span>

                {onPageSizeChange && pageSizeOptions && pageSizeOptions.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                        <span>Rows per page:</span>
                        <select
                            className="cs-input"
                            style={{ padding: '3px 8px', fontSize: '12px', width: 'auto', height: '30px' }}
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        >
                            {pageSizeOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                    className="btn-ghost"
                    style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: safePage <= 1 ? 0.4 : 1,
                        cursor: safePage <= 1 ? 'not-allowed' : 'pointer'
                    }}
                    disabled={safePage <= 1}
                    onClick={() => onPageChange(safePage - 1)}
                >
                    <ChevronLeft size={14} /> Prev
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {getPageNumbers().map((p, idx) => {
                        if (typeof p === 'string') {
                            return (
                                <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--cs-text-muted)', fontSize: '12px' }}>
                                    …
                                </span>
                            );
                        }
                        const isActive = p === safePage;
                        return (
                            <button
                                key={p}
                                onClick={() => onPageChange(p)}
                                style={{
                                    minWidth: '32px',
                                    height: '32px',
                                    padding: '0 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: isActive ? 700 : 500,
                                    border: isActive ? '1px solid var(--cs-primary)' : '1px solid var(--cs-border)',
                                    background: isActive ? 'var(--cs-primary)' : 'transparent',
                                    color: isActive ? '#FFFFFF' : 'var(--cs-text-primary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                {p}
                            </button>
                        );
                    })}
                </div>

                <button
                    className="btn-ghost"
                    style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: safePage >= totalPages ? 0.4 : 1,
                        cursor: safePage >= totalPages ? 'not-allowed' : 'pointer'
                    }}
                    disabled={safePage >= totalPages}
                    onClick={() => onPageChange(safePage + 1)}
                >
                    Next <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

export default function StaffPage() {
    const session = useSession();
    const { workspace } = useWorkspace();
    const { data: staff, error, reload } = useApi<StaffMember[]>('/staff');
    const { data: branchList, error: branchError, reload: reloadBranches } = useApi<Array<{ branchId: string; name: string }>>('/branches');
    const branches = branchList ?? workspace?.branches.filter(b => b.isActive) ?? null;
    const [activeTab, setActiveTab] = useState<'users' | 'access'>('users');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('Instructor');
    const [pageFilter, setPageFilter] = useState<'accessible' | 'restricted' | 'all'>('accessible');
    const [searchQuery, setSearchQuery] = useState('');
    const [userPage, setUserPage] = useState(1);
    const [userPageSize, setUserPageSize] = useState(5);
    const [accessPage, setAccessPage] = useState(1);
    const [accessPageSize, setAccessPageSize] = useState(5);
    const [matrixPage, setMatrixPage] = useState(1);
    const [matrixPageSize, setMatrixPageSize] = useState(8);
    const [grantModalOpen, setGrantModalOpen] = useState(false);
    const [grantForm, setGrantForm] = useState<{ path: string; access: AccessType; branchScoped: boolean }>({
        path: '',
        access: 'full',
        branchScoped: false,
    });
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);

    const [roleAccessMap, setRoleAccessMap] = useState<RolePageAccessMap>(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(ACCESS_STORAGE_KEY);
                if (stored) return JSON.parse(stored);
            } catch {}
        }
        return buildDefaultAccessMap();
    });

    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState(emptyUser);
    const [phoneCountry, setPhoneCountry] = useState<CountryOption>(COUNTRIES[0]);
    const [phoneError, setPhoneError] = useState('');
    const [phoneTouched, setPhoneTouched] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [accessOf, setAccessOf] = useState<StaffMember | null>(null);
    const canManage = can(session, 'staff.write');

    const stats = [
        { label: 'Total Users', value: staff?.length ?? 0, color: '#6C63FF' },
        { label: 'Instructors', value: staff?.filter(s => s.role === 'Instructor').length ?? 0, color: '#10B981' },
        { label: 'Admin / Managers / Finance', value: staff?.filter(s => ['TenantAdmin', 'BranchManager', 'Finance', 'Staff'].includes(s.role)).length ?? 0, color: '#F59E0B' },
        { label: 'Inactive', value: staff?.filter(s => !s.isActive).length ?? 0, color: '#EF4444' },
    ];

    const saveAccessMap = (newMap: RolePageAccessMap) => {
        setRoleAccessMap(newMap);
        try {
            localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(newMap));
        } catch {}
    };

    const handleUpdateAccess = (role: string, path: string, access: AccessType, branchScoped?: boolean) => {
        const current = roleAccessMap[role]?.[path] ?? { access: 'none', branchScoped: false };
        const updated: PageAccessConfig = {
            access,
            branchScoped: branchScoped !== undefined ? branchScoped : current.branchScoped,
        };

        const newMap = {
            ...roleAccessMap,
            [role]: {
                ...roleAccessMap[role],
                [path]: updated,
            },
        };
        saveAccessMap(newMap);

        const pageName = ALL_PAGE_ITEMS.find(p => p.path === path)?.page ?? path;
        const roleLabel = ROLE_METADATA[role]?.label ?? role;
        const accessLabel = access === 'full' ? 'Full Access' : access === 'read' ? 'View Only' : 'No Access';

        setToastMessage({
            text: `Access updated: "${pageName}" is now ${accessLabel} for ${roleLabel}.`,
            type: access === 'none' ? 'danger' : 'success',
        });
        setTimeout(() => setToastMessage(null), 4000);
    };

    const handleToggleBranchScoped = (role: string, path: string) => {
        const current = roleAccessMap[role]?.[path] ?? { access: 'none', branchScoped: false };
        handleUpdateAccess(role, path, current.access, !current.branchScoped);
    };

    const handleRemoveAccess = (role: string, path: string) => {
        handleUpdateAccess(role, path, 'none', false);
    };

    const handleResetRole = (role: string) => {
        const defaults = buildDefaultAccessMap();
        const newMap = {
            ...roleAccessMap,
            [role]: { ...defaults[role] },
        };
        saveAccessMap(newMap);
        const roleLabel = ROLE_METADATA[role]?.label ?? role;
        setToastMessage({
            text: `All permissions for ${roleLabel} have been reset to system defaults.`,
            type: 'info',
        });
        setTimeout(() => setToastMessage(null), 4000);
    };

    const currentRolePages = useMemo(() => {
        if (selectedRoleFilter === 'all') return [];
        return ALL_PAGE_ITEMS.map(item => {
            const cfg = roleAccessMap[selectedRoleFilter]?.[item.path] ?? { access: 'none', branchScoped: false };
            return {
                ...item,
                access: cfg.access,
                branchScoped: cfg.branchScoped,
            };
        });
    }, [roleAccessMap, selectedRoleFilter]);

    const accessiblePages = useMemo(() => currentRolePages.filter(p => p.access !== 'none'), [currentRolePages]);
    const restrictedPages = useMemo(() => currentRolePages.filter(p => p.access === 'none'), [currentRolePages]);

    const displayedPages = useMemo(() => {
        if (selectedRoleFilter === 'all') return [];
        return currentRolePages.filter(p => {
            if (pageFilter === 'accessible' && p.access === 'none') return false;
            if (pageFilter === 'restricted' && p.access !== 'none') return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return p.page.toLowerCase().includes(q) || p.path.toLowerCase().includes(q) || p.section.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
            }
            return true;
        });
    }, [currentRolePages, pageFilter, searchQuery, selectedRoleFilter]);

    const totalUsers = staff?.length ?? 0;
    const safeUserPage = Math.min(Math.max(1, userPage), Math.max(1, Math.ceil(totalUsers / userPageSize)));
    const paginatedStaff = useMemo(() => {
        if (!staff) return [];
        const start = (safeUserPage - 1) * userPageSize;
        return staff.slice(start, start + userPageSize);
    }, [staff, safeUserPage, userPageSize]);

    const totalDisplayedPages = displayedPages.length;
    const safeAccessPage = Math.min(Math.max(1, accessPage), Math.max(1, Math.ceil(totalDisplayedPages / accessPageSize)));
    const paginatedDisplayedPages = useMemo(() => {
        const start = (safeAccessPage - 1) * accessPageSize;
        return displayedPages.slice(start, start + accessPageSize);
    }, [displayedPages, safeAccessPage, accessPageSize]);

    const totalMatrixPages = ALL_PAGE_ITEMS.length;
    const safeMatrixPage = Math.min(Math.max(1, matrixPage), Math.max(1, Math.ceil(totalMatrixPages / matrixPageSize)));
    const paginatedMatrixItems = useMemo(() => {
        const start = (safeMatrixPage - 1) * matrixPageSize;
        return ALL_PAGE_ITEMS.slice(start, start + matrixPageSize);
    }, [safeMatrixPage, matrixPageSize]);

    const openGrantModal = () => {
        setGrantForm({
            path: restrictedPages[0]?.path ?? '',
            access: 'full',
            branchScoped: false,
        });
        setGrantModalOpen(true);
    };

    const submitGrantAccess = (e: React.FormEvent) => {
        e.preventDefault();
        if (!grantForm.path) return;
        handleUpdateAccess(selectedRoleFilter, grantForm.path, grantForm.access, grantForm.branchScoped);
        setGrantModalOpen(false);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        const phoneDigits = form.phone ? form.phone.replace(/\D/g, '') : '';
        if (phoneDigits) {
            const phoneErr = validatePhoneNumber(phoneDigits, phoneCountry, false);
            if (phoneErr) {
                setPhoneError(phoneErr);
                setPhoneTouched(true);
                return;
            }
        }

        setBusy(true);
        try {
            const finalPhone = phoneDigits ? `${phoneCountry.dialCode} ${phoneDigits}`.trim() : null;
            await api('/staff', { method: 'POST', body: JSON.stringify({ ...form, phone: finalPhone, branchId: form.branchId || null, assignments: form.role === 'Staff' ? form.assignments : undefined }) });
            setMessage(`${form.fullName} can now sign in as ${form.email} with the temporary password.`);
            setAdding(false);
            setForm(emptyUser);
            setPhoneError('');
            setPhoneTouched(false);
            reload();
        } catch (err) {
            setMessage((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const toggleActive = async (member: StaffMember) => {
        const nextState = !member.isActive;
        setTogglingId(member.membershipId);
        try {
            await api('/staff', {
                method: 'PUT',
                body: JSON.stringify({ membershipId: member.membershipId, isActive: nextState })
            });
            await reload();
            setToastMessage({
                text: `${member.fullName}'s account has been ${nextState ? 'activated' : 'deactivated'} successfully.`,
                type: nextState ? 'success' : 'info'
            });
            setTimeout(() => setToastMessage(null), 4000);
        } catch (err) {
            setMessage((err as Error).message);
        } finally {
            setTogglingId(null);
        }
    };

    const rolesToDisplay = selectedRoleFilter === 'all'
        ? Object.keys(ROLE_METADATA)
        : [selectedRoleFilter];

    return (
        <>
            <Topbar title="Users & Roles" subtitle="Role-based sign-ins for academy staff, per branch" />
            <div className="page-body">
                {message && (
                    <div className="cs-card" style={{ padding: '12px 16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderLeft: '4px solid var(--cs-danger)' }}>
                        <span>{message}</span>
                        <button className="btn-ghost" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => setMessage(null)}>Dismiss</button>
                    </div>
                )}

                {toastMessage && (
                    <div style={{
                        padding: '12px 18px',
                        borderRadius: '10px',
                        background: toastMessage.type === 'danger' ? 'rgba(239, 68, 68, 0.12)' : toastMessage.type === 'info' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(16, 185, 129, 0.12)',
                        border: `1px solid ${toastMessage.type === 'danger' ? '#EF4444' : toastMessage.type === 'info' ? '#6366F1' : '#10B981'}40`,
                        color: toastMessage.type === 'danger' ? '#EF4444' : toastMessage.type === 'info' ? '#4F46E5' : '#059669',
                        fontSize: '13px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={16} />
                            <span>{toastMessage.text}</span>
                        </div>
                        <button onClick={() => setToastMessage(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {stats.map(s => (
                        <div key={s.label} className="cs-card" style={{ padding: '20px' }}>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</div>
                            <div style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', marginTop: '2px' }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Switcher Tab: User vs Access */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div className="tab-list">
                        <button
                            className={`tab-trigger${activeTab === 'users' ? ' active' : ''}`}
                            onClick={() => setActiveTab('users')}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: 700 }}
                        >
                            <Users size={16} /> User Accounts ({staff?.length ?? 0})
                        </button>
                        <button
                            className={`tab-trigger${activeTab === 'access' ? ' active' : ''}`}
                            onClick={() => setActiveTab('access')}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: 700 }}
                        >
                            <ShieldCheck size={16} /> Role & Page Access
                        </button>
                    </div>
                    {canManage && (
                        <button
                            className="btn-primary"
                            onClick={() => { setForm(emptyUser); setPhoneError(''); setPhoneTouched(false); setAdding(true); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: 700 }}
                        >
                            <Plus size={15} /> Add User
                        </button>
                    )}
                </div>

                {/* TAB 1: USERS */}
                {activeTab === 'users' && (
                    !staff ? <PageState error={error} /> : (
                        <div className="cs-card">
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                    <div className="section-title">Academy Users</div>
                                    <div className="section-subtitle">Active staff accounts and assigned roles per campus branch</div>
                                </div>
                                <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                    {staff.length} {staff.length === 1 ? 'user' : 'users'} total
                                </span>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="cs-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Role</th>
                                            <th>Branch</th>
                                            <th>Batches</th>
                                            <th>Status</th>
                                            {canManage && <th>Access</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedStaff.length === 0 ? (
                                            <tr>
                                                <td colSpan={canManage ? 6 : 5} style={{ textAlign: 'center', padding: '40px', color: 'var(--cs-text-muted)' }}>
                                                    No user accounts found. Click &quot;+ Add User&quot; above to create one.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedStaff.map(s => (
                                                <tr key={s.membershipId}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div className="avatar-placeholder" style={{ width: 34, height: 34, fontSize: '12px' }}>{initials(s.fullName)}</div>
                                                            <div>
                                                                <div className="cell-nowrap" style={{ fontWeight: 600, fontSize: '13px' }}>{s.fullName}</div>
                                                                {s.title && <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>{s.title}</div>}
                                                                <div className="cell-nowrap" style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}><Mail size={10} style={{ marginRight: 4 }} />{s.email}</div>
                                                                {s.phone && <div className="cell-nowrap" style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}><Phone size={10} style={{ marginRight: 4 }} />{s.phone}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td><span className={`badge ${roleColors[s.role] ?? 'badge-secondary'}`}><Shield size={10} /> {ROLE_LABELS[s.role] ?? s.role}</span></td>
                                                    <td style={{ fontSize: '13px', color: 'var(--cs-text-secondary)' }}>{s.branchName ?? 'All Branches'}</td>
                                                    <td>
                                                        {s.role !== 'Staff' ? <BadgeList value={s.batches} className="badge-secondary" /> : (() => {
                                                            const a = s.assignments ?? NO_ASSIGNMENTS;
                                                            const none = a.courseIds.length === 0 && a.batchIds.length === 0;
                                                            return (
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '5px' }}>
                                                                    <span className={`badge ${none && s.branchName ? 'badge-warning' : 'badge-secondary'}`}>
                                                                        {none ? (s.branchName ? 'None assigned' : 'All courses') : `${a.courseIds.length} course${a.courseIds.length === 1 ? '' : 's'} · ${a.batchIds.length > 0 ? `${a.batchIds.length} batch${a.batchIds.length === 1 ? '' : 'es'}` : 'all batches'}`}
                                                                    </span>
                                                                    {canManage && <button type="button" className="btn-secondary" style={{ padding: '3px 10px', fontSize: '11.5px', height: 'auto' }} onClick={() => setAccessOf(s)}>Assign courses &amp; batches</button>}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${s.isActive ? 'badge-success' : 'badge-secondary'}`}>{s.isActive ? 'active' : 'inactive'}</span>
                                                        <div className="cell-nowrap" style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>Last login {formatDate(s.lastLoginAt)}</div>
                                                    </td>
                                                    {canManage && (
                                                        <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                            {s.email === session?.user.email ? (
                                                                <span style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                    color: 'var(--cs-text-muted)',
                                                                    background: 'var(--cs-surface-2)',
                                                                    padding: '4px 10px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid var(--cs-border)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                }}>
                                                                    <Shield size={11} /> You
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleActive(s)}
                                                                    disabled={togglingId === s.membershipId}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '6px',
                                                                        fontSize: '12px',
                                                                        fontWeight: 600,
                                                                        padding: '6px 14px',
                                                                        borderRadius: '8px',
                                                                        cursor: togglingId === s.membershipId ? 'not-allowed' : 'pointer',
                                                                        transition: 'all 0.15s ease',
                                                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                                                        ...(s.isActive ? {
                                                                            background: '#FEF2F2',
                                                                            border: '1px solid #FECACA',
                                                                            color: '#DC2626',
                                                                        } : {
                                                                            background: '#ECFDF5',
                                                                            border: '1px solid #A7F3D0',
                                                                            color: '#059669',
                                                                        }),
                                                                    }}
                                                                    onMouseEnter={e => {
                                                                        if (togglingId === s.membershipId) return;
                                                                        if (s.isActive) {
                                                                            e.currentTarget.style.background = '#FEE2E2';
                                                                            e.currentTarget.style.borderColor = '#FCA5A5';
                                                                            e.currentTarget.style.color = '#B91C1C';
                                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                                        } else {
                                                                            e.currentTarget.style.background = '#D1FAE5';
                                                                            e.currentTarget.style.borderColor = '#6EE7B7';
                                                                            e.currentTarget.style.color = '#047857';
                                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                                        }
                                                                    }}
                                                                    onMouseLeave={e => {
                                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                                        if (s.isActive) {
                                                                            e.currentTarget.style.background = '#FEF2F2';
                                                                            e.currentTarget.style.borderColor = '#FECACA';
                                                                            e.currentTarget.style.color = '#DC2626';
                                                                        } else {
                                                                            e.currentTarget.style.background = '#ECFDF5';
                                                                            e.currentTarget.style.borderColor = '#A7F3D0';
                                                                            e.currentTarget.style.color = '#059669';
                                                                        }
                                                                    }}
                                                                    title={s.isActive ? `Click to deactivate ${s.fullName}` : `Click to activate ${s.fullName}`}
                                                                >
                                                                    {togglingId === s.membershipId ? (
                                                                        <>
                                                                            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                                                            <span>{s.isActive ? 'Deactivating…' : 'Activating…'}</span>
                                                                        </>
                                                                    ) : s.isActive ? (
                                                                        <>
                                                                            <UserX size={13} />
                                                                            <span>Deactivate</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <UserCheck size={13} />
                                                                            <span>Activate</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationControls
                                currentPage={safeUserPage}
                                totalItems={staff.length}
                                pageSize={userPageSize}
                                onPageChange={setUserPage}
                                onPageSizeChange={(newSize) => { setUserPageSize(newSize); setUserPage(1); }}
                                pageSizeOptions={[5, 10, 20]}
                                itemLabel="users"
                            />
                        </div>
                    )
                )}

                {/* TAB 2: ACCESS & PERMISSIONS */}
                {activeTab === 'access' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Toast Feedback */}
                        {toastMessage && (
                            <div style={{
                                padding: '12px 18px',
                                borderRadius: '10px',
                                background: toastMessage.type === 'danger' ? 'rgba(239, 68, 68, 0.12)' : toastMessage.type === 'info' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                border: `1px solid ${toastMessage.type === 'danger' ? '#EF4444' : toastMessage.type === 'info' ? '#06B6D4' : '#10B981'}40`,
                                color: toastMessage.type === 'danger' ? '#EF4444' : toastMessage.type === 'info' ? '#06B6D4' : '#10B981',
                                fontSize: '13px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                animation: 'fadeIn 0.2s ease',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle2 size={16} />
                                    <span>{toastMessage.text}</span>
                                </div>
                                <button onClick={() => setToastMessage(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {/* Role selection bar */}
                        <div className="cs-card" style={{ padding: '18px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
                                <div>
                                    <div className="section-title">Select Role to Manage Page Access</div>
                                    <div className="section-subtitle">Click a role to view all accessible pages, grant new page access, remove access, or change access types</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {Object.entries(ROLE_METADATA).map(([key, meta]) => {
                                        const accCount = ALL_PAGE_ITEMS.filter(p => (roleAccessMap[key]?.[p.path]?.access ?? 'none') !== 'none').length;
                                        const isSelected = selectedRoleFilter === key;
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => { setSelectedRoleFilter(key); setPageFilter('accessible'); setSearchQuery(''); setAccessPage(1); }}
                                                style={{
                                                    padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                                    cursor: 'pointer', border: '1px solid',
                                                    background: isSelected ? `${meta.color}20` : 'transparent',
                                                    borderColor: isSelected ? meta.color : 'var(--cs-border)',
                                                    color: isSelected ? meta.color : 'var(--cs-text-muted)',
                                                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                                                }}
                                            >
                                                <Shield size={13} /> {meta.label}
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '2px 7px',
                                                    borderRadius: '10px',
                                                    background: isSelected ? meta.color : 'var(--cs-surface-2)',
                                                    color: isSelected ? '#FFFFFF' : 'var(--cs-text-secondary)',
                                                    fontWeight: 700
                                                }}>
                                                    {accCount}
                                                </span>
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => { setSelectedRoleFilter('all'); setMatrixPage(1); }}
                                        style={{
                                            padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                            cursor: 'pointer', border: '1px solid var(--cs-border)',
                                            background: selectedRoleFilter === 'all' ? 'rgba(108,99,255,0.15)' : 'transparent',
                                            borderColor: selectedRoleFilter === 'all' ? '#6C63FF' : 'var(--cs-border)',
                                            color: selectedRoleFilter === 'all' ? '#8B85FF' : 'var(--cs-text-muted)',
                                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
                                        }}
                                    >
                                        <Sliders size={13} /> All Roles Matrix
                                    </button>
                                </div>
                            </div>

                            {/* Role spotlight card (when a specific role is selected) */}
                            {selectedRoleFilter !== 'all' && (() => {
                                const meta = ROLE_METADATA[selectedRoleFilter];
                                return (
                                    <div style={{
                                        background: 'var(--cs-surface-2)',
                                        borderRadius: '12px',
                                        padding: '18px 22px',
                                        border: `1px solid ${meta.color}35`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: 40, height: 40, borderRadius: '10px',
                                                    background: `${meta.color}20`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: meta.color, flexShrink: 0
                                                }}>
                                                    <Shield size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--cs-text-primary)' }}>
                                                            {meta.label}
                                                        </span>
                                                        <span className={`badge ${meta.badge}`} style={{ fontSize: '11px', padding: '3px 8px' }}>
                                                            <MapPin size={11} style={{ marginRight: 3 }} /> {meta.scope}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                                                        {meta.description}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <button
                                                    className="btn-primary"
                                                    style={{ padding: '7px 15px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                    onClick={openGrantModal}
                                                    disabled={restrictedPages.length === 0}
                                                >
                                                    <Plus size={13} /> Grant Page Access
                                                </button>
                                                <button
                                                    className="btn-ghost"
                                                    style={{ padding: '7px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                    onClick={() => handleResetRole(selectedRoleFilter)}
                                                    title="Reset role to default permissions"
                                                >
                                                    <RotateCcw size={12} /> Reset Defaults
                                                </button>
                                            </div>
                                        </div>

                                        {/* Status chips */}
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--cs-border)', paddingTop: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'var(--cs-surface)', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--cs-border)' }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></span>
                                                <span style={{ color: 'var(--cs-text-muted)' }}>Accessible Pages:</span>
                                                <strong style={{ color: '#10B981' }}>{accessiblePages.length}</strong>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'var(--cs-surface)', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--cs-border)' }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94A3B8' }}></span>
                                                <span style={{ color: 'var(--cs-text-muted)' }}>Restricted Pages:</span>
                                                <strong style={{ color: 'var(--cs-text-muted)' }}>{restrictedPages.length}</strong>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'var(--cs-surface)', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--cs-border)' }}>
                                                <Users size={12} color="#6C63FF" />
                                                <span style={{ color: 'var(--cs-text-muted)' }}>Staff Assigned:</span>
                                                <strong style={{ color: '#6C63FF' }}>{staff?.filter(s => s.role === selectedRoleFilter).length ?? 0}</strong>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* SINGLE ROLE: PAGE ACCESS LIST & EDITOR */}
                        {selectedRoleFilter !== 'all' && (
                            <>
                                {/* Filter bar */}
                                <div className="cs-card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        <button
                                            className={`tab-trigger${pageFilter === 'accessible' ? ' active' : ''}`}
                                            onClick={() => { setPageFilter('accessible'); setAccessPage(1); }}
                                            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <CheckCircle2 size={13} color={pageFilter === 'accessible' ? '#10B981' : undefined} />
                                            Accessible Pages ({accessiblePages.length})
                                        </button>
                                        <button
                                            className={`tab-trigger${pageFilter === 'restricted' ? ' active' : ''}`}
                                            onClick={() => { setPageFilter('restricted'); setAccessPage(1); }}
                                            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <Lock size={13} />
                                            Restricted Pages ({restrictedPages.length})
                                        </button>
                                        <button
                                            className={`tab-trigger${pageFilter === 'all' ? ' active' : ''}`}
                                            onClick={() => { setPageFilter('all'); setAccessPage(1); }}
                                            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600 }}
                                        >
                                            All Pages ({ALL_PAGE_ITEMS.length})
                                        </button>
                                    </div>

                                    <div style={{ position: 'relative', width: '280px' }}>
                                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--cs-text-muted)' }} />
                                        <input
                                            className="cs-input"
                                            style={{ paddingLeft: '32px', fontSize: '12px' }}
                                            placeholder="Search pages or path..."
                                            value={searchQuery}
                                            onChange={e => { setSearchQuery(e.target.value); setAccessPage(1); }}
                                        />
                                        {searchQuery && (
                                            <button onClick={() => { setSearchQuery(''); setAccessPage(1); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--cs-text-muted)' }}>
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Accessible Pages Table */}
                                <div className="cs-card">
                                    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <div className="section-title">
                                                {pageFilter === 'accessible' ? `Accessible Pages for ${ROLE_METADATA[selectedRoleFilter]?.label}` : pageFilter === 'restricted' ? `Restricted Pages for ${ROLE_METADATA[selectedRoleFilter]?.label}` : `All Pages for ${ROLE_METADATA[selectedRoleFilter]?.label}`}
                                            </div>
                                            <div className="section-subtitle">
                                                Edit access level, toggle branch scope, or remove access for each page
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                            {displayedPages.length} {displayedPages.length === 1 ? 'page' : 'pages'} total
                                        </span>
                                    </div>

                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="cs-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '320px' }}>Page & Section</th>
                                                    <th style={{ width: '130px' }}>Current Access</th>
                                                    <th style={{ width: '210px' }}>Edit Access Type</th>
                                                    <th style={{ width: '160px' }}>Branch Scope</th>
                                                    <th style={{ width: '130px', textAlign: 'right' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {displayedPages.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--cs-text-muted)' }}>
                                                            {pageFilter === 'accessible'
                                                                ? `No accessible pages for this role. Click "+ Grant Page Access" above to give page access.`
                                                                : `No pages found matching the filter.`}
                                                        </td>
                                                    </tr>
                                                )}
                                                {paginatedDisplayedPages.map(p => (
                                                    <tr key={p.path}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cs-text-primary)' }}>
                                                                    {p.page}
                                                                </span>
                                                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'var(--cs-surface-2)', color: 'var(--cs-text-muted)', border: '1px solid var(--cs-border)' }}>
                                                                    {p.section}
                                                                </span>
                                                            </div>
                                                            <code style={{ fontSize: '11px', color: 'var(--cs-text-muted)', background: 'var(--cs-surface-2)', padding: '1px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '3px' }}>
                                                                {p.path}
                                                            </code>
                                                            <div style={{ fontSize: '11px', color: 'var(--cs-text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                                                                {p.description}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {p.access === 'full' && (
                                                                <span className="badge badge-success" style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    <CheckCircle2 size={12} /> Full Access
                                                                </span>
                                                            )}
                                                            {p.access === 'read' && (
                                                                <span className="badge badge-info" style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Eye size={12} /> View Only
                                                                </span>
                                                            )}
                                                            {p.access === 'none' && (
                                                                <span className="badge badge-secondary" style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', opacity: 0.7 }}>
                                                                    <Lock size={11} /> No Access
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="cs-input"
                                                                style={{ fontSize: '12px', padding: '6px 10px' }}
                                                                value={p.access}
                                                                onChange={e => handleUpdateAccess(selectedRoleFilter, p.path, e.target.value as AccessType)}
                                                            >
                                                                <option value="full">Full Access (Read & Write)</option>
                                                                <option value="read">View Only (Read-Only)</option>
                                                                <option value="none">No Access (Revoked)</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            {p.access !== 'none' ? (
                                                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={p.branchScoped}
                                                                        onChange={() => handleToggleBranchScoped(selectedRoleFilter, p.path)}
                                                                    />
                                                                    <span style={{ color: p.branchScoped ? '#10B981' : 'var(--cs-text-secondary)', fontWeight: p.branchScoped ? 600 : 400 }}>
                                                                        {p.branchScoped ? 'Branch Scoped' : 'All Branches'}
                                                                    </span>
                                                                </label>
                                                            ) : (
                                                                <span style={{ color: 'var(--cs-text-muted)', fontSize: '12px' }}>—</span>
                                                            )}
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            {p.access !== 'none' ? (
                                                                <button
                                                                    className="btn-secondary"
                                                                    style={{ padding: '5px 12px', fontSize: '12px', color: '#EF4444', borderColor: '#EF444440' }}
                                                                    onClick={() => handleRemoveAccess(selectedRoleFilter, p.path)}
                                                                    title="Revoke access for this page"
                                                                >
                                                                    <Trash2 size={12} style={{ marginRight: 4 }} /> Remove
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="btn-primary"
                                                                    style={{ padding: '5px 12px', fontSize: '12px' }}
                                                                    onClick={() => handleUpdateAccess(selectedRoleFilter, p.path, 'full')}
                                                                    title="Grant Full Access to this page"
                                                                >
                                                                    <Plus size={12} style={{ marginRight: 4 }} /> Grant
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <PaginationControls
                                        currentPage={safeAccessPage}
                                        totalItems={displayedPages.length}
                                        pageSize={accessPageSize}
                                        onPageChange={setAccessPage}
                                        onPageSizeChange={(newSize) => { setAccessPageSize(newSize); setAccessPage(1); }}
                                        pageSizeOptions={[5, 8, 16]}
                                        itemLabel="pages"
                                    />
                                </div>
                            </>
                        )}

                        {/* ALL ROLES MATRIX (WHEN 'ALL' IS SELECTED) */}
                        {selectedRoleFilter === 'all' && (
                            <div className="cs-card">
                                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--cs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                        <div className="section-title">All Roles & Page Access Matrix</div>
                                        <div className="section-subtitle">Click any role column or cell to inspect and customize its page permissions</div>
                                    </div>
                                    <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                        {ALL_PAGE_ITEMS.length} pages total
                                    </span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="cs-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '280px' }}>Page / Dashboard Section</th>
                                                {rolesToDisplay.map(r => (
                                                    <th
                                                        key={r}
                                                        style={{ textAlign: 'center', minWidth: '150px', cursor: 'pointer' }}
                                                        onClick={() => { setSelectedRoleFilter(r); setPageFilter('accessible'); setAccessPage(1); }}
                                                        title={`Click to inspect & edit ${ROLE_METADATA[r]?.label}`}
                                                    >
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                            <span className={`badge ${roleColors[r] ?? 'badge-secondary'}`} style={{ fontSize: '11px' }}>
                                                                {ROLE_METADATA[r]?.label ?? r}
                                                            </span>
                                                            <span style={{ fontSize: '10px', color: '#6C63FF', fontWeight: 600 }}>
                                                                Click to Edit →
                                                            </span>
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedMatrixItems.map((item, idx) => {
                                                const prevItem = paginatedMatrixItems[idx - 1];
                                                const showSectionHeader = !prevItem || prevItem.section !== item.section;
                                                return (
                                                    <Fragment key={item.path}>
                                                        {showSectionHeader && (
                                                            <tr style={{ background: 'var(--cs-surface-2)' }}>
                                                                <td colSpan={rolesToDisplay.length + 1} style={{ padding: '10px 24px', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--cs-text-muted)' }}>
                                                                    {item.section}
                                                                </td>
                                                            </tr>
                                                        )}
                                                        <tr>
                                                            <td>
                                                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cs-text-primary)' }}>
                                                                    {item.page}
                                                                </div>
                                                                <code style={{ fontSize: '11px', color: 'var(--cs-text-muted)', background: 'var(--cs-surface-2)', padding: '1px 6px', borderRadius: '4px' }}>
                                                                    {item.path}
                                                                </code>
                                                                <div style={{ fontSize: '11px', color: 'var(--cs-text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                                                                    {item.description}
                                                                </div>
                                                            </td>
                                                            {rolesToDisplay.map(r => {
                                                                const cfg = roleAccessMap[r]?.[item.path] ?? { access: item.permissions[r] ?? 'none', branchScoped: item.branchScopedFor?.includes(r) ?? false };
                                                                return (
                                                                    <td
                                                                        key={r}
                                                                        style={{ textAlign: 'center', verticalAlign: 'middle', cursor: 'pointer' }}
                                                                        onClick={() => { setSelectedRoleFilter(r); setPageFilter('accessible'); setAccessPage(1); }}
                                                                        title={`Click to edit access for ${ROLE_METADATA[r]?.label}`}
                                                                    >
                                                                        {cfg.access === 'full' && (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                                                <span className="badge badge-success" style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                                    <CheckCircle2 size={12} /> Full Access
                                                                                </span>
                                                                                {cfg.branchScoped && (
                                                                                    <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 600 }}>
                                                                                        (Branch Only)
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {cfg.access === 'read' && (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                                                <span className="badge badge-info" style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                                    <Eye size={12} /> View Only
                                                                                </span>
                                                                                {cfg.branchScoped && (
                                                                                    <span style={{ fontSize: '10px', color: '#06B6D4', fontWeight: 600 }}>
                                                                                        (Branch Only)
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {cfg.access === 'none' && (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                                                <span className="badge badge-secondary" style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', opacity: 0.7 }}>
                                                                                    <Lock size={11} /> No Access
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    </Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <PaginationControls
                                    currentPage={safeMatrixPage}
                                    totalItems={ALL_PAGE_ITEMS.length}
                                    pageSize={matrixPageSize}
                                    onPageChange={setMatrixPage}
                                    onPageSizeChange={(newSize) => { setMatrixPageSize(newSize); setMatrixPage(1); }}
                                    pageSizeOptions={[5, 8, 16]}
                                    itemLabel="pages"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Grant Page Access Modal */}
            {grantModalOpen && (
                <Modal title={`Grant Page Access — ${ROLE_METADATA[selectedRoleFilter]?.label ?? selectedRoleFilter}`} onClose={() => setGrantModalOpen(false)}>
                    <form onSubmit={submitGrantAccess} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label className="cs-label">Select Page</label>
                            <select
                                className="cs-input"
                                required
                                value={grantForm.path}
                                onChange={e => setGrantForm({ ...grantForm, path: e.target.value })}
                            >
                                <option value="">Choose a restricted page…</option>
                                {restrictedPages.map(p => (
                                    <option key={p.path} value={p.path}>
                                        {p.page} ({p.section}) — {p.path}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="cs-label">Type of Access</label>
                            <select
                                className="cs-input"
                                value={grantForm.access}
                                onChange={e => setGrantForm({ ...grantForm, access: e.target.value as AccessType })}
                            >
                                <option value="full">Full Access (Can view, create and modify records)</option>
                                <option value="read">View Only (Can read data without edit rights)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                                <input
                                    type="checkbox"
                                    checked={grantForm.branchScoped}
                                    onChange={e => setGrantForm({ ...grantForm, branchScoped: e.target.checked })}
                                />
                                <span>Branch Scoped (Restrict operations strictly to assigned campus branch)</span>
                            </label>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                            <button type="button" className="btn-secondary" onClick={() => setGrantModalOpen(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" disabled={!grantForm.path}>
                                Grant Access
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {accessOf && (
                <StaffAccessDialog member={accessOf} branches={branches ?? []} onClose={() => setAccessOf(null)}
                    onSaved={() => { setToastMessage({ text: `Access of ${accessOf.fullName} saved.`, type: 'success' }); setTimeout(() => setToastMessage(null), 4000); setAccessOf(null); reload(); }} />
            )}

            {adding && (
                <Modal
                    title="Add Academy User"
                    onClose={() => { setAdding(false); setPhoneError(''); setPhoneTouched(false); }}
                    maxWidth="580px"
                    style={{ overflow: 'visible' }}
                >
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="cs-label">Full Name</label>
                                <input className="cs-input" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Job Title</label>
                                <input className="cs-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Email (sign-in)</label>
                                <input className="cs-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="cs-label">Phone</label>
                                <CountryPhoneInput
                                    value={form.phone}
                                    selectedCountry={phoneCountry}
                                    onCountryChange={country => {
                                        setPhoneCountry(country);
                                        if (phoneTouched && form.phone) {
                                            setPhoneError(validatePhoneNumber(form.phone, country, false));
                                        }
                                    }}
                                    onChange={(val: string, country: CountryOption) => {
                                        setForm(f => ({ ...f, phone: val }));
                                        setPhoneCountry(country);
                                        if (phoneTouched) {
                                            setPhoneError(validatePhoneNumber(val, country, false));
                                        }
                                    }}
                                    onBlur={() => {
                                        setPhoneTouched(true);
                                        if (form.phone) {
                                            setPhoneError(validatePhoneNumber(form.phone, phoneCountry, false));
                                        }
                                    }}
                                    touched={phoneTouched}
                                    error={phoneError}
                                    placeholder="e.g. 9840012345"
                                />
                            </div>
                            <div>
                                <label className="cs-label">Role</label>
                                <select className="cs-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    {Object.keys(ROLE_HELP).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="cs-label">Branch</label>
                                <select className="cs-input" value={form.branchId} required={form.role === 'BranchManager'}
                                    onChange={e => setForm({ ...form, branchId: e.target.value, assignments: NO_ASSIGNMENTS })}>
                                    <option value="">{!branches && !branchError ? 'Loading branches…' : form.role === 'BranchManager' ? 'Select a branch' : 'All branches'}</option>
                                    {branches?.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                                </select>
                                {!branches && branchError && (
                                    <p role="alert" style={{ color: 'var(--cs-danger)', fontSize: '11px', marginTop: '3px' }}>
                                        Branches could not be loaded.{' '}
                                        <button type="button" className="btn-ghost" style={{ padding: 0, fontSize: '11px', color: 'var(--cs-primary)' }} onClick={reloadBranches}>Try again</button>
                                    </p>
                                )}
                            </div>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>{ROLE_HELP[form.role]}</div>
                        {form.role === 'Staff' && <StaffAccessFields branchId={form.branchId} value={form.assignments} onChange={assignments => setForm(f => ({ ...f, assignments }))} />}
                        <div>
                            <label className="cs-label">Temporary Password (min. 8 characters)</label>
                            <input className="cs-input" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                        </div>
                        <button className="btn-primary" type="submit" disabled={busy || !branches} style={{ alignSelf: 'flex-end' }}>
                            {busy ? 'Creating…' : 'Create User'}
                        </button>
                    </form>
                </Modal>
            )}
        </>
    );
}