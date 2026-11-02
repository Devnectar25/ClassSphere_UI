'use client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { clearSession, useSession } from '@/lib/session';

/** Signed-in user's name with a sign-out action (used in the portal and platform headers). */
export default function SignOutButton({ className = '' }: { className?: string }) {
    const router = useRouter();
    const session = useSession();
    return (
        <button
            onClick={() => { clearSession(); router.replace('/login'); }}
            className={`flex items-center gap-1.5 cursor-pointer ${className}`}
            title={session?.user.email}
        >
            <span>{session?.user.fullName}</span>
            <LogOut size={14} />
        </button>
    );
}
