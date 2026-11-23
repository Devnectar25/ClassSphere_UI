'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Bell, Mail, MessageSquare, Smartphone, Send, Edit3,
    CheckCircle2, XCircle, AlertCircle, RefreshCw, Eye, Shield, Tag,
    Search, Filter, Calendar, Clock, Megaphone, RotateCcw, Copy, Check,
    AlertTriangle, Play, PauseCircle, ChevronRight, User, ExternalLink
} from 'lucide-react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';
import Pagination from '@/components/Pagination';

// --- Data Interfaces ---

interface NotificationTemplate {
    templateId: string;
    title: string;
    channel: string;
    subject: string | null;
    content: string;
    isActive: boolean;
    isSystem: boolean;
    updatedAt: string;
}

interface DeliveryRecord {
    notificationId: string;
    recipientName: string;
    recipientEmail: string;
    recipientPhone: string;
    notificationEvent: string;
    rawEventType: string;
    channel: string;
    subject: string | null;
    body: string;
    sentDate: string;
    deliveredDate: string | null;
    status: 'delivered' | 'pending' | 'failed';
    failureReason: string | null;
    attemptCount: number;
    payload?: any;
}

interface DeliveriesResponse {
    total: number;
    counts: {
        all: number;
        delivered: number;
        pending: number;
        failed: number;
    };
    records: DeliveryRecord[];
}

interface FailedRecord {
    notificationId: string;
    recipientName: string;
    recipientEmail: string;
    recipientPhone: string;
    notificationType: string;
    rawEventType: string;
    channel: string;
    subject: string | null;
    body: string;
    sentDate: string;
    lastAttemptDate: string;
    attemptCount: number;
    status: string;
    failureReason: string | null;
}

interface FailedResponse {
    total: number;
    records: FailedRecord[];
}

interface Announcement {
    announcementId: string;
    title: string;
    message: string;
    targetAudience: 'all_learners' | 'all_academy_owners' | 'all_academy_staff' | 'selected_groups';
    startDate: string | null;
    expiryDate: string | null;
    status: 'published' | 'scheduled' | 'expired' | 'draft' | 'deactivated';
    createdAt: string;
    updatedAt: string;
}

interface AnnouncementsResponse {
    total: number;
    announcements: Announcement[];
}

type TabKey = 'templates' | 'deliveries' | 'failed' | 'announcements';

const DYNAMIC_VARIABLES = [
    { key: '{{studentName}}', desc: 'Full student/learner name' },
    { key: '{{academyName}}', desc: 'Name of the academy' },
    { key: '{{courseName}}', desc: 'Title of the course' },
    { key: '{{amount}}', desc: 'Fee or transaction amount (₹)' },
    { key: '{{paymentDeadline}}', desc: 'Payment expiry deadline' },
    { key: '{{batchName}}', desc: 'Assigned batch label' },
    { key: '{{registrationId}}', desc: 'Unique registration code' },
    { key: '{{refundId}}', desc: 'Refund claim reference' },
    { key: '{{payoutId}}', desc: 'Disbursement payout ID' },
    { key: '{{reason}}', desc: 'Decision / rejection reason' },
];

export default function PlatformAdminNotificationsPage() {
    // Current Active Tab
    const [activeTab, setActiveTab] = useState<TabKey>('templates');
    const [refreshKey, setRefreshKey] = useState(0);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Copy indicator state
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // -------------------------------------------------------------
    // SECTION 1: TEMPLATES STATE & ACTIONS
    // -------------------------------------------------------------
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templateChannelFilter, setTemplateChannelFilter] = useState('');
    const [templateSearch, setTemplateSearch] = useState('');

    // Template Modals
    const [viewingTemplate, setViewingTemplate] = useState<NotificationTemplate | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
    const [editSubject, setEditSubject] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editChannel, setEditChannel] = useState('email');
    const [editActive, setEditActive] = useState(true);
    const [savingTemplate, setSavingTemplate] = useState(false);

    const templateForm = useFormValidation(
        { subject: editSubject, content: editContent, channel: editChannel },
        {
            subject: [
                rules.when(editChannel === 'email', rules.required('Email Subject')),
                rules.maxLength('Email Subject', 200),
            ],
            content: [
                rules.required('Notification Body'),
                rules.minLength('Notification Body', 10),
                rules.maxLength('Notification Body', 5000),
                (value) => {
                    const s = String(value);
                    const opens = (s.match(/\{\{/g) || []).length;
                    const closes = (s.match(/\}\}/g) || []).length;
                    if (opens !== closes) return 'Every {{variable}} must be opened with {{ and closed with }}.';
                    if (/\{\{\s*\}\}/.test(s)) return 'Variable placeholders cannot be empty.';
                    return undefined;
                },
            ],
            channel: [rules.required('Notification Channel')],
        }
    );

    const fetchTemplates = async () => {
        try {
            setTemplatesLoading(true);
            const res = await api<NotificationTemplate[]>('/platform/notifications?type=templates');
            setTemplates(res || []);
        } catch (err: any) {
            showToast(err?.message || 'Failed to load notification templates', 'error');
        } finally {
            setTemplatesLoading(false);
        }
    };

    const handleOpenEditTemplate = (t: NotificationTemplate) => {
        setEditingTemplate(t);
        setEditSubject(t.subject || '');
        setEditContent(t.content || '');
        setEditChannel(t.channel || 'email');
        setEditActive(Boolean(t.isActive));
        templateForm.reset();
    };

    const handleInsertVariable = (variableKey: string) => {
        setEditContent((prev) => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + variableKey + ' ');
    };

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate) return;
        if (!templateForm.validate()) return;

        try {
            setSavingTemplate(true);
            await api('/platform/notifications', {
                method: 'PUT',
                body: JSON.stringify({
                    templateId: editingTemplate.templateId,
                    subject: editSubject.trim() || null,
                    content: editContent.trim(),
                    channel: editChannel,
                    isActive: editActive,
                }),
            });
            showToast(`Template "${editingTemplate.title || editingTemplate.templateId}" updated successfully`);
            setEditingTemplate(null);
            fetchTemplates();
        } catch (err: any) {
            showToast(err?.message || 'Failed to update template', 'error');
        } finally {
            setSavingTemplate(false);
        }
    };

    const filteredTemplates = useMemo(() => {
        return templates.filter((t) => {
            if (templateChannelFilter && t.channel.toLowerCase() !== templateChannelFilter.toLowerCase()) {
                return false;
            }
            if (!templateSearch.trim()) return true;
            const q = templateSearch.toLowerCase();
            return (
                t.title.toLowerCase().includes(q) ||
                t.templateId.toLowerCase().includes(q) ||
                (t.subject && t.subject.toLowerCase().includes(q)) ||
                t.content.toLowerCase().includes(q)
            );
        });
    }, [templates, templateChannelFilter, templateSearch]);

    // -------------------------------------------------------------
    // SECTION 2: DELIVERY HISTORY STATE & ACTIONS
    // -------------------------------------------------------------
    const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
    const [deliveriesTotal, setDeliveriesTotal] = useState(0);
    const [deliveryCounts, setDeliveryCounts] = useState({ all: 0, delivered: 0, pending: 0, failed: 0 });
    const [deliveriesLoading, setDeliveriesLoading] = useState(false);
    const [deliveryPage, setDeliveryPage] = useState(1);
    const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('');
    const [deliveryChannelFilter, setDeliveryChannelFilter] = useState('');
    const [deliverySearch, setDeliverySearch] = useState('');
    const [deliveryFromDate, setDeliveryFromDate] = useState('');
    const [deliveryToDate, setDeliveryToDate] = useState('');
    const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRecord | null>(null);

    const fetchDeliveries = async () => {
        try {
            setDeliveriesLoading(true);
            const params = new URLSearchParams({
                type: 'deliveries',
                limit: '10',
                offset: String((deliveryPage - 1) * 10),
            });
            if (deliveryStatusFilter) params.set('status', deliveryStatusFilter);
            if (deliveryChannelFilter) params.set('channel', deliveryChannelFilter);
            if (deliverySearch.trim()) params.set('q', deliverySearch.trim());
            if (deliveryFromDate) params.set('from', deliveryFromDate);
            if (deliveryToDate) params.set('to', deliveryToDate);

            const res = await api<DeliveriesResponse>(`/platform/notifications?${params.toString()}`);
            setDeliveries(res.records || []);
            setDeliveriesTotal(res.total || 0);
            if (res.counts) setDeliveryCounts(res.counts);
        } catch (err: any) {
            showToast(err?.message || 'Failed to load delivery history', 'error');
        } finally {
            setDeliveriesLoading(false);
        }
    };

    // -------------------------------------------------------------
    // SECTION 3: FAILED NOTIFICATIONS STATE & ACTIONS
    // -------------------------------------------------------------
    const [failedList, setFailedList] = useState<FailedRecord[]>([]);
    const [failedTotal, setFailedTotal] = useState(0);
    const [failedLoading, setFailedLoading] = useState(false);
    const [failedPage, setFailedPage] = useState(1);
    const [retryingId, setRetryingId] = useState<string | null>(null);

    const fetchFailedNotifications = async () => {
        try {
            setFailedLoading(true);
            const params = new URLSearchParams({
                type: 'failed',
                limit: '10',
                offset: String((failedPage - 1) * 10),
            });
            const res = await api<FailedResponse>(`/platform/notifications?${params.toString()}`);
            setFailedList(res.records || []);
            setFailedTotal(res.total || 0);
        } catch (err: any) {
            showToast(err?.message || 'Failed to load failed notifications', 'error');
        } finally {
            setFailedLoading(false);
        }
    };

    const handleRetryNotification = async (notificationId: string) => {
        try {
            setRetryingId(notificationId);
            const res: any = await api('/platform/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'retry',
                    messageId: notificationId,
                }),
            });

            if (res?.alreadyDelivered) {
                showToast('Notification was already delivered. No duplicate sent.', 'error');
            } else {
                showToast(`Notification #${notificationId.slice(0, 8)} successfully re-queued for delivery.`);
            }
            fetchFailedNotifications();
            if (activeTab === 'deliveries') fetchDeliveries();
        } catch (err: any) {
            showToast(err?.message || 'Failed to retry notification delivery', 'error');
        } finally {
            setRetryingId(null);
        }
    };

    // -------------------------------------------------------------
    // SECTION 4: ANNOUNCEMENTS STATE & ACTIONS
    // -------------------------------------------------------------
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [announcementsTotal, setAnnouncementsTotal] = useState(0);
    const [announcementsLoading, setAnnouncementsLoading] = useState(false);
    const [announcementsPage, setAnnouncementsPage] = useState(1);
    const [announcementTargetFilter, setAnnouncementTargetFilter] = useState('');
    const [announcementStatusFilter, setAnnouncementStatusFilter] = useState('');

    // Modal state for Announcement
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementMessage, setAnnouncementMessage] = useState('');
    const [announcementTarget, setAnnouncementTarget] = useState<'all_learners' | 'all_academy_owners' | 'all_academy_staff' | 'selected_groups'>('all_learners');
    const [announcementStartDate, setAnnouncementStartDate] = useState('');
    const [announcementExpiryDate, setAnnouncementExpiryDate] = useState('');
    const [announcementStatus, setAnnouncementStatus] = useState<'published' | 'scheduled' | 'draft' | 'deactivated'>('published');
    const [savingAnnouncement, setSavingAnnouncement] = useState(false);

    const announcementForm = useFormValidation(
        { title: announcementTitle, message: announcementMessage },
        {
            title: [rules.required('Announcement Title'), rules.minLength('Announcement Title', 5), rules.maxLength('Announcement Title', 120)],
            message: [rules.required('Announcement Content'), rules.minLength('Announcement Content', 10), rules.maxLength('Announcement Content', 2000)],
        }
    );

    const fetchAnnouncements = async () => {
        try {
            setAnnouncementsLoading(true);
            const params = new URLSearchParams({
                type: 'announcements',
                limit: '10',
                offset: String((announcementsPage - 1) * 10),
            });
            if (announcementTargetFilter) params.set('target', announcementTargetFilter);
            if (announcementStatusFilter) params.set('status', announcementStatusFilter);

            const res = await api<AnnouncementsResponse>(`/platform/notifications?${params.toString()}`);
            setAnnouncements(res.announcements || []);
            setAnnouncementsTotal(res.total || 0);
        } catch (err: any) {
            showToast(err?.message || 'Failed to load platform announcements', 'error');
        } finally {
            setAnnouncementsLoading(false);
        }
    };

    const handleOpenCreateAnnouncement = () => {
        setEditingAnnouncement(null);
        setAnnouncementTitle('');
        setAnnouncementMessage('');
        setAnnouncementTarget('all_learners');
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setAnnouncementStartDate(now.toISOString().slice(0, 16));
        setAnnouncementExpiryDate('');
        setAnnouncementStatus('published');
        announcementForm.reset();
        setIsAnnouncementModalOpen(true);
    };

    const handleOpenEditAnnouncement = (a: Announcement) => {
        setEditingAnnouncement(a);
        setAnnouncementTitle(a.title);
        setAnnouncementMessage(a.message);
        setAnnouncementTarget(a.targetAudience);
        if (a.startDate) {
            const sd = new Date(a.startDate);
            sd.setMinutes(sd.getMinutes() - sd.getTimezoneOffset());
            setAnnouncementStartDate(sd.toISOString().slice(0, 16));
        } else {
            setAnnouncementStartDate('');
        }
        if (a.expiryDate) {
            const ed = new Date(a.expiryDate);
            ed.setMinutes(ed.getMinutes() - ed.getTimezoneOffset());
            setAnnouncementExpiryDate(ed.toISOString().slice(0, 16));
        } else {
            setAnnouncementExpiryDate('');
        }
        setAnnouncementStatus(a.status === 'expired' ? 'published' : (a.status as any));
        announcementForm.reset();
        setIsAnnouncementModalOpen(true);
    };

    const handleSaveAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!announcementForm.validate()) return;

        try {
            setSavingAnnouncement(true);
            await api('/platform/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'upsert_announcement',
                    announcementId: editingAnnouncement?.announcementId || null,
                    title: announcementTitle.trim(),
                    message: announcementMessage.trim(),
                    targetAudience: announcementTarget,
                    startDate: announcementStartDate ? new Date(announcementStartDate).toISOString() : null,
                    expiryDate: announcementExpiryDate ? new Date(announcementExpiryDate).toISOString() : null,
                    status: announcementStatus,
                }),
            });
            showToast(editingAnnouncement ? 'Announcement updated successfully' : 'New announcement published');
            setIsAnnouncementModalOpen(false);
            fetchAnnouncements();
        } catch (err: any) {
            showToast(err?.message || 'Failed to save announcement', 'error');
        } finally {
            setSavingAnnouncement(false);
        }
    };

    const handleAnnouncementAction = async (announcementId: string, subAction: 'publish' | 'schedule' | 'deactivate' | 'delete') => {
        try {
            await api('/platform/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'announcement_action',
                    announcementId,
                    subAction,
                }),
            });
            showToast(`Announcement marked as ${subAction}`);
            fetchAnnouncements();
        } catch (err: any) {
            showToast(err?.message || `Failed to update announcement to ${subAction}`, 'error');
        }
    };

    // Load data depending on active tab or refresh
    useEffect(() => {
        if (activeTab === 'templates') fetchTemplates();
        if (activeTab === 'deliveries') fetchDeliveries();
        if (activeTab === 'failed') fetchFailedNotifications();
        if (activeTab === 'announcements') fetchAnnouncements();
    }, [activeTab, refreshKey]);

    useEffect(() => {
        if (activeTab === 'deliveries') fetchDeliveries();
    }, [deliveryPage, deliveryStatusFilter, deliveryChannelFilter]);

    useEffect(() => {
        if (activeTab === 'failed') fetchFailedNotifications();
    }, [failedPage]);

    useEffect(() => {
        if (activeTab === 'announcements') fetchAnnouncements();
    }, [announcementsPage, announcementTargetFilter, announcementStatusFilter]);

    // Helpers
    const getChannelIcon = (channel: string) => {
        switch (channel?.toLowerCase()) {
            case 'email':
                return <Mail className="w-3.5 h-3.5 text-indigo-600" />;
            case 'sms':
                return <Smartphone className="w-3.5 h-3.5 text-emerald-600" />;
            case 'in_app':
            case 'in-app':
                return <Bell className="w-3.5 h-3.5 text-amber-600" />;
            case 'whatsapp':
                return <MessageSquare className="w-3.5 h-3.5 text-teal-600" />;
            default:
                return <Bell className="w-3.5 h-3.5 text-purple-600" />;
        }
    };

    const getChannelBadge = (channel: string) => {
        const ch = (channel || 'email').toLowerCase();
        let bg = 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
        let label = 'Email';

        if (ch === 'sms') {
            bg = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
            label = 'SMS';
        } else if (ch === 'in_app' || ch === 'in-app') {
            bg = 'bg-amber-50 text-amber-700 border-amber-200/60';
            label = 'In-App';
        } else if (ch === 'whatsapp') {
            bg = 'bg-teal-50 text-teal-700 border-teal-200/60';
            label = 'WhatsApp';
        }

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${bg}`}>
                {getChannelIcon(ch)}
                {label}
            </span>
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'delivered':
            case 'published':
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                );
            case 'pending':
            case 'scheduled':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                        <Clock className="w-3 h-3 text-amber-500" />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                );
            case 'failed':
            case 'deactivated':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                        <XCircle className="w-3 h-3 text-rose-500" />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                );
            case 'draft':
            case 'inactive':
            case 'expired':
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Inactive'}
                    </span>
                );
        }
    };

    const getAudienceBadge = (audience: string) => {
        switch (audience) {
            case 'all_learners':
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">All Learners</span>;
            case 'all_academy_owners':
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">All Academy Owners</span>;
            case 'all_academy_staff':
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">All Academy Staff</span>;
            case 'selected_groups':
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">Selected User Groups</span>;
            default:
                return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">{audience}</span>;
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6">
            {/* Floating Toast Notification */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-[10000] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
                        toast.type === 'success'
                            ? 'bg-white border-emerald-200 text-emerald-800'
                            : 'bg-white border-rose-200 text-rose-800'
                    }`}
                >
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200/80">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications Management</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Monitor automated delivery pipelines, edit event templates, inspect delivery failures, and publish platform announcements.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    {activeTab === 'announcements' && (
                        <button
                            onClick={handleOpenCreateAnnouncement}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors"
                        >
                            <Megaphone className="w-4 h-4" />
                            Create Announcement
                        </button>
                    )}
                    <button
                        onClick={() => setRefreshKey((k) => k + 1)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${templatesLoading || deliveriesLoading || failedLoading || announcementsLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* 4 Subsections Tabs Navigation */}
            <div className="flex border-b border-slate-200 gap-2 overflow-x-auto no-scrollbar">
                {[
                    { key: 'templates', label: 'Notification Templates', icon: Mail, count: templates.length },
                    { key: 'deliveries', label: 'Delivery History', icon: Send, count: deliveryCounts.all || deliveriesTotal },
                    { key: 'failed', label: 'Failed Notifications', icon: AlertTriangle, count: failedTotal, highlight: failedTotal > 0 },
                    { key: 'announcements', label: 'Announcements', icon: Megaphone, count: announcementsTotal },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as TabKey)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                                isActive
                                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                            }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                        tab.highlight
                                            ? 'bg-rose-100 text-rose-700'
                                            : isActive
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ========================================================================= */}
            {/* SUBSECTION 1: NOTIFICATION TEMPLATES                                      */}
            {/* ========================================================================= */}
            {activeTab === 'templates' && (
                <div className="space-y-4">
                    {/* Filter & Search Bar */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg w-full md:w-auto flex-wrap">
                            {[
                                { key: '', label: 'All Channels' },
                                { key: 'email', label: 'Email' },
                                { key: 'sms', label: 'SMS' },
                                { key: 'in_app', label: 'In-App' },
                                { key: 'whatsapp', label: 'WhatsApp' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setTemplateChannelFilter(tab.key)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                                        templateChannelFilter === tab.key
                                            ? 'bg-white text-indigo-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full md:w-80">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search template name, event or subject..."
                                value={templateSearch}
                                onChange={(e) => setTemplateSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                            />
                        </div>
                    </div>

                    {/* Templates Table */}
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                        {templatesLoading && templates.length === 0 ? (
                            <div className="py-20 text-center text-slate-400">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                                Loading event notification templates from database...
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="py-20 text-center text-slate-400">
                                <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                No notification templates found matching your search.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-700">
                                    <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <tr>
                                            <th className="py-3 px-4">Template Name</th>
                                            <th className="py-3 px-4">Event Type</th>
                                            <th className="py-3 px-4">Channel</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4">Last Updated</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredTemplates.map((template) => (
                                            <tr key={template.templateId} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-3.5 px-4">
                                                    <div className="font-semibold text-slate-900">{template.title || template.templateId}</div>
                                                    <div className="text-xs text-slate-500 line-clamp-1 max-w-md mt-0.5">
                                                        {template.subject || template.content}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                                        {template.templateId}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    {getChannelBadge(template.channel)}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    {getStatusBadge(template.isActive ? 'active' : 'inactive')}
                                                </td>
                                                <td className="py-3.5 px-4 text-xs text-slate-500">
                                                    {formatDate(template.updatedAt)}
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => setViewingTemplate(template)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                                            title="View Template Details"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                                                            View
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenEditTemplate(template)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors"
                                                            title="Configure Subject & Message"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                            Edit
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* SUBSECTION 2: DELIVERY HISTORY                                            */}
            {/* ========================================================================= */}
            {activeTab === 'deliveries' && (
                <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sent</span>
                            <div className="text-2xl font-bold text-slate-900 mt-1">{deliveryCounts.all}</div>
                            <span className="text-[11px] text-slate-400 mt-0.5 block">Logged outbox messages</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Delivered</span>
                            <div className="text-2xl font-bold text-emerald-700 mt-1">{deliveryCounts.delivered}</div>
                            <span className="text-[11px] text-emerald-500/80 mt-0.5 block">Delivered to recipient</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Queue</span>
                            <div className="text-2xl font-bold text-amber-700 mt-1">{deliveryCounts.pending}</div>
                            <span className="text-[11px] text-amber-500/80 mt-0.5 block">Awaiting gateway sync</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Failed</span>
                            <div className="text-2xl font-bold text-rose-700 mt-1">{deliveryCounts.failed}</div>
                            <span className="text-[11px] text-rose-500/80 mt-0.5 block">Delivery exceptions</span>
                        </div>
                    </div>

                    {/* Filter Toolbar */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        <div className="flex-1 relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by recipient name, email, event or ID..."
                                value={deliverySearch}
                                onChange={(e) => setDeliverySearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setDeliveryPage(1);
                                        fetchDeliveries();
                                    }
                                }}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={deliveryChannelFilter}
                                onChange={(e) => {
                                    setDeliveryChannelFilter(e.target.value);
                                    setDeliveryPage(1);
                                }}
                                className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700"
                            >
                                <option value="">All Channels</option>
                                <option value="email">Email</option>
                                <option value="sms">SMS</option>
                                <option value="in_app">In-App</option>
                                <option value="whatsapp">WhatsApp</option>
                            </select>

                            <select
                                value={deliveryStatusFilter}
                                onChange={(e) => {
                                    setDeliveryStatusFilter(e.target.value);
                                    setDeliveryPage(1);
                                }}
                                className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700"
                            >
                                <option value="">All Statuses</option>
                                <option value="delivered">Delivered</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                            </select>

                            <input
                                type="date"
                                value={deliveryFromDate}
                                onChange={(e) => setDeliveryFromDate(e.target.value)}
                                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
                                title="From Date"
                            />
                            <input
                                type="date"
                                value={deliveryToDate}
                                onChange={(e) => setDeliveryToDate(e.target.value)}
                                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
                                title="To Date"
                            />

                            <button
                                onClick={() => {
                                    setDeliveryPage(1);
                                    fetchDeliveries();
                                }}
                                className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                            >
                                Filter
                            </button>

                            {(deliverySearch || deliveryStatusFilter || deliveryChannelFilter || deliveryFromDate || deliveryToDate) && (
                                <button
                                    onClick={() => {
                                        setDeliverySearch('');
                                        setDeliveryStatusFilter('');
                                        setDeliveryChannelFilter('');
                                        setDeliveryFromDate('');
                                        setDeliveryToDate('');
                                        setDeliveryPage(1);
                                        setRefreshKey((k) => k + 1);
                                    }}
                                    className="px-2.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Deliveries Table */}
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                        {deliveriesLoading && deliveries.length === 0 ? (
                            <div className="py-20 text-center text-slate-400">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                                Fetching notification delivery records...
                            </div>
                        ) : deliveries.length === 0 ? (
                            <div className="py-20 text-center text-slate-400">
                                <Send className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                No delivery records matching the current filters.
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-700">
                                        <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            <tr>
                                                <th className="py-3 px-4">Notification ID</th>
                                                <th className="py-3 px-4">Recipient</th>
                                                <th className="py-3 px-4">Notification Event</th>
                                                <th className="py-3 px-4">Channel</th>
                                                <th className="py-3 px-4">Sent Date</th>
                                                <th className="py-3 px-4">Status</th>
                                                <th className="py-3 px-4">Failure Reason</th>
                                                <th className="py-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {deliveries.map((item) => (
                                                <tr key={item.notificationId} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-3.5 px-4 font-mono text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-medium text-slate-800">
                                                                {item.notificationId.slice(0, 8)}...
                                                            </span>
                                                            <button
                                                                onClick={() => copyToClipboard(item.notificationId, item.notificationId)}
                                                                className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-colors"
                                                                title="Copy Full UUID"
                                                            >
                                                                {copiedId === item.notificationId ? (
                                                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                                ) : (
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="font-semibold text-slate-900">{item.recipientName}</div>
                                                        <div className="text-xs text-slate-500 font-mono">
                                                            {item.recipientEmail !== '—' ? item.recipientEmail : item.recipientPhone}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="inline-block capitalize font-medium text-slate-800 text-xs">
                                                            {item.notificationEvent}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        {getChannelBadge(item.channel)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                                                        {formatDate(item.sentDate)}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        {getStatusBadge(item.status)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs">
                                                        {item.failureReason ? (
                                                            <span className="text-rose-600 font-medium line-clamp-1" title={item.failureReason}>
                                                                {item.failureReason}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <button
                                                            onClick={() => setSelectedDelivery(item)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination
                                    currentPage={deliveryPage}
                                    totalRecords={deliveriesTotal}
                                    pageSize={10}
                                    onPageChange={setDeliveryPage}
                                    recordLabel="delivery records"
                                    loading={deliveriesLoading}
                                />
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* SUBSECTION 3: FAILED NOTIFICATIONS                                        */}
            {/* ========================================================================= */}
            {activeTab === 'failed' && (
                <div className="space-y-4">
                    {/* Information Banner */}
                    <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-rose-900 leading-relaxed">
                            <span className="font-semibold block text-sm">Failed Delivery Audit & Idempotent Retry</span>
                            Displays all platform notifications that failed gateway dispatch or timed out.
                            Authorized Platform Admins can trigger safe delivery retries. The retry engine validates delivery state before re-dispatching to prevent accidental duplicate notifications.
                        </div>
                    </div>

                    {/* Failed List Table */}
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                        {failedLoading && failedList.length === 0 ? (
                            <div className="py-20 text-center text-slate-400">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                                Loading failed notification logs...
                            </div>
                        ) : failedList.length === 0 ? (
                            <div className="py-20 text-center text-slate-400">
                                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                                <div className="text-slate-800 font-semibold text-base">All notifications delivered successfully!</div>
                                <p className="text-xs text-slate-500 mt-1">There are no failed or unhandled notification delivery records.</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-700">
                                        <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            <tr>
                                                <th className="py-3 px-4">Recipient</th>
                                                <th className="py-3 px-4">Notification Type</th>
                                                <th className="py-3 px-4">Channel</th>
                                                <th className="py-3 px-4">Failure Reason</th>
                                                <th className="py-3 px-4">Attempts</th>
                                                <th className="py-3 px-4">Last Attempt Date</th>
                                                <th className="py-3 px-4">Current Status</th>
                                                <th className="py-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {failedList.map((item) => (
                                                <tr key={item.notificationId} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-3.5 px-4">
                                                        <div className="font-semibold text-slate-900">{item.recipientName}</div>
                                                        <div className="text-xs text-slate-500 font-mono">
                                                            {item.recipientEmail !== '—' ? item.recipientEmail : item.recipientPhone}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="capitalize font-medium text-slate-800 text-xs">
                                                            {item.notificationType}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        {getChannelBadge(item.channel)}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                                            {item.failureReason || 'Delivery Timeout'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                                                            {item.attemptCount} {item.attemptCount === 1 ? 'attempt' : 'attempts'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                                                        {formatDate(item.lastAttemptDate || item.sentDate)}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        {getStatusBadge(item.status || 'failed')}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <button
                                                            onClick={() => handleRetryNotification(item.notificationId)}
                                                            disabled={retryingId === item.notificationId}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg shadow-xs transition-colors"
                                                            title="Retry Delivery"
                                                        >
                                                            <RefreshCw className={`w-3.5 h-3.5 ${retryingId === item.notificationId ? 'animate-spin' : ''}`} />
                                                            Retry Delivery
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination
                                    currentPage={failedPage}
                                    totalRecords={failedTotal}
                                    pageSize={10}
                                    onPageChange={setFailedPage}
                                    recordLabel="failed deliveries"
                                    loading={failedLoading}
                                />
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* SUBSECTION 4: ANNOUNCEMENTS                                               */}
            {/* ========================================================================= */}
            {activeTab === 'announcements' && (
                <div className="space-y-4">
                    {/* Announcement Filters */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={announcementTargetFilter}
                                onChange={(e) => {
                                    setAnnouncementTargetFilter(e.target.value);
                                    setAnnouncementsPage(1);
                                }}
                                className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700"
                            >
                                <option value="">All Target Audiences</option>
                                <option value="all_learners">All Learners</option>
                                <option value="all_academy_owners">All Academy Owners</option>
                                <option value="all_academy_staff">All Academy Staff</option>
                                <option value="selected_groups">Selected User Groups</option>
                            </select>

                            <select
                                value={announcementStatusFilter}
                                onChange={(e) => {
                                    setAnnouncementStatusFilter(e.target.value);
                                    setAnnouncementsPage(1);
                                }}
                                className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700"
                            >
                                <option value="">All Statuses</option>
                                <option value="published">Published</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="draft">Draft</option>
                                <option value="deactivated">Deactivated</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>

                        <span className="text-xs text-slate-500 font-medium">
                            Showing {announcements.length} of {announcementsTotal} announcements
                        </span>
                    </div>

                    {/* Announcements Table */}
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                        {announcementsLoading && announcements.length === 0 ? (
                            <div className="py-20 text-center text-slate-400">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                                Loading platform announcements...
                            </div>
                        ) : announcements.length === 0 ? (
                            <div className="py-20 text-center text-slate-400">
                                <Megaphone className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <div className="text-slate-800 font-semibold text-base">No announcements found</div>
                                <p className="text-xs text-slate-500 mt-1">Create an announcement to broadcast to learners or academy partners.</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-700">
                                        <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            <tr>
                                                <th className="py-3 px-4">Announcement Title</th>
                                                <th className="py-3 px-4">Target Audience</th>
                                                <th className="py-3 px-4">Start Date</th>
                                                <th className="py-3 px-4">Expiry Date</th>
                                                <th className="py-3 px-4">Status</th>
                                                <th className="py-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {announcements.map((item) => (
                                                <tr key={item.announcementId} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-3.5 px-4 max-w-sm">
                                                        <div className="font-semibold text-slate-900 leading-snug">{item.title}</div>
                                                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                                            {item.message}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        {getAudienceBadge(item.targetAudience)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                                                        {formatDate(item.startDate)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                                                        {item.expiryDate ? formatDate(item.expiryDate) : <span className="text-slate-400">No Expiry</span>}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        {getStatusBadge(item.status)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleOpenEditAnnouncement(item)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                                                title="Edit Announcement"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                                Edit
                                                            </button>

                                                            {item.status !== 'published' && item.status !== 'expired' && (
                                                                <button
                                                                    onClick={() => handleAnnouncementAction(item.announcementId, 'publish')}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors"
                                                                    title="Publish Now"
                                                                >
                                                                    <Play className="w-3.5 h-3.5" />
                                                                    Publish
                                                                </button>
                                                            )}

                                                            {item.status === 'published' && (
                                                                <button
                                                                    onClick={() => handleAnnouncementAction(item.announcementId, 'deactivate')}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-lg transition-colors"
                                                                    title="Deactivate Announcement"
                                                                >
                                                                    <PauseCircle className="w-3.5 h-3.5" />
                                                                    Deactivate
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination
                                    currentPage={announcementsPage}
                                    totalRecords={announcementsTotal}
                                    pageSize={10}
                                    onPageChange={setAnnouncementsPage}
                                    recordLabel="announcements"
                                    loading={announcementsLoading}
                                />
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: VIEW TEMPLATE DETAILS                                              */}
            {/* ========================================================================= */}
            {viewingTemplate && (
                <Modal
                    isOpen={!!viewingTemplate}
                    onClose={() => setViewingTemplate(null)}
                    title={`Template Details: ${viewingTemplate.title || viewingTemplate.templateId}`}
                    maxWidth="640px"
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                            <div>
                                <span className="text-slate-400 block font-medium">Event Identifier</span>
                                <span className="font-mono font-semibold text-slate-800">{viewingTemplate.templateId}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block font-medium">Channel</span>
                                <div className="mt-0.5">{getChannelBadge(viewingTemplate.channel)}</div>
                            </div>
                            <div>
                                <span className="text-slate-400 block font-medium">Status</span>
                                <div className="mt-0.5">{getStatusBadge(viewingTemplate.isActive ? 'active' : 'inactive')}</div>
                            </div>
                            <div>
                                <span className="text-slate-400 block font-medium">System Compliance</span>
                                <span className="font-semibold text-purple-700 flex items-center gap-1 mt-0.5">
                                    <Shield className="w-3.5 h-3.5" />
                                    {viewingTemplate.isSystem ? 'Core Transactional Trigger' : 'Custom'}
                                </span>
                            </div>
                        </div>

                        {viewingTemplate.subject && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Subject Header</label>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800">
                                    {viewingTemplate.subject}
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notification Content Body</label>
                            <div className="p-3.5 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono leading-relaxed whitespace-pre-wrap">
                                {viewingTemplate.content}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const t = viewingTemplate;
                                    setViewingTemplate(null);
                                    handleOpenEditTemplate(t);
                                }}
                                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                            >
                                Edit This Template
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewingTemplate(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ========================================================================= */}
            {/* MODAL: EDIT NOTIFICATION TEMPLATE                                         */}
            {/* ========================================================================= */}
            {editingTemplate && (
                <Modal
                    isOpen={!!editingTemplate}
                    onClose={() => setEditingTemplate(null)}
                    title={`Edit Template: ${editingTemplate.title || editingTemplate.templateId}`}
                    maxWidth="680px"
                >
                    <form onSubmit={handleSaveTemplate} noValidate className="space-y-4">
                        {/* Channel & Status Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Notification Channel <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={editChannel}
                                    onChange={(e) => setEditChannel(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                >
                                    <option value="email">Email</option>
                                    <option value="sms">SMS</option>
                                    <option value="in_app">In-App Alert</option>
                                    <option value="whatsapp">WhatsApp</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 self-end h-[42px]">
                                <span className="text-xs font-semibold text-slate-800">Template Active</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editActive}
                                        onChange={(e) => setEditActive(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Subject */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Email / Notification Subject {editChannel === 'email' && <span className="text-rose-500">*</span>}
                                </label>
                                <span className="text-[10px] text-slate-400">{editSubject.length}/200</span>
                            </div>
                            <input
                                type="text"
                                maxLength={200}
                                value={editSubject}
                                onChange={(e) => setEditSubject(e.target.value)}
                                onBlur={templateForm.touch('subject')}
                                aria-invalid={!!templateForm.error('subject')}
                                style={invalidStyle(templateForm.error('subject'))}
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                placeholder="Subject title seen by recipient..."
                            />
                            <FieldError message={templateForm.error('subject')} />
                        </div>

                        {/* Message Body */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Notification Body <span className="text-rose-500">*</span>
                                </label>
                                <span className={`text-[10px] ${editContent.length > 5000 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                    {editContent.length}/5000
                                </span>
                            </div>
                            <textarea
                                rows={5}
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onBlur={templateForm.touch('content')}
                                aria-invalid={!!templateForm.error('content')}
                                style={invalidStyle(templateForm.error('content'))}
                                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                placeholder="Write the message text with {{variable}} placeholders..."
                                required
                            />
                            <FieldError message={templateForm.error('content')} />
                        </div>

                        {/* Clickable Dynamic Variables Picker */}
                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                                    Insert Dynamic Variables
                                </span>
                                <span className="text-[10px] text-indigo-600/80">Click a variable to insert into template</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {DYNAMIC_VARIABLES.map((v) => (
                                    <button
                                        key={v.key}
                                        type="button"
                                        onClick={() => handleInsertVariable(v.key)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-medium bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 rounded-md shadow-2xs transition-all"
                                        title={v.desc}
                                    >
                                        <span>{v.key}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {editingTemplate.isSystem && (
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800 flex items-center gap-2">
                                <Shield className="w-4 h-4 shrink-0 text-purple-600" />
                                <span>Core platform event template. Changes are recorded in compliance audit trails.</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setEditingTemplate(null)}
                                disabled={savingTemplate}
                                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={savingTemplate}
                                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-2"
                            >
                                {savingTemplate && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ========================================================================= */}
            {/* MODAL: VIEW DELIVERY DETAILS                                              */}
            {/* ========================================================================= */}
            {selectedDelivery && (
                <Modal
                    isOpen={!!selectedDelivery}
                    onClose={() => setSelectedDelivery(null)}
                    title={`Notification Delivery: #${selectedDelivery.notificationId.slice(0, 8)}`}
                    maxWidth="660px"
                >
                    <div className="space-y-4">
                        {/* Status bar */}
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Event Trigger</span>
                                <span className="text-sm font-bold text-slate-900 capitalize">{selectedDelivery.notificationEvent}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {getChannelBadge(selectedDelivery.channel)}
                                {getStatusBadge(selectedDelivery.status)}
                            </div>
                        </div>

                        {/* Recipient Details */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 bg-white border border-slate-200 rounded-xl text-xs">
                            <div>
                                <span className="text-slate-400 block font-medium">Recipient Name</span>
                                <span className="font-semibold text-slate-900">{selectedDelivery.recipientName}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block font-medium">Destination Contact</span>
                                <span className="font-mono font-semibold text-slate-900">
                                    {selectedDelivery.recipientEmail !== '—' ? selectedDelivery.recipientEmail : selectedDelivery.recipientPhone}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block font-medium">Initial Dispatch Date</span>
                                <span className="font-medium text-slate-700">{formatDate(selectedDelivery.sentDate)}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block font-medium">Delivered Timestamp</span>
                                <span className="font-medium text-slate-700">{formatDate(selectedDelivery.deliveredDate)}</span>
                            </div>
                        </div>

                        {/* Failure alert if failed */}
                        {selectedDelivery.failureReason && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                                <div className="font-bold flex items-center gap-1.5 text-rose-900">
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                    Delivery Failure Reason:
                                </div>
                                <div className="font-mono text-rose-700 bg-white/70 p-2 rounded-md">
                                    {selectedDelivery.failureReason}
                                </div>
                            </div>
                        )}

                        {/* Subject Header */}
                        {selectedDelivery.subject && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subject</label>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800">
                                    {selectedDelivery.subject}
                                </div>
                            </div>
                        )}

                        {/* Delivered Body */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dispatched Content</label>
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                {selectedDelivery.body || 'No textual content recorded.'}
                            </div>
                        </div>

                        {/* Raw JSON Payload */}
                        {selectedDelivery.payload && (
                            <details className="text-xs group border border-slate-200 rounded-xl overflow-hidden">
                                <summary className="p-3 bg-slate-50 font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-100 flex items-center justify-between">
                                    <span>Raw Event Payload</span>
                                    <span className="text-[11px] text-slate-400 font-normal">Click to expand JSON</span>
                                </summary>
                                <pre className="p-3 bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-44">
                                    {JSON.stringify(selectedDelivery.payload, null, 2)}
                                </pre>
                            </details>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setSelectedDelivery(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ========================================================================= */}
            {/* MODAL: CREATE / EDIT ANNOUNCEMENT                                         */}
            {/* ========================================================================= */}
            {isAnnouncementModalOpen && (
                <Modal
                    isOpen={isAnnouncementModalOpen}
                    onClose={() => setIsAnnouncementModalOpen(false)}
                    title={editingAnnouncement ? 'Edit Platform Announcement' : 'Create Platform Announcement'}
                    maxWidth="640px"
                >
                    <form onSubmit={handleSaveAnnouncement} noValidate className="space-y-4">
                        {/* Title */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Announcement Title <span className="text-rose-500">*</span>
                                </label>
                                <span className="text-[10px] text-slate-400">{announcementTitle.length}/120</span>
                            </div>
                            <input
                                type="text"
                                maxLength={120}
                                value={announcementTitle}
                                onChange={(e) => setAnnouncementTitle(e.target.value)}
                                onBlur={announcementForm.touch('title')}
                                aria-invalid={!!announcementForm.error('title')}
                                style={invalidStyle(announcementForm.error('title'))}
                                placeholder="e.g. Platform Infrastructure Maintenance Window"
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                required
                            />
                            <FieldError message={announcementForm.error('title')} />
                        </div>

                        {/* Target Audience & Status */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Target Audience <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={announcementTarget}
                                    onChange={(e: any) => setAnnouncementTarget(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                >
                                    <option value="all_learners">All Learners</option>
                                    <option value="all_academy_owners">All Academy Owners</option>
                                    <option value="all_academy_staff">All Academy Staff</option>
                                    <option value="selected_groups">Selected User Groups</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Publishing Status <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={announcementStatus}
                                    onChange={(e: any) => setAnnouncementStatus(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                >
                                    <option value="published">Publish Immediately</option>
                                    <option value="scheduled">Schedule for Future</option>
                                    <option value="draft">Save as Draft</option>
                                    <option value="deactivated">Deactivated</option>
                                </select>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Start / Broadcast Date
                                </label>
                                <input
                                    type="datetime-local"
                                    value={announcementStartDate}
                                    onChange={(e) => setAnnouncementStartDate(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Expiry Date (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={announcementExpiryDate}
                                    onChange={(e) => setAnnouncementExpiryDate(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                />
                            </div>
                        </div>

                        {/* Message */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Announcement Content <span className="text-rose-500">*</span>
                                </label>
                                <span className={`text-[10px] ${announcementMessage.length > 2000 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                    {announcementMessage.length}/2000
                                </span>
                            </div>
                            <textarea
                                rows={4}
                                value={announcementMessage}
                                onChange={(e) => setAnnouncementMessage(e.target.value)}
                                onBlur={announcementForm.touch('message')}
                                aria-invalid={!!announcementForm.error('message')}
                                style={invalidStyle(announcementForm.error('message'))}
                                placeholder="Describe the announcement, system changes, or instructions..."
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                required
                            />
                            <FieldError message={announcementForm.error('message')} />
                        </div>

                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsAnnouncementModalOpen(false)}
                                disabled={savingAnnouncement}
                                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={savingAnnouncement}
                                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-2"
                            >
                                {savingAnnouncement && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                {editingAnnouncement ? 'Update Announcement' : 'Publish Announcement'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
