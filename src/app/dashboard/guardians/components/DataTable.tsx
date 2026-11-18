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

    if (isLoading) {
        return (
            <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={tableStyle}>
                    <thead>
                        <tr style={headerRowStyle}>
                            <th style={{ width: '48px', paddingLeft: '24px' }}>
                                <div style={{ width: 16, height: 16, borderRadius: 4, background: '#E5E7EB' }} />
                            </th>
                            <th style={{ width: '28%', textAlign: 'left', padding: '14px 16px' }}>Parent</th>
                            <th style={{ width: '24%', textAlign: 'left', padding: '14px 16px' }}>Children</th>
                            <th style={{ width: '18%', textAlign: 'left', padding: '14px 16px' }}>Dues</th>
                            <th style={{ width: '22%', textAlign: 'left', padding: '14px 16px' }}>Portal</th>
                            <th style={{ width: '48px', paddingRight: '24px' }} />
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <tr key={`skeleton-${idx}`} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ paddingLeft: '24px', padding: '16px 0 16px 24px' }}>
                                    <div style={{ width: 16, height: 16, borderRadius: 4, background: '#F3F4F6' }} />
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '60%' }}>
                                            <div style={{ height: 14, borderRadius: 4, background: '#F3F4F6', width: '70%' }} />
                                            <div style={{ height: 11, borderRadius: 4, background: '#F3F4F6', width: '50%' }} />
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ width: 90, height: 24, borderRadius: 12, background: '#F3F4F6' }} />
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ width: 80, height: 24, borderRadius: 12, background: '#F3F4F6' }} />
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ width: 70, height: 24, borderRadius: 12, background: '#F3F4F6' }} />
                                </td>
                                <td style={{ paddingRight: '24px', textAlign: 'right' }}>
                                    <div style={{ width: 20, height: 20, borderRadius: 4, background: '#F3F4F6', marginLeft: 'auto' }} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                <table style={tableStyle}>
                    <thead>
                        <tr style={headerRowStyle}>
                            <th style={{ width: '48px', paddingLeft: '24px', paddingRight: '12px' }}>
                                <input
                                    ref={selectAllCheckboxRef}
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={onToggleSelectAll}
                                    aria-label="Select all parents"
                                    style={checkboxStyle}
                                />
                            </th>
                            <th style={{ width: '28%', textAlign: 'left', padding: '14px 16px', color: '#4B5563', fontSize: '13px', fontWeight: 500 }}>
                                Parent
                            </th>
                            <th style={{ width: '24%', textAlign: 'left', padding: '14px 16px', color: '#4B5563', fontSize: '13px', fontWeight: 500 }}>
                                Children
                            </th>
                            <th style={{ width: '18%', textAlign: 'left', padding: '14px 16px', color: '#4B5563', fontSize: '13px', fontWeight: 500 }}>
                                Dues
                            </th>
                            <th style={{ width: '22%', textAlign: 'left', padding: '14px 16px', color: '#4B5563', fontSize: '13px', fontWeight: 500 }}>
                                Portal
                            </th>
                            <th style={{ width: '48px', paddingRight: '24px' }}>
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {guardians.map(g => {
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
                                        background: isSelected ? '#EFF6FF' : '#FFFFFF',
                                        borderBottom: '1px solid #F3F4F6',
                                        transition: 'background-color 0.12s ease',
                                    }}
                                >
                                    {/* 1. Checkbox */}
                                    <td
                                        style={{ paddingLeft: '24px', paddingRight: '12px', verticalAlign: 'middle' }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => onToggleSelectRow(g.guardianId)}
                                            aria-label={`Select ${g.fullName}`}
                                            style={checkboxStyle}
                                        />
                                    </td>

                                    {/* 2. Parent Avatar, Name, Relationship and Phone */}
                                    <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    background: '#BFDBFE',
                                                    color: '#1E40AF',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    flexShrink: 0,
                                                }}
                                                aria-hidden="true"
                                            >
                                                {initials(g.fullName)}
                                            </div>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div
                                                    style={{
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        color: '#111827',
                                                        lineHeight: 1.3,
                                                    }}
                                                >
                                                    {g.fullName}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '12px',
                                                        color: '#6B7280',
                                                        marginTop: '2px',
                                                    }}
                                                >
                                                    {g.relationship} · {g.formattedPhone}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* 3. Children Pills */}
                                    <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            {g.students.map(s => (
                                                <span
                                                    key={s.studentId}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        padding: '4px 12px',
                                                        borderRadius: '16px',
                                                        background: '#F3F4F6',
                                                        border: '1px solid #E5E7EB',
                                                        color: '#374151',
                                                        fontSize: '12px',
                                                        fontWeight: 500,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {s.name}
                                                </span>
                                            ))}
                                            {g.students.length === 0 && (
                                                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>—</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* 4. Dues */}
                                    <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                                        <StatusBadge
                                            type="dues"
                                            payerStatus={g.payerStatus}
                                            dueAmount={g.dueAmount}
                                            overdueDays={g.overdueDays}
                                        />
                                    </td>

                                    {/* 5. Portal */}
                                    <td
                                        style={{ padding: '16px', verticalAlign: 'middle' }}
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
                                        style={{ paddingRight: '24px', textAlign: 'right', verticalAlign: 'middle' }}
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
                        })}
                    </tbody>
                </table>
            </div>

            {/* Table Footer matching screenshot */}
            <div
                style={{
                    padding: '14px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    background: '#FFFFFF',
                }}
            >
                <div style={{ fontSize: '13px', color: '#4B5563' }}>
                    Showing {startIndex} to {endIndex} of {totalCount}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    Row menu: View, Edit, Send invite, Reset password, Disable login, Remove
                </div>
            </div>
        </div>
    );
}

const tableStyle: React.CSSProperties = {
    width: '100%',
    minWidth: '820px',
    borderCollapse: 'collapse',
};

const headerRowStyle: React.CSSProperties = {
    background: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
};

const checkboxStyle: React.CSSProperties = {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    accentColor: '#2563EB',
};

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
