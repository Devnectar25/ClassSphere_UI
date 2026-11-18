'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface BatchOption {
    batchId: string;
    name: string;
    courseTitle?: string;
}

interface FilterBarProps {
    search: string;
    onSearchChange: (val: string) => void;
    payerFilter: string;
    onPayerFilterChange: (val: string) => void;
    loginFilter: string;
    onLoginFilterChange: (val: string) => void;
    batchFilter: string;
    onBatchFilterChange: (val: string) => void;
    batches?: BatchOption[];
    onReset: () => void;
    totalResults: number;
}

export default function FilterBar({
    search,
    onSearchChange,
    payerFilter,
    onPayerFilterChange,
    loginFilter,
    onLoginFilterChange,
    batchFilter,
    onBatchFilterChange,
    batches = [],
    onReset,
}: FilterBarProps) {
    const [prevSearch, setPrevSearch] = useState(search);
    const [localSearch, setLocalSearch] = useState(search);
    const [, startTransition] = useTransition();

    if (search !== prevSearch) {
        setPrevSearch(search);
        setLocalSearch(search);
    }

    // Debounce search by 300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== search) {
                startTransition(() => {
                    onSearchChange(localSearch);
                });
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [localSearch, search, onSearchChange]);

    const isFiltered =
        Boolean(search) ||
        payerFilter !== 'all' ||
        loginFilter !== 'all' ||
        batchFilter !== 'all';

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
                width: '100%',
            }}
        >
            {/* Search Input */}
            <div
                style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    flex: '1 1 300px',
                    minWidth: '240px',
                    height: '40px',
                    background: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '0 12px',
                    boxSizing: 'border-box',
                }}
            >
                <Search
                    size={16}
                    color="#6B7280"
                    style={{ flexShrink: 0, marginRight: '8px' }}
                    aria-hidden="true"
                />
                <input
                    type="text"
                    aria-label="Search parent, child or phone"
                    placeholder="Search parent, child or phone"
                    value={localSearch}
                    onChange={e => setLocalSearch(e.target.value)}
                    style={{
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '13px',
                        color: '#111827',
                    }}
                />
                {localSearch && (
                    <button
                        type="button"
                        onClick={() => {
                            setLocalSearch('');
                            onSearchChange('');
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '2px',
                            cursor: 'pointer',
                            color: '#9CA3AF',
                        }}
                        aria-label="Clear search"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Dropdown Filters on Right */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                }}
            >
                {/* Payer dropdown */}
                <div style={{ position: 'relative' }}>
                    <select
                        aria-label="Filter by payer status"
                        value={payerFilter}
                        onChange={e => onPayerFilterChange(e.target.value)}
                        style={dropdownStyle}
                    >
                        <option value="all">Payer: All</option>
                        <option value="paid">Payer: Paid up</option>
                        <option value="overdue">Payer: Overdue</option>
                        <option value="pending">Payer: Pending</option>
                    </select>
                    <ChevronDown
                        size={14}
                        color="#6B7280"
                        style={{ position: 'absolute', right: '10px', top: '13px', pointerEvents: 'none' }}
                    />
                </div>

                {/* Login dropdown */}
                <div style={{ position: 'relative' }}>
                    <select
                        aria-label="Filter by portal login status"
                        value={loginFilter}
                        onChange={e => onLoginFilterChange(e.target.value)}
                        style={dropdownStyle}
                    >
                        <option value="all">Login: All</option>
                        <option value="active">Login: Active</option>
                        <option value="invited">Login: Invite sent</option>
                        <option value="none">Login: No login</option>
                        <option value="disabled">Login: Disabled</option>
                    </select>
                    <ChevronDown
                        size={14}
                        color="#6B7280"
                        style={{ position: 'absolute', right: '10px', top: '13px', pointerEvents: 'none' }}
                    />
                </div>

                {/* Batch dropdown */}
                <div style={{ position: 'relative' }}>
                    <select
                        aria-label="Filter by batch"
                        value={batchFilter}
                        onChange={e => onBatchFilterChange(e.target.value)}
                        style={dropdownStyle}
                    >
                        <option value="all">Batch</option>
                        {batches.map(b => (
                            <option key={b.batchId} value={b.batchId}>
                                {b.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        size={14}
                        color="#6B7280"
                        style={{ position: 'absolute', right: '10px', top: '13px', pointerEvents: 'none' }}
                    />
                </div>

                {isFiltered && (
                    <button
                        type="button"
                        onClick={onReset}
                        style={{
                            height: '40px',
                            padding: '0 10px',
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Reset
                    </button>
                )}
            </div>
        </div>
    );
}

const dropdownStyle: React.CSSProperties = {
    appearance: 'none',
    WebkitAppearance: 'none',
    height: '40px',
    padding: '0 32px 0 14px',
    background: '#FFFFFF',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    outline: 'none',
};
