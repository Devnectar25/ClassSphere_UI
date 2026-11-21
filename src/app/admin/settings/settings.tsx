'use client';

import { useState, useEffect } from 'react';
import {
    Settings, Percent, ClipboardList, RotateCcw, Landmark,
    Building, ToggleLeft, ToggleRight, Save, RefreshCw, CheckCircle2,
    AlertCircle, Undo, Sliders, ShieldCheck
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
    };
    cancellation: {
        defaultPolicy: string;
        allowAcademyOverrides: boolean;
    };
    settlement: {
        releaseSchedule: string;
        payoutHoldingDays: number;
    };
    general: {
        platformName: string;
        supportEmail: string;
        contactNumber: string;
        address: string;
    };
    features: {
        enableOnlinePayments: boolean;
        enableParentPortal: boolean;
        enableWhitelabel: boolean;
        enableSms: boolean;
    };
}

export default function PlatformAdminSettingsPage() {
    const [settings, setSettings] = useState<PlatformSettingsMap | null>(null);
    const [originalSettings, setOriginalSettings] = useState<PlatformSettingsMap | null>(null);
    const [activeTab, setActiveTab] = useState<'commission' | 'registration' | 'cancellation' | 'settlement' | 'general' | 'features'>('commission');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
        } catch (err: any) {
            showToast(err?.message || 'Failed to load platform settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSaveSection = async (key: keyof PlatformSettingsMap) => {
        if (!settings) return;
        try {
            setSaving(true);
            await api('/platform/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    key,
                    value: settings[key],
                }),
            });
            showToast(`Platform ${key} configuration saved and activated.`);
            setOriginalSettings(JSON.parse(JSON.stringify(settings)));
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

    const tabs = [
        { key: 'commission', label: 'Commission & Taxes', icon: Percent },
        { key: 'registration', label: 'Registration Rules', icon: ClipboardList },
        { key: 'cancellation', label: 'Cancellation & Refunds', icon: RotateCcw },
        { key: 'settlement', label: 'Payout Schedules', icon: Landmark },
        { key: 'general', label: 'Platform Profile', icon: Building },
        { key: 'features', label: 'Global Feature Toggles', icon: Sliders },
    ];

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
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Configuration & Controls</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Control global platform commission cuts, automated settlement intervals, registration policies, and feature flags.
                    </p>
                </div>
                <button
                    onClick={fetchSettings}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Reload Settings
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 flex-wrap pb-1">
                {tabs.map((t) => {
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
                    {/* Tab 1: Commission */}
                    {activeTab === 'commission' && (
                        <div className="space-y-6 max-w-2xl">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Platform Commission & Tax Rates</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Set the standard take-rate applied to all coarse fee transactions across academies.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Default Platform Commission (%)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        step="0.5"
                                        value={settings.commission.defaultPercentage}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            commission: { ...settings.commission, defaultPercentage: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                    />
                                    <span className="text-[11px] text-slate-400">Standard ClassSphere cut (default: 10%)</span>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        GST Tax on Platform Commission (%)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        step="1"
                                        value={settings.commission.taxOnCommission}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            commission: { ...settings.commission, taxOnCommission: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                    />
                                    <span className="text-[11px] text-slate-400">Statutory GST on platform service fee (18%)</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => handleResetSection('commission')}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    onClick={() => handleSaveSection('commission')}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                                >
                                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save Commission Rates
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Registration Rules */}
                    {activeTab === 'registration' && (
                        <div className="space-y-6 max-w-2xl">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Student Registration & Booking Rules</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Define payment reservation validity and automated expiration thresholds.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Seat Hold Payment Window (Hours)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="168"
                                        value={settings.registration.defaultPaymentWindowHours}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            registration: { ...settings.registration, defaultPaymentWindowHours: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                    />
                                    <span className="text-[11px] text-slate-400">
                                        Time allowed for learner to complete payment after initial booking (default: 48 hours).
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Deadline Expiry Policy
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.registration.deadlineRules}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            registration: { ...settings.registration, deadlineRules: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => handleResetSection('registration')}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    onClick={() => handleSaveSection('registration')}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                                >
                                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save Registration Rules
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Cancellation & Refunds */}
                    {activeTab === 'cancellation' && (
                        <div className="space-y-6 max-w-2xl">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Cancellation & Refund Policy Defaults</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Configure platform refund baselines and override permissions for individual academy tenancies.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Standard Platform Cancellation Terms
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={settings.cancellation.defaultPolicy}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            cancellation: { ...settings.cancellation, defaultPolicy: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div>
                                        <span className="text-xs font-semibold text-slate-800">Allow Academy Custom Policy Overrides</span>
                                        <p className="text-[11px] text-slate-500">
                                            Allow verified academies to set stricter or more lenient cancellation windows.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.cancellation.allowAcademyOverrides}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                cancellation: { ...settings.cancellation, allowAcademyOverrides: e.target.checked }
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => handleResetSection('cancellation')}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    onClick={() => handleSaveSection('cancellation')}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                                >
                                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save Refund Settings
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Settlement Schedules */}
                    {activeTab === 'settlement' && (
                        <div className="space-y-6 max-w-2xl">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Payout & Settlement Cycles</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Configure banking transfer frequencies and fraud escrow holding periods.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Automated Release Schedule
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.settlement.releaseSchedule}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            settlement: { ...settings.settlement, releaseSchedule: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                    />
                                    <span className="text-[11px] text-slate-400">e.g. Weekly on Mondays</span>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Holding Escrow Period (Days)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={settings.settlement.payoutHoldingDays}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            settlement: { ...settings.settlement, payoutHoldingDays: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                    />
                                    <span className="text-[11px] text-slate-400">Days to hold funds before clearing to bank (default: 7)</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => handleResetSection('settlement')}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    onClick={() => handleSaveSection('settlement')}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                                >
                                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save Settlement Settings
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tab 5: General Platform Profile */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 max-w-2xl">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Platform Identity & Contact Channels</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Contact channels surfaced in user emails, invoices, and payment receipts.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Platform Branding Name
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.general.platformName}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            general: { ...settings.general, platformName: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Official Support Email
                                    </label>
                                    <input
                                        type="email"
                                        value={settings.general.supportEmail}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            general: { ...settings.general, supportEmail: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Contact Phone Line
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.general.contactNumber}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            general: { ...settings.general, contactNumber: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Registered Business Headquarters
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.general.address}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            general: { ...settings.general, address: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => handleResetSection('general')}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    onClick={() => handleSaveSection('general')}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                                >
                                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save Platform Profile
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tab 6: Feature Controls */}
                    {activeTab === 'features' && (
                        <div className="space-y-6 max-w-2xl">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Platform Feature Flags</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Instantly enable or isolate platform capability modules across all active tenancies.
                                </p>
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
                                                    checked={val}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        features: { ...settings.features, [flag.key]: e.target.checked }
                                                    })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => handleResetSection('features')}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    onClick={() => handleSaveSection('features')}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                                >
                                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save Feature Toggles
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
