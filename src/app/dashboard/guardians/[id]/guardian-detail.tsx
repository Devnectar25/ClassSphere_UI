'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import PageState from '@/components/PageState';
import { useApi, initials, formatDate } from '@/lib/api';
import {
    ArrowLeft,
    Phone,
    Mail,
    Users,
    CreditCard,
    Shield,
    MessageSquare,
    Activity,
    Info,
    Edit3,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import EditGuardianModal from '../components/EditGuardianModal';

interface LinkedStudent {
    studentId: string;
    name: string;
}

interface GuardianDetail {
    guardianId: string;
    firstName: string;
    lastName: string;
    relationship: string;
    phone: string;
    email: string;
    isPrimary: boolean;
    hasPortalAccess: boolean;
    portalEmail: string | null;
    portalLastLogin: string | null;
    payerStatus: string;
    students: LinkedStudent[];
}

const TABS = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'children', label: 'Children', icon: Users },
    { id: 'fees', label: 'Fees', icon: CreditCard },
    { id: 'portal', label: 'Portal access', icon: Shield },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'activity', label: 'Activity', icon: Activity },
] as const;

type TabId = typeof TABS[number]['id'];

export default function GuardianDetailPage({ guardianId }: { guardianId: string }) {
    const { data: guardians, error, reload } = useApi<GuardianDetail[]>('/guardians');
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [isEditing, setIsEditing] = useState(false);
    const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const guardian = guardians?.find(g => g.guardianId === guardianId);
    const fullName = guardian ? `${guardian.firstName} ${guardian.lastName}` : 'Guardian Details';

    return (
        <>
            <Topbar
                title={fullName}
                subtitle="Parent profile, linked student enrollments, fee history and portal credentials"
            />
            <div className="page-body">
                {/* Back button */}
                <div style={{ marginBottom: '8px' }}>
                    <Link
                        href="/dashboard/guardians"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--cs-primary, #4F46E5)',
                            textDecoration: 'none',
                        }}
                    >
                        <ArrowLeft size={16} /> Back to parents & guardians
                    </Link>
                </div>

                {/* Feedback Action Banner */}
                {actionBanner && (
                    <div
                        style={{
                            marginBottom: '16px',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            background: actionBanner.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                            border: `1px solid ${actionBanner.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
                            color: actionBanner.type === 'success' ? '#065F46' : '#991B1B',
                            fontSize: '13px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            animation: 'fadeIn 0.2s ease',
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

                {!guardians ? (
                    <PageState error={error} />
                ) : !guardian ? (
                    <div className="cs-card" style={{ padding: '40px', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                            Parent record not found
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--cs-text-muted)' }}>
                            No guardian found matching ID <code>{guardianId}</code>.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Guardian profile hero card */}
                        <div
                            className="cs-card"
                            style={{
                                padding: '24px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '20px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div
                                    className="avatar-placeholder"
                                    style={{
                                        width: 56,
                                        height: 56,
                                        fontSize: '18px',
                                        fontWeight: 800,
                                        background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
                                        color: '#FFFFFF',
                                    }}
                                >
                                    {initials(fullName)}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--cs-text-primary)' }}>
                                            {fullName}
                                        </h2>
                                        <span className="badge badge-secondary">{guardian.relationship}</span>
                                        {guardian.isPrimary && (
                                            <span className="badge badge-primary">Primary Contact</span>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            marginTop: '6px',
                                            flexWrap: 'wrap',
                                            fontSize: '13px',
                                            color: 'var(--cs-text-muted)',
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Phone size={13} /> {guardian.phone}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Mail size={13} /> {guardian.email}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span
                                    className={`badge ${guardian.hasPortalAccess ? 'badge-success' : 'badge-secondary'}`}
                                    style={{ height: '28px', padding: '0 12px', fontSize: '12px' }}
                                >
                                    <Shield size={13} />
                                    {guardian.hasPortalAccess ? 'Portal active' : 'No portal access'}
                                </span>
                                <span
                                    className={`badge ${guardian.payerStatus === 'Active payer' ? 'badge-success' : guardian.payerStatus === 'Overdue' ? 'badge-danger' : 'badge-warning'}`}
                                    style={{ height: '28px', padding: '0 12px', fontSize: '12px' }}
                                >
                                    {guardian.payerStatus}
                                </span>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setIsEditing(true)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        height: '28px',
                                        padding: '0 12px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Edit3 size={13} color="var(--cs-primary)" /> Edit Profile
                                </button>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="tab-list" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
                            {TABS.map(tab => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`tab-trigger${isActive ? ' active' : ''}`}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 18px',
                                            fontSize: '13px',
                                            fontWeight: isActive ? 700 : 500,
                                            color: isActive ? 'var(--cs-primary)' : undefined,
                                        }}
                                    >
                                        <tab.icon size={15} color={isActive ? 'var(--cs-primary)' : undefined} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content Panels */}
                        {activeTab === 'overview' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                                <div className="cs-card" style={{ padding: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div className="section-title" style={{ margin: 0 }}>
                                            Contact Information
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-ghost"
                                            onClick={() => setIsEditing(true)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                color: 'var(--cs-primary)',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <Edit3 size={13} /> Edit
                                        </button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', fontSize: '13px' }}>
                                        <span style={{ color: 'var(--cs-text-muted)' }}>Full Name:</span>
                                        <span style={{ fontWeight: 600 }}>{fullName}</span>

                                        <span style={{ color: 'var(--cs-text-muted)' }}>Relationship:</span>
                                        <span>{guardian.relationship}</span>

                                        <span style={{ color: 'var(--cs-text-muted)' }}>Mobile Phone:</span>
                                        <span style={{ fontFamily: 'monospace' }}>{guardian.phone}</span>

                                        <span style={{ color: 'var(--cs-text-muted)' }}>Email Address:</span>
                                        <span>{guardian.email}</span>

                                        <span style={{ color: 'var(--cs-text-muted)' }}>Primary Contact:</span>
                                        <span>{guardian.isPrimary ? 'Yes (receives urgent notices)' : 'No'}</span>
                                    </div>
                                </div>

                                <div className="cs-card" style={{ padding: '20px' }}>
                                    <div className="section-title" style={{ marginBottom: '16px' }}>
                                        Linked Students ({guardian.students.length})
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {guardian.students.map(s => (
                                            <div
                                                key={s.studentId}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '10px 14px',
                                                    borderRadius: '8px',
                                                    background: 'var(--cs-surface-2)',
                                                    border: '1px solid var(--cs-border)',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: '11px' }}>
                                                        {initials(s.name)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{s.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>
                                                            Enrolled student
                                                        </div>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/dashboard/students`}
                                                    className="btn-ghost"
                                                    style={{ fontSize: '12px', padding: '4px 8px' }}
                                                >
                                                    View roster
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'children' && (
                            <div className="cs-card" style={{ padding: '20px' }}>
                                <div className="section-title" style={{ marginBottom: '8px' }}>Linked Children</div>
                                <div className="section-subtitle" style={{ marginBottom: '20px' }}>
                                    Enrolled children whose attendance, grade cards and invoices are linked to this parent.
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                    {guardian.students.map(s => (
                                        <div
                                            key={s.studentId}
                                            style={{
                                                padding: '16px',
                                                border: '1px solid var(--cs-border)',
                                                borderRadius: '12px',
                                                background: 'var(--cs-surface)',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                                <div className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: '14px' }}>
                                                    {initials(s.name)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.name}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>
                                                        ID: {s.studentId.slice(0, 8)}...
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <span className="badge badge-success">Enrolled</span>
                                                <span className="badge badge-info">Active Batch</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'fees' && (
                            <div className="cs-card" style={{ padding: '20px' }}>
                                <div className="section-title" style={{ marginBottom: '4px' }}>Fee & Dues History</div>
                                <div className="section-subtitle" style={{ marginBottom: '20px' }}>
                                    Billing status, generated invoice cycles and payment receipts for this family.
                                </div>
                                <div
                                    style={{
                                        padding: '16px',
                                        borderRadius: '12px',
                                        background: 'var(--cs-surface-2)',
                                        border: '1px solid var(--cs-border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '16px',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>Payer Status</div>
                                        <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>
                                            {guardian.payerStatus}
                                        </div>
                                    </div>
                                    <Link href="/dashboard/invoices" className="btn-secondary" style={{ fontSize: '12px' }}>
                                        View Family Invoices
                                    </Link>
                                </div>
                                <p style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', lineHeight: 1.5 }}>
                                    {/* TODO: Backend integration - fetch itemized fee ledger and auto-debit subscriptions for this guardian. */}
                                    Itemized fee ledger and subscription billing records will appear here once connected.
                                </p>
                            </div>
                        )}

                        {activeTab === 'portal' && (
                            <div className="cs-card" style={{ padding: '20px' }}>
                                <div className="section-title" style={{ marginBottom: '4px' }}>Parent Portal Access</div>
                                <div className="section-subtitle" style={{ marginBottom: '20px' }}>
                                    Credential status and security configuration for guardian mobile & web portal.
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '14px', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--cs-text-muted)' }}>Portal Login:</span>
                                    <span style={{ fontWeight: 600 }}>{guardian.hasPortalAccess ? 'Enabled' : 'Disabled / Not Issued'}</span>

                                    <span style={{ color: 'var(--cs-text-muted)' }}>Portal Email:</span>
                                    <span>{guardian.portalEmail || guardian.email}</span>

                                    <span style={{ color: 'var(--cs-text-muted)' }}>Last Sign-in:</span>
                                    <span>
                                        {guardian.portalLastLogin ? formatDate(guardian.portalLastLogin) : 'No sign-ins recorded yet'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {activeTab === 'communication' && (
                            <div className="cs-card" style={{ padding: '30px', textAlign: 'center' }}>
                                <MessageSquare size={36} color="var(--cs-text-muted)" style={{ margin: '0 auto 12px' }} />
                                <div className="section-title" style={{ marginBottom: '6px' }}>Communication Log</div>
                                <p style={{ fontSize: '13px', color: 'var(--cs-text-muted)', maxWidth: '420px', margin: '0 auto' }}>
                                    Automated WhatsApp reminders, SMS broadcasts and emailed fee receipts dispatched to this parent.
                                </p>
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="cs-card" style={{ padding: '30px', textAlign: 'center' }}>
                                <Activity size={36} color="var(--cs-text-muted)" style={{ margin: '0 auto 12px' }} />
                                <div className="section-title" style={{ marginBottom: '6px' }}>Audit & Activity Trail</div>
                                <p style={{ fontSize: '13px', color: 'var(--cs-text-muted)', maxWidth: '420px', margin: '0 auto' }}>
                                    Security log of password resets, profile updates and permission changes.
                                </p>
                            </div>
                        )}

                        {/* Edit Guardian Modal */}
                        {isEditing && guardian && (
                            <EditGuardianModal
                                guardian={{
                                    guardianId: guardian.guardianId,
                                    firstName: guardian.firstName,
                                    lastName: guardian.lastName,
                                    relationship: guardian.relationship,
                                    phone: guardian.phone,
                                    email: guardian.email,
                                    isPrimary: guardian.isPrimary,
                                    students: guardian.students,
                                }}
                                onClose={() => setIsEditing(false)}
                                onSaved={() => {
                                    reload();
                                    setActionBanner({ type: 'success', text: 'Parent profile updated successfully.' });
                                }}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    );
}

