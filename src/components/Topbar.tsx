'use client';
import { Bell, Search, Plus, ChevronDown } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { initials } from '@/lib/api';
import { ROLE_LABELS, useSession } from '@/lib/session';

interface TopbarProps {
    title: string;
    subtitle?: string;
    action?: { label: string; onClick: () => void };
}

export default function Topbar({ title, subtitle, action }: TopbarProps) {
    const { workspace } = useWorkspace();
    const session = useSession();
    const userName = session?.user.fullName ?? '';
    const branchView = session?.session.branchId ?? session?.selectedBranchId;
    const scope = branchView ? workspace?.branches.find(b => b.branchId === branchView)?.name : 'All branches';
    const actorLabel = [ROLE_LABELS[session?.session.role ?? ''], scope].filter(Boolean).join(' • ');

    return (
        <header style={{
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
            <div style={{ minWidth: 0 }}>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px', fontWeight: 800, color: 'var(--cs-text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
                {subtitle && <p style={{ fontSize: '13px', color: 'var(--cs-text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</p>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                {/* Search */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)',
                    borderRadius: '10px', padding: '8px 14px', width: '180px'
                }}>
                    <Search size={15} color="var(--cs-text-muted)" />
                    <input
                        placeholder="Search anything..."
                        style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--cs-text-primary)', fontSize: '13px', width: '100%', fontFamily: 'inherit' }}
                    />
                </div>

                {/* Notifications */}
                <button style={{
                    width: 40, height: 40, borderRadius: '10px',
                    background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)',
                    cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--cs-text-secondary)', transition: 'all 0.2s'
                }}>
                    <Bell size={18} />
                </button>

                {/* Action button */}
                {action && (
                    <button className="btn-primary" onClick={action.onClick} style={{ whiteSpace: 'nowrap' }}>
                        <Plus size={16} />
                        {action.label}
                    </button>
                )}

                {/* User profile */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'var(--cs-surface-2)', border: '1px solid var(--cs-border)',
                    borderRadius: '10px', padding: '6px 12px', cursor: 'pointer',
                    transition: 'all 0.2s'
                }}>
                    <div className="avatar-placeholder" style={{ width: 30, height: 30, fontSize: '12px' }}>{initials(userName)}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cs-text-primary)' }}>{userName}</span>
                        <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', whiteSpace: 'nowrap' }}>{actorLabel}</span>
                    </div>
                    <ChevronDown size={14} color="var(--cs-text-muted)" />
                </div>
            </div>
        </header>
    );
}
