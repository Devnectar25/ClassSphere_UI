'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Bell, Search, Plus, ChevronDown, LogOut, User, ShieldCheck, Menu,
    CheckCircle2, XCircle, ExternalLink, Megaphone, Info, AlertTriangle, Calendar
} from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { SIDEBAR_TOGGLE_EVENT } from '@/components/Sidebar';
import { initials, useApi, formatDate } from '@/lib/api';
import { ROLE_LABELS, can, clearSession, useSession } from '@/lib/session';
import Modal from '@/components/Modal';

interface TopbarProps {
    title: string;
    subtitle?: string;
    action?: { label: string; onClick: () => void; disabled?: boolean; hint?: string };
}

const ALL_PAGES = [
    { name: 'Dashboard', path: '/dashboard', permission: 'reports.read', group: 'Core' },
    { name: 'Branches', path: '/dashboard/branches', permission: 'staff.read', group: 'Core' },
    { name: 'Courses', path: '/dashboard/courses', permission: 'academics.read', group: 'Core' },
    { name: 'Batches & Schedule', path: '/dashboard/batches', permission: 'academics.read', group: 'Core' },
    { name: 'Students', path: '/dashboard/students', permission: 'students.read', group: 'Core' },
    { name: 'Guardians', path: '/dashboard/guardians', permission: 'guardians.read', group: 'Core' },
    { name: 'Fees & Plans', path: '/dashboard/fees', permission: 'billing.read', group: 'Finance' },
    { name: 'Invoices & Dues', path: '/dashboard/invoices', permission: 'billing.read', group: 'Finance' },
    { name: 'Payments & Receipts', path: '/dashboard/payments', permission: 'billing.read', group: 'Finance' },
    { name: 'Attendance', path: '/dashboard/attendance', permission: 'academics.read', group: 'Academic' },
    { name: 'Tests & Results', path: '/dashboard/tests', permission: 'academics.read', group: 'Academic' },
    { name: 'Notices & Events', path: '/dashboard/notices', permission: 'academics.read', group: 'Academic' },
    { name: 'Achievements', path: '/dashboard/achievements', permission: 'academics.read', group: 'Academic' },
    { name: 'Parent Portal', path: '/portal', permission: 'portal.read', group: 'Academic' },
    { name: 'Users & Roles', path: '/dashboard/staff', permission: 'staff.read', group: 'Administration' },
    { name: 'Reports', path: '/dashboard/reports', permission: 'reports.read', group: 'Administration' },
    { name: 'Settings', path: '/dashboard/settings', permission: 'settings.write', group: 'Administration' },
];

export default function Topbar({ title, subtitle, action }: TopbarProps) {
    const router = useRouter();
    const { workspace } = useWorkspace();
    const session = useSession();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showPagesModal, setShowPagesModal] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const [readIds, setReadIds] = useState<string[]>([]);

    const { data: noticesData } = useApi<Array<{
        noticeId?: string;
        notice_id?: string;
        title: string;
        content: string;
        noticeType?: string;
        notice_type?: string;
        status: string;
        priority?: string;
        publishedAt?: string;
        published_at?: string;
    }>>('/notices');

    useEffect(() => {
        try {
            const stored = localStorage.getItem('classsphere_read_notifs');
            if (stored) setReadIds(JSON.parse(stored));
        } catch {}
    }, []);

    const rawNotices = (noticesData || []).filter(n => n.status !== 'draft');
    const unreadCount = rawNotices.filter(n => {
        const id = n.noticeId || n.notice_id || n.title;
        return !readIds.includes(id);
    }).length;

    const handleMarkAllAsRead = () => {
        const allIds = rawNotices.map(n => n.noticeId || n.notice_id || n.title);
        setReadIds(allIds);
        try {
            localStorage.setItem('classsphere_read_notifs', JSON.stringify(allIds));
        } catch {}
    };

    const handleOpenNotice = (n: typeof rawNotices[0]) => {
        const id = n.noticeId || n.notice_id || n.title;
        if (!readIds.includes(id)) {
            const next = [...readIds, id];
            setReadIds(next);
            try {
                localStorage.setItem('classsphere_read_notifs', JSON.stringify(next));
            } catch {}
        }
        setNotifOpen(false);
        router.push('/dashboard/notices');
    };

    const userName = session?.user.fullName ?? '';
    const userEmail = session?.user.email ?? '';
    const userRole = session?.session.role ?? '';
    const branchView = session?.session.branchId ?? session?.selectedBranchId;
    const scope = branchView ? workspace?.branches.find(b => b.branchId === branchView)?.name : 'All branches';
    const roleLabel = ROLE_LABELS[userRole] ?? userRole;
    const actorLabel = [roleLabel, scope].filter(Boolean).join(' • ');

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (dropdownRef.current && !dropdownRef.current.contains(target)) {
                setDropdownOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(target)) {
                setNotifOpen(false);
            }
        }
        if (dropdownOpen || notifOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownOpen, notifOpen]);

    const handleLogout = () => {
        setDropdownOpen(false);
        clearSession();
        router.replace('/login');
    };

    const handleOpenProfile = () => {
        setDropdownOpen(false);
        setShowProfileModal(true);
    };

    const handleOpenPagesAccess = () => {
        setDropdownOpen(false);
        setShowPagesModal(true);
    };

    return (
        <>
            <style>{TOPBAR_CSS}</style>
            <header className="cs-topbar" style={{
                height: '64px',
                gap: '16px',
                borderBottom: '1px solid var(--cs-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(20px)',
                position: 'sticky',
                top: 0,
                zIndex: 9,
            }}>
                <button
                    type="button"
                    className="cs-topbar-menu"
                    aria-label="Open menu"
                    onClick={() => window.dispatchEvent(new Event(SIDEBAR_TOGGLE_EVENT))}
                >
                    <Menu size={20} />
                </button>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <h1 className="cs-topbar-title" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px', fontWeight: 800, color: 'var(--cs-text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
                    {subtitle && <p style={{ fontSize: '13px', color: 'var(--cs-text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</p>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    {/* Search */}
                    <div className="cs-topbar-search" style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)',
                        borderRadius: '10px', padding: '0 16px', width: '400px', height: '40px',
                        boxSizing: 'border-box'
                    }}>
                        <Search size={16} color="var(--cs-text-muted)" />
                        <input
                            placeholder="Search anything..."
                            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--cs-text-primary)', fontSize: '13px', width: '100%', fontFamily: 'inherit' }}
                        />
                    </div>

                    {/* Notifications */}
                    <div ref={notifRef} style={{ position: 'relative' }}>
                        <button
                            type="button"
                            className="cs-topbar-bell"
                            onClick={() => {
                                setNotifOpen(prev => !prev);
                                setDropdownOpen(false);
                            }}
                            title="Notifications & Notices"
                            aria-label="Notifications"
                            style={{
                                width: 40, height: 40, borderRadius: '10px',
                                background: notifOpen ? 'var(--cs-surface-3, #f1f5f9)' : 'var(--cs-surface-2)',
                                border: '1px solid var(--cs-border)',
                                cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: notifOpen ? 'var(--cs-primary)' : 'var(--cs-text-secondary)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: '#EF4444',
                                        border: '2px solid #ffffff',
                                    }}
                                />
                            )}
                        </button>

                        {/* Notifications Dropdown Panel */}
                        {notifOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                right: 0,
                                width: '360px',
                                background: '#ffffff',
                                border: '1px solid var(--cs-border)',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                                zIndex: 100,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                            }}>
                                {/* Header */}
                                <div style={{
                                    padding: '12px 16px',
                                    borderBottom: '1px solid var(--cs-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'var(--cs-surface-2)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--cs-text-primary)' }}>
                                            Notifications
                                        </span>
                                        {unreadCount > 0 ? (
                                            <span className="badge badge-primary" style={{ fontSize: '11px', padding: '1px 6px' }}>
                                                {unreadCount} new
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>
                                                All caught up
                                            </span>
                                        )}
                                    </div>
                                    {unreadCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleMarkAllAsRead}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                fontSize: '11.5px', color: 'var(--cs-primary)', fontWeight: 600, padding: 0
                                            }}
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </div>

                                {/* Notification items list */}
                                <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                    {rawNotices.length === 0 ? (
                                        <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--cs-text-muted)' }}>
                                            <Bell size={28} style={{ opacity: 0.35, marginBottom: '6px' }} />
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>No notifications yet</div>
                                            <div style={{ fontSize: '11.5px', marginTop: '2px' }}>You will receive notice broadcasts, announcements, and fee alerts here.</div>
                                        </div>
                                    ) : (
                                        rawNotices.slice(0, 6).map(n => {
                                            const id = n.noticeId || n.notice_id || n.title;
                                            const isUnread = !readIds.includes(id);
                                            const type = (n.noticeType || n.notice_type || 'notice').toLowerCase();
                                            const IconComp = type === 'alert' ? AlertTriangle : type === 'event' ? Calendar : type === 'announcement' ? Megaphone : Bell;
                                            const iconColor = type === 'alert' ? '#EF4444' : type === 'event' ? '#10B981' : type === 'announcement' ? '#6C63FF' : '#06B6D4';

                                            return (
                                                <div
                                                    key={id}
                                                    onClick={() => handleOpenNotice(n)}
                                                    style={{
                                                        padding: '12px 16px',
                                                        borderBottom: '1px solid var(--cs-border)',
                                                        cursor: 'pointer',
                                                        background: isUnread ? 'rgba(108, 99, 255, 0.04)' : '#ffffff',
                                                        display: 'flex',
                                                        gap: '12px',
                                                        alignItems: 'flex-start',
                                                        transition: 'background 0.15s ease'
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cs-surface-2, #f8fafc)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = isUnread ? 'rgba(108, 99, 255, 0.04)' : '#ffffff')}
                                                >
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: '8px',
                                                        background: `${iconColor}18`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0, marginTop: '2px', color: iconColor
                                                    }}>
                                                        <IconComp size={15} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                            <span style={{
                                                                fontSize: '12.5px', fontWeight: isUnread ? 700 : 600,
                                                                color: 'var(--cs-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                            }}>
                                                                {n.title}
                                                            </span>
                                                            {isUnread && (
                                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cs-primary)', flexShrink: 0 }} />
                                                            )}
                                                        </div>
                                                        <p style={{
                                                            fontSize: '11.5px', color: 'var(--cs-text-muted)', margin: '3px 0 0',
                                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                                        }}>
                                                            {n.content}
                                                        </p>
                                                        <div style={{ fontSize: '10.5px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>
                                                            {formatDate(n.publishedAt || n.published_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Footer link to all notices */}
                                <div style={{
                                    padding: '10px 14px',
                                    borderTop: '1px solid var(--cs-border)',
                                    background: 'var(--cs-surface-2)',
                                    textAlign: 'center'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNotifOpen(false);
                                            router.push('/dashboard/notices');
                                        }}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            fontSize: '12px', fontWeight: 600, color: 'var(--cs-primary)',
                                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                                        }}
                                    >
                                        View All Notices & Events ➔
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action button */}
                    {action && (
                        <button className="btn-primary" onClick={action.onClick} disabled={action.disabled} title={action.hint} style={{ whiteSpace: 'nowrap' }}>
                            <Plus size={16} />
                            <span className="cs-topbar-action-label">{action.label}</span>
                        </button>
                    )}

                    {/* User profile with dropdown */}
                    <div ref={dropdownRef} style={{ position: 'relative' }}>
                        <div
                            onClick={() => setDropdownOpen(prev => !prev)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                background: dropdownOpen ? 'var(--cs-surface-3, #f1f5f9)' : 'var(--cs-surface-2)',
                                border: '1px solid var(--cs-border)',
                                borderRadius: '10px', padding: '6px 12px', cursor: 'pointer',
                                transition: 'all 0.2s',
                                userSelect: 'none'
                            }}
                        >
                            <div className="avatar-placeholder" style={{ width: 30, height: 30, fontSize: '12px' }}>{initials(userName)}</div>
                            <div className="cs-topbar-usertext" style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>{userName}</span>
                                <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', whiteSpace: 'nowrap' }}>{actorLabel}</span>
                            </div>
                            <ChevronDown
                                size={14}
                                color="var(--cs-text-muted)"
                                style={{
                                    transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease'
                                }}
                            />
                        </div>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                right: 0,
                                width: '220px',
                                background: '#ffffff',
                                border: '1px solid var(--cs-border)',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                                padding: '6px',
                                zIndex: 100,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px'
                            }}>
                                {/* User summary info */}
                                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--cs-border)', marginBottom: '4px' }}>
                                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cs-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {userName}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {userEmail}
                                    </div>
                                </div>

                                {/* 1) Logout */}
                                <button
                                    onClick={handleLogout}
                                    className="dropdown-item"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '9px 12px', borderRadius: '8px', border: 'none', background: 'none',
                                        width: '100%', textAlign: 'left', fontSize: '13px', fontWeight: 500,
                                        color: '#EF4444', cursor: 'pointer', transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                >
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>

                                {/* 2) Profile */}
                                <button
                                    onClick={handleOpenProfile}
                                    className="dropdown-item"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '9px 12px', borderRadius: '8px', border: 'none', background: 'none',
                                        width: '100%', textAlign: 'left', fontSize: '13px', fontWeight: 500,
                                        color: 'var(--cs-text-primary)', cursor: 'pointer', transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cs-surface-2, #f8fafc)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                >
                                    <User size={16} color="var(--cs-text-secondary)" />
                                    <span>Profile</span>
                                </button>

                                {/* 3) Pages access */}
                                <button
                                    onClick={handleOpenPagesAccess}
                                    className="dropdown-item"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '9px 12px', borderRadius: '8px', border: 'none', background: 'none',
                                        width: '100%', textAlign: 'left', fontSize: '13px', fontWeight: 500,
                                        color: 'var(--cs-text-primary)', cursor: 'pointer', transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cs-surface-2, #f8fafc)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                >
                                    <ShieldCheck size={16} color="var(--cs-text-secondary)" />
                                    <span>Pages access</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Profile Modal */}
            {showProfileModal && (
                <Modal title="User Profile" onClose={() => setShowProfileModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Header card with avatar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--cs-surface-2, #f8fafc)', borderRadius: '12px', border: '1px solid var(--cs-border)' }}>
                            <div className="avatar-placeholder" style={{ width: 56, height: 56, fontSize: '20px', fontWeight: 700 }}>
                                {initials(userName)}
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>{userName}</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--cs-text-muted)' }}>{userEmail}</p>
                                <span className="badge badge-success" style={{ marginTop: '6px', display: 'inline-block' }}>
                                    {roleLabel}
                                </span>
                            </div>
                        </div>

                        {/* Details grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ padding: '12px', border: '1px solid var(--cs-border)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Academy</div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cs-text-primary)', marginTop: '4px' }}>
                                    {workspace?.organization.name || 'Apex Music & Arts'}
                                </div>
                            </div>
                            <div style={{ padding: '12px', border: '1px solid var(--cs-border)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Branch Scope</div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cs-text-primary)', marginTop: '4px' }}>
                                    {scope}
                                </div>
                            </div>
                            <div style={{ padding: '12px', border: '1px solid var(--cs-border)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Role</div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cs-text-primary)', marginTop: '4px' }}>
                                    {roleLabel}
                                </div>
                            </div>
                            <div style={{ padding: '12px', border: '1px solid var(--cs-border)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Timezone</div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cs-text-primary)', marginTop: '4px' }}>
                                    {workspace?.organization.timezone || 'Asia/Kolkata'}
                                </div>
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--cs-border)' }}>
                            <button
                                className="btn-ghost"
                                onClick={() => {
                                    setShowProfileModal(false);
                                    handleLogout();
                                }}
                                style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                            >
                                <LogOut size={15} /> Sign out
                            </button>
                            <Link
                                href="/dashboard/settings"
                                onClick={() => setShowProfileModal(false)}
                                className="btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                            >
                                Academy Settings <ExternalLink size={14} />
                            </Link>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Pages Access Modal */}
            {showPagesModal && (
                <Modal title="Pages Access & Permissions" onClose={() => setShowPagesModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ padding: '10px 14px', background: 'var(--cs-surface-2, #f8fafc)', borderRadius: '10px', border: '1px solid var(--cs-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>Signed in as: </span>
                                <strong style={{ fontSize: '13px', color: 'var(--cs-text-primary)' }}>{userName}</strong>
                                <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}> ({roleLabel})</span>
                            </div>
                            <span className="badge badge-info">{scope}</span>
                        </div>

                        <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                            {ALL_PAGES.map(page => {
                                const hasAccess = can(session, page.permission);
                                return (
                                    <div
                                        key={page.path}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--cs-border)',
                                            background: hasAccess ? '#ffffff' : 'rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {hasAccess ? (
                                                <CheckCircle2 size={16} color="#10B981" />
                                            ) : (
                                                <XCircle size={16} color="#94A3B8" />
                                            )}
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: hasAccess ? 'var(--cs-text-primary)' : 'var(--cs-text-muted)' }}>
                                                    {page.name}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>
                                                    {page.group} • <code>{page.path}</code>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className={`badge ${hasAccess ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '11px' }}>
                                                {hasAccess ? 'Authorized' : 'Restricted'}
                                            </span>
                                            {hasAccess && (
                                                <Link
                                                    href={page.path}
                                                    onClick={() => setShowPagesModal(false)}
                                                    className="btn-ghost"
                                                    style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    Open <ExternalLink size={12} />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}

const TOPBAR_CSS = `
.cs-topbar-menu { display: none; width: 40px; height: 40px; flex-shrink: 0; border-radius: 10px; border: 1px solid var(--cs-border); background: var(--cs-surface-2); color: var(--cs-text-primary); align-items: center; justify-content: center; cursor: pointer; }
.cs-topbar-menu:focus-visible { outline: 2px solid #4F46E5; outline-offset: 2px; }
@media (max-width: 1280px) { .cs-topbar-search { width: 260px !important; } }
@media (max-width: 1023px) {
  .cs-topbar-menu { display: inline-flex; }
  .cs-topbar { gap: 10px !important; padding: 0 14px !important; }
  .cs-topbar-search { display: none !important; }
}
@media (max-width: 767px) {
  .cs-topbar-usertext { display: none !important; }
  .cs-topbar-title { font-size: 16px !important; }
}
@media (max-width: 480px) {
  .cs-topbar { padding: 0 10px !important; }
  .cs-topbar-bell { display: none !important; }
  .cs-topbar-action-label { display: none; }
}
`;
