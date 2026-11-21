'use client';

import { Menu } from 'lucide-react';
import { ADMIN_SIDEBAR_TOGGLE } from './AdminSidebar';

export default function AdminMenuButton() {
    return (
        <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(ADMIN_SIDEBAR_TOGGLE))}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="Toggle menu"
        >
            <Menu size={20} />
        </button>
    );
}
