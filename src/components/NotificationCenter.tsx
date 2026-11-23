'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell, CheckCheck, CheckCircle2, AlertTriangle, AlertCircle,
    Megaphone, Info, Calendar, CreditCard, GraduationCap,
    ClipboardList, ExternalLink, X, Clock, RefreshCw, FileText, ChevronRight
} from 'lucide-react';
import { api, formatMoney } from '@/lib/api';
import { useSession } from '@/lib/session';
import Modal from '@/components/Modal';

export interface AcademicNotification {
    id: string;
    type: 'alert' | 'notice' | 'announcement' | 'event' | 'payment' | 'student' | 'attendance' | 'system';
    title: string;
    message: string;
    timestamp: string;
    priority?: 'urgent' | 'high' | 'normal' | 'low';
    isRead: boolean;
    link?: string;
    category: 'notices' | 'activity' | 'system';
    author?: string | null;
    branch?: string | null;
    rawNotice?: {
        noticeId: string;
        title: string;
        content: string;
        noticeType: string;
        status: string;
        priority: string;
        targetAudience: string;
        publishedAt: string;
        authorName: string | null;
        branchName: string | null;
    };
}

interface NoticeApiItem {
    noticeId: string;
    title: string;
    content: string;
    noticeType: string;
    status: string;
    priority: string;
    targetAudience: string;
    channels?: string[];
    branchName?: string;
    authorName?: string | null;
    publishedAt: string;
    expiresAt?: string | null;
    isPinned?: boolean;
}

interface DashboardReportData {
    stats?: {
        revenueThisMonth?: number;
        overdueCount?: number;
        activeStudents?: number;
        classesToday?: number;
    };
    recentActivity?: Array<{
        action: string;
        entityType: string;
        details: Record<string, string | number> | null;
        createdAt: string;
    }>;
    upcoming?: Array<{
        eventId: string;
        title: string;
        eventType: string;
        startsAt: string;
    }>;
}

function timeAgo(dateString: string): string {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Recently';
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 60) return 'Just now';
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
        return 'Recently';
    }
}

export default function NotificationCenter() {
    const router = useRouter();
    const session = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'notices' | 'activity'>('all');
    const [notifications, setNotifications] = useState<AcademicNotification[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState<AcademicNotification | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const userId = session?.user?.userId || 'default_user';
    const storageKey = `cs_academic_read_notifications_${userId}`;

    // Load read IDs from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setReadIds(new Set(parsed));
                }
            }
        } catch {}
    }, [storageKey]);

    // Save read IDs to localStorage
    const saveReadIds = useCallback((newSet: Set<string>) => {
        setReadIds(newSet);
        try {
            localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
        } catch {}
    }, [storageKey]);

    // Fetch notices & activity
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        const items: AcademicNotification[] = [];

        try {
            // 1. Fetch official notices
            const notices = await api<NoticeApiItem[]>('/notices').catch(() => [] as NoticeApiItem[]);
            if (Array.isArray(notices)) {
                notices.forEach(n => {
                    if (n.status === 'draft') return; // Do not show drafts
                    let type: AcademicNotification['type'] = 'notice';
                    if (n.noticeType === 'alert' || n.priority === 'urgent') type = 'alert';
                    else if (n.noticeType === 'announcement') type = 'announcement';
                    else if (n.noticeType === 'event') type = 'event';

                    items.push({
                        id: `notice-${n.noticeId}`,
                        type,
                        title: n.title,
                        message: n.content,
                        timestamp: n.publishedAt || new Date().toISOString(),
                        priority: (n.priority as AcademicNotification['priority']) || 'normal',
                        isRead: false,
                        link: '/dashboard/notices',
                        category: 'notices',
                        author: n.authorName,
                        branch: n.branchName,
                        rawNotice: {
                            noticeId: n.noticeId,
                            title: n.title,
                            content: n.content,
                            noticeType: n.noticeType,
                            status: n.status,
                            priority: n.priority,
                            targetAudience: n.targetAudience,
                            publishedAt: n.publishedAt,
                            authorName: n.authorName || null,
                            branchName: n.branchName || null,
                        }
                    });
                });
            }
        } catch {}

        try {
            // 2. Fetch recent activity from dashboard
            const dashboardData = await api<DashboardReportData>('/reports?type=dashboard').catch(() => null);
            if (dashboardData?.recentActivity && Array.isArray(dashboardData.recentActivity)) {
                dashboardData.recentActivity.slice(0, 15).forEach((act, idx) => {
                    const d = act.details || {};
                    let type: AcademicNotification['type'] = 'system';
                    let title = 'Activity logged';
                    let message = `${act.action} on ${act.entityType}`;
                    let link = '/dashboard';
                    let priority: AcademicNotification['priority'] = 'normal';

                    if (act.action.startsWith('billing.payment')) {
                        type = 'payment';
                        const amountStr = d.amount ? formatMoney(Number(d.amount)) : 'Fee payment';
                        title = 'Payment Received';
                        message = `Payment of ${amountStr} received${d.method ? ` via ${d.method}` : ''}.`;
                        link = '/dashboard/payments';
                    } else if (act.action.startsWith('billing.invoice')) {
                        type = 'payment';
                        title = 'Fee Invoice Cycle';
                        message = `Invoice cycle generated: ${d.invoices ?? 0} invoices.`;
                        link = '/dashboard/invoices';
                    } else if (act.action.startsWith('student.')) {
                        type = 'student';
                        title = 'New Student Enrolled';
                        message = `${d.name ?? 'Student'} enrolled successfully (${d.enrollmentNo ?? 'Admitted'}).`;
                        link = '/dashboard/students';
                    } else if (act.action.startsWith('attendance.')) {
                        type = 'attendance';
                        title = 'Attendance Recorded';
                        message = `Daily attendance roll call saved (${d.count ? `${d.count} records` : (d.date ?? 'Today')}).`;
                        link = '/dashboard/attendance';
                    } else if (act.action.startsWith('notice.')) {
                        type = 'announcement';
                        title = 'Notice Circular';
                        message = `Notice "${d.title ?? 'Circular'}" was ${act.action.split('.')[1] || 'published'}.`;
                        link = '/dashboard/notices';
                    }

                    items.push({
                        id: `act-${act.createdAt}-${idx}`,
                        type,
                        title,
                        message,
                        timestamp: act.createdAt || new Date().toISOString(),
                        priority,
                        isRead: false,
                        link,
                        category: 'activity'
                    });
                });
            }

            // 3. If there are overdue invoices alert
            if (dashboardData?.stats?.overdueCount && dashboardData.stats.overdueCount > 0) {
                items.push({
                    id: 'alert-overdue-invoices',
                    type: 'alert',
                    title: 'Overdue Fee Collections',
                    message: `${dashboardData.stats.overdueCount} student invoices require attention or payment collection.`,
                    timestamp: new Date().toISOString(),
                    priority: 'high',
                    isRead: false,
                    link: '/dashboard/invoices',
                    category: 'activity'
                });
            }
        } catch {}

        // 4. Default starter notifications if system has no items yet
        if (items.length === 0) {
            items.push(
                {
                    id: 'sys-welcome',
                    type: 'system',
                    title: 'Welcome to ClassSphere Academy Panel',
                    message: 'Your academy management workspace is active. Manage branches, courses, batches, and student records with ease.',
                    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                    priority: 'normal',
                    isRead: false,
                    link: '/dashboard',
                    category: 'system'
                },
                {
                    id: 'sys-academic-calendar',
                    type: 'announcement',
                    title: 'Academic Session Active',
                    message: 'Attendance register and class schedule tracking are ready for daily operation.',
                    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
                    priority: 'normal',
                    isRead: false,
                    link: '/dashboard/batches',
                    category: 'notices'
                },
                {
                    id: 'sys-fee-rules',
                    type: 'notice',
                    title: 'Fee Plans & Invoicing Ready',
                    message: 'Create and assign fee structures to student batches to streamline automatic fee dues.',
                    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
                    priority: 'normal',
                    isRead: false,
                    link: '/dashboard/fees',
                    category: 'notices'
                }
            );
        }

        // Sort items by priority (urgent/high first) and timestamp desc
        items.sort((a, b) => {
            const prioWeight: Record<string, number> = { urgent: 3, high: 2, normal: 1, low: 0 };
            const pDiff = (prioWeight[b.priority || 'normal'] || 0) - (prioWeight[a.priority || 'normal'] || 0);
            if (pDiff !== 0) return pDiff;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        setNotifications(items);
        setLoading(false);
    }, []);

    // Initial load and periodic refresh
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Close on outside click or Escape
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Computed notifications with isRead resolved
    const enrichedNotifications = useMemo(() => {
        return notifications.map(item => ({
            ...item,
            isRead: readIds.has(item.id)
        }));
    }, [notifications, readIds]);

    const unreadCount = useMemo(() => {
        return enrichedNotifications.filter(n => !n.isRead).length;
    }, [enrichedNotifications]);

    const filteredNotifications = useMemo(() => {
        if (activeTab === 'all') return enrichedNotifications;
        if (activeTab === 'notices') return enrichedNotifications.filter(n => n.category === 'notices' || n.type === 'alert' || n.type === 'announcement' || n.type === 'notice' || n.type === 'event');
        if (activeTab === 'activity') return enrichedNotifications.filter(n => n.category === 'activity' || n.type === 'payment' || n.type === 'student' || n.type === 'attendance');
        return enrichedNotifications;
    }, [enrichedNotifications, activeTab]);

    // Actions
    const markAllAsRead = useCallback(() => {
        const newSet = new Set(readIds);
        notifications.forEach(n => newSet.add(n.id));
        saveReadIds(newSet);
    }, [notifications, readIds, saveReadIds]);

    const handleNotificationClick = useCallback((notif: AcademicNotification) => {
        // Mark as read
        const newSet = new Set(readIds);
        newSet.add(notif.id);
        saveReadIds(newSet);

        // If it is a full notice, open the details modal
        if (notif.rawNotice) {
            setSelectedNotice(notif);
            setIsOpen(false);
            return;
        }

        // Navigate to link if provided
        if (notif.link) {
            setIsOpen(false);
            router.push(notif.link);
        }
    }, [readIds, saveReadIds, router]);

    const markSingleAsRead = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newSet = new Set(readIds);
        newSet.add(id);
        saveReadIds(newSet);
    }, [readIds, saveReadIds]);

    // Get Icon for notification type
    const getNotificationIcon = (type: AcademicNotification['type'], priority?: string) => {
        if (priority === 'urgent' || type === 'alert') {
            return {
                icon: AlertTriangle,
                bg: '#FEE2E2',
                color: '#DC2626',
                border: '#FCA5A5'
            };
        }
        switch (type) {
            case 'announcement':
                return { icon: Megaphone, bg: 'rgba(108, 99, 255, 0.12)', color: '#6C63FF', border: 'rgba(108, 99, 255, 0.25)' };
            case 'notice':
                return { icon: Info, bg: '#E0F2FE', color: '#0284C7', border: '#BAE6FD' };
            case 'event':
                return { icon: Calendar, bg: '#DCFCE7', color: '#16A34A', border: '#86EFAC' };
            case 'payment':
                return { icon: CreditCard, bg: '#DCFCE7', color: '#059669', border: '#86EFAC' };
            case 'student':
                return { icon: GraduationCap, bg: '#EDE9FE', color: '#7C3AED', border: '#DDD6FE' };
            case 'attendance':
                return { icon: ClipboardList, bg: '#E0E7FF', color: '#4F46E5', border: '#C7D2FE' };
            default:
                return { icon: Bell, bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
        }
    };

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            {/* The Bell Icon Button */}
            <button
                type="button"
                className="cs-topbar-bell"
                aria-label={`Notifications (${unreadCount} unread)`}
                aria-expanded={isOpen}
                onClick={() => setIsOpen(prev => !prev)}
                title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    background: isOpen ? 'var(--cs-surface-3, #f1f5f9)' : 'var(--cs-surface-2)',
                    border: isOpen ? '1px solid #6C63FF' : '1px solid var(--cs-border)',
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isOpen ? '#6C63FF' : 'var(--cs-text-secondary)',
                    transition: 'all 0.2s ease',
                    boxShadow: isOpen ? '0 0 0 3px rgba(108, 99, 255, 0.15)' : 'none'
                }}
            >
                <Bell size={18} />

                {/* Unread notification count badge */}
                {unreadCount > 0 && (
                    <span
                        style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            background: '#EF4444',
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: 700,
                            minWidth: '18px',
                            height: '18px',
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 4px',
                            border: '2px solid #FFFFFF',
                            lineHeight: 1,
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.35)',
                            pointerEvents: 'none'
                        }}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Popover Dropdown */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 10px)',
                        right: 0,
                        width: '390px',
                        maxWidth: '92vw',
                        background: '#FFFFFF',
                        border: '1px solid var(--cs-border)',
                        borderRadius: '14px',
                        boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.12), 0 6px 12px -2px rgba(0, 0, 0, 0.05)',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        animation: 'csDropdownFadeIn 0.15s ease-out'
                    }}
                >
                    {/* Popover Header */}
                    <div
                        style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid var(--cs-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--cs-surface-2, #F8FAFC)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bell size={16} color="#6C63FF" />
                            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--cs-text-primary)' }}>
                                Notifications
                            </span>
                            {unreadCount > 0 ? (
                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: '#EF4444',
                                        padding: '2px 8px',
                                        borderRadius: '999px'
                                    }}
                                >
                                    {unreadCount} new
                                </span>
                            ) : (
                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        color: '#10B981',
                                        padding: '2px 8px',
                                        borderRadius: '999px'
                                    }}
                                >
                                    All read
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={markAllAsRead}
                                    title="Mark all as read"
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#6C63FF',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108, 99, 255, 0.08)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                >
                                    <CheckCheck size={14} />
                                    <span>Mark all read</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={fetchNotifications}
                                title="Refresh notifications"
                                aria-label="Refresh notifications"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--cs-text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div
                        style={{
                            display: 'flex',
                            gap: '4px',
                            padding: '8px 12px',
                            background: '#FFFFFF',
                            borderBottom: '1px solid var(--cs-border)'
                        }}
                    >
                        {(['all', 'notices', 'activity'] as const).map(tabKey => {
                            const isActive = activeTab === tabKey;
                            const label = tabKey === 'all' ? 'All' : tabKey === 'notices' ? 'Notices' : 'Activity';
                            return (
                                <button
                                    key={tabKey}
                                    type="button"
                                    onClick={() => setActiveTab(tabKey)}
                                    style={{
                                        flex: 1,
                                        padding: '6px 10px',
                                        fontSize: '12px',
                                        fontWeight: isActive ? 700 : 500,
                                        color: isActive ? '#6C63FF' : 'var(--cs-text-muted)',
                                        background: isActive ? 'rgba(108, 99, 255, 0.08)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Notification Items List */}
                    <div
                        style={{
                            maxHeight: '380px',
                            overflowY: 'auto',
                            padding: '4px 0'
                        }}
                    >
                        {filteredNotifications.length === 0 ? (
                            <div
                                style={{
                                    padding: '36px 20px',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <div
                                    style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%',
                                        background: 'rgba(108, 99, 255, 0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#6C63FF'
                                    }}
                                >
                                    <CheckCircle2 size={22} />
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>
                                    All caught up!
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', maxWidth: '240px' }}>
                                    No {activeTab !== 'all' ? activeTab : ''} notifications to show right now.
                                </div>
                            </div>
                        ) : (
                            filteredNotifications.map(item => {
                                const { icon: ItemIcon, bg, color, border } = getNotificationIcon(item.type, item.priority);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleNotificationClick(item)}
                                        style={{
                                            padding: '12px 16px',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '12px',
                                            borderBottom: '1px solid rgba(0,0,0,0.04)',
                                            background: item.isRead ? '#FFFFFF' : 'rgba(108, 99, 255, 0.03)',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = item.isRead
                                                ? 'var(--cs-surface-2, #F8FAFC)'
                                                : 'rgba(108, 99, 255, 0.07)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = item.isRead
                                                ? '#FFFFFF'
                                                : 'rgba(108, 99, 255, 0.03)';
                                        }}
                                    >
                                        {/* Icon Badge */}
                                        <div
                                            style={{
                                                width: '34px',
                                                height: '34px',
                                                borderRadius: '9px',
                                                background: bg,
                                                color,
                                                border: `1px solid ${border}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                marginTop: '2px'
                                            }}
                                        >
                                            <ItemIcon size={16} />
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                <div
                                                    style={{
                                                        fontSize: '13px',
                                                        fontWeight: item.isRead ? 600 : 700,
                                                        color: item.isRead ? 'var(--cs-text-primary)' : '#1E1B4B',
                                                        lineHeight: 1.3,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {item.title}
                                                </div>

                                                {/* Unread indicator dot */}
                                                {!item.isRead && (
                                                    <span
                                                        style={{
                                                            width: '7px',
                                                            height: '7px',
                                                            borderRadius: '50%',
                                                            background: '#6C63FF',
                                                            flexShrink: 0
                                                        }}
                                                    />
                                                )}
                                            </div>

                                            {/* Preview text */}
                                            <div
                                                style={{
                                                    fontSize: '12px',
                                                    color: 'var(--cs-text-muted)',
                                                    marginTop: '3px',
                                                    lineHeight: 1.4,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {item.message}
                                            </div>

                                            {/* Meta tags */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    marginTop: '6px',
                                                    fontSize: '11px',
                                                    color: 'var(--cs-text-muted)'
                                                }}
                                            >
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <Clock size={11} /> {timeAgo(item.timestamp)}
                                                </span>
                                                {item.priority === 'urgent' && (
                                                    <span
                                                        style={{
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            color: '#EF4444',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            padding: '1px 5px',
                                                            borderRadius: '4px'
                                                        }}
                                                    >
                                                        Urgent
                                                    </span>
                                                )}
                                                {item.priority === 'high' && (
                                                    <span
                                                        style={{
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            color: '#F59E0B',
                                                            background: 'rgba(245, 158, 11, 0.1)',
                                                            padding: '1px 5px',
                                                            borderRadius: '4px'
                                                        }}
                                                    >
                                                        High
                                                    </span>
                                                )}
                                                {item.branch && (
                                                    <span style={{ fontSize: '10px', color: 'var(--cs-text-muted)' }}>
                                                        • {item.branch}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Optional quick mark as read button */}
                                        {!item.isRead && (
                                            <button
                                                type="button"
                                                onClick={e => markSingleAsRead(e, item.id)}
                                                title="Mark as read"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--cs-text-muted)',
                                                    cursor: 'pointer',
                                                    padding: '2px',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <CheckCheck size={13} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Popover Footer */}
                    <div
                        style={{
                            padding: '10px 16px',
                            borderTop: '1px solid var(--cs-border)',
                            background: 'var(--cs-surface-2, #F8FAFC)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                router.push('/dashboard/notices');
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#6C63FF',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            View All Notices & Circulars <ExternalLink size={12} />
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--cs-text-muted)',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Notice Details Modal (so users can read circulars without losing page context) */}
            {selectedNotice && selectedNotice.rawNotice && (
                <Modal
                    title="Notice & Circular"
                    onClose={() => setSelectedNotice(null)}
                    maxWidth="550px"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Notice Header Banner */}
                        <div
                            style={{
                                padding: '14px 16px',
                                background: 'var(--cs-surface-2, #F8FAFC)',
                                borderRadius: '10px',
                                border: '1px solid var(--cs-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span
                                    className={`badge ${
                                        selectedNotice.priority === 'urgent'
                                            ? 'badge-error'
                                            : selectedNotice.priority === 'high'
                                            ? 'badge-warning'
                                            : 'badge-info'
                                    }`}
                                    style={{ fontSize: '11px', textTransform: 'capitalize' }}
                                >
                                    {selectedNotice.priority || 'Normal'}
                                </span>
                                <span className="badge badge-secondary" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                                    {selectedNotice.rawNotice.noticeType}
                                </span>
                                {selectedNotice.rawNotice.branchName && (
                                    <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                        Branch: <strong>{selectedNotice.rawNotice.branchName}</strong>
                                    </span>
                                )}
                            </div>

                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    color: 'var(--cs-text-primary)'
                                }}
                            >
                                {selectedNotice.title}
                            </h3>

                            <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span>Published: {new Date(selectedNotice.rawNotice.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                {selectedNotice.rawNotice.authorName && <span>By: {selectedNotice.rawNotice.authorName}</span>}
                            </div>
                        </div>

                        {/* Notice Body */}
                        <div
                            style={{
                                padding: '14px',
                                fontSize: '13px',
                                color: 'var(--cs-text-primary)',
                                lineHeight: 1.6,
                                whiteSpace: 'pre-wrap',
                                background: '#FFFFFF',
                                borderRadius: '8px',
                                border: '1px solid var(--cs-border)',
                                minHeight: '100px',
                                maxHeight: '280px',
                                overflowY: 'auto'
                            }}
                        >
                            {selectedNotice.rawNotice.content}
                        </div>

                        {/* Modal Footer */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: '8px',
                                borderTop: '1px solid var(--cs-border)'
                            }}
                        >
                            <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => setSelectedNotice(null)}
                            >
                                Close
                            </button>

                            <button
                                type="button"
                                className="btn-primary"
                                onClick={() => {
                                    setSelectedNotice(null);
                                    router.push('/dashboard/notices');
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                Go to Notices Management <ExternalLink size={14} />
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
