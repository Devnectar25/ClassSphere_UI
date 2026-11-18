'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    MoreVertical,
    Eye,
    Edit3,
    Send,
    KeyRound,
    UserX,
    Trash2,
} from 'lucide-react';
import { UIGuardian } from './types';

interface RowActionsMenuProps {
    guardian: UIGuardian;
    canManage: boolean;
    onView: () => void;
    onEdit: () => void;
    onSendInvite: () => void;
    onResetPassword: () => void;
    onDisableLogin: () => void;
    onRemove: () => void;
}

export default function RowActionsMenu({
    guardian,
    canManage,
    onView,
    onEdit,
    onSendInvite,
    onResetPassword,
    onDisableLogin,
    onRemove,
}: RowActionsMenuProps) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Dismiss on outside click
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const handleAction = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        setOpen(false);
        action();
    };

    return (
        <div
            ref={menuRef}
            style={{ position: 'relative', display: 'inline-block' }}
            onClick={e => e.stopPropagation()}
        >
            <button
                type="button"
                onClick={e => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                className="btn-ghost"
                style={{
                    width: '32px',
                    height: '32px',
                    padding: 0,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--cs-text-secondary, #475569)',
                    background: open ? 'var(--cs-surface-dim, #F1F5F9)' : 'transparent',
                }}
                aria-label={`Actions for ${guardian.fullName}`}
                aria-haspopup="true"
                aria-expanded={open}
            >
                <MoreVertical size={16} />
            </button>

            {open && (
                <div
                    role="menu"
                    aria-label={`Menu for ${guardian.fullName}`}
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        marginTop: '4px',
                        minWidth: '180px',
                        background: 'var(--cs-surface, #FFFFFF)',
                        border: '1px solid var(--cs-border, #E2E8F0)',
                        borderRadius: '12px',
                        boxShadow: 'var(--cs-shadow-float)',
                        padding: '6px',
                        zIndex: 50,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        animation: 'fadeIn 0.15s ease',
                    }}
                >
                    <button
                        type="button"
                        role="menuitem"
                        onClick={e => handleAction(e, onView)}
                        style={itemStyle}
                    >
                        <Eye size={14} color="#6C63FF" />
                        <span>View profile</span>
                    </button>

                    {canManage && (
                        <>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={e => handleAction(e, onEdit)}
                                style={itemStyle}
                            >
                                <Edit3 size={14} color="#06B6D4" />
                                <span>Edit details</span>
                            </button>

                            {guardian.portalStatus !== 'active' ? (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={e => handleAction(e, onSendInvite)}
                                    style={itemStyle}
                                >
                                    <Send size={14} color="#10B981" />
                                    <span>Send invite</span>
                                </button>
                            ) : null}

                            <button
                                type="button"
                                role="menuitem"
                                onClick={e => handleAction(e, onResetPassword)}
                                style={itemStyle}
                            >
                                <KeyRound size={14} color="#F59E0B" />
                                <span>Reset password</span>
                            </button>

                            {guardian.portalStatus === 'active' && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={e => handleAction(e, onDisableLogin)}
                                    style={itemStyle}
                                >
                                    <UserX size={14} color="#EF4444" />
                                    <span>Disable login</span>
                                </button>
                            )}

                            <div
                                style={{
                                    height: '1px',
                                    background: 'var(--cs-border, #E2E8F0)',
                                    margin: '4px 0',
                                }}
                            />

                            <button
                                type="button"
                                role="menuitem"
                                onClick={e => handleAction(e, onRemove)}
                                style={{ ...itemStyle, color: 'var(--cs-danger, #EF4444)' }}
                            >
                                <Trash2 size={14} />
                                <span>Remove parent</span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--cs-text-primary, #0F172A)',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.12s ease',
};

