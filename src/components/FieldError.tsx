import { AlertCircle } from 'lucide-react';

/** Inline validation message shown under a form field. Renders nothing when there is no error. */
export default function FieldError({ message, id }: { message?: string; id?: string }) {
    if (!message) return null;
    return (
        <p id={id} role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
            <AlertCircle size={12} className="shrink-0" />
            <span>{message}</span>
        </p>
    );
}
