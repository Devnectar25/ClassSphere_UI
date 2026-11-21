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
            <div className="cs-table-container">
                <table className="cs-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                        <tr style={{ background: 'var(--cs-surface-2)' }}>
                            <th style={{ width: '44px', padding: '9px 8px 9px 18px', textAlign: 'center' }}>
                                <input
                                    ref={selectAllCheckboxRef}
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={onToggleSelectAll}
                                    aria-label="Select all parents"
                                    style={{ cursor: 'pointer' }}
                                />
                            </th>
                            <th style={{ width: '28%', padding: '9px 12px' }}>Parent</th>
                            <th style={{ width: '24%', padding: '9px 12px' }}>Children</th>
                            <th style={{ width: '18%', padding: '9px 12px' }}>Dues</th>
                            <th style={{ width: '22%', padding: '9px 12px' }}>Portal</th>
                            <th style={{ width: '8%', padding: '9px 18px 9px 8px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 14px', color: 'var(--cs-text-muted)', fontSize: '13px' }}>
                                    Loading parents and guardians…
                                </td>
                            </tr>
                        ) : guardians.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 14px', color: 'var(--cs-text-muted)', fontSize: '13px' }}>
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
                                            background: isSelected ? 'rgba(79, 70, 229, 0.05)' : undefined,
                                            transition: 'background 0.15s',
                                        }}
                                    >
                                        {/* 1. Checkbox */}
                                        <td
                                            style={{ padding: '9px 8px 9px 18px', textAlign: 'center', verticalAlign: 'middle' }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onToggleSelectRow(g.guardianId)}
                                                aria-label={`Select ${g.fullName}`}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </td>

                                        {/* 2. Parent Avatar, Name, Relationship and Phone */}
                                        <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div
                                                    className="avatar-placeholder"
                                                    style={{ width: 32, height: 32, fontSize: '11px', flexShrink: 0 }}
                                                    aria-hidden="true"
                                                >
                                                    {initials(g.fullName)}
                                                </div>
                                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                                    <div
                                                        style={{
                                                            fontSize: '13px',
                                                            fontWeight: 600,
                                                            color: 'var(--cs-text-primary)',
                                                            lineHeight: 1.3,
                                                        }}
                                                    >
                                                        {g.fullName}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '11px',
                                                            color: 'var(--cs-text-muted)',
                                                            marginTop: '2px',
                                                            lineHeight: 1.25,
                                                        }}
                                                    >
                                                        {g.relationship} · {g.formattedPhone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 3. Children Pills */}
                                        <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                {g.students.map(s => (
                                                    <span
                                                        key={s.studentId}
                                                        className="badge badge-primary"
                                                        style={{
                                                            fontSize: '11px',
                                                            padding: '3px 8px',
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
                                        <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                                            <StatusBadge
                                                type="dues"
                                                payerStatus={g.payerStatus}
                                                dueAmount={g.dueAmount}
                                                overdueDays={g.overdueDays}
                                            />
                                        </td>

                                        {/* 5. Portal */}
                                        <td
                                            style={{ padding: '9px 12px', verticalAlign: 'middle' }}
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
                                            style={{ padding: '9px 18px 9px 8px', textAlign: 'center', verticalAlign: 'middle' }}
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
                    padding: '12px 20px',
                    borderTop: '1px solid var(--cs-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    fontSize: '12px',
                    color: 'var(--cs-text-secondary)',
                    background: 'var(--cs-surface)',
                }}
            >
                <div>
                    Showing {guardians.length === 0 ? 0 : startIndex} to {endIndex} of {totalCount}
                </div>
                <div style={{ color: 'var(--cs-text-muted)' }}>
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
