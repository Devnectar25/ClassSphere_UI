'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import { Settings, Bell, Shield, Palette, CreditCard, Save, Upload } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useWorkspace, type Workspace } from '@/lib/workspace';

const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
    const { workspace, reload } = useWorkspace();
    return (
        <>
            <Topbar title="Settings" subtitle="Configure your academy profile, branding, and integrations" />
            {workspace ? <SettingsForm workspace={workspace} onSaved={reload} /> : <div style={{ padding: '20px' }}><PageState error={null} /></div>}
        </>
    );
}

function SettingsForm({ workspace, onSaved }: { workspace: Workspace; onSaved: () => void }) {
    const org = workspace.organization;
    const [activeTab, setActiveTab] = useState('general');
    const [general, setGeneral] = useState({
        name: org.name,
        category: org.settings.category ?? '',
        email: org.settings.email ?? '',
        phone: org.settings.phone ?? '',
        city: org.settings.city ?? '',
        timezone: org.timezone,
        currency: org.currency,
    });
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
        reader.onload = () => { setBranding(b => ({ ...b, logoUrl: String(reader.result) })); setStatus(null); };
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

    const generalFields: Array<{ key: keyof typeof general; label: string }> = [
        { key: 'name', label: 'Academy Name' },
        { key: 'category', label: 'Class Category' },
        { key: 'email', label: 'Email Address' },
        { key: 'phone', label: 'Mobile Number' },
        { key: 'city', label: 'City / Location' },
        { key: 'timezone', label: 'Timezone (IANA, e.g. Asia/Kolkata)' },
        { key: 'currency', label: 'Currency (ISO code, e.g. INR)' },
    ];

    return (
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px', alignItems: 'start' }}>
            {/* Sidebar */}
            <div className="cs-card" style={{ padding: '12px' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setStatus(null); }}
                        className={`sidebar-link${activeTab === tab.id ? ' active' : ''}`}
                        style={{ width: '100%' }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'general' && (
                <div className="cs-card" style={{ padding: '20px' }}>
                    <div className="section-title" style={{ marginBottom: '4px' }}>General Settings</div>
                    <div className="section-subtitle" style={{ marginBottom: '24px' }}>Your academy&apos;s basic profile and configuration</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '560px' }}>
                        {generalFields.map(field => (
                            <div key={field.key}>
                                <label className="cs-label">{field.label}</label>
                                <input className="cs-input" value={general[field.key]} onChange={e => setGeneral({ ...general, [field.key]: e.target.value })} />
                            </div>
                        ))}
                        <SaveButton status={status} label="Save Changes" onClick={() => save({
                            name: general.name,
                            timezone: general.timezone,
                            currency: general.currency.toUpperCase(),
                            settings: { category: general.category, email: general.email, phone: general.phone, city: general.city },
                        })} />
                    </div>
                </div>
            )}

            {activeTab === 'branding' && (
                <div className="cs-card" style={{ padding: '20px' }}>
                    <div className="section-title" style={{ marginBottom: '4px' }}>Branding</div>
                    <div className="section-subtitle" style={{ marginBottom: '24px' }}>Your logo and colors appear on the parent portal and academy workspace</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '560px' }}>
                        <div>
                            <label className="cs-label">Academy Logo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: 96, height: 96, borderRadius: '12px', border: '2px dashed var(--cs-border)', background: 'var(--cs-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                    {branding.logoUrl
                                        // eslint-disable-next-line @next/next/no-img-element -- logo is a data URL
                                        ? <img src={branding.logoUrl} alt="Academy logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        : <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>No logo</span>}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label className="btn-secondary" style={{ fontSize: '13px', cursor: 'pointer' }}>
                                        <Upload size={14} /> Upload logo
                                        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={pickLogo} />
                                    </label>
                                    {branding.logoUrl && (
                                        <button className="btn-ghost" style={{ fontSize: '12px' }} onClick={() => setBranding({ ...branding, logoUrl: '' })}>Remove logo</button>
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
                    <div className="section-subtitle" style={{ marginBottom: '24px' }}>Configure channels and triggers for automated messages</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {triggers.length === 0 && <div style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>No notification triggers configured.</div>}
                        {triggers.map((n, i) => (
                            <div key={n.key} style={{ background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--cs-text-primary)' }}>{n.label}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginTop: '3px' }}>{n.description}</div>
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                                        {n.channels.map(c => <span key={c} className="badge badge-secondary" style={{ fontSize: '10px' }}>{c}</span>)}
                                    </div>
                                </div>
                                <button
                                    aria-label={`Toggle ${n.label}`}
                                    onClick={() => setTriggers(triggers.map((t, j) => (j === i ? { ...t, enabled: !t.enabled } : t)))}
                                    style={{ width: 48, height: 26, borderRadius: '13px', border: 'none', background: n.enabled ? '#10B981' : 'var(--cs-surface-3)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}
                                >
                                    <div style={{ position: 'absolute', top: 3, left: n.enabled ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                                </button>
                            </div>
                        ))}
                        {triggers.length > 0 && <SaveButton status={status} label="Save Notifications" onClick={() => save({ settings: { notificationTriggers: triggers } })} />}
                    </div>
                </div>
            )}

            {(activeTab === 'payments' || activeTab === 'security') && (
                <div className="cs-card" style={{ padding: '60px 28px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>{activeTab === 'payments' ? '💳' : '🔐'}</div>
                    <div className="section-title" style={{ marginBottom: '8px' }}>
                        {activeTab === 'payments' ? 'Payment Gateway Settings' : 'Security Settings'}
                    </div>
                    <div className="section-subtitle">Coming soon — configure {activeTab === 'payments' ? 'Razorpay/PayU integration, fee convenience charge settings' : 'MFA, session policy, login history, and audit retention'}</div>
                </div>
            )}
        </div>
    );
}

function SaveButton({ status, label, onClick }: { status: string | null; label: string; onClick: () => void }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <button className="btn-primary" onClick={onClick}><Save size={15} /> {label}</button>
            {status && <span style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>{status}</span>}
        </div>
    );
}
