'use client';

import React from 'react';

interface StatCardProps {
    label: string;
    value: number | string;
    textColor?: string;
    bgColor?: string;
    borderColor?: string;
    isActive: boolean;
    onClick: () => void;
}

export default function StatCard({
    label,
    value,
    textColor = '#111827',
    bgColor = '#FFFFFF',
    borderColor = '#E5E7EB',
    isActive,
    onClick,
}: StatCardProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={`${label}: ${value}${isActive ? ' (active filter)' : ''}`}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            style={{
                padding: '16px 20px',
                borderRadius: '12px',
                background: bgColor,
                border: isActive
                    ? '2px solid #111827'
                    : `1px solid ${borderColor}`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'all 0.15s ease',
                outline: 'none',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : undefined,
            }}
        >
            <span
                style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: textColor !== '#111827' ? textColor : '#4B5563',
                }}
            >
                {label}
            </span>
            <span
                style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: textColor,
                    lineHeight: 1.1,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
            >
                {value}
            </span>
        </div>
    );
}
