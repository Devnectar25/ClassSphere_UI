'use client';
import Link from 'next/link';
import { Compass, UserRound, Lock, ChevronRight } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import PublicNav from '@/components/PublicNav';

/** Every public page, grouped. Keep this list in sync with the routes in src/app. */
const SECTIONS = [
  {
    title: 'Pages',
    icon: Compass,
    links: [
      { label: 'Home', href: '/' },
      { label: 'About Us', href: '/about' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
  {
    title: 'Account',
    icon: UserRound,
    links: [
      { label: 'Sign In', href: '/login' },
      { label: 'Register Your Academy', href: '/register' },
      { label: 'Forgot Password', href: '/forgot-password' },
    ],
  },
  {
    title: 'Policies',
    icon: Lock,
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Refund Policy', href: '/refund' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
];

export default function SitemapPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', color: '#0F172A', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{SITEMAP_CSS}</style>

      {/* ─── Navbar ─── */}
      <PublicNav />

      <main style={{ flex: 1, width: '100%', maxWidth: '960px', margin: '0 auto', padding: '40px 24px 64px' }}>
        <h1 style={{ fontSize: 'clamp(26px, 3.2vw, 34px)', fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 6px' }}>Sitemap</h1>
        <p style={{ fontSize: '15px', color: '#64748B', margin: '0 0 28px' }}>All pages on ClassSphere in one place.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {SECTIONS.map(section => (
            <section key={section.title} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '18px 18px 10px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#4F46E5', margin: '0 0 8px' }}>
                <section.icon size={16} /> {section.title}
              </h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {section.links.map((link, i) => (
                  <li key={link.href} style={{ borderTop: i ? '1px solid #F1F5F9' : 'none' }}>
                    <Link href={link.href} className="cs-sitemap-link">
                      <span>{link.label}</span>
                      <ChevronRight size={16} className="cs-sitemap-chevron" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

const SITEMAP_CSS = `
.cs-sitemap-link {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 11px 8px; margin: 0 -8px; border-radius: 8px;
  font-size: 14.5px; font-weight: 500; color: #0F172A; text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}
.cs-sitemap-link:hover { background: #EEF2FF; color: #4338CA; }
.cs-sitemap-link:focus-visible { outline: 2px solid #4F46E5; outline-offset: 2px; }
.cs-sitemap-chevron { color: #94A3B8; flex-shrink: 0; transition: transform 0.15s ease, color 0.15s ease; }
.cs-sitemap-link:hover .cs-sitemap-chevron { color: #4F46E5; transform: translateX(3px); }
@media (prefers-reduced-motion: reduce) {
  .cs-sitemap-link, .cs-sitemap-chevron { transition: none; }
}
`;
