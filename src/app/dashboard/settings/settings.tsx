'use client';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import { Settings, Palette, Save, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useWorkspace, type Workspace } from '@/lib/workspace';
import CountrySelect from '@/components/CountrySelect';

const tabs = [
    { id: 'general', label: 'Academy Profile & Location', icon: Settings },
    { id: 'branding', label: 'Branding & Visuals', icon: Palette },
];

const CATEGORIES = [
    'Tuition',
    'Music',
    'Sports',
    'Dance',
    'Karate',
    'Art & Craft',
    'Language',
    'Coding & Tech',
    'Academics',
    'Other',
];

export default function SettingsPage() {
    const { workspace, reload } = useWorkspace();
    return (
        <>
            <Topbar title="Academy Settings" subtitle="Manage your academy profile, administrator contact, branch location and branding" />
            <div className="page-body">
                {workspace ? <SettingsForm workspace={workspace} onSaved={reload} /> : <PageState error={null} />}
            </div>
        </>
    );
}

function SettingsForm({ workspace, onSaved }: { workspace: Workspace; onSaved: () => void }) {
    const org = workspace.organization;
    const primaryBranch = workspace.branches.find(b => b.isPrimary) || workspace.branches[0];
    const settings = (org.settings as Record<string, any>) || {};
    const contact = settings.contact || {};

    const [activeTab, setActiveTab] = useState<'general' | 'branding'>('general');
    
    // Properly extract the exact registration data filled during signup
    const [form, setForm] = useState({
        // Administrator Contact
        contactName: contact.name || workspace.actor?.fullName || '',
        email: settings.email || contact.email || workspace.actor?.email || primaryBranch?.email || '',
        phone: settings.phone || contact.phone || primaryBranch?.phone || '',

        // Academy Profile
        name: org.name || '',
        category: org.academyType || settings.category || 'Tuition',

        // Campus & Branch Location
        country: settings.country || primaryBranch?.country || 'India',
        state: settings.state || primaryBranch?.state || '',
        city: settings.city || primaryBranch?.city || '',
        location: settings.location || primaryBranch?.location || '',
        address: settings.address || primaryBranch?.address || '',
    });

    const [branding, setBranding] = useState({
        primaryColor: org.branding?.primaryColor || '#4F46E5',
        tagline: org.branding?.tagline || '',
        logoUrl: org.branding?.logoUrl || '',
    });

    const [status, setStatus] = useState<string | null>(null);
    const [customCountry, setCustomCountry] = useState('');
    const [saving, setSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Logo is stored with the academy branding as a data URL (max 512 KB)
    const pickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 512 * 1024) {
            setStatus('Logo must be 512 KB or smaller.');
            setIsSuccess(false);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => { 
            setBranding(b => ({ ...b, logoUrl: String(reader.result) })); 
            setStatus(null); 
        };
        reader.readAsDataURL(file);
    };

    const saveProfile = async () => {
        if (!form.name.trim()) {
            setStatus('Academy Name is required.');
            setIsSuccess(false);
            return;
        }

        setSaving(true);
        setStatus('Saving changes…');
        setIsSuccess(false);

        try {
            await api('/tenants', {
                method: 'PUT',
                body: JSON.stringify({
                    name: form.name.trim(),
                    settings: {
                        category: form.category.trim(),
                        contact: {
                            name: form.contactName.trim(),
                            email: form.email.trim(),
                            phone: form.phone.trim(),
                        },
                        email: form.email.trim(),
                        phone: form.phone.trim(),
                        country: (form.country === 'Other Country' && customCountry.trim() ? customCountry.trim() : form.country).trim(),
                        state: form.state.trim(),
                        city: form.city.trim(),
                        location: form.location.trim(),
                        address: form.address.trim(),
                    },
                }),
            });
            setStatus('Academy profile & location saved successfully.');
            setIsSuccess(true);
            onSaved();
        } catch (err) {
            setStatus((err as Error).message || 'Failed to save changes.');
            setIsSuccess(false);
        } finally {
            setSaving(false);
        }
    };

    const saveBranding = async () => {
        setSaving(true);
        setStatus('Saving branding…');
        setIsSuccess(false);

        try {
            await api('/tenants', {
                method: 'PUT',
                body: JSON.stringify({ branding }),
            });
            setStatus('Branding saved successfully.');
            setIsSuccess(true);
            onSaved();
        } catch (err) {
            setStatus((err as Error).message || 'Failed to save branding.');
            setIsSuccess(false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Horizontal Tabs */}
            <div className="tab-list" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as 'general' | 'branding'); setStatus(null); }}
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

            {/* TAB 1: ACADEMY PROFILE & LOCATION (Registration Data) */}
            {activeTab === 'general' && (
                <div className="cs-card" style={{ padding: '24px', maxWidth: '780px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Section 1: Administrator Contact */}
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--cs-text-primary)', marginBottom: '4px' }}>
                                Administrator Contact
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginBottom: '14px' }}>
                                Contact details of the primary academy administrator
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                                <div>
                                    <label className="cs-label">Administrator Full Name</label>
                                    <input
                                        className="cs-input"
                                        value={form.contactName}
                                        onChange={e => setForm({ ...form, contactName: e.target.value })}
                                        placeholder="e.g. Aakansha Dhake"
                                    />
                                </div>
                                <div>
                                    <label className="cs-label">Email Address</label>
                                    <input
                                        type="email"
                                        className="cs-input"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        placeholder="admin@academy.com"
                                    />
                                </div>
                                <div>
                                    <label className="cs-label">Mobile Number</label>
                                    <input
                                        type="tel"
                                        className="cs-input"
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                        placeholder="10-digit mobile number"
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ height: '1px', background: 'var(--cs-border)' }} />

                        {/* Section 2: Academy Profile */}
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--cs-text-primary)', marginBottom: '4px' }}>
                                Academy Profile
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginBottom: '14px' }}>
                                Core organization name and instructional category
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                                <div>
                                    <label className="cs-label">Academy Name *</label>
                                    <input
                                        className="cs-input"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="e.g. Apex Music Academy"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="cs-label">Class Category</label>
                                    <select
                                        className="cs-input"
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                    >
                                        {CATEGORIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ height: '1px', background: 'var(--cs-border)' }} />

                        {/* Section 3: Campus & Branch Location */}
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--cs-text-primary)', marginBottom: '4px' }}>
                                Campus & Branch Location
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginBottom: '14px' }}>
                                Physical location and campus address registered for your academy
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                                <div>
                                    <label className="cs-label">Country</label>
                                    <CountrySelect
                                        value={form.country}
                                        onChange={val => {
                                            setForm({ ...form, country: val });
                                            if (val !== 'Other Country') setCustomCountry('');
                                        }}
                                    />
                                    {form.country === 'Other Country' && (
                                        <div style={{ marginTop: '8px' }}>
                                            <input
                                                className="cs-input"
                                                placeholder="Enter country name"
                                                value={customCountry}
                                                onChange={e => setCustomCountry(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="cs-label">State</label>
                                    <input
                                        className="cs-input"
                                        value={form.state}
                                        onChange={e => setForm({ ...form, state: e.target.value })}
                                        placeholder="e.g. Maharashtra"
                                    />
                                </div>
                                <div>
                                    <label className="cs-label">City</label>
                                    <input
                                        className="cs-input"
                                        value={form.city}
                                        onChange={e => setForm({ ...form, city: e.target.value })}
                                        placeholder="e.g. Pune"
                                    />
                                </div>
                                <div>
                                    <label className="cs-label">Location / Area / Landmark</label>
                                    <input
                                        className="cs-input"
                                        value={form.location}
                                        onChange={e => setForm({ ...form, location: e.target.value })}
                                        placeholder="e.g. Hinjewadi Phase 1"
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '14px' }}>
                                <label className="cs-label">Full Street Address</label>
                                <textarea
                                    className="cs-input"
                                    rows={2}
                                    value={form.address}
                                    onChange={e => setForm({ ...form, address: e.target.value })}
                                    placeholder="e.g. 402 Crystal Plaza, Main Road"
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingTop: '10px' }}>
                            <button
                                className="btn-primary"
                                onClick={saveProfile}
                                disabled={saving}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Save size={15} />
                                {saving ? 'Saving…' : 'Save Changes'}
                            </button>
                            {status && (
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: isSuccess ? '#059669' : '#DC2626'
                                }}>
                                    {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                    <span>{status}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: BRANDING */}
            {activeTab === 'branding' && (
                <div className="cs-card" style={{ padding: '24px', maxWidth: '640px' }}>
                    <div className="section-title" style={{ marginBottom: '4px' }}>Academy Branding</div>
                    <div className="section-subtitle" style={{ marginBottom: '24px' }}>Your logo, colors and tagline appear across parent portals and receipts</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label className="cs-label">Academy Logo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: 96,
                                    height: 96,
                                    borderRadius: '12px',
                                    border: '2px dashed var(--cs-border)',
                                    background: 'var(--cs-surface-2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    flexShrink: 0
                                }}>
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
                            <label className="cs-label">Primary Brand Color</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={branding.primaryColor || '#4F46E5'}
                                    onChange={e => setBranding({ ...branding, primaryColor: e.target.value })}
                                    style={{ width: '40px', height: '36px', padding: '2px', borderRadius: '8px', border: '1px solid var(--cs-border)', cursor: 'pointer' }}
                                />
                                <input
                                    className="cs-input"
                                    value={branding.primaryColor}
                                    onChange={e => setBranding({ ...branding, primaryColor: e.target.value })}
                                    style={{ width: '120px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="cs-label">Academy Tagline</label>
                            <input
                                className="cs-input"
                                value={branding.tagline}
                                onChange={e => setBranding({ ...branding, tagline: e.target.value })}
                                placeholder="e.g. Empowering Excellence in Education"
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingTop: '6px' }}>
                            <button
                                className="btn-primary"
                                onClick={saveBranding}
                                disabled={saving}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Save size={15} />
                                {saving ? 'Saving…' : 'Save Branding'}
                            </button>
                            {status && (
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: isSuccess ? '#059669' : '#DC2626'
                                }}>
                                    {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                    <span>{status}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
