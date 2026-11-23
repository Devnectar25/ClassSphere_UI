'use client';

import { useState, useEffect } from 'react';
import {
    Percent, ClipboardList, RotateCcw, Landmark,
    Building, Save, RefreshCw, CheckCircle2,
    AlertCircle, Sliders, ShieldCheck, ShieldAlert,
    Clock, Check, Search, ChevronDown, Lock,
    HelpCircle, ExternalLink
} from 'lucide-react';
import { api } from '@/lib/api';

interface PlatformSettingsMap {
    commission: {
        defaultPercentage: number;
        taxOnCommission: number;
    };
    registration: {
        defaultPaymentWindowHours: number;
        deadlineRules: string;
        cancellationNoticeHours?: number;
        autoCancelUnpaid?: boolean;
    };
    cancellation: {
        defaultPolicy: string;
        allowAcademyOverrides: boolean;
        refundProcessingDays?: number;
        deductionPercentage?: number;
    };
    settlement: {
        releaseSchedule: string;
        payoutHoldingDays: number;
        minimumPayoutThreshold?: number;
    };
    general: {
        platformName: string;
        platformLogo?: string;
        platformEmail?: string;
        supportEmail: string;
        contactNumber: string;
        address: string;
        platformStatus?: 'Active' | 'Maintenance' | 'active' | 'maintenance';
    };
    features: {
        enableOnlinePayments: boolean;
        enableParentPortal: boolean;
        enableWhitelabel: boolean;
        enableSms: boolean;
    };
    _meta?: Record<string, {
        updatedAt: string;
        updatedBy: string | null;
        updatedByName?: string;
        updatedByEmail?: string;
    }>;
    _role?: 'SuperAdmin' | 'FinanceAdmin' | 'SupportAdmin';
    _permissions?: {
        canEdit: boolean;
        canViewCommission: boolean;
        canViewSettlement: boolean;
        canViewFeatures: boolean;
        canViewRegistration: boolean;
        canViewCancellation: boolean;
        canViewGeneral: boolean;
    };
}

interface AcademyItem {
    tenantId: string;
    academyCode: string;
    name: string;
    category?: string;
    commissionRate?: number;
    ownerName?: string;
    email?: string;
    location?: string;
    verificationStatus?: string;
}

export default function PlatformAdminSettingsPage() {
    const [settings, setSettings] = useState<PlatformSettingsMap | null>(null);
    const [originalSettings, setOriginalSettings] = useState<PlatformSettingsMap | null>(null);
    const [activeTab, setActiveTab] = useState<'commission' | 'registration' | 'cancellation' | 'settlement' | 'general' | 'features'>('general');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Academy commission overrides state
    const [academies, setAcademies] = useState<AcademyItem[]>([]);
    const [loadingAcademies, setLoadingAcademies] = useState(false);
    const [selectedAcademyId, setSelectedAcademyId] = useState<string>('');
    const [academyCommissionInput, setAcademyCommissionInput] = useState<string>('');
    const [savingAcademyCommission, setSavingAcademyCommission] = useState(false);
    const [academyFilter, setAcademyFilter] = useState('');

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api<PlatformSettingsMap>('/platform/settings');
            setSettings(res);
            setOriginalSettings(JSON.parse(JSON.stringify(res)));

            // If user role is SupportAdmin, default tab to 'general'
            if (res._role === 'SupportAdmin' && (activeTab === 'commission' || activeTab === 'settlement' || activeTab === 'features')) {
                setActiveTab('general');
            }
        } catch (err: any) {
            showToast(err?.message || 'Failed to load platform settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchAcademies = async () => {
        try {
            setLoadingAcademies(true);
            const res = await api<{ academies: AcademyItem[] }>('/platform/tenants?status=all&limit=100');
            if (res && Array.isArray(res.academies)) {
                setAcademies(res.academies);
            }
        } catch {
            // Silently fallback if tenants endpoint is not accessible
        } finally {
            setLoadingAcademies(false);
        }
    };

    useEffect(() => {
        fetchSettings();
        fetchAcademies();
    }, []);

    const canEdit = settings?._permissions?.canEdit ?? (settings?._role === 'SuperAdmin' || !settings?._role);

    // Format audit timestamp
    const formatAuditDate = (iso?: string) => {
        if (!iso) return null;
        try {
            const d = new Date(iso);
            return d.toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch {
            return iso;
        }
    };

    const handleSaveSection = async (key: keyof PlatformSettingsMap) => {
        if (!settings) return;
        if (!canEdit) {
            showToast('You do not have permission to modify platform settings.', 'error');
            return;
        }

        // Client-side validations
        if (key === 'general') {
            if (!settings.general.platformName.trim()) {
                showToast('Platform Name is required.', 'error');
                return;
            }
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (settings.general.platformEmail && !emailRegex.test(settings.general.platformEmail.trim())) {
                showToast('Please enter a valid Platform Email address.', 'error');
                return;
            }
            if (settings.general.supportEmail && !emailRegex.test(settings.general.supportEmail.trim())) {
                showToast('Please enter a valid Support Email address.', 'error');
                return;
            }
        } else if (key === 'commission') {
            const p = Number(settings.commission.defaultPercentage);
            if (isNaN(p) || p < 0 || p > 50) {
                showToast('Commission percentage must be between 0% and 50%.', 'error');
                return;
            }
            const t = Number(settings.commission.taxOnCommission);
            if (isNaN(t) || t < 0 || t > 50) {
                showToast('Tax on commission must be between 0% and 50%.', 'error');
                return;
            }
        } else if (key === 'registration') {
            const h = Number(settings.registration.defaultPaymentWindowHours);
            if (isNaN(h) || h < 1 || h > 168) {
                showToast('Payment window must be between 1 and 168 hours.', 'error');
                return;
            }
            if (!settings.registration.deadlineRules?.trim()) {
                showToast('Deadline rules description is required.', 'error');
                return;
            }
        } else if (key === 'cancellation') {
            if (!settings.cancellation.defaultPolicy?.trim()) {
                showToast('Cancellation policy text is required.', 'error');
                return;
            }
        } else if (key === 'settlement') {
            const d = Number(settings.settlement.payoutHoldingDays);
            if (isNaN(d) || d < 0 || d > 60) {
                showToast('Payout holding period must be between 0 and 60 days.', 'error');
                return;
            }
        }

        try {
            setSaving(true);
            const res = await api<{ updatedAt?: string; updatedByName?: string; updatedByEmail?: string }>('/platform/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    key,
                    value: settings[key],
                }),
            });

            // Update local state with latest metadata
            if (res && res.updatedAt) {
                setSettings(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        _meta: {
                            ...prev._meta,
                            [key]: {
                                updatedAt: res.updatedAt!,
                                updatedBy: null,
                                updatedByName: res.updatedByName,
                                updatedByEmail: res.updatedByEmail,
                            }
                        }
                    };
                });
            }

            setOriginalSettings(JSON.parse(JSON.stringify(settings)));
            showToast(`Platform ${key} configuration saved and activated.`);
        } catch (err: any) {
            showToast(err?.message || `Failed to save ${key} settings`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleResetSection = (key: keyof PlatformSettingsMap) => {
        if (!originalSettings || !settings) return;
        setSettings({
            ...settings,
            [key]: JSON.parse(JSON.stringify(originalSettings[key])),
        });
        showToast(`Discarded unsaved changes in ${key} tab.`);
    };

    // Handle Academy-Specific Commission Override Save
    const handleSaveAcademyCommission = async () => {
        if (!selectedAcademyId) {
            showToast('Please select an academy first.', 'error');
            return;
        }
        const rate = Number(academyCommissionInput);
        if (isNaN(rate) || rate < 0 || rate > 50) {
            showToast('Academy commission rate must be between 0% and 50%.', 'error');
            return;
        }

        try {
            setSavingAcademyCommission(true);
            await api('/platform/academies/verification', {
                method: 'PATCH',
                body: JSON.stringify({
                    tenantId: selectedAcademyId,
                    commissionRate: rate,
                    action: 'commission',
                }),
            });

            // Update academy in local list
            setAcademies(prev => prev.map(a => a.tenantId === selectedAcademyId ? { ...a, commissionRate: rate } : a));
            showToast(`Custom commission rate (${rate}%) applied to academy.`);
            setAcademyCommissionInput('');
            setSelectedAcademyId('');
        } catch (err: any) {
            showToast(err?.message || 'Failed to update academy commission rate', 'error');
        } finally {
            setSavingAcademyCommission(false);
        }
    };

    // Filter available tabs based on admin role
    const allTabs = [
        { key: 'general', label: 'Platform Profile', icon: Building, show: true },
        { key: 'commission', label: 'Commission & Taxes', icon: Percent, show: settings?._permissions?.canViewCommission ?? true },
        { key: 'registration', label: 'Registration Rules', icon: ClipboardList, show: true },
        { key: 'cancellation', label: 'Cancellation & Refunds', icon: RotateCcw, show: true },
        { key: 'settlement', label: 'Payout Schedules', icon: Landmark, show: settings?._permissions?.canViewSettlement ?? true },
        { key: 'features', label: 'Global Feature Toggles', icon: Sliders, show: settings?._permissions?.canViewFeatures ?? true },
    ];
    const visibleTabs = allTabs.filter(t => t.show);

    const renderAuditMeta = (key: string) => {
        const meta = settings?._meta?.[key];
        if (!meta?.updatedAt) return null;
        return (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Last updated {formatAuditDate(meta.updatedAt)}</span>
                {meta.updatedByName && (
                    <span>by <strong className="text-slate-600">{meta.updatedByName}</strong></span>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Toast Banner */}
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
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Configuration & Controls</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Control global platform identity, commission take-rates, automated settlement cycles, registration rules, and feature flags.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { fetchSettings(); fetchAcademies(); }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Reload Settings
                    </button>
                </div>
            </div>

            {/* Role-Based Access Notification Banner */}
            {settings?._role && settings._role !== 'SuperAdmin' && (
                <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-800 shadow-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                        Viewing in <strong>{settings._role === 'FinanceAdmin' ? 'Finance Administrator' : 'Support Administrator'}</strong> mode.
                        {settings._role === 'FinanceAdmin'
                            ? ' You can inspect financial, settlement, and registration parameters in read-only mode.'
                            : ' Sensitive financial and platform-wide switches are restricted. Only support-relevant policies are displayed.'}
                        {' '}Updating platform settings requires Super Administrator credentials.
                    </span>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 flex-wrap pb-1">
                {visibleTabs.map((t) => {
                    const Icon = t.icon;
                    const isActive = activeTab === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2 ${
                                isActive
                                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                            }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Contents */}
            {loading && !settings ? (
                <div className="py-20 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                    Retrieving platform settings from persistent database...
                </div>
            ) : settings && (
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6">

                    {/* ══════════════════════════════════════════════════
                        TAB 1: GENERAL PLATFORM SETTINGS
                       ══════════════════════════════════════════════════ */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 max-w-3xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">General Platform Profile & Status</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Public identity, branding, official email coordinates, and operational maintenance status.
                                    </p>
                                </div>
                                {renderAuditMeta('general')}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Platform Name */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Platform Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        disabled={!canEdit}
                                        value={settings.general.platformName}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            general: { ...settings.general, platformName: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <span className="text-[11px] text-slate-400">Public brand name surfaced across portals & receipts</span>
                                </div>

                                {/* Platform Operational Status */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Platform System Status
                                    </label>
                                    <select
                                        disabled={!canEdit}
                                        value={settings.general.platformStatus || 'Active'}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            general: { ...settings.general, platformStatus: e.target.value as any }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    >
                                        <option value="Active">Active (All services normal)</option>
                                        <option value="Maintenance">Maintenance (Non-admin access paused)</option>
                                    </select>
                                    <span className="text-[11px] text-slate-400">
                                        {settings.general.platformStatus === 'Maintenance'
                                            ? '⚠️ Platform is set to maintenance mode'
                                            : '✓ Platform operational for all academies and learners'}
                                    </span>
                                </div>

                                {/* Platform Logo Path / URL */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Platform Logo URL or Asset Path
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            disabled={!canEdit}
                                            value={settings.general.platformLogo || ''}
                                            placeholder="/brand-logo.svg"
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                general: { ...settings.general, platformLogo: e.target.value }
                                            })}
                                            className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                        {settings.general.platformLogo && (
                                            <div className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                                                <img
                                                    src={settings.general.platformLogo}
                                                    alt="Logo Preview"
                                                    className="w-6 h-6 object-contain"
                                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-400">Displayed in system navbar, reports and invoices</span>
                                </div>

                                {/* Platform Official Email */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Platform Official Email
                                    </label>
                                    <input
                                        type="email"
                                        disabled={!canEdit}
                                        value={settings.general.platformEmail || ''}
                                        placeholder="admin@classshare.io"
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            general: { ...settings.general, platformEmail: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <span className="text-[11px] text-slate-400">Primary administrative sender address</span>
                                </div>

                                {/* Support Email */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Support Contact Email <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        disabled={!canEdit}
                                        value={settings.general.supportEmail}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            general: { ...settings.general, supportEmail: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <span className="text-[11px] text-slate-400">Recipient for learner and partner inquiries</span>
                                </div>

                                {/* Support Contact Number */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Support Contact Phone <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        disabled={!canEdit}
                                        value={settings.general.contactNumber}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            general: { ...settings.general, contactNumber: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <span className="text-[11px] text-slate-400">Toll-free or support hotline phone line</span>
                                </div>

                                {/* Registered Address */}
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Registered Business Office Address
                                    </label>
                                    <input
                                        type="text"
                                        disabled={!canEdit}
                                        value={settings.general.address}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            general: { ...settings.general, address: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="text-xs text-slate-400">
                                    {!canEdit && <span className="flex items-center gap-1 text-slate-500"><Lock className="w-3.5 h-3.5" /> Modifications restricted to Super Admin</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={!canEdit || saving}
                                        onClick={() => handleResetSection('general')}
                                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                                    >
                                        Discard Changes
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canEdit || saving}
                                        onClick={() => handleSaveSection('general')}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                                    >
                                        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Save Platform Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        TAB 2: COMMISSION & TAXES
                       ══════════════════════════════════════════════════ */}
                    {activeTab === 'commission' && (
                        <div className="space-y-8 max-w-3xl">
                            {/* Section A: Default Platform Commission */}
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900">Default Platform Commission & Taxes</h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Configure the standard platform cut applied to coarse fee transactions across all partner institutes.
                                        </p>
                                    </div>
                                    {renderAuditMeta('commission')}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            Default Platform Commission (%) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="50"
                                            step="0.5"
                                            disabled={!canEdit}
                                            value={settings.commission.defaultPercentage}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                commission: { ...settings.commission, defaultPercentage: Number(e.target.value) }
                                            })}
                                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                        <span className="text-[11px] text-slate-400">Current baseline rate (standard: 10%)</span>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            GST on Platform Commission (%) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="30"
                                            step="1"
                                            disabled={!canEdit}
                                            value={settings.commission.taxOnCommission}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                commission: { ...settings.commission, taxOnCommission: Number(e.target.value) }
                                            })}
                                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                        <span className="text-[11px] text-slate-400">Statutory GST on platform service fee (18%)</span>
                                    </div>
                                </div>

                                {/* Real-time calculation preview */}
                                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-600">
                                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                                        <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                                        Commission Take-Rate Example (on a ₹10,000 Course Fee):
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11.5px]">
                                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                                            <span className="text-slate-400 block text-[10px]">Gross Fee</span>
                                            <span className="font-bold text-slate-800">₹10,000</span>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                                            <span className="text-slate-400 block text-[10px]">Platform Cut ({settings.commission.defaultPercentage}%)</span>
                                            <span className="font-bold text-indigo-600">₹{(10000 * settings.commission.defaultPercentage / 100).toFixed(2)}</span>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                                            <span className="text-slate-400 block text-[10px]">GST on Cut ({settings.commission.taxOnCommission}%)</span>
                                            <span className="font-bold text-slate-700">₹{(10000 * settings.commission.defaultPercentage / 100 * settings.commission.taxOnCommission / 100).toFixed(2)}</span>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                                            <span className="text-slate-400 block text-[10px]">Net Academy Payout</span>
                                            <span className="font-bold text-emerald-600">
                                                ₹{(10000 - (10000 * settings.commission.defaultPercentage / 100 * (1 + settings.commission.taxOnCommission / 100))).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                    <div className="text-xs text-slate-400">
                                        {!canEdit && <span className="flex items-center gap-1 text-slate-500"><Lock className="w-3.5 h-3.5" /> Read-only mode</span>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            disabled={!canEdit || saving}
                                            onClick={() => handleResetSection('commission')}
                                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                                        >
                                            Discard Changes
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!canEdit || saving}
                                            onClick={() => handleSaveSection('commission')}
                                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                                        >
                                            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                            Save Default Commission
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Section B: Academy-Specific Custom Commission Overrides (Requirement 2) */}
                            <div className="pt-6 border-t border-slate-200 space-y-4">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">Academy-Specific Commission Overrides</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Configure a bespoke commission percentage for specific academies. If unset or default, academies inherit the platform default rate ({settings.commission.defaultPercentage}%).
                                    </p>
                                </div>

                                {/* Override form */}
                                {canEdit ? (
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="sm:col-span-2 space-y-1">
                                                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                                                    Select Academy
                                                </label>
                                                <select
                                                    value={selectedAcademyId}
                                                    onChange={(e) => {
                                                        const id = e.target.value;
                                                        setSelectedAcademyId(id);
                                                        const match = academies.find(a => a.tenantId === id);
                                                        setAcademyCommissionInput(match?.commissionRate !== undefined ? String(match.commissionRate) : String(settings.commission.defaultPercentage));
                                                    }}
                                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                                >
                                                    <option value="">-- Choose an academy to customize --</option>
                                                    {academies.map(a => (
                                                        <option key={a.tenantId} value={a.tenantId}>
                                                            {a.name} ({a.academyCode || 'AC'} • Current: {a.commissionRate ?? settings.commission.defaultPercentage}%)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                                                    Custom Rate (%)
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="50"
                                                        step="0.5"
                                                        placeholder="e.g. 8.5"
                                                        value={academyCommissionInput}
                                                        onChange={(e) => setAcademyCommissionInput(e.target.value)}
                                                        disabled={!selectedAcademyId}
                                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-100"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveAcademyCommission}
                                                        disabled={!selectedAcademyId || savingAcademyCommission}
                                                        className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 shrink-0"
                                                    >
                                                        {savingAcademyCommission ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                                        Academy commission rate configuration is available to Super Administrators.
                                    </div>
                                )}

                                {/* Table of existing academy commission rates */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            Partner Academy Commission Directory ({academies.length})
                                        </span>
                                        <div className="relative w-48">
                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                placeholder="Search academy..."
                                                value={academyFilter}
                                                onChange={(e) => setAcademyFilter(e.target.value)}
                                                className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-hidden text-slate-800"
                                            />
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto text-xs">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                                                <tr>
                                                    <th className="p-2.5">Academy</th>
                                                    <th className="p-2.5">Location</th>
                                                    <th className="p-2.5">Status</th>
                                                    <th className="p-2.5 text-right">Commission Rate</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {academies
                                                    .filter(a => !academyFilter || a.name.toLowerCase().includes(academyFilter.toLowerCase()) || (a.location && a.location.toLowerCase().includes(academyFilter.toLowerCase())))
                                                    .map(a => {
                                                        const isCustom = a.commissionRate !== undefined && a.commissionRate !== settings.commission.defaultPercentage;
                                                        return (
                                                            <tr key={a.tenantId} className="hover:bg-slate-50/60">
                                                                <td className="p-2.5 font-medium text-slate-800">
                                                                    {a.name}
                                                                    <span className="block text-[10.5px] text-slate-400 font-mono">{a.academyCode}</span>
                                                                </td>
                                                                <td className="p-2.5 text-slate-500">{a.location || '—'}</td>
                                                                <td className="p-2.5">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                                        a.verificationStatus === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                                                                    }`}>
                                                                        {a.verificationStatus || 'Active'}
                                                                    </span>
                                                                </td>
                                                                <td className="p-2.5 text-right font-mono font-semibold">
                                                                    <span className={isCustom ? 'text-indigo-600 font-bold' : 'text-slate-700'}>
                                                                        {a.commissionRate !== undefined ? `${a.commissionRate}%` : `${settings.commission.defaultPercentage}% (Default)`}
                                                                    </span>
                                                                    {isCustom && <span className="block text-[9.5px] text-indigo-500 font-sans">Custom Override</span>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                {academies.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="p-4 text-center text-slate-400">
                                                            {loadingAcademies ? 'Loading academies...' : 'No academies found.'}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        TAB 3: REGISTRATION & PAYMENT RULES
                       ══════════════════════════════════════════════════ */}
                    {activeTab === 'registration' && (
                        <div className="space-y-6 max-w-3xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Student Registration & Booking Rules</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Configure provisional seat reservation deadlines, payment expiry thresholds, and auto-cancellation logic.
                                    </p>
                                </div>
                                {renderAuditMeta('registration')}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Seat Hold Payment Window (Hours) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="168"
                                        disabled={!canEdit}
                                        value={settings.registration.defaultPaymentWindowHours}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            registration: { ...settings.registration, defaultPaymentWindowHours: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <span className="text-[11px] text-slate-400">
                                        Time allowed to complete payment after academy approval (default: 48 hours).
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Cancellation Notice Prior to Batch Start (Hours)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="72"
                                        disabled={!canEdit}
                                        value={settings.registration.cancellationNoticeHours ?? 24}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            registration: { ...settings.registration, cancellationNoticeHours: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <span className="text-[11px] text-slate-400">
                                        Advance hours required before batch commencement to accept cancellations.
                                    </span>
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Deadline Expiration & Booking Policy <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        disabled={!canEdit}
                                        value={settings.registration.deadlineRules}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            registration: { ...settings.registration, deadlineRules: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <span className="text-[11px] text-slate-400">System rule executed when learner exceeds payment window</span>
                                </div>
                            </div>

                            {/* Auto-cancel switch */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div>
                                    <span className="text-xs font-semibold text-slate-800">Auto-Release Unpaid Seats Upon Window Expiry</span>
                                    <p className="text-[11px] text-slate-500">
                                        Automatically release reserved batch seats back to available capacity when the payment window passes without payment.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        disabled={!canEdit}
                                        checked={settings.registration.autoCancelUnpaid !== false}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            registration: { ...settings.registration, autoCancelUnpaid: e.target.checked }
                                        })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-50"></div>
                                </label>
                            </div>

                            {/* Enforced Rules Callout Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs space-y-1">
                                    <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                        Seat Limit & Capacity Safety
                                    </span>
                                    <p className="text-slate-600 text-[11px] leading-relaxed">
                                        Every registration strictly validates maximum batch capacity and classroom thresholds. Overbooking is programmatically prevented.
                                    </p>
                                </div>
                                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg text-xs space-y-1">
                                    <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        Cryptographic Payment Verification
                                    </span>
                                    <p className="text-slate-600 text-[11px] leading-relaxed">
                                        Registrations are confirmed only via verified Razorpay webhook signatures or verified manual cash/bank receipts.
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="text-xs text-slate-400">
                                    {!canEdit && <span className="flex items-center gap-1 text-slate-500"><Lock className="w-3.5 h-3.5" /> Read-only mode</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={!canEdit || saving}
                                        onClick={() => handleResetSection('registration')}
                                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                                    >
                                        Discard Changes
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canEdit || saving}
                                        onClick={() => handleSaveSection('registration')}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                                    >
                                        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Save Registration Rules
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        TAB 4: CANCELLATION & REFUNDS
                       ══════════════════════════════════════════════════ */}
                    {activeTab === 'cancellation' && (
                        <div className="space-y-6 max-w-3xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Cancellation & Refund Policy Defaults</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Configure baseline refund windows, refund processing SLAs, and academy override permissions.
                                    </p>
                                </div>
                                {renderAuditMeta('cancellation')}
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Standard Platform Cancellation & Refund Terms <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        disabled={!canEdit}
                                        value={settings.cancellation.defaultPolicy}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            cancellation: { ...settings.cancellation, defaultPolicy: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <span className="text-[11px] text-slate-400">Surfaced to learners during course checkout and refund claim submissions</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            Refund Processing SLA (Business Days)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            disabled={!canEdit}
                                            value={settings.cancellation.refundProcessingDays ?? 5}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                cancellation: { ...settings.cancellation, refundProcessingDays: Number(e.target.value) }
                                            })}
                                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                        <span className="text-[11px] text-slate-400">Target SLA to review and disburse approved claims (default: 5 days)</span>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            Platform Administrative Fee Deduction (%)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="15"
                                            step="0.5"
                                            disabled={!canEdit}
                                            value={settings.cancellation.deductionPercentage ?? 0}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                cancellation: { ...settings.cancellation, deductionPercentage: Number(e.target.value) }
                                            })}
                                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                        <span className="text-[11px] text-slate-400">Withheld gateway/admin processing deduction (0% to 15%)</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div>
                                        <span className="text-xs font-semibold text-slate-800">Allow Academy Custom Policy Overrides</span>
                                        <p className="text-[11px] text-slate-500">
                                            Permit verified academies to customize specific refund windows and terms for bespoke programs.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            disabled={!canEdit}
                                            checked={settings.cancellation.allowAcademyOverrides}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                cancellation: { ...settings.cancellation, allowAcademyOverrides: e.target.checked }
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-50"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="text-xs text-slate-400">
                                    {!canEdit && <span className="flex items-center gap-1 text-slate-500"><Lock className="w-3.5 h-3.5" /> Read-only mode</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={!canEdit || saving}
                                        onClick={() => handleResetSection('cancellation')}
                                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                                    >
                                        Discard Changes
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canEdit || saving}
                                        onClick={() => handleSaveSection('cancellation')}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                                    >
                                        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Save Refund Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        TAB 5: PAYOUT & SETTLEMENTS
                       ══════════════════════════════════════════════════ */}
                    {activeTab === 'settlement' && (
                        <div className="space-y-6 max-w-3xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Payout & Settlement Cycles</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Configure automated banking transfer frequencies, fraud holding escrow periods, and threshold limits.
                                    </p>
                                </div>
                                {renderAuditMeta('settlement')}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Automated Release Schedule <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        disabled={!canEdit}
                                        value={settings.settlement.releaseSchedule}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            settlement: { ...settings.settlement, releaseSchedule: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <span className="text-[11px] text-slate-400">e.g. Weekly on Mondays, Bi-weekly on 1st & 16th</span>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Holding Escrow Buffer Period (Days) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="60"
                                        disabled={!canEdit}
                                        value={settings.settlement.payoutHoldingDays}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            settlement: { ...settings.settlement, payoutHoldingDays: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <span className="text-[11px] text-slate-400">Buffer to hold funds before clearing to academy bank (default: 7 days)</span>
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Minimum Accrued Settlement Threshold (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min="100"
                                        max="50000"
                                        step="100"
                                        disabled={!canEdit}
                                        value={settings.settlement.minimumPayoutThreshold ?? 1000}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            settlement: { ...settings.settlement, minimumPayoutThreshold: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <span className="text-[11px] text-slate-400">Balances below this threshold rollover to the next settlement interval</span>
                                </div>
                            </div>

                            {/* Settlement Rules Information */}
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 text-slate-600">
                                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                                    <Landmark className="w-4 h-4 text-indigo-600" />
                                    Statutory Settlement & Banking Rules
                                </span>
                                <ul className="list-disc pl-5 space-y-1 text-[11.5px]">
                                    <li>Automated payouts require verified Bank IFSC, Account Number, and matching PAN on file.</li>
                                    <li>Unsettled student refund claims and pending disputes automatically deduct from the academy&apos;s escrow balance.</li>
                                    <li>Transfers are processed via Razorpay Route / automated NEFT batches without manual file uploads.</li>
                                </ul>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="text-xs text-slate-400">
                                    {!canEdit && <span className="flex items-center gap-1 text-slate-500"><Lock className="w-3.5 h-3.5" /> Read-only mode</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={!canEdit || saving}
                                        onClick={() => handleResetSection('settlement')}
                                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                                    >
                                        Discard Changes
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canEdit || saving}
                                        onClick={() => handleSaveSection('settlement')}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                                    >
                                        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Save Settlement Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        TAB 6: GLOBAL FEATURE FLAGS
                       ══════════════════════════════════════════════════ */}
                    {activeTab === 'features' && (
                        <div className="space-y-6 max-w-3xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Platform Feature Flags</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Instantly toggle platform capabilities across all partner tenancies without downtime.
                                    </p>
                                </div>
                                {renderAuditMeta('features')}
                            </div>

                            <div className="space-y-3">
                                {[
                                    { key: 'enableOnlinePayments', title: 'Online Payments (Razorpay)', desc: 'Allow learners to pay registration and course dues via integrated gateway.' },
                                    { key: 'enableParentPortal', title: 'Parent & Guardian Portal', desc: 'Permit guardians to inspect student progress, attendance, and fee history.' },
                                    { key: 'enableWhitelabel', title: 'Enterprise Whitelabel Custom Domains', desc: 'Enable CNAME mapping and bespoke logo subdomains for enterprise academies.' },
                                    { key: 'enableSms', title: 'Automated SMS Notifications', desc: 'Send real-time SMS alerts via DLT-approved telecommunication gateways.' },
                                ].map((flag) => {
                                    const val = Boolean((settings.features as any)[flag.key]);
                                    return (
                                        <div key={flag.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <div>
                                                <span className="text-xs font-semibold text-slate-800">{flag.title}</span>
                                                <p className="text-[11px] text-slate-500">{flag.desc}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    disabled={!canEdit}
                                                    checked={val}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        features: { ...settings.features, [flag.key]: e.target.checked }
                                                    })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-50"></div>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="text-xs text-slate-400">
                                    {!canEdit && <span className="flex items-center gap-1 text-slate-500"><Lock className="w-3.5 h-3.5" /> Read-only mode</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={!canEdit || saving}
                                        onClick={() => handleResetSection('features')}
                                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                                    >
                                        Discard Changes
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canEdit || saving}
                                        onClick={() => handleSaveSection('features')}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                                    >
                                        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Save Feature Toggles
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}
