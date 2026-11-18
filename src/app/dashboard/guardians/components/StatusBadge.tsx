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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#16A34A',
                                fontSize: '13px',
                                fontWeight: 600,
                            }}
                        >
                            <CheckCircle2 size={13} aria-hidden="true" />
                            <span>Active</span>
                        </div>
                        {relativeLogin && (
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>
                                {relativeLogin}
                            </span>
                        )}
                    </div>
                );

            case 'invited':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#D97706',
                                fontSize: '13px',
                                fontWeight: 500,
                            }}
                        >
                            <Clock size={13} aria-hidden="true" />
                            <span>Invite sent</span>
                        </div>
                        {canManage && onActionClick ? (
                            <button
                                type="button"
                                onClick={onActionClick}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    fontSize: '12px',
                                    color: '#2563EB',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: 'fit-content',
                                    textDecoration: 'none',
                                }}
                            >
                                Resend
                            </button>
                        ) : (
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>Pending</span>
                        )}
                    </div>
                );

            case 'disabled':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#DC2626',
                                fontSize: '13px',
                                fontWeight: 500,
                            }}
                        >
                            <Ban size={13} aria-hidden="true" />
                            <span>Disabled</span>
                        </div>
                    </div>
                );

            case 'none':
            default:
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#6B7280',
                                fontSize: '13px',
                                fontWeight: 500,
                            }}
                        >
                            <UserX size={13} aria-hidden="true" />
                            <span>No login</span>
                        </div>
                        {canManage && onActionClick ? (
                            <button
                                type="button"
                                onClick={onActionClick}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    fontSize: '12px',
                                    color: '#2563EB',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: 'fit-content',
                                    textDecoration: 'none',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '3px 12px',
                        borderRadius: '20px',
                        background: '#FDE8E8',
                        color: '#9B1C1C',
                        fontSize: '12px',
                        fontWeight: 600,
                        width: 'fit-content',
                    }}
                >
                    ₹{amt.toLocaleString('en-IN')} overdue
                </span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    {days} days
                </span>
            </div>
        );
    }

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 12px',
                borderRadius: '20px',
                background: '#DEF7EC',
                color: '#03543F',
                fontSize: '12px',
                fontWeight: 600,
                width: 'fit-content',
            }}
        >
            Paid up
        </span>
    );
}
