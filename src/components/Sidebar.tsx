'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, Users, GraduationCap, BookOpen, Calendar,
    CreditCard, Receipt, ClipboardList, Bell, Trophy, BarChart3,
    Settings, LogOut, ChevronLeft, ChevronRight, Building2,
    Shield, ShieldCheck, UserCog, FileCheck, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { can, clearSession, homePath, saveSession, useSession, type SessionState } from '@/lib/session';
import { useWorkspace } from '@/lib/workspace';

const navGroups = [
    {
        label: 'Core',
        items: [
            { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: 'reports.read' },
            { href: '/dashboard/students', icon: GraduationCap, label: 'Students', permission: 'students.read' },
            { href: '/dashboard/guardians', icon: Users, label: 'Guardians', permission: 'guardians.read' },
        ]
    },
    {
        label: 'Academic',
        items: [
            { href: '/dashboard/courses', icon: BookOpen, label: 'Courses', permission: 'academics.read' },
            { href: '/dashboard/batches', icon: Calendar, label: 'Batches & Schedule', permission: 'academics.read' },
            { href: '/dashboard/attendance', icon: ClipboardList, label: 'Attendance', permission: 'academics.read' },
            { href: '/dashboard/tests', icon: FileCheck, label: 'Tests & Results', permission: 'academics.read' },
        ]
    },
    {
        label: 'Finance',
        items: [
            { href: '/dashboard/fees', icon: CreditCard, label: 'Fees & Plans', permission: 'billing.read' },
            { href: '/dashboard/invoices', icon: Receipt, label: 'Invoices & Dues', permission: 'billing.read' },
        ]
    },
    {
        label: 'Communication',
        items: [
            { href: '/dashboard/notices', icon: Bell, label: 'Notices & Events', permission: 'academics.read' },
            { href: '/dashboard/achievements', icon: Trophy, label: 'Achievements', permission: 'academics.read' },
        ]
    },
    {
        label: 'Administration',
        items: [
            { href: '/dashboard/branches', icon: Building2, label: 'Branches', permission: 'staff.read' },
            { href: '/dashboard/staff', icon: UserCog, label: 'Users & Roles', permission: 'staff.read' },
            { href: '/dashboard/reports', icon: BarChart3, label: 'Reports', permission: 'reports.read' },
            { href: '/dashboard/settings', icon: Settings, label: 'Settings', permission: 'settings.write' },
        ]
    },
];

/** Event the Topbar's menu button dispatches to open the sidebar drawer on small screens. */
export const SIDEBAR_TOGGLE_EVENT = 'cs:toggle-sidebar';

export default function Sidebar() {
    const [collapsedPref, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();
    // The drawer always shows full labels, whatever the desktop collapse preference
    const collapsed = collapsedPref && !mobileOpen;

    useEffect(() => {
        const toggle = () => setMobileOpen(o => !o);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
        window.addEventListener(SIDEBAR_TOGGLE_EVENT, toggle);
        window.addEventListener('keydown', onKey);
        return () => { window.removeEventListener(SIDEBAR_TOGGLE_EVENT, toggle); window.removeEventListener('keydown', onKey); };
    }, []);

    const router = useRouter();
    const session = useSession();
    const { workspace } = useWorkspace();
    const logoUrl = workspace?.organization.branding.logoUrl;
    const branchScoped = !!session?.session.branchId;

    const switchAcademy = async (tenantId: string | null) => {
        const next = await api<SessionState>('/auth/switch', { method: 'POST', body: JSON.stringify({ tenantId }) });
        saveSession({ ...next, selectedBranchId: null });
        router.push(homePath(next));
    };

    const signOut = () => {
        clearSession();
        router.replace('/login');
    };

    const academies = session?.memberships.filter(m => m.role !== 'Guardian') ?? [];

    return (
        <>
        <style>{SIDEBAR_CSS}</style>
        {mobileOpen && <div className="cs-sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
        <aside className={`cs-sidebar${mobileOpen ? ' is-open' : ''}`} style={{
            width: collapsed ? '72px' : '232px',
            minHeight: '100vh',
            background: 'var(--cs-surface)',
            borderRight: '1px solid var(--cs-border)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s ease',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 10,
        }}>
            {/* Academy identity */}
            <div style={{
                padding: '20px 16px',
                borderBottom: '1px solid var(--cs-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                minHeight: '72px'
            }}>
                {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- tenant logo is a data URL
                    <img src={logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: '12px', objectFit: 'contain', flexShrink: 0, background: 'white' }} />
                ) : (
                    <div style={{
                        width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                        background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(108,99,255,0.4)'
                    }}>
                        <Shield size={20} color="white" />
                    </div>
                )}
                {!collapsed && (
                    <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '15px', color: 'var(--cs-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {session?.session.tenantName ?? <>Class<span className="gradient-text">Sphere</span></>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', whiteSpace: 'nowrap' }}>
                            {workspace?.organization.academyType ? `${workspace.organization.academyType} Academy` : 'Management Platform'}
                        </div>
                    </div>
                )}
                <button type="button" className="cs-sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                    <X size={18} />
                </button>
            </div>

            {/* Academy & branch context (the branch view is chosen on the Branches page) */}
            {!collapsed && session && (academies.length > 1 || session.user.isPlatformAdmin || branchScoped) && (
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--cs-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(academies.length > 1 || session.user.isPlatformAdmin) && (
                        <select className="cs-input" style={{ fontSize: '12px', padding: '6px 8px' }} aria-label="Academy"
                            value={session.session.tenantId ?? ''} onChange={e => switchAcademy(e.target.value || null)}>
                            {academies.map(m => <option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}
                            {session.user.isPlatformAdmin && !academies.some(m => m.tenantId === session.session.tenantId) && session.session.tenantId && (
                                <option value={session.session.tenantId}>{session.session.tenantName}</option>
                            )}
                            {session.user.isPlatformAdmin && <option value="">← Platform console</option>}
                        </select>
                    )}
                    {branchScoped && (
                        <div style={{ fontSize: '12px', color: 'var(--cs-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={13} /> {workspace?.branches.find(b => b.branchId === session.session.branchId)?.name ?? 'Your branch'}
                        </div>
                    )}
                </div>
            )}

            {/* Nav */}
            <nav className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 10px' }}>
                {navGroups.map(group => {
                    const items = group.items.filter(item => can(session, item.permission));
                    if (items.length === 0) return null;
                    return (
                        <div key={group.label} style={{ marginBottom: '8px' }}>
                            {!collapsed && (
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 8px', marginTop: '8px' }}>
                                    {group.label}
                                </div>
                            )}
                            {items.map(item => {
                                const active = pathname === item.href;
                                return (
                                    <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} style={{ textDecoration: 'none' }}>
                                        <div className={`sidebar-link${active ? ' active' : ''}`} style={collapsed ? { justifyContent: 'center', padding: '12px' } : {}}>
                                            <item.icon size={18} style={{ flexShrink: 0 }} />
                                            {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>

            {/* Bottom */}
            <div style={{ borderTop: '1px solid var(--cs-border)', padding: '12px 10px' }}>
                {session?.user.isPlatformAdmin && (
                    <Link href="/admin" onClick={() => setMobileOpen(false)} style={{ textDecoration: 'none' }}>
                        <div className="sidebar-link" style={collapsed ? { justifyContent: 'center', padding: '12px' } : {}}>
                            <ShieldCheck size={18} />
                            {!collapsed && <span>Platform Admin</span>}
                        </div>
                    </Link>
                )}
                <button onClick={signOut} className="sidebar-link" style={{ width: '100%', border: 'none', background: 'none', ...(collapsed ? { justifyContent: 'center', padding: '12px' } : {}) }}>
                    <LogOut size={18} />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>

            {/* Collapse toggle */}
            <button
                className="cs-sidebar-collapse"
                onClick={() => setCollapsed(!collapsedPref)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                style={{
                    position: 'absolute',
                    right: '-14px',
                    top: '80px',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--cs-surface-2)',
                    border: '1px solid var(--cs-border-strong)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--cs-text-secondary)',
                    transition: 'all 0.2s',
                    zIndex: 11,
                }}
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </aside>
        </>
    );
}

const SIDEBAR_CSS = `
.cs-sidebar-close { display: none; }
@media (max-width: 1023px) {
  .cs-sidebar {
    position: fixed !important; top: 0; left: 0; bottom: 0; height: 100dvh; min-height: 0 !important;
    width: min(280px, 86vw) !important; z-index: 70 !important;
    transform: translateX(-100%); transition: transform 0.28s ease !important;
    box-shadow: 0 0 0 rgba(0,0,0,0);
  }
  .cs-sidebar.is-open { transform: translateX(0); box-shadow: 0 24px 60px -12px rgba(15,23,42,0.45); }
  .cs-sidebar-collapse { display: none !important; }
  .cs-sidebar-close {
    display: inline-flex; margin-left: auto; width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px;
    border: 1px solid var(--cs-border); background: var(--cs-surface-2); color: var(--cs-text-secondary);
    align-items: center; justify-content: center; cursor: pointer;
  }
  .cs-sidebar-backdrop { position: fixed; inset: 0; z-index: 69; background: rgba(15,23,42,0.45); backdrop-filter: blur(2px); }
}
@media (prefers-reduced-motion: reduce) {
  .cs-sidebar { transition: none !important; }
}
`;
