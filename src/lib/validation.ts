'use client';

import { useState, type CSSProperties } from 'react';

/** A validator returns an error message, or undefined when the value is valid. */
export type Validator = (value: unknown) => string | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (value: unknown) => (value == null ? '' : String(value)).trim();

export const rules = {
    required: (label: string): Validator => (value) =>
        text(value) === '' ? `${label} is required.` : undefined,

    minLength: (label: string, min: number): Validator => (value) => {
        const len = text(value).length;
        return len > 0 && len < min ? `${label} must be at least ${min} characters.` : undefined;
    },

    maxLength: (label: string, max: number): Validator => (value) =>
        text(value).length > max ? `${label} must be ${max} characters or fewer.` : undefined,

    email: (): Validator => (value) => {
        const s = text(value);
        return s && !EMAIL_RE.test(s) ? 'Enter a valid email address.' : undefined;
    },

    slug: (): Validator => (value) => {
        const s = text(value);
        return s && !SLUG_RE.test(s)
            ? 'Use lowercase letters, numbers and single hyphens (no leading or trailing hyphen).'
            : undefined;
    },

    /** Validates a numeric field held as a string or number. Empty values are left to `required`. */
    number: (label: string, opts: { min?: number; max?: number; integer?: boolean } = {}): Validator => (value) => {
        const s = text(value);
        if (s === '') return undefined;
        const n = Number(s);
        if (!Number.isFinite(n)) return `${label} must be a number.`;
        if (opts.integer && !Number.isInteger(n)) return `${label} must be a whole number.`;
        if (opts.min !== undefined && n < opts.min) return `${label} must be at least ${opts.min}.`;
        if (opts.max !== undefined && n > opts.max) return `${label} must be ${opts.max} or less.`;
        return undefined;
    },

    pattern: (re: RegExp, message: string): Validator => (value) => {
        const s = text(value);
        return s && !re.test(s) ? message : undefined;
    },

    /** Use `when(condition, ...)` to apply validators only in some states (e.g. reject vs approve). */
    when: (condition: boolean, ...validators: Validator[]): Validator => (value) =>
        condition ? runAll(validators, value) : undefined,
};

function runAll(validators: Validator[], value: unknown) {
    for (const validate of validators) {
        const err = validate(value);
        if (err) return err;
    }
    return undefined;
}

type Schema<T> = { [K in keyof T]?: Validator[] };

/**
 * Field-level validation for modal forms.
 * Errors appear after a field is blurred, or for every field once `validate()` is called on submit.
 */
export function useFormValidation<T extends Record<string, unknown>>(values: T, schema: Schema<T>) {
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);

    const errors = {} as Partial<Record<keyof T, string>>;
    for (const key of Object.keys(schema) as (keyof T)[]) {
        const err = runAll(schema[key] ?? [], values[key]);
        if (err) errors[key] = err;
    }
    const isValid = Object.keys(errors).length === 0;

    return {
        errors,
        isValid,
        /** The error to display for a field (only once it has been touched or the form submitted). */
        error: (key: keyof T) => (submitted || touched[key] ? errors[key] : undefined),
        /** Pass as `onBlur` to show a field's error after the user leaves it. */
        touch: (key: keyof T) => () => setTouched((t) => (t[key] ? t : { ...t, [key]: true })),
        /** Call at the top of a submit handler; returns false (and reveals all errors) if invalid. */
        validate: () => {
            setSubmitted(true);
            return isValid;
        },
        reset: () => {
            setTouched({});
            setSubmitted(false);
        },
    };
}

/** Inline style that turns a field's border red when it has an error. */
export function invalidStyle(error?: string): CSSProperties | undefined {
    return error ? { borderColor: '#F87171', boxShadow: '0 0 0 3px rgba(244, 63, 94, 0.12)' } : undefined;
}
