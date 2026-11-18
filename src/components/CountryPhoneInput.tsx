'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export interface CountryOption {
    code: string;
    name: string;
    dialCode: string;
    flag: string;
    digits: number;
    placeholder: string;
    regex?: RegExp;
}

export const COUNTRIES: CountryOption[] = [
    { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', digits: 10, placeholder: '9840012345', regex: /^[6-9]\d{9}$/ },
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', digits: 10, placeholder: '5550192800' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', digits: 10, placeholder: '7911123456' },
    { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', digits: 10, placeholder: '4165550192' },
    { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', digits: 9, placeholder: '412345678' },
    { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', digits: 9, placeholder: '501234567' },
    { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', digits: 9, placeholder: '512345678' },
    { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', digits: 8, placeholder: '81234567' },
    { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', digits: 8, placeholder: '33123456' },
    { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', digits: 8, placeholder: '91234567' },
    { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', digits: 8, placeholder: '91234567' },
    { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', digits: 8, placeholder: '36123456' },
    { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', digits: 10, placeholder: '123456789' },
    { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', digits: 10, placeholder: '8123456789' },
    { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', digits: 10, placeholder: '9171234567' },
    { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', digits: 9, placeholder: '211234567' },
    { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', digits: 9, placeholder: '711234567' },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', digits: 10, placeholder: '15123456789' },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', digits: 9, placeholder: '612345678' },
    { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵', digits: 10, placeholder: '9841234567' },
    { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', digits: 10, placeholder: '1712345678' },
    { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰', digits: 9, placeholder: '712345678' },
    { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', digits: 10, placeholder: '3001234567' },
];

export function FlagImage({ code, name }: { code: string; name: string }) {
    const [failed, setFailed] = useState(false);
    const src = code === 'IN' ? '/flags/in.svg' : `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

    if (failed) {
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 14,
                    borderRadius: 2,
                    fontSize: '9px',
                    fontWeight: 700,
                    background: '#E2E8F0',
                    color: '#475569',
                    flexShrink: 0,
                    lineHeight: 1,
                }}
            >
                {code}
            </span>
        );
    }
    return (
        <img
            src={src}
            srcSet={code === 'IN' ? undefined : `https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
            width={20}
            height={14}
            alt={name}
            loading="eager"
            onError={() => setFailed(true)}
            style={{
                display: 'inline-block',
                width: 20,
                height: 14,
                objectFit: 'cover',
                borderRadius: '2px',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
                flexShrink: 0,
                verticalAlign: 'middle',
            }}
        />
    );
}

export function validatePhoneNumber(phone: string, country: CountryOption, required = false): string {
    const digits = phone.replace(/\D/g, '');
    if (!digits) {
        return required ? 'Mobile number is required.' : '';
    }
    if (digits.length !== country.digits) {
        return `Mobile number must be exactly ${country.digits} digits (${digits.length}/${country.digits}).`;
    }
    if (country.code === 'IN' && !/^[6-9]/.test(digits)) {
        return 'Indian mobile number must start with 6, 7, 8, or 9.';
    }
    return '';
}

export interface CountryPhoneInputProps {
    value: string;
    onChange: (phone: string, country: CountryOption) => void;
    onBlur?: () => void;
    selectedCountry?: CountryOption;
    onCountryChange?: (country: CountryOption) => void;
    error?: string;
    touched?: boolean;
    required?: boolean;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    showHelperText?: boolean;
}

export default function CountryPhoneInput({
    value,
    onChange,
    onBlur,
    selectedCountry: externalCountry,
    onCountryChange,
    error,
    touched,
    required = false,
    placeholder,
    disabled = false,
    id,
    showHelperText = true,
}: CountryPhoneInputProps) {
    const [internalCountry, setInternalCountry] = useState<CountryOption>(COUNTRIES[0]);
    const country = externalCountry ?? internalCountry;
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelectCountry = (c: CountryOption) => {
        if (onCountryChange) {
            onCountryChange(c);
        } else {
            setInternalCountry(c);
        }
        setIsOpen(false);
        setSearch('');
        // Clean and slice digits if country changed
        const newDigits = value.replace(/\D/g, '').slice(0, c.digits);
        onChange(newDigits, c);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, country.digits);
        onChange(digits, country);
    };

    const filtered = COUNTRIES.filter(c => {
        const q = search.toLowerCase().trim();
        if (!q) return true;
        return c.name.toLowerCase().includes(q) ||
               c.dialCode.includes(q) ||
               c.code.toLowerCase().includes(q);
    });

    const hasError = Boolean(touched && error);

    return (
        <div style={{ position: 'relative' }} ref={containerRef}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: `1px solid ${hasError ? '#EF4444' : isFocused || isOpen ? '#4F46E5' : '#CBD5E1'}`,
                    borderRadius: '8px',
                    background: hasError ? '#FEF2F2' : '#FFFFFF',
                    boxShadow: (isFocused || isOpen) && !hasError
                        ? '0 0 0 3px rgba(79, 70, 229, 0.15)'
                        : 'none',
                    transition: 'all 0.2s ease',
                    height: '40px',
                    opacity: disabled ? 0.6 : 1,
                }}
            >
                {/* Country Trigger Button */}
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        setIsOpen(prev => !prev);
                        setSearch('');
                    }}
                    aria-expanded={isOpen}
                    aria-label="Select Country Code"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0 8px',
                        height: '100%',
                        background: '#F8FAFC',
                        border: 'none',
                        borderRight: `1px solid ${hasError ? '#FECACA' : '#E2E8F0'}`,
                        borderTopLeftRadius: '7px',
                        borderBottomLeftRadius: '7px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#0F172A',
                        userSelect: 'none',
                        flexShrink: 0,
                    }}
                >
                    <FlagImage code={country.code} name={country.name} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{country.dialCode}</span>
                    <ChevronDown size={12} style={{ color: '#64748B', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {/* Number Input */}
                <input
                    id={id}
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={country.digits}
                    placeholder={placeholder ?? `e.g. ${country.placeholder}`}
                    value={value}
                    disabled={disabled}
                    onChange={handlePhoneChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        setIsFocused(false);
                        if (onBlur) onBlur();
                    }}
                    style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        padding: '0 10px',
                        fontSize: '13px',
                        color: '#0F172A',
                        height: '100%',
                        minWidth: 0,
                    }}
                />

                {/* Searchable Dropdown */}
                {isOpen && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            width: '280px',
                            maxHeight: '220px',
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '10px',
                            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
                            zIndex: 100,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Search Input */}
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC' }}>
                            <Search size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search country or code..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Escape') setIsOpen(false);
                                }}
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    background: 'transparent',
                                    fontSize: '11px',
                                    width: '100%',
                                    color: '#0F172A',
                                }}
                            />
                        </div>

                        {/* List */}
                        <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
                            {filtered.length === 0 ? (
                                <div style={{ padding: '10px', textAlign: 'center', fontSize: '11px', color: '#94A3B8' }}>
                                    No countries found
                                </div>
                            ) : (
                                filtered.map(c => {
                                    const isSelected = c.code === country.code;
                                    return (
                                        <button
                                            key={c.code}
                                            type="button"
                                            onClick={() => handleSelectCountry(c)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                width: '100%',
                                                padding: '6px 8px',
                                                borderRadius: '5px',
                                                border: 'none',
                                                background: isSelected ? '#EEF2FF' : 'transparent',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                textAlign: 'left',
                                                color: isSelected ? '#4F46E5' : '#0F172A',
                                                fontWeight: isSelected ? 600 : 400,
                                            }}
                                            onMouseEnter={e => {
                                                if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#F8FAFC';
                                            }}
                                            onMouseLeave={e => {
                                                if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                                            }}
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FlagImage code={c.code} name={c.name} />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{c.name}</span>
                                            </span>
                                            <span style={{ fontSize: '11px', color: isSelected ? '#4F46E5' : '#64748B', fontWeight: 500, flexShrink: 0 }}>
                                                {c.dialCode}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {hasError ? (
                <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                    {error}
                </p>
            ) : showHelperText ? (
                <p style={{ color: '#94A3B8', fontSize: '10px', marginTop: '3px' }}>
                    {country.digits}-digit mobile number (e.g. {country.placeholder})
                </p>
            ) : null}
        </div>
    );
}
