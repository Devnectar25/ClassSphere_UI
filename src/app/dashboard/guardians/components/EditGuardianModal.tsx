'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';
import CountryPhoneInput, { COUNTRIES, type CountryOption, validatePhoneNumber } from '@/components/CountryPhoneInput';
import { api, useApi } from '@/lib/api';
import { AlertCircle, Check, Loader2, Search } from 'lucide-react';

export interface LinkedStudentSummary {
    studentId: string;
    name: string;
}

export interface EditableGuardianData {
    guardianId: string;
    firstName: string;
    lastName: string;
    relationship: string;
    phone: string;
    email: string;
    isPrimary?: boolean;
    students?: LinkedStudentSummary[];
}

export interface EditGuardianModalProps {
    guardian: EditableGuardianData;
    onClose: () => void;
    onSaved: () => void;
}

const NAME_REGEX = /^[a-zA-Z\s'-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

function parsePhoneCountryAndNumber(rawPhone?: string): { country: CountryOption; number: string } {
    const defaultCountry = COUNTRIES.find(c => c.code === 'IN') || COUNTRIES[0];
    if (!rawPhone) return { country: defaultCountry, number: '' };
    const cleaned = rawPhone.trim();
    // Match longest dial code first
    const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const c of sorted) {
        if (cleaned.startsWith(c.dialCode)) {
            const digits = cleaned.slice(c.dialCode.length).replace(/\D/g, '');
            return { country: c, number: digits };
        }
    }
    const digits = cleaned.replace(/\D/g, '');
    return { country: defaultCountry, number: digits };
}

export default function EditGuardianModal({ guardian, onClose, onSaved }: EditGuardianModalProps) {
    const [firstName, setFirstName] = useState(guardian.firstName || '');
    const [lastName, setLastName] = useState(guardian.lastName || '');
    const [relationship, setRelationship] = useState(guardian.relationship || 'Mother');

    const initialPhoneParsed = parsePhoneCountryAndNumber(guardian.phone);
    const [phoneCountry, setPhoneCountry] = useState<CountryOption>(initialPhoneParsed.country);
    const [phone, setPhone] = useState(initialPhoneParsed.number);

    const [email, setEmail] = useState(guardian.email || '');
    const [isPrimary, setIsPrimary] = useState(Boolean(guardian.isPrimary));
    const [studentIds, setStudentIds] = useState<string[]>(
        guardian.students?.map(s => s.studentId) || []
    );

    const [filter, setFilter] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch live students for the linked children selector
    const { data: studentsData } = useApi<{
        students: Array<{ studentId: string; firstName: string; lastName: string; enrollmentNumber: string }>;
    }>('/students?limit=200');

    // Build combined list of students including existing linked ones
    const availableStudents = React.useMemo(() => {
        const map = new Map<string, { studentId: string; name: string; enrollmentNumber?: string }>();

        // First include known linked students from props
        guardian.students?.forEach(s => {
            map.set(s.studentId, { studentId: s.studentId, name: s.name });
        });

        // Then merge students fetched from the API
        studentsData?.students?.forEach(s => {
            map.set(s.studentId, {
                studentId: s.studentId,
                name: `${s.firstName} ${s.lastName}`.trim(),
                enrollmentNumber: s.enrollmentNumber,
            });
        });

        return Array.from(map.values());
    }, [guardian.students, studentsData]);

    const visibleStudents = availableStudents.filter(s =>
        `${s.name} ${s.enrollmentNumber || ''}`.toLowerCase().includes(filter.toLowerCase())
    );

    const toggleStudent = (id: string) => {
        setStudentIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmedFirst = firstName.trim();
        const trimmedLast = lastName.trim();
        const trimmedEmail = email.trim();

        if (trimmedFirst.length < 2 || !NAME_REGEX.test(trimmedFirst)) {
            setError('First name must be at least 2 characters and contain only letters.');
            return;
        }
        if (trimmedLast.length < 2 || !NAME_REGEX.test(trimmedLast)) {
            setError('Last name must be at least 2 characters and contain only letters.');
            return;
        }
        if (!EMAIL_REGEX.test(trimmedEmail)) {
            setError('Please enter a valid email address.');
            return;
        }

        const phoneErr = validatePhoneNumber(phone, phoneCountry, true);
        if (phoneErr) {
            setError(phoneErr);
            return;
        }

        if (studentIds.length === 0) {
            setError('Please link at least one student to this parent/guardian.');
            return;
        }

        const phoneDigits = phone.replace(/\D/g, '');
        const finalPhone = `${phoneCountry.dialCode} ${phoneDigits}`.trim();

        setSaving(true);
        try {
            await api('/guardians', {
                method: 'PUT',
                body: JSON.stringify({
                    guardianId: guardian.guardianId,
                    firstName: trimmedFirst,
                    lastName: trimmedLast,
                    relationship,
                    phone: finalPhone,
                    email: trimmedEmail.toLowerCase(),
                    isPrimary,
                    studentIds,
                }),
            });
            onSaved();
            onClose();
        } catch (err) {
            setError((err as Error).message || 'Failed to update parent details.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Edit Parent / Guardian" onClose={onClose} maxWidth="660px">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {error && (
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: '#FEF2F2',
                            border: '1px solid #FCA5A5',
                            color: '#B91C1C',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>{error}</span>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label className="cs-label">
                            First Name <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                            className="cs-input"
                            required
                            placeholder="First name"
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                            disabled={saving}
                        />
                    </div>
                    <div>
                        <label className="cs-label">
                            Last Name <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                            className="cs-input"
                            required
                            placeholder="Last name"
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                            disabled={saving}
                        />
                    </div>
                    <div>
                        <label className="cs-label">
                            Relationship <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <select
                            className="cs-input"
                            value={relationship}
                            onChange={e => setRelationship(e.target.value)}
                            disabled={saving}
                        >
                            {['Mother', 'Father', 'Guardian', 'Grandparent', 'Other'].map(r => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="cs-label">
                            Phone <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <CountryPhoneInput
                            value={phone}
                            selectedCountry={phoneCountry}
                            onCountryChange={setPhoneCountry}
                            onChange={(val: string) => setPhone(val)}
                            required={true}
                        />
                    </div>
                </div>

                <div>
                    <label className="cs-label">
                        Email Address <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                        className="cs-input"
                        type="email"
                        required
                        placeholder="parent@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={saving}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)', marginTop: '4px' }}>
                        Used for portal sign-in and automated communications.
                    </div>
                </div>

                <div style={{ padding: '8px 0' }}>
                    <label
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                            userSelect: 'none',
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={isPrimary}
                            onChange={e => setIsPrimary(e.target.checked)}
                            disabled={saving}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--cs-primary)' }}
                        />
                        <span>Primary Contact (receives emergency alerts and primary invoice notifications)</span>
                    </label>
                </div>

                <div>
                    <label className="cs-label">
                        Linked Children ({studentIds.length} selected) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                        <Search
                            size={14}
                            style={{
                                position: 'absolute',
                                left: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--cs-text-muted)',
                            }}
                        />
                        <input
                            className="cs-input"
                            placeholder="Search student by name or enrollment number…"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            style={{ paddingLeft: '32px' }}
                            disabled={saving}
                        />
                    </div>
                    <div
                        style={{
                            maxHeight: '160px',
                            overflowY: 'auto',
                            border: '1px solid var(--cs-border)',
                            borderRadius: '8px',
                            padding: '6px',
                            background: 'var(--cs-surface-2)',
                        }}
                    >
                        {visibleStudents.length === 0 ? (
                            <div style={{ padding: '8px', fontSize: '12px', color: 'var(--cs-text-muted)', textAlign: 'center' }}>
                                No students match your search.
                            </div>
                        ) : (
                            visibleStudents.map(s => {
                                const isSelected = studentIds.includes(s.studentId);
                                return (
                                    <label
                                        key={s.studentId}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '8px',
                                            fontSize: '13px',
                                            padding: '6px 8px',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            background: isSelected ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                                            transition: 'background 0.15s ease',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleStudent(s.studentId)}
                                                disabled={saving}
                                                style={{ width: '15px', height: '15px', accentColor: 'var(--cs-primary)' }}
                                            />
                                            <span style={{ fontWeight: isSelected ? 600 : 400 }}>{s.name}</span>
                                        </div>
                                        {s.enrollmentNumber && (
                                            <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', fontFamily: 'monospace' }}>
                                                {s.enrollmentNumber}
                                            </span>
                                        )}
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px',
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--cs-border)',
                    }}
                >
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onClose}
                        disabled={saving}
                        style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={saving}
                        style={{
                            height: '36px',
                            padding: '0 18px',
                            fontSize: '13px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        {saving ? (
                            <>
                                <Loader2 size={14} className="spin" /> Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
