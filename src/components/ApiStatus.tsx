'use client';
import { useEffect, useState } from 'react';

/** Live backend / database health indicator (GET /health). */
export default function ApiStatus() {
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/health`)
            .then(res => res.json())
            .then(body => setStatus(body.dependencies?.database?.status ?? body.status))
            .catch(() => setStatus('Unreachable'));
    }, []);

    const healthy = status === 'Healthy';
    return (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs">
            <span className={`w-2 h-2 rounded-full ${healthy ? 'bg-emerald-400 animate-pulse' : status ? 'bg-red-400' : 'bg-slate-500'}`} />
            <span className="text-slate-300 font-mono">API &amp; DB: {status ?? 'checking…'}</span>
        </div>
    );
}
