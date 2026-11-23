'use client';

import React, { useState, useEffect } from 'react';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import Modal from '@/components/Modal';
import CountryPhoneInput, { COUNTRIES, type CountryOption, validatePhoneNumber } from '@/components/CountryPhoneInput';
import {
    Settings,
    Bell,
    Shield,
    Palette,
    CreditCard,
    Save,
    Upload,
    Check,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Plus,
    Building,
    Clock,
} from 'lucide-react';
import { api, useApi, formatMoney } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useWorkspace, type Workspace } from '@/lib/workspace';

const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
];

const CURRENCY_OPTIONS = [
    { code: 'INR', label: 'INR — Indian Rupee (₹)' },
    { code: 'USD', label: 'USD — US Dollar ($)' },
    { code: 'EUR', label: 'EUR — Euro (€)' },
    { code: 'GBP', label: 'GBP — British Pound (£)' },
    { code: 'AED', label: 'AED — UAE Dirham (د.إ)' },
    { code: 'SGD', label: 'SGD — Singapore Dollar (S$)' },
    { code: 'CAD', label: 'CAD — Canadian Dollar (C$)' },
    { code: 'AUD', label: 'AUD — Australian Dollar (A$)' },
];

function parsePhoneCountryAndNumber(rawPhone?: string): { country: CountryOption; number: string } {
    const defaultCountry = COUNTRIES.find(c => c.code === 'IN') || COUNTRIES[0];
    if (!rawPhone) return { country: defaultCountry, number: '' };
    const cleaned = rawPhone.trim();
    const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const c of sorted) {
        if (cleaned.startsWith(c.dialCode)) {
            const digits = cleaned.slice(c.dialCode.length).replace(/\D/g, '');
            return { country: c, number: digits };
        }
    }
    const digits = cleaned.replace(/\D/g, '');
    return { country: defaultCountry, number: digits };
}

export default function SettingsPage() {
    const { workspace, reload } = useWorkspace();
    return (
        <>
            <Topbar title="Settings" subtitle="Configure your academy profile, branding, and integrations" />
            <div className="page-body">
                {workspace ? <SettingsForm workspace={workspace} onSaved={reload} /> : <PageState error={null} />}
            </div>
        </>
    );
}

function SettingsForm({ workspace, onSaved }: { workspace: Workspace; onSaved: () => void }) {
    const org = workspace.organization;
    const [activeTab, setActiveTab] = useState('general');

    const session = useSession();
    const userRole = session?.session?.role;
    const isAdminOrFinance = Boolean(
        session?.user?.isPlatformAdmin ||
        userRole === 'TenantAdmin' ||
        userRole === 'PlatformAdmin' ||
        userRole === 'Finance'
    );

    // Late Fee Rules State
    const { data: rulesData, reload: reloadRules } = useApi<{
        tenant_rule?: {
            rule_id: string;
            calc_method: 'flat' | 'percent' | 'per_day';
            value: number;
            grace_days: number;
            cap_amount: number | null;
            is_active: boolean;
        } | null;
        branch_rules?: Array<{
            rule_id: string;
            branch_id: string;
            branch_name: string;
            calc_method: 'flat' | 'percent' | 'per_day';
            value: number;
            grace_days: number;
            cap_amount: number | null;
            is_active: boolean;
        }>;
    }>('/billing/late-fee-rules');

    const { data: branches } = useApi<Array<{ branchId: string; name: string }>>('/branches');

    const [ruleBranch, setRuleBranch] = useState<string>(''); // '' for academy default
    const [calcMethod, setCalcMethod] = useState<'flat' | 'percent' | 'per_day'>('flat');
    const [ruleValue, setRuleValue] = useState<string>('200');
    const [graceDays, setGraceDays] = useState<string>('5');
    const [capAmount, setCapAmount] = useState<string>('');
    const [ruleActive, setRuleActive] = useState<boolean>(true);
    const [savingRule, setSavingRule] = useState<boolean>(false);
    const [ruleNotice, setRuleNotice] = useState<string | null>(null);
    const [ruleError, setRuleError] = useState<string | null>(null);

    // Sync selected rule branch with fetched rules
    useEffect(() => {
        if (!rulesData) return;
        if (!ruleBranch) {
            // Academy default
            if (rulesData.tenant_rule) {
                setCalcMethod(rulesData.tenant_rule.calc_method || 'flat');
                setRuleValue(String(rulesData.tenant_rule.value ?? 200));
                setGraceDays(String(rulesData.tenant_rule.grace_days ?? 5));
                setCapAmount(rulesData.tenant_rule.cap_amount !== null && rulesData.tenant_rule.cap_amount !== undefined ? String(rulesData.tenant_rule.cap_amount) : '');
                setRuleActive(rulesData.tenant_rule.is_active ?? true);
            }
        } else {
            // Branch override
            const match = (rulesData.branch_rules || []).find(b => b.branch_id === ruleBranch);
            if (match) {
                setCalcMethod(match.calc_method || 'flat');
                setRuleValue(String(match.value ?? 200));
                setGraceDays(String(match.grace_days ?? 5));
                setCapAmount(match.cap_amount !== null && match.cap_amount !== undefined ? String(match.cap_amount) : '');
                setRuleActive(match.is_active ?? true);
            } else if (rulesData.tenant_rule) {
                setCalcMethod(rulesData.tenant_rule.calc_method || 'flat');
                setRuleValue(String(rulesData.tenant_rule.value ?? 200));
                setGraceDays(String(rulesData.tenant_rule.grace_days ?? 5));
                setCapAmount(rulesData.tenant_rule.cap_amount !== null && rulesData.tenant_rule.cap_amount !== undefined ? String(rulesData.tenant_rule.cap_amount) : '');
                setRuleActive(true);
            }
        }
    }, [ruleBranch, rulesData]);

    const handleSaveRule = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingRule(true);
        setRuleNotice(null);
        setRuleError(null);
        try {
            await api('/billing/late-fee-rules', {
                method: 'PUT',
                body: JSON.stringify({
                    branchId: ruleBranch || null,
                    calcMethod,
                    value: Number(ruleValue || 0),
                    graceDays: Number(graceDays || 0),
                    capAmount: capAmount ? Number(capAmount) : null,
                    isActive: ruleActive,
                }),
            });
            setRuleNotice('Late fee rules updated successfully.');
            reloadRules();
        } catch (err) {
            setRuleError((err as Error).message);
        } finally {
            setSavingRule(false);
        }
    };

    const parsedPhone = parsePhoneCountryAndNumber(org.settings.phone);
    const initialCurrency = (typeof org.currency === 'string' && /^[A-Za-z]{3}$/.test(org.currency.trim()))
        ? org.currency.trim().toUpperCase()
        : 'INR';
    const [general, setGeneral] = useState({
        name: org.name,
        category: org.settings.category ?? '',
        email: org.settings.email ?? '',
        city: org.settings.city ?? '',
        timezone: org.timezone,
        currency: initialCurrency,
    });
    const [phoneCountry, setPhoneCountry] = useState<CountryOption>(parsedPhone.country);
    const [phone, setPhone] = useState(parsedPhone.number);
    const [phoneError, setPhoneError] = useState('');
    const [phoneTouched, setPhoneTouched] = useState(false);

    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [branding, setBranding] = useState({
        primaryColor: org.branding.primaryColor ?? '',
        tagline: org.branding.tagline ?? '',
        logoUrl: org.branding.logoUrl ?? '',
    });
    const [triggers, setTriggers] = useState(org.settings.notificationTriggers ?? []);
    const [status, setStatus] = useState<string | null>(null);

    // Logo is stored with the academy branding as a data URL (max 512 KB)
    const pickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 512 * 1024) {
            setStatus('Logo must be 512 KB or smaller.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setBranding(b => ({ ...b, logoUrl: String(reader.result) }));
            setStatus(null);
        };
        reader.readAsDataURL(file);
    };

    const save = async (payload: object) => {
        setStatus('Saving…');
        try {
            await api('/tenants', { method: 'PUT', body: JSON.stringify(payload) });
            setStatus('Saved.');
            onSaved();
        } catch (err) {
            setStatus((err as Error).message);
        }
    };

    const handleSaveClick = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setActionBanner(null);

        if (!general.name.trim()) {
            setFormError('Academy Name is required.');
            return;
        }

        if (general.email.trim() && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(general.email.trim())) {
            setFormError('Please enter a valid email address.');
            return;
        }

        // Validate mobile phone with country-specific digits (10 digits for India starting with 6-9)
        setPhoneTouched(true);
        const pErr = validatePhoneNumber(phone, phoneCountry, true);
        if (pErr) {
            setPhoneError(pErr);
            setFormError(pErr);
            return;
        }

        setPhoneError('');
        setShowSaveConfirm(true);
    };

    const handleConfirmSave = async () => {
        setSaving(true);
        setFormError(null);
        try {
            const phoneDigits = phone.replace(/\D/g, '');
            const finalPhone = phoneDigits ? `${phoneCountry.dialCode} ${phoneDigits}`.trim() : '';

            await api('/tenants', {
                method: 'PUT',
                body: JSON.stringify({
                    name: general.name.trim(),
                    timezone: general.timezone,
                    currency: general.currency.toUpperCase(),
                    settings: {
                        category: general.category.trim(),
                        email: general.email.trim().toLowerCase(),
                        phone: finalPhone,
                        city: general.city.trim(),
                    },
                }),
            });

            setShowSaveConfirm(false);
            onSaved();
            setActionBanner({ type: 'success', text: 'Academy settings have been saved successfully!' });
        } catch (err) {
            setFormError((err as Error).message || 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* Horizontal Tabs */}
            <div className="tab-list" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setStatus(null);
                                setFormError(null);
                                setActionBanner(null);
                            }}
                            className={`tab-trigger${isActive ? ' active' : ''}`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                fontSize: '13px',
                                fontWeight: isActive ? 700 : 500,
                                color: isActive ? 'var(--cs-primary)' : undefined,
                            }}
                        >
                            <tab.icon size={16} color={isActive ? 'var(--cs-primary)' : undefined} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {activeTab === 'general' && (
                <div className="cs-card" style={{ padding: '24px' }}>
                    <div className="section-title" style={{ marginBottom: '4px' }}>General Settings</div>
                    <div className="section-subtitle" style={{ marginBottom: '24px' }}>
                        Your academy&apos;s basic profile, contact information and configuration
                    </div>

                    {actionBanner && (
                        <div
                            style={{
                                marginBottom: '20px',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: actionBanner.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                                border: `1px solid ${actionBanner.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
                                color: actionBanner.type === 'success' ? '#065F46' : '#991B1B',
                                fontSize: '13px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {actionBanner.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                <span>{actionBanner.text}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActionBanner(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0 4px', fontSize: '14px' }}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {formError && !showSaveConfirm && (
                        <div
                            style={{
                                marginBottom: '20px',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                color: '#B91C1C',
                                fontSize: '13px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            <span>{formError}</span>
                        </div>
                    )}

                    <form onSubmit={handleSaveClick} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '560px' }}>
                        <div>
                            <label className="cs-label">
                                Academy Name <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <input
                                className="cs-input"
                                required
                                placeholder="Academy Name"
                                value={general.name}
                                onChange={e => setGeneral({ ...general, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="cs-label">Class Category</label>
                            <input
                                className="cs-input"
                                placeholder="e.g. Dance Academy, Music, Test Prep"
                                value={general.category}
                                onChange={e => setGeneral({ ...general, category: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="cs-label">Email Address</label>
                            <input
                                className="cs-input"
                                type="email"
                                placeholder="academy@example.com"
                                value={general.email}
                                onChange={e => setGeneral({ ...general, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="cs-label">
                                Mobile Number <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <CountryPhoneInput
                                value={phone}
                                selectedCountry={phoneCountry}
                                onCountryChange={country => {
                                    setPhoneCountry(country);
                                    if (phoneTouched) {
                                        setPhoneError(validatePhoneNumber(phone, country, true));
                                    }
                                }}
                                onChange={(val: string, country: CountryOption) => {
                                    setPhone(val);
                                    if (country) setPhoneCountry(country);
                                    if (phoneTouched) {
                                        setPhoneError(validatePhoneNumber(val, country || phoneCountry, true));
                                    }
                                }}
                                onBlur={() => {
                                    setPhoneTouched(true);
                                    setPhoneError(validatePhoneNumber(phone, phoneCountry, true));
                                }}
                                touched={phoneTouched}
                                error={phoneError}
                                required={true}
                                placeholder="10-digit mobile number"
                            />
                        </div>

                        <div>
                            <label className="cs-label">City / Location</label>
                            <input
                                className="cs-input"
                                placeholder="e.g. Pune, Mumbai, Dhule"
                                value={general.city}
                                onChange={e => setGeneral({ ...general, city: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="cs-label">Timezone (IANA, e.g. Asia/Kolkata)</label>
                            <input
                                className="cs-input"
                                placeholder="Asia/Kolkata"
                                value={general.timezone}
                                onChange={e => setGeneral({ ...general, timezone: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="cs-label">Currency</label>
                            <select
                                className="cs-input"
                                value={general.currency}
                                onChange={e => setGeneral({ ...general, currency: e.target.value })}
                            >
                                {CURRENCY_OPTIONS.map(c => (
                                    <option key={c.code} value={c.code}>
                                        {c.label}
                                    </option>
                                ))}
                                {general.currency && !CURRENCY_OPTIONS.some(c => c.code === general.currency) && (
                                    <option value={general.currency}>
                                        {general.currency}
                                    </option>
                                )}
                            </select>
                        </div>

                        <div style={{ marginTop: '8px' }}>
                            <button
                                type="submit"
                                className="btn-primary"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    height: '38px',
                                    padding: '0 20px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                }}
                            >
                                <Save size={15} /> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Save Changes Confirmation Popup Modal */}
            {showSaveConfirm && (
                <Modal
                    title="Confirm Save Changes"
                    onClose={() => !saving && setShowSaveConfirm(false)}
                    maxWidth="520px"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                background: 'var(--cs-surface-2)',
                                borderRadius: '10px',
                                border: '1px solid var(--cs-border)',
                            }}
                        >
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '10px',
                                    background: 'rgba(79, 70, 229, 0.12)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <Save size={20} color="var(--cs-primary)" />
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--cs-text-primary)' }}>
                                    Update Academy Profile
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>
                                    Review the updated profile details below before applying changes.
                                </div>
                            </div>
                        </div>

                        {formError && (
                            <div
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    color: '#B91C1C',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}
                            >
                                <AlertCircle size={16} />
                                <span>{formError}</span>
                            </div>
                        )}

                        <div
                            style={{
                                background: 'var(--cs-surface)',
                                border: '1px solid var(--cs-border)',
                                borderRadius: '10px',
                                padding: '14px',
                                fontSize: '13px',
                                display: 'grid',
                                gridTemplateColumns: '130px 1fr',
                                rowGap: '10px',
                            }}
                        >
                            <span style={{ color: 'var(--cs-text-muted)' }}>Academy Name:</span>
                            <span style={{ fontWeight: 600 }}>{general.name}</span>

                            <span style={{ color: 'var(--cs-text-muted)' }}>Class Category:</span>
                            <span>{general.category || '—'}</span>

                            <span style={{ color: 'var(--cs-text-muted)' }}>Email Address:</span>
                            <span>{general.email || '—'}</span>

                            <span style={{ color: 'var(--cs-text-muted)' }}>Mobile Number:</span>
                            <span style={{ fontWeight: 600, color: 'var(--cs-primary)', fontFamily: 'monospace' }}>
                                {phoneCountry.flag} {phoneCountry.dialCode} {phone}
                            </span>

                            <span style={{ color: 'var(--cs-text-muted)' }}>City / Location:</span>
                            <span>{general.city || '—'}</span>

                            <span style={{ color: 'var(--cs-text-muted)' }}>Timezone:</span>
                            <span>{general.timezone}</span>

                            <span style={{ color: 'var(--cs-text-muted)' }}>Currency:</span>
                            <span style={{ fontWeight: 600 }}>{general.currency.toUpperCase()}</span>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '10px',
                                paddingTop: '10px',
                                borderTop: '1px solid var(--cs-border)',
                            }}
                        >
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setShowSaveConfirm(false)}
                                disabled={saving}
                                style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleConfirmSave}
                                disabled={saving}
                                style={{
                                    height: '36px',
                                    padding: '0 18px',
                                    fontSize: '13px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={14} className="spin" /> Saving Changes…
                                    </>
                                ) : (
                                    <>
                                        <Check size={14} /> Confirm & Save
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {activeTab === 'branding' && (
                <div className="cs-card" style={{ padding: '20px' }}>
                    <div className="section-title" style={{ marginBottom: '4px' }}>Branding</div>
                    <div className="section-subtitle" style={{ marginBottom: '24px' }}>
                        Your logo and colors appear on the parent portal and academy workspace
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '560px' }}>
                        <div>
                            <label className="cs-label">Academy Logo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div
                                    style={{
                                        width: 96,
                                        height: 96,
                                        borderRadius: '12px',
                                        border: '2px dashed var(--cs-border)',
                                        background: 'var(--cs-surface-2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                    }}
                                >
                                    {branding.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={branding.logoUrl} alt="Academy logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>No logo</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label className="btn-secondary" style={{ fontSize: '13px', cursor: 'pointer' }}>
                                        <Upload size={14} /> Upload logo
                                        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={pickLogo} />
                                    </label>
                                    {branding.logoUrl && (
                                        <button className="btn-ghost" style={{ fontSize: '12px' }} onClick={() => setBranding({ ...branding, logoUrl: '' })}>
                                            Remove logo
                                        </button>
                                    )}
                                    <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>PNG, JPG, WEBP or SVG, up to 512 KB</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="cs-label">Primary Color</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input type="color" value={branding.primaryColor || '#1E3A8A'} onChange={e => setBranding({ ...branding, primaryColor: e.target.value })} />
                                <input className="cs-input" value={branding.primaryColor} onChange={e => setBranding({ ...branding, primaryColor: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="cs-label">Academy Tagline</label>
                            <input className="cs-input" value={branding.tagline} onChange={e => setBranding({ ...branding, tagline: e.target.value })} />
                        </div>
                        <SaveButton status={status} label="Save Branding" onClick={() => save({ branding })} />
                    </div>
                </div>
            )}

            {activeTab === 'notifications' && (
                <div className="cs-card" style={{ padding: '20px' }}>
                    <div className="section-title" style={{ marginBottom: '4px' }}>Notification Settings</div>
                    <div className="section-subtitle" style={{ marginBottom: '24px' }}>
                        Configure channels and triggers for automated messages
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {triggers.length === 0 && <div style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>No notification triggers configured.</div>}
                        {triggers.map((n, i) => (
                            <div
                                key={n.key}
                                style={{
                                    background: 'var(--cs-surface-2)',
                                    border: '1px solid var(--cs-border)',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--cs-text-primary)' }}>{n.label}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginTop: '3px' }}>{n.description}</div>
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                                        {n.channels.map(c => (
                                            <span key={c} className="badge badge-secondary" style={{ fontSize: '10px' }}>
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    aria-label={`Toggle ${n.label}`}
                                    onClick={() => setTriggers(triggers.map((t, j) => (j === i ? { ...t, enabled: !t.enabled } : t)))}
                                    style={{
                                        width: 48,
                                        height: 26,
                                        borderRadius: '13px',
                                        border: 'none',
                                        background: n.enabled ? '#10B981' : 'var(--cs-surface-3)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        flexShrink: 0,
                                    }}
                                >
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 3,
                                            left: n.enabled ? 25 : 3,
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: 'white',
                                            transition: 'left 0.2s',
                                        }}
                                    />
                                </button>
                            </div>
                        ))}
                        {triggers.length > 0 && <SaveButton status={status} label="Save Notifications" onClick={() => save({ settings: { notificationTriggers: triggers } })} />}
                    </div>
                </div>
            )}

            {activeTab === 'payments' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Late Fee Rules Section (Admin / Finance only) */}
                    <div className="cs-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '6px' }}>
                            <div className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={18} color="#6C63FF" /> Late Fee Rules & Overdue Policy
                            </div>
                            <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                                Admin & Finance
                            </span>
                        </div>
                        <div className="section-subtitle" style={{ marginBottom: '20px' }}>
                            Configure automated late fee rules, grace periods, maximum charge caps, and optional branch overrides.
                        </div>

                        {!isAdminOrFinance ? (
                            <div className="alert alert-warning" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={16} /> Only academy administrators and finance managers can configure late fee rules.
                            </div>
                        ) : (
                            <form onSubmit={handleSaveRule} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>
                                {ruleNotice && (
                                    <div className="alert alert-success" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <CheckCircle2 size={16} /> {ruleNotice}
                                    </div>
                                )}
                                {ruleError && (
                                    <div className="alert alert-danger" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertCircle size={16} /> {ruleError}
                                    </div>
                                )}

                                {/* Branch Scope */}
                                <div>
                                    <label className="cs-label">Scope / Branch Target</label>
                                    <select
                                        className="cs-input"
                                        value={ruleBranch}
                                        onChange={e => setRuleBranch(e.target.value)}
                                        style={{ height: '38px' }}
                                    >
                                        <option value="">Academy Default (All Branches)</option>
                                        {(branches || []).map(b => (
                                            <option key={b.branchId} value={b.branchId}>
                                                Branch Override: {b.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div style={{ fontSize: '11.5px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>
                                        {ruleBranch
                                            ? 'Configuring specific rule override for this branch. Invoices for other branches follow Academy Default.'
                                            : 'This default rule applies to all academy branches unless explicitly overridden.'}
                                    </div>
                                </div>

                                {/* Active Toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cs-surface-2)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--cs-border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>Rule Status</div>
                                        <div style={{ fontSize: '11.5px', color: 'var(--cs-text-muted)' }}>Enable or disable automated late fees for this scope</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setRuleActive(!ruleActive)}
                                        style={{
                                            width: 44,
                                            height: 24,
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: ruleActive ? '#10B981' : 'var(--cs-surface-3)',
                                            cursor: 'pointer',
                                            position: 'relative',
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 2,
                                                left: ruleActive ? 22 : 2,
                                                width: 20,
                                                height: 20,
                                                borderRadius: '50%',
                                                background: 'white',
                                                transition: 'left 0.2s',
                                            }}
                                        />
                                    </button>
                                </div>

                                {/* Calculation Method */}
                                <div>
                                    <label className="cs-label">Calculation Method *</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                        {[
                                            { id: 'flat', label: 'Flat Fee', desc: 'Fixed one-time charge once overdue' },
                                            { id: 'percent', label: 'Percentage (%)', desc: 'Percent of original tuition fee' },
                                            { id: 'per_day', label: 'Daily Fee', desc: 'Per overdue day past grace period' },
                                        ].map(m => (
                                            <div
                                                key={m.id}
                                                onClick={() => setCalcMethod(m.id as 'flat' | 'percent' | 'per_day')}
                                                style={{
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    border: calcMethod === m.id ? '2px solid #6C63FF' : '1px solid var(--cs-border)',
                                                    background: calcMethod === m.id ? 'rgba(108, 99, 255, 0.05)' : 'var(--cs-surface-2)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <div style={{ fontWeight: 600, fontSize: '13px', color: calcMethod === m.id ? '#6C63FF' : 'var(--cs-text-primary)' }}>
                                                    {m.label}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>
                                                    {m.desc}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Values and Grace Days */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label className="cs-label">
                                            {calcMethod === 'percent' ? 'Rate Percentage (%) *' : calcMethod === 'per_day' ? 'Fee Per Day (Amount) *' : 'Flat Amount *'}
                                        </label>
                                        <input
                                            className="cs-input"
                                            type="number"
                                            min="0"
                                            step={calcMethod === 'percent' ? '0.1' : '1'}
                                            required
                                            value={ruleValue}
                                            onChange={e => setRuleValue(e.target.value)}
                                            placeholder={calcMethod === 'percent' ? 'e.g. 5' : 'e.g. 200'}
                                        />
                                    </div>

                                    <div>
                                        <label className="cs-label">Grace Period (Days) *</label>
                                        <input
                                            className="cs-input"
                                            type="number"
                                            min="0"
                                            step="1"
                                            required
                                            value={graceDays}
                                            onChange={e => setGraceDays(e.target.value)}
                                            placeholder="e.g. 5"
                                        />
                                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>
                                            Days past due before late fees apply
                                        </div>
                                    </div>
                                </div>

                                {/* Cap Amount */}
                                <div>
                                    <label className="cs-label">Maximum Late Fee Cap (Optional)</label>
                                    <input
                                        className="cs-input"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={capAmount}
                                        onChange={e => setCapAmount(e.target.value)}
                                        placeholder="e.g. 1000 (leave empty for no cap limit)"
                                    />
                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>
                                        Late fees will never exceed this threshold for any single invoice
                                    </div>
                                </div>

                                <div style={{ paddingTop: '8px' }}>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={savingRule}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        {savingRule ? (
                                            <>
                                                <Loader2 size={14} className="spin" /> Saving Rules…
                                            </>
                                        ) : (
                                            <>
                                                <Save size={14} /> Save Late Fee Rule
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Active Branch Overrides Overview */}
                        {rulesData?.branch_rules && rulesData.branch_rules.length > 0 && (
                            <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--cs-border)' }}>
                                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Configured Branch Overrides</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {rulesData.branch_rules.map(b => (
                                        <div
                                            key={b.rule_id}
                                            style={{
                                                background: 'var(--cs-surface-2)',
                                                border: '1px solid var(--cs-border)',
                                                borderRadius: '8px',
                                                padding: '10px 14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <div>
                                                <span style={{ fontWeight: 600, fontSize: '13px' }}>{b.branch_name}</span>
                                                <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginLeft: '10px' }}>
                                                    Method: <strong>{b.calc_method}</strong> • Value: <strong>{b.value}{b.calc_method === 'percent' ? '%' : ''}</strong> • Grace: <strong>{b.grace_days}d</strong> {b.cap_amount ? `• Cap: ${b.cap_amount}` : ''}
                                                </span>
                                            </div>
                                            <span className={`badge ${b.is_active ? 'badge-success' : 'badge-secondary'}`}>
                                                {b.is_active ? 'Active' : 'Disabled'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Payment Gateway Placeholders */}
                    <div className="cs-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '30px', marginBottom: '8px' }}>💳</div>
                        <div className="section-title" style={{ marginBottom: '6px' }}>
                            Online Payment Gateway Settings
                        </div>
                        <div className="section-subtitle">
                            Configure Razorpay and UPI merchant credentials for automatic invoice settlements.
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="cs-card" style={{ padding: '60px 28px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔐</div>
                    <div className="section-title" style={{ marginBottom: '8px' }}>
                        Security Settings
                    </div>
                    <div className="section-subtitle">
                        Coming soon — configure MFA, session policy, login history, and audit retention
                    </div>
                </div>
            )}
        </>
    );
}

function SaveButton({ status, label, onClick }: { status: string | null; label: string; onClick: () => void }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <button className="btn-primary" onClick={onClick}>
                <Save size={15} /> {label}
            </button>
            {status && <span style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>{status}</span>}
        </div>
    );
}
