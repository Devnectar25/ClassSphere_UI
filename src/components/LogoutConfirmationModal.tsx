'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    userName?: string | null;
    userEmail?: string | null;
}

export default function LogoutConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    userName,
    userEmail
}: LogoutConfirmationModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    const initials = userName
        ? userName.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : (userEmail ? userEmail[0].toUpperCase() : 'U');

    return createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
        >
            <div
                style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    maxWidth: '410px',
                    width: '100%',
                    padding: '30px 24px 24px',
                    boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                    position: 'relative',
                    textAlign: 'center',
                    animation: 'modalSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        border: 'none',
                        background: 'transparent',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = '#F1F5F9';
                        e.currentTarget.style.color = '#334155';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#94A3B8';
                    }}
                    title="Close"
                >
                    <X size={18} />
                </button>

                {/* Hero Icon */}
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
                    border: '1px solid #FECACA',
                    color: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px',
                    boxShadow: '0 8px 20px -4px rgba(239, 68, 68, 0.15)'
                }}>
                    <LogOut size={28} strokeWidth={2.2} />
                </div>

                {/* Title & Description */}
                <h3 id="logout-dialog-title" style={{
                    fontSize: '19px',
                    fontWeight: 700,
                    color: '#0F172A',
                    margin: '0 0 8px',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25
                }}>
                    Confirm Logout
                </h3>
                <p style={{
                    fontSize: '13px',
                    color: '#64748B',
                    margin: '0 0 20px',
                    lineHeight: 1.5,
                    padding: '0 8px'
                }}>
                    Are you sure you want to end your session? Any unsaved changes in your current view will be lost.
                </p>

                {/* User Info Capsule */}
                {(userName || userEmail) && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        marginBottom: '22px',
                        textAlign: 'left'
                    }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 3px 8px rgba(79, 70, 229, 0.25)'
                        }}>
                            {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {userName && (
                                <div style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#0F172A',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {userName}
                                </div>
                            )}
                            {userEmail && (
                                <div style={{
                                    fontSize: '12px',
                                    color: '#64748B',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    marginTop: userName ? '1px' : '0'
                                }}>
                                    {userEmail}
                                </div>
                            )}
                        </div>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#10B981',
                            background: '#ECFDF5',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            flexShrink: 0
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                            Online
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '11px 16px',
                            borderRadius: '12px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#475569',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = '#F8FAFC';
                            e.currentTarget.style.borderColor = '#94A3B8';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#CBD5E1';
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        style={{
                            padding: '11px 16px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                            color: '#FFFFFF',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.45)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.35)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <LogOut size={15} />
                        <span>Log Out</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
