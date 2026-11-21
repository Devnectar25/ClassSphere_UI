'use client';

import React from 'react';
import {
    CheckCircle2,
    Clock,
    UserX,
    Ban,
} from 'lucide-react';
import { PortalStatus } from './types';

interface PortalBadgeProps {
    type: 'portal';
    status: PortalStatus;
    relativeLogin?: string | null;
    onActionClick?: (e: React.MouseEvent) => void;
    canManage?: boolean;
}

interface DuesBadgeProps {
    type: 'dues';
    payerStatus: string;
    dueAmount?: number;
    overdueDays?: number;
}

export type StatusBadgeProps = PortalBadgeProps | DuesBadgeProps;

export default function StatusBadge(props: StatusBadgeProps) {
    if (props.type === 'portal') {
        const { status, relativeLogin, onActionClick, canManage } = props;

        switch (status) {
            case 'active':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={11} aria-hidden="true" />
                            <span>Active</span>
                        </span>
                        {relativeLogin && (
                            <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>
                                {relativeLogin}
                            </span>
                        )}
                    </div>
                );

            case 'invited':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} aria-hidden="true" />
                            <span>Invite sent</span>
                        </span>
                        {canManage && onActionClick ? (
                            <button
                                type="button"
                                onClick={onActionClick}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '2px 0 0 0',
                                    fontSize: '11px',
                                    color: 'var(--cs-primary)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    textDecoration: 'underline',
                                }}
                            >
                                Resend
                            </button>
                        ) : (
                            <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>Pending</span>
                        )}
                    </div>
                );

            case 'disabled':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Ban size={11} aria-hidden="true" />
                            <span>Disabled</span>
                        </span>
                    </div>
                );

            default:
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                        <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <UserX size={11} aria-hidden="true" />
                            <span>No login</span>
                        </span>
                        {canManage && onActionClick ? (
                            <button
                                type="button"
                                onClick={onActionClick}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '2px 0 0 0',
                                    fontSize: '11px',
                                    color: 'var(--cs-primary)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    textDecoration: 'underline',
                                }}
                            >
                                Create login
                            </button>
                        ) : null}
                    </div>
                );
        }
    }

    // type === 'dues'
    const { payerStatus, dueAmount, overdueDays } = props;
    const isOverdue = payerStatus.toLowerCase() === 'overdue' || (dueAmount !== undefined && dueAmount > 0);

    if (isOverdue) {
        const amt = dueAmount || 4500;
        const days = overdueDays || 12;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                <span className="badge badge-danger">
                    ₹{amt.toLocaleString('en-IN')} overdue
                </span>
                <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '2px' }}>
                    {days} days
                </span>
            </div>
        );
    }

    return (
        <span className="badge badge-success">
            ● Paid up
        </span>
    );
}
