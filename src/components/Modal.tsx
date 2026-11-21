'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    isOpen?: boolean;
    maxWidth?: string | number;
    style?: React.CSSProperties;
    className?: string;
}

export default function Modal({ title, onClose, children, isOpen, maxWidth, style, className = '' }: ModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
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

    if (!mounted || isOpen === false) return null;

    return createPortal(
        <div className="modal-overlay !fixed !inset-0 !z-[9999]" onClick={onClose}>
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
        </div>,
        document.body
    );
}
