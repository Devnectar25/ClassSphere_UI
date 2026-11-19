'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string | number;
    style?: React.CSSProperties;
    className?: string;
}

export default function Modal({ title, onClose, children, maxWidth, style, className = '' }: ModalProps) {
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-content ${className}`.trim()}
                onClick={e => e.stopPropagation()}
                style={{ ...(maxWidth ? { maxWidth } : {}), ...style }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div className="section-title">{title}</div>
                    <button className="btn-ghost" style={{ padding: '6px' }} onClick={onClose} aria-label="Close"><X size={16} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}
