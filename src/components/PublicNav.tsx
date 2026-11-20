'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Shield, Menu, X } from 'lucide-react';

export interface PublicNavLink { label: string; href: string }

const DEFAULT_LINKS: PublicNavLink[] = [
    { label: 'Categories', href: '/#categories' },
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/pricing' },
];

/**
 * Header used by every public page. Desktop shows the links inline; below 1024px they move
 * into a hamburger menu. Styles live in the component so they never depend on a stale stylesheet.
 */
export default function PublicNav({ links = DEFAULT_LINKS, activeHref }: { links?: PublicNavLink[]; activeHref?: string }) {
    const [open, setOpen] = useState(false);

    // Close on Escape and when the screen grows back to desktop width
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        const mq = window.matchMedia('(min-width: 1024px)');
        const onResize = () => { if (mq.matches) setOpen(false); };
        window.addEventListener('keydown', onKey);
        mq.addEventListener('change', onResize);
        return () => { window.removeEventListener('keydown', onKey); mq.removeEventListener('change', onResize); };
    }, [open]);

    return (
        <nav className="glass-strong cs-pubnav" aria-label="Main">
            <style>{PUBNAV_CSS}</style>
            <div className="cs-pubnav-bar">
                <Link href="/" className="cs-pubnav-brand" onClick={() => setOpen(false)}>
                    <span className="cs-pubnav-logo"><Shield size={22} color="white" /></span>
                    <span className="cs-pubnav-name">Class<span className="gradient-text">Sphere</span></span>
                </Link>

                <div className="cs-pubnav-links">
                    {links.map(l => (
                        <Link key={l.label} href={l.href} className={`cs-pubnav-link${activeHref === l.href ? ' is-active' : ''}`}>{l.label}</Link>
                    ))}
                </div>

                <div className="cs-pubnav-actions">
                    <Link href="/login" className="cs-pubnav-signin" style={{ textDecoration: 'none' }}>
                        <button className="btn-ghost" style={{ fontSize: '13px', fontWeight: 600, color: '#4F46E5', cursor: 'pointer', padding: '6px 12px' }}>Sign In</button>
                    </Link>
                    <Link href="/register" className="cs-pubnav-trial" style={{ textDecoration: 'none' }}>
                        <button className="btn-primary" style={{ fontSize: '13px', padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Start Free Trial</button>
                    </Link>
                    <button
                        type="button"
                        className="cs-pubnav-toggle"
                        aria-label={open ? 'Close menu' : 'Open menu'}
                        aria-expanded={open}
                        aria-controls="cs-pubnav-panel"
                        onClick={() => setOpen(o => !o)}
                    >
                        {open ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {open && (
                <div id="cs-pubnav-panel" className="cs-pubnav-panel">
                    {links.map(l => (
                        <Link key={l.label} href={l.href} className="cs-pubnav-panel-link" onClick={() => setOpen(false)}>{l.label}</Link>
                    ))}
                    <div className="cs-pubnav-panel-actions">
                        <Link href="/login" onClick={() => setOpen(false)} style={{ textDecoration: 'none', flex: 1 }}>
                            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', height: '44px' }}>Sign In</button>
                        </Link>
                        <Link href="/register" onClick={() => setOpen(false)} style={{ textDecoration: 'none', flex: 1 }}>
                            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', height: '44px' }}>Start Free Trial</button>
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}

const PUBNAV_CSS = `
.cs-pubnav { position: sticky; top: 0; z-index: 50; border-bottom: 1px solid #E2E8F0; background-color: rgba(255,255,255,0.92); backdrop-filter: blur(12px); }
.cs-pubnav-bar { height: 72px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.cs-pubnav-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; min-width: 0; }
.cs-pubnav-logo { width: 44px; height: 44px; border-radius: 11px; flex-shrink: 0; background: linear-gradient(135deg, #4F46E5, #06B6D4); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(79,70,229,0.25); }
.cs-pubnav-name { font-weight: 800; font-size: 24px; color: #0F172A; letter-spacing: -0.02em; white-space: nowrap; }
.cs-pubnav-links { display: flex; align-items: center; gap: 28px; font-size: 14px; }
.cs-pubnav-link { color: #475569; text-decoration: none; font-weight: 500; transition: color 0.2s; white-space: nowrap; }
.cs-pubnav-link:hover, .cs-pubnav-link.is-active { color: #4F46E5; }
.cs-pubnav-link.is-active { font-weight: 600; }
.cs-pubnav-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.cs-pubnav-toggle { display: none; width: 42px; height: 42px; border-radius: 10px; border: 1px solid #E2E8F0; background: #FFFFFF; color: #0F172A; cursor: pointer; align-items: center; justify-content: center; }
.cs-pubnav-toggle:focus-visible, .cs-pubnav-panel-link:focus-visible { outline: 2px solid #4F46E5; outline-offset: 2px; }
.cs-pubnav-panel { border-top: 1px solid #E2E8F0; background: #FFFFFF; padding: 8px 16px 16px; display: flex; flex-direction: column; box-shadow: 0 16px 32px -20px rgba(15,23,42,0.35); }
.cs-pubnav-panel-link { padding: 13px 4px; font-size: 15px; font-weight: 600; color: #0F172A; text-decoration: none; border-bottom: 1px solid #F1F5F9; }
.cs-pubnav-panel-link:hover { color: #4F46E5; }
.cs-pubnav-panel-actions { display: flex; gap: 10px; margin-top: 14px; }

@media (max-width: 1023px) {
  .cs-pubnav-links { display: none; }
  .cs-pubnav-toggle { display: inline-flex; }
}
@media (max-width: 767px) {
  .cs-pubnav-bar { height: 64px; padding: 0 16px; }
  .cs-pubnav-logo { width: 38px; height: 38px; border-radius: 10px; }
  .cs-pubnav-name { font-size: 20px; }
  .cs-pubnav-signin { display: none; }
}
@media (max-width: 480px) {
  .cs-pubnav-trial { display: none; }
}
@media (min-width: 1024px) {
  .cs-pubnav-panel { display: none; }
}
`;
