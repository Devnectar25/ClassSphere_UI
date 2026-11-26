'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    ChevronDown, Check, UserX, UserPlus, Search, User, X,
    Shield, Briefcase
} from 'lucide-react';
import { initials } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/session';

export interface StaffDropdownItem {
    userId: string;
    fullName: string;
    role: string;
    email?: string;
    phone?: string | null;
    branchId?: string | null;
    branchName?: string | null;
}

interface BranchManagerDropdownProps {
    selectedUserId: string;
    customName: string;
    isCustomMode: boolean;
    onChange: (userId: string, name: string) => void;
    onToggleCustomMode: (isCustom: boolean) => void;
    staffList?: StaffDropdownItem[] | null;
    currentBranchId?: string;
    placeholder?: string;
}

const ROLE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
    BranchManager: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
    TenantAdmin: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
    Finance: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
    Instructor: { bg: '#EEF2FF', color: '#4F46E5', border: '#C7D2FE' },
    Staff: { bg: '#F0F9FF', color: '#0284C7', border: '#BAE6FD' },
};

export default function BranchManagerDropdown({
    selectedUserId,
    customName,
    isCustomMode,
    onChange,
    onToggleCustomMode,
    staffList = [],
    currentBranchId,
    placeholder = 'No Manager Assigned'
}: BranchManagerDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search on open
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const selectedStaff = useMemo(() => {
        if (!selectedUserId || !staffList) return null;
        return staffList.find(s => s.userId === selectedUserId) || null;
    }, [selectedUserId, staffList]);

    const filteredStaff = useMemo(() => {
        if (!staffList) return [];
        if (!searchQuery.trim()) return staffList;
        const q = searchQuery.toLowerCase().trim();
        return staffList.filter(s =>
            s.fullName.toLowerCase().includes(q) ||
            (s.email && s.email.toLowerCase().includes(q)) ||
            (s.role && s.role.toLowerCase().includes(q)) ||
            (ROLE_LABELS[s.role] && ROLE_LABELS[s.role].toLowerCase().includes(q))
        );
    }, [staffList, searchQuery]);

    // If custom mode is active, render the clean custom input UI
    if (isCustomMode) {
        return (
            <div style={{ position: 'relative', width: '100%' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#FFFFFF',
                    border: '1.5px solid var(--cs-primary, #6C63FF)',
                    borderRadius: '10px',
                    padding: '0 12px',
                    height: '42px',
                    boxShadow: '0 0 0 3px rgba(108, 99, 255, 0.12)',
                    transition: 'all 0.15s ease'
                }}>
                    <User size={16} style={{ color: 'var(--cs-primary, #6C63FF)', marginRight: '10px', flexShrink: 0 }} />
                    <input
                        type="text"
                        value={customName}
                        onChange={e => {
                            const val = e.target.value;
                            const matched = staffList?.find(s => s.fullName.toLowerCase() === val.trim().toLowerCase());
                            onChange(matched?.userId || '', val);
                        }}
                        placeholder="Enter Branch Manager name (e.g. Dr. Rajesh Sharma)"
                        autoFocus
                        style={{
                            width: '100%',
                            border: 'none',
                            outline: 'none',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: 'var(--cs-text-primary, #0F172A)',
                            background: 'transparent'
                        }}
                    />
                    {customName && (
                        <button
                            type="button"
                            onClick={() => onChange('', '')}
                            title="Clear"
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--cs-text-muted, #94A3B8)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '4px',
                    padding: '0 2px'
                }}>
                    <span style={{ fontSize: '11px', color: 'var(--cs-text-muted, #64748B)' }}>
                        Custom manager name (will create or link account automatically)
                    </span>
                    <button
                        type="button"
                        onClick={() => onToggleCustomMode(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--cs-primary, #6C63FF)',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '2px 0'
                        }}
                    >
                        ← Choose from Staff List
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            {/* Custom Styled Trigger Box */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 12px',
                    background: '#FFFFFF',
                    border: isOpen
                        ? '1.5px solid var(--cs-primary, #6C63FF)'
                        : '1px solid var(--cs-border, #E2E8F0)',
                    borderRadius: '10px',
                    boxShadow: isOpen
                        ? '0 0 0 3px rgba(108, 99, 255, 0.12)'
                        : '0 1px 2px rgba(0, 0, 0, 0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    outline: 'none',
                    userSelect: 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
                    {selectedStaff ? (
                        <>
                            <div style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6C63FF 0%, #4F46E5 100%)',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {initials(selectedStaff.fullName)}
                            </div>
                            <span style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'var(--cs-text-primary, #0F172A)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {selectedStaff.fullName}
                            </span>
                            {/* Role Chip */}
                            <span style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '6px',
                                background: ROLE_STYLES[selectedStaff.role]?.bg || '#F1F5F9',
                                color: ROLE_STYLES[selectedStaff.role]?.color || '#475569',
                                border: `1px solid ${ROLE_STYLES[selectedStaff.role]?.border || '#E2E8F0'}`,
                                textTransform: 'capitalize',
                                whiteSpace: 'nowrap'
                            }}>
                                {ROLE_LABELS[selectedStaff.role] || selectedStaff.role}
                            </span>
                        </>
                    ) : customName ? (
                        <>
                            <div style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                background: '#F1F5F9',
                                color: '#475569',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {initials(customName)}
                            </div>
                            <span style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'var(--cs-text-primary, #0F172A)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {customName}
                            </span>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: '#FEF3C7',
                                color: '#B45309',
                                border: '1px solid #FDE68A'
                            }}>
                                Custom Name
                            </span>
                        </>
                    ) : (
                        <>
                            <div style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                background: '#F8FAFC',
                                border: '1px dashed #CBD5E1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <UserX size={13} style={{ color: '#94A3B8' }} />
                            </div>
                            <span style={{ fontSize: '13px', color: 'var(--cs-text-secondary, #64748B)', fontWeight: 500 }}>
                                {placeholder}
                            </span>
                        </>
                    )}
                </div>

                <ChevronDown
                    size={16}
                    style={{
                        color: isOpen ? 'var(--cs-primary, #6C63FF)' : '#94A3B8',
                        flexShrink: 0,
                        marginLeft: '8px',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease'
                    }}
                />
            </button>

            {/* Custom Popover Dropdown Menu */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    background: '#FFFFFF',
                    border: '1px solid var(--cs-border, #E2E8F0)',
                    borderRadius: '12px',
                    boxShadow: '0 14px 30px -4px rgba(15, 23, 42, 0.16), 0 6px 12px -3px rgba(15, 23, 42, 0.08)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'cs-dropdown-in 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {/* Search Input (Shown if staff list has multiple members) */}
                    {(staffList && staffList.length > 2) && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            background: '#F8FAFC',
                            borderBottom: '1px solid #F1F5F9'
                        }}>
                            <Search size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by name or role..."
                                style={{
                                    width: '100%',
                                    border: 'none',
                                    outline: 'none',
                                    background: 'transparent',
                                    fontSize: '12px',
                                    color: '#0F172A',
                                    fontWeight: 500
                                }}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#94A3B8',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        padding: '0 4px'
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    )}

                    {/* Scrollable Options List */}
                    <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '4px' }}>
                        {/* Option 1: No Manager Assigned */}
                        <div
                            onClick={() => {
                                onChange('', '');
                                setIsOpen(false);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: (!selectedUserId && !customName) ? 'rgba(108, 99, 255, 0.08)' : 'transparent',
                                transition: 'background 0.12s ease'
                            }}
                            onMouseEnter={e => {
                                if (selectedUserId || customName) e.currentTarget.style.background = '#F8FAFC';
                            }}
                            onMouseLeave={e => {
                                if (selectedUserId || customName) e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    background: '#F1F5F9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94A3B8'
                                }}>
                                    <UserX size={14} />
                                </div>
                                <div>
                                    <div style={{
                                        fontSize: '12.5px',
                                        fontWeight: 600,
                                        color: (!selectedUserId && !customName) ? 'var(--cs-primary, #6C63FF)' : 'var(--cs-text-primary, #0F172A)'
                                    }}>
                                        No Manager Assigned
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted, #94A3B8)' }}>
                                        Leave branch without a designated manager
                                    </div>
                                </div>
                            </div>
                            {(!selectedUserId && !customName) && (
                                <Check size={15} style={{ color: 'var(--cs-primary, #6C63FF)', flexShrink: 0 }} />
                            )}
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', background: '#F1F5F9', margin: '4px 6px' }} />

                        {/* Staff Members List */}
                        {filteredStaff.length === 0 ? (
                            <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: '12px', color: '#94A3B8' }}>
                                No matching staff members found
                            </div>
                        ) : (
                            filteredStaff.map(s => {
                                const isSelected = selectedUserId === s.userId;
                                const isManagingOther = s.branchId && s.branchId !== currentBranchId && s.branchName;

                                return (
                                    <div
                                        key={s.userId}
                                        onClick={() => {
                                            onChange(s.userId, s.fullName);
                                            setIsOpen(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 10px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            background: isSelected ? 'rgba(108, 99, 255, 0.08)' : 'transparent',
                                            transition: 'background 0.12s ease'
                                        }}
                                        onMouseEnter={e => {
                                            if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                                        }}
                                        onMouseLeave={e => {
                                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                            <div style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #6C63FF 0%, #4F46E5 100%)',
                                                color: '#FFFFFF',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                {initials(s.fullName)}
                                            </div>

                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: isSelected ? 'var(--cs-primary, #6C63FF)' : 'var(--cs-text-primary, #0F172A)'
                                                    }}>
                                                        {s.fullName}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        padding: '1px 6px',
                                                        borderRadius: '4px',
                                                        background: ROLE_STYLES[s.role]?.bg || '#F1F5F9',
                                                        color: ROLE_STYLES[s.role]?.color || '#475569',
                                                        border: `1px solid ${ROLE_STYLES[s.role]?.border || '#E2E8F0'}`
                                                    }}>
                                                        {ROLE_LABELS[s.role] || s.role}
                                                    </span>
                                                </div>

                                                <div style={{
                                                    fontSize: '11px',
                                                    color: 'var(--cs-text-muted, #94A3B8)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    marginTop: '1px'
                                                }}>
                                                    {s.email && <span>{s.email}</span>}
                                                    {isManagingOther && (
                                                        <span style={{ color: '#D97706', fontWeight: 500 }}>
                                                            • Currently: {s.branchName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <Check size={15} style={{ color: 'var(--cs-primary, #6C63FF)', flexShrink: 0, marginLeft: '8px' }} />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Bottom Action: Custom Name Option */}
                    <div style={{
                        padding: '6px 8px',
                        borderTop: '1px solid #F1F5F9',
                        background: '#FAFAFA'
                    }}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                onToggleCustomMode(true);
                            }}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                background: '#FFFFFF',
                                border: '1px dashed #CBD5E1',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--cs-primary, #6C63FF)',
                                transition: 'all 0.15s ease',
                                textAlign: 'left'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'var(--cs-primary, #6C63FF)';
                                e.currentTarget.style.background = 'rgba(108, 99, 255, 0.04)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = '#CBD5E1';
                                e.currentTarget.style.background = '#FFFFFF';
                            }}
                        >
                            <UserPlus size={14} style={{ color: 'var(--cs-primary, #6C63FF)' }} />
                            <span>+ Enter Custom Manager Name Directly...</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
