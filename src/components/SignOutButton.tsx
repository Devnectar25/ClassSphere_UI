'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { clearSession, useSession } from '@/lib/session';

interface SignOutButtonProps {
    className?: string;
    label?: string;
    showConfirm?: boolean;
}

/** Explicit sign-out button with an on-brand confirmation modal portalled to body. */
export default function SignOutButton({
    className = '',
    label = 'Logout',
    showConfirm = true,
}: SignOutButtonProps) {
    const router = useRouter();
    const session = useSession();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!confirmOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setConfirmOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [confirmOpen]);

    const handleSignOut = () => {
        setConfirmOpen(false);
        clearSession();
        router.replace('/login');
    };

    return (
        <>
            <button
                type="button"
                onClick={() => (showConfirm ? setConfirmOpen(true) : handleSignOut())}
                className={`flex items-center gap-1.5 cursor-pointer ${className}`}
                title={session?.user.email ?? 'Sign out'}
            >
                <LogOut size={14} />
                <span>{label}</span>
            </button>

            {confirmOpen && mounted && createPortal(
                <div
                    className="modal-overlay !fixed !inset-0 !z-[99999] flex items-center justify-center p-4"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 99999,
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}
                    onClick={() => setConfirmOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="logout-dialog-title"
                >
                    <div
                        className="modal-content !max-w-sm bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xl text-left"
                        style={{
                            maxWidth: '400px',
                            width: '100%',
                            background: '#FFFFFF',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            position: 'relative',
                            zIndex: 100000,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                                <LogOut size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 id="logout-dialog-title" className="text-base font-bold text-slate-900 tracking-tight">
                                    Confirm Logout
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Are you sure you want to end your session? You will need to sign in again to access the console.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setConfirmOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/25 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <LogOut size={13} />
                                <span>Log Out</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
