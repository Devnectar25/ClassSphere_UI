'use client';
import { useState } from 'react';

const OTHER = '__other__';

/** Course category: every available category, or a new one typed by the user. */
export default function CategorySelect({ id, value, options, onChange }: { id: string; value: string; options: string[]; onChange: (value: string) => void }) {
    const [typing, setTyping] = useState(false);
    // A value outside the list (e.g. of an older course) stays selectable
    const list = value && !typing && !options.includes(value) ? [...options, value] : options;
    return (
        <>
            <select id={id} className="cs-input" required value={typing ? OTHER : value} onChange={e => {
                const other = e.target.value === OTHER;
                setTyping(other);
                onChange(other ? '' : e.target.value);
            }}>
                <option value="" disabled>Select a category</option>
                {list.map(c => <option key={c} value={c}>{c}</option>)}
                <option value={OTHER}>Other (type your own)…</option>
            </select>
            {typing && (
                <input className="cs-input" style={{ marginTop: '6px' }} required autoFocus maxLength={100} aria-label="New category" placeholder="New category name"
                    value={value} onChange={e => onChange(e.target.value)} />
            )}
        </>
    );
}
