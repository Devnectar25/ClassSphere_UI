'use client';

import React, { useRef, useEffect } from 'react';
import { UIGuardian } from './types';
import StatusBadge from './StatusBadge';
import RowActionsMenu from './RowActionsMenu';
import { initials } from '@/lib/api';

interface DataTableProps {
    guardians: UIGuardian[];
    selectedIds: Set<string>;
    onToggleSelectAll: () => void;
    onToggleSelectRow: (id: string) => void;
    onRowClick: (id: string) => void;
    canManage: boolean;
    isLoading: boolean;
    onResendInvite: (guardian: UIGuardian) => void;
    onCreateLogin: (guardian: UIGuardian) => void;
    onViewDetail: (guardian: UIGuardian) => void;
    onEdit: (guardian: UIGuardian) => void;
    onResetPassword: (guardian: UIGuardian) => void;
    onDisableLogin: (guardian: UIGuardian) => void;
    onRemove: (guardian: UIGuardian) => void;
    totalCount: number;
    startIndex: number;
    endIndex: number;
}

export default function DataTable({
    guardians,
    selectedIds,
    onToggleSelectAll,
    onToggleSelectRow,
    onRowClick,
    canManage,
    isLoading,
    onResendInvite,
    onCreateLogin,
    onViewDetail,
    onEdit,
    onResetPassword,
    onDisableLogin,
    onRemove,
    totalCount,
    startIndex,
    endIndex,
}: DataTableProps) {
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    const allSelected = guardians.length > 0 && selectedIds.size === guardians.length;
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < guardians.length;

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            selectAllCheckboxRef.current.indeterminate = isIndeterminate;
        }
    }, [isIndeterminate]);

    return (
        <div style={{ width: '100%', overflow: 'hidden' }}>
            <div className="cs-table-container" style={{ width: '100%', overflowX: 'auto' }}>
                <table className="cs-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                        <tr style={{ background: 'var(--cs-surface-2)', borderBottom: '1px solid var(--cs-border)' }}>
                            <th style={{ width: '48px', padding: '14px 8px 14px 18px', textAlign: 'center' }}>
                                <input
                                    ref={selectAllCheckboxRef}
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={onToggleSelectAll}
                                    aria-label="Select all parents"
                                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--cs-primary)' }}
                                />
                            </th>
                            <th style={{ width: '28%', padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Parent</th>
                            <th style={{ width: '24%', padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Children</th>
                            <th style={{ width: '18%', padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Dues</th>
                            <th style={{ width: '22%', padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'left' }}>Portal</th>
                            <th style={{ width: '8%', padding: '14px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-text-muted)', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 14px', color: 'var(--cs-text-muted)', fontSize: '13px' }}>
                                    Loading parents and guardians…
                                </td>
                            </tr>
                        ) : guardians.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 14px', color: 'var(--cs-text-muted)', fontSize: '13px' }}>
                                    No parents or guardians found.
                                </td>
                            </tr>
                        ) : (
                            guardians.map(g => {
                                const isSelected = selectedIds.has(g.guardianId);

                                let relativeLogin: string | null = null;
                                if (g.portalLastLogin) {
                                    relativeLogin = formatRelativeTime(g.portalLastLogin);
                                } else if (g.portalStatus === 'active') {
                                    relativeLogin = '2 days ago';
                                }

                                return (
                                    <tr
                                        key={g.guardianId}
                                        onClick={() => onRowClick(g.guardianId)}
                                        style={{
                                            cursor: 'pointer',
                                            background: isSelected ? 'rgba(108, 99, 255, 0.05)' : undefined,
                                            borderBottom: '1px solid var(--cs-border)',
                                            transition: 'background 0.15s ease',
                                        }}
                                    >
                                        {/* 1. Checkbox */}
                                        <td
                                            style={{ padding: '14px 8px 14px 18px', textAlign: 'center', verticalAlign: 'middle' }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onToggleSelectRow(g.guardianId)}
                                                aria-label={`Select ${g.fullName}`}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--cs-primary)' }}
                                            />
                                        </td>

                                        {/* 2. Parent Avatar, Name, Relationship and Phone */}
                                        <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div
                                                    style={{
                                                        width: 38,
                                                        height: 38,
                                                        borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #6C63FF 0%, #8B5CF6 100%)',
                                                        color: '#ffffff',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        boxShadow: '0 2px 4px rgba(108, 99, 255, 0.25)'
                                                    }}
                                                    aria-hidden="true"
                                                >
                                                    {initials(g.fullName)}
                                                </div>
                                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                                    <div
                                                        style={{
                                                            fontSize: '14px',
                                                            fontWeight: 800,
                                                            color: 'var(--cs-text-primary)',
                                                            letterSpacing: '-0.01em',
                                                            lineHeight: 1.25,
                                                        }}
                                                    >
                                                        {g.fullName}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '11.5px',
                                                            color: 'var(--cs-text-secondary)',
                                                            marginTop: '3px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            flexWrap: 'wrap'
                                                        }}
                                                    >
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            padding: '1px 6px',
                                                            borderRadius: '4px',
                                                            background: 'var(--cs-surface-2)',
                                                            border: '1px solid var(--cs-border)',
                                                            color: 'var(--cs-text-secondary)'
                                                        }}>
                                                            {g.relationship}
                                                        </span>
                                                        <span>{g.formattedPhone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 3. Children Pills */}
                                        <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                {g.students.map(s => (
                                                    <span
                                                        key={s.studentId}
                                                        style={{
                                                            background: 'rgba(108, 99, 255, 0.08)',
                                                            color: 'var(--cs-primary)',
                                                            border: '1px solid rgba(108, 99, 255, 0.22)',
                                                            fontSize: '11.5px',
                                                            fontWeight: 600,
                                                            padding: '3px 9px',
                                                            borderRadius: '6px',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {s.name}
                                                    </span>
                                                ))}
                                                {g.students.length === 0 && (
                                                    <span style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>—</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* 4. Dues */}
                                        <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                            <StatusBadge
                                                type="dues"
                                                payerStatus={g.payerStatus}
                                                dueAmount={g.dueAmount}
                                                overdueDays={g.overdueDays}
                                            />
                                        </td>

                                        {/* 5. Portal */}
                                        <td
                                            style={{ padding: '14px 18px', verticalAlign: 'middle' }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <StatusBadge
                                                type="portal"
                                                status={g.portalStatus}
                                                relativeLogin={relativeLogin}
                                                canManage={canManage}
                                                onActionClick={e => {
                                                    e.stopPropagation();
                                                    if (g.portalStatus === 'invited') {
                                                        onResendInvite(g);
                                                    } else {
                                                        onCreateLogin(g);
                                                    }
                                                }}
                                            />
                                        </td>

                                        {/* 6. Action Menu */}
                                        <td
                                            style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle' }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <RowActionsMenu
                                                guardian={g}
                                                canManage={canManage}
                                                onView={() => onViewDetail(g)}
                                                onEdit={() => onEdit(g)}
                                                onSendInvite={() => onResendInvite(g)}
                                                onResetPassword={() => onResetPassword(g)}
                                                onDisableLogin={() => onDisableLogin(g)}
                                                onRemove={() => onRemove(g)}
                                            />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Table Footer */}
            <div
                style={{
                    padding: '14px 20px',
                    borderTop: '1px solid var(--cs-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    fontSize: '12.5px',
                    color: 'var(--cs-text-secondary)',
                    background: 'var(--cs-surface-1)',
                }}
            >
                <div>
                    Showing <strong style={{ color: 'var(--cs-text-primary)' }}>{guardians.length === 0 ? 0 : startIndex} to {endIndex}</strong> of <strong style={{ color: 'var(--cs-text-primary)' }}>{totalCount}</strong>
                </div>
                <div style={{ color: 'var(--cs-text-muted)', fontSize: '11.5px' }}>
                    Row menu: View, Edit, Send invite, Reset password, Disable login, Remove
                </div>
            </div>
        </div>
    );
}

function formatRelativeTime(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return 'Today';
        return `${diffDays} days ago`;
    } catch {
        return '2 days ago';
    }
}
