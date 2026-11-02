'use client';
import { X } from 'lucide-react';

interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}

export default function Modal({ title, onClose, children }: ModalProps) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div className="section-title">{title}</div>
                    <button className="btn-ghost" style={{ padding: '6px' }} onClick={onClose} aria-label="Close"><X size={16} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}
