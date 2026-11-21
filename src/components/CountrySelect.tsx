'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Globe, ChevronDown, Search, Check } from 'lucide-react';
import { FlagImage } from './CountryPhoneInput';

export interface CountryItem {
    name: string;
    code: string;
}

export const WORLD_COUNTRIES: CountryItem[] = [
    { name: 'India', code: 'IN' },
    { name: 'United States', code: 'US' },
    { name: 'United Kingdom', code: 'GB' },
    { name: 'Canada', code: 'CA' },
    { name: 'Australia', code: 'AU' },
    { name: 'United Arab Emirates', code: 'AE' },
    { name: 'Saudi Arabia', code: 'SA' },
    { name: 'Singapore', code: 'SG' },
    { name: 'Qatar', code: 'QA' },
    { name: 'Kuwait', code: 'KW' },
    { name: 'Oman', code: 'OM' },
    { name: 'Bahrain', code: 'BH' },
    { name: 'Germany', code: 'DE' },
    { name: 'France', code: 'FR' },
    { name: 'Italy', code: 'IT' },
    { name: 'Spain', code: 'ES' },
    { name: 'Netherlands', code: 'NL' },
    { name: 'Switzerland', code: 'CH' },
    { name: 'Sweden', code: 'SE' },
    { name: 'Norway', code: 'NO' },
    { name: 'Denmark', code: 'DK' },
    { name: 'Ireland', code: 'IE' },
    { name: 'New Zealand', code: 'NZ' },
    { name: 'South Africa', code: 'ZA' },
    { name: 'Japan', code: 'JP' },
    { name: 'South Korea', code: 'KR' },
    { name: 'China', code: 'CN' },
    { name: 'Malaysia', code: 'MY' },
    { name: 'Indonesia', code: 'ID' },
    { name: 'Philippines', code: 'PH' },
    { name: 'Thailand', code: 'TH' },
    { name: 'Vietnam', code: 'VN' },
    { name: 'Nepal', code: 'NP' },
    { name: 'Bangladesh', code: 'BD' },
    { name: 'Sri Lanka', code: 'LK' },
    { name: 'Pakistan', code: 'PK' },
    { name: 'Brazil', code: 'BR' },
    { name: 'Mexico', code: 'MX' },
    { name: 'Argentina', code: 'AR' },
    { name: 'Egypt', code: 'EG' },
    { name: 'Nigeria', code: 'NG' },
    { name: 'Kenya', code: 'KE' },
    { name: 'Turkey', code: 'TR' },
    { name: 'Russia', code: 'RU' },
    { name: 'Poland', code: 'PL' },
    { name: 'Portugal', code: 'PT' },
    { name: 'Greece', code: 'GR' },
    { name: 'Austria', code: 'AT' },
    { name: 'Belgium', code: 'BE' },
    { name: 'Finland', code: 'FI' },
    { name: 'Czech Republic', code: 'CZ' },
    { name: 'Hungary', code: 'HU' },
    { name: 'Romania', code: 'RO' },
    { name: 'Israel', code: 'IL' },
    { name: 'Mauritius', code: 'MU' },
    { name: 'Maldives', code: 'MV' },
    { name: 'Other Country', code: 'OTHER' },
];

interface CountrySelectProps {
    value: string;
    onChange: (countryName: string) => void;
    onBlur?: () => void;
    hasError?: boolean;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
}

export default function CountrySelect({
    value,
    onChange,
    onBlur,
    hasError = false,
    disabled = false,
    placeholder = 'Select country',
    style,
}: CountrySelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Resolve current selected country item
    const selectedItem = useMemo(() => {
        if (!value) return null;
        return WORLD_COUNTRIES.find(
            c => c.name.toLowerCase() === value.toLowerCase() || c.code.toLowerCase() === value.toLowerCase()
        ) || { name: value, code: 'OTHER' };
    }, [value]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                if (isOpen) {
                    setIsOpen(false);
                    setSearch('');
                    if (onBlur) onBlur();
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onBlur]);

    // Focus search on open
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Filter countries based on search term
    const filteredCountries = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return WORLD_COUNTRIES;
        return WORLD_COUNTRIES.filter(
            c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
        );
    }, [search]);

    const handleSelect = (item: CountryItem) => {
        onChange(item.name);
        setIsOpen(false);
        setSearch('');
        if (onBlur) onBlur();
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            {/* Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen);
                        if (isOpen && onBlur) onBlur();
                    }
                }}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: `1px solid ${hasError ? '#EF4444' : isOpen ? '#4F46E5' : '#CBD5E1'}`,
                    background: hasError ? '#FEF2F2' : '#FFFFFF',
                    boxShadow: isOpen && !hasError ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : 'none',
                    fontSize: '13px',
                    color: selectedItem ? '#0F172A' : '#94A3B8',
                    fontWeight: selectedItem ? 500 : 400,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    textAlign: 'left',
                    outline: 'none',
                    userSelect: 'none',
                    ...style,
                }}
            >
                {/* Selected Country Flag & Name */}
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {selectedItem && selectedItem.code !== 'OTHER' ? (
                        <FlagImage code={selectedItem.code} name={selectedItem.name} />
                    ) : (
                        <Globe size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedItem ? selectedItem.name : placeholder}
                    </span>
                </span>

                {/* Dropdown Chevron */}
                <ChevronDown
                    size={16}
                    style={{
                        color: '#64748B',
                        flexShrink: 0,
                        marginLeft: '8px',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                    }}
                />
            </button>

            {/* Custom Popover Dropdown Menu */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        right: 0,
                        maxHeight: '260px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.18), 0 6px 12px -4px rgba(15, 23, 42, 0.08)',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        animation: 'cs-fade-in 0.15s ease-out',
                    }}
                >
                    {/* Search Bar Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            background: '#F8FAFC',
                            borderBottom: '1px solid #F1F5F9',
                        }}
                    >
                        <Search size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Escape') {
                                    setIsOpen(false);
                                    setSearch('');
                                }
                            }}
                            placeholder="Search country..."
                            style={{
                                width: '100%',
                                border: 'none',
                                outline: 'none',
                                background: 'transparent',
                                fontSize: '12px',
                                color: '#0F172A',
                                fontWeight: 500,
                            }}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#94A3B8',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '0 4px',
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Scrollable Countries List */}
                    <div
                        role="listbox"
                        style={{
                            overflowY: 'auto',
                            maxHeight: '210px',
                            padding: '4px',
                        }}
                    >
                        {filteredCountries.length === 0 ? (
                            <div style={{ padding: '8px' }}>
                                <div style={{ padding: '8px 12px', textAlign: 'center', fontSize: '12px', color: '#94A3B8' }}>
                                    No country found matching &ldquo;{search}&rdquo;
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleSelect({ name: 'Other Country', code: 'OTHER' })}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        border: '1px dashed #CBD5E1',
                                        background: '#F8FAFC',
                                        color: '#4F46E5',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                    }}
                                >
                                    <Globe size={15} style={{ color: '#4F46E5', flexShrink: 0 }} />
                                    <span>Select &ldquo;Other Country&rdquo;</span>
                                </button>
                            </div>
                        ) : (
                            filteredCountries.map(country => {
                                const isSelected = selectedItem?.name.toLowerCase() === country.name.toLowerCase();
                                return (
                                    <button
                                        key={country.name}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => handleSelect(country)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            width: '100%',
                                            padding: '8px 10px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: isSelected ? '#EEF2FF' : 'transparent',
                                            color: isSelected ? '#4338CA' : '#0F172A',
                                            fontSize: '12.5px',
                                            fontWeight: isSelected ? 600 : 500,
                                            cursor: 'pointer',
                                            transition: 'background 0.12s ease',
                                            textAlign: 'left',
                                        }}
                                        onMouseEnter={e => {
                                            if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                                        }}
                                        onMouseLeave={e => {
                                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                                            {country.code !== 'OTHER' ? (
                                                <FlagImage code={country.code} name={country.name} />
                                            ) : (
                                                <Globe size={15} style={{ color: '#94A3B8', flexShrink: 0 }} />
                                            )}
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {country.name}
                                            </span>
                                        </span>
                                        {isSelected && (
                                            <Check size={14} style={{ color: '#4F46E5', flexShrink: 0, marginLeft: '6px' }} />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
