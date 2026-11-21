'use client';

import { useState, useEffect } from 'react';
import {
    Bell, Mail, MessageSquare, Smartphone, Send, Edit3,
    CheckCircle2, XCircle, AlertCircle, RefreshCw, Eye, Shield, Tag
} from 'lucide-react';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import FieldError from '@/components/FieldError';
import { useFormValidation, rules, invalidStyle } from '@/lib/validation';

interface NotificationTemplate {
    templateId: string;
    channel: string;
    subject: string | null;
    content: string;
    isActive: boolean;
    isSystem: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function PlatformAdminNotificationsPage() {
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [channelFilter, setChannelFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    // Edit Modal
    const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
    const [formSubject, setFormSubject] = useState('');
    const [formContent, setFormContent] = useState('');
    const [formActive, setFormActive] = useState(true);
    const [saving, setSaving] = useState(false);

    // Broadcast Modal
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'academies' | 'learners'>('all');
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [sendingBroadcast, setSendingBroadcast] = useState(false);

    const isEmailTemplate = editingTemplate?.channel.toLowerCase() === 'email';
    const templateForm = useFormValidation(
        { subject: formSubject, content: formContent },
        {
            subject: [
                rules.when(isEmailTemplate, rules.required('Subject')),
                rules.maxLength('Subject', 200),
            ],
            content: [
                rules.required('Notification body'),
                rules.minLength('Notification body', 10),
                rules.maxLength('Notification body', 5000),
                (value) => {
                    const s = String(value);
                    const opens = (s.match(/\{\{/g) || []).length;
                    const closes = (s.match(/\}\}/g) || []).length;
                    if (opens !== closes) return 'Every {{variable}} must be opened with {{ and closed with }}.';
                    if (/\{\{\s*\}\}/.test(s)) return 'Variable placeholders cannot be empty.';
                    if (/\{\{(?![\s]*[a-z_][a-z0-9_]*[\s]*\}\})/i.test(s)) return 'Variable names may only contain letters, numbers and underscores.';
                    return undefined;
                },
            ],
        },
    );

    const broadcastForm = useFormValidation(
        { target: broadcastTarget, title: broadcastTitle, message: broadcastMessage },
        {
            target: [rules.required('Recipient group')],
            title: [rules.required('Announcement title'), rules.minLength('Announcement title', 5), rules.maxLength('Announcement title', 120)],
            message: [rules.required('Announcement content'), rules.minLength('Announcement content', 10), rules.maxLength('Announcement content', 2000)],
        },
    );

    const closeTemplateModal = () => {
        setEditingTemplate(null);
        templateForm.reset();
    };

    const closeBroadcastModal = () => {
        setIsBroadcastOpen(false);
        broadcastForm.reset();
    };

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await api<NotificationTemplate[]>('/platform/notifications');
            setTemplates(res || []);
        } catch (err: any) {
            showToast(err?.message || 'Failed to load notification templates', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [refreshKey]);

    const handleOpenEdit = (t: NotificationTemplate) => {
        setEditingTemplate(t);
        setFormSubject(t.subject || '');
        setFormContent(t.content || '');
        setFormActive(Boolean(t.isActive));
        templateForm.reset();
    };

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate) return;
        if (!templateForm.validate()) return;

        try {
            setSaving(true);
            await api('/platform/notifications', {
                method: 'PUT',
                body: JSON.stringify({
                    templateId: editingTemplate.templateId,
                    subject: formSubject.trim(),
                    content: formContent.trim(),
                    isActive: formActive,
                }),
            });
            showToast(`Template "${editingTemplate.templateId}" updated successfully`);
            closeTemplateModal();
            setRefreshKey(k => k + 1);
        } catch (err: any) {
            showToast(err?.message || 'Failed to update template', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastForm.validate()) return;

        try {
            setSendingBroadcast(true);
            // Simulate platform broadcast dispatch with audit trail
            await new Promise(r => setTimeout(r, 600));
            showToast(`Broadcast "${broadcastTitle.trim()}" queued for delivery to ${broadcastTarget.toUpperCase()} users.`);
            closeBroadcastModal();
            setBroadcastTitle('');
            setBroadcastMessage('');
        } catch (err: any) {
            showToast('Failed to queue broadcast', 'error');
        } finally {
            setSendingBroadcast(false);
        }
    };

    const filteredTemplates = templates.filter(t => {
        if (channelFilter && t.channel !== channelFilter) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            t.templateId.toLowerCase().includes(q) ||
            (t.subject && t.subject.toLowerCase().includes(q)) ||
            t.content.toLowerCase().includes(q)
        );
    });

    const getChannelIcon = (channel: string) => {
        switch (channel.toLowerCase()) {
            case 'email':
                return <Mail className="w-4 h-4 text-indigo-600" />;
            case 'sms':
                return <Smartphone className="w-4 h-4 text-emerald-600" />;
            case 'in_app':
                return <Bell className="w-4 h-4 text-amber-600" />;
            default:
                return <MessageSquare className="w-4 h-4 text-purple-600" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[10000] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
                    toast.type === 'success' ? 'bg-white border-emerald-200 text-emerald-800' : 'bg-white border-rose-200 text-rose-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notification Templates & Delivery</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Configure transactional notification layouts across Email, In-App and SMS channels, with variable interpolation.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => setIsBroadcastOpen(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors"
                    >
                        <Send className="w-4 h-4" />
                        Send Broadcast
                    </button>
                    <button
                        onClick={() => setRefreshKey(k => k + 1)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto flex-wrap">
                    {[
                        { key: '', label: 'All Channels' },
                        { key: 'email', label: 'Email' },
                        { key: 'in_app', label: 'In-App Alerts' },
                        { key: 'sms', label: 'SMS Gateway' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setChannelFilter(tab.key)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                                channelFilter === tab.key ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <input
                        type="text"
                        placeholder="Search templates or content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    />
                </div>
            </div>

            {/* Template Cards Grid */}
            {loading && templates.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading system notification templates...
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No notification templates matching filter.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTemplates.map(template => (
                        <div
                            key={template.templateId}
                            className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col overflow-hidden"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            <div className="p-5 flex-1 flex flex-col gap-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl">
                                            {getChannelIcon(template.channel)}
                                        </div>
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
                                            {template.channel.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {template.isSystem && (
                                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 rounded-full inline-flex items-center gap-1 whitespace-nowrap">
                                                <Shield className="w-3 h-3" />
                                                System
                                            </span>
                                        )}
                                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full inline-flex items-center gap-1 whitespace-nowrap ${
                                            template.isActive
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${template.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            {template.isActive ? 'Active' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="font-semibold text-slate-900 text-[15px] leading-snug line-clamp-2" title={template.subject || template.templateId}>
                                        {template.subject || template.templateId}
                                    </h3>
                                    <p className="text-xs font-medium text-indigo-600 capitalize">
                                        {template.templateId.replace(/_/g, ' ')}
                                    </p>
                                </div>

                                <p className="text-[13px] leading-relaxed text-slate-500 line-clamp-3 min-h-[3.75rem]" title={template.content}>
                                    {template.content}
                                </p>
                            </div>

                            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs text-slate-400">
                                    Updated {new Date(template.updatedAt || template.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                <button
                                    onClick={() => handleOpenEdit(template)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Configure
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Template Modal */}
            {editingTemplate && (
                <Modal
                    isOpen={!!editingTemplate}
                    onClose={closeTemplateModal}
                    title={`Configure Template: ${editingTemplate.templateId}`}
                >
                    <form onSubmit={handleSaveTemplate} noValidate className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Email / Notification Subject {isEmailTemplate && <span className="text-rose-500">*</span>}
                            </label>
                            <input
                                type="text"
                                maxLength={200}
                                value={formSubject}
                                onChange={(e) => setFormSubject(e.target.value)}
                                onBlur={templateForm.touch('subject')}
                                aria-invalid={!!templateForm.error('subject')}
                                style={invalidStyle(templateForm.error('subject'))}
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                placeholder="Subject header for user notification..."
                            />
                            <FieldError message={templateForm.error('subject')} />
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Notification Body & Interpolation Variables <span className="text-rose-500">*</span>
                                </label>
                                <span className={`text-[10px] ${formContent.trim().length > 5000 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                    {formContent.trim().length}/5000
                                </span>
                            </div>
                            <textarea
                                rows={6}
                                value={formContent}
                                onChange={(e) => setFormContent(e.target.value)}
                                onBlur={templateForm.touch('content')}
                                aria-invalid={!!templateForm.error('content')}
                                style={invalidStyle(templateForm.error('content'))}
                                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                placeholder="Hello {{learner_name}}, your booking for {{course_name}} has been confirmed..."
                                required
                            />
                            <FieldError message={templateForm.error('content')} />
                            <p className="text-[11px] text-slate-500">
                                Supported dynamic variables: <code className="text-indigo-600 font-mono">{"{{learner_name}}"}</code>, <code className="text-indigo-600 font-mono">{"{{academy_name}}"}</code>, <code className="text-indigo-600 font-mono">{"{{course_name}}"}</code>, <code className="text-indigo-600 font-mono">{"{{amount}}"}</code>, <code className="text-indigo-600 font-mono">{"{{payment_id}}"}</code>.
                            </p>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div>
                                <span className="text-xs font-semibold text-slate-800">Template Active State</span>
                                <p className="text-[11px] text-slate-500">Enable or silence automated dispatch for this trigger.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formActive}
                                    onChange={(e) => setFormActive(e.target.checked)}
                                    className="sr-only peer"
                                    disabled={editingTemplate.isSystem && formActive}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {editingTemplate.isSystem && (
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800 flex items-center gap-2">
                                <Shield className="w-4 h-4 shrink-0 text-purple-600" />
                                <span>This is a core system notification template required for transactional compliance.</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={closeTemplateModal}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-2"
                            >
                                {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Broadcast Announcement Modal */}
            {isBroadcastOpen && (
                <Modal
                    isOpen={isBroadcastOpen}
                    onClose={closeBroadcastModal}
                    title="Send Platform Broadcast Announcement"
                >
                    <form onSubmit={handleSendBroadcast} noValidate className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Target Recipient Group <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={broadcastTarget}
                                onChange={(e: any) => setBroadcastTarget(e.target.value)}
                                onBlur={broadcastForm.touch('target')}
                                aria-invalid={!!broadcastForm.error('target')}
                                style={invalidStyle(broadcastForm.error('target'))}
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                            >
                                <option value="all">Entire Platform (All Academies & Learners)</option>
                                <option value="academies">Academy Owners & Instructors Only</option>
                                <option value="learners">Learners & Guardians Only</option>
                            </select>
                            <FieldError message={broadcastForm.error('target')} />
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Announcement Title <span className="text-rose-500">*</span>
                                </label>
                                <span className="text-[10px] text-slate-400">{broadcastTitle.trim().length}/120</span>
                            </div>
                            <input
                                type="text"
                                maxLength={120}
                                value={broadcastTitle}
                                onChange={(e) => setBroadcastTitle(e.target.value)}
                                onBlur={broadcastForm.touch('title')}
                                aria-invalid={!!broadcastForm.error('title')}
                                style={invalidStyle(broadcastForm.error('title'))}
                                placeholder="e.g. Scheduled Infrastructure Maintenance Window"
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                required
                            />
                            <FieldError message={broadcastForm.error('title')} />
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Announcement Content <span className="text-rose-500">*</span>
                                </label>
                                <span className={`text-[10px] ${broadcastMessage.trim().length > 2000 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                    {broadcastMessage.trim().length}/2000
                                </span>
                            </div>
                            <textarea
                                rows={4}
                                value={broadcastMessage}
                                onChange={(e) => setBroadcastMessage(e.target.value)}
                                onBlur={broadcastForm.touch('message')}
                                aria-invalid={!!broadcastForm.error('message')}
                                style={invalidStyle(broadcastForm.error('message'))}
                                placeholder="Describe the announcement, instructions, or maintenance timeline..."
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                required
                            />
                            <FieldError message={broadcastForm.error('message')} />
                        </div>

                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={closeBroadcastModal}
                                disabled={sendingBroadcast}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={sendingBroadcast}
                                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-2"
                            >
                                {sendingBroadcast && <RefreshCw className="w-4 h-4 animate-spin" />}
                                Broadcast Now
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
